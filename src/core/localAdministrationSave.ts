import {worldRealms} from './polityRuntime';
import {isMonthStart} from './calendar';
import {validAppointmentCycle} from './appointmentCycleSave';
import type {World} from './types';
import {territoryNodes} from '../data/territorialHierarchy';
import {relationshipPersonById} from '../data/relationships';
import {realms} from './realm';
const obj=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const person=(x:unknown)=>typeof x==='string'&&Object.hasOwn(relationshipPersonById,x);
const integer=(x:unknown,max=1e9)=>Number.isSafeInteger(x)&&Number(x)>=0&&Number(x)<=max;
const territory=(x:unknown)=>typeof x==='string'&&Object.hasOwn(territoryNodes,x)&&territoryNodes[x].level!=='realm';
export function validLocalAdministration(w:World){if(!validAppointmentCycle(w))return false;const s=w.realm?.local;if(s===undefined)return true;if(!obj(s)||s.version!==1||!integer(s.lastRecruitment,w.day)||!obj(s.seats)||!Array.isArray(s.requests)||s.requests.length>500||!integer(s.nextId)||s.nextId<1)return false;
 if(s.lastNPCRecruitment!==undefined&&(!integer(s.lastNPCRecruitment,w.day)||!isMonthStart(s.lastNPCRecruitment,w.scriptId)))return false;
 for(const [key,a] of Object.entries(s.seats)){const [r,t]=key.split('|');if(key.split('|').length!==2||!worldRealms(w).includes(r as typeof realms[number])||!territory(t)||!obj(a)||a.holder!==null&&(!person(a.holder)||['county','city'].includes(territoryNodes[t].level))||typeof a.delegated!=='boolean'||a.actingUntil!==null&&!integer(a.actingUntil,w.day+90)||!integer(a.since,w.day)||typeof a.regime!=='string'||a.regime.length>100||!integer(a.order,100)||!integer(a.prosperity,100)||!integer(a.population)||!integer(a.assessed,w.day)||typeof a.assessment!=='string'||a.assessment.length>300)return false;}
 const ids=new Set<number>(),pending=new Set<string>();for(const q of s.requests){if(!obj(q)||!integer(q.id)||q.id<1||q.id>=s.nextId||ids.has(q.id)||!worldRealms(w).includes(q.realm)||!territory(q.territory)||!person(q.actor)||!person(q.candidate)||!person(q.approver)||!integer(q.created,w.day)||!integer(q.changed,w.day)||q.changed<q.created||!['pending','approved','rejected','cancelled'].includes(q.status)||typeof q.reply!=='string'||q.reply.length>200)return false;if(q.status==='pending'){const key=q.territory+'|'+q.candidate;if(pending.has(key))return false;pending.add(key);}ids.add(q.id);}return true;}
