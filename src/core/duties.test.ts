import {opinionBreakdown} from './relationships';
import {describe,it,expect} from 'vitest';
import {newCampaignWorld,act,advance} from './world';
import {advanceDuties,dutyPause,dutyReason,type DutyPhase} from './duties';
import {parseWorld,serializeWorld,validateWorld} from './save';
import {governmentOf} from './government';
import {lifeOf} from './lifeState';
import {die} from './life';
const start=(id='dugu-xin')=>{const w=newCampaignWorld(id,undefined,'sandbox');act(w,{type:'duty',action:'open'});return w;};
const until=(w:ReturnType<typeof start>,phase:DutyPhase)=>{for(let i=0;i<125&&w.duties!.task!.phase!==phase;i++){if(w.realm!.event)act(w,{type:'realm',action:'event',choice:'decline'});advance(w);}expect(w.duties!.task!.phase).toBe(phase);};
describe('local duty lifecycle',()=>{
 it('officer proposes, receives NPC approval, completes and saves exactly once',()=>{
  const w=start(),money=w.people[0].coins,merit=governmentOf(w,'west')!.merit['dugu-xin'];
  act(w,{type:'duty',action:'propose',plan:'purchase'});until(w,'ready');
  expect(w.realm!.treasuries.west.coins).toBe(540);expect(w.people[0].coins).toBe(money);
  act(w,{type:'duty',action:'start'});until(w,'closed');expect(w.duties!.task!.result?.success).toBe(true);
  expect(governmentOf(w,'west')!.merit['dugu-xin']).toBe(merit+20);
  const loaded=parseWorld(serializeWorld(w));expect(loaded).toEqual(w);
  expect(()=>act(w,{type:'duty',action:'close'})).toThrow();advance(w,2);expect(governmentOf(w,'west')!.merit['dugu-xin']).toBe(merit+20);
 });
 it('chief receives proposals and aid requests and judges the completed convoy',()=>{
  const w=start('yuwen-tai'),before=opinionBreakdown(w,'dugu-xin','yuwen-tai').parts[1].value,reverse=opinionBreakdown(w,'yuwen-tai','dugu-xin').parts[1].value;until(w,'approval');act(w,{type:'duty',action:'approve'});until(w,'aid');
  act(w,{type:'duty',action:'grant'});until(w,'report');const stored=w.realm!.cities.tianshui.grain;act(w,{type:'duty',action:'close'});expect(w.realm!.cities.tianshui.grain).toBe(stored+120);
  expect(opinionBreakdown(w,'dugu-xin','yuwen-tai').parts[1].value-before).toBe(12);expect(opinionBreakdown(w,'yuwen-tai','dugu-xin').parts[1].value-reverse).toBe(12);expect(w.duties!.task!.funds).toEqual({coins:60,grain:120});expect(w.duties!.task!.result?.success).toBe(true);validateWorld(w);
 });
 it('officer can request escort and persists across a pending request',()=>{
  let w=start();act(w,{type:'duty',action:'propose',plan:'convoy'});until(w,'ready');act(w,{type:'duty',action:'start'});until(w,'incident');
  expect(()=>act(w,{type:'duty',action:'escort'})).toThrow();act(w,{type:'duty',action:'request-aid'});
  w=parseWorld(serializeWorld(w));until(w,'incident');act(w,{type:'duty',action:'escort'});until(w,'closed');expect(w.duties!.task!.result?.success).toBe(true);
 });
 it('denied aid leads NPC to detour without spending extra funds',()=>{
  const w=start('yuwen-tai');until(w,'approval');act(w,{type:'duty',action:'approve'});until(w,'aid');const original=w.duties!.task!.required;
  act(w,{type:'duty',action:'deny'});until(w,'report');expect(w.duties!.task!.required).toBe(original+5);expect(w.duties!.task!.funds.coins).toBe(40);
 });
 it('rejects unauthorized actions and insufficient budgets without mutation',()=>{
  const w=start();act(w,{type:'duty',action:'propose',plan:'purchase'});const before=structuredClone(w);expect(()=>act(w,{type:'duty',action:'approve'})).toThrow();expect(w).toEqual(before);
  w.realm!.treasuries.west.coins=0;advance(w,3);expect(w.duties!.task!.phase).toBe('approval');
  const other=newCampaignWorld('gao-huan',undefined,'sandbox');expect(()=>act(other,{type:'duty',action:'open'})).toThrow();
 });
 it('refunds untouched appropriations and never refunds consumed supplies',()=>{
  const w=start('yuwen-tai');until(w,'approval');act(w,{type:'duty',action:'approve'});act(w,{type:'duty',action:'cancel'});expect(w.realm!.treasuries.west.coins).toBe(600);expect(w.realm!.treasuries.west.grain).toBe(1000);validateWorld(w);
  const v=start('yuwen-tai');until(v,'approval');act(v,{type:'duty',action:'approve'});until(v,'working');const funds=v.realm!.treasuries.west.coins;act(v,{type:'duty',action:'cancel'});expect(v.realm!.treasuries.west.coins).toBe(funds);
 });
 it('pauses for blocked roads and severe illness and advances at most once per day',()=>{
  const w=start();act(w,{type:'duty',action:'propose',plan:'convoy'});until(w,'ready');act(w,{type:'duty',action:'start'});advance(w);
  const t=w.duties!.task!,progress=t.progress;advanceDuties(w);expect(t.progress).toBe(progress);
  w.realm!.cities.changan.controller='east';advance(w,2);expect(t.progress).toBe(progress);expect(dutyPause(w)).toContain('道路');
  w.realm!.cities.changan.controller='west';lifeOf(w,'dugu-xin')!.illness={kind:'fever',since:w.day,severity:3};w.day++;advanceDuties(w);expect(t.progress).toBe(progress);expect(dutyPause(w)).toContain('重病');
 });
 it('reassigns deceased officers, respects changed authority and fails on deadline',()=>{
  const w=start('yuwen-tai');die(w,'dugu-xin','illness');expect(dutyPause(w)).toContain('去世');act(w,{type:'duty',action:'replace',candidate:'yuan-qin'});expect(w.duties!.task!.officer).toBe('yuan-qin');
  governmentOf(w,'west')!.executives=['yuan-baoju'];expect(dutyReason(w,{type:'duty',action:'cancel'})).toContain('执政');
  w.day=w.duties!.task!.deadline;advanceDuties(w);expect(w.duties!.task!.result?.success).toBe(false);
 });
 it('migrates old saves without creating cases and rejects corrupted task states',()=>{
  const w=newCampaignWorld('dugu-xin',undefined,'sandbox');delete w.duties;w.day=10;const loaded=parseWorld(serializeWorld(w));expect(loaded.duties).toEqual({version:1,since:10,lastDay:10,task:null});
  for(const change of [(t:ReturnType<typeof start>)=>{t.duties!.task!.funds.coins=-1;},(t:ReturnType<typeof start>)=>{t.duties!.task!.phase='report';},(t:ReturnType<typeof start>)=>{t.duties!.task!.officer='gao-huan';},(t:ReturnType<typeof start>)=>{t.duties!.task!.deadline++;}]){const bad=start();change(bad);expect(()=>serializeWorld(bad)).toThrow('存档');}
 });
 it('travel suspends work and resuming from a save produces the same result',()=>{
  const w=start();act(w,{type:'duty',action:'propose',plan:'purchase'});until(w,'ready');act(w,{type:'duty',action:'start'});
  act(w,{type:'travel',destination:'changan'});const progress=w.duties!.task!.progress;advance(w);expect(w.duties!.task!.progress).toBe(progress);expect(dutyPause(w)).toContain('出行');
  const copy=parseWorld(serializeWorld(w));until(w,'closed');until(copy,'closed');expect(copy).toEqual(w);
 });
 it('draft revision does not withdraw any treasury funds',()=>{const w=start('yuwen-tai');until(w,'approval');act(w,{type:'duty',action:'revise'});expect(w.duties!.task!.plan).toBeNull();expect(w.realm!.treasuries.west.coins).toBe(600);validateWorld(w);});
});
