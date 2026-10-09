import {expect,it} from 'vitest';
import {TABLE_CENTER,TABLE_COORDINATE,tableRoomStrength} from './tableRoom';
import {projectGround} from './geography';
import {atlasPresentation} from '../atlasPresentation';
it('aligns the physical desktop with the authoritative geographic map center',()=>{
 const p=projectGround(TABLE_COORDINATE.lng,TABLE_COORDINATE.lat);
 expect(p.x).toBeCloseTo(TABLE_CENTER.x,8);expect(p.z).toBeCloseTo(TABLE_CENTER.z,8);
});
it('reveals the study only at the outermost scale and keeps the paper map flat',()=>{
 expect(tableRoomStrength(3)).toBe(0);expect(tableRoomStrength(2)).toBe(1);expect(tableRoomStrength(2.35)).toBeCloseTo(.5);
 expect(atlasPresentation(1.1,true)).toEqual({paper:1,strategic:true,terrain:false,pitch:40});
 expect(atlasPresentation(2.2,true).pitch).toBe(0);
});
