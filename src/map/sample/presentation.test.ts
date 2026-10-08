import {describe,it,expect} from 'vitest';
import {validateStyleMin} from '@maplibre/maplibre-gl-style-spec';
import {treeCandidates,outsideCity,TREE_LIMIT,citySize} from './presentation';
import {sampleStyle} from './style';
import {geographicStatus} from './loading';

describe('isolated map sample',()=>{
 it('uses a valid map style without retired city extrusions',()=>{
  const style=sampleStyle();expect(validateStyleMin(style)).toEqual([]);
  expect(style.layers.some(l=>l.type==='fill-extrusion')).toBe(false);
  expect(Object.keys(style.sources).sort()).toEqual(['dem-terrain','dem-visual','land','local-rivers','natural']);
 });
 it('keeps vegetation deterministic, sparse and outside settlement footprints',()=>{
  const first=treeCandidates(108.94,34.27);
  expect(treeCandidates(108.94,34.27)).toEqual(first);
  expect(new Set(first.map(p=>p.lon+':'+p.lat)).size).toBe(first.length);
  expect(TREE_LIMIT).toBeLessThanOrEqual(280);
  expect(outsideCity(108.94,34.27)).toBe(false);expect(outsideCity(112.45,34.62)).toBe(false);
  expect(outsideCity(110,35)).toBe(true);
  for(const zoom of [6,7,9,12])expect(citySize(zoom)).toBeGreaterThanOrEqual(1500);
 });
 it('reports actual source progress without waiting for map idle',()=>{
  expect(geographicStatus({terrain:true,elevation:420,naturalLoaded:true,elapsed:30000})).toEqual({message:'地图已就绪',retry:false});
  expect(geographicStatus({terrain:true,elevation:null,naturalLoaded:true,elapsed:16000})).toMatchObject({retry:true});
  expect(geographicStatus({terrain:false,elevation:null,naturalLoaded:true,elapsed:16000})).toMatchObject({message:'地图已就绪',retry:false});
  expect(geographicStatus({terrain:true,elevation:0,naturalLoaded:false,elapsed:1000})).toMatchObject({message:'正在加载：河流与林地',retry:false});
  expect(geographicStatus({terrain:true,elevation:420,naturalLoaded:true,elapsed:1000,error:'HTTP 503'})).toMatchObject({retry:true,message:'地图资源加载失败：HTTP 503'});
 });
});
