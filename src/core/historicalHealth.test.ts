import {describe,it,expect} from 'vitest';
import {newCampaignWorld} from './world';
import {advanceLife} from './life';
import {monthlyAgeRisk,monthlyIllnessRisk,mortalityRisk,recoveryChance,isAlive} from './lifeState';
import {healthProfileFor} from '../data/healthProfiles';
import {nextMonthStart} from './calendar';
import {parseWorld,serializeWorld} from './save';
import {expressGenome} from './genetics';
import {ensureHouseholdLife} from './householdLife';

describe('historical health habits',()=>{
 it('applies Chongfo to aging and illness, while keeping medical and inherited effects separate',()=>{
  const p=healthProfileFor('xiao-yan')!;
  expect(p.name).toBe('崇佛');expect(p.description).toContain('崇信佛教');
  expect(mortalityRisk(82,58,0,false,false,p.aging).aging).toBe(monthlyAgeRisk(82)/2);
  expect(monthlyIllnessRisk(82,0,false,p.illness)).toBeCloseTo(monthlyIllnessRisk(82)*.8);
  expect(mortalityRisk(82,15,3,true,true,p.aging).illness).toBe(mortalityRisk(82,15,3,true,true).illness);
  expect(healthProfileFor('xiao-gang')).toBeUndefined();
 });
 it('consumes the health modifier in an actual monthly mortality draw and preserves genes across reload',()=>{
  const w=newCampaignWorld('xiao-yan',undefined,'sandbox'),p=w.life!.people['xiao-yan'],genes=structuredClone(w.identities);
  w.life!.people={'xiao-yan':p,...w.life!.people};w.life!.seed=2025;w.day=nextMonthStart(0);
  const draw=((Math.imul(2025,1664525)+1013904223)>>>0)/4294967296;
  expect(draw).toBeLessThan(monthlyAgeRisk(82)*.9);expect(draw).toBeGreaterThan(monthlyAgeRisk(82)/2);
  advanceLife(w);expect(isAlive(w,'xiao-yan')).toBe(true);expect(w.identities).toEqual(genes);
  const once=structuredClone(w.life);advanceLife(w);expect(w.life).toEqual(once);
  expect(parseWorld(serializeWorld(w)).life).toEqual(w.life);
 });
 it('increases illness and persistence for campaign strain without creating senescence under sixty',()=>{
  const p=healthProfileFor('gao-huan')!;
  expect(monthlyIllnessRisk(50,0,false,p.illness)).toBeCloseTo(monthlyIllnessRisk(50)*4);
  expect(mortalityRisk(50,90,0,false,false,p.aging).total).toBe(0);
  expect(recoveryChance('wasting',2,30,false,false,p.recovery)).toBeLessThan(recoveryChance('wasting',2,30));
  expect(recoveryChance('wasting',2,30,true,false,p.recovery)).toBeGreaterThan(recoveryChance('wasting',2,30));
 });
 it('uses campaign strain in monthly recovery, suspending it during actual rest',()=>{
  const w=newCampaignWorld('gao-huan',undefined,'sandbox'),p=w.life!.people['gao-huan'];w.day=nextMonthStart(0);p.health=75;p.illness={kind:'wasting',severity:2,since:0};
  w.life!.people={'gao-huan':p,...w.life!.people};
  const vigorous=expressGenome(w.identities!.people['gao-huan'].genome).congenital.includes('vitality'),low=recoveryChance('wasting',2,w.day,false,vigorous,.75),high=recoveryChance('wasting',2,w.day,false,vigorous);
  const next=(seed:number)=>(Math.imul(seed,1664525)+1013904223)>>>0;
  let seed=0;while(next(next(seed))/4294967296<=low||next(next(seed))/4294967296>=high)seed++;
  w.life!.seed=seed;const rested=structuredClone(w);ensureHouseholdLife(rested).rest['gao-huan']=w.day+30;
  advanceLife(w);advanceLife(rested);expect(w.life!.people['gao-huan'].illness).not.toBeNull();expect(rested.life!.people['gao-huan'].illness).toBeNull();
 });
});
