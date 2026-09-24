import type {World} from './types';
import {realms} from './realm';
import {siteById} from '../data/scenario';
import {characterById} from '../data/characters';
import {territoryNodes} from '../data/territorialHierarchy';
const obj=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const num=(x:unknown,max=1_000_000)=>Number.isSafeInteger(x)&&Number(x)>=0&&Number(x)<=max;
const person=(x:unknown)=>typeof x==='string'&&Object.hasOwn(characterById,x);
const account=(x:unknown)=>typeof x==='string'&&(realms.some(r=>x==='central:'+r)||realms.some(r=>x.startsWith(r+'|')&&x.split('|').length===2&&Object.hasOwn(territoryNodes,x.split('|')[1])&&territoryNodes[x.split('|')[1]].level!=='realm'));
export function validFiscal(w:World){const s=w.realm?.fiscal;if(s===undefined)return true;if(!obj(s)||s.version!==1||!obj(s.balances)||!Array.isArray(s.entries)||s.entries.length>1800||!Array.isArray(s.requests)||s.requests.length>300||!num(s.nextId)||!num(s.nextRequest)||!obj(s.net)||realms.some(r=>!Number.isSafeInteger(s.net[r])||Math.abs(s.net[r])>1e12))return false;
 if(Object.entries(s.balances).some(([key,n])=>!account(key)||key.startsWith('central:')||!num(n)))return false;
 const endpoint=(x:unknown)=>account(x)||['tax','expense','external'].includes(String(x))||typeof x==='string'&&/^task:\d+$/.test(x);
 let previous=0;for(const e of s.entries){if(!obj(e)||!num(e.id)||Number(e.id)<=previous||Number(e.id)>=s.nextId||!num(e.day,w.day)||!realms.includes(e.realm)||!endpoint(e.from)||!endpoint(e.to)||e.from===e.to||!num(e.coins)||!e.coins||typeof e.reason!=='string'||e.reason.length>120)return false;previous=Number(e.id);}
 const ids=new Set(),pending=new Set();for(const q of s.requests){if(!obj(q)||!num(q.id)||!q.id||q.id>=s.nextRequest||ids.has(q.id)||!realms.includes(q.realm)||!Object.hasOwn(siteById,q.site)||!person(q.actor)||!person(q.approver)||!num(q.amount,400)||q.amount<20||!['construction','relief','military'].includes(q.purpose)||!num(q.created,w.day)||!num(q.changed,w.day)||q.changed<q.created||!['pending','approved','rejected','cancelled'].includes(q.status)||typeof q.reply!=='string'||q.reply.length>200)return false;if(characterById[q.actor].polity!==q.realm||characterById[q.approver].polity!==q.realm)return false;if(q.status==='pending'){if(pending.has(q.site))return false;pending.add(q.site);}if(q.evaluation!==undefined&&(!Array.isArray(q.evaluation)||q.evaluation.length!==6||q.evaluation.some(p=>!obj(p)||typeof p.label!=='string'||p.label.length>30||!Number.isSafeInteger(p.value)||Math.abs(Number(p.value))>100)))return false;ids.add(q.id);}return true;}
