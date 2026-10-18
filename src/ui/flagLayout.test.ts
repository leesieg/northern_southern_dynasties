import {describe,it,expect} from 'vitest';
import {flagLayout} from './flagLayout';
describe('fixed-span flag packing',()=>{
 it('never extends the row beyond the available span and retains exposed targets at high density',()=>{for(const maxSlot of [64,96])for(const width of [150,180,232,320,600,900])for(const count of [1,2,5,12,30,80]){const {columns,slot}=flagLayout(width,count,maxSlot);expect(columns*slot).toBeLessThanOrEqual(width);expect(slot).toBeGreaterThanOrEqual(32);expect(slot).toBeLessThanOrEqual(maxSlot);expect(columns).toBeLessThanOrEqual(count);}});
 it('has a finite layout before measurement and for an empty row',()=>{expect(flagLayout(0,0)).toEqual({columns:1,slot:1});});
});
