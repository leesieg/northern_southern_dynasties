import {getCharacter,getPerson} from './personRegistry';
import {allegianceRealm} from './officeEligibility';
import {worldRealms} from './polityRuntime';
import {isMonthStart} from './calendar';
import {personResidence} from './residence';
import {missionJourney} from './envoyTravel';
import {capital} from './realm';
import {siteById} from '../data/scenario';

import type { World } from './types';
import { type RealmId } from './realm';

import { diplomacyActions,diplomaticKey,diplomaticFactorNames } from './diplomacy';
import { governmentOf } from './government';
const obj=(v:unknown)=>!!v&&typeof v==='object'&&!Array.isArray(v);
const num=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const str=(v:unknown,max=200)=>typeof v==='string'&&v.length>0&&v.length<=max;
export function validDiplomacy(w:World){
 const realm=(v:unknown):v is RealmId=>worldRealms(w).includes(v as RealmId);
 const s=w.diplomacy;if(s===undefined)return true;
 if(!w.realm||!obj(s)||s.version!==1||!num(s.since,0,w.day)||!num(s.nextId,1,1_000_000)||!num(s.lastMonth,0,w.day)||!isMonthStart(s.lastMonth,w.scriptId)||!num(s.lastAI,0,w.day)||!obj(s.pairs)||!obj(s.credit)||!obj(s.subjects)||!obj(s.bases)||!Array.isArray(s.missions)||s.missions.length>6||!Array.isArray(s.history)||s.history.length>100)return false;
 if(s.returning!==null){const p=s.returning,j=w.people[0].journey;if(!obj(p)||p.actor!==w.characterId||!j||!Array.isArray(p.route)||p.route.join('|')!==j.route.join('|'))return false;}
 const countries=worldRealms(w),keys=countries.flatMap((a,i)=>countries.slice(i+1).map(b=>diplomaticKey(a,b)));if(Object.keys(s.pairs).length!==keys.length||Object.keys(s.credit).length!==countries.length||Object.keys(s.bases).length!==countries.length)return false;
 for(const r of worldRealms(w))if(!num(s.credit[r],0,100)||!str(s.bases[r])||(w.realm.governments&&s.bases[r]!==governmentOf(w,r)?.regimeId))return false;
 for(const [key,p] of Object.entries(s.pairs)){
 if(!keys.includes(key)||!obj(p)||!realm(p.a)||!realm(p.b)||p.a===p.b||diplomaticKey(p.a,p.b)!==key||!num(p.opinion,-100,100)||typeof p.recognized!=='boolean'||!Array.isArray(p.treaties)||p.treaties.length>8||!obj(p.cooldowns))return false;
 if(p.opinionFactors!==undefined){const f=p.opinionFactors;if(!obj(f)||!num(f.base,-100,100)||!obj(f.effects)||Object.entries(f.effects).some(([k,v])=>!Object.hasOwn(diplomaticFactorNames,k)||!num(v,-1000000,1000000))||f.base+Object.values(f.effects).reduce((sum,v)=>sum+(v??0),0)!==p.opinion)return false;}
 const seen=new Set<string>();for(const t of p.treaties){if(!obj(t)||!['transit','safe','military','pact','alliance'].includes(t.kind)||!realm(t.from)||!realm(t.to)||t.from===t.to||diplomaticKey(t.from,t.to)!==key||!num(t.since,s.since,w.day)||!num(t.until,t.since+1,w.day+720)||t.until!==t.since+(t.kind==='safe'?240:720))return false;if(t.meeting!==undefined&&(t.kind!=='safe'||!['invited','held'].includes(t.meeting)))return false;const tk=t.kind+(['pact','alliance'].includes(t.kind)?'':t.from);if(seen.has(tk))return false;seen.add(tk);if(t.kind==='safe'?(typeof t.actor!=='string'||! getCharacter(w,t.actor)!||allegianceRealm(w,t.actor)!==t.from):t.actor!==null)return false;}
 for(const [k,v] of Object.entries(p.cooldowns)){const [r,action,...extra]=k.split('|');if(extra.length||![p.a,p.b].includes(r as RealmId)||!Object.hasOwn(diplomacyActions,action)||!num(v,0,w.day+360))return false;}
 }
 for(const [r,overlord] of Object.entries(s.subjects)){if(!realm(r)||!realm(overlord)||r===overlord)return false;const seen=new Set<string>([r]);let n:RealmId|undefined=overlord;while(n){if(seen.has(n))return false;seen.add(n);n=s.subjects[n];}}
 const seen=new Set<number>(),envoys=new Set<string>(),routes=new Set<string>();for(const m of s.missions){if(!obj(m)||!num(m.id,1,s.nextId-1)||seen.has(m.id)||!realm(m.from)||!realm(m.to)||m.from===m.to||!Object.hasOwn(diplomacyActions,m.action)||['revoke','insult','independence'].includes(m.action)||m.arrivalSite!==undefined&&!siteById[m.arrivalSite]||m.civilSide!==undefined&&(!['attack','defend'].includes(String(m.civilSide))||m.action!=='join')||m.action==='join'&&!num(m.war,1,(w.realm.nextWarId??2)-1)||m.action!=='join'&&m.war!==undefined||typeof m.actor!=='string'||!str(m.actor)||allegianceRealm(w,m.actor)!==m.from||!['traveling','audience','returning'].includes(m.status)||!num(m.sent,s.since,w.day)||!num(m.due,m.sent,m.sent+2000)||m.expires!==m.due+30||!num(m.expires,w.day+1,w.day+1030)||!Array.isArray(m.bases)||m.bases.length!==2||!m.bases.every(v=>str(v)))return false;
 if(m.envoy&&envoys.has(m.envoy))return false;if(m.envoy)envoys.add(m.envoy);
 if(m.envoy!==undefined&&(! getPerson(w,m.envoy)!||!siteById[m.home!]||!num(m.negotiation,2,14)||!num(m.lastTravel,m.sent,w.day)||m.arrived!==undefined&&!num(m.arrived,m.sent,w.day)||m.returnStarted!==undefined&&!num(m.returnStarted,m.sent,w.day)))return false;
 if(m.status==='returning'&&(!m.envoy||m.returnStarted===undefined))return false;
 if(m.envoy){const j=missionJourney(w,m.envoy),destination=m.status==='returning'?m.home!:m.arrivalSite??capital(m.to,w);if(j?j.route.at(-1)!==destination:personResidence(w,m.envoy).site!==destination)return false;if(m.status==='audience'&&j)return false;}
 if(m.status==='audience'&&m.due>w.day)return false;const k=m.from+'|'+m.to;if(routes.has(k))return false;seen.add(m.id);routes.add(k);
 }
 let last=s.since;for(const h of s.history){if(!obj(h)||!num(h.day,last,w.day)||!realm(h.from)||!realm(h.to)||h.from===h.to||!str(h.text,400))return false;last=h.day;}
 return true;
}
