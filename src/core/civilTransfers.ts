import type {World} from './types';
import type {Army,RealmId} from './realm';
import {activeWars,warRealmSide,type War} from './wars';
import {regimentFollows,splitRevoltArmies} from './regimentAllegiance';
import {armyCommander} from './mobility';
import {authorityGrant} from './authority';
import {presentAt} from './residence';
import {allegianceRealm,reconcileOfficeAllegiance} from './officeEligibility';
import {retainPersonalFollowers,detachRetainer} from './allegianceTransition';
import {countyTerritory,localKey,setLocalHolder,clearLocalPerson} from './localAdministration';
import {descendantSites} from '../data/territorialHierarchy';
import {fiscalRecord} from './treasury';
import {governmentOf} from './government';
import {reconcileServiceAllegiance} from './assignments';
import {syncRelationships} from './relationships';
import {syncCourt} from './court';
import {syncGovernance} from './realm';
import {inheritCivilFronts} from './civilPolities';

export interface CivilAssets {cities:string[];localSites:string[];armies:number[];troops:number;blocked:{label:string;reason:string}[]}
/** Compact stale-preview token; all permissions and amounts are revalidated separately. */
export function civilRevision(value:unknown){const text=JSON.stringify(value);let a=2166136261,b=5381;for(let i=0;i<text.length;i++){a=Math.imul(a^text.charCodeAt(i),16777619);b=Math.imul(b,33)^text.charCodeAt(i);}return (a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');}
/** Both initial support and subsequent defections use the same physical assets. */
export function civilResponseAssets(w:World,from:RealmId,people:string[],to?:RealmId,uprising?:string):CivilAssets{
 const s=w.realm!,blocked:CivilAssets['blocked']=[],eligible=people.filter(id=>allegianceRealm(w,id)===from);
 const governing=Object.entries(s.cities).filter(([site,c])=>c.controller===from&&!!c.governor&&eligible.includes(c.governor)&&presentAt(w,c.governor,site)).map(([site])=>site);
 const plans:{army:Army;following:number}[]=[],slots={world:48-s.armies.length,source:16-s.armies.filter(a=>a.realm===from).length,target:to?16-s.armies.filter(a=>a.realm===to).length:16};
 for(const a of s.armies.filter(a=>a.realm===from)){
  const commander=armyCommander(w,a),personal=eligible.some(id=>(a.owner===id||commander===id)&&presentAt(w,id,a.location)&&authorityGrant(w,id,'command',{realm:from,army:a}).allowed);
  const local=governing.includes(a.location)&&eligible.some(id=>authorityGrant(w,id,'command',{realm:from,army:a}).allowed)&&(a.payer??'').startsWith(from+'|');
  if(!personal&&!local)continue;
  const following=a.regiments?.filter(u=>regimentFollows(u,a,eligible,local)).reduce((n,u)=>n+u.troops,0)??(a.owner&&eligible.includes(a.owner)||local?a.troops:0),rest=a.troops-following;
  const controller=s.cities[a.location].controller;
  const foreignFront=activeWars(w).some(war=>!war.civil&&warRealmSide(war,from)&&((controller!=='frontier'&&warRealmSide(war,controller)&&warRealmSide(war,controller)!==warRealmSide(war,from))||s.armies.some(b=>b!==a&&b.location===a.location&&warRealmSide(war,b.realm)&&warRealmSide(war,b.realm)!==warRealmSide(war,from))));
  const reason=a.journey?'军队仍在行军':w.militaryCampaigns?.items.some(q=>q.army===a.id&&q.status==='active')?'须先交接战役委任及专款':foreignFront?'须先撤离正在交战的外战前线':following<100?'愿追随的兵员不足 100 人':rest>0&&rest<100?'留守兵员不足独立编制':slots.target<1?'接收阵营编制已满':rest>0&&(slots.world<1||slots.source<1)?'无法保留抵抗方编制':'';
  if(reason){blocked.push({label:'第 '+a.id+' 军',reason});continue;}
  plans.push({army:a,following});slots.target--;if(rest){slots.world--;slots.source--;}
 }
 const candidates=new Set([...governing,...plans.filter(p=>s.cities[p.army.location]?.controller===from).map(p=>p.army.location)]),cities:string[]=[];
 for(const site of candidates){
  const c=s.cities[site];if(to?c.owner!==from&&c.owner!==to:c.owner!==from)continue;
  const stationed=s.armies.filter(a=>a.location===site&&!a.journey),following=plans.filter(p=>p.army.location===site).reduce((n,p)=>n+p.following,0),resisting=stationed.reduce((n,a)=>n+a.troops,0)-following;
  const reason=s.sieges?.some(q=>q.site===site)?'城邑正在被围攻':c.governor&&!eligible.includes(c.governor)&&site!==uprising?'当地县域主官未响应':resisting>0&&following<=resisting?'有效驻军仍抵抗交接':!governing.includes(site)&&following<300?'未掌握县域职权或优势驻军':'';
  if(reason)blocked.push({label:site,reason});else cities.push(site);
 }
 return {cities:cities.sort(),localSites:governing,armies:plans.map(p=>p.army.id!),troops:plans.reduce((n,p)=>n+p.following,0),blocked};
}
export function civilTransferPreview(w:World,war:War,person:string,to:RealmId){
 const from=allegianceRealm(w,person)!,assets=civilResponseAssets(w,from,[person],to),accounts:{from:string;to:string;coins:number}[]=[],f=w.realm!.fiscal;
 if(from!==to)for(const [key,balance] of Object.entries(f?.balances??{})){
  if(!key.startsWith(from+'|'))continue;
  const territory=key.slice(from.length+1),sites=descendantSites(territory),total=sites.filter(id=>w.realm!.cities[id]?.controller===from).reduce((n,id)=>n+w.realm!.cities[id].population,0),part=sites.filter(id=>assets.cities.includes(id)).reduce((n,id)=>n+w.realm!.cities[id].population,0),target=to+'|'+territory;
  const coins=Math.min(total?Math.floor(balance*part/total):0,1_000_000-(f?.balances[target]??0));
  if(coins>0)accounts.push({from:key,to:target,coins});
 }
 const offices=Object.entries(w.realm!.cities).filter(([,c])=>c.governor===person).map(([id])=>id),oldOath=w.relationships?.oaths[person];
 const cityState=assets.cities.map(id=>({id,...w.realm!.cities[id]})),armyState=assets.armies.map(id=>{const a=w.realm!.armies.find(a=>a.id===id)!;return {id,troops:a.troops,supply:a.supply,arrears:a.arrears??0,foodRemainder:a.foodRemainder??0,regiments:a.regiments};});
 const preview={war:war.id,day:w.day,person,from,to,...assets,cityState,armyState,accounts,offices,oldOath:oldOath?{...oldOath}:null};
 return {...preview,revision:civilRevision(preview)};
}
/** Caller runs this inside the stance transaction. No new government or resource pool. */
export function joinCivilCamp(w:World,war:War,person:string,to:RealmId){
 const q=civilTransferPreview(w,war,person,to);if(q.from===to)return q;
 const commanders=new Map(q.armies.map(id=>[id,armyCommander(w,w.realm!.armies.find(a=>a.id===id)!)]));
 const ids=splitRevoltArmies(w,[person],q.localSites,q.armies);
 if(ids.length!==q.armies.length)throw new Error('响应部队已变化，请重新确认交接');
 retainPersonalFollowers(w,person,q.from);if(w.retinue?.members[person])detachRetainer(w,person);
 delete w.relationships!.oaths[person];
 clearLocalPerson(w,person);
 (w.relationships!.allegiances??={})[person]={realm:to,from:q.from,since:w.day,army:ids[0]??0,source:'civil'};
 for(const a of w.realm!.armies)if(ids.includes(a.id!)){a.realm=to;a.payer=a.owner?'person:'+a.owner:'central:'+to;delete a.refusal;delete a.rally;const commander=commanders.get(a.id!);if(w.mobility){w.mobility.armyCommanders??={};if(commander===person)w.mobility.armyCommanders[a.id!]=person;else delete w.mobility.armyCommanders[a.id!];}}
 for(const [id,commander] of Object.entries(w.mobility?.armyCommanders??{}))if(commander===person&&!ids.includes(Number(id)))delete w.mobility!.armyCommanders![Number(id)];
 if(w.mobility?.commanders[q.from]===person)delete w.mobility.commanders[q.from];
 for(const [id,pending] of Object.entries(w.mobility?.pendingCommanders??{}))if(pending.person===person||allegianceRealm(w,pending.person)!==w.realm!.armies.find(a=>a.id===Number(id))?.realm)delete w.mobility!.pendingCommanders![Number(id)];
 for(const p of q.accounts){w.realm!.fiscal!.balances[p.from]-=p.coins;w.realm!.fiscal!.balances[p.to]=(w.realm!.fiscal!.balances[p.to]??0)+p.coins;fiscalRecord(w,to,p.from,p.to,p.coins,'内战响应县域实际公款交接');}
 for(const site of q.cities){const c=w.realm!.cities[site];c.controller=to;if(c.owner===to){delete c.occupiedByWar;delete c.occupiedSince;delete c.occupiedFrom;}else{c.occupiedByWar=war.id;c.occupiedSince=w.day;delete c.occupiedFrom;}const county=countyTerritory(site);delete w.realm!.local?.seats[localKey(q.from,county)];setLocalHolder(w,county,to,person);}
 for(const r of [q.from,to])syncCourt(w,r);
 reconcileOfficeAllegiance(w);reconcileServiceAllegiance(w);syncRelationships(w);syncGovernance(w);inheritCivilFronts(w,war);
 war.civil!.supporters=war.civil!.supporters.filter(id=>id!==person);if(to===war.attacker)war.civil!.supporters.push(person);
 war.civil!.cities=Object.keys(w.realm!.cities).filter(id=>w.realm!.cities[id].controller===war.attacker);
 war.civil!.armies=w.realm!.armies.filter(a=>a.realm===war.attacker).map(a=>a.id!);
 // A local officer keeps only the transferred county seats; upper mandates do not move wholesale.
 if(!governmentOf(w,to))throw new Error('接收阵营已结束');
 return q;
}
