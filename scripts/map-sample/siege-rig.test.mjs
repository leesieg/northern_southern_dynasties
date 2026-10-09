import {readFileSync} from 'node:fs';
import {beforeAll,expect,it} from 'vitest';
import {AnimationMixer,Quaternion,Vector3} from 'three';
import {readInfantryTestAsset} from '../../src/map/infantryAsset.testSupport';
let gltf,doc,bytes;const meshes=[];
beforeAll(async()=>{
 bytes=readFileSync('public/art/military/siege-crew-v1.glb');doc=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));
 gltf=await readInfantryTestAsset('siege-crew-v1.glb');gltf.scene.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o);});
});
const joint=n=>meshes[0].skeleton.bones.find(b=>b.name===n.replaceAll('.',''));
const world=n=>joint(n).getWorldPosition(new Vector3());
function pose(mixer,t){mixer.setTime(t);gltf.scene.updateMatrixWorld(true);for(const m of meshes)m.skeleton.update();}
it('ships a bounded articulated cart with embedded textures and normalized weights',()=>{
 expect(bytes.length).toBeLessThan(14_000_000);expect(doc.images.every(i=>i.bufferView!==undefined&&!i.uri)).toBe(true);expect(doc.images.length).toBeGreaterThanOrEqual(7);
 expect(doc.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+doc.accessors[p.indices].count/3,0)).toBeLessThan(46000);
 for(const n of ['Chassis','ThrowArm','Pouch','Projectile','SlingL','SlingR','HaulRope','WheelLFront','WheelRRear','CrewL_Hips','CrewR_Hips'])expect(joint(n),n).toBeDefined();
 for(const m of meshes){
  expect(m.skeleton.bones.length).toBe(70);const weights=m.geometry.getAttribute('skinWeight'),joints=m.geometry.getAttribute('skinIndex');
  for(let i=0;i<weights.count;i++){let total=0;for(let k=0;k<4;k++){const w=weights.getComponent(i,k);if(!Number.isFinite(w)||w<0||joints.getComponent(i,k)>=70)throw new Error('Invalid skin');total+=w;}expect(total).toBeCloseTo(1,5);}
 }
});
it('loops all three clips without snapping wheels, crew, sling or root',()=>{
 expect(gltf.animations.map(c=>c.name).sort()).toEqual(['Attack','Idle','Walk']);
 for(const clip of gltf.animations){
  expect(clip.duration).toBeCloseTo({Idle:2.4,Walk:3.6,Attack:8}[clip.name],4);
  for(const track of clip.tracks){
   const n=track.getValueSize();expect(track.times[0]).toBe(0);
   if(track.name.endsWith('.quaternion')){const a=new Quaternion().fromArray(track.values),b=new Quaternion().fromArray(track.values,track.values.length-4);expect(Math.abs(a.dot(b)),track.name).toBeCloseTo(1,4);}
   else for(let k=0;k<n;k++)expect(track.values[k],track.name).toBeCloseTo(track.values.at(-n+k),4);
  }
  const mixer=new AnimationMixer(gltf.scene);mixer.clipAction(clip).play();let low=Infinity,high=-Infinity;
  for(let frame=0;frame<32;frame++){
   pose(mixer,clip.duration*frame/32);expect(joint('SiegeRoot').position.length()).toBeLessThan(.0001);
   for(const m of meshes){const p=m.geometry.getAttribute('position');for(let i=0;i<p.count;i+=16){const v=m.applyBoneTransform(i,new Vector3().fromBufferAttribute(p,i)).applyMatrix4(m.matrixWorld);if(!v.toArray().every(Number.isFinite))throw new Error('Non-finite vertex');low=Math.min(low,v.y);high=Math.max(high,v.y);}}
  }
  expect(low,clip.name).toBeGreaterThan(-.07);expect(low).toBeLessThan(.05);expect(high).toBeLessThan(3.5);
  mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);
 }
});
it('rolls intact tyres forward with planted crew and keeps the chassis rigid',()=>{
 const mixer=new AnimationMixer(gltf.scene);mixer.clipAction(gltf.animations.find(c=>c.name==='Walk')).play();pose(mixer,0);
 expect(world('WheelLFront').z).toBeGreaterThan(world('WheelLRear').z);const start=joint('WheelLFront').quaternion.clone(),ankles=[];
 const inverse=joint('WheelLFront').matrixWorld.clone().invert(),top=world('WheelLFront').add(new Vector3(0,.30,0));pose(mixer,.15);
 expect(top.clone().applyMatrix4(inverse).applyMatrix4(joint('WheelLFront').matrixWorld).z-top.z).toBeGreaterThan(.06);
 const chassis=meshes.filter(m=>m.geometry.getAttribute('skinIndex')&&m.skeleton.bones[m.geometry.getAttribute('skinIndex').getX(0)].name==='Chassis');
 for(let i=0;i<24;i++){
  pose(mixer,i*3.6/24);ankles.push(world('CrewL_Foot.L').y);
  for(const m of chassis){const p=m.geometry.getAttribute('position');for(let j=0;j<p.count;j+=32){const rest=new Vector3().fromBufferAttribute(p,j);expect(m.applyBoneTransform(j,rest.clone()).distanceTo(rest)).toBeLessThan(.00001);}}
  for(const name of ['WheelLFront','WheelRFront','WheelLRear','WheelRRear'])expect(world(name).y).toBeCloseTo(.30,4);
 }
 expect(Math.max(...ankles)-Math.min(...ankles)).toBeGreaterThan(.035);pose(mixer,1.8);expect(start.angleTo(joint('WheelLFront').quaternion)).toBeCloseTo(Math.PI,3);
 mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);
});
it('loads, throws in +Z, and rewinds without moving the army anchor',()=>{
 const mixer=new AnimationMixer(gltf.scene);mixer.clipAction(gltf.animations.find(c=>c.name==='Attack')).play();pose(mixer,0);const initial=joint('ThrowArm').quaternion.clone();
 expect(world('Pouch').z).toBeLessThan(world('ThrowArm').z);expect(joint('Projectile').scale.x).toBeLessThan(.001);
 pose(mixer,2.4);expect(joint('Projectile').scale.x).toBe(1);pose(mixer,4.6);const first=world('Projectile');expect(initial.angleTo(joint('ThrowArm').quaternion)).toBeGreaterThan(1.5);
 pose(mixer,4.8);expect(world('Projectile').z-first.z).toBeGreaterThan(.5);pose(mixer,6);expect(joint('Projectile').scale.x).toBeLessThan(.001);pose(mixer,7.9);expect(initial.angleTo(joint('ThrowArm').quaternion)).toBeLessThan(.01);
 mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);
});
