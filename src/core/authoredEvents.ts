import {authoredEventDefinitions} from '../data/authoredEvents';
import {eventCapabilities,type Condition,type EventDefinition,type EventOption} from './eventDefinitions';
import {isAlive,ageAt} from './lifeState';
import {getPerson} from './personRegistry';
import {allegianceRealm} from './officeEligibility';
import {canCommission} from './serviceMandates';
import {presentAt} from './residence';
import {resting} from './householdLife';
import {detained} from './custodyState';
import {actFiscal,localBalance,type FiscalCommand} from './treasury';
import type {World} from './types';
import type {PauseEvent} from './pauseEvents';
export type EventStatus='active'|'resolved'|'cancelled'|'expired'|'invalid';
export interface EventEffect {action:string;coins:number;order:number;requests:number[]}
export interface EventReceipt {revision:number;stage:string;option:string;day:number;effects:EventEffect[]}
export interface EventInstance {id:string;definitionId:string;actor:string;site:string;stage:string;revision:number;status:EventStatus;created:number;entered:number;ended:number|null;lastNpcDay:number;receipts:EventReceipt[];reason:string}
export interface AuthoredEvents {version:1;seed:number;lastChecks:Record<string,number>;runs:Record<string,number>;lastEnded:Record<string,number>;instances:EventInstance[]}
export type AuthoredEventCommand={type:'authoredEvent';instanceId:string;revision:number;optionId:string};
const definition=(id:string)=>authoredEventDefinitions.find(d=>d.id===id);
const authority=(w:World,actor:string,site:string)=>{const r=allegianceRealm(w,actor);return !!r&&!!w.realm?.cities[site]&&canCommission(w,actor,r,site,'relief');};
export function eventActor(w:World,d:EventDefinition){return d.actor.kind==='player'?w.characterId??'':d.actor.kind==='person'?d.actor.personId??'':w.realm?.cities[d.site]?.governor??'';}
export function eventConditions(w:World,conditions:Condition[],actor:string,site:string,path:string){return conditions.map((c,i)=>{
 let actual:number|boolean=false,passed=false;
 switch(c.kind){case 'alive':actual=!!getPerson(w,actor)&&isAlive(w,actor);passed=actual;break;case 'authority':actual=authority(w,actor,site);passed=actual;break;case 'present':actual=!!actor&&presentAt(w,actor,site);passed=actual;break;case 'dayAtLeast':actual=w.day;passed=actual>=c.value!;break;case 'orderBelow':actual=w.realm?.cities[site]?.order??-1;passed=actual>=0&&actual<c.value!;break;case 'localCoinsAtLeast':actual=w.realm?.cities[site]?localBalance(w,site):0;passed=!!w.realm?.cities[site]&&actual>=c.value!;break;case 'noPendingGrant':actual=!(w.realm?.fiscal?.requests.some(q=>q.site===site&&q.status==='pending'));passed=actual;break;}
 return {fieldPath:path+'.'+i,name:eventCapabilities.conditions[c.kind].name,passed,actual,required:c.value??true};
 });}
function actorReason(w:World,d:EventDefinition,actor:string,site:string){if(!w.realm?.cities[site])return '目标地点已失效';if(!actor||!getPerson(w,actor)||!isAlive(w,actor))return '执行者已故或不存在';if(w.campaign?.status!=='active')return '本局已结束';if(d.requiresAuthority&&!authority(w,actor,site))return '任职、统属或地方控制权已变化';return '';}
function actionReason(w:World,actor:string){return (ageAt(w,actor)??0)<16?'执行者尚未成年':resting(w,actor)?'执行者正在休养或守丧':detained(w,actor)?'执行者被拘禁':'';}
/** The quote runs the same real actions on a disposable world. All effects of a
 * composite option are committed together, including its receipt and next stage. */
