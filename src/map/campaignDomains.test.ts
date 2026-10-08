import {describe,it,expect} from 'vitest';
import {newRealm} from '../core/realm';
import {newCampaignWorld} from '../core/world';
import {sites,siteById} from '../data/scenario';
import {campaignDomains,controlledSite,domainSignature} from './campaignDomains';
import {waterMaskContains} from './campaignTerrain';
import {campaignSeason,applyCampaignSeason} from './campaignSeason';
import {atlasStyle} from './atlasStyle';
import {validateStyleMin} from '@maplibre/maplibre-gl-style-spec';
import type {Map} from 'maplibre-gl';

describe('campaign coverage and season integration',()=>{
 it('hides unmodeled control, preserves governed city anchors, and updates on capture without mutating the world',()=>{
  const world=newCampaignWorld('xiao-yan');world.realm=newRealm(world);const snapshot=structuredClone(world),first=campaignDomains(world);
  const fog=first.fog.features[0].geometry;
  expect(waterMaskContains([65,20],fog)).toBe(true);
  for(const site of sites)if(controlledSite(world,site.id))expect(waterMaskContains([site.lon,site.lat],fog),site.id).toBe(false);
  expect(world).toEqual(snapshot);
  const before=domainSignature(world);world.realm!.cities.jiankang.controller='frontier';
  const changed=campaignDomains(world),site=siteById.jiankang;
  expect(domainSignature(world)).not.toBe(before);expect(controlledSite(world,'jiankang')).toBe(false);
  expect(waterMaskContains([site.lon,site.lat],changed.fog.features[0].geometry)).toBe(true);
  world.realm!.cities.jiankang.controller='west';expect(controlledSite(world,'jiankang')).toBe(true);
  expect(waterMaskContains([site.lon,site.lat],campaignDomains(world).fog.features[0].geometry)).toBe(false);
 });
 it('uses the real calendar and keeps all four map styles valid',()=>{
  const world=newCampaignWorld('xiao-yan');
  for(const [day,expected] of [[0,'winter'],[90,'spring'],[180,'summer'],[270,'autumn'],[364,'winter']] as const){
   world.day=day;expect(campaignSeason(world)).toBe(expected);
   const style=atlasStyle();const map={setPaintProperty:(id:string,key:string,value:unknown)=>{const layer=style.layers.find(l=>l.id===id)!;Object.assign(layer.paint!,{[key]:value});}};
   applyCampaignSeason(map as unknown as Map,expected);expect(validateStyleMin(style)).toEqual([]);
  }
 });
});
