import {describe,it,expect} from 'vitest';
import {newCampaignWorld} from './world';
import {initializeHistoricalStart} from './historicalStart';
import {actPact} from './allegiancePacts';
import {advanceHistorical,actHistorical,historicalReason,historicalPending,historicalDisputes,historicalSecurityCommand,northConflict} from './historicalEvents';
import {validHistorical} from './historicalValidation';
import {parseWorld,serializeWorld} from './save';
import {settleWar} from './realm';
import {bilateralWar} from './wars';
import {governingAuthority} from './government';
import {changeRelationOpinion,relationOpinion} from './relationships';
import {personInfluence} from './personalInfluence';
import {die} from './life';
import {diplomaticPair} from './diplomacy';
import {routeGrant,localBalance} from './treasury';
import type {HistoricalCommand,HistoricalEventInstance} from './historicalEventState';

function start(id='xiao-yan'){const w=newCampaignWorld(id,undefined,'sandbox');initializeHistoricalStart(w);return w;}
function received(id='xiao-yan'){
 const w=start(id),army=w.realm!.armies.find(a=>w.mobility!.armyCommanders?.[a.id!]==='hou-jing')!;
 actPact(w,{type:'pact',action:'request',realm:'liang',army:army.id,terms:'retain'},'hou-jing');
 actPact(w,{type:'pact',action:'answer',id:w.allegiancePacts!.items[0].id,accept:true},'xiao-yan');
 advanceHistorical(w);return w;
}
function peace(w:ReturnType<typeof received>){w.day=31;settleWar(w,bilateralWar(w,'east','liang')!,'white','liang');advanceHistorical(w);}
function choose(w:ReturnType<typeof start>,optionId:HistoricalCommand['optionId'],actor?:string){
 const e=w.historical!.items[0],d=e.decision!;actHistorical(w,{type:'historicalEvent',instanceId:e.id,decisionId:d.id,revision:d.revision,optionId},actor??d.actor);
}
function requested(){const w=received();changeRelationOpinion(w,'hou-jing',governingAuthority(w,'east'),-100);peace(w);advanceHistorical(w);return w;}

