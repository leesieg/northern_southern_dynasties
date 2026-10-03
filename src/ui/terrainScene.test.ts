import {describe,it,expect} from 'vitest';
import {sites} from '../data/scenario';
import {newCampaignWorld} from '../core/world';
import {personTerrainSite,terrainImages,terrainSceneStyle} from './terrainScene';
describe('terrain identity backgrounds',()=>{
 it('covers every actual site terrain with a distinct image mapping',()=>{
  const terrains=new Set(sites.map(s=>s.terrain));
  expect(terrains.size).toBe(5);
  expect(new Set(Object.values(terrainImages)).size).toBe(terrains.size);
  for(const terrain of terrains)expect(terrainImages[terrain]).toBeTruthy();
  expect(terrainSceneStyle('missing-site')).toEqual({'--terrain-scene':'none'});
 });
 it('follows current player location instead of home or future journey destination',()=>{
  const w=newCampaignWorld('xiao-yan',undefined,'sandbox');
  w.people[0].location='jinyang';
  w.people[0].journey={route:['jinyang','wuwei'],durations:[10],leg:0,elapsed:1,started:w.day};
  expect(personTerrainSite(w,'xiao-yan')).toBe('jinyang');
  expect(terrainSceneStyle(personTerrainSite(w,'player'))).toEqual({'--terrain-scene':expect.stringContaining('river-valley.jpg')});
  w.people[0].location='wuwei';
  expect(terrainSceneStyle(personTerrainSite(w,'xiao-yan'))).toEqual({'--terrain-scene':expect.stringContaining('oasis.jpg')});
 });
 it('uses saved NPC residence and leaves unknown genealogy records neutral',()=>{
  const w=newCampaignWorld('xiao-yan',undefined,'sandbox');
  w.mobility!.residences['gao-huan']={site:'bajun',journey:null};
  expect(personTerrainSite(w,'gao-huan')).toBe('bajun');
  expect(personTerrainSite(w,'unknown-ancestor')).toBeUndefined();
 });
});
