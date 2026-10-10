import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
it('ships all five named weapons with embedded, bounded meshes and textures',()=>{
 const bytes=readFileSync('public/art/military/weapons-v1.glb'),jsonSize=bytes.readUInt32LE(12),doc=JSON.parse(bytes.toString('utf8',20,20+jsonSize));
 expect(bytes.length).toBeLessThan(7_000_000);
 for(const name of ['Sword','Shield','Spear','Bow','Quiver'])expect(doc.nodes.some(n=>n.name===name&&n.mesh!==undefined)).toBe(true);
 const triangles=doc.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+doc.accessors[p.indices].count/3,0);expect(triangles).toBeLessThanOrEqual(19000);
 expect(doc.images).toHaveLength(15);
 for(const image of doc.images){
  expect(image.uri).toBeUndefined();expect(image.mimeType).toBe('image/png');
  const view=doc.bufferViews[image.bufferView],offset=28+jsonSize+(view.byteOffset??0);
  expect(bytes.readUInt32BE(offset+16)).toBe(512);expect(bytes.readUInt32BE(offset+20)).toBe(512);
 }
});
