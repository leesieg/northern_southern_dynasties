import type {World} from '../core/types';
import type {War} from '../core/wars';
import {activeWars,warRealmSide} from '../core/wars';
import {armyMapPosition} from '../map/armyMapPresentation';
import {siteById} from '../data/scenario';

export type EngagementRef={kind:'battle';key:string}|{kind:'siege';war:number;site:string;side:'attack'|'defend'};
export function battleKey(b:{id?:number;key:string;day:number}){return b.id!==undefined?'id:'+b.id:b.key+':'+b.day;}
export function warBattles(w:World,war:War){return (w.militaryAftermath?.battles??[]).filter(b=>war.id!==undefined&&b.war===war.id).sort((a,b)=>b.day-a.day);}
export function warOccupations(w:World,war:War){return Object.entries(w.realm?.cities??{}).filter(([,c])=>{
 if(war.civil||c.owner==='frontier'||c.controller==='frontier'||c.owner===c.controller)return false;
 const opposite=(v:War)=>!!warRealmSide(v,c.owner as War['attacker'])&&!!warRealmSide(v,c.controller as War['attacker'])&&warRealmSide(v,c.owner as War['attacker'])!==warRealmSide(v,c.controller as War['attacker']);
 return c.occupiedByWar!==undefined?c.occupiedByWar===war.id:opposite(war)&&activeWars(w).filter(opposite).length===1;
});}
/** Public battle sites only; no private schemes or invented troop estimates. */
export function engagementMarkers(w:World){
 const wars=activeWars(w),markers:{key:string;ref:EngagementRef;lon:number;lat:number;label:string}[]=[];
 for(const b of w.militaryAftermath?.battles??[]){
  if(b.ended!==undefined||w.day-b.last>1||b.war===undefined||!wars.some(v=>v.id===b.war))continue;
  const army=w.realm?.armies.find(a=>a.id===b.a),site=b.site?siteById[b.site]:undefined;
  // Road encounters keep the actual army projection, rather than the endpoint city.
  const pos=army?.journey?armyMapPosition(army):site??(army?armyMapPosition(army):null);if(!pos)continue;
  const key=battleKey(b);markers.push({key:'battle:'+key,ref:{kind:'battle',key},lon:pos.lon,lat:pos.lat,label:(site?.name??'道路')+'战役 · 第 '+b.round+' 轮'});
 }
 for(const s of w.realm?.sieges??[]){const site=siteById[s.site];if(!site||!wars.some(v=>v.id===s.war))continue;markers.push({key:`siege:${s.war}:${s.site}:${s.side}`,ref:{kind:'siege',war:s.war,site:s.site,side:s.side},lon:site.lon,lat:site.lat,label:site.name+'围城 · 进展 '+s.progress+'/100'});}
 return markers;
}
/** Co-located fighting shares one map entry; every underlying record remains selectable. */
export function engagementGroups(w:World){
 const groups=new Map<string,{key:string;lon:number;lat:number;items:ReturnType<typeof engagementMarkers>}>();
 for(const item of engagementMarkers(w)){const key=item.lon+'|'+item.lat;let group=groups.get(key);if(!group){group={key,lon:item.lon,lat:item.lat,items:[]};groups.set(key,group);}group.items.push(item);}
 return [...groups.values()];
}
