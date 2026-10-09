import {realmOrigin} from '../core/polityRuntime';
import type {World} from '../core/types';
import {Group,Mesh,SphereGeometry,CylinderGeometry,PlaneGeometry,BufferGeometry,Float32BufferAttribute,MeshStandardMaterial,MeshBasicMaterial,TextureLoader,CanvasTexture,SRGBColorSpace,DoubleSide,Vector3,type Material,type Texture} from 'three';
import type {Army} from '../core/realm';
import {armyHeraldry} from './ArmyHeraldry';
import {militarySurfaceMaterial} from './militaryRendering';
import {createInfantryAnimation,disposeInfantryAnimation,disposeInfantryAsset,loadInfantryAsset,updateInfantryAnimation,type InfantryAnimation} from './RiggedInfantry';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';
export type ArmyModelKind='foot'|'horse'|'siege';
export interface MilitaryModel {root:Group;body:Group;camp:Group;banner:Group;animation?:InfantryAnimation;seed:number;kind:ArmyModelKind;realm:Army['realm'];origin:ReturnType<typeof realmOrigin>;bannerName:string}
/** One shared infantry asset for every regiment kind; independent skeletons per army. */
export function militaryModelAssets(repaint:()=>void,warn:(message:string)=>void){
 const geometries=new Map<string,BufferGeometry>(),materials=new Map<string,Material>(),textures:Texture[]=[],loader=new TextureLoader();
 let asset:GLTF|undefined,disposed=false;const models=new Set<MilitaryModel>();
 function attach(model:MilitaryModel){if(!asset)return;model.animation=createInfantryAnimation(asset,model.seed);model.body.add(model.animation.root);}
 const ready=loadInfantryAsset().then(loaded=>{if(disposed){disposeInfantryAsset(loaded);return;}asset=loaded;models.forEach(attach);repaint();}).catch(()=>{if(!disposed)warn('军队兵模未能载入，保留军旗和军队操作。');});
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
  ready,release,
  create(a:Army,kind:ArmyModelKind,name:string,world?:World):MilitaryModel{
   const root=new Group(),body=new Group();root.matrixAutoUpdate=false;root.add(body);shadow(body);
   const model:MilitaryModel={root,body,camp:camp(body),banner:banner(body,a.realm,name,world),kind,realm:a.realm,origin:realmOrigin(world,a.realm),bannerName:name,seed:a.id??0};
   models.add(model);attach(model);return model;
  },
  pruneBanners(active:Set<string>){for(const [key,m] of materials)if(key.startsWith('banner|')&&!active.has(key)){const t=(m as MeshStandardMaterial).map;if(t){t.dispose();const i=textures.indexOf(t);if(i>=0)textures.splice(i,1);}m.dispose();materials.delete(key);}},
  dispose(){disposed=true;models.forEach(release);if(asset)disposeInfantryAsset(asset);asset=undefined;geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());geometries.clear();materials.clear();textures.length=0;}
 };
}
export function animateMilitaryModel(m:MilitaryModel,state:string,seconds:number,motion:boolean){
 m.banner.rotation.y=motion?Math.sin(seconds*1.75+m.seed)*.025:0;
 return m.animation?updateInfantryAnimation(m.animation,state,seconds,motion):false;
}
/** Map X points east and Z south; road headings are clockwise from north. */
export function armyModelHeading(roadHeading:number){return Math.PI-roadHeading;}
