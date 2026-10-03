import {Camera,Scene,WebGLRenderer,Matrix4,Vector3,Raycaster,HemisphereLight,DirectionalLight,ACESFilmicToneMapping,type Object3D} from 'three';
import {MercatorCoordinate,type Map,type CustomLayerInterface} from 'maplibre-gl';
import type {World} from '../core/types';
import {sites,siteById} from '../data/scenario';
import {campaignModelAssets} from './CampaignModels';
import {campaignCityAppearance,campaignCityKey,campaignCityPixels,campaignCityPlacements,sceneryVisible} from './campaignScenery';
import {updateMilitaryCamera,positionMilitaryModel,militaryModelScale} from './militaryRendering';
import {capital} from '../core/realm';
import {worldRealms} from '../core/polityRuntime';

/** Static campaign city scenery in the map's existing WebGL context. No independent animation loop.
 * Geographic coordinates stay authoritative; this layer only exaggerates miniature dimensions. */
export interface CampaignSceneryLayer extends CustomLayerInterface {siteAt:(point:{x:number;y:number})=>string|null;showsSite:(id:string)=>boolean;}
export function campaignLayer(getState:()=>{world:World;selected:string;tilted:boolean},onFailure:(reason:string)=>void,onChange:()=>void):CampaignSceneryLayer {
 const scene=new Scene(),camera=new Camera(),origin=MercatorCoordinate.fromLngLat([110,32]);
 const anchor=new Matrix4().makeTranslation(origin.x,origin.y,0).scale(new Vector3(1,-1,1));
 const cities=new globalThis.Map<string,{root:ReturnType<ReturnType<typeof campaignModelAssets>['city']>;key:string;capital:boolean}>();
 const ray=new Raycaster(),far=new Vector3();
 let map:Map|undefined,renderer:WebGLRenderer|undefined,assets:ReturnType<typeof campaignModelAssets>|undefined;
 let failed=false,dirty=true,fallbackVisible=true,displayedWorld:World|undefined,lastSelected='',lastTilt:boolean|undefined;
 let refreshTimer:ReturnType<typeof setTimeout>|undefined;
 const markView=()=>{dirty=true;map?.triggerRepaint();};
 const markSource=(event:{sourceId?:string})=>{
  if(event.sourceId!=='dem-terrain')return;
  if(refreshTimer)return;
  refreshTimer=setTimeout(()=>{refreshTimer=undefined;markView();},400);
 };
 function fallback(visible=true){if(fallbackVisible!==visible&&map?.getLayer('settlement-buildings')){map.setLayoutProperty('settlement-buildings','visibility',visible?'visible':'none');fallbackVisible=visible;}}
 function failure(e:unknown){
  failed=true;renderer?.resetState();fallback();onChange();onFailure('城池图层无法显示，已保留基础城邑与地图操作：'+(e instanceof Error?e.message:'WebGL 不可用'));
 }
 function clearCities(){for(const c of cities.values())scene.remove(c.root);cities.clear();}
 function elevation(lon:number,lat:number){return map?.queryTerrainElevation({lng:lon,lat})??0;}
 function refreshCities(){
  if(!map||!assets)return;const state=getState(),w=map.getCanvas().clientWidth,h=map.getCanvas().clientHeight;
  const capitals=new Set(worldRealms(state.world).filter(r=>!state.world.realm?.annexed?.[r]).map(r=>capital(r,state.world)));
  const visible=campaignCityPlacements(sites.map(site=>({site,point:map!.project([site.lon,site.lat]),capital:capitals.has(site.id)}))
   .filter(p=>p.point.x>=0&&p.point.x<=w&&p.point.y>=0&&p.point.y<=h),state.selected,map.getZoom());
  const ids=new Set(visible.map(p=>p.site.id));for(const [id,c] of cities)if(!ids.has(id)){scene.remove(c.root);cities.delete(id);}
  const active=new Set<string>();
  for(const {site} of visible){
   const appearance=campaignCityAppearance(state.world,site),key=campaignCityKey(appearance),signature=key+':'+appearance.color;
   active.add(key);let c=cities.get(site.id);
   if(!c||c.key!==signature){if(c)scene.remove(c.root);const root=assets.city(appearance);root.userData.site=site.id;root.matrixAutoUpdate=false;c={root,key:signature,capital:appearance.capital};cities.set(site.id,c);scene.add(root);}
  }
  assets.prune(active);onChange();
 }
 function positionCities(projection:ArrayLike<number>){
  if(!map)return;
  for(const [id,c] of cities){
   const site=siteById[id],coord=MercatorCoordinate.fromLngLat([site.lon,site.lat],elevation(site.lon,site.lat));
   const scale=militaryModelScale(projection,coord,map.getCanvas().clientWidth,campaignCityPixels(site,c.capital,map.getZoom()))/17;
   if(!Number.isFinite(scale)||scale<=0){c.root.visible=false;continue;}c.root.visible=true;
   positionMilitaryModel(c.root.matrix,coord,origin,scale);
  }
 }
 return {id:'campaign-scenery',type:'custom',renderingMode:'3d',showsSite(id){return !failed&&!!map&&sceneryVisible(map.getZoom())&&cities.has(id);},siteAt(point){
  if(failed||!map||!sceneryVisible(map.getZoom()))return null;
  const canvas=map.getCanvas(),x=point.x/canvas.clientWidth*2-1,y=1-point.y/canvas.clientHeight*2;
  // Generic MapLibre camera: derive the ray from its actual inverse matrices, not setFromCamera's perspective-camera branch.
  ray.ray.origin.set(x,y,-1).unproject(camera);far.set(x,y,1).unproject(camera);ray.ray.direction.copy(far).sub(ray.ray.origin).normalize();
  const hit=ray.intersectObjects([...cities.values()].filter(c=>c.root.visible).map(c=>c.root),true)[0];
  let root:Object3D|undefined=hit?.object;while(root&&!root.userData.site)root=root.parent??undefined;
  return root?.userData.site??null;
 },onAdd(m,gl){
  map=m;
  try{
   renderer=new WebGLRenderer({canvas:m.getCanvas(),context:gl,antialias:true});renderer.autoClear=false;
   renderer.toneMapping=ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
   const sky=new HemisphereLight('#fff2cf','#526253',1.6);sky.position.set(0,0,1);
   const sun=new DirectionalLight('#fff0cc',2.1);sun.position.set(-1,-1,1.8);scene.add(sky,sun);
   assets=campaignModelAssets();
   m.on('moveend',markView);m.on('sourcedata',markSource);
  }catch(e){failure(e);}
 },render(_gl,args){
  if(failed||!map||!renderer||!assets)return;
  const state=getState();
  if(!sceneryVisible(map.getZoom())){
   if(cities.size){clearCities();onChange();}
   dirty=true;fallback();return;
  }
  try{
   const worldChanged=displayedWorld!==state.world,viewChanged=lastSelected!==state.selected||lastTilt!==state.tilted;
   if(dirty||worldChanged||viewChanged){refreshCities();dirty=false;}
   positionCities(args.defaultProjectionData.mainMatrix);
   displayedWorld=state.world;lastSelected=state.selected;lastTilt=state.tilted;
   updateMilitaryCamera(camera,args.projectionMatrix,args.defaultProjectionData.mainMatrix,anchor);
   renderer.resetState();renderer.render(scene,camera);renderer.resetState();
   // Keep the extrusion fallback until the first successful actual render.
   fallback(false);
  }catch(e){failure(e);}
 },onRemove(){
  if(refreshTimer)clearTimeout(refreshTimer);map?.off('moveend',markView);map?.off('sourcedata',markSource);
  clearCities();assets?.dispose();renderer?.dispose();
  renderer=undefined;assets=undefined;map=undefined;
 }};
}
