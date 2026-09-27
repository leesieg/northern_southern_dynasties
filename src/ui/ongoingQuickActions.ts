import {serviceReason,assignmentBudget,type ServiceCommand} from '../core/assignments';
import {courtOf,courtReason,type CourtCommand} from '../core/court';
import {chiefOfDuty,dutyPlans,dutyReason,type DutyCommand} from '../core/duties';
import {governingExecutives,politicalName} from '../core/government';
import {localReason,type LocalCommand} from '../core/localAdministration';
import type {OngoingItem} from '../core/ongoing';
import {playerRealm} from '../core/realm';
import {serviceAuthority} from '../core/serviceMandates';
import {fiscalReason,type FiscalCommand} from '../core/treasury';
import type {GameCommand,World} from '../core/types';

export type OngoingQuickAction={label:string;detail:string;command:GameCommand;reason:string};

/** Actions are derived from the same live records and rule checks as their detail panels. */
export function ongoingQuickActions(w:World,item:OngoingItem):OngoingQuickAction[]{
 const actor=w.characterId;
 if(!actor)return [];
 const fiscal=(action:'approve'|'reject'|'cancel',id:number,label:string,detail:string):OngoingQuickAction=>{const command:FiscalCommand={type:'fiscal',action,id};return {label,detail,command,reason:fiscalReason(w,command)};};
 const local=(action:'approve'|'reject'|'cancel',id:number,label:string,detail:string):OngoingQuickAction=>{const command:LocalCommand={type:'local',action,id};return {label,detail,command,reason:localReason(w,command)};};
 const court=(accept:boolean,label:string,detail:string):OngoingQuickAction=>{const command:CourtCommand={type:'court',action:'resolve',accept};return {label,detail,command,reason:courtReason(w,command)};};
 const service=(command:ServiceCommand,label:string,detail:string):OngoingQuickAction=>({label,detail,command,reason:serviceReason(w,command)});
 const duty=(command:DutyCommand,label:string,detail:string):OngoingQuickAction=>({label,detail,command,reason:dutyReason(w,command)});

 if(item.id.startsWith('fiscal:')){
  const q=w.realm?.fiscal?.requests.find(q=>q.id===Number(item.id.slice(7))&&q.status==='pending');
  if(!q)return [];
  if(q.approver===actor)return [fiscal('approve',q.id,'批准',`从上级公库拨付 ${q.amount} 钱到申请辖区公库。`),fiscal('reject',q.id,'驳回','本次不拨款，申请结束。')];
  if(q.actor===actor)return [fiscal('cancel',q.id,'撤回','撤回这笔尚未批复的拨款申请。')];
 }
 if(item.id.startsWith('local:')){
  const q=w.realm?.local?.requests.find(q=>q.id===Number(item.id.slice(6))&&q.status==='pending');
  if(!q)return [];
  if(q.approver===actor)return [local('approve',q.id,'准予授官',`准予 ${politicalName(q.candidate)} 出任该职，发出赴任文书；若涉及撤换，结算相应政治后果。`),local('reject',q.id,'驳回','不授予该职位，申请结束。')];
  if(q.actor===actor)return [local('cancel',q.id,'撤回','撤回这份尚未批复的授官申请。')];
 }
 if(item.id.startsWith('petition:')){
  const r=playerRealm(w),petition=courtOf(w,r)?.petition;
  if(petition&&item.id===`petition:${petition.sponsor}:${petition.due}`&&governingExecutives(w,r).includes(actor))return [court(true,'批准','消耗公款 80、影响力 20；支持 +5、紧张 −8，并调整眷顾及国策或合法性。'),court(false,'否决','不拨款；支持 −5、紧张 +8。')];
 }
 if(item.id.startsWith('council:')){
  const r=playerRealm(w),proposal=w.service?.councils[r].proposal;
  if(proposal&&item.id===`council:${proposal.actor}:${proposal.day}`&&governingExecutives(w,r).includes(actor))return [service({type:'service',action:'council-accept'},'采纳上书','采用所请重心，重新分配办理效率与考绩。'),service({type:'service',action:'council-decline'},'维持原议','保留当前重心，结束此次议事。')];
 }
 if(item.id.startsWith('service:')){
  const t=w.service?.tasks.find(t=>t.id===Number(item.id.slice(8))&&t.phase!=='closed');
  if(!t)return [];
  const action=(kind:Extract<ServiceCommand,{id:number}>['action'],label:string,detail:string)=>service({type:'service',action:kind,id:t.id} as ServiceCommand,label,detail);
  if(t.invitation?.person===actor)return [action('accept','接受协办','占用差事名额，按实际参与领取考绩。'),action('decline','婉拒','不参与这项差事。')];
  if(!serviceAuthority(w,t,actor))return [];
  if(t.phase==='petition')return [action('approve','准予请命','准许承办人拟案；此时尚不拨款。'),action('cancel','不予准许','结束这项请命，不拨款。')];
  if(t.phase==='approval'&&t.plan){const budget=assignmentBudget(t.kind,t.plan);return [action('approve','核准并拨款',`从主管公库划拨 ${budget.coins} 钱、公粮 ${budget.grain}，供此差事使用。`),action('revise','退回重拟','不拨款，承办人重新拟案；原限期继续计算。')];}
  if(t.phase==='aid')return [action('grant','追加公款','从主管公库追加 20 钱到差事专款。'),action('deny','不予追加','不增加专款，承办人须另作安排。')];
 }
 if(item.id.startsWith('duty:')){
  const t=w.duties?.task;
  if(t&&item.id===`duty:${t.created}`&&t.phase==='approval'&&t.plan&&chiefOfDuty(w)===actor){
   const plan=dutyPlans[t.plan];return [duty({type:'duty',action:'approve'},'核准并拨款',`从公库划拨 ${plan.coins} 钱、公粮 ${plan.grain}。`),duty({type:'duty',action:'revise'},'退回重拟','暂不拨款，由承办人重拟方案。')];
  }
 }
 return [];
}
