import {relationshipPersonById} from '../data/relationships';
import {publicFamily} from './publicSuccession';
import {ageAt,isAlive} from './lifeState';
import { validCourt,validDynastyName } from './courtSave';
import { governmentTypes,reformDefinitions,reformIds,successionDefinitions,successionIds,politicalFigures,type ReformId,type SuccessionId } from '../data/governments';
import { characterById,historicalCharacters } from '../data/characters';
import { siteById } from '../data/scenario';
import type { World } from './types';
import type { GovernmentState } from './government';
import { governmentYear } from './government';
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const int=(v:unknown,max:number,min=0):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const text=(v:unknown,max=100):v is string=>typeof v==='string'&&v.length>0&&v.length<=max;
const ids=['liang','east','west'] as const;
const person=(id:unknown,r:string)=>text(id)&&(Object.hasOwn(characterById,id)?characterById[id].polity===r:Object.hasOwn(politicalFigures,id)&&politicalFigures[id].realm===r);
const site=(id:unknown)=>text(id)&&Object.hasOwn(siteById,id);
const unique=(v:unknown):v is string[]=>Array.isArray(v)&&v.every(x=>typeof x==='string')&&new Set(v).size===v.length;
export function validGovernments(w:World):boolean {
 const state:unknown=w.realm?.governments;if(state===undefined)return true;
 if(!obj(state)||state.version!==1||!int(state.since,w.day)||!int(state.lastMonthly,w.day)||state.lastMonthly%30!==0||state.lastMonthly<Math.floor(state.since/30)*30||!obj(state.realms)||Object.keys(state.realms).length!==3)return false;
 if(!Array.isArray(state.regimes)||state.regimes.length<3||state.regimes.length>36||new Set(state.regimes.map(v=>v?.id)).size!==state.regimes.length)return false;
 if(!state.regimes.every(v=>obj(v)&&ids.includes(v.realm as never)))return false;
 for(const r of ids){const g=state.realms[r];if(!obj(g)||!governmentTypes.includes(g.type as never)||!text(g.dynasty)||!text(g.regimeId)||!person(g.ruler,r)||!unique(g.executives)||g.executives.length>2||!g.executives.every(id=>person(id,r))||!int(g.legitimacy,100)||!int(g.support,100)||!int(g.herd,1000)||!site(g.camp)||!int(g.lastCamp,w.day+90)||!obj(g.merit)||!obj(g.contracts)||!obj(g.cooldowns)||!unique(g.laws)||!unique(g.stages))return false;
 const roster=historicalCharacters.filter(c=>c.polity===r);if(Object.entries(g.merit).some(([id,n])=>!relationshipPersonById[id]||!int(n,100))||!roster.every(p=>Object.hasOwn(g.merit as object,p.id)&&int((g.merit as Record<string,unknown>)[p.id],100)))return false;
 if(!g.laws.every(id=>reformIds.includes(id as ReformId)&&reformDefinitions[id as ReformId].realm===r)||!reformIds.filter(id=>reformDefinitions[id].realm===r&&reformDefinitions[id].initial).every(id=>(g.laws as string[]).includes(id)))return false;
 if(!g.laws.every(id=>(reformDefinitions[id as ReformId].requires as readonly string[]).every(parent=>(g.laws as string[]).includes(parent))))return false;
 const route=successionIds.filter(id=>successionDefinitions[id].realm===r);if(!g.stages.every((id,i)=>id===route[i]))return false;
 const versions=state.regimes.filter(v=>v?.realm===r),latest=versions.at(-1);const natural=w.life?.successions.filter(e=>e.realm===r&&e.regimeId===g.regimeId&&e.stage===((g.stages as string[]).at(-1)??null));const succession=natural?.at(-1);if(succession){if(g.ruler!==succession.ruler||g.executives.join('|')!==succession.executives.join('|'))return false;}else if(latest?.kind==='sandbox'){if(g.ruler!==latest.ruler||g.executives.join('|')!==latest.ruler||g.dynasty!==latest.dynasty)return false;}else {const completed=g.stages.at(-1);if(completed){const d=successionDefinitions[completed as SuccessionId];if(g.ruler!==d.ruler||g.executives.join('|')!==d.executives.join('|')||g.dynasty!==(d.nextDynasty??r))return false;}else if(g.dynasty!==r||g.ruler!==({liang:'xiao-yan',east:'yuan-shanjian',west:'yuan-baoju'})[r]||g.executives.join('|')!==({liang:'xiao-yan',east:'gao-huan|gao-cheng',west:'yuwen-tai'})[r])return false;}
 if(g.heirs!==undefined){const h=g.heirs;if(!obj(h)||!['ruler','executive'].every(k=>h[k]===null||person(h[k],r)&&isAlive(w,h[k] as string)&&(ageAt(w,h[k] as string)??0)>=16)||h.ruler===g.ruler||h.executive===g.executives[0])return false;
 if(h.ruler!==null&&publicFamily(h.ruler as string)!==publicFamily(g.ruler as string)?!validDynastyName(h.dynasty):h.dynasty!==null)return false;}
 if(!validCourt(w,r))return false;
 if(g.laws.some(id=>governmentYear(w)<reformDefinitions[id as ReformId].year)||g.stages.some(id=>governmentYear(w)<successionDefinitions[id as SuccessionId].year))return false;
 for(const [id,contract] of Object.entries(g.contracts))if(!site(id)||!['balanced','tax','levy'].includes(String(contract)))return false;
 for(const [key,due] of Object.entries(g.cooldowns)){if(!['council',...roster.map(p=>p.id+'|appraise'),...Object.keys(siteById).map(id=>'contract|'+id)].includes(key)||!int(due,w.day+90))return false;}
 if(g.task!==null){const t=g.task;if(!obj(t)||!['government','law','succession'].includes(String(t.kind))||!text(t.target)||!int(t.started,w.day)||t.started<state.since||!int(t.required,240,1)||!int(t.progress,t.required-1)||t.progress>w.day-t.started||!roster.some(p=>p.id===t.sponsor))return false;
 if(t.kind==='government'){if(!governmentTypes.includes(t.target as never)||t.target===g.type||t.required!==180)return false;}
 if(t.kind==='law'){if(!reformIds.includes(t.target as ReformId))return false;const d=reformDefinitions[t.target as ReformId];if(d.realm!==r||d.initial||g.laws.includes(t.target)||t.required!==d.days||!(d.requires as readonly string[]).every(id=>(g.laws as string[]).includes(id))||governmentYear(w,t.started)<d.year)return false;}
 if(t.kind==='succession'){if(g.dynasty!==r||!successionIds.includes(t.target as SuccessionId))return false;const d=successionDefinitions[t.target as SuccessionId];if(d.realm!==r||g.stages.includes(t.target)||t.required!==90||d.previous&&!g.stages.includes(d.previous)||d.prerequisite&&!g.laws.includes(d.prerequisite)||governmentYear(w,t.started)<d.year)return false;}
 }
 if(versions.length<1||versions.length>12)return false;
 for(let i=0;i<versions.length;i++){
 const v=versions[i];if(!obj(v)||!person(v.ruler,r)||!int(v.from,w.day)||v.from<state.since||v.until!==null&&!int(v.until,w.day,v.from)||!unique(v.cities)||!v.cities.every(site)||v.predecessor!==(i===0?null:versions[i-1].id))return false;
 if(i===0){if(v.id!==r+'-0'||v.dynasty!==r||v.from!==state.since||v.kind!==undefined||v.name!==undefined||v.source!==null)return false;}
 else {
 if(v.from!==versions[i-1].until)return false;
 if(v.kind==='inheritance'){const transition=w.life?.successions.find(e=>e.realm===r&&e.regimeId===v.id&&e.day===v.from&&e.ruler===v.ruler);if(v.id!==`${r}-inheritance-${v.from}-${i}`||v.dynasty!==v.id||!validDynastyName(v.name)||v.source!==null||!transition||publicFamily(transition.deceased)===publicFamily(v.ruler as string))return false;}
 else if(v.kind==='sandbox'){if(v.id!==`${r}-sandbox-${v.from}`||v.dynasty!==v.id||!validDynastyName(v.name)||v.source!==null||!text(v.ruler)||!Object.hasOwn(characterById,v.ruler))return false;}
 else {const d=successionDefinitions[route[1]];if(!(g.stages as string[]).includes(route[1])||governmentYear(w,v.from)<d.year||i!==1||v.kind!==undefined||v.name!==undefined||v.id!==r+'-'+d.nextDynasty||v.dynasty!==d.nextDynasty||v.ruler!==d.ruler||v.source!==d.source.url)return false;}
 }
 }

 if(versions.at(-1)?.dynasty!==g.dynasty||versions.at(-1)?.id!==g.regimeId||versions.at(-1)?.until!==null)return false;
 }
 if(!Array.isArray(state.history)||state.history.length>80)return false;let last=state.since;
 for(const e of state.history){if(!obj(e)||!int(e.day,w.day,last)||!ids.includes(e.realm as never)||!text(e.kind)||!['start','cancel','appraise','council','camp','contract','complete','crisis'].includes(e.kind)||!text(e.target)||!text(e.text,400))return false;last=e.day;}
 return true;
}
// Explicit export for save-format tooling; no browser state is involved.
export type { GovernmentState };
