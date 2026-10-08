import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
 it.each(['northern-city','woodland-tree'])('exports %s as a nonempty single-scene asset within its budget',name=>{
  const bytes=readFileSync(new URL(`../../public/art/map-sample/${name}.glb`,import.meta.url));
  expect(bytes.toString('ascii',0,4)).toBe('glTF');expect(bytes.readUInt32LE(8)).toBe(bytes.length);
  const doc=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));
  expect(doc.scenes).toHaveLength(1);expect(doc.scenes[doc.scene??0].nodes).toHaveLength(1);
  expect(doc.nodes.some((n)=>n.name==='Cube')).toBe(false);
  const primitives=doc.meshes.flatMap((m)=>m.primitives);
  const triangles=primitives.reduce((n,p)=>n+doc.accessors[p.indices].count/3,0);
  expect(triangles).toBeGreaterThan(0);expect(triangles).toBeLessThan(name==='woodland-tree'?300:60000);
  expect(primitives.length).toBeLessThanOrEqual(name==='woodland-tree'?2:4);
 });
