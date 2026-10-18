import {describe,it,expect} from 'vitest';
import {newCampaignWorld} from './world';
import {initializeHistoricalStart} from './historicalStart';
import {advanceHistorical,historicalPending} from './historicalEvents';
import {actPact,pactQuote,pactReason,advancePacts} from './allegiancePacts';
import {diplomaticPair} from './diplomacy';
import {ensureWars} from './wars';
import {changeRelationOpinion,relationOpinion} from './relationships';
import {advanceMobility,armyCommander} from './mobility';
import {delegatedArmyDecision} from './militaryAI';
import {personResidence} from './residence';
import {personInfluence} from './personalInfluence';
import {die} from './life';
import {territoryAccount} from './treasury';
import {parseWorld,serializeWorld,validateWorld} from './save';
import {eventCatalog} from './eventCatalog';
import {calendarDate} from './calendar';

function start(player='guest-west'){
 const w=newCampaignWorld(player,undefined,'sandbox');initializeHistoricalStart(w);return w;
}
function letter(player='guest-west',terms:'retain'|'personal'='retain'){
 const w=start(player),army=w.realm!.armies.find(a=>armyCommander(w,a)==='hou-jing')!;
 actPact(w,{type:'pact',action:'request',realm:'liang',army:army.id!,terms},'hou-jing');
 const e=w.historical!.items[0];e.pactId=w.allegiancePacts!.items[0].id;e.host='liang';e.phase='reception';
 return w;
}
function hostility(w:ReturnType<typeof start>,war=false){
 diplomaticPair(w,'east','liang')!.opinion=-100;
 if(war){ensureWars(w);w.realm!.wars!.push({id:w.realm!.nextWarId!++,attacker:'east',defender:'liang',target:'shouchun',goal:'territory',started:w.day,score:0,battles:0,captureLosses:[]});w.realm!.war=w.realm!.wars![0];}
}
describe('recovery of a stalled Hou Jing reception',()=>{
 it.each([false,true])('accepts actual troops despite inherited national hostility, war=%s',war=>{
  const w=letter();hostility(w,war);w.day=1;const coins=w.people[0].coins,p=w.allegiancePacts!.items[0],troops=pactQuote(w,p).troops;
  expect(relationOpinion(w,'hou-jing','xiao-yan')+20).toBeLessThan(-10);expect(pactQuote(w,p).acceptance).toBeGreaterThanOrEqual(-10);
  advanceHistorical(w);expect(w.allegiancePacts!.items[0].status).toBe('active');expect(w.historical!.items[0].phase).toBe('settlement');
  expect(w.characterId).toBe('guest-west');expect(w.people[0].coins).toBe(coins);expect(historicalPending(w)).toEqual([]);
  const news=eventCatalog(w).find(e=>e.id==='hou-jing')!;expect(news.chapter).toBe('降将安置');expect(news.summary).toContain('已归附');expect(news.facts).toEqual([]);
  expect(w.realm!.armies.find(a=>a.id===p.army)!.troops).toBe(troops);expect(w.realm!.cities.yingchuan.owner).toBe('east');
  expect(parseWorld(serializeWorld(w)).historical).toEqual(w.historical);
 });
 it('retains personal grievances, lone-asylum scoring and the player host’s choice',()=>{
  const angry=letter();hostility(angry,true);changeRelationOpinion(angry,'hou-jing','xiao-yan',-80);angry.day=1;advanceHistorical(angry);
  expect(angry.allegiancePacts!.items[0].status).toBe('pending');expect(angry.historical!.items[0].milestones.at(-1)?.text).toContain('认可不足');
  const lone=letter('guest-west','personal');hostility(lone,true);expect(pactQuote(lone,lone.allegiancePacts!.items[0]).acceptance).toBeLessThan(-10);
  const host=letter('xiao-yan');hostility(host,true);const budget=host.realm!.treasuries.liang.coins;host.day=1;advanceHistorical(host);
  expect(host.allegiancePacts!.items[0].status).toBe('pending');expect(host.realm!.treasuries.liang.coins).toBe(budget);expect(historicalPending(host)).toHaveLength(1);
 });
 it('holds a settled NPC and its army until an answer, without changing existing journeys',()=>{
  const w=letter(),a=w.realm!.armies.find(a=>a.id===w.allegiancePacts!.items[0].army)!;a.automation='delegated';
  expect(delegatedArmyDecision(w,a).intent).toBe('归附交涉');
  const lone=letter('guest-west','personal');lone.realm!.armies=[];lone.mobility!.armyCommanders={};delete lone.mobility!.commanders.east;
  lone.mobility!.residences['hou-jing']={site:'chenliu',journey:null};lone.day=1;advanceMobility(lone);
  expect(personResidence(lone,'hou-jing')).toEqual({site:'chenliu',traveling:false});
  lone.allegiancePacts!.items[0].status='rejected';lone.day++;advanceMobility(lone);expect(personResidence(lone,'hou-jing').traveling).toBe(true);
  w.allegiancePacts!.items[0].status='rejected';expect(delegatedArmyDecision(w,a).intent).not.toBe('归附交涉');
 });
 it('closes a synthetic 548-08-01 letter still pending in 549-01 and refunds once',()=>{
  const w=letter('guest-west','personal'),influence=personInfluence(w,'hou-jing'),epoch=calendarDate(0,w.scriptId).getTime();
  const p=w.allegiancePacts!.items[0];p.created=(Date.UTC(548,7,1)-epoch)/86400000;p.due=p.created+30;p.reviewed=p.created;
  w.historical!.items[0].phaseSince=p.created;w.day=(Date.UTC(549,0,1)-epoch)/86400000;validateWorld(w);
  advanceHistorical(w);expect(w.allegiancePacts!.items[0].status).toBe('rejected');expect(w.historical!.items[0].phase).toBe('aftermath');
  expect(personInfluence(w,'hou-jing')).toBe(influence+10);advanceHistorical(w);expect(personInfluence(w,'hou-jing')).toBe(influence+10);
 });
 it('retains a referenced refusal and recovers a legacy save whose refusal was already pruned',()=>{
  const w=letter('guest-west','personal');actPact(w,{type:'pact',action:'answer',id:1,accept:false},'xiao-yan');advanceHistorical(w);w.day=400;
  advancePacts(w);expect(w.allegiancePacts!.items.some(p=>p.id===1)).toBe(true);
  w.allegiancePacts!.items=[];die(w,'gao-huan','illness');advanceHistorical(w);
  expect(w.historical!.items[0].status).toBe('active');expect(w.historical!.items[0].appliedEffects).toContain('reopen:protector-death');
  expect(w.allegiancePacts!.items).toHaveLength(1);expect(w.allegiancePacts!.items[0].status).toBe('pending');
 });
 it.each([1_000_000,999_950,200])('keeps a %s-coin placement treasury valid and never debits central funds twice',balance=>{
  const w=letter('hou-jing');actPact(w,{type:'pact',action:'answer',id:1,accept:true},'xiao-yan');
  const a=w.realm!.armies.find(a=>a.id===w.allegiancePacts!.items[0].army)!;a.location='shouchun';a.journey=null;w.people[0].location='shouchun';advanceHistorical(w);
  const e=w.historical!.items[0];e.phase='dispute';e.status='active';e.security={source:'review:1',raised:0,requester:'gao-huan',status:'withdrawn'};e.handlingDue=0;
  const key=territoryAccount(w,'liang','county:shouchun'),f=w.realm!.fiscal!;f.balances[key]=balance;const coins=w.realm!.treasuries.liang.coins,net=f.net.liang;
  validateWorld(w);advanceHistorical(w);expect(f.balances[key]).toBe(Math.min(1_000_000,balance+100));
  expect(w.realm!.treasuries.liang.coins).toBe(coins);expect(f.net.liang).toBe(net);expect(e.appliedEffects).toContain('placement-fund:1');
  validateWorld(w);const once=serializeWorld(w);advanceHistorical(w);expect(serializeWorld(w)).toBe(once);
 });
 it('never uses a death-reopening exception to create a second live letter',()=>{
  const w=letter(),e=w.historical!.items[0];e.phase='north';e.appliedEffects.push('reopen:protector-death');
  expect(pactReason(w,{type:'pact',action:'request',realm:'west',terms:'personal'},'hou-jing')).toContain('已有归附');
 });
});
