import {activityKinds,type MobilityState} from './mobilityState';
import {siteById,roads} from '../data/scenario';
import {relationshipPersonById} from '../data/relationships';
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const num=(v:unknown,max=400000):v is number=>Number.isSafeInteger(v)&&Number(v)>=0&&Number(v)<=max;
const person=(v:unknown):v is string=>typeof v==='string'&&Object.hasOwn(relationshipPersonById,v);
const site=(v:unknown):v is string=>typeof v==='string'&&Object.hasOwn(siteById,v);
const realm=(v:unknown)=>['liang','east','west'].includes(String(v));
export function validMobility(v:unknown,day:number):v is MobilityState{
 if(!obj(v)||v.version!==1||!num(v.since,day)||!num(v.lastDay,day)||!num(v.nextId)||!num(v.reported)||!obj(v.residences)||!obj(v.appointments)||!obj(v.cooldowns)||!obj(v.commanders)||!Array.isArray(v.activities)||v.activities.length>36)return false;
 for(const [id,p] of Object.entries(v.residences)){
  if(!person(id)||!obj(p)||!site(p.site))return false;
  if(p.journey!==null){const j=p.journey;if(!obj(j)||!Array.isArray(j.route)||j.route.length<2||j.route.length>200||!j.route.every(site)||!Array.isArray(j.durations)||j.durations.length!==j.route.length-1||!j.durations.every(n=>num(n,10000)&&n>0)||!num(j.leg,j.durations.length-1)||!num(j.elapsed,Number(j.durations[Number(j.leg)])-1)||!num(j.started,day)||j.route[Number(j.leg)]!==p.site)return false;const route=j.route;for(let i=0;i<route.length-1;i++)if(!roads.some(r=>r.from===route[i]&&r.to===route[i+1]||r.to===route[i]&&r.from===route[i+1]))return false;}
 }
 for(const [id,a] of Object.entries(v.appointments))if(!person(id)||!obj(a)||!site(a.site)||!num(a.until,day+10000))return false;
 for(const [key,value] of Object.entries(v.cooldowns))if(key.length>180||!num(value,day+10000))return false;
 for(const [r,id] of Object.entries(v.commanders))if(!realm(r)||!person(id))return false;
 if(v.captivity!==null&&(!obj(v.captivity)||!realm(v.captivity.captor)||!site(v.captivity.site)||!num(v.captivity.since,day)))return false;
 if(v.stance!==undefined&&!['balanced','attack','guard'].includes(String(v.stance)))return false;
 const ids=new Set<number>();
 for(const a of v.activities){if(!obj(a)||!num(a.id,Number(v.nextId)-1)||ids.has(a.id)||!person(a.actor)||!activityKinds.includes(a.kind as never)||!site(a.site)||a.target!==null&&!person(a.target)||a.delegate!==null&&!person(a.delegate)||!num(a.created,day)||!num(a.deadline,day+10000)||Number(a.deadline)<Number(a.created)||a.started!==null&&!num(a.started,day)||a.due!==null&&!num(a.due,day+10000)||!['travel','ready','working','decision','done','cancelled'].includes(String(a.phase))||typeof a.result!=='string'||a.result.length>1000||a.choice!==null&&!['measured','decisive'].includes(String(a.choice)))return false;
 if(['working','decision','done'].includes(String(a.phase))&&(a.started===null||a.due===null||Number(a.due)<Number(a.started)))return false;
 ids.add(a.id);
 }
 for(const [id,a] of Object.entries(v.appointments))if(!v.activities.some(t=>obj(t)&&t.target===id&&!['done','cancelled'].includes(String(t.phase))&&t.site===(a as Record<string,unknown>).site&&t.deadline===(a as Record<string,unknown>).until))return false;
 const busy=new Set<string>();for(const a of v.activities){const t=a as Record<string,unknown>;if(['done','cancelled'].includes(String(t.phase)))continue;for(const id of [t.delegate??t.actor,t.target].filter(Boolean)){if(busy.has(String(id)))return false;busy.add(String(id));}if(t.target&&!Object.hasOwn(v.appointments,String(t.target)))return false;}
 for(const [r,id] of Object.entries(v.commanders))if(relationshipPersonById[String(id)].realm!==r||busy.has(String(id)))return false;
 return true;
}
