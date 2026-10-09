import {afterEach,beforeAll,beforeEach,expect,it,vi} from 'vitest';
import {SkinnedMesh,Texture,TextureLoader,Vector3} from 'three';
import {GLTFLoader,type GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {animateMilitaryModel,armyModelHeading,militaryModelAssets} from './MilitaryModels';
import {readInfantryTestAsset} from './infantryAsset.testSupport';
import type {Army} from '../core/realm';

let asset:GLTF;
beforeAll(async()=>{asset=await readInfantryTestAsset();});
beforeEach(()=>{
 vi.spyOn(TextureLoader.prototype,'load').mockImplementation(()=>new Texture());
 vi.stubGlobal('document',{createElement:()=>({width:128,height:128,getContext:()=>({createRadialGradient:()=>({addColorStop:()=>{}}),fillRect:()=>{}})})});
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
const army=(id=1):Army=>({id,realm:'liang',location:'jiankang',troops:800,morale:80,supply:500,siege:0,journey:null});
const skinned=(root:GLTF['scene'])=>{let result:SkinnedMesh|undefined;root.traverse(o=>{if(o instanceof SkinnedMesh)result=o;});return result!;};

it('loads once and attaches the shipping infantry to all kinds with independent bones and shared geometry',async()=>{
 const load=vi.spyOn(GLTFLoader.prototype,'loadAsync').mockResolvedValue(asset),repaint=vi.fn(),warn=vi.fn(),assets=militaryModelAssets(repaint,warn);
 const models=(['foot','horse','siege'] as const).map((kind,i)=>assets.create(army(i+1),kind,'梁'));
 await assets.ready;
 try{
  expect(load).toHaveBeenCalledOnce();expect(load.mock.calls[0][0]).toBe('/art/military/infantry-rigged-v1.glb');expect(repaint).toHaveBeenCalled();expect(warn).not.toHaveBeenCalled();
  const meshes=models.map(m=>skinned(m.animation!.root));
  expect(meshes.every(m=>m.skeleton.bones.length===29&&m.castShadow&&m.receiveShadow)).toBe(true);
  expect(meshes[0].geometry).toBe(meshes[1].geometry);expect(meshes[0].skeleton.bones[0]).not.toBe(meshes[1].skeleton.bones[0]);
  const other=meshes[1].skeleton.bones.map(b=>b.quaternion.clone());
  for(let i=0;i<30;i++)animateMilitaryModel(models[0],'marching',i/60,true);
  expect(meshes[1].skeleton.bones.every((b,i)=>b.quaternion.equals(other[i]))).toBe(true);
  expect(models.every(m=>m.root.position.length()===0&&m.body.position.length()===0)).toBe(true);
  const dispose=vi.spyOn(meshes[0].skeleton,'dispose');assets.release(models[0]);expect(dispose).toHaveBeenCalledOnce();expect(models[0].animation).toBeUndefined();expect(models[1].animation).toBeDefined();
 }finally{assets.dispose();}
});

it('blends marching and retreat into Walk, other states into Idle, and respects motion off',async()=>{
 vi.spyOn(GLTFLoader.prototype,'loadAsync').mockResolvedValue(asset);const assets=militaryModelAssets(()=>{},()=>{});await assets.ready;
 const model=assets.create(army(),'horse','梁');let clock=0;
 try{
  animateMilitaryModel(model,'garrison',clock,true);
  animateMilitaryModel(model,'marching',clock+=1/60,true);expect(model.animation!.weight).toBeGreaterThan(0);expect(model.animation!.weight).toBeLessThan(.5);
  for(const state of ['marching','retreat','battle','siege','training','garrison']){
   for(let i=0;i<60;i++)expect(animateMilitaryModel(model,state,clock+=1/60,true)).toBe(true);
   expect(model.animation!.weight).toBe(state==='marching'||state==='retreat'?1:0);
  }
  const time=model.animation!.mixer.time;expect(animateMilitaryModel(model,'marching',clock+=1,false)).toBe(false);expect(model.animation!.weight).toBe(0);expect(model.animation!.mixer.time).toBe(time);
  animateMilitaryModel(model,'marching',clock+=100,true);expect(model.animation!.mixer.time-time).toBeLessThanOrEqual(.100001);
 }finally{assets.dispose();}
});

it('does not attach disposed or removed armies when a delayed download completes',async()=>{
 let resolve!:(asset:GLTF)=>void;vi.spyOn(GLTFLoader.prototype,'loadAsync').mockReturnValue(new Promise(r=>{resolve=r;}));
 const repaint=vi.fn(),assets=militaryModelAssets(repaint,()=>{}),model=assets.create(army(),'siege','梁');assets.release(model);assets.dispose();resolve(asset);await assets.ready;
 expect(model.animation).toBeUndefined();expect(repaint).not.toHaveBeenCalled();
});

it('keeps the army banner when the model download fails and reports the failure',async()=>{
 vi.spyOn(GLTFLoader.prototype,'loadAsync').mockRejectedValue(new Error('offline'));const warn=vi.fn(),assets=militaryModelAssets(()=>{},warn),model=assets.create(army(),'foot','梁');await assets.ready;
 expect(warn).toHaveBeenCalledOnce();expect(model.banner.parent).toBe(model.body);expect(model.animation).toBeUndefined();assets.dispose();
});

it('faces north, east, south and west in the formal map south-positive Z frame',()=>{
 for(const [heading,expected] of [[0,[0,0,-1]],[Math.PI/2,[1,0,0]],[Math.PI,[0,0,1]],[-Math.PI/2,[-1,0,0]]] as const){
  const forward=new Vector3(0,0,1).applyAxisAngle(new Vector3(0,1,0),armyModelHeading(heading));expect(forward.distanceTo(new Vector3(...expected))).toBeLessThan(1e-8);
 }
});
