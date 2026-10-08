import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
it('ships a bounded Blender room with an open live-map surface and no external dependencies',()=>{
 const b=readFileSync('public/art/campaign/atlas-study.glb');expect(b.toString('ascii',0,4)).toBe('glTF');
 const doc=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));
 expect(doc.meshes.length).toBeLessThanOrEqual(12);
 const triangles=doc.meshes.flatMap(m=>m.primitives).reduce((sum,p)=>sum+doc.accessors[p.indices].count/3,0);
 expect(triangles).toBeGreaterThan(1000);expect(triangles).toBeLessThan(12000);
 expect(doc.buffers.every(b=>!b.uri)).toBe(true);
 expect(doc.materials.map(m=>m.name)).toContain('Study celadon');
 expect(b.length).toBeLessThan(1000000);
});
it('keeps decorative hidden-region art separate from geographic paper',()=>{
 const a=readFileSync('public/art/campaign/national-parchment.webp'),b=readFileSync('public/art/campaign/hidden-shanshui.webp');
 expect(b.toString('ascii',8,12)).toBe('WEBP');expect(a.equals(b)).toBe(false);expect(b.length).toBeLessThan(500000);
});
