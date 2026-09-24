import {allegianceRealm} from './officeEligibility';
import {relationshipPersonById} from '../data/relationships';
import { governingExecutives } from './government';
import { ministryIds,movementIds,phaseIds,policyIds } from '../data/court';
import { historicalCharacters } from '../data/characters';
import type { World } from './types';
import type { RealmId } from './realm';
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const int=(v:unknown,min:number,max:number):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
export const validDynastyName=(v:unknown):v is string=>typeof v==='string'&&/^\p{Script=Han}{1,6}$/u.test(v);
export function validCourt(w:World,r:RealmId):boolean{
 const g=w.realm!.governments!.realms[r],c:unknown=g.court;if(c===undefined)return true;
 if(!obj(c)||c.version!==1||!int(c.since,0,w.day)||!int(c.lastMonthly,Math.floor(c.since/30)*30,w.day)||c.lastMonthly%30!==0||c.regimeId!==g.regimeId||c.tenure!==g.ruler+'|'+governingExecutives(w,r).join('|')||!phaseIds.includes(c.phase as never)||!policyIds.includes(c.policy as never)||!int(c.tension,0,100)||!int(c.corruption,0,100)||!obj(c.ministries)||!obj(c.members)||!obj(c.boosts)||!obj(c.cooldowns)||c.favored!==null&&!movementIds.filter(k=>k!=='unaligned').includes(c.favored as never))return false;
 const people=historicalCharacters.filter(p=>p.polity===r).map(p=>p.id);const person=(id:unknown):id is string=>typeof id==='string'&&!!relationshipPersonById[id];
 if(Object.entries(c.members).some(([id,m])=>!person(id)||!movementIds.includes(m as never))||!people.every(id=>Object.hasOwn(c.members as object,id)&&movementIds.includes((c.members as Record<string,never>)[id])))return false;
 if(Object.keys(c.ministries).length!==ministryIds.length||!ministryIds.every(id=>Object.hasOwn(c.ministries as object,id)&&((c.ministries as Record<string,unknown>)[id]===null||person((c.ministries as Record<string,unknown>)[id])&&allegianceRealm(w,(c.ministries as Record<string,string>)[id])===r)))return false;
 const holders=Object.values(c.ministries).filter(v=>v!==null);if(new Set(holders).size!==holders.length)return false;
 for(const [id,b] of Object.entries(c.boosts))if(!person(id)||!obj(b)||!int(b.until,c.since,w.day+180)||b.power!==25)return false;
 const keys=['petition','favor','audit',...people.flatMap(id=>['join|'+id,'convince|'+id,'debate|'+id]),...ministryIds.map(id=>'appoint|'+id)];
 for(const [key,due] of Object.entries(c.cooldowns))if(!keys.includes(key)||!int(due,c.since,w.day+180))return false;
 if(c.petition!==null){const p=c.petition;if(!obj(p)||!person(p.sponsor)||!movementIds.filter(k=>k!=='unaligned').includes(p.group as never)||!int(p.due,w.day+1,w.day+15))return false;}
 if(c.founding!==null){const f=c.founding;if(!obj(f)||!person(f.sponsor)||!validDynastyName(f.name)||!['usurp','unify'].includes(String(f.mode))||!int(f.started,c.since,w.day)||f.required!==120||!int(f.progress,0,119)||f.progress>w.day-f.started||g.task!==null)return false;}
 if(!Array.isArray(c.history)||c.history.length>60)return false;let day=c.since;for(const e of c.history){if(!obj(e)||!int(e.day,day,w.day)||typeof e.text!=='string'||!e.text.length||e.text.length>500)return false;day=e.day;}
 return true;
}
