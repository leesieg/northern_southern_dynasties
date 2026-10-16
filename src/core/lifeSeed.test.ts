import {it,expect} from 'vitest';
import {createCampaign} from './campaignStart';
import {advanceLife} from './life';
import {mortalityRisk} from './lifeState';
import {parseWorld,serializeWorld} from './save';
import {nextMonthStart} from './calendar';
it('under-sixty characters can die of illness, but not a pure aging roll',()=>{
 expect(mortalityRisk(45,100,0).total).toBe(0);expect(mortalityRisk(59,100,0).total).toBe(0);
 expect(mortalityRisk(45,15,3).illness).toBeGreaterThan(0);expect(mortalityRisk(60,100,0).aging).toBeGreaterThan(0);
});
it('uses an explicit new-game seed and preserves the random stream across save/load',()=>{
 const a=createCampaign('guest-west',undefined,'sandbox',123),b=createCampaign('guest-west',undefined,'sandbox',456);
 expect(a.life!.seed).toBe(123);expect(b.life!.seed).toBe(456);
 const loaded=parseWorld(serializeWorld(a));a.day=loaded.day=nextMonthStart(0);advanceLife(a);advanceLife(loaded);expect(loaded.life).toEqual(a.life);
 const once=structuredClone(a.life);advanceLife(a);expect(a.life).toEqual(once);
});
it('does not resurrect a deceased person or reroll an existing save',()=>{
 const w=createCampaign('guest-west',undefined,'sandbox',123);w.life!.people['hou-jing'].death={day:0,cause:'age'};w.life!.people['hou-jing'].health=0;
 w.day=nextMonthStart(0);advanceLife(w);expect(w.life!.people['hou-jing'].death).toEqual({day:0,cause:'age'});
});
