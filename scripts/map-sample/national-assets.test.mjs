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
