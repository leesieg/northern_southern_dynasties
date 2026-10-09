import {readFileSync} from 'node:fs';
import {beforeAll,expect,it} from 'vitest';
import {AnimationMixer,Vector3} from 'three';
import {readInfantryTestAsset} from '../../src/map/infantryAsset.testSupport';

let gltf,doc,bytes;const meshes=[];
beforeAll(async()=>{
 bytes=readFileSync('public/art/military/siege-crew-v1.glb');doc=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));
 gltf=await readInfantryTestAsset('siege-crew-v1.glb');gltf.scene.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o);});
});
it('preserves the cart and two crew in a self-contained preparation asset',()=>{
 expect(bytes.length).toBeLessThan(14_000_000);
 expect(doc.images.every(i=>i.bufferView!==undefined&&!i.uri)).toBe(true);expect(doc.images.length).toBeGreaterThanOrEqual(6);
 expect(doc.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+doc.accessors[p.indices].count/3,0)).toBe(31728);
 expect(meshes.map(m=>m.name).sort()).toEqual(['Chassis','CrewL','CrewR']);
 for(const m of meshes){
  expect(m.skeleton.bones.length).toBe(60);
  const weights=m.geometry.getAttribute('skinWeight'),joints=m.geometry.getAttribute('skinIndex');
  for(let i=0;i<weights.count;i++){
   let total=0;for(let k=0;k<4;k++){const w=weights.getComponent(i,k);expect(w).toBeGreaterThanOrEqual(0);expect(joints.getComponent(i,k)).toBeLessThan(60);total+=w;}expect(total).toBeCloseTo(1,5);
  }
 }
});
it('animates both crew in place without deforming the unfinished cart mechanism',()=>{
 expect(gltf.animations.map(c=>c.name).sort()).toEqual(['Idle','Walk']);
 for(const clip of gltf.animations){
  expect(clip.duration).toBeCloseTo(clip.name==='Idle'?2.4:1.2,4);
  for(const track of clip.tracks){const n=track.getValueSize();expect(track.times[0]).toBe(0);for(let k=0;k<n;k++)expect(track.values[k],track.name).toBeCloseTo(track.values.at(-n+k),4);}
  const mixer=new AnimationMixer(gltf.scene);mixer.clipAction(clip).play();let low=Infinity,high=-Infinity,cartDrift=0;
  const chassis=meshes.find(m=>m.name==='Chassis'),rest=chassis.geometry.getAttribute('position'),legs={CrewL:[],CrewR:[]};
  for(let frame=0;frame<24;frame++){
   mixer.setTime(clip.duration*frame/24);gltf.scene.updateMatrixWorld(true);
   expect(gltf.scene.getObjectByName('SiegeRoot').position.length()).toBeLessThan(.0001);
   for(const m of meshes){m.skeleton.update();const p=m.geometry.getAttribute('position');for(let i=0;i<p.count;i+=8){const point=m.applyBoneTransform(i,new Vector3().fromBufferAttribute(p,i));if(m===chassis)cartDrift=Math.max(cartDrift,point.distanceTo(new Vector3().fromBufferAttribute(rest,i)));point.applyMatrix4(m.matrixWorld);low=Math.min(low,point.y);high=Math.max(high,point.y);expect(point.toArray().every(Number.isFinite)).toBe(true);}}
   for(const prefix of Object.keys(legs)){const bone=meshes[0].skeleton.bones.find(b=>b.name.startsWith(prefix+'_')&&/Thigh/i.test(b.name));if(!bone)throw new Error('Missing crew leg');legs[prefix].push(bone.quaternion.clone());}
  }
  expect(cartDrift).toBeLessThan(.00001);expect(low).toBeGreaterThan(-.07);expect(low).toBeLessThan(.05);expect(high).toBeLessThan(2.3);expect(high).toBeGreaterThan(2);
  if(clip.name==='Walk')for(const samples of Object.values(legs))expect(samples.some(q=>q.angleTo(samples[0])>.1)).toBe(true);
  mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);
 }
});
