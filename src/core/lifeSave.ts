import {worldRealms} from './polityRuntime';
import {isMonthStart,monthStart} from './calendar';
import {birthRecords} from '../data/lifespans';
import {getPerson} from './personRegistry';
import {isAlive,lifeOf} from './lifeState';
import type {World} from './types';
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const int=(n:unknown,min:number,max:number):n is number=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=min&&n<=max;
export function validLife(w:World){
 const ids=[...Object.keys(birthRecords),...Object.keys(w.generatedPeople??{})];
 const s:unknown=w.life;if(s===undefined)return true;
 if(!obj(s)||s.version!==1||!int(s.since,0,w.day)||!int(s.lastMonthly,monthStart(s.since,w.scriptId),w.day)||!isMonthStart(s.lastMonthly,w.scriptId)||!int(s.seed,0,0xffffffff)||!obj(s.people)||Object.keys(s.people).length!==ids.length)return false;
 for(const id of ids){
  const p=s.people[id];if(!obj(p)||!int(p.health,0,100)||!int(p.careUntil,0,w.day+90)||(p.injuryUntil!==undefined&&!int(p.injuryUntil,0,w.day+60)))return false;
  if(p.illness!==null&&(!obj(p.illness)||!['fever','wasting','cold','flux'].includes(String(p.illness.kind))||!int(p.illness.since,s.since,w.day)||!int(p.illness.severity,1,3)))return false;
  if(p.death!==null&&(!obj(p.death)||!int(p.death.day,s.since,w.day)||!['illness','age','battle','execution','murder'].includes(String(p.death.cause))||p.health!==0||p.injuryUntil!==undefined||p.careUntil!==0||p.illness!==null&&Number(p.illness.since)>p.death.day))return false;
 }
 if(s.autoCare!==undefined&&(!obj(s.autoCare)||s.autoCare.payer!==(w.characterId??'fictional')||typeof s.autoCare.payer!=='string'||!isAlive(w,s.autoCare.payer)||!int(s.autoCare.remaining,30,90)||s.autoCare.remaining%30!==0))return false;
 if(!Array.isArray(s.successions)||s.successions.length>ids.length)return false;
 let last=s.since;const departed=new Set<string>();
 for(const e of s.successions){
  if(!obj(e)||!worldRealms(w).includes(e.realm as never)||typeof e.regimeId!=='string'||e.stage!==null&&typeof e.stage!=='string'||!int(e.day,last,w.day)||typeof e.deceased!=='string'||departed.has(e.deceased)||lifeOf(w,e.deceased)?.death?.day!==e.day||!Array.isArray(e.executives)||e.executives.length>2||new Set(e.executives).size!==e.executives.length)return false;
  const person=(id:unknown)=>typeof id==='string'&&getPerson(w,id)?.realm===e.realm;
  if(!person(e.deceased)||!person(e.ruler)||!e.executives.every(person)||e.executives.some(id=>{const death=lifeOf(w,id)?.death;return death&&death.day<Number(e.day);}))return false;
  departed.add(e.deceased);last=e.day;
 }
 if(w.campaign&&!isAlive(w,w.characterId??'fictional')&&w.campaign.status!=='lost')return false;
 if(w.social&&(w.social.advisor&&!isAlive(w,w.social.advisor)||w.social.heir&&!isAlive(w,w.social.heir)||w.social.scheme&&!isAlive(w,w.social.scheme.target)))return false;
 if(w.relationships){const r=w.relationships;if(r.marriages.some(m=>m.until===null&&(!isAlive(w,m.a)||!isAlive(w,m.b)))||Object.entries(r.oaths).some(([id,o])=>!isAlive(w,id)||!isAlive(w,o.lord))||r.scheme&&(!isAlive(w,r.scheme.actor)||!isAlive(w,r.scheme.target)))return false;}
 if(w.realm){if(Object.values(w.realm.cities).some(c=>c.governor&&!isAlive(w,c.governor))||w.realm.offices.some(o=>!isAlive(w,o.candidate)))return false;
  for(const g of Object.values(w.realm.governments?.realms??{}))if(g.executives.some(id=>!isAlive(w,id))||Object.values(g.court?.ministries??{}).some(id=>id&&!isAlive(w,id)))return false;
 }
 return true;
}
