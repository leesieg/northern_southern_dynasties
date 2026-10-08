import {Group,InstancedMesh,Mesh,MeshStandardMaterial,Object3D,Vector3,type Scene} from 'three';
import type {Season} from '../sample/seasons';
import {sites} from '../../data/scenario';
import type {World} from '../../core/types';
import {capital} from '../../core/realm';
import {worldRealms,realmOrigin} from '../../core/polityRuntime';
import {regimeName} from '../../core/government';
import {armyVisualState} from '../../core/armyPresentation';
import {roadHeading} from '../../core/routeGeometry';
import {campaignCoverage,controlledSite,domainSignature} from '../campaignDomains';
import {campaignCityAppearance,campaignCityKey,campaignCityMeters,campaignCityPlacements} from '../campaignScenery';
import {loadCampaignSampleAssets} from '../CampaignSampleAssets';
import {armyHeraldry} from '../ArmyHeraldry';
import {armyMapPosition,ARMY_MODEL_PIXELS,type ArmyMarkerPlacement} from '../armyMapPresentation';
import {militaryModelAssets,animateMilitaryModel,type MilitaryModel,type ArmyModelKind} from '../MilitaryModels';
import {vegetationCandidates} from './vegetation';
import {projectGround} from './geography';
export interface CampaignState{seasonPreview?:Season;world:World;selected:string;tilted:boolean;sceneryDetail:boolean;militaryModels:boolean;armyMotion:boolean;}
export interface ActorView{scene:Scene;height:(lon:number,lat:number)=>number|null;isRiver:(lon:number,lat:number)=>boolean;isLand:(lon:number,lat:number)=>boolean;isMoving:()=>boolean;project:(ll:[number,number])=>{x:number;y:number};getZoom:()=>number;getSize:()=>{width:number;height:number};unitsPerPixel:()=>number;unitsPerPixelAt:(lon:number,lat:number)=>number;getTarget:()=>Vector3;getViewKey:()=>string;repaint:()=>void;warning:(message:string)=>void;}
export async function campaignActors(view:ActorView,getState:()=>CampaignState,placement:(id:number)=>ArmyMarkerPlacement|undefined){
 const assets=await loadCampaignSampleAssets(),military=militaryModelAssets(view.repaint,view.warning),root=new Group();view.scene.add(root);
 const cities=new Map<string,{root:Group;key:string}>(),armies=new Map<number,MilitaryModel>();let world:World|undefined,viewKey='',forestKey='',coverageKey='',revision=0;
 const treeMaterial=new MeshStandardMaterial({name:'Leaf campaign',vertexColors:true,roughness:1}),trees=new InstancedMesh(assets.tree,treeMaterial,2400);trees.count=0;trees.castShadow=true;trees.receiveShadow=true;root.add(trees);
 function refresh(forceTerrain=true){
  const state=getState(),zoom=view.getZoom(),size=view.getSize(),known=campaignCoverage(state.world),capitals=new Set(worldRealms(state.world).map(r=>capital(r,state.world)));
  const visible=zoom<6.2?[]:campaignCityPlacements(sites.filter(s=>controlledSite(state.world,s.id)).map(site=>({site,capital:capitals.has(site.id),point:view.project([site.lon,site.lat])})).filter(p=>p.point.x>=-30&&p.point.x<=size.width+30&&p.point.y>=-30&&p.point.y<=size.height+30),state.selected,zoom);
  const keep=new Set(visible.map(v=>v.site.id));for(const [id,c] of cities)if(!keep.has(id)){root.remove(c.root);cities.delete(id);}
  const keys=new Set<string>(),flags=new Set<string>();
  for(const {site} of visible){const appearance=campaignCityAppearance(state.world,site),realm=state.world.realm?.cities[site.id]?.controller??site.polity,flag=armyHeraldry(realm,regimeName(state.world,realm),state.world),key=campaignCityKey(appearance)+':'+flag;keys.add(campaignCityKey(appearance)+':close');flags.add(flag);let city=cities.get(site.id);
   if(!city||city.key!==key){if(city)root.remove(city.root);const model=assets.city(appearance,'close',flag,view.repaint);model.userData.site=site.id;model.traverse(o=>{if(o instanceof Mesh){o.castShadow=true;o.receiveShadow=true;}});city={root:model,key};cities.set(site.id,city);root.add(model);}
   const p=projectGround(site.lon,site.lat),height=view.height(site.lon,site.lat);city.root.visible=height!==null;if(height!==null)city.root.position.set(p.x,height+.08,p.z);city.root.scale.setScalar(campaignCityMeters(site,appearance.capital)/17000/Math.cos(site.lat*Math.PI/180));
  }
  assets.prune(keys,flags);
  if(world!==state.world)coverageKey=domainSignature(state.world);
  const nextForest=[view.getViewKey(),Math.round(zoom*5),Math.round(view.getTarget().x/10),Math.round(view.getTarget().z/10),state.sceneryDetail,state.tilted,coverageKey,visible.map(v=>v.site.id+':'+v.capital).join(',')].join('|');
  if(forceTerrain||forestKey!==nextForest){forestKey=nextForest;
  trees.count=0;if(zoom>=5.4&&state.sceneryDetail&&state.tilted){const center=view.getTarget(),range=Math.min(400,Math.max(60,view.unitsPerPixel()*Math.max(size.width,size.height)*.9)),dummy=new Object3D(),footprints=visible.map(v=>({...projectGround(v.site.lon,v.site.lat),radius:campaignCityMeters(v.site,v.capital)/2000/Math.cos(v.site.lat*Math.PI/180)+1}));
   for(const p of vegetationCandidates(center.x,center.z,range)){
    if(trees.count>=2400)break;
    const ll=viewPosition(p.x,p.z),screen=view.project([ll.lng,ll.lat]);
    if(screen.x< -20||screen.x>size.width+20||screen.y< -20||screen.y>size.height+20||!view.isLand(ll.lng,ll.lat))continue;
    const h=view.height(ll.lng,ll.lat);
    if(h===null||view.isRiver(ll.lng,ll.lat)||!known(ll.lng,ll.lat)||footprints.some(c=>Math.abs(c.x-p.x)<c.radius&&Math.abs(c.z-p.z)<c.radius)||Math.abs((view.height(ll.lng+.006,ll.lat)??h)-h)>2)continue;
    dummy.position.set(p.x,h,p.z);dummy.scale.setScalar(p.scale);dummy.rotation.y=p.rotation;dummy.updateMatrix();trees.setMatrixAt(trees.count++,dummy.matrix);
   }
  }trees.instanceMatrix.needsUpdate=true;trees.computeBoundingSphere();}
  revision++;world=state.world;viewKey=[view.getViewKey(),Math.round(zoom*5),Math.round(view.getTarget().x/10),Math.round(view.getTarget().z/10),state.selected,state.sceneryDetail,state.tilted].join(':');
 }
 function update(now:number){const state=getState(),key=[view.getViewKey(),Math.round(view.getZoom()*5),Math.round(view.getTarget().x/10),Math.round(view.getTarget().z/10),state.selected,state.sceneryDetail,state.tilted].join(':');if(world!==state.world||key!==viewKey&&!view.isMoving())refresh(false);
  const list=state.world.realm?.armies??[],ids=new Set(list.map(a=>a.id));for(const [id,m] of armies)if(!ids.has(id)){root.remove(m.root);armies.delete(id);}let moving=false;const known=campaignCoverage(state.world);
  for(const a of list){if(a.id===undefined)continue;const kind:ArmyModelKind=a.regiments?.some(u=>u.kind==='heavyHorse'||u.kind==='lightHorse')?'horse':a.regiments?.some(u=>u.kind==='siege')?'siege':'foot',name=regimeName(state.world,a.realm);let m=armies.get(a.id);
   if(!m||m.kind!==kind||m.realm!==a.realm||m.bannerName!==name||m.origin!==realmOrigin(state.world,a.realm)){if(m)root.remove(m.root);m=military.create(a,kind,name,state.world);m.root.matrixAutoUpdate=true;m.root.traverse(o=>{if(o instanceof Mesh){o.castShadow=true;o.receiveShadow=true;}});armies.set(a.id,m);root.add(m.root);}
   const at=armyMapPosition(a),h=view.height(at.lon,at.lat);m.root.visible=state.militaryModels&&!!placement(a.id)?.model&&h!==null&&known(at.lon,at.lat);if(!m.root.visible)continue;
   const p=projectGround(at.lon,at.lat);m.root.position.set(p.x,h!+.08,p.z);m.root.scale.setScalar(view.unitsPerPixelAt(at.lon,at.lat)*ARMY_MODEL_PIXELS);const visual=armyVisualState(state.world,a);m.body.rotation.y=a.journey?roadHeading(a.journey):-.18;m.detail.visible=view.getZoom()>=7.4;m.camp.visible=view.getZoom()>=7.4&&(visual==='garrison'||visual==='siege');moving=animateMilitaryModel(m,visual,now/210+a.id,state.armyMotion)||moving;
  }military.pruneBanners(new Set([...armies.values()].map(m=>'banner|'+m.origin+'|'+m.realm+'|'+m.bannerName)));return moving;
 }
 return {root,update,refresh,revision:()=>revision,farmCenters:()=>[...cities.values()].map(c=>({x:c.root.position.x,z:c.root.position.z})),showsSite:(id:string)=>!!cities.get(id)?.root.visible,cityRoots:()=>[...cities.values()].map(c=>c.root).filter(root=>root.visible),dispose(){view.scene.remove(root);trees.dispose();treeMaterial.dispose();military.dispose();assets.dispose();}};
}
import {unprojectGround as viewPosition} from './geography';
