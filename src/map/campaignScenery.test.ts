import {describe,it,expect,vi} from 'vitest';
import {Mesh} from 'three';
import {newWorld,newCampaignWorld} from '../core/world';
import {newRealm} from '../core/realm';
import {siteById} from '../data/scenario';
import {emptyCity} from '../core/construction';
import {campaignCityAppearance,campaignCityKey,campaignCityPixels,campaignCityPlacements,MAX_SCENERY_CITIES,MAX_CITY_GEOMETRIES} from './campaignScenery';
import {campaignCityGeometry,campaignModelAssets} from './CampaignModels';

describe('campaign scenery projection and budgets (CPU only)',()=>{
 it('reads actual completed construction, pending upgrades, fortification and controller without modifying the world',()=>{
  const world=newCampaignWorld('xiao-yan');world.realm=newRealm(world);world.day=3;
  const city=world.realm!.cities.jiankang;city.fortification={level:2,due:12};city.controller='west';
  const holding=emptyCity();holding.levels.market=1;holding.project={building:'market',level:2,started:0,due:12,cost:80};world.holdings.cities.jiankang=holding;
  world.realm!.sieges=[{site:'jiankang',war:1,side:'attack',progress:0,last:0}];
  const snapshot=structuredClone(world),a=campaignCityAppearance(world,siteById.jiankang);
  expect(a).toMatchObject({capital:true,fort:2,levels:[1,0,0],project:0,progress:1,besieged:true,color:'#b69a68'});
  expect(world).toEqual(snapshot);
 });
 it('moves the capital miniature when the authoritative capital moves',()=>{
  const world=newCampaignWorld('xiao-yan');world.realm=newRealm(world);world.realm.identities={liang:{origin:'liang',capital:'jiangling',created:0,predecessor:null}};
  expect(campaignCityAppearance(world,siteById.jiankang).capital).toBe(false);
  expect(campaignCityAppearance(world,siteById.jiangling).capital).toBe(true);
 });
 it('does not remake geometry for an idle new world day or a different banner color',()=>{
  const world=newWorld(),a=campaignCityAppearance(world,siteById.jiankang);world.day=7;
  expect(campaignCityKey(campaignCityAppearance(world,siteById.jiankang))).toBe(campaignCityKey(a));
  expect(campaignCityKey({...a,color:'#ffffff'})).toBe(campaignCityKey(a));
 });
 it('prioritizes the selected city and suppresses neighboring models without moving coordinates',()=>{
  const nearby=[{site:siteById.jiankang,capital:true,point:{x:100,y:100}},{site:siteById.jingkou,capital:false,point:{x:115,y:105}}];
  const snapshot=structuredClone(nearby);
  expect(campaignCityPlacements(nearby,'jingkou',8)).toEqual([nearby[1]]);expect(nearby).toEqual(snapshot);
  const spread=Array.from({length:100},(_,i)=>({site:{...siteById.jingkou,id:String(i)},capital:false,point:{x:i*200,y:0}}));
  expect(campaignCityPlacements(spread,'99',8)).toHaveLength(MAX_SCENERY_CITIES);
  expect(campaignCityPlacements(spread,'99',8)[0].site.id).toBe('99');
  expect(campaignCityPixels(siteById.jiankang,true,11)).toBeGreaterThan(400);
  expect(campaignCityPixels(siteById.jiankang,true,11)).toBeLessThan(600);
 });
 it('produces finite outward normals and merges houses into one city mesh',()=>{
  const a=campaignCityAppearance(newWorld(),siteById.jiankang),g=campaignCityGeometry({...a,fort:3,levels:[3,3,3],project:0,progress:2,besieged:true});
  const positions=g.getAttribute('position'),normals=g.getAttribute('normal');
  expect(positions.count).toBeLessThan(32000);expect(g.groups).toHaveLength(0);
  expect(g.getAttribute('color').count).toBe(positions.count);
  for(let i=0;i<positions.count;i++){expect(Number.isFinite(positions.getX(i)+positions.getY(i)+positions.getZ(i))).toBe(true);expect(Number.isFinite(normals.getX(i)+normals.getY(i)+normals.getZ(i))).toBe(true);}
  g.dispose();
 });
 it('reuses live geometry and releases evicted and final resources',()=>{
  const assets=campaignModelAssets(),a=campaignCityAppearance(newWorld(),siteById.jiankang);
  const first=assets.city(a),second=assets.city(a),g=(first.children[0] as Mesh).geometry,disposed=vi.fn();g.addEventListener('dispose',disposed);
  expect((second.children[0] as Mesh).geometry).toBe(g);
  for(let i=0;i<MAX_CITY_GEOMETRIES+4;i++)assets.city({...a,levels:[i%4,Math.floor(i/4)%4,Math.floor(i/16)%4]});
  assets.prune(new Set());expect(disposed).toHaveBeenCalledOnce();
  const retained=assets.city(a),lastDisposed=vi.fn();(retained.children[0] as Mesh).geometry.addEventListener('dispose',lastDisposed);
  assets.dispose();expect(lastDisposed).toHaveBeenCalledOnce();expect(disposed).toHaveBeenCalledOnce();
 });
});

it('uses native camera footprints for spacing while preserving selected city and coordinates',()=>{
 const entries=[{site:siteById.jiankang,capital:true,point:{x:0,y:0},pixels:200},{site:siteById.jingkou,capital:false,point:{x:180,y:0},pixels:160}];
 const before=structuredClone(entries);
 expect(campaignCityPlacements(entries,'jingkou',6.2)).toEqual([entries[1]]);
 expect(entries).toEqual(before);
});
