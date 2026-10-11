import {describe,it,expect} from 'vitest';
import {newGovernedCampaignWorld} from './governedTestWorld';
import {act} from './world';
import {serializeWorld,parseWorld} from './save';
import {ensureArmyOrganization} from './armyOrganization';
import {delegatedArmyDecision,advanceMilitaryAI} from './militaryAI';
import {ensureWars} from './wars';
import {activityQuote,activityResultPreview,mobilityReason,advanceMobility} from './mobility';
import {governmentOf} from './government';
import {appointmentEvaluation,appointmentExplanation} from './appointmentRules';
import {personalHistoryView} from './personalHistoryView';
import {incurObligation,advanceObligations} from './obligations';
import {courtMonthPreview,courtOf,advanceCourts,courtCauseResponse} from './court';
import {nextMonthStart} from './calendar';
import {resignablePosts} from './resignation';
import {authorityGrant} from './authority';
import {armyDailyFood,type Army} from './realm';
import {applyPowerArrangement} from './powerPolitics';
const start=(id='xiao-yan')=>newGovernedCampaignWorld(id,undefined,'sandbox');
function armyWorld(){
 const w=start(),a:Army={realm:'liang',location:'jiankang',troops:600,morale:80,supply:600,journey:null,siege:0,automation:'delegated'};
 w.realm!.armies.push(a);ensureArmyOrganization(w);w.realm!.war={attacker:'liang',defender:'east',target:'luoyang',started:0,score:0};ensureWars(w);
 return {w,a};
}
describe('action explanations and continuing character boundaries',()=>{
 it('previews the same autonomous route without mutating any state',()=>{
  const {w,a}=armyWorld(),before=structuredClone(w),q=delegatedArmyDecision(w,a);
  expect(w).toEqual(before);expect(q.route).toBeDefined();advanceMilitaryAI(w);
  expect(a.journey?.route).toEqual(q.route!.route);expect(a.journey?.durations).toEqual(q.route!.durations);
  expect(delegatedArmyDecision(w,a).current).toBe('行军中');expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('explains real supply waiting and resumes only after the same threshold is met',()=>{
  const {w,a}=armyWorld();a.supply=Math.ceil(armyDailyFood(w,a)*3);w.realm!.cities.jiankang.grain=100000;
  const q=delegatedArmyDecision(w,a);expect(q.current).toBe('等待补粮');expect(q.route).toBeUndefined();
  advanceMilitaryAI(w);expect(a.journey).toBeNull();a.supply=600;
  expect(delegatedArmyDecision(w,a).route).toBeDefined();advanceMilitaryAI(w);expect(a.journey).not.toBeNull();
 });
 it('direct control takes effect without inventing a new route or consuming resources',()=>{
  const {w,a}=armyWorld();act(w,{type:'militaryCareer',action:'automation',army:a.id!,control:'direct'});
  const q=delegatedArmyDecision(w,a),supply=a.supply;expect(q.current).toBe('驻留待命');expect(q.route).toBeUndefined();
  advanceMilitaryAI(w);expect(a.journey).toBeNull();expect(a.supply).toBe(supply);
 });
 it('delegated travel quotes distinguish payer, actual executor and personal food',()=>{
  const w=start('yuwen-tai');w.realm!.cities.changan.order=30;
  const cmd={type:'mobility',action:'plan',kind:'tour',site:'changan',delegate:'yuan-qin'} as const;
  const before=structuredClone(w),q=activityQuote(w,cmd);expect(q.reason).toBe('');expect(q).toMatchObject({actor:'yuwen-tai',executor:'yuan-qin',payer:'yuwen-tai',food:0});expect(w).toEqual(before);
  const coins=w.people[0].coins,merit=governmentOf(w,'west')!.merit['yuwen-tai'];act(w,cmd);
  expect(w.people[0].coins).toBe(coins-q.cost);expect(governmentOf(w,'west')!.merit['yuwen-tai']).toBe(merit);
  const restored=parseWorld(serializeWorld(w));expect(restored.mobility!.activities[0]).toMatchObject({actor:q.actor,delegate:q.executor});
 });
 it('revoked public authority blocks a ready decision and ends it once without a reward',()=>{
  const w=start('yuwen-tai');w.realm!.cities.changan.order=30;
  act(w,{type:'mobility',action:'plan',kind:'tour',site:'changan',delegate:'yuan-qin'});
  const a=w.mobility!.activities[0];a.phase='decision';a.started=w.day;a.due=w.day;
  applyPowerArrangement(w,'west',{goal:'executive',sponsor:'yuan-baoju',beneficiary:'yuan-baoju',executive:'yuan-baoju',name:''});
  const before=structuredClone(w);expect(mobilityReason(w,{type:'mobility',action:'resolve',id:a.id,choice:'measured'})).toContain('授权失效');
  expect(activityResultPreview(w,a.id,'measured')).toContain('授权失效');expect(()=>act(w,{type:'mobility',action:'resolve',id:a.id,choice:'measured'})).toThrow('授权失效');expect(w).toEqual(before);
  w.day++;advanceMobility(w);expect(a.phase).toBe('cancelled');expect(a.result).toContain('不退');expect(w.realm!.cities.changan.order).toBe(30);
  const records=w.chronicle.length;advanceMobility(w);expect(w.chronicle).toHaveLength(records);expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('does not accept a legacy mandate as permission to train an unrelated army',()=>{
  const w=start('xiao-gang');w.realm!.mandate=true;w.realm!.armies.push({realm:'liang',location:'jiankang',troops:400,morale:40,supply:80,journey:null,siege:0});ensureArmyOrganization(w);
  const cmd={type:'mobility',action:'plan',kind:'training',site:'jiankang'} as const,before=structuredClone(w);
  expect(activityQuote(w,cmd).reason).toContain('本军指挥权');expect(()=>act(w,cmd)).toThrow('本军指挥权');expect(w).toEqual(before);
 });
 it('training rewards only the stationed army the actor may command',()=>{
  const w=start('xiao-gang'),base={realm:'liang',location:'jiankang',troops:400,morale:40,supply:80,journey:null,siege:0} as const;
  const foreignCommand:Army={...base,owner:'xiao-yan'},own:Army={...base,owner:'xiao-gang'};w.realm!.armies.push(foreignCommand,own);ensureArmyOrganization(w);
  const cmd={type:'mobility',action:'plan',kind:'training',site:'jiankang'} as const;
  expect(activityQuote(w,cmd).reason).toBe('');act(w,cmd);const a=w.mobility!.activities[0];a.phase='decision';a.started=w.day;a.due=w.day;
  act(w,{type:'mobility',action:'resolve',id:a.id,choice:'measured'});expect(foreignCommand.morale).toBe(40);expect(own.morale).toBe(48);expect(a.result).toContain('士气 +8');
 });
 it('recommendation evidence expires together with its real appointment contribution',()=>{
  const w=start('xiao-gang');w.retinue!.recommendations['xiao-gang']={until:90,bonus:8};
  const q=appointmentEvaluation(w,'liang','xiao-gang',{ministry:'finance'},'xiao-yan');
  expect(q.score).toBe(q.factors.reduce((n,f)=>n+f.value,0));expect(q.factors.find(f=>f.label==='幕僚修书荐举')?.value).toBe(8);
  expect(personalHistoryView(w,'xiao-gang').recommendation).toEqual({until:90,bonus:8});expect(appointmentExplanation(q)).toContain('不能替代');
  w.day=90;expect(personalHistoryView(w,'xiao-gang').recommendation).toBeNull();expect(appointmentEvaluation(w,'liang','xiao-gang',{ministry:'finance'},'xiao-yan').score).toBe(q.score-8);
 });
 it('leaving office preserves family assets and real debt but removes old public command',()=>{
  const w=start('dugu-xin'),coins=w.people[0].coins,estate=structuredClone(w.holdings.estate),relations=structuredClone(w.relationships!.bonds);
  incurObligation(w,'ck3-wages','person:dugu-xin','person:yuwen-tai',40,'离任前未付俸钱');
  for(const post of resignablePosts(w))act(w,{type:'resign',office:post.id});
  expect(w.people[0].coins).toBe(coins);expect(w.holdings.estate).toEqual(estate);expect(w.relationships!.bonds).toEqual(relations);
  const army:Army={realm:'west',location:'changan',troops:400,morale:70,supply:80,journey:null,siege:0};
  expect(authorityGrant(w,'dugu-xin','command',{realm:'west',site:'changan',army}).allowed).toBe(false);
  let restored=parseWorld(serializeWorld(w));expect(personalHistoryView(restored,'dugu-xin').records[0].detail).toContain('本人应付 40');
  restored.day=nextMonthStart(restored.day,restored.scriptId);advanceObligations(restored);const paid=restored.people[0].coins;advanceObligations(restored);
  expect(restored.people[0].coins).toBe(paid);expect(personalHistoryView(restored,'dugu-xin').records[0].detail).toContain('已结清');restored=parseWorld(serializeWorld(restored));expect(restored.obligations!.items[0].remaining).toBe(0);
 });
 it('court preview and one monthly settlement share causes and transition',()=>{
  const w=start(),before=structuredClone(w),q=courtMonthPreview(w,'liang');expect(w).toEqual(before);
  w.day=nextMonthStart(w.day,w.scriptId);advanceCourts(w);
  expect(courtOf(w,'liang')!.settlement!.causes).toEqual(q.causes);expect(courtOf(w,'liang')!.phase).toBe(q.phase);
  expect(courtCauseResponse('军队实际欠饷')).toBe('finance');expect(courtCauseResponse('地方失序与民食缺口')).toBe('local');expect(courtCauseResponse('实际战线与续战负担')).toBe('wars');
 });
});
