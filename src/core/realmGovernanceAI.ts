import {worldRealms} from './polityRuntime';
import type {World} from './types';
import {isMonthStart} from './calendar';
import {capital,cityYield,type RealmId} from './realm';
import {governingAuthority} from './government';
import {courtOf,courtPolicyActive} from './court';
import {actService,serviceReason,serviceCandidates,assignmentBudget} from './assignments';
import {serviceBudgetReason,serviceApprover,serviceCapacity} from './serviceMandates';
import {assignmentTemplates,type AssignmentKind} from '../data/assignments';
import {diplomaticPair,atWar} from './diplomacy';
import {civilianFood,grainCapacity,actPopulation,populationReason} from './population';
import {actFiscal,fiscalReason} from './treasury';

/** Authorize the same funded, staffed work as the player; effects arrive through real completion. */
export function commissionPolicyService(w:World,r:RealmId,actor:string,kinds:AssignmentKind[]){
 if(!w.service||w.service.tasks.filter(t=>t.phase!=='closed'&&serviceApprover(w,t)===actor).length>=serviceCapacity(w,actor,r))return false;
 const candidates=serviceCandidates(w,r).filter(p=>p.id!==w.characterId);
 const home=Object.entries(w.realm!.cities).filter(([,c])=>c.owner===r&&c.controller===r).sort((a,b)=>a[1].prosperity-b[1].prosperity);
 for(const kind of kinds.filter(kind=>{const budget=assignmentBudget(kind,'balanced');return w.realm!.treasuries[r].coins>=budget.coins&&w.realm!.treasuries[r].grain>=budget.grain;}))for(const [site,city] of home.filter(([site])=>kind!=='envoy'||site===capital(r,w))){const targets=kind==='envoy'?worldRealms(w).filter(to=>to!==r&&!atWar(w,r,to)&&(diplomaticPair(w,r,to)?.opinion??-100)>=-15):[undefined];
  for(const target of targets)for(const officer of [...candidates].sort((a,b)=>Number(b.id===city.governor)-Number(a.id===city.governor))){
   const command={type:'service',action:'open',kind,site,officer:officer.id,plan:'balanced',...(target?{target}:{})} as const,budget=assignmentBudget(kind,'balanced'),draft={realm:r,kind,site,officer:officer.id};
   if(serviceReason(w,command,actor)||serviceBudgetReason(w,draft,budget.coins,budget.grain,actor))continue;
   actService(w,command,actor);const task=w.service.tasks.at(-1)!;
   actService(w,{type:'service',action:'approve',id:task.id},actor);
   return true;
  }
 }
 return false;
}

/** Emergency food transport and relief remain available during a political crisis. */
export function advanceRealmGovernanceAI(w:World){
 if(!w.realm||!isMonthStart(w.day,w.scriptId))return;
 const s=w.realm;
 for(const r of worldRealms(w)){const actor=governingAuthority(w,r),court=courtOf(w,r);if(!actor||actor===w.characterId||w.realm.annexed?.[r]||court&&(court.cooldowns['governance-ai']??0)>w.day)continue;
  if(court)court.cooldowns['governance-ai']=w.day+1;
  const home=Object.entries(s.cities).filter(([,c])=>c.owner===r&&c.controller===r);
  const incoming=(id:string)=>s.population?.transfers.filter(t=>t.kind==='grain'&&t.status==='traveling'&&t.to===id).reduce((n,t)=>n+t.sent,0)??0;
  const shortages=home.map(([id,c])=>({id,need:Math.max(0,civilianFood(w,id)*2-cityYield(w,id).grain-c.grain-incoming(id))})).filter(v=>v.need>0).sort((a,b)=>b.need-a.need);
  let shipments=0;
  for(const target of shortages){if(target.id===capital(r,w)||shipments>=3)continue;
   const amount=Math.min(target.need,Math.max(0,grainCapacity(w,target.id)-s.cities[target.id].grain-incoming(target.id)),600);
   if(amount<1)continue;
   const source=home.map(([id,c])=>({id,available:c.grain+(id===capital(r,w)?s.treasuries[r].grain:0)-civilianFood(w,id)*2})).filter(v=>v.id!==target.id&&v.available>=amount).sort((a,b)=>b.available-a.available).find(v=>!populationReason(w,{type:'population',action:'transfer',kind:'grain',from:v.id,to:target.id,amount},actor,r));
   if(source){actPopulation(w,{type:'population',action:'transfer',kind:'grain',from:source.id,to:target.id,amount},actor,r);shipments++;}
  }
  for(const [site] of home.filter(([,c])=>c.order<45).sort((a,b)=>a[1].order-b[1].order).slice(0,3)){const command={type:'fiscal',action:'relief',site} as const;if(!fiscalReason(w,command,actor))actFiscal(w,command,actor);}
  const policy=courtPolicyActive(w,r);
  if(policy==='reform'){const history=w.service?.tasks.filter(t=>t.realm===r&&(assignmentTemplates[t.kind].category==='economy'||t.kind==='envoy'))??[],pending=history.filter(t=>t.phase!=='closed'),economy=()=>!pending.some(t=>assignmentTemplates[t.kind].category==='economy')&&commissionPolicyService(w,r,actor,['agriculture','commerce','marketworks']),diplomacy=()=>!pending.some(t=>t.kind==='envoy')&&commissionPolicyService(w,r,actor,['envoy']);if(history.at(-1)?.kind==='envoy'||!history.length){economy();diplomacy();}else{diplomacy();economy();}}
  if(policy==='consolidation'){const disorder=home.some(([,c])=>c.order<65);commissionPolicyService(w,r,actor,disorder?['inspection','relief']:w.realm.treasuries[r].coins<300?['taxation']:['agriculture']);}
 }
}
