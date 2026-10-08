import {Camera,Scene,DirectionalLight,HemisphereLight,FogExp2,WebGLRenderer,Matrix4,Vector3,Raycaster,Mesh,InstancedMesh,ACESFilmicToneMapping,type Object3D,type BufferGeometry} from 'three';
import {MercatorCoordinate,type Map,type CustomLayerInterface} from 'maplibre-gl';
import type {World} from '../core/types';
import {sites,siteById} from '../data/scenario';
import {loadCampaignSampleAssets} from './CampaignSampleAssets';
import {controlledSite,campaignCoverage,domainSignature} from './campaignDomains';
import {createSeasonState,seasons} from './sample/seasons';
import {campaignSeason} from './campaignSeason';
import {armyHeraldry} from './ArmyHeraldry';
import {regimeName} from '../core/government';
import {campaignCityAppearance,campaignCityKey,campaignCityPixels,campaignCityMeters,campaignCityPlacements,sceneryVisible,CITY_DETAIL_ZOOM,MAX_DETAILED_CITIES} from './campaignScenery';
import {updateMilitaryCamera,positionMilitaryModel,militaryModelScale,addMilitaryLighting} from './militaryRendering';
import {sampleCityGround,groundCityGeometry,waterMaskContains,CAMPAIGN_EXPOSURE} from './campaignTerrain';
import {campaignEnvironment} from './CampaignEnvironment';
import {capital} from '../core/realm';
import {worldRealms} from '../core/polityRuntime';

/** Static campaign city scenery in the map's existing WebGL context. No independent animation loop.
 * Geographic coordinates stay authoritative; this layer only exaggerates miniature dimensions. */
