import {readFileSync} from 'node:fs';
import {beforeAll,expect,it} from 'vitest';
import {AnimationMixer,LoopOnce,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const bytes=readFileSync('public/art/military/infantry-rigged-v1.glb');
const jsonLength=bytes.readUInt32LE(12),doc=JSON.parse(bytes.toString('utf8',20,20+jsonLength));
let model,mesh;
beforeAll(async()=>{
 // Exercise the real exported skeleton and clips in Three.js without a browser image API.
 // Material payloads are checked separately below, only their decoding is skipped in Node.
 const geometryDoc=structuredClone(doc);delete geometryDoc.materials;delete geometryDoc.textures;delete geometryDoc.images;
 for(const m of geometryDoc.meshes)for(const p of m.primitives)delete p.material;
 const json=Buffer.from(JSON.stringify(geometryDoc)),padded=Buffer.alloc(Math.ceil(json.length/4)*4,32);json.copy(padded);
 const data=Buffer.alloc(20+padded.length+bytes.length-20-jsonLength);
 bytes.copy(data,0,0,12);data.writeUInt32LE(data.length,8);data.writeUInt32LE(padded.length,12);data.writeUInt32LE(0x4e4f534a,16);padded.copy(data,20);bytes.copy(data,20+padded.length,20+jsonLength);
 model=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
 model.scene.traverse(o=>{if(o.isSkinnedMesh)mesh=o;});
});

it('relaxes the arms at rest and swings the hands opposite the advancing feet',()=>{
 const mixer=new AnimationMixer(model.scene),hand=model.scene.getObjectByName('HandL'),foot=model.scene.getObjectByName('FootL');
 const sample=(time)=>{mixer.setTime(time);model.scene.updateMatrixWorld(true);return {hand:hand.getWorldPosition(new Vector3()),foot:foot.getWorldPosition(new Vector3())};};
 mixer.clipAction(model.animations.find(a=>a.name==='Idle')).play();
 expect(Math.abs(sample(0).hand.x)).toBeLessThan(.30);
 mixer.stopAllAction();mixer.clipAction(model.animations.find(a=>a.name==='Walk')).play();
 const contact=sample(0),opposite=sample(.6);
 expect(contact.foot.z-opposite.foot.z).toBeGreaterThan(.25);
 expect(contact.hand.z-opposite.hand.z).toBeLessThan(-.15);
 mixer.stopAllAction();mixer.uncacheRoot(model.scene);
});

it('preserves the low mesh, complete embedded PBR material and four normalized skin influences',()=>{
 expect(bytes.length).toBeLessThan(6_000_000);expect(doc.skins).toHaveLength(1);expect(doc.skins[0].joints).toHaveLength(29);
 expect(doc.images).toHaveLength(3);expect(doc.images.every(i=>i.bufferView!==undefined&&!i.uri)).toBe(true);
 expect(doc.materials).toHaveLength(1);const mat=doc.materials[0];expect(mat.normalTexture).toBeDefined();expect(mat.pbrMetallicRoughness.baseColorTexture).toBeDefined();expect(mat.pbrMetallicRoughness.metallicRoughnessTexture).toBeDefined();
 const p=doc.meshes.flatMap(m=>m.primitives);expect(p.reduce((s,p)=>s+doc.accessors[p.indices].count/3,0)).toBe(5864);
 expect(mesh).toBeDefined();expect(mesh.skeleton.bones.some(b=>b.name==='SkirtFrontL')).toBe(true);
 const weights=mesh.geometry.getAttribute('skinWeight'),indices=mesh.geometry.getAttribute('skinIndex');
 for(let i=0;i<weights.count;i++){let sum=0;for(let j=0;j<4;j++){const w=weights.getComponent(i,j);expect(Number.isFinite(w)).toBe(true);expect(w).toBeGreaterThanOrEqual(0);expect(indices.getComponent(i,j)).toBeLessThan(29);sum+=w;}expect(sum).toBeCloseTo(1,5);}
});

it('exports two zero-based seamless clips with an anchored root and measurable gait deformation',()=>{
 expect(model.animations.map(a=>a.name).sort()).toEqual(['Idle','Walk']);
 const summaries={};
 for(const clip of model.animations){
  expect(clip.duration).toBeCloseTo(clip.name==='Idle'?2.4:1.2,5);
  for(const t of clip.tracks){
   expect(t.times[0]).toBe(0);const n=t.getValueSize();
   for(let i=0;i<n;i++)expect(t.values[i],t.name).toBeCloseTo(t.values[t.values.length-n+i],4);
  }
  const mixer=new AnimationMixer(model.scene),action=mixer.clipAction(clip);action.setLoop(LoopOnce,1);action.clampWhenFinished=true;action.play();
  const snapshots=[],root=model.scene.getObjectByName('Root');
  for(let i=0;i<24;i++){
   mixer.setTime(clip.duration*i/24);model.scene.updateMatrixWorld(true);mesh.skeleton.update();
   expect(root.position.length()).toBeLessThan(.0001);
   const points=[],position=mesh.geometry.getAttribute('position');let min=Infinity,max=-Infinity;
   for(let v=0;v<position.count;v++){
    const p=mesh.applyBoneTransform(v,new Vector3().fromBufferAttribute(position,v)).applyMatrix4(mesh.matrixWorld);
    expect(p.toArray().every(Number.isFinite)).toBe(true);min=Math.min(min,p.y);max=Math.max(max,p.y);points.push(p);
   }
   expect(min).toBeGreaterThan(-.018);expect(min).toBeLessThan(.018);expect(max).toBeLessThan(1.86);expect(max).toBeGreaterThan(1.70);snapshots.push(points);
  }
  summaries[clip.name]=Math.max(...snapshots[0].map((p,i)=>p.distanceTo(snapshots[12][i])));
  mixer.stopAllAction();mixer.uncacheRoot(model.scene);
 }
 expect(summaries.Walk).toBeGreaterThan(.15);expect(summaries.Idle).toBeLessThan(.045);
});
