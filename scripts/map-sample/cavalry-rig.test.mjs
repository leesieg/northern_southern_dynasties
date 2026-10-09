import {readFileSync} from 'node:fs';
import {beforeAll,expect,it} from 'vitest';
import {AnimationMixer,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const assets=[];
beforeAll(async()=>{
 for(const kind of ['light','heavy']){
  const bytes=readFileSync(`public/art/military/${kind}-cavalry-v1.glb`),length=bytes.readUInt32LE(12),doc=JSON.parse(bytes.toString('utf8',20,20+length));
  const geometryDoc=structuredClone(doc);delete geometryDoc.materials;delete geometryDoc.textures;delete geometryDoc.images;
  for(const m of geometryDoc.meshes)for(const p of m.primitives)delete p.material;
  const json=Buffer.from(JSON.stringify(geometryDoc)),padded=Buffer.alloc(Math.ceil(json.length/4)*4,32);json.copy(padded);
  const data=Buffer.alloc(20+padded.length+bytes.length-20-length);bytes.copy(data,0,0,12);data.writeUInt32LE(data.length,8);data.writeUInt32LE(padded.length,12);data.writeUInt32LE(0x4e4f534a,16);padded.copy(data,20);bytes.copy(data,20+padded.length,20+length);
  const gltf=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');const meshes=[];gltf.scene.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o);});assets.push({kind,bytes,doc,gltf,meshes});
 }
});
it('provides complete, bounded mounted assets with embedded PBR textures and normalized skinning',()=>{
 for(const {bytes,doc,meshes} of assets){
  expect(bytes.length).toBeLessThan(14_000_000);expect(doc.images.length).toBeGreaterThanOrEqual(6);expect(doc.images.every(i=>i.bufferView!==undefined&&!i.uri)).toBe(true);
  const triangles=doc.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+doc.accessors[p.indices].count/3,0);expect(triangles).toBeLessThan(30000);expect(triangles).toBeGreaterThan(24000);
  expect(meshes.some(m=>m.name==='Horse')).toBe(true);expect(meshes.some(m=>m.name==='Rider')).toBe(true);
  for(const m of meshes){const w=m.geometry.getAttribute('skinWeight'),j=m.geometry.getAttribute('skinIndex');let maxError=0;
   for(let i=0;i<w.count;i++){let total=0;for(let k=0;k<4;k++){const weight=w.getComponent(i,k);if(!Number.isFinite(weight)||weight<0)throw new Error('Invalid weight');if(j.getComponent(i,k)>=m.skeleton.bones.length)throw new Error('Invalid joint');total+=weight;}maxError=Math.max(maxError,Math.abs(total-1));}expect(maxError).toBeLessThan(.00001);
  }
 }
});
it('plays two seamless in-place mounted clips with finite deformation and planted stance hooves',()=>{
 for(const {kind,gltf,meshes} of assets){
  expect(gltf.animations.map(a=>a.name).sort()).toEqual(['Idle','Walk']);
  const horseRoot=gltf.scene.getObjectByName('HorseRoot');expect(horseRoot).toBeDefined();
  for(const clip of gltf.animations){
   expect(clip.duration).toBeCloseTo(clip.name==='Idle'?3:1.6,4);
   for(const track of clip.tracks){expect(track.times[0]).toBe(0);const n=track.getValueSize();for(let k=0;k<n;k++)expect(track.values[k],track.name).toBeCloseTo(track.values.at(-n+k),4);}
   const mixer=new AnimationMixer(gltf.scene);mixer.clipAction(clip).play();let low=Infinity,high=-Infinity;const hoofSamples=[];
   for(let f=0;f<32;f++){
    mixer.setTime(clip.duration*f/32);gltf.scene.updateMatrixWorld(true);expect(horseRoot.position.length()).toBeLessThan(.0001);
    hoofSamples.push(['ForeLHoof','ForeRHoof','HindLHoof','HindRHoof'].map(n=>gltf.scene.getObjectByName(n).getWorldPosition(new Vector3())));
    for(const m of meshes){m.skeleton.update();const position=m.geometry.getAttribute('position');for(let i=0;i<position.count;i+=4){const p=m.applyBoneTransform(i,new Vector3().fromBufferAttribute(position,i)).applyMatrix4(m.matrixWorld);if(!p.toArray().every(Number.isFinite))throw new Error('Non-finite vertex');low=Math.min(low,p.y);high=Math.max(high,p.y);}}
   }
   expect(low,kind+' '+clip.name+' ground').toBeGreaterThan(-.06);expect(low).toBeLessThan(.04);expect(high).toBeLessThan(3.1);expect(high).toBeGreaterThan(2.3);
   // Four-beat walk keeps at least three hoof joints at their standing height at any sampled instant.
   for(const sample of hoofSamples)expect(sample.filter(p=>p.y<.12).length).toBeGreaterThanOrEqual(3);
   if(clip.name==='Walk'){const ys=hoofSamples.map(s=>s[0].y);expect(Math.max(...ys)-Math.min(...ys)).toBeGreaterThan(.09);}
   mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);
  }
 }
});
it('keeps the tail coherent instead of tearing it between the hind legs',()=>{
 for(const {kind,gltf,meshes} of assets){
  const horse=meshes.find(m=>m.name==='Horse'),rest=horse.geometry.getAttribute('position'),index=horse.geometry.getIndex(),mixer=new AnimationMixer(gltf.scene);mixer.clipAction(gltf.animations.find(c=>c.name==='Walk')).play();
  let stretch=1,edge;
  for(const t of [.2,.4,.6,.8,1,1.2,1.4]){
   mixer.setTime(t);gltf.scene.updateMatrixWorld(true);horse.skeleton.update();const points=[];
   for(let i=0;i<rest.count;i++)points.push(horse.applyBoneTransform(i,new Vector3().fromBufferAttribute(rest,i)));
   for(let i=0;i<index.count;i+=3)for(let k=0;k<3;k++){
    const a=index.getX(i+k),b=index.getX(i+(k+1)%3),original=new Vector3().fromBufferAttribute(rest,a).distanceTo(new Vector3().fromBufferAttribute(rest,b)),posed=points[a].distanceTo(points[b]);
    if(original>.01&&posed>.15&&posed/original>stretch){stretch=posed/original;edge={t,vertices:[a,b].map(i=>({position:new Vector3().fromBufferAttribute(rest,i).toArray(),weights:[0,1,2,3].map(k=>[horse.skeleton.bones[horse.geometry.getAttribute('skinIndex').getComponent(i,k)].name,horse.geometry.getAttribute('skinWeight').getComponent(i,k)])}))};}
   }
  }
  expect(stretch,kind+' tail/limb edge stretching '+JSON.stringify(edge)).toBeLessThan(4);
  mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);
 }
});