export interface CampaignSceneryLayer extends CustomLayerInterface {siteAt:(point:{x:number;y:number})=>string|null;showsSite:(id:string)=>boolean;}
type CityInstance={root:ReturnType<Awaited<ReturnType<typeof loadCampaignSampleAssets>>['city']>;key:string;capital:boolean;template:BufferGeometry;groundKey:string};
export function campaignLayer(getState:()=>{world:World;selected:string;tilted:boolean;sceneryDetail?:boolean},onFailure:(reason:string)=>void,onChange:()=>void):CampaignSceneryLayer {
 const scene=new Scene(),camera=new Camera(),origin=MercatorCoordinate.fromLngLat([110,32]);
 const anchor=new Matrix4().makeTranslation(origin.x,origin.y,0).scale(new Vector3(1,-1,1));
 const cities=new globalThis.Map<string,CityInstance>();
 const environment=campaignEnvironment(origin);scene.add(environment.root);
 const ray=new Raycaster(),far=new Vector3();
 let map:Map|undefined,renderer:WebGLRenderer|undefined,assets:Awaited<ReturnType<typeof loadCampaignSampleAssets>>|undefined;
 const season=createSeasonState('z');
 let removed=false;let failed=false,dirty=true,environmentKey='',displayedWorld:World|undefined,lastSelected='',lastTilt:boolean|undefined,lastDetail:boolean|undefined;
 let refreshTimer:ReturnType<typeof setTimeout>|undefined;
 const markView=()=>{dirty=true;map?.triggerRepaint();};
 const markSource=(event:{sourceId?:string})=>{
  if(!['dem-terrain','natural'].includes(event.sourceId??''))return;
  if(refreshTimer)return;
  refreshTimer=setTimeout(()=>{refreshTimer=undefined;markView();},400);
 };
 function failure(e:unknown){
  failed=true;renderer?.resetState();onChange();onFailure('城池图层无法显示，已保留城邑铭牌与地图操作：'+(e instanceof Error?e.message:'WebGL 不可用'));
 }
 function removeCity(c:CityInstance){const body=c.root.children[0] as Mesh;if(body.geometry!==c.template)body.geometry.dispose();scene.remove(c.root);}
 function clearCities(){for(const c of cities.values())removeCity(c);cities.clear();environment.root.visible=false;}
 function elevation(lon:number,lat:number){if(!getState().tilted)return 0;return map?.queryTerrainElevation({lng:lon,lat})??null;}
 function refreshCities(){
  if(!map||!assets)return;const state=getState(),w=map.getCanvas().clientWidth,h=map.getCanvas().clientHeight;
  const capitals=new Set(worldRealms(state.world).filter(r=>!state.world.realm?.annexed?.[r]).map(r=>capital(r,state.world)));
  const visible=campaignCityPlacements(sites.filter(site=>controlledSite(state.world,site.id)).map(site=>({site,point:map!.project([site.lon,site.lat]),capital:capitals.has(site.id)}))
   .filter(p=>p.point.x>=0&&p.point.x<=w&&p.point.y>=0&&p.point.y<=h),state.selected,map.getZoom());
  const ids=new Set(visible.map(p=>p.site.id));for(const [id,c] of cities)if(!ids.has(id)){removeCity(c);cities.delete(id);}
  const active=new Set<string>();
  let detailed=0;
  for(const {site} of visible){
   const detail=state.sceneryDetail!==false&&map.getZoom()>=CITY_DETAIL_ZOOM&&detailed++<MAX_DETAILED_CITIES?'close':'regional';
   const appearance=campaignCityAppearance(state.world,site),key=campaignCityKey(appearance)+':'+detail,signature=key+':'+appearance.color+':'+(state.world.realm?.cities[site.id]?.controller??site.polity)+':'+regimeName(state.world,state.world.realm?.cities[site.id]?.controller??site.polity);
   active.add(key);let c=cities.get(site.id);
   if(!c||c.key!==signature){if(c)removeCity(c);const realm=state.world.realm?.cities[site.id]?.controller??site.polity;const root=assets.city(appearance,detail,armyHeraldry(realm,regimeName(state.world,realm),state.world),markView);root.userData.site=site.id;root.matrixAutoUpdate=false;c={root,key:signature,capital:appearance.capital,template:(root.children[0] as Mesh).geometry,groundKey:''};cities.set(site.id,c);scene.add(root);}
   if(dirty||lastTilt!==state.tilted)c.groundKey='';
  }
  environment.root.visible=true;
  const nextEnvironmentKey=visible.map(p=>p.site.id+':'+p.capital).join(',')+domainSignature(state.world);
  if(dirty||lastTilt!==state.tilted||lastDetail!==state.sceneryDetail||lastSelected!==state.selected||environmentKey!==nextEnvironmentKey){environment.refresh(map,visible.map(p=>({id:p.site.id,capital:p.capital})),state.tilted,state.sceneryDetail!==false,campaignCoverage(state.world));environmentKey=nextEnvironmentKey;}
  assets.prune(active,new Set(visible.map(p=>{const realm=state.world.realm?.cities[p.site.id]?.controller??p.site.polity;return armyHeraldry(realm,regimeName(state.world,realm),state.world);})));onChange();
 }
 function positionCities(projection:ArrayLike<number>){
  if(!map)return;
  for(const [id,c] of cities){
   const site=siteById[id],height=elevation(site.lon,site.lat);
   if(height===null){c.root.visible=false;continue;}
   const coord=MercatorCoordinate.fromLngLat([site.lon,site.lat],height),zoom=map.getZoom();
   const screenScale=militaryModelScale(projection,coord,map.getCanvas().clientWidth,campaignCityPixels(site,c.capital,zoom))/17,geographicScale=campaignCityMeters(site,c.capital)/17*coord.meterInMercatorCoordinateUnits();
   const transition=Math.max(0,Math.min(1,(zoom-7.8)/.8)),blend=transition*transition*(3-2*transition),scale=screenScale*(1-blend)+geographicScale*blend;
   if(!Number.isFinite(scale)||scale<=0){c.root.visible=false;continue;}c.root.visible=true;
   const meters=scale/coord.meterInMercatorCoordinateUnits(),groundKey=Math.round(meters)+':'+height+':'+getState().tilted;
   if(c.groundKey!==groundKey){
    const ground=sampleCityGround((x,z)=>elevation(site.lon+x*meters/(111320*Math.cos(site.lat*Math.PI/180)),site.lat-z*meters/111320));
    if(!ground){c.root.visible=false;continue;}
    const body=c.root.children[0] as Mesh;if(body.geometry!==c.template)body.geometry.dispose();
    const waterLayers=['ocean','inland-water','rivers-major','rivers-minor'].filter(id=>!!map!.getLayer(id));
    const corners=[[-15,-15],[-15,15],[15,-15],[15,15]].map(([x,z])=>map!.project([site.lon+x*meters/(111320*Math.cos(site.lat*Math.PI/180)),site.lat-z*meters/111320]));
    const water=map.queryRenderedFeatures([[Math.min(...corners.map(p=>p.x)),Math.min(...corners.map(p=>p.y))],[Math.max(...corners.map(p=>p.x)),Math.max(...corners.map(p=>p.y))]],{layers:waterLayers});
    body.geometry=groundCityGeometry(c.template,ground,meters,(x,z)=>{
     const p=[site.lon+x*meters/(111320*Math.cos(site.lat*Math.PI/180)),site.lat-z*meters/111320];return water.some(f=>waterMaskContains(p,f.geometry));
    });c.groundKey=groundKey;
   }
   positionMilitaryModel(c.root.matrix,coord,origin,scale);
  }
 }
 return {id:'campaign-scenery',type:'custom',renderingMode:'3d',showsSite(id){return !failed&&!!map&&sceneryVisible(map.getZoom())&&!!cities.get(id)?.root.visible;},siteAt(point){
  if(failed||!map||!sceneryVisible(map.getZoom()))return null;
  const canvas=map.getCanvas(),x=point.x/canvas.clientWidth*2-1,y=1-point.y/canvas.clientHeight*2;
  // Generic MapLibre camera: derive the ray from its actual inverse matrices, not setFromCamera's perspective-camera branch.
  ray.ray.origin.set(x,y,-1).unproject(camera);far.set(x,y,1).unproject(camera);ray.ray.direction.copy(far).sub(ray.ray.origin).normalize();
  const hit=ray.intersectObjects([...cities.values()].filter(c=>c.root.visible).map(c=>c.root),true)[0];
  if(hit&&getState().tilted){
   // The GPU depth buffer hides mountains, but CPU raycasting does not. Check the same DEM along the sightline.
   const sample=new Vector3();
   for(let i=1;i<16;i++){
    sample.lerpVectors(ray.ray.origin,hit.point,i/16);const at=new MercatorCoordinate(sample.x+origin.x,origin.y-sample.y,sample.z),terrain=map.queryTerrainElevation(at.toLngLat());
    if(terrain!==null&&terrain>at.toAltitude()+3)return null;
   }
  }
  let root:Object3D|undefined=hit?.object;while(root&&!root.userData.site)root=root.parent??undefined;
  return root?.userData.site??null;
 },onAdd(m,gl){
  map=m;
  try{
   renderer=new WebGLRenderer({canvas:m.getCanvas(),context:gl,antialias:true});renderer.autoClear=false;
   renderer.toneMapping=ACESFilmicToneMapping;renderer.toneMappingExposure=CAMPAIGN_EXPOSURE;
   addMilitaryLighting(scene);
   void loadCampaignSampleAssets().then(loaded=>{if(removed){loaded.dispose();return;}assets=loaded;environment.useSampleTree(loaded.tree);markView();}).catch(e=>{if(!removed)failure(e);});
   m.on('moveend',markView);m.on('sourcedata',markSource);
  }catch(e){failure(e);}
 },render(_gl,args){
  if(failed||!map||!renderer||!assets)return;
  const state=getState();
  if(!sceneryVisible(map.getZoom())){
   if(cities.size){clearCities();onChange();}
   dirty=true;return;
  }
  try{
   const worldChanged=displayedWorld!==state.world,viewChanged=lastSelected!==state.selected||lastTilt!==state.tilted||lastDetail!==state.sceneryDetail;
   if(dirty||worldChanged||viewChanged){refreshCities();dirty=false;}
   if(worldChanged){const value=campaignSeason(state.world),p=seasons[value];season.set(value);if(scene.fog instanceof FogExp2)scene.fog.color.set(p.fog);scene.traverse(o=>{if(o instanceof HemisphereLight)o.color.set(p.sky);if(o instanceof DirectionalLight&&o.position.x<0){o.color.set(p.sun);o.intensity=p.intensity;}});}
   if(dirty||worldChanged||viewChanged)season.sync(scene);positionCities(args.defaultProjectionData.mainMatrix);
   displayedWorld=state.world;lastSelected=state.selected;lastTilt=state.tilted;lastDetail=state.sceneryDetail;
   updateMilitaryCamera(camera,args.projectionMatrix,args.defaultProjectionData.mainMatrix,anchor);
   renderer.resetState();renderer.render(scene,camera);renderer.resetState();
   if(import.meta.env.DEV&&map.getCanvas().dataset){map.getCanvas().dataset.campaignTrees=String((environment.root.children[0] as InstancedMesh).count);map.getCanvas().dataset.campaignCities=String([...cities.values()].filter(c=>c.root.visible).length);}
  }catch(e){failure(e);}
 },onRemove(){
  removed=true;if(refreshTimer)clearTimeout(refreshTimer);map?.off('moveend',markView);map?.off('sourcedata',markSource);
  clearCities();environment.dispose();assets?.dispose();renderer?.dispose();
  renderer=undefined;assets=undefined;map=undefined;
 }};
}
