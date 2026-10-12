import {readFile} from 'node:fs/promises';
import {Box3,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {describe,it,expect} from 'vitest';

describe('actual standalone outcrop assets',()=>{
 it('loads five low-profile, self-contained rock variants within the geometry budget',async()=>{
  const silhouettes=[];
  for(let variant=0;variant<5;variant++){
   const bytes=await readFile(new URL(`../../../public/art/campaign/art-sample/outcrop-${variant}.glb`,import.meta.url));
   const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),gltf=await new GLTFLoader().parseAsync(buffer,'');
   const size=new Box3().setFromObject(gltf.scene).getSize(new Vector3());
   expect(size.y/Math.max(size.x,size.z)).toBeLessThan(.85);expect(size.y).toBeGreaterThan(.1);
   silhouettes.push(size.toArray().map(n=>n.toFixed(2)).join(','));let triangles=0;
   gltf.scene.traverse(o=>{if(o.isMesh){const g=o.geometry;expect(g.attributes.color).toBeDefined();expect(g.attributes.normal.count).toBe(g.attributes.position.count);triangles+=(g.index?.count??g.attributes.position.count)/3;g.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){expect(m.map).toBeNull();m.dispose();}}});
   expect(triangles).toBeLessThan(2500);
  }
  expect(new Set(silhouettes).size).toBe(5);
 });
});