class EventActionError extends Error {constructor(message:string,public fieldPath:string){super(message);}}
function optionPath(d:EventDefinition,i:EventInstance,o:EventOption){const index=d.stages.findIndex(s=>s.id===i.stage);return `events.${d.id}.stages.${index}.options.${d.stages[index].options.findIndex(v=>v.id===o.id)}`;}
function simulate(w:World,instance:EventInstance,option:EventOption){
 const d=definition(instance.definitionId)!;const reason=actorReason(w,d,instance.actor,instance.site)||actionReason(w,instance.actor);if(reason)throw new Error(reason);
 const failed=eventConditions(w,option.conditions,instance.actor,instance.site,optionPath(d,instance,option)+'.conditions').find(c=>!c.passed);if(failed)throw new EventActionError(failed.name+'未满足',failed.fieldPath);
 const next=structuredClone(w),effects:EventEffect[]=[];
 for(const [index,action] of option.actions.entries()){const coins=localBalance(next,instance.site),order=next.realm!.cities[instance.site].order,request=next.realm!.fiscal?.nextRequest??1;
  const command:FiscalCommand=action.kind==='fiscalRelief'?{type:'fiscal',action:'relief',site:instance.site}:{type:'fiscal',action:'request',site:instance.site,amount:action.amount,purpose:'relief'};
  try{actFiscal(next,command,instance.actor);}catch(error){throw new EventActionError(error instanceof Error?error.message:'行动失败',optionPath(d,instance,option)+'.actions.'+index);}effects.push({action:action.kind,coins:localBalance(next,instance.site)-coins,order:next.realm!.cities[instance.site].order-order,requests:next.realm!.fiscal!.requests.filter(q=>q.id>=request).map(q=>q.id)});
 }
 return {next,effects};
}
function quote(w:World,i:EventInstance,o:EventOption){try{return {reason:'',fieldPath:optionPath(definition(i.definitionId)!,i,o),effects:simulate(w,i,o).effects};}catch(e){return {reason:e instanceof Error?e.message:'行动不可执行',fieldPath:e instanceof EventActionError?e.fieldPath:optionPath(definition(i.definitionId)!,i,o),effects:[] as EventEffect[]};}}
export function eventProjection(w:World,id:string){const i=w.authoredEvents?.instances.find(i=>i.id===id);if(!i)return null;const d=definition(i.definitionId),s=d?.stages.find(s=>s.id===i.stage);if(!d||!s)return null;
 const wait=Math.max(0,i.entered+s.delayDays-w.day),reason=actorReason(w,d,i.actor,i.site);
 return {id:i.id,definitionId:d.id,name:d.name,title:s.title,body:s.body,actor:i.actor,canDecide:i.actor===w.characterId,actorName:getPerson(w,i.actor)?.name??i.actor,site:i.site,stage:i.stage,revision:i.revision,status:i.status,reason:i.reason||reason,wait,remaining:Math.max(0,i.entered+s.timeoutDays-w.day),receipts:structuredClone(i.receipts),conditions:eventConditions(w,d.conditions,i.actor,i.site,'events.'+d.id+'.conditions'),options:s.options.map(o=>{const q=i.status==='active'?quote(w,i,o):{reason:'事件已结束',fieldPath:optionPath(d,i,o),effects:[] as EventEffect[]};return {...o,...q,reason:i.status!=='active'?'事件已结束':wait?'尚未到阶段开放日':reason||q.reason,conditions:eventConditions(w,o.conditions,i.actor,i.site,optionPath(d,i,o)+'.conditions')};})};}
