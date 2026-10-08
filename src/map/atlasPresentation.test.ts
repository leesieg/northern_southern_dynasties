import {describe,it,expect} from 'vitest';
import {atlasPresentation,atlasPaperStrength,PAPER_ZOOM,LANDSCAPE_ZOOM,CITY_VIEW_ZOOM} from './atlasPresentation';

describe('campaign atlas scale (non-UI)',()=>{
 it('flattens the distant atlas regardless of the landscape preference',()=>{
  for(const tilted of [true,false])for(const zoom of [2.2,3.7,PAPER_ZOOM])expect(atlasPresentation(zoom,tilted)).toEqual({paper:1,strategic:true,terrain:false,pitch:0});
 });
 it('restores relief only when requested and interpolates a bounded transition',()=>{
  const mid=atlasPresentation((PAPER_ZOOM+LANDSCAPE_ZOOM)/2,true);
  expect(mid.paper).toBeCloseTo(.5);expect(mid.pitch).toBeCloseTo(22);expect(mid.terrain).toBe(true);
  for(const zoom of [LANDSCAPE_ZOOM,8]){
   expect(atlasPresentation(zoom,true)).toEqual({paper:0,strategic:false,terrain:true,pitch:44});
   expect(atlasPresentation(zoom,false)).toEqual({paper:0,strategic:false,terrain:false,pitch:0});
  }
  expect(atlasPresentation(14,true).pitch).toBe(66);
  expect(atlasPresentation(CITY_VIEW_ZOOM,true).pitch).toBe(66);expect(atlasPresentation(CITY_VIEW_ZOOM,false).pitch).toBe(0);
 });
});

it('retains paper in the middle view and smoothly restores close campaign materials',()=>{
 for(const z of [3,4.8,6.2,8.2])expect(atlasPaperStrength(z)).toBe(1);
 expect(atlasPaperStrength(9.2)).toBeCloseTo(.5);
 for(const z of [10.2,11.7,12])expect(atlasPaperStrength(z)).toBe(0);
 expect(atlasPaperStrength(12,true)).toBe(1);
 expect(atlasPresentation(8.2,true).terrain).toBe(true);
});
