import {describe,it,expect} from 'vitest';
import {newCampaignWorld} from './world';
import {initializeHistoricalStart} from './historicalStart';
import {advanceNPCMarriages} from './familyMarriage';
import {advanceHouseholdLife,ensureHouseholdLife} from './householdLife';
import {activeMarriage,changeRelationOpinion,relationOpinion} from './relationships';
import {serviceBusy} from './assignments';
import {accountWallet} from './obligations';
import {monthStart,nextMonthStart} from './calendar';
import {parseWorld,serializeWorld,validateWorld} from './save';
import {die} from './life';
import {publicSuccessor,successionKinTier} from './publicSuccession';

function singlePair(){
 const w=newCampaignWorld('yuwen-tai',undefined,'sandbox');
 initializeHistoricalStart(w);
 for(const [id,p] of Object.entries(w.life!.people))if(!['gao-yue','guest-east',w.characterId].includes(id))p.health=49;
 w.mobility!.residences['gao-yue']={site:'ye',journey:null};w.mobility!.residences['guest-east']={site:'ye',journey:null};
 return w;
}
function couple(){
 const w=singlePair();changeRelationOpinion(w,'gao-yue','guest-east',100);changeRelationOpinion(w,'guest-east','gao-yue',100);
 advanceNPCMarriages(w);return w;
}
describe('NPC family and public succession continuity',()=>{
 it('allows a settled commander to marry mid-month with his own money',()=>{
  const w=singlePair(),army=w.realm!.armies.find(a=>a.realm==='east')!;
  w.mobility!.armyCommanders![army.id!]='gao-yue';army.location='ye';w.day=5;
  changeRelationOpinion(w,'gao-yue','guest-east',100);changeRelationOpinion(w,'guest-east','gao-yue',100);
  const payer=accountWallet(w,'person:gao-yue')!.read(),recipient=accountWallet(w,'person:guest-east')!.read(),player=w.people[0].coins;
  expect(serviceBusy(w,'gao-yue')).toBe(true);advanceNPCMarriages(w);
  expect(activeMarriage(w,'gao-yue')?.b).toBe('guest-east');expect(accountWallet(w,'person:gao-yue')!.read()).toBe(payer-50);
  expect(accountWallet(w,'person:guest-east')!.read()).toBe(recipient+50);expect(w.people[0].coins).toBe(player);
  const once=serializeWorld(w);advanceNPCMarriages(w);expect(serializeWorld(w)).toBe(once);
 });
 it('courts at most once per person per month and persists that limit',()=>{
  const w=singlePair();w.day=5;const before=relationOpinion(w,'gao-yue','guest-east');advanceNPCMarriages(w);
  expect(relationOpinion(w,'gao-yue','guest-east')).toBe(before+6);
  const loaded=parseWorld(serializeWorld(w));loaded.day++;advanceNPCMarriages(loaded);expect(relationOpinion(loaded,'gao-yue','guest-east')).toBe(before+6);
  loaded.day=nextMonthStart(loaded.day);advanceNPCMarriages(loaded);expect(relationOpinion(loaded,'gao-yue','guest-east')).toBeGreaterThan(before+6);
 });
 it('assesses conception after a mid-month reunion once and delivers a real child',()=>{
  const w=couple(),s=ensureHouseholdLife(w),marriage=activeMarriage(w,'gao-yue')!;
  w.day=nextMonthStart(w.day);w.mobility!.residences['guest-east'].site='jiankang';advanceHouseholdLife(w);
  expect(s.conceptionChecks![marriage.id]).toBeUndefined();w.day+=5;w.mobility!.residences['guest-east'].site='ye';
  let conceptionSeed=0;while(((Math.imul(conceptionSeed,1664525)+1013904223)>>>0)/4294967296>=.18)conceptionSeed++;s.seed=conceptionSeed;
  advanceHouseholdLife(w);const pregnancy=s.pregnancies.find(p=>p.mother==='guest-east')!;
  expect(pregnancy).toBeDefined();expect(pregnancy.since).toBe(w.day);expect(s.conceptionChecks![marriage.id]).toBe(monthStart(w.day,w.scriptId));
  const loaded=parseWorld(serializeWorld(w)),seed=loaded.householdLife!.seed;advanceHouseholdLife(loaded);expect(loaded.householdLife!.seed).toBe(seed);
  loaded.day=pregnancy.due;advanceHouseholdLife(loaded);expect(loaded.householdLife!.pregnancies.find(p=>p.id===pregnancy.id)?.status).toBe('born');
  expect(loaded.generatedPeople!['born-'+pregnancy.id].father).toBe('gao-yue');validateWorld(loaded);
 });
 it('does not reroll an already assessed legacy month or change a player plan',()=>{
  const w=couple(),s=ensureHouseholdLife(w);delete s.conceptionChecks;w.day=5;s.seed=0;
  advanceHouseholdLife(w);expect(s.pregnancies).toHaveLength(0);expect(s.seed).toBe(0);
  const player=newCampaignWorld('xiao-gang',undefined,'sandbox');ensureHouseholdLife(player);advanceHouseholdLife(player);
  expect(player.householdLife!.pregnancies.some(p=>p.father===player.characterId||p.mother===player.characterId)).toBe(false);
  const bad=structuredClone(w);bad.householdLife!.marriageChecks={unknown:0};expect(()=>validateWorld(bad)).toThrow();
 });
 it('passes Gao Cheng’s authority to Gao Yang rather than their mother',()=>{
  const w=newCampaignWorld('yuwen-tai',undefined,'sandbox');die(w,'gao-huan','illness');
  expect(w.realm!.governments!.realms.east.executives[0]).toBe('gao-cheng');expect(publicSuccessor(w,'east','executive')).toBe('gao-yang');
  die(w,'gao-cheng','illness');expect(w.realm!.governments!.realms.east.executives[0]).toBe('gao-yang');
  expect(parseWorld(serializeWorld(w)).realm!.governments!.realms.east.executives[0]).toBe('gao-yang');
 });
 it('ranks descendants before siblings, and siblings before ancestors',()=>{
  const w=newCampaignWorld('yuwen-tai',undefined,'sandbox');
  expect(successionKinTier(w,'xiao-yan','xiao-fangzhi')).toBe(0);
  expect(successionKinTier(w,'gao-cheng','gao-yang')).toBe(1);expect(successionKinTier(w,'gao-cheng','lou-zhaojun')).toBe(3);
 });
});
