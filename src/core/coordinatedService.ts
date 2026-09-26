import {awardDeed} from './deeds';
import type {RealmId} from './realm';
import type {World} from './types';
import type {AssignmentKind,AssignmentPlan} from '../data/assignments';
import {assignmentTemplates} from '../data/assignments';
import {actService,serviceReason} from './assignments';
import {localSites} from './localAdministration';
import {allegianceRealm} from './officeEligibility';
import {canCommission} from './serviceMandates';
import {relationshipPersonById} from '../data/relationships';
import {territoryNodes} from '../data/territorialHierarchy';
export interface CoordinatedService {nextId:number;items:{id:number;issuer:string;territory:string;kind:AssignmentKind;policy:'economy'|'quality'|'speed';tasks:number[];created:number;realm?:RealmId;assessed?:boolean;quarters?:{day:number;closed:number;failed:number;coins:number;grain:number}[];reports?:{task:number;site:string;coins:number;grain:number;quality:number;day:number;success?:boolean}[]}[]}
export type CoordinateCommand={type:'coordinate';territory:string;kind:AssignmentKind;policy:'economy'|'quality'|'speed';orders:{site:string;officer:string}[]};
export function programmePlans(policy:'economy'|'quality'|'speed'):AssignmentPlan[]{return policy==='economy'?['thorough']:policy==='quality'?['balanced','thorough']:['balanced','urgent'];}
export function coordinatedPlanReason(w:World,id:number,plan:AssignmentPlan){const p=w.coordinatedService?.items.find(p=>p.tasks.includes(id));return p&&!programmePlans(p.policy).includes(plan)?'不符合上级书面授权的办理手段，请主管改派或撤回':'';}
export function coordinatedReason(w:World,c:CoordinateCommand){if(!w.characterId||!w.realm)return '须有政务身份';const r=allegianceRealm(w,w.characterId);if(!r||!territoryNodes[c.territory]||!['province','prefecture'].includes(territoryNodes[c.territory].level))return '须选择州或郡';if(!['economy','quality','speed'].includes(c.policy)||!Object.hasOwn(assignmentTemplates,c.kind)||c.kind==='envoy')return '无效协调目标';if(!Array.isArray(c.orders)||c.orders.length<2||c.orders.length>8||new Set(c.orders.map(o=>o.site)).size!==c.orders.length||new Set(c.orders.map(o=>o.officer)).size!==c.orders.length)return '须选二至八个不同县域，每县一名独立承办人';const sites=localSites(w,c.territory,r);if(c.orders.some(o=>!sites.includes(o.site)||!canCommission(w,w.characterId!,r,o.site,c.kind)))return '超出当前职掌辖区';if((w.coordinatedService?.items.length??0)>=1000)return '协调文书已满';
 const preview=structuredClone(w);for(const o of c.orders){const cmd={type:'service',action:'open',kind:c.kind,...o} as const,reason=serviceReason(preview,cmd);if(reason)return reason;actService(preview,cmd);}return '';}
