import type {World} from './types';
import type {War} from './wars';
import {activeWars,warOccupationSites,warRealmSide} from './wars';
import {mobilizedTransportLabor} from './armyLogistics';
import {siteById} from '../data/scenario';
export type CaptureCause='battle'|'surrender';
export interface CaptureLoss {site:string;side:'attack'|'defend';day:number;deaths:number;cause:CaptureCause|'legacy'}
/** Legacy occupations establish a paid baseline without removing any residents. */
export function migrateCaptureLosses(w:World){for(const war of activeWars(w)){
 if(war.captureLosses!==undefined)continue;
 war.captureLosses=war.civil?war.civil.cities.map(site=>({site,side:'attack',day:w.day,deaths:0,cause:'legacy'})):warOccupationSites(w,war).map(site=>({site,side:warRealmSide(war,w.realm!.cities[site].controller as War['attacker'])!,day:w.day,deaths:0,cause:'legacy'}));
}if(w.realm?.wars)w.realm.war=w.realm.wars[0]??null;}
export function captureLossQuote(w:World,war:War,site:string,side:'attack'|'defend',cause:CaptureCause){
 const city=w.realm!.cities[site],seen=war.captureLosses?.some(r=>r.site===site&&r.side===side),rate=cause==='surrender'?.005:.02;
 const deaths=seen?0:Math.max(0,Math.min(Math.floor(city.population*rate),city.population-100-mobilizedTransportLabor(w,site)));
 return {rate,deaths,seen:!!seen};
}
/** Run only when actual control changes. Civilian deaths never enter military casualty pools. */
export function settleCaptureLoss(w:World,war:War,site:string,side:'attack'|'defend',cause:CaptureCause){
 migrateCaptureLosses(w);const q=captureLossQuote(w,war,site,side,cause);if(q.seen)return 0;
 war.captureLosses??=[];war.captureLosses.push({site,side,day:w.day,deaths:q.deaths,cause});w.realm!.cities[site].population-=q.deaths;
 w.chronicle.push({day:w.day,person:'player',text:siteById[site].name+(cause==='surrender'?'议降交城':'战斗夺城')+'，战乱死亡 '+q.deaths+' 名居民（本场同城同方向仅结算一次）。'});w.chronicle=w.chronicle.slice(-100);return q.deaths;
}
