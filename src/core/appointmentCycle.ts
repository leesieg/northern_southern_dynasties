import {isAdventurer} from './resignation';
import {governmentOf,governingAuthority} from './government';
import {realms,type RealmId} from './realm';
import {relationshipPeople,relationshipPersonById} from '../data/relationships';
import {territoryNodes} from '../data/territorialHierarchy';
import {getScript} from '../data/scripts';
import {familyPrestige} from './family';
import {personInfluence,awardInfluence} from './personalInfluence';
import {allegianceRealm,publicOfficeReason} from './officeEligibility';
import {canonicalTerritory,localHolder,localActive,localSites,localLevel,localTitle,candidateReason,issue,consequence,setLocalHolder,localOfficeCost} from './localAdministration';
import type {World} from './types';
export const APPOINTMENT_YEARS=3;
export interface AppointmentRow {territory:string;incumbent:string|null;candidate:string|null;merit:number;prestige:number;family:number;score:number;previousRank:number;edited:boolean}
export interface AppointmentRound {year:number;created:number;regime:string;approver:string;status:'pending'|'approved'|'rejected'|'cancelled';rows:AppointmentRow[];reason:string}
export interface AppointmentCycle {lastYear:number;rounds:Partial<Record<RealmId,AppointmentRound>>}
export type AppointmentCommand={type:'appointments';action:'approve'|'reject'|'refresh';realm:RealmId;year:number}|{type:'appointments';action:'edit';realm:RealmId;year:number;territory:string;candidate:string};
export const appointmentYear=(w:World)=>new Date(Date.UTC(getScript(w.scriptId).year,0,1+w.day)).getUTCFullYear();
export const appointmentApprover=(w:World,r:RealmId)=>governingAuthority(w,r)??governmentOf(w,r)!.ruler;
export const appointmentRank=(t:string)=>localLevel(t)==='province'?3:localLevel(t)==='prefecture'?2:1;
export function appointmentFactors(w:World,id:string,r:RealmId){const merit=governmentOf(w,r)?.merit[id]??0,prestige=w.families?.prestige[id]??0,family=familyPrestige(w,relationshipPersonById[id].family);return {merit,prestige,family,score:merit+Math.min(30,Math.floor(prestige/10))+Math.min(20,Math.floor(family/100))};}
function positions(w:World,r:RealmId){return Object.values(territoryNodes).filter(n=>n.level!=='realm'&&canonicalTerritory(n.id)===n.id&&localSites(w,n.id,r).length&&localActive(w,n.id,r)).sort((a,b)=>appointmentRank(b.id)-appointmentRank(a.id)||a.id.localeCompare(b.id));}
function rankOf(w:World,id:string,r:RealmId){return positions(w,r).reduce((max,n)=>localHolder(w,n.id,r)===id?Math.max(max,appointmentRank(n.id)):max,0);}
export function makeAppointmentRound(w:World,r:RealmId,year=appointmentYear(w)):AppointmentRound{
 const g=governmentOf(w,r)!,approver=appointmentApprover(w,r),used=new Set<string>(),posts=positions(w,r),eligible=relationshipPeople.filter(p=>allegianceRealm(w,p.id)===r&&!isAdventurer(w,p.id)&&!publicOfficeReason(w,p.id)&&p.id!==g.ruler&&!g.executives.includes(p.id)&&!Object.values(g.court?.ministries??{}).includes(p.id));
 for(const n of posts){const holder=localHolder(w,n.id,r);if(holder&&(g.type==='feudal'||!eligible.some(p=>p.id===holder)||w.realm!.offices.some(o=>canonicalTerritory(o.territory??'city:'+o.site)===n.id)))used.add(holder);}
 const scores=new Map(eligible.map(p=>[p.id,appointmentFactors(w,p.id,r)])),ranks=new Map(eligible.map(p=>[p.id,rankOf(w,p.id,r)]));
 const rows:AppointmentRow[]=posts.map(n=>{
 const incumbent=localHolder(w,n.id,r),protectedPost=g.type==='feudal'||w.realm!.offices.some(o=>canonicalTerritory(o.territory??'city:'+o.site)===n.id)||!!incumbent&&!scores.has(incumbent);
 const minimum=appointmentRank(n.id)===3?60:appointmentRank(n.id)===2?35:0;
 const candidate=protectedPost?incumbent:eligible.filter(p=>!used.has(p.id)&&scores.get(p.id)!.score>=minimum&&!candidateReasonForList(w,n.id,p.id,r)).sort((a,b)=>scores.get(b.id)!.score-scores.get(a.id)!.score||Number(b.id===incumbent)-Number(a.id===incumbent)||a.id.localeCompare(b.id))[0]?.id??incumbent;
 if(candidate)used.add(candidate);const factors=candidate?appointmentFactors(w,candidate,r):{merit:0,prestige:0,family:0,score:0};return {territory:n.id,incumbent,candidate,...factors,previousRank:candidate?ranks.get(candidate)??rankOf(w,candidate,r):0,edited:false};
 });
 // A promoted incumbent must not also remain in a lower seat when candidates run out.
 const assigned=new Set<string>();for(const row of rows)if(row.candidate){if(assigned.has(row.candidate)&&row.candidate!==row.incumbent)row.candidate=null;else if(assigned.has(row.candidate)&&rows.some(other=>other!==row&&other.candidate===row.candidate&&other.candidate!==other.incumbent))row.candidate=null;else assigned.add(row.candidate);}
 for(const row of rows)if(!row.candidate)Object.assign(row,{merit:0,prestige:0,family:0,score:0,previousRank:0});
 return {year,created:w.day,regime:g.regimeId,approver,status:'pending',rows,reason:''};
}
function candidateReasonForList(w:World,t:string,id:string,r:RealmId){return isAdventurer(w,id)?'已主动辞官，须本人重新请任':localHolder(w,t,r)===id?'':candidateReason(w,t,id,r);}
export function appointmentChange(row:AppointmentRow){return row.candidate===row.incumbent?'留任':!row.candidate?'暂缺':!row.previousRank?'新授':appointmentRank(row.territory)>row.previousRank?'晋升':appointmentRank(row.territory)<row.previousRank?'降任':'平调';}
export function appointmentReason(w:World,c:AppointmentCommand,actor=w.characterId!){
 const q=w.realm?.local?.cycle?.rounds[c.realm];if(!w.realm||w.campaign?.status!=='active')return '本局已结束';if(!q||q.year!==c.year||q.status!=='pending')return '本轮铨选已结束';
 if(q.approver!==actor||appointmentApprover(w,c.realm)!==actor)return '须由本国最高执政者批示';if(q.regime!==governmentOf(w,c.realm)?.regimeId)return '政权已更替，原议案失效';
 if(c.action==='reject'||c.action==='refresh')return '';if(!['approve','edit'].includes(c.action))return '无效铨选操作';
 if(c.action==='edit'){const row=q.rows.find(row=>row.territory===c.territory);if(!row)return '未列入本轮铨选';if(row.candidate===c.candidate)return '人选未变化';const other=q.rows.find(other=>other!==row&&other.candidate===c.candidate);if(personInfluence(w,actor)<localOfficeCost('appoint')*(other?2:1))return '影响力不足：每处修改 20，交换两处需要 40';if(other&&row.candidate){const why=candidateReasonForList(w,other.territory,row.candidate,c.realm);if(why)return '交换职位：'+why;}return candidateReasonForList(w,c.territory,c.candidate,c.realm);}
 for(const row of q.rows){if(!localActive(w,row.territory,c.realm)||localHolder(w,row.territory,c.realm)!==row.incumbent)return '辖区或现任已变化，请重新编制名单';if(row.candidate&&row.candidate!==row.incumbent){const why=candidateReasonForList(w,row.territory,row.candidate,c.realm);if(why)return localTitle(row.territory)+'：'+why;}}
 return '';
}
export function actAppointments(w:World,c:AppointmentCommand,actor=w.characterId!){
 const why=appointmentReason(w,c,actor);if(why)throw new Error(why);const cycle=w.realm!.local!.cycle!,q=cycle.rounds[c.realm]!;
 if(c.action==='refresh'){cycle.rounds[c.realm]=makeAppointmentRound(w,c.realm,q.year);return;}
 if(c.action==='edit'){const row=q.rows.find(row=>row.territory===c.territory)!;const other=q.rows.find(other=>other!==row&&other.candidate===c.candidate);awardInfluence(w,actor,-localOfficeCost('appoint')*(other?2:1));if(other)Object.assign(other,{candidate:row.candidate,...(row.candidate?appointmentFactors(w,row.candidate,c.realm):{merit:0,prestige:0,family:0,score:0}),previousRank:row.candidate?rankOf(w,row.candidate,c.realm):0,edited:true});Object.assign(row,{candidate:c.candidate,...appointmentFactors(w,c.candidate,c.realm),previousRank:rankOf(w,c.candidate,c.realm),edited:true});return;}
 q.status=c.action==='reject'?'rejected':'approved';q.reason=c.action==='reject'?'本轮不调任，维持现任':'任命已颁下，候文书与人选抵达';
 if(c.action==='approve'){
 const changed=q.rows.filter(row=>row.candidate!==row.incumbent);
 // Release all affected posts before issuing orders so reciprocal transfers cannot
 // clear a newly installed officer. Arrival still uses the ordinary travel pipeline.
 for(const row of changed){consequence(w,row.territory,c.realm,actor);setLocalHolder(w,row.territory,c.realm,null);}
 for(const row of changed)if(row.candidate)issue(w,row.territory,row.candidate,c.realm,actor);
 }
 w.chronicle.push({day:w.day,person:'player',text:q.year+' 年铨选：'+q.reason+'。'});w.chronicle=w.chronicle.slice(-100);
}
export function advanceAppointments(w:World){
 if(!w.realm?.local)return;const year=appointmentYear(w),base=getScript(w.scriptId).year,cycle=w.realm.local.cycle??={lastYear:year,rounds:{}};
 for(const r of realms){const q=cycle.rounds[r];if(!q||q.status!=='pending')continue;const g=governmentOf(w,r)!;if(g.regimeId!==q.regime){q.status='cancelled';q.reason='改朝后原任命名单作废';continue;}q.approver=appointmentApprover(w,r);if(q.approver!==w.characterId&&w.day-q.created>=7){const command={type:'appointments',action:'approve',realm:r,year:q.year} as const;if(appointmentReason(w,command,q.approver)){q.status='cancelled';q.reason='任职条件变化，本轮未颁任命';}else actAppointments(w,command,q.approver);}}
 if(year>cycle.lastYear){cycle.lastYear=year;if((year-base)%APPOINTMENT_YEARS===0)for(const r of realms)if(cycle.rounds[r]?.status!=='pending')cycle.rounds[r]=makeAppointmentRound(w,r,year);}
}
export function appointmentPauses(w:World){if(w.campaign?.status!=='active')return [];return realms.flatMap(r=>{const q=w.realm?.local?.cycle?.rounds[r];return q?.status==='pending'&&q.approver===w.characterId?[{id:`appointments:${r}:${q.year}`,kind:'appointments' as const,appointmentRealm:r,title:'三年铨选 · '+q.year,body:'审阅地方官任命清单，可批准、维持现任，或花费影响力修改人选。'}]:[];});}
