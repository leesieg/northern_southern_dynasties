import {Group,InstancedMesh,Mesh,MeshStandardMaterial,Object3D,Vector3,type Scene} from 'three';
import {sites} from '../../data/scenario';
import type {World} from '../../core/types';
import {capital} from '../../core/realm';
import {worldRealms,realmOrigin} from '../../core/polityRuntime';
import {regimeName} from '../../core/government';
import {armyVisualState} from '../../core/armyPresentation';
import {roadHeading} from '../../core/routeGeometry';
import {campaignCoverage,controlledSite} from '../campaignDomains';
import {campaignCityAppearance,campaignCityKey,campaignCityMeters,campaignCityPlacements} from '../campaignScenery';
import {loadCampaignSampleAssets} from '../CampaignSampleAssets';
import {armyHeraldry} from '../ArmyHeraldry';
import {armyMapPosition,ARMY_MODEL_PIXELS,type ArmyMarkerPlacement} from '../armyMapPresentation';
import {militaryModelAssets,animateMilitaryModel,type MilitaryModel,type ArmyModelKind} from '../MilitaryModels';
import {projectGround} from './geography';
export interface CampaignState{world:World;selected:string;tilted:boolean;sceneryDetail:boolean;militaryModels:boolean;armyMotion:boolean;}
export interface ActorView{scene:Scene;height:(lon:number,lat:number)=>number|null;isRiver:(lon:number,lat:number)=>boolean;project:(ll:[number,number])=>{x:number;y:number};getZoom:()=>number;getSize:()=>{width:number;height:number};unitsPerPixel:()=>number;unitsPerPixelAt:(lon:number,lat:number)=>number;getTarget:()=>Vector3;repaint:()=>void;warning:(message:string)=>void;}
export async function campaignActors(view:ActorView,getState:()=>CampaignState,placement:(id:number)=>ArmyMarkerPlacement|undefined){
 const assets=await loadCampaignSampleAssets(),military=militaryModelAssets(view.repaint,view.warning),root=new Group();view.scene.add(root);
 const cities=new Map<string,{root:Group;key:string}>(),armies=new Map<number,MilitaryModel>();let world:World|undefined,viewKey='';
 const treeMaterial=new MeshStandardMaterial({name:'Leaf campaign',vertexColors:true,roughness:1}),trees=new InstancedMesh(assets.tree,treeMaterial,4000);trees.count=0;trees.castShadow=true;trees.receiveShadow=true;root.add(trees);
 function refresh(){
  const state=getState(),zoom=view.getZoom(),size=view.getSize(),known=campaignCoverage(state.world),capitals=new Set(worldRealms(state.world).map(r=>capital(r,state.world)));
  const visible=zoom<6.2?[]:campaignCityPlacements(sites.filter(s=>controlledSite(state.world,s.id)).map(site=>({site,capital:capitals.has(site.id),point:view.project([site.lon,site.lat])})).filter(p=>p.point.x>=-30&&p.point.x<=size.width+30&&p.point.y>=-30&&p.point.y<=size.height+30),state.selected,zoom);
  const keep=new Set(visible.map(v=>v.site.id));for(const [id,c] of cities)if(!keep.has(id)){root.remove(c.root);cities.delete(id);}
  const keys=new Set<string>(),flags=new Set<string>();
  for(const {site} of visible){const appearance=campaignCityAppearance(state.world,site),realm=state.world.realm?.cities[site.id]?.controller??site.polity,flag=armyHeraldry(realm,regimeName(state.world,realm),state.world),key=campaignCityKey(appearance)+':'+flag;keys.add(campaignCityKey(appearance)+':close');flags.add(flag);let city=cities.get(site.id);
   if(!city||city.key!==key){if(city)root.remove(city.root);const model=assets.city(appearance,'close',flag,view.repaint);model.userData.site=site.id;model.traverse(o=>{if(o instanceof Mesh){o.castShadow=true;o.receiveShadow=true;}});city={root:model,key};cities.set(site.id,city);root.add(model);}
   const p=projectGround(site.lon,site.lat),height=view.height(site.lon,site.lat);city.root.visible=height!==null;if(height!==null)city.root.position.set(p.x,height+.08,p.z);city.root.scale.setScalar(campaignCityMeters(site,appearance.capital)/17000/Math.cos(site.lat*Math.PI/180));
  }
  assets.prune(keys,flags);
  trees.count=0;if(zoom>=6.2&&state.sceneryDetail){const center=view.getTarget(),range=Math.min(250,Math.max(45,view.unitsPerPixel()*size.width*.6)),cell=12,dummy=new Object3D();
   for(let x=Math.floor((center.x-range)/cell);x<=Math.ceil((center.x+range)/cell);x++)for(let z=Math.floor((center.z-range)/cell);z<=Math.ceil((center.z+range)/cell);z++)for(let i=0;i<10&&trees.count<4000;i++){
    let seed=Math.imul(x+9187,374761393)^Math.imul(z+411,668265263)^Math.imul(i+3,1274126177);const rand=()=>{seed=(Math.imul(1664525,seed)+1013904223)|0;return (seed>>>0)/4294967296;};const px=(x+rand())*cell,pz=(z+rand())*cell;
    // Inverse projection uses the same origin as terrain; placement is explicitly art-directed.
    const ll=viewPosition(px,pz),h=view.height(ll.lng,ll.lat);
    if(h===null||h<1||view.isRiver(ll.lng,ll.lat)||!known(ll.lng,ll.lat)||visible.some(v=>{const p=projectGround(v.site.lon,v.site.lat);return Math.abs(p.x-px)<10&&Math.abs(p.z-pz)<8;})||Math.abs((view.height(ll.lng+.006,ll.lat)??h)-h)>2)continue;
    dummy.position.set(px,h,pz);dummy.scale.setScalar(.45+rand()*.8);dummy.rotation.y=rand()*Math.PI*2;dummy.updateMatrix();trees.setMatrixAt(trees.count++,dummy.matrix);
   }trees.instanceMatrix.needsUpdate=true;trees.computeBoundingSphere();}
  world=state.world;viewKey=[Math.round(zoom*5),Math.round(view.getTarget().x/10),Math.round(view.getTarget().z/10),state.selected,state.sceneryDetail,state.tilted].join(':');
 }
 function update(now:number){const state=getState(),key=[Math.round(view.getZoom()*5),Math.round(view.getTarget().x/10),Math.round(view.getTarget().z/10),state.selected,state.sceneryDetail,state.tilted].join(':');if(world!==state.world||key!==viewKey)refresh();
  const list=state.world.realm?.armies??[],ids=new Set(list.map(a=>a.id));for(const [id,m] of armies)if(!ids.has(id)){root.remove(m.root);armies.delete(id);}let moving=false;const known=campaignCoverage(state.world);
  for(const a of list){if(a.id===undefined)continue;const kind:ArmyModelKind=a.regiments?.some(u=>u.kind==='heavyHorse'||u.kind==='lightHorse')?'horse':a.regiments?.some(u=>u.kind==='siege')?'siege':'foot',name=regimeName(state.world,a.realm);let m=armies.get(a.id);
   if(!m||m.kind!==kind||m.realm!==a.realm||m.bannerName!==name||m.origin!==realmOrigin(state.world,a.realm)){if(m)root.remove(m.root);m=military.create(a,kind,name,state.world);m.root.matrixAutoUpdate=true;m.root.traverse(o=>{if(o instanceof Mesh){o.castShadow=true;o.receiveShadow=true;}});armies.set(a.id,m);root.add(m.root);}
   const at=armyMapPosition(a),h=view.height(at.lon,at.lat);m.root.visible=state.militaryModels&&!!placement(a.id)?.model&&h!==null&&known(at.lon,at.lat);if(!m.root.visible)continue;
   const p=projectGround(at.lon,at.lat);m.root.position.set(p.x,h!+.08,p.z);m.root.scale.setScalar(view.unitsPerPixelAt(at.lon,at.lat)*ARMY_MODEL_PIXELS);const visual=armyVisualState(state.world,a);m.body.rotation.y=a.journey?roadHeading(a.journey):-.18;m.detail.visible=view.getZoom()>=7.4;m.camp.visible=view.getZoom()>=7.4&&(visual==='garrison'||visual==='siege');moving=animateMilitaryModel(m,visual,now/210+a.id,state.armyMotion)||moving;
  }military.pruneBanners(new Set([...armies.values()].map(m=>'banner|'+m.origin+'|'+m.realm+'|'+m.bannerName)));return moving;
 }
 return {root,update,refresh,farmCenters:()=>[...cities.values()].slice(0,2).map(c=>({x:c.root.position.x,z:c.root.position.z})),showsSite:(id:string)=>!!cities.get(id)?.root.visible,cityRoots:()=>[...cities.values()].map(c=>c.root).filter(root=>root.visible),dispose(){view.scene.remove(root);trees.dispose();treeMaterial.dispose();military.dispose();assets.dispose();}};
}
import {unprojectGround as viewPosition} from './geography';
