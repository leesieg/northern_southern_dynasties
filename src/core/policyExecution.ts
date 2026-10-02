import {governanceRules,type GovernanceRules} from './governanceRules';
import type {Assignment} from './assignments';
import type {AssignmentPlan} from '../data/assignments';
import type {World} from './types';
import {serviceApprover} from './serviceMandates';
import {governmentOf} from './government';
export type ServicePolicy=Pick<GovernanceRules,'revision'|'appointment'|'registration'|'access'|'cultural'>&{culturalExemption?:boolean};
export function servicePolicy(w:World,t:Pick<Assignment,'realm'|'policy'>&{site?:string}):ServicePolicy {return t.policy??{...governanceRules(w,t.realm),culturalExemption:!!(t.site&&w.realm!.cities[t.site].culturalExemption)};}
/** A quote and completion use the same rule. Partial/urgent registration never counts as a census. */
export function policyExecution(w:World,t:Pick<Assignment,'realm'|'kind'|'site'|'policy'>&{id?:number},plan:AssignmentPlan,quality=plan==='thorough'?115:plan==='urgent'?85:100){
 const p=servicePolicy(w,t),c=w.realm!.cities[t.site],base=Math.max(30,Math.min(150,Math.floor(c.population/50*(c.tax==='light'?.7:c.tax==='heavy'?1.4:1))));
 if(t.id!==undefined&&!t.policy)return {recovered:base,order:-5,work:0,applied:false,rule:p.registration};
 const surveyed=plan==='thorough'&&quality>=100;
 const integration=p.cultural==='integration'&&surveyed&&!p.culturalExemption,extraWork=p.cultural==='integration'?15:(p.cultural==='customs'||p.culturalExemption)&&p.registration==='equalized'?15:0;
 const rate=p.registration==='compact'?.75:p.registration==='survey'?(surveyed?1.15:1):surveyed?1.35:1.1;
 const order=p.registration==='compact'?-2:p.registration==='equalized'?-8:-5;
 return {recovered:Math.round(base*rate*(integration?1.05:1)),order:order+(plan==='urgent'?-3:plan==='thorough'?2:0),work:t.kind==='taxation'?(p.registration==='equalized'?30:p.registration==='survey'?15:0)+extraWork:0,applied:p.registration==='compact'||surveyed,rule:p.registration};
}
export function recordPolicyExecution(w:World,t:Assignment,recovered:number){
 const g=governmentOf(w,t.realm)!;g.rules??=governanceRules(w,t.realm);const p=t.policy;
 if(!p||!t.result?.success||w.realm!.cities[t.site].owner!==t.realm||w.realm!.cities[t.site].controller!==t.realm)return;
 if(t.kind==='taxation'){
  const execution=policyExecution(w,t,t.plan!,t.quality),issuer=t.approvedBy??serviceApprover(w,t)??t.mandate?.issuer;
  if(!issuer)return;(g.rules.reports??={})[t.site]={task:t.id,officer:t.officer,issuer,revision:p.revision,registration:p.registration,access:p.access,reportedDay:w.day,applied:execution.applied,quality:t.quality??100,recovered,checkedDay:null,inspector:null,inspectionTask:null};
 }
 if(t.kind==='inspection'){
  const report=g.rules.reports?.[t.site];if(!report||report.checkedDay!==null||report.officer===t.officer||report.reportedDay>t.created||t.plan==='urgent'||(t.quality??100)<100)return;
  report.checkedDay=w.day;report.inspector=t.officer;report.inspectionTask=t.id;
 }
}
