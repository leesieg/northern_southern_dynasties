import {readFile} from 'node:fs/promises';
import {describe,it,expect,vi,beforeAll,afterAll} from 'vitest';
// Exercise the actual checked-in terrain and river files, replacing transport only.
vi.mock('../resourceLoader',()=>({mapResource:async path=>new Response(await readFile(new URL('../../../public/'+path,import.meta.url)))}));
import {createTerrain} from './terrain';
import {siteById} from '../../data/scenario';

describe('Jiankang sample with real local elevation',()=>{
 let terrain;
 beforeAll(async()=>{terrain=await createTerrain(()=>{});},30000);
 afterAll(()=>terrain?.root.traverse(o=>{if(o.isMesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}}));
 it('preserves the authoritative centre and valid elevations across all camera coverage',()=>{
  const city=terrain.cities.find(c=>c.id==='jiankang');expect(city.lon).toBe(siteById.jiankang.lon);expect(city.lat).toBe(siteById.jiankang.lat);expect(city.x).toBe(0);expect(city.z).toBe(0);
  const positions=terrain.root.children[0].geometry.attributes.position;
  let min=Infinity,max=-Infinity;
  for(let i=0;i<positions.count;i++){const h=positions.getY(i);expect(Number.isFinite(h)).toBe(true);min=Math.min(min,h);max=Math.max(max,h);}
  expect(max-min).toBeGreaterThan(5);expect(positions.count).toBeGreaterThan(100000);
 });
 it('keeps near-city water and people on a finite continuous surface',()=>{
  expect(terrain.lines.length).toBeGreaterThan(0);
  let previous;
  for(let i=0;i<=1000;i++){const p=terrain.walkPath.getPointAt(i/1000),h=terrain.height(p.x,p.z);expect(Number.isFinite(h)).toBe(true);if(previous!==undefined)expect(Math.abs(h-previous)).toBeLessThan(.35);previous=h;}
 });
 it('has upward terrain normals and valid field-independent season colours',()=>{
  const geometry=terrain.root.children[0].geometry,normals=geometry.attributes.normal;
  for(let i=0;i<normals.count;i+=97)expect(normals.getY(i)).toBeGreaterThan(0);
  for(const season of ['summer','autumn','winter']){terrain.colorize(season);const colors=geometry.attributes.color;for(let i=0;i<colors.count;i+=127)for(const value of [colors.getX(i),colors.getY(i),colors.getZ(i)]){expect(value).toBeGreaterThanOrEqual(0);expect(value).toBeLessThanOrEqual(1);}}
 });
});
