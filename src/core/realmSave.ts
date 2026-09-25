import {activeWars} from './wars';
import {validTraffic} from './roadCapacity';
import {troopKinds} from './armyOrganization';
import {territoryNodes,descendantSites} from '../data/territorialHierarchy';
import {relationshipPersonById} from '../data/relationships';
import {allegianceRealm} from './officeEligibility';
import {validPopulation} from './population';
import {lifeOf} from './lifeState';
import { validGovernments } from './governmentSave';
import { characterById,historicalCharacters } from '../data/characters';
import { sites,siteById } from '../data/scenario';
import { eventDefinitions,playerRealm,realms } from './realm';
import { legDays } from './world';
import type { World } from './types';
const obj=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const int=(n:unknown,min=0,max=1_000_000):n is number=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=min&&n<=max;
const realm=(id:unknown):id is typeof realms[number]=>realms.includes(id as typeof realms[number]);
const site=(id:unknown):id is string=>typeof id==='string'&&Object.hasOwn(siteById,id);
const character=(id:unknown):id is string=>typeof id==='string'&&Object.hasOwn(characterById,id);
export function validRealm(w:World):boolean {
 if(w.mode===undefined)return w.realm===undefined;
 if(w.mode!=='sandbox'||!character(w.characterId)||!w.social||w.campaign?.id!=='stewardship'||!(w.campaign.status==='active'&&w.campaign.finishedDay===null||w.campaign.status==='lost'&&w.campaign.finishedDay===w.day&&!!lifeOf(w,w.characterId)?.death))return false;
 if(!validPopulation(w))return false;
 if(!validGovernments(w))return false;
 const s=w.realm;if(!obj(s)||s.version!==1||!obj(s.cities)||Object.keys(s.cities).length!==sites.length||!obj(s.treasuries))return false;
 for(const id of sites.map(s=>s.id)){const c=s.cities[id];if(!obj(c)||(!realm(c.owner)&&c.owner!=='frontier')||(!realm(c.controller)&&c.controller!=='frontier')||!(c.population===undefined?int(c.households,100,10000):int(c.population,100,1_000_000))||(c.grain!==undefined&&!int(c.grain))||(c.irrigation!==undefined&&!int(c.irrigation,0,10))||!int(c.order,0,100)||!int(c.prosperity,0,100)||!['light','normal','heavy'].includes(String(c.tax))||(c.governor!==null&&(typeof c.governor!=='string'||!relationshipPersonById[c.governor]||allegianceRealm(w,c.governor)!==c.owner)))return false;}
 if(Object.keys(s.treasuries).length!==3)return false;
 for(const id of realms){const t=s.treasuries[id];if(!obj(t)||!int(t.coins)||!int(t.grain)||!int(t.lastIncome)||!int(t.lastExpense)||!int(t.lastFood,-1_000_000,1_000_000))return false;}
 if(s.personalInfluence!==undefined&&(!obj(s.personalInfluence)||!historicalCharacters.every(p=>Object.hasOwn(s.personalInfluence!,p.id))||Object.entries(s.personalInfluence).some(([id,n])=>!relationshipPersonById[id]||!int(n,0,999))))return false;
 if(!int(s.influence,0,999)||typeof s.mandate!=='boolean'||!int(s.lastEvent,0,w.day)||!obj(s.truces))return false;
 for(const [key,day] of Object.entries(s.truces)){if(!['east|liang','east|west','liang|west'].includes(key)||!int(day,0,w.day+360))return false;}
 if(!Array.isArray(s.offices)||s.offices.length>Object.keys(territoryNodes).length||new Set(s.offices.map(o=>(o?.realm??s.cities[o?.site]?.owner)+'|'+(o?.territory??'county:'+o?.site))).size!==s.offices.length)return false;
 for(const o of s.offices)if(!obj(o)||!site(o.site)||(typeof o.candidate!=='string'||!relationshipPersonById[o.candidate])||!int(o.due,w.day+1,w.day+1000)||o.territory!==undefined&&(!Object.hasOwn(territoryNodes,String(o.territory))||territoryNodes[String(o.territory)].level==='realm'||!descendantSites(String(o.territory)).includes(o.site as string)||!realm(o.realm)||typeof o.issuer!=='string'||!relationshipPersonById[o.issuer]||typeof o.acting!=='boolean'||o.concurrent!==undefined&&typeof o.concurrent!=='boolean'||!int(o.issued,0,w.day)))return false;
 if(!validTraffic(w))return false;
 if(!Array.isArray(s.armies)||s.armies.length>48)return false;const seen=new Set<string>();
 for(const a of s.armies){if(!obj(a)||!realm(a.realm)||seen.has(a.id!==undefined?String(a.id):a.realm)||!site(a.location)||!int(a.troops,100,6000)||!int(a.morale,0,100)||!int(a.supply,0,600)||!int(a.siege,0,100))return false;seen.add(a.id!==undefined?String(a.id):a.realm);
 if(a.withdrawalUntil!==undefined&&!int(a.withdrawalUntil,0,w.day+10000))return false;
 if(a.trainingStarted!==undefined&&(!int(a.trainingStarted,0,w.day)||a.trainingUntil===undefined||Number(a.trainingUntil)<Number(a.trainingStarted)))return false;
 if(a.trainingUntil!==undefined&&!int(a.trainingUntil,0,w.day+60))return false;
 if(a.id!==undefined&&(!int(a.id,1,1000000000)||!int(s.nextArmyId,Number(a.id)+1,1000000000)))return false;
 if(a.payer!==undefined&&(typeof a.payer!=='string'||a.payer!=='central:'+a.realm&&(!a.payer.startsWith(a.realm+'|')||!Object.hasOwn(territoryNodes,a.payer.split('|')[1]))))return false;
 if(a.arrears!==undefined&&!int(a.arrears,0,1000000000)||a.foodRemainder!==undefined&&!int(a.foodRemainder,0,300000))return false;
 if(a.regiments!==undefined){if(!Array.isArray(a.regiments)||!a.regiments.length||a.regiments.length>60||a.regiments.reduce((n,u)=>n+u.troops,0)!==a.troops)return false;for(const u of a.regiments){if(!obj(u)||typeof u.id!=='string'||!/^\d+:\d+$/.test(u.id)||seen.has('unit:'+u.id)||!Object.hasOwn(troopKinds,String(u.kind))||!['standing','levy'].includes(String(u.service))||!site(u.origin)||!int(u.troops,1,6000)||!int(u.experience,0,100))return false;seen.add('unit:'+u.id);}}
 if(a.convoy!==undefined&&a.convoy!==null){const c=a.convoy;if(!obj(c)||!site(c.from)||!site(c.to)||!int(c.grain,1,600)||c.loaded!==undefined&&!int(c.loaded,0,Number(c.grain))||!Array.isArray(c.route)||c.route.length<2||c.route[0]!==c.from||c.route.at(-1)!==c.to||!c.route.every(site)||!Array.isArray(c.durations)||c.durations.length!==c.route.length-1||!int(c.leg,0,c.durations.length-1)||!int(c.elapsed,0,999))return false;for(let i=0;i<c.durations.length;i++){try{if(legDays(c.route[i],c.route[i+1])!==c.durations[i])return false;}catch{return false;}}if(c.elapsed>=c.durations[c.leg])return false;}
 if(a.journey!==null){const j=a.journey;if(!obj(j)||!Array.isArray(j.route)||j.route.length<2||j.route.length>sites.length||!j.route.every(site)||!Array.isArray(j.durations)||j.durations.length!==j.route.length-1||!int(j.leg,0,j.durations.length-1)||!int(j.elapsed,0,1000)||!int(j.started,0,w.day)||a.location!==j.route[j.leg])return false;
 for(let i=0;i<j.durations.length;i++){try{if(j.durations[i]!==legDays(j.route[i],j.route[i+1]))return false;}catch{return false;}}
 if(j.elapsed>=j.durations[j.leg]||j.durations.slice(0,j.leg).reduce((n:number,d:number)=>n+d,0)+j.elapsed!==w.day-j.started)return false;}
 }
 if(s.armyDebts!==undefined&&(!Array.isArray(s.armyDebts)||s.armyDebts.length>1000||s.armyDebts.some(d=>!obj(d)||!realm(d.realm)||typeof d.account!=='string'||d.account!=='central:'+d.realm&&(!d.account.startsWith(d.realm+'|')||!Object.hasOwn(territoryNodes,d.account.split('|')[1]))||!int(d.coins,1,1000000000))))return false;
 if(s.wars!==undefined&&(!Array.isArray(s.wars)||s.wars.length>3||!int(s.nextWarId,1,1000000000)))return false;
 const wars=activeWars(w),pairs=new Set<string>(),ids=new Set<number>();
 for(const v of wars){if(!obj(v)||!realm(v.attacker)||!realm(v.defender)||v.attacker===v.defender||!site(v.target)||!int(v.started,0,w.day)||!int(v.score,-100,100))return false;
 if(v.goal!==undefined&&!['territory','reparations','tributary'].includes(String(v.goal))||v.demand!==undefined&&!int(v.demand,1,10000)||v.battles!==undefined&&!int(v.battles,-25,25))return false;
 const pair=[v.attacker,v.defender].sort().join('|');if(pairs.has(pair))return false;pairs.add(pair);
 if(s.wars!==undefined){if(!int(v.id,1,Number(s.nextWarId)-1)||ids.has(v.id))return false;ids.add(v.id);}}
 if(s.wars!==undefined&&JSON.stringify(s.war)!==JSON.stringify(s.wars[0]??null))return false;
 if(Object.values(s.cities).some(c=>c.owner!==c.controller&&!wars.some(v=>[v.attacker,v.defender].includes(c.owner as typeof realms[number])&&[v.attacker,v.defender].includes(c.controller as typeof realms[number]))))return false;
 if(s.reparations!==undefined&&(!Array.isArray(s.reparations)||s.reparations.length>1000||s.reparations.some(d=>!obj(d)||!int(d.war,1,1000000000)||!realm(d.from)||!realm(d.to)||d.from===d.to||!int(d.remaining,1,10000)||!int(d.instalment,1,10000)||!int(d.next,0,w.day+30))))return false;
 if(s.event!==null){const e=s.event;if(!obj(e)||typeof e.kind!=='string'||!Object.hasOwn(eventDefinitions,e.kind)||!site(e.site)||!int(e.day,0,w.day)||e.day!==s.lastEvent)return false;}
 if(!Array.isArray(s.ledger)||s.ledger.length>36)return false;
 for(const l of s.ledger)if(!obj(l)||!realm(l.realm)||!int(l.day,0,w.day)||l.day%30!==0||!int(l.income)||!int(l.expense)||!int(l.food,-1_000_000,1_000_000))return false;
 const governed=Object.keys(s.cities).filter(id=>s.cities[id].governor===w.characterId&&s.cities[id].controller===playerRealm(w));
 return governed.length===w.holdings.governedCities.length&&governed.every(id=>w.holdings.governedCities.includes(id));
}
