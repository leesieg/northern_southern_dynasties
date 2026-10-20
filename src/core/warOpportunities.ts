import {civilArmyObserving} from './civilMobilization';
import type {World} from './types';
import type {Army,RealmId} from './realm';
import {activeWars,warRealmSide} from './wars';
import {readyTroops} from './armyOrganization';
import {armyCampaign} from './militaryCampaigns';
import {planRoute} from './world';
import {governmentOf} from './government';
import {civilSettlements} from './civilAftermath';

/** Derived current readiness; no new troops, probability pool or persistent bonus. */
export function armyEngaged(w:World,a:Army){return !!a.journey||!!a.withdrawalUntil||!!armyCampaign(w,a)||!!w.realm?.sieges?.some(s=>s.site===a.location&&activeWars(w).some(v=>v.id===s.war&&warRealmSide(v,a.realm)))||!!w.militaryAftermath?.battles.some(b=>b.ended===undefined&&w.day-b.last<=1&&(b.a===a.id||b.b===a.id));}
export function regionalDefense(w:World,r:RealmId,site:string){
 return w.realm!.armies.filter(a=>a.realm===r).reduce((n,a)=>{
  if(a.location===site&&!a.journey)return n+readyTroops(a,w.day)*a.morale/100;
  if(armyEngaged(w,a)||activeWars(w).some(war=>war.civil&&warRealmSide(war,r)&&civilArmyObserving(w,war,a)))return n;
  const route=planRoute(a.location,site,id=>w.realm!.cities[id].controller===r);
  return n+(route&&route.days<=30?readyTroops(a,w.day)*a.morale/100*(route.days<=10?.75:.5):0);
 },0);
}
export function fracturedRealm(w:World,r:RealmId){return activeWars(w).some(v=>v.civil&&(v.defender===r||v.attacker===r))||civilSettlements(w).some(s=>s.realm===r&&s.result==='rebel'&&w.day-s.ended<360)||(governmentOf(w,r)?.support??100)<40||governmentOf(w,r)?.court?.phase==='chaos';}
/** Reserve distinct real units for existing fronts before considering another campaign. */
export function frontAssignments(w:World,r:RealmId){
 const reserved=new Map<number,number>(),own=w.realm!.armies.filter(a=>a.realm===r&&!a.owner);
 for(const a of own)if(armyEngaged(w,a)||a.automation==='direct'||activeWars(w).some(war=>war.civil&&warRealmSide(war,r)&&civilArmyObserving(w,war,a)))reserved.set(a.id!,activeWars(w).find(v=>warRealmSide(v,r)&&(a.location===v.target||a.journey?.route.at(-1)===v.target||w.realm!.sieges?.some(s=>s.war===v.id&&s.site===a.location)))?.id??0);
 for(const war of activeWars(w).filter(v=>warRealmSide(v,r))){
  const enemy=w.realm!.armies.filter(a=>warRealmSide(war,a.realm)&&warRealmSide(war,a.realm)!==warRealmSide(war,r));
  const need=Math.max(600,enemy.reduce((n,a)=>n+readyTroops(a,w.day)*a.morale/100,0)*1.1);
  let covered=own.filter(a=>reserved.get(a.id!)===war.id).reduce((n,a)=>n+readyTroops(a,w.day)*a.morale/100,0);
  const free=own.filter(a=>!reserved.has(a.id!)).map(a=>({a,path:planRoute(a.location,war.target,id=>w.realm!.cities[id].controller===r||!!warRealmSide(war,w.realm!.cities[id].controller as RealmId))})).filter(v=>v.path).sort((a,b)=>a.path!.days-b.path!.days||a.a.id!-b.a.id!);
  for(const {a} of free){if(covered>=need)break;reserved.set(a.id!,war.id!);covered+=readyTroops(a,w.day)*a.morale/100;}
 }
 return reserved;
}

export function frontReservations(w:World,r:RealmId){return new Set(frontAssignments(w,r).keys());}
