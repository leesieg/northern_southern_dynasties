import {describe,it,expect,vi} from 'vitest';
import {Mesh} from 'three';
import type {Polygon,MultiPolygon} from 'geojson';
import {newWorld,newCampaignWorld} from '../core/world';
import {newRealm} from '../core/realm';
import {siteById} from '../data/scenario';
import {emptyCity} from '../core/construction';
import {campaignCityAppearance,campaignCityKey,campaignCityPixels,campaignCityPlacements,forestTrees,insideSceneryPolygon,MAX_FOREST_TREES,MAX_SCENERY_CITIES,MAX_CITY_GEOMETRIES} from './campaignScenery';
import {campaignCityGeometry,campaignModelAssets} from './CampaignModels';

function rectangle(west:number,south:number,east:number,north:number):Polygon{return {type:'Polygon',coordinates:[[[west,south],[east,south],[east,north],[west,north],[west,south]]]};}

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
 it('keeps distant tree-free maps and caps near-view trees even over oversized polygons',()=>{
  const woods=[rectangle(70,15,135,55)],bounds={west:100,south:28,east:105,north:32};
  expect(forestTrees(woods,[],bounds,4)).toEqual([]);
  const trees=forestTrees(woods,[],bounds,8);
  expect(trees.length).toBeGreaterThan(0);expect(trees.length).toBeLessThanOrEqual(MAX_FOREST_TREES);
  expect(forestTrees(woods,[],bounds,8)).toEqual(trees);
  for(const p of trees){expect(p.lon).toBeGreaterThanOrEqual(bounds.west);expect(p.lon).toBeLessThanOrEqual(bounds.east);expect(p.lat).toBeGreaterThanOrEqual(bounds.south);expect(p.lat).toBeLessThanOrEqual(bounds.north);}
 });
 it('respects multipolygon holes, water exclusion and city foundations',()=>{
  const hole=rectangle(101,29,102,30),water=rectangle(103,28,104,32),outer=rectangle(100,28,105,32);
  const woods:MultiPolygon={type:'MultiPolygon',coordinates:[[outer.coordinates[0],hole.coordinates[0]]]};
  const trees=forestTrees([woods],[water],{west:100,south:28,east:105,north:32},8,[{lon:100.5,lat:28.5,radius:18000}]);
  expect(trees.length).toBeGreaterThan(0);
  for(const p of trees){expect(insideSceneryPolygon(p.lon,p.lat,woods)).toBe(true);expect(insideSceneryPolygon(p.lon,p.lat,hole)).toBe(false);expect(insideSceneryPolygon(p.lon,p.lat,water)).toBe(false);expect(Math.hypot((p.lon-100.5)*Math.cos(p.lat*Math.PI/180),p.lat-28.5)*111320).toBeGreaterThanOrEqual(18000);}
 });
 it('deduplicates repeated tile polygons and keeps anchors stable when panning within the same grid',()=>{
  const wood=rectangle(100,28,105,32),bounds={west:100,south:28,east:100.5,north:28.5};
  const a=forestTrees([wood],[],bounds,8),b=forestTrees([wood,wood],[],{...bounds,west:100.1},8);
  expect(forestTrees([wood,wood],[],bounds,8)).toEqual(a);
  expect(b).toEqual(a.filter(t=>t.lon>=100.1));
 });
 it('prioritizes the selected city and suppresses neighboring models without moving coordinates',()=>{
  const nearby=[{site:siteById.jiankang,capital:true,point:{x:100,y:100}},{site:siteById.jingkou,capital:false,point:{x:115,y:105}}];
  const snapshot=structuredClone(nearby);
  expect(campaignCityPlacements(nearby,'jingkou',8)).toEqual([nearby[1]]);expect(nearby).toEqual(snapshot);
  const spread=Array.from({length:100},(_,i)=>({site:{...siteById.jingkou,id:String(i)},capital:false,point:{x:i*200,y:0}}));
  expect(campaignCityPlacements(spread,'99',8)).toHaveLength(MAX_SCENERY_CITIES);
  expect(campaignCityPlacements(spread,'99',8)[0].site.id).toBe('99');
  expect(campaignCityPixels(siteById.jiankang,true,11)).toBe(160);
 });
 it('produces finite outward normals and merges houses into one city mesh',()=>{
  const a=campaignCityAppearance(newWorld(),siteById.jiankang),g=campaignCityGeometry({...a,fort:3,levels:[3,3,3],project:0,progress:2,besieged:true});
  const positions=g.getAttribute('position'),normals=g.getAttribute('normal');
  expect(positions.count).toBeLessThan(18000);expect(g.groups).toHaveLength(0);
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
