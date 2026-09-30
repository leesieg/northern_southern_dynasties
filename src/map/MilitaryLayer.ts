import {Camera,Scene,AmbientLight,HemisphereLight,DirectionalLight,WebGLRenderer,Matrix4,Vector3,ACESFilmicToneMapping} from 'three';
import {MercatorCoordinate,type Map,type CustomLayerInterface} from 'maplibre-gl';
import {armyVisualState} from '../core/armyPresentation';
import {regimeName} from '../core/government';
import type {World} from '../core/types';
import {siteById} from '../data/scenario';
import {ARMY_MODEL_PIXELS,armyShowsModel,armyMapPosition,armyMapPeers,armyModelOffset} from './armyMapPresentation';
import {militaryModelAssets,animateMilitaryModel,type MilitaryModel,type ArmyModelKind} from './MilitaryModels';
// One shared MapLibre canvas/context; representative original military miniatures.
export function militaryLayer(getState:()=>{world:World;militaryModels:boolean;armyMotion:boolean},onFailure:(reason:string)=>void,onReady:()=>void):CustomLayerInterface{
 const camera=new Camera(),scene=new Scene(),origin=MercatorCoordinate.fromLngLat([110,32]),anchor=new Matrix4().makeTranslation(origin.x,origin.y,0),models=new globalThis.Map<number,MilitaryModel>(),visualStates=new globalThis.Map<number,ReturnType<typeof armyVisualState>>();
 let displayedWorld:World|undefined,renderer:WebGLRenderer|undefined,map:Map|undefined,failed=false,assets:ReturnType<typeof militaryModelAssets>|undefined;
 function failure(e:unknown){failed=true;onFailure('军队 3D 图层无法显示，保留军旗操作：'+(e instanceof Error?e.message:'WebGL 不可用'));}
 return {id:'military-models',type:'custom',renderingMode:'3d',onAdd(m,gl){
  map=m;try{
   renderer=new WebGLRenderer({canvas:m.getCanvas(),context:gl,antialias:true});renderer.autoClear=false;renderer.toneMapping=ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
   scene.add(new AmbientLight('#dfd1af',.6),new HemisphereLight('#eee8da','#3b4835',1.8));const sun=new DirectionalLight('#fff1d6',2.7);sun.position.set(-40,90,65);scene.add(sun);
   assets=militaryModelAssets(()=>map?.triggerRepaint(),message=>failure(new Error(message)));onReady();
  }catch(e){failure(e);}
 },render(_gl,args){
  if(failed||!map||!renderer||!assets)return;const state=getState(),armies=state.world.realm?.armies??[],zoom=map.getZoom();if(!armyShowsModel(zoom,state.militaryModels))return;
  try{
   if(displayedWorld!==state.world){displayedWorld=state.world;visualStates.clear();for(const a of armies)visualStates.set(a.id!,armyVisualState(state.world,a));}
   const ids=new Set(armies.map(a=>a.id!));for(const [id,m] of models)if(!ids.has(id)){scene.remove(m.root);models.delete(id);}let animating=false;
   for(const a of armies){
    if(!a.id)continue;const units=a.regiments??[],kind:ArmyModelKind=units.some(u=>u.kind==='heavyHorse'||u.kind==='lightHorse')?'horse':units.some(u=>u.kind==='siege')?'siege':'foot',name=regimeName(state.world,a.realm);let m=models.get(a.id);
    if(!m||m.kind!==kind||m.realm!==a.realm||m.bannerName!==name){if(m)scene.remove(m.root);m=assets.create(a,kind,name);scene.add(m.root);models.set(a.id,m);}
    const {lon,lat}=armyMapPosition(a),offset=armyModelOffset(armyMapPeers(armies,a)),point=map.project([lon,lat]),modelAnchor=map.unproject([point.x+offset.x,point.y+offset.y]);m.root.visible=map.getBounds().contains(modelAnchor);if(!m.root.visible)continue;
    const elevation=map.queryTerrainElevation(modelAnchor)??0,coord=MercatorCoordinate.fromLngLat(modelAnchor,elevation),metresPerPixel=40075016.686*Math.cos(modelAnchor.lat*Math.PI/180)/(512*2**zoom),scale=coord.meterInMercatorCoordinateUnits()*metresPerPixel*ARMY_MODEL_PIXELS;
    m.root.matrix.makeTranslation(coord.x-origin.x,coord.y-origin.y,coord.z).scale(new Vector3(scale,-scale,scale)).multiply(new Matrix4().makeRotationX(Math.PI/2));
    const visual=visualStates.get(a.id)??'garrison';let heading=-.18;if(a.journey){const j=a.journey,from=siteById[j.route[j.leg]],to=siteById[j.route[j.leg+1]];heading=Math.atan2(to.lon-from.lon,from.lat-to.lat);}m.body.rotation.y=heading;
    m.detail.visible=zoom>=7.4;m.camp.visible=zoom>=7.4&&(visual==='garrison'||visual==='siege');animating=animateMilitaryModel(m,visual,performance.now()/210+a.id,state.armyMotion)||animating;m.banner.rotation.y-=heading;
   }
   assets.pruneBanners(new Set([...models.values()].map(m=>'banner|'+m.realm+'|'+m.bannerName)));
   camera.projectionMatrix.fromArray(args.defaultProjectionData.mainMatrix).multiply(anchor);renderer.resetState();renderer.render(scene,camera);renderer.resetState();if(animating)map.triggerRepaint();
  }catch(e){failure(e);}
 },onRemove(){models.clear();assets?.dispose();renderer?.dispose();assets=undefined;renderer=undefined;map=undefined;}};
}
