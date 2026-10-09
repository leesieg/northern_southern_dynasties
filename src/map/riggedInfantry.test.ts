import {afterEach,beforeAll,beforeEach,expect,it,vi} from 'vitest';
import {SkinnedMesh,Texture,TextureLoader,Vector3} from 'three';
import {GLTFLoader,type GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {animateMilitaryModel,armyModelHeading,armyModelKind,militaryModelAssets} from './MilitaryModels';
import {readInfantryTestAsset} from './infantryAsset.testSupport';
import type {Army} from '../core/realm';

let asset:GLTF,light:GLTF,heavy:GLTF,siege:GLTF;
beforeAll(async()=>{[asset,light,heavy,siege]=await Promise.all([readInfantryTestAsset(),readInfantryTestAsset('light-cavalry-v1.glb'),readInfantryTestAsset('heavy-cavalry-v1.glb'),readInfantryTestAsset('siege-crew-v1.glb')]);});
beforeEach(()=>{
 vi.spyOn(TextureLoader.prototype,'load').mockImplementation(()=>new Texture());
 vi.stubGlobal('document',{createElement:()=>({width:128,height:128,getContext:()=>({createRadialGradient:()=>({addColorStop:()=>{}}),fillRect:()=>{}})})});
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
const army=(id=1):Army=>({id,realm:'liang',location:'jiankang',troops:800,morale:80,supply:500,siege:0,journey:null});
const skinned=(root:GLTF['scene'])=>{let result:SkinnedMesh|undefined;root.traverse(o=>{if(o instanceof SkinnedMesh)result=o;});return result!;};

it('loads each requested type once with independent bones and shared geometry',async()=>{
 const load=vi.spyOn(GLTFLoader.prototype,'loadAsync').mockImplementation(async url=>url.includes('light-cavalry')?light:url.includes('heavy-cavalry')?heavy:url.includes('siege-crew')?siege:asset),repaint=vi.fn(),warn=vi.fn(),assets=militaryModelAssets(repaint,warn);
 const models=(['foot','lightHorse','lightHorse','heavyHorse','siege'] as const).map((kind,i)=>assets.create(army(i+1),kind,'梁'));
 await assets.ready;
 try{
  expect(load).toHaveBeenCalledTimes(4);expect(load.mock.calls[0][0]).toBe('/art/military/infantry-rigged-v1.glb');expect(repaint).toHaveBeenCalled();expect(warn).not.toHaveBeenCalled();
  const meshes=models.map(m=>skinned(m.animation!.root));
  expect(meshes.map(m=>m.skeleton.bones.length)).toEqual([29,48,48,48,70]);expect(meshes.every(m=>m.castShadow&&m.receiveShadow)).toBe(true);
  expect(meshes[1].geometry).toBe(meshes[2].geometry);expect(meshes[1].skeleton.bones[0]).not.toBe(meshes[2].skeleton.bones[0]);expect(meshes[1].geometry).not.toBe(meshes[3].geometry);
  const other=meshes[1].skeleton.bones.map(b=>b.quaternion.clone());
  for(let i=0;i<30;i++)animateMilitaryModel(models[0],'marching',i/60,true);
  expect(meshes[1].skeleton.bones.every((b,i)=>b.quaternion.equals(other[i]))).toBe(true);
  expect(models.every(m=>m.root.position.length()===0&&m.body.position.length()===0)).toBe(true);
  const dispose=vi.spyOn(meshes[0].skeleton,'dispose');assets.release(models[0]);expect(dispose).toHaveBeenCalledOnce();expect(models[0].animation).toBeUndefined();expect(models[1].animation).toBeDefined();
 }finally{assets.dispose();}
});

it('blends marching and retreat into Walk, other states into Idle, and respects motion off',async()=>{
 vi.spyOn(GLTFLoader.prototype,'loadAsync').mockResolvedValue(asset);const assets=militaryModelAssets(()=>{},()=>{});await assets.ready;
 const model=assets.create(army(),'lightHorse','梁');await assets.ready;let clock=0;
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
 const repaint=vi.fn(),assets=militaryModelAssets(repaint,()=>{}),model=assets.create(army(),'foot','梁');assets.release(model);assets.dispose();resolve(asset);await assets.ready;
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

it('selects the largest surviving visual group and distinguishes light from heavy cavalry',()=>{
 const a=army();const reg=(kind:'shield'|'spear'|'lightHorse'|'heavyHorse'|'siege',troops:number)=>({id:kind,kind,troops,service:'standing' as const,origin:'jiankang',experience:0});
 expect(armyModelKind(a)).toBe('foot');
 a.regiments=[reg('shield',500),reg('lightHorse',10)];expect(armyModelKind(a)).toBe('foot');
 a.regiments=[reg('lightHorse',400),reg('heavyHorse',300)];expect(armyModelKind(a)).toBe('lightHorse');
 a.regiments=[reg('lightHorse',100),reg('heavyHorse',300),reg('siege',0)];expect(armyModelKind(a)).toBe('heavyHorse');
 a.regiments=[reg('shield',200),reg('spear',200),reg('heavyHorse',300)];expect(armyModelKind(a)).toBe('foot');
 a.regiments=[reg('heavyHorse',0),reg('siege',100)];expect(armyModelKind(a)).toBe('siege');
});

it('isolates a failed cavalry download from infantry and from other cavalry models',async()=>{
 vi.spyOn(GLTFLoader.prototype,'loadAsync').mockImplementation(async url=>{if(url.includes('heavy-cavalry'))throw new Error('offline');return url.includes('light-cavalry')?light:asset;});
 const warn=vi.fn(),assets=militaryModelAssets(()=>{},warn),foot=assets.create(army(1),'foot','梁'),cavalry=assets.create(army(2),'lightHorse','梁'),missing=assets.create(army(3),'heavyHorse','梁');
 await assets.ready;expect(foot.animation).toBeDefined();expect(cavalry.animation).toBeDefined();expect(missing.animation).toBeUndefined();expect(missing.banner.parent).toBe(missing.body);expect(warn).toHaveBeenCalledOnce();assets.dispose();
});

it('does not resurrect a light cavalry model replaced while its asset was downloading',async()=>{
 let complete!:(value:GLTF)=>void;
 vi.spyOn(GLTFLoader.prototype,'loadAsync').mockImplementation(async url=>url.includes('light-cavalry')?new Promise<GLTF>(resolve=>{complete=resolve;}):url.includes('heavy-cavalry')?heavy:asset);
 const assets=militaryModelAssets(()=>{},()=>{}),old=assets.create(army(),'lightHorse','梁');
 assets.release(old);const replacement=assets.create(army(),'heavyHorse','梁');complete(light);await assets.ready;
 try{expect(old.animation).toBeUndefined();expect(old.root.parent).toBeNull();expect(replacement.animation?.root.name).toBe('Rigged campaign heavyHorse');}
 finally{assets.dispose();}
});

it('runs the siege firing cycle only during combat, blends states and resets at a new attack',async()=>{
 vi.spyOn(GLTFLoader.prototype,'loadAsync').mockImplementation(async url=>url.includes('siege-crew')?siege:asset);
 const assets=militaryModelAssets(()=>{},()=>{}),model=assets.create(army(),'siege','梁');await assets.ready;
 try{
  const animation=model.animation!;expect(animation.attack).toBeDefined();let clock=0;
  for(const state of ['garrison','marching','siege','battle','retreat','training']){
   for(let i=0;i<60;i++)animateMilitaryModel(model,state,clock+=1/60,true);
   expect(animation.attackWeight).toBe(state==='siege'||state==='battle'?1:0);
   expect(animation.weight).toBe(state==='marching'||state==='retreat'?1:0);
   expect(animation.idle.getEffectiveWeight()+animation.walk.getEffectiveWeight()+animation.attack!.getEffectiveWeight()).toBeCloseTo(1,6);
  }
  animateMilitaryModel(model,'siege',clock+=1/60,true);expect(animation.attack!.time).toBeLessThan(.03);
  animateMilitaryModel(model,'siege',clock+=1/60,false);expect(animation.attackWeight).toBe(0);expect(animation.weight).toBe(0);expect(animation.idle.getEffectiveWeight()).toBe(1);
 }finally{assets.dispose();}
});
