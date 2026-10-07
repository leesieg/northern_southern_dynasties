import {getPerson} from './personRegistry';
import {worldRealms} from './polityRuntime';
import type {World} from './types';

import {siteById} from '../data/scenario';
import {isAlive} from './lifeState';
import {realms} from './realm';
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const num=(n:unknown,max:number):n is number=>Number.isSafeInteger(n)&&Number(n)>=0&&Number(n)<=max;
export function validCustody(w:World){
 const person=(id:unknown):id is string=>typeof id==='string'&&!!getPerson(w,id);

 const realm=(id:unknown)=>worldRealms(w).includes(id as typeof realms[number]);
 const s=w.custody;if(s===undefined)return true;
 if(!w.realm||w.mode!=='sandbox'||!obj(s)||s.version!==1||!num(s.nextId,1e9)||s.nextId<1||!num(s.lastDay,w.day)||!num(s.lastMonth,w.day)||!obj(s.records)||!Array.isArray(s.history)||s.history.length>200||!Array.isArray(s.warrants)||s.warrants.length>2000||!Array.isArray(s.promises)||s.promises.length>2000||!Array.isArray(s.guarantees)||s.guarantees.length>2000)return false;
 const privateHolders=new Set<string>();
 for(const [id,p] of Object.entries(s.records)){
  if(!person(id)||!obj(p)||p.war!==undefined&&(!num(p.war,1e9)||p.war<1||!['attack','defend'].includes(p.side!))||p.war===undefined&&p.side!==undefined||p.person!==id||!isAlive(w,id)||!realm(p.captor)||!realm(p.origin)||!siteById[p.site]||!num(p.since,w.day)||!['battle','city','arrest','abduction'].includes(p.cause)||typeof p.source!=='string'||p.source.length>120||!['guarded','honored','house'].includes(p.treatment)||p.army!==null&&!num(p.army,1e9)||p.captorPerson!==null&&!person(p.captorPerson)||p.talked!==null&&!num(p.talked,w.day)||typeof p.terms!=='string'||p.terms.length>300||!num(p.escapeAfter,w.day+30)||!num(p.ransom,400)||!['stipend','office',null].includes(p.offer))return false;
  if(p.cause==='abduction'){const scheme=w.intrigue?.schemes.find(q=>'scheme:'+q.id===p.source);if(!scheme||scheme.kind!=='abduct'||scheme.status!=='succeeded'||scheme.target!==id||scheme.actor!==p.captorPerson||scheme.realm!==p.captor||scheme.ended!==p.since||p.army!==null||p.war!==undefined||p.offer!==null||!p.captorPerson||privateHolders.has(p.captorPerson))return false;privateHolders.add(p.captorPerson);}
 }
 if(new Set(s.warrants.map(q=>q.id)).size!==s.warrants.length)return false;
 for(const q of s.warrants)if(!obj(q)||!num(q.id,s.nextId-1)||q.id<1||!person(q.person)||!person(q.issuer)||!realm(q.realm)||!siteById[q.site]||!num(q.issued,w.day)||!num(q.due,w.day+7)||typeof q.evidence!=='string'||q.evidence.length>200||!['pending','detained','refused','cancelled'].includes(q.status))return false;
 for(const h of s.history)if(!obj(h)||!num(h.day,w.day)||!person(h.person)||!realm(h.captor)||typeof h.source!=='string'||h.source.length>120||typeof h.result!=='string'||h.result.length>300)return false;
 for(const q of s.promises)if(!obj(q)||!person(q.person)||!person(q.lord)||!realm(q.realm)||!num(q.due,w.day+90)||q.kind!=='office'||!['pending','honored','broken'].includes(q.status))return false;
 for(const q of s.guarantees)if(!obj(q)||!person(q.person)||!person(q.payer)||!realm(q.realm)||!num(q.coins,100)||q.coins!==100||!num(q.due,w.day+90)||!['held','refunded','forfeited'].includes(q.status))return false;
 const p=s.records[w.characterId!],legacy=w.mobility?.captivity;if(p?(!legacy||legacy.captor!==p.captor||legacy.site!==p.site||legacy.since!==p.since):!!legacy)return false;
 return true;
}
