import {describe,it,expect} from 'vitest';
import {newCampaignWorld,advance} from './world';
import {allPeople} from './personRegistry';
import {lifeOf} from './lifeState';
import {activeMarriage,changeRelationOpinion,relationOpinion,spouseOf,bondKey} from './relationships';
import {quoteFamilyMarriage,actFamilyMarriage,type FamilyMarriageCommand} from './familyMarriage';
import {ensureHouseholdLife,advanceHouseholdLife,deliverChild,familyPlanningReason,actFamily} from './householdLife';
import {advanceMobility,npcRoute} from './mobility';
import {personResidence} from './residence';
import {accountWallet} from './obligations';
import {nextMonthStart} from './calendar';
import {parseWorld,serializeWorld} from './save';
import type {World} from './types';

function isolate(w:World,ids:string[]){for(const p of allPeople(w)){const life=lifeOf(w,p.id);if(life){life.health=ids.includes(p.id)?80:40;life.illness=null;}}}
function pair(player='gao-huan'){
 const w=newCampaignWorld(player,undefined,'sandbox'),a='yuan-qin',b='guest-west';
 isolate(w,[a,b]);w.mobility!.residences[a]={site:'changan',journey:null};w.mobility!.residences[b]={site:'changan',journey:null};
 ensureHouseholdLife(w);
 const command:FamilyMarriageCommand={type:'familyMarriage',subject:a,target:b,coins:50,residence:'changan',family:'yuan'};
 return {w,a,b,command};
}
function monthly(w:World){w.day=nextMonthStart(w.day,w.scriptId);advanceHouseholdLife(w);}
function conceptionSeed(){let seed=0;while(((Math.imul(seed,1664525)+1013904223)>>>0)/4294967296>=.18)seed++;return seed;}

