import {newGovernedCampaignWorld as newCampaignWorld} from './governedTestWorld';
import {actService,serviceCandidates} from './assignments';
import {actRetinue,advanceRetinue} from './retinue';
import {describe,it,expect} from 'vitest';
import {advance,act} from './world';
import {advancePopulation} from './population';
import {advanceArmyLogistics} from './armyLogistics';
import {advanceRealm,actRealm,realmReason} from './realm';
import {advancePersonalInfluence,personInfluence,awardInfluence} from './personalInfluence';
import {governmentOf} from './government';
import {enactPoliticalAction} from './politicalActions';
import {payFiscalOperations,routeGrant,fiscalPath,spendLocal} from './treasury';
import {parseWorld,serializeWorld,validateWorld} from './save';
import {historicalCharacters} from '../data/characters';
import {founderGenome} from './genetics';
import {abilityBreakdown} from './social';
const start=()=>newCampaignWorld('xiao-yan',undefined,'sandbox');
describe('numeric dependency audit regressions',()=>{
 it('same-city supply transfers conserve grain without creating a zero-leg convoy',()=>{
  const w=start(),s=w.realm!,a={realm:'liang' as const,location:'jiankang',troops:600,morale:80,supply:0,journey:null,siege:0};s.armies.push(a);
  const before=s.treasuries.liang.grain+s.cities.jiankang.grain;advanceArmyLogistics(w,a);
  expect(a.supply).toBe(120);expect(s.armies[0].convoy).toBeUndefined();expect(s.treasuries.liang.grain+s.cities.jiankang.grain+a.supply).toBe(before);validateWorld(w);
 });
 it('dismissing an army returns surviving people, local stores and queued grain with stated losses',()=>{
  const w=start(),s=w.realm!;s.armies.push({realm:'liang',location:'jingkou',troops:600,morale:80,supply:0,journey:null,siege:0});const a=s.armies[0];advanceArmyLogistics(w,a);const sent=a.convoy!.grain,before=s.treasuries.liang.grain,pop=s.cities.jingkou.population;a.supply=30;
  actRealm(w,{type:'realm',action:'disband'});expect(s.treasuries.liang.grain).toBe(before);expect(s.population!.transfers.at(-1)!.sent).toBe(sent);w.day++;advancePopulation(w);expect(s.cities.jiankang.grain).toBe(Math.floor(sent*.95));expect(s.cities.jingkou.population).toBe(pop+600);expect(s.cities.jingkou.grain).toBe(30);validateWorld(w);
 });
 it('fed local cities do not lose order just because central grain is empty',()=>{
  const empty=start(),full=structuredClone(empty);empty.realm!.treasuries.liang.grain=0;
  for(const w of [empty,full]){w.realm!.cities.jingkou.grain=200;w.day=30;advanceRealm(w);}
  expect(empty.realm!.cities.jingkou.order).toBe(full.realm!.cities.jingkou.order);
 });
 it('relief away from the capital uses local grain and cannot teleport central stocks',()=>{
  const w=start(),s=w.realm!;s.cities.jingkou.governor=w.characterId!;const c={type:'realm',action:'relief',site:'jingkou'} as const;
  expect(realmReason(w,c)).toContain('本城公粮');s.cities.jingkou.grain=80;const central=s.treasuries.liang.grain;actRealm(w,c);expect(s.cities.jingkou.grain).toBe(30);expect(s.treasuries.liang.grain).toBe(central);
 });
 it('political support cannot be farmed by repeatedly issuing the same domain action',()=>{
  const w=start(),g=governmentOf(w)!;enactPoliticalAction(w,'liang','tax');const once=structuredClone(g);enactPoliticalAction(w,'liang','tax');expect(g).toEqual(once);expect(realmReason(w,{type:'realm',action:'tax',site:'jiankang',tax:'normal'})).toContain('现行');
  expect(parseWorld(serializeWorld(w)).realm!.governments!.realms.liang.cooldowns['politics|tax']).toBe(30);w.day=30;enactPoliticalAction(w,'liang','tax');expect(g.cooldowns['politics|tax']).toBe(60);
 });
 it('registered non-roster officials receive influence and old maps migrate without changing existing balances',()=>{
  const w=start();awardInfluence(w,'chen-baxian',9);expect(personInfluence(w,'chen-baxian')).toBe(9);w.day=30;advancePersonalInfluence(w);expect(personInfluence(w,'chen-baxian')).toBe(14);
  w.realm!.personalInfluence=Object.fromEntries(historicalCharacters.map(p=>[p.id,p.id===w.characterId?w.realm!.influence:7]));const loaded=parseWorld(serializeWorld(w));expect(personInfluence(loaded,'chen-baxian')).toBe(0);expect(personInfluence(loaded,'xiao-gang')).toBe(7);expect(parseWorld(serializeWorld(loaded))).toEqual(loaded);
 });
 it('public salaries credit NPC office holders and reflect actual treasury expenditure',()=>{
  const w=start(),s=w.realm!;s.cities.jingkou.governor='xiao-gang';const before=w.relationships!.reserves['xiao-gang'];s.treasuries.liang.coins=10000;payFiscalOperations(w,'liang');expect(w.relationships!.reserves['xiao-gang']).toBe(before+4);
  governmentOf(w)!.court!.ministries.secretariat='xiao-gang';const next=w.relationships!.reserves['xiao-gang'];payFiscalOperations(w,'liang');expect(w.relationships!.reserves['xiao-gang']).toBe(next+8);
  s.treasuries.liang.coins=0;const empty=w.relationships!.reserves['xiao-gang'];payFiscalOperations(w,'liang');expect(w.relationships!.reserves['xiao-gang']).toBe(empty);
 });
 it('retainer wages transfer to the recipient only once per settlement',()=>{
  const w=newCampaignWorld('xiao-gang',undefined,'sandbox');actRetinue(w,{type:'retinue',action:'recruit',person:'guest-liang'});const payer=w.people[0].coins,receiver=w.relationships!.reserves['guest-liang'];w.day=30;advanceRetinue(w);expect(w.people[0].coins).toBe(payer-2);expect(w.relationships!.reserves['guest-liang']).toBe(receiver+2);advanceRetinue(w);expect(w.people[0].coins).toBe(payer-2);
 });
 it('invalid spending and a full intermediate grant account do not partially mutate balances',()=>{
  const w=start(),path=fiscalPath(w,'jiankang');w.realm!.fiscal!.balances[path[1]]=1_000_000;const before=structuredClone(w);
  expect(()=>routeGrant(w,'jiankang',20,'test')).toThrow('容量');expect(w).toEqual(before);for(const amount of [-1,NaN,Infinity,.5])expect(()=>spendLocal(w,'jiankang',amount,'test')).toThrow();expect(w).toEqual(before);
 });
 it('refund saturation is recorded and never creates an invalid treasury',()=>{
  const w=start();actService(w,{type:'service',action:'begin'});const officer=serviceCandidates(w,'liang')[0].id;actService(w,{type:'service',action:'open',kind:'relief',site:'jiankang',officer});const t=w.service!.tasks.at(-1)!;actService(w,{type:'service',action:'plan',id:t.id,plan:'balanced'},officer);actService(w,{type:'service',action:'approve',id:t.id});w.realm!.treasuries.liang.coins=1_000_000;w.realm!.treasuries.liang.grain=1_000_000;actService(w,{type:'service',action:'cancel',id:t.id});expect(w.realm!.treasuries.liang.coins).toBe(1_000_000);expect(t.result!.effects.some(e=>e.includes('超过库容'))).toBe(true);validateWorld(w);
 });
 it('expressed acuity changes intrigue with a visible numeric source',()=>{
  const w=start(),p=w.identities!.people[w.characterId!]!;p.genome=founderGenome('audit');p.genome.alleles.acuity=[0,1];const before=abilityBreakdown(w).intrigue.value;p.genome.alleles.acuity=[1,1];expect(abilityBreakdown(w).intrigue.value).toBe(before+2);expect(abilityBreakdown(w).intrigue.parts).toContainEqual({label:'先天敏锐',value:2});
 });
 it.each(['xiao-yan','gao-huan','yuwen-tai'])('keeps numbers and saves valid over a simulated year: %s',id=>{
  const w=newCampaignWorld(id,undefined,'sandbox');for(let i=0;i<360&&w.campaign!.status==='active';i++){if(w.realm!.event)act(w,{type:'realm',action:'event',choice:'decline'});advance(w);validateWorld(w);}expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
});