export function actCoordinated(w:World,c:CoordinateCommand){const reason=coordinatedReason(w,c);if(reason)throw new Error(reason);const s=w.coordinatedService??={nextId:1,items:[]},tasks:number[]=[];for(const o of c.orders){actService(w,{type:'service',action:'open',kind:c.kind,...o});const t=w.service!.tasks.at(-1)!;t.mandate!.automatic=true;tasks.push(t.id);}s.items.push({id:s.nextId++,issuer:w.characterId!,territory:c.territory,kind:c.kind,policy:c.policy,tasks,created:w.day,realm:allegianceRealm(w,w.characterId!)!,assessed:false,quarters:[]});}
export function validCoordinated(w:World){const s=w.coordinatedService;if(s===undefined)return true;return !!s&&Number.isSafeInteger(s.nextId)&&s.nextId>0&&Array.isArray(s.items)&&s.items.length<=1000&&new Set(s.items.map(p=>p.id)).size===s.items.length&&s.items.every(p=>p&&Number.isSafeInteger(p.id)&&p.id>0&&p.id<s.nextId&&!!relationshipPersonById[p.issuer]&&!!territoryNodes[p.territory]&&Object.hasOwn(assignmentTemplates,p.kind)&&['economy','quality','speed'].includes(p.policy)&&Number.isSafeInteger(p.created)&&p.created>=0&&p.created<=w.day&&(p.realm===undefined||['liang','east','west'].includes(p.realm))&&(p.assessed===undefined||typeof p.assessed==='boolean')&&(p.quarters===undefined||Array.isArray(p.quarters)&&p.quarters.length<=16&&p.quarters.every(q=>q&&[q.day,q.closed,q.failed,q.coins,q.grain].every(n=>Number.isSafeInteger(n)&&n>=0)&&q.day<=w.day&&q.closed<=p.tasks.length&&q.failed<=q.closed))&&Array.isArray(p.tasks)&&p.tasks.length>=2&&p.tasks.length<=8&&new Set(p.tasks).size===p.tasks.length&&p.tasks.every(id=>Number.isSafeInteger(id)&&id>0&&id<(w.service?.nextId??0))&&(p.reports===undefined||Array.isArray(p.reports)&&p.reports.length<=p.tasks.length&&new Set(p.reports.map(r=>r.task)).size===p.reports.length&&p.reports.every(r=>r&&p.tasks.includes(r.task)&&typeof r.site==='string'&&[r.coins,r.grain,r.quality,r.day].every(n=>Number.isSafeInteger(n)&&n>=0)&&(r.success===undefined||typeof r.success==='boolean')&&r.coins<=1000&&r.grain<=1000&&r.quality<=130&&r.day<=w.day)));}

export function recordCoordinated(w:World){
 for(const p of w.coordinatedService?.items??[]){
  p.reports??=[];p.quarters??=[];
  for(const id of p.tasks){const t=w.service?.tasks.find(t=>t.id===id);if(!t||t.phase!=='closed'||p.reports.some(r=>r.task===id))continue;p.reports.push({task:id,site:t.site,coins:t.spent?.coins??0,grain:t.spent?.grain??0,quality:t.quality??100,day:w.day,success:t.result?.success??false});}
  const due=p.created+(Math.floor((w.day-p.created)/90))*90;
  if(due>p.created&&(!p.quarters.length||p.quarters.at(-1)!.day<due)&&!p.assessed){
   const live=p.tasks.map(id=>w.service?.tasks.find(t=>t.id===id)).filter(t=>t!==undefined).filter(t=>t.phase!=='closed');
   p.quarters.push({day:due,closed:p.reports.length,failed:p.reports.filter(r=>r.success===false).length,coins:p.reports.reduce((n,r)=>n+r.coins,0)+live.reduce((n,t)=>n+(t.spent?.coins??0),0),grain:p.reports.reduce((n,r)=>n+r.grain,0)+live.reduce((n,t)=>n+(t.spent?.grain??0),0)});p.quarters=p.quarters.slice(-16);
  }
  if(p.reports.length===p.tasks.length&&!p.assessed){
   p.assessed=true;const r=p.realm??w.service?.tasks.find(t=>p.tasks.includes(t.id))?.realm;
   if(r&&p.reports.every(t=>t.success!==undefined)){
    const passed=p.reports.filter(t=>t.success&&t.quality>=85).length,failed=p.reports.filter(t=>!t.success).length;
    const amount=failed?-Math.min(10,failed*2):Math.min(10,passed*2);
    awardDeed(w,r,p.issuer,'coordination:'+p.id,amount,`跨县统筹：合格 ${passed}／${p.tasks.length} 县，未成 ${failed} 县；实支 ${p.reports.reduce((n,t)=>n+t.coins,0)} 钱。承办功绩另按各案结算。`);
   }
  }
 }
}
