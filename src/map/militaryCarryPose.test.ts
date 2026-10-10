import {beforeAll,expect,it} from 'vitest';
import {DoubleSide,Raycaster,SkinnedMesh,Vector3,Quaternion} from 'three';
import {readInfantryTestAsset} from './infantryAsset.testSupport';
import {createInfantryAnimation,updateInfantryAnimation} from './RiggedInfantry';
import {attachMilitaryEquipment} from './MilitaryEquipment';
import {createMilitaryCarryPose,prepareMilitaryHands} from './MilitaryCarryPose';
import type {ArmyModelKind} from './MilitaryModels';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';
let kit:GLTF,foot:GLTF,light:GLTF,heavy:GLTF;
beforeAll(async()=>{[kit,foot,light,heavy]=await Promise.all(['weapons-v1.glb','infantry-rigged-v1.glb','light-cavalry-v1.glb','heavy-cavalry-v1.glb'].map(readInfantryTestAsset));});
const kinds=['foot','spear','archer','lightHorse','heavyHorse'] as const;
function setup(kind:ArmyModelKind){const asset=kind==='lightHorse'?light:kind==='heavyHorse'?heavy:foot;prepareMilitaryHands(asset.scene);const a=createInfantryAnimation(asset,0);a.carryPose=createMilitaryCarryPose(a.root,kind);a.carryPose();attachMilitaryEquipment(a.root,kit,kind);return a;}
it.each(kinds)('keeps %s weapon paths outside the actual soldier and horse through idle, march and transitions',kind=>{
 const a=setup(kind),body:SkinnedMesh[]=[];a.root.traverse(o=>{if(o instanceof SkinnedMesh){body.push(o);for(const m of Array.isArray(o.material)?o.material:[o.material])m.side=DoubleSide;}});
 const rays:Record<string,number[][][]>={Sword:[[[0,.12,0],[0,.80,0]]],Spear:[[[0,-.58,0],[0,1.50,0]]],Bow:[[[0,-.52,.19],[0,.52,.19]],[[0,-.50,.19],[0,0,0]],[[0,0,0],[0,.50,.19]]],Shield:[[[-.24,-.35,.05],[.24,-.35,.05]],[[-.24,.35,.05],[.24,.35,.05]]],Quiver:[[[0,-.30,0],[0,.32,0]]]};
 const cast=new Raycaster();
 for(let frame=0;frame<480;frame++){
  updateInfantryAnimation(a,frame<150?'garrison':frame<390?'marching':'garrison',frame/60,true);
  if(frame%6)continue;a.root.updateMatrixWorld(true);body.forEach(m=>{m.skeleton.update();m.computeBoundingSphere();m.computeBoundingBox();});
  for(const [name,segments] of Object.entries(rays)){
   const prop=a.root.getObjectByName('Equipment '+name);if(!prop)continue;
   const grip=prop.getWorldPosition(new Vector3());
   for(const [start,end] of segments){
    const from=new Vector3(...start as [number,number,number]).applyMatrix4(prop.matrixWorld),to=new Vector3(...end as [number,number,number]).applyMatrix4(prop.matrixWorld),delta=to.clone().sub(from);cast.set(from,delta.clone().normalize());cast.far=delta.length();
    for(const hit of cast.intersectObjects(body,false))expect(hit.point.distanceTo(grip),`${kind} ${name} ${frame/60}s intersects ${hit.object.name}`).toBeLessThan(name==='Quiver'?0:.11);
   }
  }
 }
});
it.each(kinds)('keeps %s arm lengths, mounted clearance and paused pose stable',kind=>{
 const a=setup(kind),bone=(name:string)=>a.root.getObjectByName(name)!,pos=(name:string)=>bone(name).getWorldPosition(new Vector3());
 a.root.updateMatrixWorld(true);const sides=kind==='foot'?['L','R']:kind==='archer'?['L']:['R'];
 const lengths=sides.map(side=>[pos('UpperArm'+side).distanceTo(pos('Forearm'+side)),pos('Forearm'+side).distanceTo(pos('Hand'+side))]);
 for(let i=0;i<180;i++){
  updateInfantryAnimation(a,'marching',i/60,true);a.root.updateMatrixWorld(true);
  sides.forEach((side,j)=>{expect(pos('UpperArm'+side).distanceTo(pos('Forearm'+side))).toBeCloseTo(lengths[j][0],5);expect(pos('Forearm'+side).distanceTo(pos('Hand'+side))).toBeCloseTo(lengths[j][1],5);});
  if(kind.includes('Horse'))expect(pos('HandR').x).toBeLessThan(-.45);
 }
 updateInfantryAnimation(a,'garrison',4,false);const initial=sides.map(s=>bone('Hand'+s).quaternion.clone());
 for(let i=0;i<10;i++)updateInfantryAnimation(a,'garrison',5+i,false);
 sides.forEach((s,i)=>expect(bone('Hand'+s).quaternion.angleTo(initial[i] as Quaternion)).toBeLessThan(.000001));
});
it('keeps the prepared carry mesh idempotent',()=>{
 const meshes:SkinnedMesh[]=[];foot.scene.traverse(o=>{if(o instanceof SkinnedMesh)meshes.push(o);});prepareMilitaryHands(foot.scene);
 for(const m of meshes){const p=m.geometry.getAttribute('position').array.slice(),uv=m.geometry.getAttribute('uv').array.slice(),weights=m.geometry.getAttribute('skinWeight').array.slice();prepareMilitaryHands(foot.scene);expect(m.geometry.getAttribute('position').array).toEqual(p);expect(m.geometry.getAttribute('uv').array).toEqual(uv);expect(m.geometry.getAttribute('skinWeight').array).toEqual(weights);}
});
it('removes accidental hand weights from skirt armour while preserving UVs and normalized skinning',async()=>{
 const asset=await readInfantryTestAsset();let mesh!:SkinnedMesh;asset.scene.traverse(o=>{if(o instanceof SkinnedMesh)mesh=o;});
 const p=mesh.geometry.getAttribute('position'),w=mesh.geometry.getAttribute('skinWeight'),j=mesh.geometry.getAttribute('skinIndex'),uv=mesh.geometry.getAttribute('uv').array.slice();
 const arm=new Set(mesh.skeleton.bones.flatMap((b,i)=>/^(Hand|Forearm|UpperArm|Clavicle)/.test(b.name)?[i]:[]));
 const affected:number[]=[];
 for(let i=0;i<p.count;i++){const v=new Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.bindMatrix);if(v.y<1&&Math.abs(v.x)<=.355&&[0,1,2,3].some(c=>arm.has(j.getComponent(i,c))&&w.getComponent(i,c)>0))affected.push(i);}
 expect(affected.length).toBeGreaterThan(0);prepareMilitaryHands(asset.scene);
 for(const i of affected){let total=0;for(let c=0;c<4;c++){const weight=w.getComponent(i,c);total+=weight;expect(weight).toBeGreaterThanOrEqual(0);if(arm.has(j.getComponent(i,c)))expect(weight).toBe(0);}expect(total).toBeCloseTo(1,5);}
 expect(mesh.geometry.getAttribute('uv').array).toEqual(uv);
});
