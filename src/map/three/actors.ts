import {cityDetailForPixels,sceneryTier,sceneryBudgets,type SceneryTier} from './sceneryDetail';
import type {CityDetail} from '../campaignScenery';
import {Box3,BufferGeometry,Group,InstancedMesh,Mesh,MeshStandardMaterial,Object3D,Vector3,type Scene,type Texture} from 'three';
import type {Season} from '../sample/seasons';
import {sites} from '../../data/scenario';
import type {World} from '../../core/types';
import {capital} from '../../core/realm';
import {worldRealms,realmOrigin} from '../../core/polityRuntime';
import {regimeName} from '../../core/government';
import {armyVisualState} from '../../core/armyPresentation';
import {roadHeading} from '../../core/routeGeometry';
import {campaignCoverage,controlledSite,domainSignature} from '../campaignDomains';
import {campaignCityAppearance,campaignCityKey,campaignCityMeters,campaignCityRadius,campaignCityPlacements} from '../campaignScenery';
import {loadCampaignSampleAssets} from '../CampaignSampleAssets';
import {armyHeraldry} from '../ArmyHeraldry';
import {armyMapPosition,ARMY_MODEL_PIXELS,type ArmyMarkerPlacement} from '../armyMapPresentation';
import {militaryModelAssets,animateMilitaryModel,armyModelHeading,type MilitaryModel,type ArmyModelKind} from '../MilitaryModels';
import {vegetationCandidates} from './vegetation';
import {projectGround} from './geography';
import {landscapeMaterial} from './landscapeMaterial';
import {cityFoundationGeometry} from './cityFoundation';
export interface CampaignState{seasonPreview?:Season;world:World;selected:string;tilted:boolean;sceneryDetail:boolean;militaryModels:boolean;armyMotion:boolean;}
export interface ActorView{scene:Scene;detailMap?:Texture;sceneryHeight?:(lon:number,lat:number)=>number|null;footprintHeight?:(bounds:{minX:number;minZ:number;maxX:number;maxZ:number})=>number|null;cityLayout:(id:string)=>{x:number;z:number;scale:number;radius:number}|undefined;height:(lon:number,lat:number)=>number|null;isRiver:(lon:number,lat:number)=>boolean;isLand:(lon:number,lat:number)=>boolean;isMoving:()=>boolean;project:(ll:[number,number])=>{x:number;y:number};getZoom:()=>number;getSize:()=>{width:number;height:number};unitsPerPixel:()=>number;unitsPerPixelAt:(lon:number,lat:number)=>number;getTarget:()=>Vector3;getViewKey:()=>string;repaint:()=>void;warning:(message:string)=>void;}
export async function campaignActors(view:ActorView,getState:()=>CampaignState,placement:(id:number)=>ArmyMarkerPlacement|undefined){
 const assets=await loadCampaignSampleAssets(),military=militaryModelAssets(view.repaint,view.warning),root=new Group();view.scene.add(root);
 const cities=new Map<string,{root:Group;key:string;detail:CityDetail;bounds:Box3;foundation:Mesh}>(),armies=new Map<number,MilitaryModel>();let knownWorld:World|undefined,known=campaignCoverage(getState().world);let world:World|undefined,viewKey='',forestKey='',coverageKey='',revision=0;let tier:SceneryTier='far';
 const foundationMaterial=landscapeMaterial('Courtyard earth apron',false,view.detailMap);
 const treeMaterials=assets.trees.map((_,i)=>new MeshStandardMaterial({name:i===2?'Pine campaign':'Leaf campaign',vertexColors:true,roughness:.93}));
 const forests=[...assets.trees,...assets.closeTrees].map((geometry,i)=>{const mesh=new InstancedMesh(geometry,treeMaterials[i%3],i<3?2400:450);mesh.count=0;mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;});
 function refresh(forceTerrain=true){
  const state=getState(),zoom=view.getZoom(),size=view.getSize(),known=campaignCoverage(state.world),capitals=new Set(worldRealms(state.world).map(r=>capital(r,state.world)));
  const visible=zoom<6.2?[]:campaignCityPlacements(sites.filter(s=>controlledSite(state.world,s.id)).map(site=>{const layout=view.cityLayout(site.id),ll=layout?viewPosition(layout.x,layout.z):{lng:site.lon,lat:site.lat};return {site,capital:capitals.has(site.id),point:view.project([ll.lng,ll.lat]),pixels:campaignCityMeters(site,capitals.has(site.id))/1000/Math.cos(site.lat*Math.PI/180)/view.unitsPerPixelAt(site.lon,site.lat)};}).filter(p=>p.point.x>=-30&&p.point.x<=size.width+30&&p.point.y>=-30&&p.point.y<=size.height+30),state.selected,zoom);
  tier=sceneryTier(zoom,tier);const budget=sceneryBudgets[tier];forests.forEach(t=>{t.castShadow=budget.shadows;});
  const keep=new Set(visible.map(v=>v.site.id));for(const [id,c] of cities)if(!keep.has(id)){root.remove(c.root);c.foundation.geometry.dispose();cities.delete(id);}
  const keys=new Set<string>(),flags=new Set<string>();
  for(const {site,pixels} of visible){const appearance=campaignCityAppearance(state.world,site),realm=state.world.realm?.cities[site.id]?.controller??site.polity,flag=armyHeraldry(realm,regimeName(state.world,realm),state.world),detail=cityDetailForPixels(pixels,cities.get(site.id)?.detail),key=campaignCityKey(appearance)+':'+detail+':'+flag;keys.add(campaignCityKey(appearance)+':'+detail);flags.add(flag);let city=cities.get(site.id);
   if(!city||city.key!==key){if(city){root.remove(city.root);city.foundation.geometry.dispose();}const model=assets.city(appearance,detail,flag,view.repaint);model.userData.site=site.id;model.traverse(o=>{if(o instanceof Mesh){o.castShadow=detail==='close';o.receiveShadow=true;}});const bounds=new Box3().setFromObject(model),foundation=new Mesh(new BufferGeometry(),foundationMaterial);foundation.receiveShadow=true;foundation.castShadow=detail==='close';model.add(foundation);city={root:model,key,detail,bounds,foundation};cities.set(site.id,city);root.add(model);}
   const layout=view.cityLayout(site.id),p=layout??projectGround(site.lon,site.lat),ll=viewPosition(p.x,p.z),scale=campaignCityMeters(site,appearance.capital)/17000/Math.cos(site.lat*Math.PI/180)*(layout?.scale??1),b=city.bounds;
   const footprint={minX:p.x+b.min.x*scale,maxX:p.x+b.max.x*scale,minZ:p.z+b.min.z*scale,maxZ:p.z+b.max.z*scale};
   const height=scale===0?null:view.footprintHeight?view.footprintHeight(footprint):view.height(ll.lng,ll.lat);city.root.userData.grounded=height!==null;city.root.visible=height!==null;city.root.scale.setScalar(scale);
   if(height!==null){
    city.root.position.set(p.x,height-b.min.y*scale+.08,p.z);city.foundation.geometry.dispose();
    city.foundation.geometry=cityFoundationGeometry(b,city.root.position,scale,(x,z)=>{if(view.footprintHeight)return view.footprintHeight({minX:x,maxX:x,minZ:z,maxZ:z});const ll=viewPosition(x,z);return view.height(ll.lng,ll.lat);},(x,z)=>{const ll=viewPosition(x,z);return !view.isRiver(ll.lng,ll.lat);});
   }
  }
  assets.prune(keys,flags);
  if(world!==state.world)coverageKey=domainSignature(state.world);
  const nextForest=[view.getViewKey(),Math.round(zoom*5),Math.round(view.getTarget().x/10),Math.round(view.getTarget().z/10),state.sceneryDetail,state.tilted,coverageKey,visible.map(v=>v.site.id+':'+v.capital).join(',')].join('|');
  if(forceTerrain||forestKey!==nextForest){forestKey=nextForest;
  forests.forEach(t=>{t.count=0;});let treeCount=0,closeCount=0;if(budget.trees>0&&state.sceneryDetail&&state.tilted){const center=view.getTarget(),range=Math.min(220,Math.max(60,view.unitsPerPixel()*Math.max(size.width,size.height)*.9)),dummy=new Object3D(),footprints=visible.map(v=>({...(view.cityLayout(v.site.id)??projectGround(v.site.lon,v.site.lat)),radius:(view.cityLayout(v.site.id)?.radius??campaignCityRadius(v.site,v.capital))+1}));
   for(const p of vegetationCandidates(center.x,center.z,range)){
    if(treeCount>=budget.trees)break;
    const ll=viewPosition(p.x,p.z),screen=view.project([ll.lng,ll.lat]);
    if(screen.x< -20||screen.x>size.width+20||screen.y< -20||screen.y>size.height+20||!view.isLand(ll.lng,ll.lat))continue;
    const sceneryHeight=view.sceneryHeight??view.height,h=sceneryHeight(ll.lng,ll.lat);
    if(h===null||view.isRiver(ll.lng,ll.lat)||!known(ll.lng,ll.lat)||footprints.some(c=>Math.abs(c.x-p.x)<c.radius&&Math.abs(c.z-p.z)<c.radius))continue;
    // Trees root into the rendered DEM triangles; exposed rock belongs to the terrain material.
    const rise=Math.max(Math.abs((sceneryHeight(ll.lng+.006,ll.lat)??h)-h),Math.abs((sceneryHeight(ll.lng,ll.lat+.006)??h)-h));
    if(treeCount>=budget.trees||rise>2)continue;
    const detailed=tier==='near'&&closeCount<450&&p.scale*2.4/view.unitsPerPixelAt(ll.lng,ll.lat)>12;const trees=forests[p.variant+(detailed?3:0)];if(detailed)closeCount++;dummy.position.set(p.x,h,p.z);dummy.scale.setScalar(p.scale*2.4);dummy.rotation.set(0,p.rotation,0);dummy.updateMatrix();trees.setMatrixAt(trees.count++,dummy.matrix);treeCount++;
   }
  }forests.forEach(t=>{t.instanceMatrix.needsUpdate=true;t.computeBoundingSphere();});}
  revision++;world=state.world;viewKey=[view.getViewKey(),Math.round(zoom*5),Math.round(view.getTarget().x/10),Math.round(view.getTarget().z/10),state.selected,state.sceneryDetail,state.tilted].join(':');
 }
 function update(now:number){const state=getState(),key=[view.getViewKey(),Math.round(view.getZoom()*5),Math.round(view.getTarget().x/10),Math.round(view.getTarget().z/10),state.selected,state.sceneryDetail,state.tilted].join(':');if((world!==state.world||key!==viewKey)&&!view.isMoving())refresh(false);
  const zoom=view.getZoom();forests.forEach(t=>{t.visible=zoom>=6.2&&state.sceneryDetail&&state.tilted;});
  for(const city of cities.values())city.root.visible=zoom>=6.2&&state.tilted&&city.root.userData.grounded===true;
  const list=state.world.realm?.armies??[],ids=new Set(list.map(a=>a.id));for(const [id,m] of armies)if(!ids.has(id)){military.release(m);armies.delete(id);}let moving=false;if(knownWorld!==state.world){knownWorld=state.world;known=campaignCoverage(state.world);}
  for(const a of list){if(a.id===undefined)continue;const kind:ArmyModelKind=a.regiments?.some(u=>u.kind==='heavyHorse'||u.kind==='lightHorse')?'horse':a.regiments?.some(u=>u.kind==='siege')?'siege':'foot',name=regimeName(state.world,a.realm);let m=armies.get(a.id);
   if(!m||m.kind!==kind||m.realm!==a.realm||m.bannerName!==name||m.origin!==realmOrigin(state.world,a.realm)){if(m)military.release(m);m=military.create(a,kind,name,state.world);m.root.matrixAutoUpdate=true;m.root.traverse(o=>{if(o instanceof Mesh){o.castShadow=true;o.receiveShadow=true;}});armies.set(a.id,m);root.add(m.root);}
   const at=armyMapPosition(a),h=view.height(at.lon,at.lat);m.root.visible=view.getZoom()>4.8&&state.tilted&&state.militaryModels&&!!placement(a.id)?.model&&h!==null&&known(at.lon,at.lat);if(!m.root.visible)continue;
   const p=projectGround(at.lon,at.lat);m.root.position.set(p.x,h!+.08,p.z);m.root.scale.setScalar(view.unitsPerPixelAt(at.lon,at.lat)*ARMY_MODEL_PIXELS);const visual=armyVisualState(state.world,a);m.body.rotation.y=a.journey?armyModelHeading(roadHeading(a.journey)):-.18;m.camp.visible=view.getZoom()>=7.4&&(visual==='garrison'||visual==='siege');moving=animateMilitaryModel(m,visual,now/1000,state.armyMotion)||moving;
  }military.pruneBanners(new Set([...armies.values()].map(m=>'banner|'+m.origin+'|'+m.realm+'|'+m.bannerName)));return moving;
 }
 return {root,update,refresh,revision:()=>revision,farmCenters:()=>[...cities.values()].map(c=>({x:c.root.position.x,z:c.root.position.z,radius:c.root.scale.x*17*.65})),showsSite:(id:string)=>!!cities.get(id)?.root.visible,cityRoots:()=>[...cities.values()].map(c=>c.root).filter(root=>root.visible),dispose(){view.scene.remove(root);cities.forEach(c=>c.foundation.geometry.dispose());foundationMaterial.dispose();forests.forEach(t=>t.dispose());treeMaterials.forEach(m=>m.dispose());military.dispose();assets.dispose();}};
}
import {unprojectGround as viewPosition} from './geography';
