import type {World} from './types';
import type {RealmId} from './realm';
import type {AppointmentPolicy,AccessPolicy,RegistrationPolicy,CulturalPolicy} from '../data/governancePolicies';
import {policyDefinition,policyDimensions} from '../data/governancePolicies';
import {siteById} from '../data/scenario';
import {relationshipPersonById} from '../data/relationships';
export interface PolicyLocalReport {task:number;officer:string;issuer:string;revision:number;registration:RegistrationPolicy;access:AccessPolicy;reportedDay:number;applied:boolean;quality:number;recovered:number;checkedDay:number|null;inspector:string|null;inspectionTask:number|null}
export interface GovernanceRules {
 revision:number;since:number;appointment:AppointmentPolicy;access:AccessPolicy;registration:RegistrationPolicy;cultural?:CulturalPolicy;
 reports?:Record<string,PolicyLocalReport>;
}
export function validGovernanceRules(value:unknown,day:number,w?:World,realm?:RealmId){
 if(value===undefined)return true;
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const q=value as Record<string,unknown>;
 const integer=(v:unknown,min:number,max:number)=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
 if(!integer(q.revision,1,1000000)||!integer(q.since,0,day)||!policyDimensions.every(d=>d==='cultural'&&q[d]===undefined||typeof q[d]==='string'&&!!policyDefinition(d,String(q[d]))))return false;
 const reports=q.reports;if(reports===undefined)return true;
 if(!reports||typeof reports!=='object'||Array.isArray(reports)||Object.keys(reports).length>Object.keys(siteById).length)return false;
 return Object.entries(reports).every(([site,value])=>{
  if(!Object.hasOwn(siteById,site)||!value||typeof value!=='object'||Array.isArray(value))return false;
  const v=value as PolicyLocalReport;
  if(!integer(v.task,1,1000000)||!integer(v.revision,1,Number(q.revision))||!relationshipPersonById[v.officer]||!relationshipPersonById[v.issuer]||!policyDefinition('registration',v.registration)||!policyDefinition('access',v.access)||!integer(v.reportedDay,0,day)||typeof v.applied!=='boolean'||!integer(v.quality,50,130)||!integer(v.recovered,0,1000000))return false;
  if(v.checkedDay===null){if(v.inspector!==null||v.inspectionTask!==null)return false;}
  else if(!integer(v.checkedDay,v.reportedDay,day)||v.inspector===v.officer||!relationshipPersonById[v.inspector!]||!integer(v.inspectionTask,1,1000000)||v.inspectionTask===v.task)return false;
  if(!w)return true;
  // An archived case can outlive the bounded task list, but cannot precede service or invent an ID.
  const service=w.service;if(!service||v.task>=service.nextId||v.reportedDay<service.since||v.inspectionTask!==null&&v.inspectionTask>=service.nextId)return false;
  const task=service.tasks.find(t=>t.id===v.task),inspection=service.tasks.find(t=>t.id===v.inspectionTask);
  if(task&&(task.realm!==realm||task.site!==site||task.kind!=='taxation'||task.officer!==v.officer||task.result?.success!==true||task.result.day!==v.reportedDay||task.policy?.revision!==v.revision||task.policy.registration!==v.registration||task.policy.access!==v.access||(task.quality??100)!==v.quality))return false;
  if(inspection&&(inspection.realm!==realm||inspection.site!==site||inspection.kind!=='inspection'||inspection.officer!==v.inspector||inspection.created<v.reportedDay||inspection.result?.success!==true||inspection.result.day!==v.checkedDay||inspection.plan==='urgent'||(inspection.quality??100)<100))return false;
  return true;
 });
}
/** Missing old-save metadata supplies rules only; it never fabricates reports or charges costs. */
export function governanceRules(w:World,r:RealmId):GovernanceRules&{cultural:CulturalPolicy} {
 const g=w.realm!.governments!.realms[r];
 return g.rules?{...g.rules,cultural:g.rules.cultural??'inclusive'}:{revision:1,since:w.realm!.governments!.since,appointment:g.laws.includes('west-six')?'assessment':g.laws.includes('east-selection')?'selection':'lineage',access:g.laws.includes('west-six')?'trial':'patronage',registration:g.laws.includes('west-register')?'survey':'compact',cultural:'inclusive'};
}
