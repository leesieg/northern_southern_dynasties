import {realmOrigin} from '../core/polityRuntime';
import {Camera,Scene,WebGLRenderer,Matrix4,Vector3,ACESFilmicToneMapping} from 'three';
import {MercatorCoordinate,type Map,type CustomLayerInterface} from 'maplibre-gl';
import {armyVisualState} from '../core/armyPresentation';
import {regimeName} from '../core/government';
import type {World} from '../core/types';
import {roadHeading} from '../core/routeGeometry';
import {CAMPAIGN_EXPOSURE} from './campaignTerrain';
import {ARMY_MODEL_PIXELS,armyShowsModel,armyMapPosition,type ArmyMarkerPlacement} from './armyMapPresentation';
import {militaryModelAssets,animateMilitaryModel,armyModelKind,type MilitaryModel} from './MilitaryModels';
import {addMilitaryLighting,militaryModelScale,positionMilitaryModel,updateMilitaryCamera} from './militaryRendering';
// One shared MapLibre canvas/context; representative original military miniatures.
export function militaryLayer(getState:()=>{world:World;militaryModels:boolean;armyMotion:boolean},onFailure:(reason:string)=>void,onReady:()=>void,getPlacement:(id:number)=>ArmyMarkerPlacement|undefined):CustomLayerInterface{
 // Mercator Y points south. Convert once at the scene boundary so Three keeps right-handed view/model matrices.
 const camera=new Camera(),scene=new Scene(),origin=MercatorCoordinate.fromLngLat([110,32]),anchor=new Matrix4().makeTranslation(origin.x,origin.y,0).scale(new Vector3(1,-1,1)),models=new globalThis.Map<number,MilitaryModel>(),visualStates=new globalThis.Map<number,ReturnType<typeof armyVisualState>>();
 let displayedWorld:World|undefined,renderer:WebGLRenderer|undefined,map:Map|undefined,failed=false,assets:ReturnType<typeof militaryModelAssets>|undefined;
 function failure(e:unknown){failed=true;onFailure('军队 3D 图层无法显示，保留军旗操作：'+(e instanceof Error?e.message:'WebGL 不可用'));}
 return {id:'military-models',type:'custom',renderingMode:'3d',onAdd(m,gl){
  map=m;try{
   renderer=new WebGLRenderer({canvas:m.getCanvas(),context:gl,antialias:true});renderer.autoClear=false;renderer.toneMapping=ACESFilmicToneMapping;renderer.toneMappingExposure=CAMPAIGN_EXPOSURE;
   addMilitaryLighting(scene);
   assets=militaryModelAssets(()=>map?.triggerRepaint(),message=>failure(new Error(message)));onReady();
  }catch(e){failure(e);}
 },render(_gl,args){
  if(failed||!map||!renderer||!assets)return;const state=getState(),armies=state.world.realm?.armies??[],zoom=map.getZoom();if(!armyShowsModel(zoom,state.militaryModels))return;
  try{
   if(displayedWorld!==state.world){displayedWorld=state.world;visualStates.clear();for(const a of armies)visualStates.set(a.id!,armyVisualState(state.world,a));}
   const ids=new Set(armies.map(a=>a.id!));for(const [id,m] of models)if(!ids.has(id)){assets.release(m);models.delete(id);}let animating=false;
   for(const a of armies){
    if(!a.id)continue;const kind=armyModelKind(a),name=regimeName(state.world,a.realm);let m=models.get(a.id);
    if(!m||m.kind!==kind||m.realm!==a.realm||m.bannerName!==name||m.origin!==realmOrigin(state.world,a.realm)){if(m)assets.release(m);m=assets.create(a,kind,name,state.world);scene.add(m.root);models.set(a.id,m);}
    const placement=getPlacement(a.id);m.root.visible=!!placement?.model;if(!placement?.model)continue;
    const {lon,lat}=armyMapPosition(a),modelAnchor={lng:lon,lat};
    const elevation=map.queryTerrainElevation(modelAnchor)??0,coord=MercatorCoordinate.fromLngLat(modelAnchor,elevation),scale=militaryModelScale(args.defaultProjectionData.mainMatrix,coord,map.getCanvas().clientWidth,ARMY_MODEL_PIXELS);
    positionMilitaryModel(m.root.matrix,coord,origin,scale);
    const visual=visualStates.get(a.id)??'garrison',heading=a.journey?roadHeading(a.journey):-.18;m.body.rotation.y=heading;
    m.camp.visible=zoom>=7.4&&(visual==='garrison'||visual==='siege');animating=animateMilitaryModel(m,visual,performance.now()/1000,state.armyMotion)||animating;m.banner.rotation.y-=heading;
   }
   assets.pruneBanners(new Set([...models.values()].map(m=>'banner|'+m.origin+'|'+m.realm+'|'+m.bannerName)));
   updateMilitaryCamera(camera,args.projectionMatrix,args.defaultProjectionData.mainMatrix,anchor);renderer.resetState();renderer.render(scene,camera);renderer.resetState();if(animating)map.triggerRepaint();
  }catch(e){failure(e);}
 },onRemove(){models.clear();assets?.dispose();renderer?.dispose();assets=undefined;renderer=undefined;map=undefined;}};
}
