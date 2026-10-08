import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const file=name=>readFileSync(new URL('../../public/art/campaign/'+name,import.meta.url));
it('ships complete metre elevations, finite terrain, and sourced regional river data',()=>{
 const meta=JSON.parse(file('terrain.json')),bytes=file('elevation.bin');
 expect(bytes.length).toBe(meta.rows*meta.columns*4);
 let min=Infinity,max=-Infinity;for(let i=0;i<bytes.length;i+=4){const h=bytes.readFloatLE(i);expect(Number.isFinite(h)).toBe(true);min=Math.min(min,h);max=Math.max(max,h);}
 expect(min).toBeGreaterThanOrEqual(0);expect(max).toBeGreaterThan(3000);expect(max).toBeLessThan(4000);
 const rivers=JSON.parse(file('rivers.json'));expect(rivers.some(r=>r.name==='Huang')).toBe(true);expect(rivers.some(r=>r.name==='Wei')).toBe(true);
 for(const r of rivers){expect(r.points.length).toBeGreaterThan(1);for(const [lon,lat] of r.points){expect(lon).toBeGreaterThan(meta.west-.06);expect(lon).toBeLessThan(meta.east+.06);expect(lat).toBeGreaterThan(meta.south-.06);expect(lat).toBeLessThan(meta.north+.06);}}
});
it.each([['terrain',600000],['city',50000],['tree-0',500],['tree-1',500],['tree-2',150],['rocks',150]])('validates portable %s scene and triangle budget',(name,budget)=>{
 const bytes=file(name+'.glb');expect(bytes.toString('ascii',0,4)).toBe('glTF');expect(bytes.readUInt32LE(8)).toBe(bytes.length);
 const doc=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));expect(doc.scenes).toHaveLength(1);expect(doc.scenes[0].nodes.length).toBeGreaterThan(0);
 const triangles=doc.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+doc.accessors[p.indices].count/3,0);expect(triangles).toBeGreaterThan(0);expect(triangles).toBeLessThan(budget);
 expect(doc.images?.some(i=>i.uri?.startsWith('http'))??false).toBe(false);
});
