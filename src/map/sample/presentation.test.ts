import {describe,it,expect} from 'vitest';
import {validateStyleMin} from '@maplibre/maplibre-gl-style-spec';
import {treeCandidates,outsideCity,TREE_LIMIT,citySize} from './presentation';
import {sampleStyle} from './style';

describe('isolated map sample',()=>{
 it('uses a valid map style without retired city extrusions',()=>{
  const style=sampleStyle();expect(validateStyleMin(style)).toEqual([]);
  expect(style.layers.some(l=>l.type==='fill-extrusion')).toBe(false);
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
});
