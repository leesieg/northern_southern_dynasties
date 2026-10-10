import {armyBattle} from '../core/combatPresentation';
import {militaryArmyView} from '../core/militaryView';
import {battleReportSide} from '../core/battleReports';
import type {RealmId} from '../core/realm';
import type {World} from '../core/types';
import type {War} from '../core/wars';
import {activeWars,warOccupationSites} from '../core/wars';
import {armyMapPosition} from '../map/armyMapPresentation';
import {siteById} from '../data/scenario';

export type EngagementRef={kind:'battle';key:string}|{kind:'siege';event?:number;war:number;site:string;side:'attack'|'defend'};
import {battleKey} from '../core/battleReports';
export {battleKey} from '../core/battleReports';
export function warBattles(w:World,war:War){return (w.militaryAftermath?.battles??[]).filter(b=>war.id!==undefined&&b.war===war.id).sort((a,b)=>b.day-a.day);}
export function warOccupations(w:World,war:War){return warOccupationSites(w,war).map(id=>[id,w.realm!.cities[id]] as [string,NonNullable<World['realm']>['cities'][string]]);}
/** Public battle sites only; no private schemes or invented troop estimates. */
export function engagementMarkers(w:World){
 const wars=activeWars(w),markers:{key:string;ref:EngagementRef;lon:number;lat:number;label:string;progress?:number;sides?:{realm:RealmId;strength:string}[]}[]=[];
 for(const b of w.militaryAftermath?.battles??[]){
  if(b.ended!==undefined||w.day-b.last>1||b.war===undefined||!wars.some(v=>v.id===b.war))continue;
  const army=w.realm?.armies.find(a=>a.id===b.a),site=b.site?siteById[b.site]:undefined;
  // Road encounters keep the actual army projection, rather than the endpoint city.
  const pos=(army&&armyBattle(w,army)===b?b.contact:undefined)??(army?.journey?armyMapPosition(army):site??(army?armyMapPosition(army):null));if(!pos)continue;
  const war=wars.find(v=>v.id===b.war)!,sides=(['attack','defend'] as const).map(side=>{const report=battleReportSide(b,side),armies=(side==='attack'?b.attackers??[b.a]:b.defenders??[b.b]).map(id=>w.realm?.armies.find(a=>a.id===id)),known=armies.length>0&&armies.every(a=>a&&militaryArmyView(w,a).exact);return {realm:report.participants[0]?.realm??(side==='attack'?war.attacker:war.defender),strength:known?armies.reduce((n,a)=>n+a!.troops,0).toLocaleString():'未详'};});
  const key=battleKey(b);markers.push({key:'battle:'+key,ref:{kind:'battle',key},lon:pos.lon,lat:pos.lat,sides,label:(site?.name??'道路')+'战役 · 第 '+b.round+' 轮'});
 }
 for(const s of w.realm?.sieges??[]){const site=siteById[s.site];if(!site||!wars.some(v=>v.id===s.war))continue;markers.push({key:`siege:${s.war}:${s.site}:${s.side}`,ref:{kind:'siege',war:s.war,site:s.site,side:s.side},lon:site.lon,lat:site.lat,progress:Math.max(0,Math.min(100,s.progress)),label:site.name+'围城 · 进展 '+s.progress+'/100'});}
 return markers;
}
/** Co-located fighting shares one map entry; every underlying record remains selectable. */
export function engagementGroups(w:World){
 const groups=new Map<string,{key:string;lon:number;lat:number;items:ReturnType<typeof engagementMarkers>}>();
 for(const item of engagementMarkers(w)){const key=item.lon+'|'+item.lat;let group=groups.get(key);if(!group){group={key,lon:item.lon,lat:item.lat,items:[]};groups.set(key,group);}group.items.push(item);}
 return [...groups.values()];
}
