import { describe,it,expect,vi } from 'vitest';
import * as T from 'three';
import { historicalCharacters } from '../data/characters';
import { appearanceFor,appearanceIds } from './appearance';
import { createCharacterModel,disposeCharacterModel } from './model';
describe('历史人物三维模型',()=>{
 it('11 位在录人物均有独立且稳定的造型配置',()=>{
  expect(appearanceIds.slice().sort()).toEqual(historicalCharacters.map(c=>c.id).sort());
  expect(new Set(appearanceIds.map(id=>JSON.stringify(appearanceFor(id)))).size).toBe(11);
  const profile=appearanceFor('xiao-yan');profile.skin='changed';expect(appearanceFor('xiao-yan').skin).not.toBe('changed');expect(()=>appearanceFor('__proto__')).toThrow();
 });
 it.each(historicalCharacters.map(c=>c.id))('%s 的网格有限、包围盒一致并具备可辨识五官和服饰',id=>{
  const model=createCharacterModel(id),bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3());
  expect(size.y).toBeGreaterThan(3);expect(size.y).toBeLessThan(4);expect(size.x).toBeLessThan(2.5);expect(size.z).toBeLessThan(2);
  for(const name of ['sculpted-face','nose-tip','eyeball','cross-collar-robe','headwear','eye-highlight'])expect(model.getObjectByName(name)).toBeDefined();
  let triangles=0;model.traverse(o=>{if(o instanceof T.Mesh){const g=o.geometry;triangles+=(g.index?.count??g.attributes.position.count)/3;for(const value of g.attributes.position.array)expect(Number.isFinite(value)).toBe(true);}});expect(triangles).toBeLessThan(150000);expect(model.userData.artisticInterpretation).toBe(true);disposeCharacterModel(model);
 });
 it('更换表情与服饰确实改变模型，但不改变原人物配置',()=>{
  const calm=createCharacterModel('xiao-gang'),stern=createCharacterModel('xiao-gang','stern','armor');
  expect(calm.getObjectByName('lamellar-plate')).toBeUndefined();expect(stern.getObjectByName('lamellar-plate')).toBeDefined();
  expect(stern.getObjectByName('helmet-bowl')).toBeDefined();
  const points=(root:T.Group)=>(root.getObjectByName('eyebrow') as T.Mesh).geometry.attributes.position.array;
  expect(Array.from(points(stern))).not.toEqual(Array.from(points(calm)));expect(appearanceFor('xiao-gang').armor).toBe(false);disposeCharacterModel(calm);disposeCharacterModel(stern);
 });
 it('释放每个几何体和共享材质，避免切换人物累积 GPU 资源',()=>{
  const model=createCharacterModel('dugu-xin'),spies:ReturnType<typeof vi.spyOn>[]=[];const materials=new Set<T.Material>();
  model.traverse(o=>{if(o instanceof T.Mesh){spies.push(vi.spyOn(o.geometry,'dispose'));(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}});materials.forEach(m=>spies.push(vi.spyOn(m,'dispose')));disposeCharacterModel(model);spies.forEach(s=>expect(s).toHaveBeenCalledTimes(1));
 });
});

describe('人物模型交付格式',()=>{
 it('可以导出包含真实网格和材质的 GLB 二进制文件',async()=>{
  // Node has Blob but no FileReader; this adapter supplies only binary reading, not a browser UI.
  class BinaryReader {result:ArrayBuffer|null=null;onloadend:(()=>void)|null=null;readAsArrayBuffer(blob:Blob){void blob.arrayBuffer().then(buffer=>{this.result=buffer;this.onloadend?.();});}}
  vi.stubGlobal('FileReader',BinaryReader);const model=createCharacterModel('xiao-yan');
  try{const {GLTFExporter}=await import('three/addons/exporters/GLTFExporter.js');const buffer=await new GLTFExporter().parseAsync(model,{binary:true}) as ArrayBuffer;const view=new DataView(buffer);expect(view.getUint32(0,true)).toBe(0x46546c67);expect(view.getUint32(4,true)).toBe(2);expect(view.getUint32(8,true)).toBe(buffer.byteLength);const length=view.getUint32(12,true);const json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,length)));expect(json.meshes.length).toBeGreaterThan(30);expect(json.nodes.some((n:{name:string})=>n.name==='sculpted-face')).toBe(true);expect(json.materials.length).toBeGreaterThan(5);expect(buffer.byteLength).toBeLessThan(12_000_000);}finally{disposeCharacterModel(model);vi.unstubAllGlobals();}
 });
});

it('细节材质使用真实微表面，资源不会进入模型元数据并可释放',async()=>{
 const {applyPortraitSurfaces}=await import('./materials');const model=createCharacterModel('xiao-yan');applyPortraitSurfaces(model);
 const face=model.getObjectByName('sculpted-face') as T.Mesh<T.BufferGeometry,T.MeshPhysicalMaterial>,robe=model.getObjectByName('cross-collar-robe') as T.Mesh<T.BufferGeometry,T.MeshPhysicalMaterial>;
 expect(face.material.bumpMap).toBeInstanceOf(T.DataTexture);expect(face.material.vertexColors).toBe(true);expect(robe.material.bumpMap).not.toBe(face.material.bumpMap);expect(face.geometry.attributes.color).toBeDefined();expect(model.getObjectByName('nose-bridge')).toBeUndefined();expect(model.getObjectByName('eye-socket')).toBeUndefined();expect(model.userData.surfaceTextures).toBeUndefined();
 const skin=vi.spyOn(face.material.bumpMap!,'dispose'),cloth=vi.spyOn(robe.material.bumpMap!,'dispose');disposeCharacterModel(model);expect(skin).toHaveBeenCalledOnce();expect(cloth).toHaveBeenCalledOnce();
});
