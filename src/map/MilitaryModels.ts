import {MapResourceError} from './resourceLoader';
import {createMilitaryCarryPose} from './MilitaryCarryPose';
import {attachMilitaryEquipment,loadMilitaryEquipment} from './MilitaryEquipment';
import {realmOrigin} from '../core/polityRuntime';
import type {World} from '../core/types';
import {Group,Mesh,SphereGeometry,CylinderGeometry,PlaneGeometry,BufferGeometry,Float32BufferAttribute,MeshStandardMaterial,MeshBasicMaterial,TextureLoader,CanvasTexture,SRGBColorSpace,DoubleSide,Vector3,type Material,type Texture} from 'three';
import type {Army} from '../core/realm';
import {armyHeraldry} from './ArmyHeraldry';
import {militarySurfaceMaterial} from './militaryRendering';
import {createInfantryAnimation,disposeInfantryAnimation,disposeInfantryAsset,loadInfantryAsset,updateInfantryAnimation,type InfantryAnimation} from './RiggedInfantry';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';
export type ArmyModelKind='foot'|'spear'|'archer'|'lightHorse'|'heavyHorse'|'siege';
/** A mixed army uses its largest surviving visual group; ties stay stable in this order. */
export function armyModelKind(army:Army):ArmyModelKind{
 const counts:Record<Exclude<ArmyModelKind,'spear'|'archer'>,number>={foot:0,lightHorse:0,heavyHorse:0,siege:0};
 for(const unit of army.regiments??[]){const kind=unit.kind==='lightHorse'||unit.kind==='heavyHorse'||unit.kind==='siege'?unit.kind:'foot';counts[kind]+=Math.max(0,unit.troops);}
 const winner=(Object.keys(counts) as (keyof typeof counts)[]).reduce((best,kind)=>counts[kind]>counts[best]?kind:best,'foot');
 if(winner!=='foot')return winner;
 const foot={shield:0,spear:0,archer:0};for(const unit of army.regiments??[])if(unit.kind in foot)foot[unit.kind as keyof typeof foot]+=Math.max(0,unit.troops);
 const variant=(Object.keys(foot) as (keyof typeof foot)[]).reduce((best,kind)=>foot[kind]>foot[best]?kind:best,'shield');return variant==='shield'?'foot':variant;
}
export interface MilitaryModel {root:Group;body:Group;camp:Group;banner:Group;animation?:InfantryAnimation;concealed?:boolean;equipped?:boolean;seed:number;kind:ArmyModelKind;realm:Army['realm'];origin:ReturnType<typeof realmOrigin>;bannerName:string}
/** Shared mesh/material per type, independent skeleton and mixer per army. */
export function militaryModelAssets(repaint:()=>void,warn:(message:string)=>void,signal?:AbortSignal){
 const geometries=new Map<string,BufferGeometry>(),materials=new Map<string,Material>(),textures:Texture[]=[],loader=new TextureLoader();
 type AssetKind=Exclude<ArmyModelKind,'spear'|'archer'>;
 const assets=new Map<AssetKind,GLTF>(),pending=new Map<AssetKind,Promise<void>>(),models=new Set<MilitaryModel>();let disposed=false;
 let equipment:GLTF|undefined,equipmentPending:Promise<void>|undefined;const failed=new Set<AssetKind|'equipment'>();
 const recovered=(kind:AssetKind|'equipment')=>{if(failed.delete(kind)&&!failed.size)warn('');};
 const key=(kind:ArmyModelKind):AssetKind=>kind==='spear'||kind==='archer'?'foot':kind;
 function equip(model:MilitaryModel){if(model.concealed){if(model.animation&&!model.equipped){model.animation.carryPose=createMilitaryCarryPose(model.animation.root,'foot');model.animation.carryPose();model.equipped=true;}return;}if(equipment&&model.animation&&!model.equipped&&model.kind!=='siege'){model.animation.carryPose=createMilitaryCarryPose(model.animation.root,model.kind);model.animation.carryPose();attachMilitaryEquipment(model.animation.root,equipment,model.kind);model.equipped=true;}}
 function ensureEquipment(){if(equipment||equipmentPending)return;equipmentPending=loadMilitaryEquipment(signal).then(loaded=>{if(disposed){disposeInfantryAsset(loaded);return;}equipment=loaded;models.forEach(equip);recovered('equipment');repaint();}).catch(error=>{if(!disposed&&!signal?.aborted){failed.add('equipment');warn(error instanceof MapResourceError&&error.kind==='auth'?error.message:'兵器未能载入，保留军士和军队操作。');}}).finally(()=>{equipmentPending=undefined;});}
 function attach(model:MilitaryModel){const asset=assets.get(key(model.kind));if(!asset||disposed||!models.has(model)||model.animation)return;model.animation=createInfantryAnimation(asset,model.seed);model.animation.mounted=model.kind==='lightHorse'||model.kind==='heavyHorse';if(key(model.kind)!=='foot'){model.animation.root.name='Rigged campaign '+model.kind;model.animation.root.scale.setScalar(model.kind==='siege'?.68:.76);}model.body.add(model.animation.root);equip(model);}
 function ensure(kind:AssetKind){
  if(assets.has(kind)||pending.has(kind))return;
  const file=kind==='foot'?'infantry-rigged-v1.glb':kind==='lightHorse'?'light-cavalry-v1.glb':kind==='heavyHorse'?'heavy-cavalry-v1.glb':'siege-crew-v1.glb';
  pending.set(kind,loadInfantryAsset(file,signal).then(loaded=>{if(disposed){disposeInfantryAsset(loaded);return;}assets.set(kind,loaded);recovered(kind);models.forEach(m=>{if(key(m.kind)===kind)attach(m);});repaint();}).catch(error=>{if(!disposed&&!signal?.aborted){failed.add(kind);warn(error instanceof MapResourceError&&error.kind==='auth'?error.message:(kind==='foot'?'步兵':kind==='lightHorse'?'轻骑兵':kind==='heavyHorse'?'甲骑':'攻城队')+'兵模未能载入，保留军旗和军队操作。');}}).finally(()=>{pending.delete(kind);}));
 }
 ensure('foot');
 function release(model:MilitaryModel){models.delete(model);if(model.animation){disposeInfantryAnimation(model.animation);model.animation=undefined;}model.root.removeFromParent();}
 function geo(key:string,create:()=>BufferGeometry){let g=geometries.get(key);if(!g){g=create();geometries.set(key,g);}return g;}
 const ball=()=>geo('ball',()=>new SphereGeometry(.5,14,10)),cylinder=()=>geo('cylinder',()=>new CylinderGeometry(.5,.5,1,16));
 const wood=militarySurfaceMaterial('#78624a'),bronze=militarySurfaceMaterial('#b29a66',undefined,.3),linen=militarySurfaceMaterial('#c9bea0');materials.set('wood',wood);materials.set('bronze',bronze);materials.set('linen',linen);
 function mesh(parent:Group,g:BufferGeometry,m:Material,x:number,y:number,z:number,sx=1,sy=1,sz=1){const o=new Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.frustumCulled=false;parent.add(o);return o;}
 function ellipsoid(parent:Group,m:Material,x:number,y:number,z:number,sx:number,sy:number,sz:number){return mesh(parent,ball(),m,x,y,z,sx,sy,sz);}
 function beam(parent:Group,m:Material,from:number[],to:number[],width:number){const a=new Vector3(from[0],from[1],from[2]),b=new Vector3(to[0],to[1],to[2]),delta=b.clone().sub(a),mid=a.clone().add(b).multiplyScalar(.5),o=mesh(parent,cylinder(),m,mid.x,mid.y,mid.z,width,delta.length(),width);o.quaternion.setFromUnitVectors(new Vector3(0,1,0),delta.normalize());return o;}
 function banner(parent:Group,realm:Army['realm'],name:string,world?:World){
  const group=new Group();group.position.set(-.40,0,-.16);parent.add(group);beam(group,wood,[0,.025,0],[0,2.30,0],.026);beam(group,bronze,[-.02,2.22,0],[.54,2.22,0],.020);ellipsoid(group,bronze,0,2.34,0,.040,.075,.040);
  const key='banner|'+realmOrigin(world,realm)+'|'+realm+'|'+name;let material=materials.get(key);if(!material){const texture=loader.load(armyHeraldry(realm,name,world),()=>repaint());texture.colorSpace=SRGBColorSpace;textures.push(texture);material=new MeshStandardMaterial({map:texture,transparent:true,alphaTest:.12,side:DoubleSide,roughness:.95,depthWrite:true});materials.set(key,material);}
  const g=geo('flag-cloth',()=>{const g=new PlaneGeometry(.54,.67,10,12),p=g.getAttribute('position');for(let i=0;i<p.count;i++)p.setZ(i,Math.sin((p.getX(i)+.27)*13)*.028);g.computeVertexNormals();return g;});mesh(group,g,material,.25,1.895,.022);return group;
 }
 function camp(parent:Group){const group=new Group();parent.add(group);group.position.set(-.55,0,-.58);group.scale.setScalar(.46);const shape=geo('tent',()=>{const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute([-.6,0,-.6,.6,0,-.6,0,.7,-.6,-.6,0,.6,.6,0,.6,0,.7,.6],3));g.setAttribute('uv',new Float32BufferAttribute([0,0,1,0,.5,1,0,0,1,0,.5,1],2));g.setIndex([0,3,2,2,3,5,2,5,1,1,5,4,0,2,1,3,4,5]);g.computeVertexNormals();return g;});mesh(group,shape,linen,0,0,0);for(const side of [-1,1])for(const z of [-1,1])beam(group,linen,[side*.5,.1,z*.5],[side*.8,.02,z*.85],.018);return group;}
 function shadow(parent:Group){let m=materials.get('shadow');if(!m){const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const c=canvas.getContext('2d')!,g=c.createRadialGradient(64,64,8,64,64,63);g.addColorStop(0,'rgba(16,23,18,.38)');g.addColorStop(.6,'rgba(16,23,18,.20)');g.addColorStop(1,'rgba(16,23,18,0)');c.fillStyle=g;c.fillRect(0,0,128,128);const map=new CanvasTexture(canvas);textures.push(map);m=new MeshBasicMaterial({map,transparent:true,depthWrite:false,side:DoubleSide});materials.set('shadow',m);}const o=mesh(parent,geo('shadow',()=>new PlaneGeometry(1,1)),m,0,.012,0,1.20,1.10,1);o.rotation.x=-Math.PI/2;}
 return {
  get ready(){return Promise.all([...pending.values(),equipmentPending]);},retry(){if(failed.has('equipment'))ensureEquipment();for(const kind of failed)if(kind!=='equipment')ensure(kind);},release,
  create(a:Pick<Army,'id'|'realm'>,kind:ArmyModelKind,name:string,world?:World,concealed=false):MilitaryModel{
   const root=new Group(),body=new Group();root.matrixAutoUpdate=false;root.add(body);shadow(body);
   const model:MilitaryModel={concealed,root,body,camp:camp(body),banner:banner(body,a.realm,name,world),kind,realm:a.realm,origin:realmOrigin(world,a.realm),bannerName:name,seed:a.id??0};
   models.add(model);if(kind!=='siege')ensureEquipment();ensure(key(kind));attach(model);return model;
  },
  pruneBanners(active:Set<string>){for(const [key,m] of materials)if(key.startsWith('banner|')&&!active.has(key)){const t=(m as MeshStandardMaterial).map;if(t){t.dispose();const i=textures.indexOf(t);if(i>=0)textures.splice(i,1);}m.dispose();materials.delete(key);}},
  dispose(){disposed=true;models.forEach(release);assets.forEach(disposeInfantryAsset);assets.clear();if(equipment)disposeInfantryAsset(equipment);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());geometries.clear();materials.clear();textures.length=0;}
 };
}
export function animateMilitaryModel(m:MilitaryModel,state:string,seconds:number,motion:boolean){
 m.banner.rotation.y=motion?Math.sin(seconds*1.75+m.seed)*.025:0;
 return m.animation?updateInfantryAnimation(m.animation,state,seconds,motion):false;
}
/** Map X points east and Z south; road headings are clockwise from north. */
export function armyModelHeading(roadHeading:number){return Math.PI-roadHeading;}
