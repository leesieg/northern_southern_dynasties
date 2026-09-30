import {isMonthStart,monthStart} from './calendar';
import {ageAt} from './lifeState';
import { relationshipPeople,relationshipPersonById,historicalMarriages,relationshipActionNames } from '../data/relationships';
import { bondKey,closeKin,powerBasis } from './relationships';
import { realms } from './realm';
import { characterById } from '../data/characters';
import type { World } from './types';
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const int=(v:unknown,a:number,b:number):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=a&&v<=b;
const person=(v:unknown):v is string=>typeof v==='string'&&Object.hasOwn(relationshipPersonById,v);
const keyPair=(key:string)=>{const ids=key.split('|');return ids.length===2&&person(ids[0])&&person(ids[1])&&ids[0]!==ids[1];};
export function validRelationships(w:World):boolean{
 const s:unknown=w.relationships;if(s===undefined)return true;
 if(!obj(s)||s.version!==1||!w.characterId||!w.social||!int(s.since,0,w.day)||!int(s.lastMonthly,monthStart(s.since,w.scriptId),w.day)||!isMonthStart(s.lastMonthly,w.scriptId)||!int(s.seed,0,0xffffffff)||!obj(s.bonds)||!obj(s.opinions)||!obj(s.hooks)||!obj(s.reserves)||!obj(s.maritalBasis)||!obj(s.oaths)||!obj(s.regencies)||!obj(s.cooldowns)||!Array.isArray(s.marriages)||s.marriages.length>300)return false;
 if(s.allegiances!==undefined&&(!obj(s.allegiances)||Object.entries(s.allegiances).some(([id,a])=>!person(id)||!obj(a)||!realms.includes(a.realm as never)||!realms.includes(a.from as never)||a.realm===a.from&&a.source!=='custody'||!int(a.since,0,w.day)||a.source!==undefined&&a.source!=='custody'||!int(a.army,a.source==='custody'?0:1,(w.realm?.nextArmyId??1)-1))))return false;
 const n=relationshipPeople.length;if(Object.keys(s.reserves).length!==n||Object.keys(s.maritalBasis).length!==n||!relationshipPeople.every(p=>Object.hasOwn(s.reserves as object,p.id)&&int((s.reserves as Record<string,unknown>)[p.id],0,1_000_000)&&Object.hasOwn(s.maritalBasis as object,p.id)&&['unknown','recorded','simulation','widowed','free'].includes(String((s.maritalBasis as Record<string,unknown>)[p.id]))))return false;
 for(const [key,b] of Object.entries(s.bonds))if(!obj(b)||!person(b.a)||!person(b.b)||b.a===b.b||key!==bondKey(b.a,b.b)||!['friend','confidant','rival','nemesis'].includes(String(b.kind))||!int(b.since,s.since,w.day))return false;
 for(const field of ['opinions','hooks'] as const)for(const [key,v] of Object.entries(s[field] as Record<string,unknown>))if(!keyPair(key)||Object.hasOwn(w.social[field],key)||!int(v,field==='opinions'?-100:0,field==='opinions'?100:3))return false;
 const active=new Set<string>(),ids=new Set<string>(),intervals=new Map<string,{from:number;until:number}[]>();
 for(const m of s.marriages){if(!obj(m)||typeof m.id!=='string'||ids.has(m.id)||!person(m.a)||!person(m.b)||m.a===m.b||!int(m.from,s.since,w.day)||m.until!==null&&!int(m.until,m.from,w.day)||!['historical','simulation'].includes(String(m.origin)))return false;ids.add(m.id);
 if(m.origin==='historical'){const index=historicalMarriages.findIndex(p=>p.a===m.a&&p.b===m.b);if(index<0||m.id!=='marriage:historical:'+index||m.from!==s.since)return false;}
 else if(m.id!==`marriage:simulation:${m.a}:${m.from}:${s.marriages.indexOf(m)}`||w.life&&m.from>w.life.since&&((ageAt(w,m.a,m.from)??0)<18||(ageAt(w,m.b,m.from)??0)<18)||relationshipPersonById[m.a].sex===relationshipPersonById[m.b].sex||closeKin(m.a,m.b))return false;
 for(const id of [m.a,m.b]){if(m.until===null){if(active.has(id))return false;active.add(id);}const rows=intervals.get(id)??[];rows.push({from:m.from,until:m.until===null?Infinity:m.until as number});intervals.set(id,rows);}
 }
 if(!historicalMarriages.every((_,i)=>ids.has('marriage:historical:'+i)))return false;
 for(const rows of intervals.values()){rows.sort((a,b)=>a.from-b.from||a.until-b.until);for(let i=1;i<rows.length;i++)if(rows[i].from<rows[i-1].until)return false;}
 for(const [id,o] of Object.entries(s.oaths)){if(!person(id)||!obj(o)||!person(o.lord)||o.lord===id||relationshipPersonById[id].realm!==relationshipPersonById[o.lord].realm&&(w.relationships?.allegiances?.[id]?.realm??relationshipPersonById[id].realm)!==(w.relationships?.allegiances?.[o.lord]?.realm??relationshipPersonById[o.lord].realm)||!int(o.since,s.since,w.day)||!int(o.loyalty,1,100))return false;const seen=new Set([id]);let next:string|undefined=o.lord;while(next){if(seen.has(next))return false;seen.add(next);const parent=s.oaths[next];if(parent!==undefined&&!obj(parent))return false;next=parent?.lord as string|undefined;}}
 for(const [r,v] of Object.entries(s.regencies)){if(!realms.includes(r as never)||!obj(v)||v.realm!==r||!person(v.ruler)||!person(v.controller)||relationshipPersonById[v.ruler].realm!==r||relationshipPersonById[v.controller].realm!==r||!int(v.since,s.since,w.day)||!int(v.grip,0,100)||!['scenario','scheme','restored'].includes(String(v.origin))||typeof v.regimeId!=='string'||typeof v.basis!=='string')return false;const g=w.realm?.governments?.realms[r as typeof realms[number]];if(g&&(v.regimeId!==g.regimeId||v.ruler!==g.ruler||v.basis!==powerBasis(w,r as typeof realms[number])))return false;if(v.origin==='restored'?(v.controller!==v.ruler||v.grip!==0):(v.controller===v.ruler||v.grip===0))return false;if(v.origin==='scenario'&&g&&v.controller!==g.executives[0])return false;if(v.origin==='scheme'&&!Object.hasOwn(characterById,v.controller))return false;}
 for(const [key,due] of Object.entries(s.cooldowns)){const [a,b,action,...extra]=key.split('|');if(extra.length||!person(a)||!person(b)||a===b||!Object.hasOwn(relationshipActionNames,action)||!int(due,0,w.day+360))return false;}
 if(s.scheme!==null){const p=s.scheme;if(!obj(p)||!['befriend','control'].includes(String(p.kind))||p.actor!==w.characterId||!person(p.target)||p.target===p.actor||!int(p.started,s.since,w.day)||!int(p.due,w.day+1,w.day+30)||p.due!==p.started+(p.kind==='control'?30:14)||!int(p.chance,5,95)||w.social.scheme!==null)return false;if(p.kind==='control'){const r=characterById[w.characterId].polity;if(!w.realm||p.basis!==powerBasis(w,r)||p.target!==w.realm.governments?.realms[r].ruler)return false;}else if(p.basis!==null)return false;}
 if(!Array.isArray(s.history)||s.history.length>100)return false;let day=s.since;for(const e of s.history){if(!obj(e)||!person(e.actor)||e.target!==null&&!person(e.target)||!int(e.day,day,w.day)||typeof e.text!=='string'||!e.text.length||e.text.length>400)return false;day=e.day;}
 return true;
}
