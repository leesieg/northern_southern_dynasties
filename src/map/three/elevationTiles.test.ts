import {it,expect} from 'vitest';
import {elevationTiles,elevationWindow,decodeElevation} from './elevationTiles';
import {mercator} from './geography';
import {sites} from '../../data/scenario';
const manifest={zoom:7,west:84,east:116,north:36,south:60,tileSize:2};
it('provides a local detail window containing every settlement including national edges',()=>{
 for(const site of sites){const p=mercator(site.lon,site.lat),area=elevationWindow(site.lon,site.lat,manifest);
  expect(area.x).toBeGreaterThanOrEqual(84);expect(area.x+3).toBeLessThanOrEqual(116);
  expect(area.y).toBeGreaterThanOrEqual(36);expect(area.y+3).toBeLessThanOrEqual(60);
  expect(p.x,site.id).toBeGreaterThanOrEqual(area.meta.west);expect(p.x).toBeLessThanOrEqual(area.meta.west+area.meta.width);
  expect(p.y,site.id).toBeGreaterThanOrEqual(area.meta.north);expect(p.y).toBeLessThanOrEqual(area.meta.north+area.meta.height);
 }
});
it('reuses adjacent source tiles, assembles the right positions, and retries failures',async()=>{
 let calls=0,fail=true;
 const store=elevationTiles(manifest,async(x,y)=>{calls++;if(fail){fail=false;throw new Error('missing');}return new Int16Array(4).fill(x*100+y);});
 await expect(store.load(110,32)).rejects.toThrow('missing');
 const a=await store.load(110,32);expect(calls).toBe(10);
 const area=store.window(110,32);expect(a.values[0]).toBe(area.x*100+area.y);expect(a.values[35]).toBe((area.x+2)*100+area.y+2);
 await store.load(110,32);expect(calls).toBe(10);
 await store.load(113,32);expect(calls).toBe(13);
 store.clear();await store.load(113,32);expect(calls).toBe(22);
});
it('rejects truncated local elevation payloads instead of making replacement hills',async()=>{
 await expect(decodeElevation(new Response('',{status:404}))).rejects.toThrow('404');
 const compressed=new Blob([new Uint8Array(8)]).stream().pipeThrough(new CompressionStream('gzip'));
 await expect(decodeElevation(new Response(compressed))).rejects.toThrow('字节数');
});

it('accepts both HTTP-decoded gzip and raw gzip static hosting responses',async()=>{
 const data=new Int16Array(65536);data[0]=1300;data[123]=-31;
 const raw=new Response(data.buffer,{headers:{'content-encoding':'gzip'}});
 expect((await decodeElevation(raw))[0]).toBe(1300);
 const compressed=new Blob([data.buffer]).stream().pipeThrough(new CompressionStream('gzip'));
 expect((await decodeElevation(new Response(compressed)))[123]).toBe(-31);
});
