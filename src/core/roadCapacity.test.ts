import {describe,it,expect} from 'vitest';
import {newCampaignWorld} from './world';
import {roads} from '../data/scenario';
import {loadRoad,roadCapacity,validTraffic} from './roadCapacity';
import {validateWorld} from './save';
describe('shared daily transport loading',()=>{
 it('shares both directions, preserves unused cargo, resets only on a new day',()=>{
  const w=newCampaignWorld('xiao-yan',undefined,'sandbox'),e=roads[0],cap=roadCapacity(e.from,e.to);
  expect(loadRoad(w,e.from,e.to,cap-3)).toBe(cap-3);expect(loadRoad(w,e.to,e.from,10)).toBe(3);expect(loadRoad(w,e.from,e.to,99)).toBe(0);expect(validTraffic(w)).toBe(true);
  w.day++;expect(loadRoad(w,e.to,e.from,10)).toBe(10);validateWorld(w);
 });
 it('rejects forged road usage beyond actual capacity',()=>{const w=newCampaignWorld('xiao-yan',undefined,'sandbox'),e=roads[0];loadRoad(w,e.from,e.to,10);w.realm!.traffic!.used[[e.from,e.to].sort().join('|')]=roadCapacity(e.from,e.to)+1;expect(validTraffic(w)).toBe(false);});
});
