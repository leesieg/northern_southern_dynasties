import {relationshipPersonById} from '../data/relationships';
import {territoryNodes} from '../data/territorialHierarchy';
import {appointmentYear} from './appointmentCycle';
import {realms} from './realm';
import type {World} from './types';
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const int=(v:unknown,max:number)=>Number.isSafeInteger(v)&&Number(v)>=0&&Number(v)<=max;
const person=(v:unknown)=>typeof v==='string'&&Object.hasOwn(relationshipPersonById,v);
export function validAppointmentCycle(w:World){const s=w.realm?.local?.cycle;if(s===undefined)return true;if(!obj(s)||!int(s.lastYear,appointmentYear(w))||!obj(s.rounds)||Object.keys(s.rounds).some(r=>!realms.includes(r as typeof realms[number])))return false;
 for(const q of Object.values(s.rounds)){if(!obj(q)||!int(q.year,s.lastYear)||!int(q.created,w.day)||typeof q.regime!=='string'||q.regime.length>100||!person(q.approver)||!['pending','approved','rejected','cancelled'].includes(String(q.status))||typeof q.reason!=='string'||q.reason.length>200||!Array.isArray(q.rows)||q.rows.length>400)return false;const seen=new Set<string>(),assigned=new Map<string,string>();for(const row of q.rows){if(!obj(row)||typeof row.territory!=='string'||!Object.hasOwn(territoryNodes,row.territory)||territoryNodes[row.territory].level==='realm'||seen.has(row.territory)||row.incumbent!==null&&!person(row.incumbent)||row.candidate!==null&&!person(row.candidate)||!int(row.merit,100)||!int(row.prestige,1e6)||!int(row.family,1e9)||!int(row.score,150)||row.score!==Number(row.merit)+Math.min(30,Math.floor(Number(row.prestige)/10))+Math.min(20,Math.floor(Number(row.family)/100))||!int(row.previousRank,3)||typeof row.edited!=='boolean')return false;seen.add(row.territory);if(typeof row.candidate==='string'){if(assigned.has(row.candidate)&&(row.candidate!==row.incumbent||assigned.get(row.candidate)!==row.candidate))return false;assigned.set(row.candidate,row.incumbent as string);}}}
 return true;
}