describe('Hou Jing security negotiations',()=>{
 it('opens a factual handover dispute after a protracted moderate illness, without killing the protector',()=>{
  const w=start('gao-huan'),e=w.historical!.items[0];w.day=29;w.life!.people['gao-huan'].illness={kind:'wasting',severity:2,since:0};
  expect(northConflict(w,e)).toBe('');w.day=30;expect(northConflict(w,e)).toContain('病势迁延');
  advanceHistorical(w);expect(e.decision?.actor).toBe('gao-huan');expect(w.life!.people['gao-huan'].death).toBeNull();
 });
 it('observes a real refused military replacement even while the protector is healthy',()=>{
  const w=start('hou-jing'),e=w.historical!.items[0],army=w.realm!.armies.find(a=>w.mobility!.armyCommanders?.[a.id!]==='hou-jing')!;
  expect(northConflict(w,e)).toBe('');army.refusal={kind:'replace',day:0,commander:'hou-jing',reason:'拒绝交出原有部曲'};
  expect(northConflict(w,e)).toContain('撤将争议');advanceHistorical(w);expect(w.historical!.items[0].decision?.actor).toBe('hou-jing');expect(w.life!.people['gao-huan'].illness).toBeNull();
 });
 it('treats peace as concern, gives a player origin the actual demand decision, and supports declining',()=>{
  const w=received('gao-huan');peace(w);const e=w.historical!.items[0];
  expect(e.security?.status).toBe('concern');expect(e.decision?.kind).toBe('security-demand');
  expect(historicalDisputes(w,e,w.allegiancePacts!.items[0])).toEqual([]);expect(historicalPending(w)).toHaveLength(1);
  const before=structuredClone(w.historical);advanceHistorical(w);expect(w.historical).toEqual(before);
  choose(w,'wait');advanceHistorical(w);expect(w.historical!.items[0].security?.status).toBe('dismissed');
 });
 it('routes a real demand to the host, charges one guarantee and preserves the exact state on reload',()=>{
  const w=requested(),e=w.historical!.items[0];expect(e.decision?.kind).toBe('security-answer');expect(e.decision?.actor).toBe('xiao-yan');
  const before=structuredClone(w),influence=personInfluence(w,'xiao-yan'),d=e.decision!,command:HistoricalCommand={type:'historicalEvent',instanceId:e.id,decisionId:d.id,revision:d.revision,optionId:'guarantee'};
  expect(historicalReason(w,command,'gao-huan')).not.toBe('');choose(w,'guarantee');
  expect(personInfluence(w,'xiao-yan')).toBe(influence-10);expect(w.realm!.armies).toEqual(before.realm!.armies);expect(w.realm!.treasuries).toEqual(before.realm!.treasuries);
  expect(()=>actHistorical(w,command,'xiao-yan')).toThrow();advanceHistorical(w);
  expect(w.historical!.items[0].security?.status).toBe('protected');expect(parseWorld(serializeWorld(w)).historical).toEqual(w.historical);
 });
 it('records withholding once, allows the origin to withdraw, and does not give free troops or custody',()=>{
  const w=requested(),before=structuredClone(w),host=governingAuthority(w,'liang'),opinion=relationOpinion(w,'hou-jing',host);
  choose(w,'withhold');advanceHistorical(w);const e=w.historical!.items[0];
  expect(e.security?.status).toBe('withdrawn');expect(relationOpinion(w,'hou-jing',host)).toBe(opinion-50);
  expect(historicalDisputes(w,e,w.allegiancePacts!.items[0])).toContain('接纳方拒绝安全担保');
  expect(w.realm!.armies).toEqual(before.realm!.armies);expect(w.custody).toEqual(before.custody);
  const command=historicalSecurityCommand(e,'withdrawDemand');expect(historicalReason(w,command,'xiao-yan')).not.toBe('');
  actHistorical(w,command,governingAuthority(w,'east'));advanceHistorical(w);expect(historicalDisputes(w,w.historical!.items[0],w.allegiancePacts!.items[0])).toEqual([]);
  expect(()=>actHistorical(w,command,governingAuthority(w,'east'))).toThrow();
 });
 it('can restore protection after withholding and refuses the same stale command twice',()=>{
  const w=requested();choose(w,'withhold');advanceHistorical(w);const e=w.historical!.items[0],command=historicalSecurityCommand(e,'protect');
  actHistorical(w,command,'xiao-yan');expect(w.historical!.items[0].security?.status).toBe('protected');expect(()=>actHistorical(w,command,'xiao-yan')).toThrow();
 });
 it('keeps reform bilateral until accepted and never treats a rejected proposal as protection',()=>{
  const w=requested();choose(w,'reform');advanceHistorical(w);let e=w.historical!.items[0],p=w.allegiancePacts!.items[0];
  expect(e.security?.status).toBe('negotiating');expect(p.terms).toBe('retain');expect(p.offer).toBeDefined();
  actPact(w,{type:'pact',action:'respondOffer',id:p.id,revision:p.offer!.revision,accept:false},'hou-jing');advanceHistorical(w);
  e=w.historical!.items[0];expect(e.security?.status).toBe('demanded');expect(e.decision?.actor).toBe('xiao-yan');
  choose(w,'reform');p=w.allegiancePacts!.items[0];actPact(w,{type:'pact',action:'respondOffer',id:p.id,revision:p.offer!.revision,accept:true},'hou-jing');advanceHistorical(w);
  expect(w.historical!.items[0].security?.status).toBe('protected');expect(w.allegiancePacts!.items[0].terms).toBe('reform');
 });
 it('reassigns a pending answer to the actual successor when Xiao Yan dies',()=>{
  const w=requested();die(w,'xiao-yan','illness');advanceHistorical(w);
  expect(w.historical!.items[0].decision?.actor).toBe(governingAuthority(w,'liang'));expect(governingAuthority(w,'liang')).not.toBe('xiao-yan');expect(validHistorical(w)).toBe(true);
 });
 it('requires an actual base before a security crisis can become a funded civil war',()=>{
  const w=received('hou-jing');changeRelationOpinion(w,'hou-jing',governingAuthority(w,'east'),-100);peace(w);advanceHistorical(w);advanceHistorical(w);
  w.day=w.historical!.items[0].handlingDue!;advanceHistorical(w);let e=w.historical!.items[0],d=e.decision!;
  expect(d.kind).toBe('crisis');const rise=():HistoricalCommand=>({type:'historicalEvent',instanceId:e.id,decisionId:d.id,revision:d.revision,optionId:'rise'});
  expect(historicalReason(w,rise(),'hou-jing')).toContain('实控县域');
  // A completed journey and lawful local backing are fixture facts, never event rewards.
  const army=w.realm!.armies.find(a=>a.id===w.allegiancePacts!.items[0].army)!;army.location='shouchun';army.journey=null;
  w.people[0].location='shouchun';w.mobility!.residences['hou-jing']={site:'shouchun',journey:null};w.realm!.cities.shouchun.governor='hou-jing';routeGrant(w,'shouchun',200,'测试：合法基地拨款');
  const money=w.people[0].coins,local=localBalance(w,'shouchun'),troops=w.realm!.armies.reduce((n,a)=>n+a.troops,0);
  expect(historicalReason(w,rise(),'hou-jing')).toBe('');actHistorical(w,rise(),'hou-jing');advanceHistorical(w);e=w.historical!.items[0];
  expect(e.phase).toBe('rebellion');expect(w.people[0].coins).toBe(money-100);expect(localBalance(w,'shouchun')).toBe(local+100);expect(w.realm!.armies.reduce((n,a)=>n+a.troops,0)).toBe(troops);
  expect(personInfluence(w,'hou-jing')).toBe(0);expect(w.realm!.cities.jiankang.controller).toBe('liang');
 });
 it('does not backfill an old peace or resurrect an ended instance from a legacy save',()=>{
  const w=received();peace(w);const e=w.historical!.items[0];delete e.security;delete e.securitySince;delete e.securitySignals;delete e.decision;e.status='resolved';e.phase='aftermath';
  const restored=parseWorld(serializeWorld(w));advanceHistorical(restored);advanceHistorical(restored);expect(restored.historical!.items[0].security).toBeUndefined();expect(restored.historical!.items[0].status).toBe('resolved');
 });
 it('does not reopen a known truce when a newer treaty is removed',()=>{
  const w=received('gao-huan');peace(w);choose(w,'wait');advanceHistorical(w);
  const pair=diplomaticPair(w,'east','liang')!;pair.treaties.push({kind:'pact',from:'east',to:'liang',actor:null,since:w.day,until:w.day+30});
  advanceHistorical(w);expect(w.historical!.items[0].security?.source).toContain('treaty:');choose(w,'wait');advanceHistorical(w);
  pair.treaties=[];diplomaticPair(w,'east','liang')!.treaties=[];advanceHistorical(w);
  expect(w.historical!.items[0].security?.status).toBe('dismissed');expect(w.historical!.items[0].security?.source).toContain('treaty:');
 });
 it('rejects corrupted security dates, actors and statuses',()=>{
  const w=requested();for(const corrupt of [(e:HistoricalEventInstance)=>e.security!.raised=w.day+1,(e:HistoricalEventInstance)=>e.security!.requester='missing',(e:HistoricalEventInstance)=>e.securitySince=w.day+1,(e:HistoricalEventInstance)=>e.security!.status='invalid' as 'concern',(e:HistoricalEventInstance)=>e.securitySignals=['duplicate','duplicate']]){
   const next=structuredClone(w);corrupt(next.historical!.items[0]);expect(validHistorical(next)).toBe(false);
  }
 });
});
