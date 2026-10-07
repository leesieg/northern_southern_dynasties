import {describe,it,expect} from 'vitest';
import {sampleCityGround,groundHeight,groundCityGeometry,waterMaskContains} from './campaignTerrain';
import {campaignCityAppearance,campaignCityMeters,campaignCityPixels,cityRegionalStyle} from './campaignScenery';
import {campaignCityGeometry} from './CampaignModels';
import {campaignTexture} from './campaignTexture';
import {campaignEnvironment,environmentCandidates,nearCampaignRoad,MAX_ENVIRONMENT_CHUNKS,MAX_ENVIRONMENT_INSTANCES} from './CampaignEnvironment';
import {InstancedMesh} from 'three';
import {MercatorCoordinate,type Map} from 'maplibre-gl';
import {siteById} from '../data/scenario';
import {newWorld} from '../core/world';

describe('campaign terrain and assets (CPU only)',()=>{
 it('preserves the geographic visual footprint while close zoom doubles visible size',()=>{
  const site=siteById.jiankang;
  expect(campaignCityPixels(site,true,10)).toBeCloseTo(campaignCityPixels(site,true,9)*2);
  expect(campaignCityMeters(site,true)).toBeGreaterThan(0);
  expect(campaignCityMeters(site,true)).toBeLessThanOrEqual(8000);
  expect(campaignCityMeters({...site,lat:50},true)).toBe(campaignCityMeters(site,true));
 });
 it('samples and interpolates real elevations without inventing missing terrain',()=>{
  expect(sampleCityGround((x)=>x>0?null:100)).toBeNull();
  const ground=sampleCityGround((x,z)=>100+x*2-z*3)!;
  expect(ground.center).toBe(100);expect(groundHeight(ground,3.4,-2.1)).toBeCloseTo(113.1);
 });
 it('grounds each plot and leaves reusable geometry and the anchor unchanged',()=>{
  const template=campaignCityGeometry(campaignCityAppearance(newWorld(),siteById.jiankang)),positions=Array.from(template.getAttribute('position').array),ground=sampleCityGround((x,z)=>200+x*2+z)!;
  const geometry=groundCityGeometry(template,ground,100),p=geometry.getAttribute('position'),g=template.getAttribute('ground');
  for(let i=0;i<p.count;i++)expect(p.getY(i)-positions[i*3+1]).toBeCloseTo((g.getX(i)*2+g.getY(i))/100,5);
  expect(Array.from(template.getAttribute('position').array)).toEqual(positions);
  template.dispose();geometry.dispose();
 });
 it('keeps footprint, streets and plots identical between details, adding bounded close geometry and usable UVs',()=>{
  const a=campaignCityAppearance(newWorld(),siteById.jiankang),regional=campaignCityGeometry(a),close=campaignCityGeometry(a,'close');
  expect(close.getAttribute('position').count).toBeGreaterThan(regional.getAttribute('position').count);
  expect(close.getAttribute('position').count).toBeLessThan(180000);
  regional.computeBoundingBox();close.computeBoundingBox();
  expect(close.boundingBox!.min.x).toBeCloseTo(regional.boundingBox!.min.x,1);expect(close.boundingBox!.max.z).toBeCloseTo(regional.boundingBox!.max.z,1);
  for(const g of [regional,close]){
   expect(g.getAttribute('uv').count).toBe(g.getAttribute('position').count);
   expect(g.getAttribute('ground').count).toBe(g.getAttribute('position').count);g.dispose();
  }
  const texture=campaignTexture();expect(texture.image.width).toBe(256);expect(texture.image.height).toBe(64);texture.dispose();
 });
 it('respects islands in water polygons and the geographic river corridor',()=>{
  const water={type:'Polygon' as const,coordinates:[[[0,0],[4,0],[4,4],[0,4],[0,0]],[[1,1],[3,1],[3,3],[1,3],[1,1]]]};
  expect(waterMaskContains([.5,.5],water)).toBe(true);expect(waterMaskContains([2,2],water)).toBe(false);expect(waterMaskContains([5,2],water)).toBe(false);
  expect(waterMaskContains([2,.0001],{type:'LineString',coordinates:[[0,0],[4,0]]})).toBe(true);
 });
 it('clips symbolic building and ground triangles out of loaded water masks without changing cached layouts',()=>{
  const template=campaignCityGeometry(campaignCityAppearance(newWorld(),siteById.jiankang)),ground=sampleCityGround(()=>10)!,geometry=groundCityGeometry(template,ground,100,(x)=>x>0),plots=geometry.getAttribute('ground');
  expect(geometry.index!.count).toBeLessThan(template.index!.count);expect(geometry.index!.count).toBeGreaterThan(0);
  for(let i=0;i<geometry.index!.count;i++)expect(plots.getX(geometry.index!.getX(i))).toBeLessThanOrEqual(0);
  geometry.dispose();template.dispose();
 });
 it('uses static landscape styles and fixed bounded environment chunks across world days and controller changes',()=>{
  const world=newWorld(),site=siteById.jiankang,first=campaignCityAppearance(world,site);world.day=999;
  expect(campaignCityAppearance(world,{...site,polity:'west'}).style).toBe(first.style);
  expect(cityRegionalStyle(siteById.chengdu)).toBe('basin');expect(cityRegionalStyle(siteById.dunhuang)).toBe('oasis');
  const candidates=environmentCandidates(100,200);expect(environmentCandidates(100,200)).toEqual(candidates);expect(environmentCandidates(101,200)).not.toEqual(candidates);
  expect(MAX_ENVIRONMENT_CHUNKS*candidates.length).toBeLessThanOrEqual(MAX_ENVIRONMENT_INSTANCES);
 });
 it('keeps instance placement stable and removes scenery on missing masks, water, steep slopes or low detail',()=>{
  const environment=campaignEnvironment(MercatorCoordinate.fromLngLat([110,32]));
  let water=false,steep=false,loaded=true;
  const map={getZoom:()=>9,getCenter:()=>({lng:118.8,lat:32}),getBounds:()=>({getWest:()=>118.5,getEast:()=>119.1,getSouth:()=>31.7,getNorth:()=>32.3}),getCanvas:()=>({clientWidth:1000,clientHeight:800}),isSourceLoaded:()=>loaded,getLayer:()=>true,project:()=>({x:500,y:400}),queryRenderedFeatures:()=>loaded?['land-fallback','woodland',...(water?['inland-water']:[])].map(id=>({layer:{id}})):[],queryTerrainElevation:({lng}:{lng:number})=>steep?lng*50000:100};
  const trees=environment.root.children[0] as InstancedMesh,fields=environment.root.children[1] as InstancedMesh;
  try{
   environment.refresh(map as unknown as Map,[],true,true);expect(trees.count).toBeGreaterThan(0);expect(trees.count).toBeLessThanOrEqual(MAX_ENVIRONMENT_INSTANCES);
   const positions=Array.from(trees.instanceMatrix.array);environment.refresh(map as unknown as Map,[],true,true);expect(Array.from(trees.instanceMatrix.array)).toEqual(positions);
   water=true;environment.refresh(map as unknown as Map,[],true,true);expect(trees.count).toBe(0);water=false;
   steep=true;environment.refresh(map as unknown as Map,[],true,true);expect(trees.count).toBe(0);steep=false;
   loaded=false;environment.refresh(map as unknown as Map,[{id:'jiankang',capital:true}],true,true);expect(trees.count+fields.count).toBe(0);loaded=true;
   environment.refresh(map as unknown as Map,[],true,false);expect(trees.count).toBe(0);
   expect(nearCampaignRoad(siteById.jiankang.lon,siteById.jiankang.lat)).toBe(true);
  }finally{environment.dispose();}
 });
 it('keeps locally loaded woodland visible during tile loading and starts vegetation in regional view',()=>{
  const environment=campaignEnvironment(MercatorCoordinate.fromLngLat([110,32]));let masks=true;
  const map={getZoom:()=>7.4,getCenter:()=>({lng:118.8,lat:32}),getBounds:()=>({getWest:()=>118.5,getEast:()=>119.1,getSouth:()=>31.7,getNorth:()=>32.3}),getCanvas:()=>({clientWidth:1000,clientHeight:800}),isSourceLoaded:()=>false,getLayer:()=>true,project:()=>({x:500,y:400}),queryRenderedFeatures:()=>masks?[{layer:{id:'land-fallback'}},{layer:{id:'woodland'}}]:[],queryTerrainElevation:()=>100};
  try{environment.refresh(map as unknown as Map,[],true,true);const trees=environment.root.children[0] as InstancedMesh;expect(trees.count).toBeGreaterThan(0);expect(trees.count).toBeLessThanOrEqual(MAX_ENVIRONMENT_INSTANCES);masks=false;environment.refresh(map as unknown as Map,[],true,true);expect(trees.count).toBe(0);}
  finally{environment.dispose();}
 });
});
