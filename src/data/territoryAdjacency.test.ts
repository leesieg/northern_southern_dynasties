import {describe,it,expect} from 'vitest';
import {territoryNeighbors} from './territoryAdjacency';
import {sites,roads} from './scenario';

describe('当前县域地图共边邻接',()=>{
 it('uses shared county borders and does not equate a long direct road with adjacency',()=>{
  expect(territoryNeighbors('xiangyang').has('liangxian')).toBe(true);expect(territoryNeighbors('liangxian').has('luoyang')).toBe(true);
  expect(roads.some(r=>r.from==='jinyang'&&r.to==='changan')).toBe(true);expect(territoryNeighbors('changan').has('jinyang')).toBe(false);
  expect(territoryNeighbors('luoyang').has('ye')).toBe(false);
 });
 it('keeps modeled neighbor IDs reciprocal without self edges and does not invent unknown counties',()=>{
  const ids=new Set(sites.map(s=>s.id));for(const site of sites)for(const neighbor of territoryNeighbors(site.id)){expect(ids.has(neighbor)).toBe(true);expect(neighbor).not.toBe(site.id);expect(territoryNeighbors(neighbor).has(site.id)).toBe(true);}
  expect(territoryNeighbors('missing').size).toBe(0);
 });
});
