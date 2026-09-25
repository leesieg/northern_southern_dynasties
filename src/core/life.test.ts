import {describe,it,expect} from 'vitest';
import {newCampaignWorld,newWorld,advance,act} from './world';
import {ageAt,ageOf,lifeOf,isAlive,healthCapacity,healthLabel,isDeceased} from './lifeState';
import {die,advanceLife,careReason} from './life';
import {serializeWorld,parseWorld,validateWorld} from './save';
import {validLife} from './lifeSave';
import {validRealm} from './realmSave';
import {validGovernments} from './governmentSave';
import {validDiplomacy} from './diplomacySave';
import {validRelationships,} from './relationshipSave';
import {heirs,interactionQuote} from './social';
import {residentsAt} from './placePeople';
import {officeHierarchy} from './offices';
import {relationshipQuote} from './relationships';
import {birthRecords} from '../data/lifespans';
import {relationshipPeople} from '../data/relationships';
import {governmentReason} from './government';
import {lifeAppearance} from '../character/portraitLife';
import {portraitContext} from '../character/composition';

describe('人物年龄、健康与身后事',()=>{
 it('covers the roster, advances by calendar years and freezes age at death',()=>{
  const w=newCampaignWorld('gao-huan',undefined,'sandbox');
  expect(relationshipPeople.every(p=>!!birthRecords[p.id])).toBe(true);
  expect(ageAt(w,'gao-huan')).toBe(50);expect(ageAt(w,'xiao-yan')).toBe(82);
  expect(ageAt(w,'gao-huan',364)).toBe(50);expect(ageAt(w,'gao-huan',365)).toBe(51);
  die(w,'lou-zhaojun','age');const age=ageOf(w,'lou-zhaojun');w.day=1000;expect(ageOf(w,'lou-zhaojun')).toBe(age);
 });
 it('inherits the chosen living heir after death and preserves save, estate and portrait identity',()=>{
  const w=newCampaignWorld('gao-huan',undefined,'sandbox');w.social!.heir='gao-yang';
  const coins=w.people[0].coins,genome=structuredClone(w.identities!.people['gao-yang']);
  die(w,'gao-huan','illness');expect(w.characterId).toBe('gao-yang');expect(w.people[0].coins).toBe(coins);
  expect(w.identities!.people['gao-yang']).toEqual(genome);expect(w.campaign!.status).toBe('active');
  expect(w.relationships!.maritalBasis['lou-zhaojun']).toBe('widowed');
  expect(officeHierarchy(w).some(o=>o.active&&o.holder==='gao-huan')).toBe(false);
  expect(residentsAt(w,['jinyang']).some(p=>p.id==='gao-huan')).toBe(false);
  expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('ends a line without an eligible heir and cannot advance or revive on reload',()=>{
  const w=newCampaignWorld('dugu-xin',undefined,'sandbox');w.day=900;
  die(w,'dugu-xin','illness');expect(w.campaign!.status).toBe('lost');
  const b=parseWorld(serializeWorld(w));advance(b,5);expect(b.day).toBe(900);expect(isAlive(b,'dugu-xin')).toBe(false);
  expect(()=>act(b,{type:'provision'})).toThrow();
 });
 it('rejects dead targets, appointments and historical successions without resurrection',()=>{
  const w=newCampaignWorld('gao-huan',undefined,'sandbox');die(w,'gao-cheng','age');
  expect(heirs(w).map(c=>c.id)).not.toContain('gao-cheng');expect(interactionQuote(w,'gao-cheng','gift').reason).toContain('去世');
  expect(relationshipQuote(w,{type:'relationship',action:'befriend',target:'gao-cheng'}).reason).toContain('去世');
  die(w,'gao-yang','age');
  expect(governmentReason(w,{type:'government',action:'succession',stage:'east-regency'})).toContain('去世');
  expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('charges once for finite care, prevents sick travel, and resolves recovery deterministically',()=>{
  const w=newCampaignWorld('gao-huan',undefined,'sandbox'),p=lifeOf(w,'gao-huan')!;
  p.illness={kind:'fever',since:0,severity:3};p.health=40;
  expect(()=>act(w,{type:'travel',destination:'ye'})).toThrow('重病');
  const coins=w.people[0].coins;act(w,{type:'health',action:'care',target:'gao-huan'});
  expect(w.people[0].coins).toBe(coins-30);expect(p.careUntil).toBe(90);expect(careReason(w,'gao-huan')).toContain('照料');
  const restored=parseWorld(serializeWorld(w));advance(w,60);advance(restored,60);expect(restored).toEqual(w);
  const single=JSON.stringify(w.life);advanceLife(w);expect(JSON.stringify(w.life)).toBe(single);
 });
 it('rejects malformed health, future deaths and dead live appointments',()=>{
  const w=newCampaignWorld('gao-huan',undefined,'sandbox');
  for(const mutate of [(v:typeof w)=>v.life!.people['gao-huan'].health=101,(v:typeof w)=>v.life!.people['gao-huan'].death={day:10,cause:'age'},(v:typeof w)=>delete v.life!.people['gao-huan']]){
   const bad=structuredClone(w);mutate(bad);expect(()=>validateWorld(bad)).toThrow();
  }
 });
 it('migrates an old save at its current day without simulating past mortality',()=>{
  const w=newCampaignWorld('gao-huan',undefined,'sandbox');delete w.life;w.day=3650;
  const b=parseWorld(serializeWorld(w));expect(b.life!.since).toBe(3650);expect(isAlive(b,'xiao-yan')).toBe(true);expect(b.life!.lastMonthly).toBe(3630);
 });
 it('ages the same portrait, adds illness and memorial appearance without changing the genome',()=>{
  const w=newCampaignWorld('gao-huan'),before=portraitContext('gao-huan',w);w.day=365*25;
  const after=portraitContext('gao-huan',w);expect(after.identity).toEqual(before.identity);
  expect(lifeAppearance(after.life!).silver).toBeGreaterThan(lifeAppearance(before.life!).silver);
  lifeOf(w,'gao-huan')!.illness={kind:'fever',since:w.day,severity:3};expect(portraitContext('gao-huan',w).life!.sickness).toBe(3);
  expect(healthCapacity(80)).toBeLessThan(healthCapacity(30));
 });
 it.each(['xiao-yan','gao-huan','yuwen-tai'])('maintains valid saves through multi-decade mortality: %s',id=>{
  const w=newCampaignWorld(id,undefined,'sandbox');
  for(let i=0;i<600&&w.campaign!.status==='active';i++){
   if(w.realm!.event)act(w,{type:'realm',action:'event',choice:'decline'});advance(w,30);
   const checks={life:validLife(w),realm:validRealm(w),government:validGovernments(w),diplomacy:validDiplomacy(w),relationships:validRelationships(w)};
   expect(checks,JSON.stringify({day:w.day,id:w.characterId,life:w.life!.successions})).toEqual({life:true,realm:true,government:true,diplomacy:true,relationships:true});
   validateWorld(w);
  }
 },120000);
 it('allows background world simulation without a playable campaign',()=>{const w=newWorld();advance(w,18000);validateWorld(w);});
});

it('recognizes recorded ancestors without treating missing life records as healthy',()=>{
 const w=newWorld();
 expect(lifeOf(w,'xiao-shunzhi')).toBeUndefined();
 expect(isDeceased(w,'xiao-shunzhi')).toBe(true);
 expect(isAlive(w,'xiao-shunzhi')).toBe(false);
 expect(healthLabel(w,'xiao-shunzhi')).toBe('已故');
 expect(healthLabel(w,'unrecorded-person')).toBe('健康不详');
});
