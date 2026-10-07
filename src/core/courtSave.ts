import {getPerson} from './personRegistry';
import {constitutionalExecutives} from './government';
import {isMonthStart,monthStart} from './calendar';
import {policyDefinition,policyDimensions} from '../data/governancePolicies';
import {policyDomains} from './politicalActions';
import {siteById} from '../data/scenario';
import {allegianceRealm} from './officeEligibility';

import { ministryIds,movementIds,phaseIds,policyIds } from '../data/court';
import { historicalCharacters } from '../data/characters';
import type { World } from './types';
import type { RealmId } from './realm';
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const int=(v:unknown,min:number,max:number):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
export const validDynastyName=(v:unknown):v is string=>typeof v==='string'&&/^\p{Script=Han}{1,6}$/u.test(v);
export function validCourt(w:World,r:RealmId):boolean{
 const g=w.realm!.governments!.realms[r],c:unknown=g.court;if(c===undefined)return true;
 if(!obj(c)||c.capitalLost!==undefined&&typeof c.capitalLost!=='boolean'||c.version!==1||!int(c.since,0,w.day)||!int(c.lastMonthly,monthStart(c.since,w.scriptId),w.day)||!isMonthStart(c.lastMonthly,w.scriptId)||c.regimeId!==g.regimeId||c.tenure!==g.ruler+'|'+constitutionalExecutives(w,r).join('|')||!phaseIds.includes(c.phase as never)||!policyIds.includes(c.policy as never)||!int(c.tension,0,100)||!int(c.corruption,0,100)||!obj(c.ministries)||!obj(c.members)||!obj(c.boosts)||!obj(c.cooldowns)||c.favored!==null&&!movementIds.filter(k=>k!=='unaligned').includes(c.favored as never))return false;
 const people=historicalCharacters.filter(p=>p.polity===r).map(p=>p.id);const person=(id:unknown):id is string=>typeof id==='string'&&!! getPerson(w,id)!;
 if(c.impacts!==undefined&&(!Array.isArray(c.impacts)||c.impacts.length>80||new Set(c.impacts.map(v=>v?.source)).size!==c.impacts.length||!c.impacts.every(v=>obj(v)&&typeof v.source==='string'&&v.source.length>0&&v.source.length<=160&&int(v.day,Number(c.since),w.day)&&policyDomains.includes(v.domain as never)&&(v.site===null||typeof v.site==='string'&&Object.hasOwn(siteById,v.site))&&(v.actor===null||person(v.actor))&&(v.authorizer===null||person(v.authorizer))&&['commitment','execution','completion'].includes(String(v.stage))&&(v.policyRevision===null||int(v.policyRevision,1,1000000))&&typeof v.scale==='number'&&Number.isFinite(v.scale)&&v.scale>=0&&v.scale<=2&&(v.plan===null||['balanced','urgent','thorough'].includes(String(v.plan)))&&(v.dimension===null?v.rule===null:policyDimensions.includes(v.dimension as never)&&typeof v.rule==='string'&&!!policyDefinition(v.dimension as never,v.rule))&&int(v.support,-100,100)&&int(v.tension,0,100)&&Array.isArray(v.parts)&&v.parts.length<=4&&new Set(v.parts.map(p=>p?.id)).size===v.parts.length&&v.parts.every(p=>obj(p)&&p.id!=='unaligned'&&movementIds.includes(p.id as never)&&int(p.value,-1000,1000)))))return false;
 if(c.politicalWindows!==undefined&&(!obj(c.politicalWindows)||Object.keys(c.politicalWindows).length>policyDomains.length*Object.keys(siteById).length*3||Object.entries(c.politicalWindows).some(([key,v])=>{const [domain,site,stage,...rest]=key.split('|');return rest.length||!policyDomains.includes(domain as never)||!Object.hasOwn(siteById,site)||!['commitment','execution','completion'].includes(stage)||!obj(v)||!int(v.until,Number(c.since),w.day+30)||typeof v.used!=='number'||!Number.isFinite(v.used)||v.used<0||v.used>2||typeof v.support!=='number'||!Number.isFinite(v.support)||Math.abs(v.support)>1000||typeof v.opposition!=='number'||!Number.isFinite(v.opposition)||v.opposition<0||v.opposition>1000;})))return false;
 if(Object.entries(c.members).some(([id,m])=>!person(id)||!movementIds.includes(m as never))||!people.every(id=>Object.hasOwn(c.members as object,id)&&movementIds.includes((c.members as Record<string,never>)[id])))return false;
 if(Object.keys(c.ministries).length!==ministryIds.length||!ministryIds.every(id=>Object.hasOwn(c.ministries as object,id)&&((c.ministries as Record<string,unknown>)[id]===null||person((c.ministries as Record<string,unknown>)[id])&&allegianceRealm(w,(c.ministries as Record<string,string>)[id])===r)))return false;
 const holders=Object.values(c.ministries).filter(v=>v!==null);if(new Set(holders).size!==holders.length)return false;
 // The last monthly settlement remains historical fact when a later founding changes the live phase.
 if(c.settlement!==undefined){const q=c.settlement;if(!obj(q)||!int(q.day,c.since,w.day)||q.day!==c.lastMonthly||!isMonthStart(q.day,w.scriptId)||!phaseIds.includes(q.from as never)||!phaseIds.includes(q.to as never)||!int(q.tensionBefore,0,100)||!int(q.tensionAfter,0,100)||!int(q.supportDelta,-100,100)||!int(q.corruptionDelta,-100,100)||q.tensionAfter!==Math.max(0,Math.min(100,Number(q.tensionBefore)+(Array.isArray(q.causes)?q.causes.reduce((n,v)=>n+Number(v?.value),0):NaN)))||!Array.isArray(q.causes)||q.causes.length>20||!q.causes.every(v=>obj(v)&&typeof v.label==='string'&&v.label.length>0&&v.label.length<=100&&int(v.value,-100,100)))return false;}
 for(const [id,b] of Object.entries(c.boosts))if(!person(id)||!obj(b)||!int(b.until,c.since,w.day+180)||b.power!==25)return false;
 const keys=['policy','governance-ai','petition','favor','audit',...people.flatMap(id=>['join|'+id,'convince|'+id,'debate|'+id]),...ministryIds.map(id=>'appoint|'+id)];
 for(const [key,due] of Object.entries(c.cooldowns))if(!keys.includes(key)||!int(due,c.since,w.day+180))return false;
 if(c.petition!==null){const p=c.petition;if(!obj(p)||!person(p.sponsor)||!movementIds.filter(k=>k!=='unaligned').includes(p.group as never)||!int(p.due,w.day+1,w.day+15))return false;}
 if(c.founding!==null){const f=c.founding;if(!obj(f)||!person(f.sponsor)||!validDynastyName(f.name)||!['usurp','unify'].includes(String(f.mode))||!int(f.started,c.since,w.day)||f.required!==120||!int(f.progress,0,119)||f.progress>w.day-f.started||g.task!==null)return false;}
 if(!Array.isArray(c.history)||c.history.length>60)return false;let day=c.since;for(const e of c.history){if(!obj(e)||!int(e.day,day,w.day)||typeof e.text!=='string'||!e.text.length||e.text.length>500)return false;day=e.day;}
 return true;
}
