import {assignmentTemplates,assignmentPlans,assignmentPhases,servicePriorities} from '../data/assignments';
import {characterById,historicalCharacters} from '../data/characters';
import {siteById} from '../data/scenario';
import {realms} from './realm';
import {assignmentBudget,type Assignment} from './assignments';
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const int=(v:unknown,min:number,max:number):v is number=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
const text=(v:unknown,max:number):v is string=>typeof v==='string'&&v.length<=max;
const key=(v:unknown,map:object):v is string=>typeof v==='string'&&Object.hasOwn(map,v);
const person=(v:unknown):v is string=>key(v,characterById);
const realm=(v:unknown)=>realms.includes(v as typeof realms[number]);
const priorities=Object.keys(servicePriorities);
export function validService(v:unknown,day:number,mode:unknown):boolean {
 if(mode!=='sandbox'||!obj(v)||v.version!==1||!int(v.since,0,day)||!int(v.lastDay,v.since,day)||typeof v.enabled!=='boolean'||!int(v.nextId,1,1000000)||!obj(v.councils)||Object.keys(v.councils).length!==3||!obj(v.careers)||Object.keys(v.careers).length!==historicalCharacters.length)return false;
 for(const r of realms){const c=v.councils[r];if(!obj(c)||!int(c.season,Math.floor(v.since/90),Math.floor(day/90))||!key(c.priority,servicePriorities)||typeof c.decided!=='boolean'||!int(c.completed,0,10000)||!text(c.lastResult,300)||!Array.isArray(c.petitioned)||new Set(c.petitioned).size!==c.petitioned.length||c.petitioned.some(p=>!person(p)||characterById[p].polity!==r))return false;const reply=c.reply;if(reply!==null&&(!obj(reply)||!person(reply.actor)||characterById[reply.actor].polity!==r||!int(reply.day,v.since,day)||!text(reply.text,200)))return false;const p=c.proposal;if(p!==null&&(!obj(p)||!person(p.actor)||characterById[p.actor].polity!==r||!key(p.priority,servicePriorities)||!int(p.day,v.since,day)||!c.petitioned.includes(p.actor)))return false;}
 for(const c of historicalCharacters){const p=v.careers[c.id];if(!obj(p)||Object.keys(p).length!==4||priorities.some(k=>!int(p[k],0,100000)))return false;}
 if(!Array.isArray(v.used)||v.used.length>6000||new Set(v.used).size!==v.used.length||!v.used.every(k=>{if(!text(k,160))return false;const [season,r,kind,site,target,...rest]=k.split('|');return !rest.length&&int(Number(season),0,Math.floor(day/90))&&realm(r)&&key(kind,assignmentTemplates)&&key(site,siteById)&&(kind==='envoy'?realm(target)&&target!==r:target==='');}))return false;
 if(!Array.isArray(v.tasks)||v.tasks.length>64||!v.enabled&&v.tasks.length)return false;
 const ids=new Set<number>(),busy=new Set<string>(),counts:Record<string,number>={};
 for(const t of v.tasks){
  if(!obj(t)||!int(t.id,1,v.nextId-1)||ids.has(t.id)||!realm(t.realm)||!key(t.kind,assignmentTemplates)||!key(t.site,siteById)||!person(t.officer)||characterById[t.officer].polity!==t.realm)return false;ids.add(t.id);
  if(t.kind==='envoy'?(!realm(t.target)||t.target===t.realm):t.target!==null)return false;
  if(t.credential!==null&&(!text(t.credential,160)||!t.credential.startsWith('office:')))return false;
  if(!int(t.created,v.since,day)||!int(t.changed,t.created,day)||t.travelAllowance!==undefined&&!int(t.travelAllowance,0,10000)||t.deadline!==t.created+120+Number(t.travelAllowance??0)||!int(t.season,0,Math.floor(t.created/90))||!key(t.phase,assignmentPhases)||t.plan!==null&&!key(t.plan,assignmentPlans))return false;
  if(!int(t.required,0,10000)||!int(t.progress,0,t.required)||typeof t.started!=='boolean'||typeof t.incidentDone!=='boolean'||typeof t.aidRequested!=='boolean'||!obj(t.funds)||!int(t.funds.coins,0,400)||!int(t.funds.grain,0,200))return false;
  const b=t.plan?assignmentBudget(t.kind as Assignment['kind'],t.plan as NonNullable<Assignment['plan']>):null,funded=t.funds.coins>0;
  if(funded&&(!b||![b.coins,b.coins+20].includes(t.funds.coins)||t.funds.grain!==b.grain)||!funded&&t.funds.grain!==0||b&&t.funds.coins===b.coins+20&&!t.aidRequested)return false;
  if(t.started&&(!funded||t.required<1)||!t.started&&(t.progress!==0||t.required!==0||t.incidentDone||t.aidRequested))return false;
  if(['petition','proposal'].includes(t.phase)&&(t.plan!==null||funded)||t.phase==='approval'&&(!b||funded)||t.phase==='ready'&&(!funded||t.started))return false;
  if(['working','incident','aid','report'].includes(t.phase)&&!t.started||['incident','aid'].includes(t.phase)&&t.incidentDone||t.phase==='aid'&&!t.aidRequested||t.phase==='report'&&(t.progress!==t.required||!t.incidentDone))return false;
  if(t.season>=Math.floor(day/90)-1&&!v.used.includes([t.season,t.realm,t.kind,t.site,t.target??''].join('|')))return false;
  if(t.helper!==null&&(!person(t.helper)||characterById[t.helper].polity!==t.realm||t.helper===t.officer))return false;
  if(!Array.isArray(t.invited)||t.invited.length>historicalCharacters.length||new Set(t.invited).size!==t.invited.length||t.invited.some(p=>!person(p)||characterById[p].polity!==t.realm))return false;
  if(t.invitation!==null&&(!obj(t.invitation)||!person(t.invitation.person)||characterById[t.invitation.person].polity!==t.realm||!int(t.invitation.day,t.created,day)||!t.invited.includes(t.invitation.person)||t.helper!==null||t.invitation.person===t.officer))return false;
  if(!obj(t.contributors)||Object.keys(t.contributors).length>historicalCharacters.length)return false;let total=0;
  for(const [p,c] of Object.entries(t.contributors)){if(!person(p)||characterById[p].polity!==t.realm||!obj(c)||!int(c.lead,0,10000)||!int(c.support,0,10000))return false;total+=c.lead+c.support;}
  if(total!==t.progress)return false;
  if(t.phase==='closed'){
   const r=t.result;if(!obj(r)||r.day!==t.changed||typeof r.success!=='boolean'||!text(r.reason,300)||!Array.isArray(r.effects)||r.effects.length>12||r.effects.some(e=>!text(e,300))||!Array.isArray(r.awards)||r.awards.length>historicalCharacters.length||t.invitation!==null||t.helper!==null)return false;
   if(r.success&&(!t.started||t.progress!==t.required||!t.incidentDone))return false;
   const seen=new Set<string>();for(const a of r.awards){if(!obj(a)||!person(a.person)||!Object.hasOwn(t.contributors,a.person)||seen.has(a.person)||!int(a.merit,-4,30)||!int(a.opinion,-5,8)||!int(a.prestige,0,5))return false;if(r.success?(a.merit<0||a.opinion<0):(a.merit>0||a.opinion>0||a.prestige!==0))return false;seen.add(a.person);}
  }else {if(t.result!==null||busy.has(t.officer))return false;busy.add(t.officer);if(t.helper){if(busy.has(t.helper as string))return false;busy.add(t.helper as string);}counts[String(t.realm)]=(counts[String(t.realm)]??0)+1;if(counts[String(t.realm)]>3)return false;}
  if(!Array.isArray(t.history)||t.history.length<1||t.history.length>32)return false;let previous=t.created;
  for(const h of t.history){if(!obj(h)||!int(h.day,previous,day)||!text(h.text,500)||!h.text)return false;previous=h.day;}
 }
 return true;
}
