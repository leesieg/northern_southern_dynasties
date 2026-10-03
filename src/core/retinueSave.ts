import {getPerson} from './personRegistry';
import {isMonthStart,monthStart} from './calendar';

import {siteById} from '../data/scenario';
import {retinuePosts} from './retinue';
import type {RetinueState} from './retinue';
const obj=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const num=(x:unknown,max:number)=>Number.isSafeInteger(x)&&Number(x)>=0&&Number(x)<=max;
export function validRetinue(s:unknown,day:number,scriptId?:string,w?:import('./types').World):s is RetinueState{
 const person=(x:unknown):x is string=>typeof x==='string'&&!!getPerson(w,x);

 if(!obj(s)||s.version!==1||!num(s.since,day)||!num(s.lastMonth,day)||!isMonthStart(Number(s.lastMonth),scriptId)||Number(s.lastMonth)<monthStart(Number(s.since),scriptId)||!obj(s.members)||!obj(s.cooldowns)||!obj(s.recommendations)||!Array.isArray(s.history)||s.history.length>80)return false;
 const seats=new Set<string>(),counts:Record<string,number>={};
 for(const [id,m] of Object.entries(s.members)){
  if(!person(id)||!obj(m)||!person(m.host)||m.host===id||!num(m.joined,day)||Number(m.joined)<Number(s.since)||m.post!==null&&(typeof m.post!=='string'||!Object.hasOwn(retinuePosts,m.post))||m.site!==null&&(typeof m.site!=='string'||!Object.hasOwn(siteById,m.site))||!num(m.arrears,1))return false;
  if(getPerson(w,id)!.realm!==getPerson(w,m.host)!.realm||Object.hasOwn(s.members,m.host)||!m.post&&m.site!==null)return false;
  counts[m.host]=(counts[m.host]??0)+1;if(counts[m.host]>6)return false;
  if(m.post){const key=m.host+'|'+m.post;if(seats.has(key)||['engineer','marshal'].includes(String(m.post))&&!m.site)return false;seats.add(key);}
 }
 for(const [key,until] of Object.entries(s.cooldowns)){const [host,kind,subject,...rest]=key.split('|');if(rest.length||!person(host)||!num(until,day+90)||kind==='hire'&&!person(subject)||kind==='work'&&!['resupply','audit','drill','recommend'].includes(subject)||!['hire','work'].includes(kind))return false;}
 for(const [id,r] of Object.entries(s.recommendations))if(!person(id)||!obj(r)||!num(r.until,day+90)||!num(r.bonus,14)||Number(r.bonus)<4)return false;
 let last=Number(s.since);for(const h of s.history){if(!obj(h)||!person(h.host)||!person(h.person)||!num(h.day,day)||Number(h.day)<last||typeof h.text!=='string'||h.text.length>400)return false;last=Number(h.day);}
 return true;
}