export type EventProjection=NonNullable<ReturnType<typeof eventProjection>>;
export function eventDiagnostics(w:World,id:string){const d=definition(id);if(!d)return null;const actor=eventActor(w,d),state=w.authoredEvents;return {definitionId:id,enabled:d.enabled,actor,reason:actorReason(w,d,actor,d.site),scenario:d.scenarioIds.includes(w.scriptId??''),conditions:eventConditions(w,d.conditions,actor,d.site,'events.'+id+'.conditions'),runs:state?.runs[id]??0,maxRuns:d.maxRuns,lastCheck:state?.lastChecks[id]??null,nextDay:(state?.lastEnded[id]??-d.cooldownDays)+d.cooldownDays,probability:d.probability,instances:(state?.instances??[]).filter(i=>i.definitionId===id).map(i=>eventProjection(w,i.id))};}
function finish(w:World,i:EventInstance,status:EventStatus,reason:string){i.status=status;i.reason=reason;i.ended=w.day;w.authoredEvents!.lastEnded[i.definitionId]=w.day;}
function choose(w:World,c:AuthoredEventCommand,actor:string){
 const i=w.authoredEvents?.instances.find(i=>i.id===c.instanceId);if(!i||i.actor!==actor)throw new Error('事件不属于当前执行者');
 if(i.receipts.some(r=>r.revision===c.revision&&r.option===c.optionId))return;
 if(i.status!=='active'||i.revision!==c.revision)throw new Error('事件版本已变化，请重新查看');
 const d=definition(i.definitionId)!,s=d.stages.find(s=>s.id===i.stage)!;
 if(w.day<i.entered+s.delayDays||w.day>=i.entered+s.timeoutDays)throw new Error('事件尚未开放或已经超时');
 const option=s.options.find(o=>o.id===c.optionId);if(!option)throw new Error('选项不存在');
 const {next,effects}=simulate(w,i,option),ni=next.authoredEvents!.instances.find(x=>x.id===i.id)!;
 ni.receipts.push({revision:i.revision,stage:i.stage,option:option.id,day:w.day,effects});ni.revision++;
 if(option.cancel)finish(next,ni,'cancelled','执行者选择结束事件');else if(option.next){ni.stage=option.next;ni.entered=w.day;}else finish(next,ni,'resolved','事件已完成');
 Object.assign(w,next);
}
export function actAuthoredEvent(w:World,c:AuthoredEventCommand){choose(w,c,w.characterId??'');}
function random(state:AuthoredEvents){state.seed=(Math.imul(state.seed,1664525)+1013904223)>>>0;return state.seed/0x100000000;}
export function advanceAuthoredEvents(w:World){
 const defs=authoredEventDefinitions.filter(d=>d.enabled&&d.scenarioIds.includes(w.scriptId??''));if(!defs.length&&!w.authoredEvents)return;
 w.authoredEvents??={version:1,seed:((w.life?.seed??1)^0x5e71a9)>>>0,lastChecks:{},runs:{},lastEnded:{},instances:[]};
 for(const d of defs){const state=w.authoredEvents;if(state.lastChecks[d.id]===w.day)continue;state.lastChecks[d.id]=w.day;
  if((state.runs[d.id]??0)>=d.maxRuns||state.instances.some(i=>i.definitionId===d.id&&i.status==='active')||w.day-(state.lastEnded[d.id]??-d.cooldownDays)<d.cooldownDays)continue;
  const actor=eventActor(w,d);if(actorReason(w,d,actor,d.site)||eventConditions(w,d.conditions,actor,d.site,'').some(c=>!c.passed))continue;if(random(state)*100>=d.probability)continue;
  const run=(state.runs[d.id]??0)+1;state.runs[d.id]=run;state.instances.push({id:'event:'+d.id+':'+run,definitionId:d.id,actor,site:d.site,stage:d.startStage,revision:0,status:'active',created:w.day,entered:w.day,ended:null,lastNpcDay:-1,receipts:[],reason:''});
 }
 // Choices atomically replace the world, so never hold state references across them.
 for(const id of w.authoredEvents.instances.filter(i=>i.status==='active').map(i=>i.id)){
  const i=w.authoredEvents.instances.find(i=>i.id===id)!,d=definition(i.definitionId),s=d?.stages.find(s=>s.id===i.stage);
  const invalid=!d||!s?'事件定义已失效':actorReason(w,d,i.actor,i.site);if(invalid){finish(w,i,'invalid',invalid);continue;}
  if(w.day>=i.entered+s!.timeoutDays){finish(w,i,'expired','阶段超过办理期限；已执行效果保留，未执行行动不扣款');continue;}
  if(w.day<i.entered+s!.delayDays)continue;
  const legal=s!.options.filter(o=>!quote(w,i,o).reason);if(!legal.length){finish(w,i,'invalid','没有合法选项，事件终止；未执行行动不扣款');continue;}
  if(i.actor===w.characterId||i.lastNpcDay===w.day)continue;i.lastNpcDay=w.day;
  const total=legal.reduce((n,o)=>n+o.npcWeight,0);if(!total)continue;let roll=random(w.authoredEvents)*total;const selected=legal.find(o=>(roll-=o.npcWeight)<0)!;
  choose(w,{type:'authoredEvent',instanceId:i.id,revision:i.revision,optionId:selected.id},i.actor);
 }
}
export function authoredPending(w:World):PauseEvent[]{return (w.authoredEvents?.instances??[]).filter(i=>i.actor===w.characterId&&i.status==='active').flatMap(i=>{const p=eventProjection(w,i.id);return p&&!p.wait?[{id:i.id+':'+i.revision,kind:'authored' as const,authoredId:i.id,title:p.title,body:p.body,person:i.actor,site:i.site}]:[];});}
