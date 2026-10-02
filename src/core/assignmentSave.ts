import {worldRealms,isRealmId} from './polityRuntime';
import {territoryNodes} from '../data/territorialHierarchy';
import {policyDefinition} from '../data/governancePolicies';
import {historicalCharacters} from '../data/characters';
import {allegianceRealm} from './officeEligibility';
import type {World} from './types';
import {relationshipPersonById,relationshipPeople} from '../data/relationships';
import {assignmentTemplates,assignmentPlans,assignmentPhases,servicePriorities} from '../data/assignments';
import {siteById} from '../data/scenario';
import {assignmentBudget,type Assignment} from './assignments';
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const int=(v:unknown,min:number,max:number):v is number=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
const text=(v:unknown,max:number):v is string=>typeof v==='string'&&v.length<=max;
const key=(v:unknown,map:object):v is string=>typeof v==='string'&&Object.hasOwn(map,v);
const person=(v:unknown):v is string=>key(v,relationshipPersonById);
const realm=(v:unknown)=>isRealmId(v);
const priorities=Object.keys(servicePriorities);
const localSnapshot=(v:unknown,start:number,end:number)=>obj(v)&&int(v.day,start,end)&&int(v.order,0,100)&&int(v.grain,0,1000000)&&int(v.prosperity,0,100)&&int(v.irrigation,0,10)&&int(v.building,0,3);
const localChange=(v:unknown)=>obj(v)&&Object.keys(v).length===5&&['order','grain','prosperity','irrigation','building'].every(k=>int(v[k],-2000000,2000000));
export function validService(v:unknown,day:number,mode:unknown,w?:World):boolean {
 if(mode!=='sandbox'||!obj(v)||v.version!==1||!int(v.since,0,day)||!int(v.lastDay,v.since,day)||typeof v.enabled!=='boolean'||!int(v.nextId,1,1000000)||!obj(v.councils)||Object.keys(v.councils).length!==worldRealms(w).length||!obj(v.careers)||Object.keys(v.careers).some(id=>!relationshipPersonById[id]))return false;
 for(const r of worldRealms(w)){const c=v.councils[r];if(!obj(c)||!int(c.season,Math.floor(v.since/90),Math.floor(day/90))||!key(c.priority,servicePriorities)||typeof c.decided!=='boolean'||!int(c.completed,0,10000)||!text(c.lastResult,300)||!Array.isArray(c.petitioned)||new Set(c.petitioned).size!==c.petitioned.length||c.petitioned.some(p=>!person(p)||relationshipPersonById[p].realm!==r&&(!w||allegianceRealm(w,p)!==r)))return false;const reply=c.reply;if(reply!==null&&(!obj(reply)||!person(reply.actor)||relationshipPersonById[reply.actor].realm!==r&&(!w||allegianceRealm(w,reply.actor)!==r)||!int(reply.day,v.since,day)||!text(reply.text,200)))return false;const p=c.proposal;if(p!==null&&(!obj(p)||!person(p.actor)||relationshipPersonById[p.actor].realm!==r&&(!w||allegianceRealm(w,p.actor)!==r)||!key(p.priority,servicePriorities)||!int(p.day,v.since,day)||!c.petitioned.includes(p.actor)))return false;}
 if(historicalCharacters.some(c=>!Object.hasOwn(v.careers as object,c.id)))return false;
 for(const id of Object.keys(v.careers)){const p=v.careers[id];if(!obj(p)||Object.keys(p).length!==4||priorities.some(k=>!int(p[k],0,100000)))return false;}
 if(v.routine!==undefined&&(!Array.isArray(v.routine)||v.routine.length>512||new Set(v.routine.map(m=>obj(m)?[m.realm,m.issuer,m.kind].join('|'):null)).size!==v.routine.length||v.routine.some(m=>!obj(m)||!realm(m.realm)||!person(m.issuer)||!['relief','marketworks','granaryworks','hostelworks'].includes(String(m.kind)))))return false;
 if(!Array.isArray(v.used)||v.used.length>6000||new Set(v.used).size!==v.used.length||!v.used.every(k=>{if(!text(k,160))return false;const [season,r,kind,site,target,...rest]=k.split('|');return !rest.length&&int(Number(season),0,Math.floor(day/90))&&realm(r)&&key(kind,assignmentTemplates)&&key(site,siteById)&&(kind==='envoy'?realm(target)&&target!==r:target==='');}))return false;
 if(!Array.isArray(v.tasks)||v.tasks.length>256)return false;
 const ids=new Set<number>(),busy=new Set<string>(),counts:Record<string,number>={};
 for(const t of v.tasks){
  if(!obj(t))return false;
  const policy=t.policy;if(policy!==undefined&&(!obj(policy)||policy.culturalExemption!==undefined&&typeof policy.culturalExemption!=='boolean'||policy.cultural!==undefined&&!policyDefinition('cultural',String(policy.cultural))||!int(policy.revision,1,1000000)||!['appointment','registration','access'].every(k=>typeof policy[k]==='string'&&!!policyDefinition(k as 'appointment'|'registration'|'access',String(policy[k])))))return false;
  if(t.approvedBy!==undefined&&!person(t.approvedBy))return false;
  if(t.direct!==undefined&&!localChange(t.direct))return false;
  if(!obj(t)||(t.extended!==undefined&&typeof t.extended!=='boolean')||(t.quality!==undefined&&!int(t.quality,50,130))||!int(t.id,1,v.nextId-1)||ids.has(t.id)||!realm(t.realm)||!key(t.kind,assignmentTemplates)||!key(t.site,siteById)||!person(t.officer)||t.phase!=='closed'&&relationshipPersonById[t.officer].realm!==t.realm&&(!w||allegianceRealm(w,t.officer)!==t.realm))return false;ids.add(t.id);
  if(t.extension!==undefined){const e=t.extension;if(!obj(e)||!person(e.requestedBy)||!int(e.requestedDay,Number(t.created),day)||!t.started||(e.approved===null?e.decidedBy!==null||e.decidedDay!==null:typeof e.approved!=='boolean'||!person(e.decidedBy)||!int(e.decidedDay,Number(e.requestedDay),day))||e.approved===true&&!t.extended||e.approved===false&&t.extended===true)return false;}
  if(t.delivery!==undefined){const d=t.delivery;if(t.kind!=='supply'||!t.started||!obj(d)||!(d.transfer===null||int(d.transfer,1,1000000000))||!int(d.sent,1,200)||!int(d.arrived,0,Number(d.sent))||!int(d.delivered,0,Number(d.arrived))||!int(d.lost,0,Number(d.sent))||!['traveling','arrived','returned'].includes(String(d.status))||d.status!=='traveling'&&Number(d.arrived)+Number(d.lost)!==d.sent)return false;}
  const validFunding=(p:unknown)=>obj(p)&&typeof p.account==='string'&&(p.account==='central:'+t.realm||p.account.split('|').length===2&&p.account.startsWith(t.realm+'|')&&Object.hasOwn(territoryNodes,p.account.split('|')[1]))&&(p.grainSite===null||p.grainSite===t.site)&&int(p.coins,0,400)&&int(p.grain,0,200);
  if(t.mandate!==undefined&&(!obj(t.mandate)||!person(t.mandate.issuer)||t.mandate.issuer===t.officer||typeof t.mandate.automatic!=='boolean'||t.mandate.orderFloor!==40||t.mandate.qualityFloor!==85||t.mandate.reserve!==0))return false;
  if(t.baseline!==undefined&&!localSnapshot(t.baseline,Number(t.created),Number(t.created)))return false;
  if(t.funding!==undefined&&(!Array.isArray(t.funding)||t.funding.length>2||!t.funding.every(validFunding)||!obj(t.funds)||t.funding.reduce((n,p)=>n+p.coins,0)!==t.funds.coins||t.funding.reduce((n,p)=>n+p.grain,0)!==t.funds.grain))return false;
  if(t.refunds!==undefined&&(!Array.isArray(t.refunds)||t.refunds.length>2||!t.refunds.every(validFunding)||t.phase!=='closed'&&t.refunds.length))return false;
  if(Array.isArray(t.refunds)&&obj(t.funds)&&obj(t.spent)&&(t.refunds.reduce((n,p)=>n+p.coins,0)>Number(t.funds.coins)-Number(t.spent.coins)||t.refunds.reduce((n,p)=>n+p.grain,0)>Number(t.funds.grain)-Number(t.spent.grain)))return false;
  if(Array.isArray(t.refunds)&&t.refunds.some(p=>!(Array.isArray(t.funding)?t.funding:[{account:'central:'+t.realm,grainSite:null}]).some(f=>f.account===p.account&&f.grainSite===p.grainSite)))return false;
  if(t.kind==='envoy'?(!realm(t.target)||t.target===t.realm):t.target!==null)return false;
  if(t.credential!==null&&(!text(t.credential,160)||!t.credential.startsWith('office:')))return false;
  if(!int(t.created,v.since,day)||!int(t.changed,t.created,day)||t.travelAllowance!==undefined&&!int(t.travelAllowance,0,10000)||![t.created+120+Number(t.travelAllowance??0),t.created+Math.max(120,Math.ceil(assignmentTemplates[t.kind as Assignment['kind']].work/3)+30)+Number(t.travelAllowance??0)].includes(Number(t.deadline)-(t.extended?30:0))||!int(t.season,0,Math.floor(t.created/90))||!key(t.phase,assignmentPhases)||t.plan!==null&&!key(t.plan,assignmentPlans))return false;
  if(!int(t.required,0,10000)||!int(t.progress,0,t.required)||typeof t.started!=='boolean'||typeof t.incidentDone!=='boolean'||typeof t.aidRequested!=='boolean'||!obj(t.funds)||!int(t.funds.coins,0,400)||!int(t.funds.grain,0,200))return false;
  if(obj(t.delivery)){const d=t.delivery;if(d.sent!==t.funds.grain||!obj(t.spent)||Number(t.spent.grain)<Number(d.sent))return false;
   if(d.status==='traveling'&&w&&!w.realm?.population?.transfers.some(c=>c.id===d.transfer&&c.serviceTask===t.id&&c.status==='traveling'&&c.realm===t.realm&&c.sent===d.sent))return false;}
  if(t.spent!==undefined&&(!obj(t.spent)||!int(t.spent.coins,0,Number(t.funds.coins))||!int(t.spent.grain,0,Number(t.funds.grain))))return false;
  const b=t.plan?assignmentBudget(t.kind as Assignment['kind'],t.plan as NonNullable<Assignment['plan']>):null,funded=t.funds.coins>0;
  if(funded&&(!b||![b.coins,b.coins+20].includes(t.funds.coins)||t.funds.grain!==b.grain)||!funded&&t.funds.grain!==0||b&&t.funds.coins===b.coins+20&&!t.aidRequested)return false;
  if(t.started&&(!funded||t.required<1)||!t.started&&(t.progress!==0||t.required!==0||t.incidentDone||t.aidRequested))return false;
  if(['petition','proposal'].includes(t.phase)&&(t.plan!==null||funded)||t.phase==='approval'&&(!b||funded)||t.phase==='ready'&&(!funded||t.started))return false;
  if(['working','incident','aid','report'].includes(t.phase)&&!t.started||['incident','aid'].includes(t.phase)&&t.incidentDone||t.phase==='aid'&&!t.aidRequested||t.phase==='report'&&(t.progress!==t.required||!t.incidentDone))return false;
  if(t.season>=Math.floor(day/90)-1&&!v.used.includes([t.season,t.realm,t.kind,t.site,t.target??''].join('|')))return false;
  if(t.helper!==null&&(!person(t.helper)||(w?allegianceRealm(w,t.helper):relationshipPersonById[t.helper].realm)!==t.realm||t.helper===t.officer))return false;
  if(!Array.isArray(t.invited)||t.invited.length>relationshipPeople.length||new Set(t.invited).size!==t.invited.length||t.invited.some(p=>!person(p)))return false;
  if(t.invitation!==null&&(!obj(t.invitation)||!person(t.invitation.person)||relationshipPersonById[t.invitation.person].realm!==t.realm&&allegianceRealm(w!,t.invitation.person)!==t.realm||!int(t.invitation.day,t.created,day)||!t.invited.includes(t.invitation.person)||t.helper!==null||t.invitation.person===t.officer))return false;
  if(!obj(t.contributors)||Object.keys(t.contributors).length>relationshipPeople.length)return false;let total=0;
  for(const [p,c] of Object.entries(t.contributors)){if(!person(p)||!obj(c)||!int(c.lead,0,10000)||!int(c.support,0,10000))return false;total+=c.lead+c.support;}
  if(total!==t.progress)return false;
  if(t.phase==='closed'){
   const r=t.result;if(!obj(r)||r.day!==t.changed||typeof r.success!=='boolean'||!text(r.reason,300)||!Array.isArray(r.effects)||r.effects.length>12||r.effects.some(e=>!text(e,300))||!Array.isArray(r.awards)||r.awards.length>relationshipPeople.length||t.invitation!==null||t.helper!==null)return false;
   if(r.after!==undefined&&!localSnapshot(r.after,Number(r.day),Number(r.day)))return false;
   if(r.direct!==undefined&&!localChange(r.direct)||r.ambient!==undefined&&!localChange(r.ambient)||r.pressure!==undefined&&(!obj(r.pressure)||!int(r.pressure.before,0,8)||!int(r.pressure.after,0,8)))return false;
   if(r.direct!==undefined||r.ambient!==undefined){if(!obj(r.direct)||!obj(r.ambient)||!obj(r.after)||!obj(t.baseline)||!obj(t.direct)||!['order','grain','prosperity','irrigation','building'].every(k=>Number((r.direct as Record<string,unknown>)[k])+Number((r.ambient as Record<string,unknown>)[k])===Number((r.after as Record<string,unknown>)[k])-Number((t.baseline as Record<string,unknown>)[k])))return false;}
   if(r.success&&(!t.started||t.progress!==t.required||!t.incidentDone))return false;
   const seen=new Set<string>();for(const a of r.awards){if(!obj(a)||!person(a.person)||!Object.hasOwn(t.contributors,a.person)||seen.has(a.person)||!int(a.merit,-4,40)||!int(a.opinion,-5,8)||!int(a.prestige,0,5))return false;if(r.success?(a.merit<0||a.opinion<0):(a.merit>0||a.opinion>0||a.prestige!==0))return false;seen.add(a.person);}
  }else {if(t.result!==null||busy.has(t.officer))return false;busy.add(t.officer);if(t.helper){if(busy.has(t.helper as string))return false;busy.add(t.helper as string);}counts[String(t.realm)]=(counts[String(t.realm)]??0)+1;if(counts[String(t.realm)]>128)return false;}
  if(!Array.isArray(t.history)||t.history.length<1||t.history.length>32)return false;let previous=t.created;
  for(const h of t.history){if(!obj(h)||!int(h.day,previous,day)||!text(h.text,500)||!h.text)return false;previous=h.day;}
 }
 return true;
}
