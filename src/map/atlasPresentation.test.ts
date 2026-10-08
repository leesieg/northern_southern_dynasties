import {describe,it,expect} from 'vitest';
import {atlasPresentation,PAPER_ZOOM,LANDSCAPE_ZOOM,CITY_VIEW_ZOOM} from './atlasPresentation';

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
