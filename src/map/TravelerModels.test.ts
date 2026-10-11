import {beforeAll,expect,it,vi} from 'vitest';
import {AnimationMixer,Box3,SkinnedMesh,Vector3} from 'three';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {readInfantryTestAsset} from './infantryAsset.testSupport';
import {travelerModelAssets,animateTraveler,type TravelerAssetKey} from './TravelerModels';
const kinds=['han-female','han-male','xianbei-female','xianbei-male'] as const;
const assets=new Map<TravelerAssetKey,GLTF>();
beforeAll(async()=>{for(const kind of kinds)for(const lod of ['near','far'] as const){const key=`${kind}-${lod}` as const;assets.set(key,await readInfantryTestAsset('../campaign/travelers/'+key+'.glb'));}});
const skin=(asset:GLTF)=>{let mesh!:SkinnedMesh;asset.scene.traverse(o=>{if(o instanceof SkinnedMesh)mesh=o;});return mesh;};
it.each(kinds)('validates the shipping %s LOD meshes, normalized skin weights, looping clips and grounded deformation',kind=>{
 for(const lod of ['near','far'] as const){
  const asset=assets.get(`${kind}-${lod}`)!,mesh=skin(asset),g=mesh.geometry,mixer=new AnimationMixer(asset.scene),vertex=new Vector3();
  expect(g.index!.count/3).toBeLessThanOrEqual(lod==='near'?15000:4000);expect(mesh.skeleton.bones.length).toBe(26);expect(asset.animations.map(a=>a.name).sort()).toEqual(['Idle','Walk']);
  const weights=g.getAttribute('skinWeight');for(let i=0;i<weights.count;i++)expect(weights.getX(i)+weights.getY(i)+weights.getZ(i)+weights.getW(i)).toBeCloseTo(1,4);
  for(const clip of asset.animations){
   for(const track of clip.tracks){const size=track.getValueSize();for(let c=0;c<size;c++)expect(track.values[c]).toBeCloseTo(track.values[track.values.length-size+c],4);}
   const action=mixer.clipAction(clip);action.play();const roots=mesh.skeleton.bones.filter(b=>b.name==='Root');let maxMovement=0;const first=new Vector3();
   for(let frame=0;frame<24;frame++){
    mixer.setTime(frame/24*clip.duration);asset.scene.updateMatrixWorld(true);mesh.skeleton.update();mesh.computeBoundingBox();const bounds=new Box3().setFromObject(asset.scene);expect(bounds.min.y).toBeGreaterThan(-.025);expect(bounds.max.y).toBeLessThan(1.85);expect(bounds.max.x-bounds.min.x).toBeLessThan(.9);
    const foot=mesh.skeleton.bones.find(b=>b.name==='FootL'||b.name==='Foot.L')!;foot.getWorldPosition(vertex);if(!frame)first.copy(vertex);maxMovement=Math.max(maxMovement,first.distanceTo(vertex));expect(roots[0].position.length()).toBeLessThan(1e-6);
   }
   if(clip.name==='Walk')expect(maxMovement).toBeGreaterThan(.12);action.stop();
  }mixer.stopAllAction();
 }
});
it('shares assets, isolates skeletons, freezes animation on pause, and releases independent instances',async()=>{
 const load=vi.fn(async(key:TravelerAssetKey)=>assets.get(key)!),cache=travelerModelAssets(()=>{},()=>{},undefined,load),a=cache.create('han-male-near','a'),b=cache.create('han-male-near','b');await cache.ready;
 try{
  expect(load).toHaveBeenCalledTimes(1);expect(a.body).not.toBe(b.body);const aSkin=skin({scene:a.body!} as GLTF),bSkin=skin({scene:b.body!} as GLTF);expect(aSkin.geometry).toBe(bSkin.geometry);expect(aSkin.skeleton).not.toBe(bSkin.skeleton);
  const other=bSkin.skeleton.bones.map(b=>b.quaternion.clone());for(let i=0;i<30;i++)animateTraveler(a,i*16,true,true);expect(bSkin.skeleton.bones.every((b,i)=>b.quaternion.equals(other[i]))).toBe(true);
  const time=a.mixer!.time,pose=aSkin.skeleton.bones.map(b=>b.quaternion.clone());animateTraveler(a,1000,false,false);expect(a.mixer!.time).toBe(time);expect(aSkin.skeleton.bones.every((b,i)=>b.quaternion.equals(pose[i]))).toBe(true);
  const dispose=vi.spyOn(aSkin.skeleton,'dispose');cache.release(a);expect(dispose).toHaveBeenCalledOnce();expect(b.body).toBeDefined();expect(a.root.position.toArray()).toEqual([0,0,0]);
 }finally{cache.dispose();}
});
it('does not reattach released requests; a failure stays retryable without repeated background downloads',async()=>{
 let resolve!:(asset:GLTF)=>void;const load=vi.fn(()=>new Promise<GLTF>(r=>{resolve=r;})),cache=travelerModelAssets(()=>{},()=>{},undefined,load),old=cache.create('xianbei-female-near','old');cache.release(old);resolve(assets.get('xianbei-female-near')!);await cache.ready;expect(old.body).toBeUndefined();cache.dispose();
 const warn=vi.fn(),retry=vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(assets.get('han-female-near')!),next=travelerModelAssets(()=>{},warn,undefined,retry);const model=next.create('han-female-near','a');await next.ready;expect(model.body).toBeUndefined();expect(warn).toHaveBeenCalled();next.create('han-female-near','b');await next.ready;expect(retry).toHaveBeenCalledTimes(1);next.retry();await next.ready;expect(model.body).toBeDefined();expect(warn).toHaveBeenLastCalledWith('');next.dispose();
});
it('keeps all four traveler bodies at the same human scale as the actual shipping infantry',async()=>{
 const infantry=await readInfantryTestAsset('infantry-sword-shield-v2.glb'),mixer=new AnimationMixer(infantry.scene);mixer.clipAction(infantry.animations.find(a=>a.name==='Idle')!).play();mixer.update(0);infantry.scene.updateMatrixWorld(true);const infantrySkin=skin(infantry);infantrySkin.skeleton.update();infantrySkin.computeBoundingBox();const infantryHeight=new Box3().setFromObject(infantry.scene).getSize(new Vector3()).y;
 for(const kind of kinds)for(const lod of ['near','far'] as const){const asset=assets.get(`${kind}-${lod}`)!;const mix=new AnimationMixer(asset.scene);mix.clipAction(asset.animations.find(a=>a.name==='Idle')!).play();mix.update(0);asset.scene.updateMatrixWorld(true);skin(asset).skeleton.update();skin(asset).computeBoundingBox();const height=new Box3().setFromObject(asset.scene).getSize(new Vector3()).y;expect(height/infantryHeight).toBeGreaterThan(.9);expect(height/infantryHeight).toBeLessThan(1.05);mix.stopAllAction();}mixer.stopAllAction();
});
