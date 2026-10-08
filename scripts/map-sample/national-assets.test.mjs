import {readFile} from 'node:fs/promises';
import {it,expect} from 'vitest';
import {sites} from '../../src/data/scenario.ts';
import {gridHeight,mercator} from '../../src/map/three/geography.ts';
it('ships a complete finite, sourced national DEM covering every playable settlement',async()=>{
 const meta=JSON.parse(await readFile('public/art/campaign/national-terrain.json','utf8')),buffer=await readFile('public/art/campaign/national-elevation.bin');
 expect(meta.source).toContain('Terrarium');expect(buffer.byteLength).toBe(meta.columns*meta.rows*4);
 const values=new Float32Array(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength));
 expect(values.every(Number.isFinite)).toBe(true);
 for(const site of sites){const p=mercator(site.lon,site.lat),height=gridHeight(values,meta,p.x,p.y);expect(height,site.id).not.toBeNull();expect(height).toBeGreaterThan(-500);expect(height).toBeLessThan(8500);}
});

it('ships all 768 local fine elevation tiles and decodes every tile without gaps',async()=>{
 const {gunzipSync}=await import('node:zlib');
 const m=JSON.parse(await readFile('public/art/campaign/elevation/manifest.json','utf8'));
 expect(m.zoom).toBe(7);expect(m.tiles).toBe(768);
 let checked=0;
 for(let x=m.west;x<m.east;x++)for(let y=m.north;y<m.south;y++){
  const raw=gunzipSync(await readFile(`public/art/campaign/elevation/${x}-${y}.bin.gz`));expect(raw.byteLength).toBe(131072);
  const values=new Int16Array(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));
  expect(values.every(h=>h>=-11000&&h<=9000),`${x}:${y}`).toBe(true);checked++;
 }
 expect(checked).toBe(m.tiles);
});