describe('autonomous NPC families',()=>{
 it('migrates unknown singles without removing a recorded spouse or changing balances',()=>{
  const {w}=pair();w.relationships!.maritalBasis['yuan-qin']='unknown';w.relationships!.maritalBasis['xiao-gang']='unknown';
  const reserves=structuredClone(w.relationships!.reserves),marriages=structuredClone(w.relationships!.marriages),player=structuredClone(w.people);
  const loaded=parseWorld(serializeWorld(w));
  expect(loaded.relationships!.maritalBasis['yuan-qin']).toBe('free');expect(loaded.relationships!.maritalBasis['xiao-gang']).toBe('recorded');
  expect(spouseOf(loaded,'xiao-gang')).toBe('wang-lingbin');expect(loaded.relationships!.marriages).toEqual(marriages);
  expect(loaded.relationships!.reserves).toEqual(reserves);expect(loaded.people).toEqual(player);expect(loaded.generatedPeople).toBeUndefined();
  expect(parseWorld(serializeWorld(loaded))).toEqual(loaded);
 });
 it('courts a compatible local partner over monthly decisions without buying acceptance',()=>{
  const {w,a,b}=pair(),before=relationOpinion(w,a,b),coins=accountWallet(w,'person:'+a)!.read();
  monthly(w);expect(relationOpinion(w,a,b)).toBe(before+6);expect(spouseOf(w,a)).toBeNull();expect(accountWallet(w,'person:'+a)!.read()).toBe(coins);
  const snapshot=structuredClone(w);advanceHouseholdLife(w);expect(w).toEqual(snapshot);
  for(let i=0;i<12&&!spouseOf(w,a);i++)monthly(w);
  expect(spouseOf(w,a)).toBe(b);expect(activeMarriage(w,a)?.origin).toBe('simulation');
 });
 it('requires reciprocal consent, pays NPC dowry once and leaves player and public wallets alone',()=>{
  const {w,a,b,command}=pair();changeRelationOpinion(w,a,b,100);changeRelationOpinion(w,b,a,-200);
  const refused=structuredClone(w);expect(quoteFamilyMarriage(w,command,a).reason).toContain('接受度');expect(()=>actFamilyMarriage(w,command,a)).toThrow('接受度');expect(w).toEqual(refused);
  changeRelationOpinion(w,b,a,300);const left=accountWallet(w,'person:'+a)!.read(),right=accountWallet(w,'person:'+b)!.read(),player=w.people[0].coins,publicFunds=structuredClone(w.realm!.treasuries);
  monthly(w);expect(spouseOf(w,a)).toBe(b);expect(accountWallet(w,'person:'+a)!.read()).toBe(left-50);expect(accountWallet(w,'person:'+b)!.read()).toBe(right+50);
  expect(w.people[0].coins).toBe(player);expect(w.realm!.treasuries).toEqual(publicFunds);expect(w.householdLife!.plans[activeMarriage(w,a)!.id].trying).toBe(true);
  const after=structuredClone(w);advanceHouseholdLife(w);expect(w).toEqual(after);expect(()=>actFamilyMarriage(w,command,a)).toThrow('已有');expect(w).toEqual(after);
  expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('runs autonomous marriage through the normal daily world settlement',()=>{
  const {w,a,b}=pair();changeRelationOpinion(w,a,b,100);changeRelationOpinion(w,b,a,100);
  w.day=nextMonthStart(w.day,w.scriptId)-1;advance(w);
  expect(spouseOf(w,a)).toBe(b);expect(w.householdLife!.plans[activeMarriage(w,a)!.id].trying).toBe(true);
  expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('does not arrange the player’s marriage or match relatives, rivals, travelers or detained people',()=>{
  const player=pair('yuan-qin');monthly(player.w);expect(spouseOf(player.w,player.a)).toBeNull();
  for(const condition of ['rival','travel','detained','poor'] as const){
   const {w,a,b}=pair();
   if(condition==='rival')w.relationships!.bonds[bondKey(a,b)]={a,b,kind:'rival',since:w.day};
   if(condition==='travel')w.mobility!.residences[b].journey={route:['changan','tianshui'],durations:[5],leg:0,elapsed:0,started:w.day};
   if(condition==='detained')w.custody!.records[b]={person:b,captor:'west',captorPerson:null,army:null,site:'changan',since:w.day,origin:'west',cause:'battle',source:'test',treatment:'guarded',talked:null,terms:'',escapeAfter:w.day,ransom:80,offer:null};
   if(condition==='poor'){w.relationships!.reserves[a]=0;w.relationships!.reserves[b]=0;}
   monthly(w);expect(spouseOf(w,a)).toBeNull();expect(spouseOf(w,b)).toBeNull();
  }
  const kin=pair().w;expect(quoteFamilyMarriage(kin,{type:'familyMarriage',subject:'gao-cheng',target:'lou-zhaojun',coins:50,residence:'ye',family:'gao'},'gao-cheng').reason).toContain('近亲');
 });
 it('allows eligible historical NPC couples to conceive and preserves the pending birth across saves',()=>{
  const w=newCampaignWorld('gao-huan',undefined,'sandbox');isolate(w,['xiao-gang','wang-lingbin']);
  ensureHouseholdLife(w).seed=conceptionSeed();monthly(w);
  expect(w.householdLife!.pregnancies).toHaveLength(1);const p=w.householdLife!.pregnancies[0];expect(p.mother).toBe('wang-lingbin');
  const loaded=parseWorld(serializeWorld(w));advanceHouseholdLife(w);expect(w.householdLife!.pregnancies).toHaveLength(1);
  w.day=p.due;loaded.day=p.due;deliverChild(w,p);deliverChild(loaded,loaded.householdLife!.pregnancies[0]);
  expect(w.generatedPeople).toEqual(loaded.generatedPeople);expect(w.identities).toEqual(loaded.identities);expect(w.householdLife!.seed).toBe(loaded.householdLife!.seed);
 });
 it('leaves player family planning opt-in and enforces the automatic two-child limit even with a stored NPC plan',()=>{
  const player=newCampaignWorld('xiao-gang',undefined,'sandbox');isolate(player,['xiao-gang','wang-lingbin']);ensureHouseholdLife(player).seed=conceptionSeed();monthly(player);expect(player.householdLife!.pregnancies).toHaveLength(0);
  actFamily(player,{type:'familyLife',action:'plan',trying:true,family:'xiao'});monthly(player);expect(player.householdLife!.pregnancies).toHaveLength(1);
  const {w,a,b,command}=pair();changeRelationOpinion(w,a,b,100);changeRelationOpinion(w,b,a,100);actFamilyMarriage(w,command,a);
  for(const since of [0,990]){const s=ensureHouseholdLife(w),p={id:s.nextId++,father:a,mother:b,family:'yuan',since,due:since+270,status:'expecting' as const,child:null};s.pregnancies.push(p);w.day=p.due;deliverChild(w,p);}
  w.day+=720;w.householdLife!.seed=conceptionSeed();expect(familyPlanningReason(w,a)).toBe('');const seed=w.householdLife!.seed;monthly(w);
  expect(w.householdLife!.pregnancies).toHaveLength(2);expect(w.householdLife!.seed).toBe(seed);expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('reunites a free spouse along real roads while the office holder stays at the posting',()=>{
  const w=newCampaignWorld('gao-huan',undefined,'sandbox');isolate(w,['xiao-gang','wang-lingbin']);w.mobility!.residences['wang-lingbin']={site:'jingkou',journey:null};
  const route=npcRoute(w,'wang-lingbin','jiankang')!;expect(route.days).toBeGreaterThan(0);expect(familyPlanningReason(w,'xiao-gang')).toContain('同城');
  w.day++;advanceMobility(w);expect(personResidence(w,'wang-lingbin').site).toBe('jingkou');expect(w.mobility!.residences['wang-lingbin'].journey?.route).toEqual(route.route);
  expect(personResidence(w,'xiao-gang').site).toBe('jiankang');
  for(let i=0;i<route.days+2&&personResidence(w,'wang-lingbin').traveling;i++){w.day++;advanceMobility(w);}
  expect(personResidence(w,'wang-lingbin')).toEqual({site:'jiankang',traveling:false});expect(familyPlanningReason(w,'xiao-gang')).toBe('');
 });
 it('does not send an office holder to a spouse across an unauthorized border',()=>{
  const w=newCampaignWorld('xiao-yan',undefined,'sandbox');w.mobility!.residences['gao-huan']={site:'ye',journey:null};w.mobility!.residences['lou-zhaojun']={site:'changan',journey:null};
  expect(npcRoute(w,'gao-huan','changan')).toBeNull();w.day++;advanceMobility(w);expect(personResidence(w,'gao-huan')).toEqual({site:'ye',traveling:false});expect(familyPlanningReason(w,'gao-huan')).toContain('同城');
 });
});
