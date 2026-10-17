import {describe,it,expect} from 'vitest';
import {newCampaignWorld} from './world';
import {advanceLife,actLife,careReason} from './life';
import {monthlyAgeRisk,monthlyIllnessRisk,mortalityRisk,recoveryChance,isAlive,ageRiskMultiplier,activeHealthProfile,healthLabel} from './lifeState';
import {healthProfileFor} from '../data/healthProfiles';
import {nextMonthStart} from './calendar';
import {parseWorld,serializeWorld} from './save';
import {expressGenome} from './genetics';
import {ensureHouseholdLife,familyCommandReason} from './householdLife';
import {advanceNPCCare} from './npcLife';
import {accountWallet} from './obligations';

describe('historical health habits',()=>{
 it('applies Chongfo to aging and illness, while keeping medical and inherited effects separate',()=>{
  const p=healthProfileFor('xiao-yan')!;
  expect(p.name).toBe('崇佛');expect(p.description).toContain('崇信佛教');
  expect(mortalityRisk(82,58,0,false,false,p.aging).aging).toBe(monthlyAgeRisk(82)*.1);
  expect(monthlyIllnessRisk(82,0,false,p.illness)).toBeCloseTo(monthlyIllnessRisk(82)*.65);
  expect(mortalityRisk(82,15,3,true,true,p.aging).illness).toBe(mortalityRisk(82,15,3,true,true).illness);
  expect(healthProfileFor('xiao-gang')).toBeUndefined();
 });
 it('consumes the health modifier in an actual monthly mortality draw and preserves genes across reload',()=>{
  const w=newCampaignWorld('xiao-yan',undefined,'sandbox'),p=w.life!.people['xiao-yan'],genes=structuredClone(w.identities);
  w.life!.people={'xiao-yan':p,...w.life!.people};w.life!.seed=2000;w.day=nextMonthStart(0);
  const draw=((Math.imul(2000,1664525)+1013904223)>>>0)/4294967296;
  expect(draw).toBeLessThan(monthlyAgeRisk(82)*.5*.9);expect(draw).toBeGreaterThan(monthlyAgeRisk(82)*.1);
  advanceLife(w);expect(isAlive(w,'xiao-yan')).toBe(true);expect(w.identities).toEqual(genes);
  const once=structuredClone(w.life);advanceLife(w);expect(w.life).toEqual(once);
  expect(parseWorld(serializeWorld(w)).life).toEqual(w.life);
 });
 it('increases illness and persistence for campaign strain without creating senescence under sixty',()=>{
  const p=healthProfileFor('gao-huan')!;
  expect(monthlyIllnessRisk(50,0,false,p.illness)).toBeCloseTo(monthlyIllnessRisk(50)*4);
  const risk=mortalityRisk(50,90,0,false,false,p.aging,p.complication);
  expect(risk.aging).toBe(0);expect(risk.illness).toBe(.04);
  expect(recoveryChance('wasting',2,30,false,false,p.recovery)).toBeLessThan(recoveryChance('wasting',2,30));
  expect(recoveryChance('wasting',2,30,true,false,p.recovery)).toBeGreaterThan(recoveryChance('wasting',2,30));
 });
 it('uses campaign strain in monthly recovery, suspending it during actual rest',()=>{
  const w=newCampaignWorld('gao-huan',undefined,'sandbox'),p=w.life!.people['gao-huan'];w.day=nextMonthStart(0);p.health=75;p.illness={kind:'wasting',severity:2,since:0};
  w.life!.people={'gao-huan':p,...w.life!.people};
  const vigorous=expressGenome(w.identities!.people['gao-huan'].genome).congenital.includes('vitality'),low=recoveryChance('wasting',2,w.day,false,vigorous,.75),high=recoveryChance('wasting',2,w.day,false,vigorous);
  const next=(seed:number)=>(Math.imul(seed,1664525)+1013904223)>>>0;
  let seed=0;while(next(seed)/4294967296<=.04||next(next(seed))/4294967296<=low||next(next(seed))/4294967296>=high)seed++;
  w.life!.seed=seed;const rested=structuredClone(w);ensureHouseholdLife(rested).rest['gao-huan']=w.day+30;
  advanceLife(w);advanceLife(rested);expect(w.life!.people['gao-huan'].illness).not.toBeNull();expect(rested.life!.people['gao-huan'].illness).toBeNull();
 });
 it('keeps the first three years protective and fades that benefit at extreme ages',()=>{
  const p=healthProfileFor('xiao-yan')!,monthly=mortalityRisk(82,58,0,false,false,p.aging).aging;
  expect((1-monthly)**24).toBeGreaterThan(.91);expect((1-monthly)**36).toBeGreaterThan(.88);
  expect(ageRiskMultiplier(85,p.aging,p.agingFadeFrom,p.agingFadeYears)).toBe(.1);
  expect(ageRiskMultiplier(90,p.aging,p.agingFadeFrom,p.agingFadeYears)).toBeCloseTo(.55);
  expect(ageRiskMultiplier(95,p.aging,p.agingFadeFrom,p.agingFadeYears)).toBe(1);
  expect(ageRiskMultiplier(120,p.aging,p.agingFadeFrom,p.agingFadeYears)).toBe(1);
 });
 it('makes decade survival uncommon under continuous strain even with continuous care, using the pure risk formula',()=>{
  const p=healthProfileFor('gao-huan')!,plain=mortalityRisk(50,90,0,false,false,1,p.complication),care=mortalityRisk(50,90,0,true,false,1,p.complication),strong=mortalityRisk(50,90,0,true,true,1,p.complication);
  expect((1-care.total)**120).toBeLessThan(.06);expect((1-strong.total)**120).toBeLessThan(.10);
  expect(care.total).toBeCloseTo(plain.total*.6);
  expect(mortalityRisk(50,90,3,true,false,1,p.complication).illness).toBeCloseTo(care.illness);
 });
 it('settles strain as illness, with paid medicine and real rest affecting the very same monthly draw',()=>{
  const w=newCampaignWorld('gao-huan',undefined,'sandbox'),p=w.life!.people['gao-huan'];w.life!.people={'gao-huan':p,...w.life!.people};w.life!.seed=2050;w.day=nextMonthStart(0);
  const treated=structuredClone(w),rested=structuredClone(w),coins=treated.people[0].coins;
  expect(healthLabel(w,'gao-huan')).toBe('积劳欠安');expect(careReason(treated,'gao-huan')).toBe('');
  actLife(treated,{type:'health',action:'care',target:'gao-huan'});expect(treated.people[0].coins).toBe(coins-30);
  ensureHouseholdLife(rested).rest['gao-huan']=w.day+30;expect(activeHealthProfile(rested,'gao-huan')).toBeUndefined();expect(familyCommandReason(rested,{type:'familyLife',action:'rest'})).toBe('正在休养');
  advanceLife(w);advanceLife(treated);advanceLife(rested);
  expect(w.life!.people['gao-huan'].death?.cause).toBe('illness');expect(isAlive(treated,'gao-huan')).toBe(true);expect(isAlive(rested,'gao-huan')).toBe(true);
  const once=structuredClone(treated.life);advanceLife(treated);expect(treated.life).toEqual(once);
 });
 it('lets NPCs pay for chronic care without spending player funds or chaining healthy rest',()=>{
  const w=newCampaignWorld('xiao-yan',undefined,'sandbox');ensureHouseholdLife(w);const p=w.life!.people['gao-huan'],wallet=accountWallet(w,'person:gao-huan')!,coins=w.people[0].coins;wallet.write(100);
  advanceNPCCare(w);expect(p.careUntil).toBe(90);expect(wallet.read()).toBe(70);advanceNPCCare(w);expect(wallet.read()).toBe(70);expect(w.people[0].coins).toBe(coins);
  w.day=91;p.careUntil=0;wallet.write(0);advanceNPCCare(w);expect(w.householdLife!.rest['gao-huan']).toBeUndefined();
 });
});
