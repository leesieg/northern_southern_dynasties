import type {World,Journey} from './types';
import type {Army} from './realm';
import {armiesHostile,warArmySide} from './civilWars';
import type {War} from './wars';

/** Swept progress detects an encounter before either army advances through the edge. */
export function roadMeeting(a:Journey,b:Journey){
 const a0=a.route[a.leg],a1=a.route[a.leg+1],b0=b.route[b.leg],b1=b.route[b.leg+1];
 if(a0!==b1||a1!==b0)return false;
 const x=a.elapsed/a.durations[a.leg],y=b.elapsed/b.durations[b.leg];
 return x+y<=1&&(a.elapsed+1)/a.durations[a.leg]+(b.elapsed+1)/b.durations[b.leg]>=1;
}
export function roadEncounters(w:World){
 const armies=w.realm?.armies??[],pairs:[Army,Army][]=[];
 for(let i=0;i<armies.length;i++)for(const b of armies.slice(i+1)){const a=armies[i];if(a.troops<100||b.troops<100||a.withdrawalUntil||b.withdrawalUntil||!armiesHostile(w,a,b))continue;
  const arrives=(moving:Army,stationary:Army)=>!!moving.journey&&!stationary.journey&&moving.journey.route[moving.journey.leg+1]===stationary.location&&moving.journey.elapsed+1>=moving.journey.durations[moving.journey.leg];
  if(a.journey&&b.journey&&roadMeeting(a.journey,b.journey)||arrives(a,b)||arrives(b,a))pairs.push([a,b]);}
 return pairs;
}
/** Collect each battlefield once, including units arriving at a defended city this day. */
export function fieldBattles(w:World,war:War,meetings:[Army,Army][]){const armies=w.realm?.armies??[],groups=new Map<string,{site:string;attack:Set<Army>;defend:Set<Army>}>();
 const add=(key:string,site:string,a:Army,b:Army)=>{const sideA=warArmySide(w,war,a),sideB=warArmySide(w,war,b);if(!sideA||!sideB||sideA===sideB||a.troops<100||b.troops<100||a.withdrawalUntil||b.withdrawalUntil)return;let group=groups.get(key);if(!group){group={site,attack:new Set(),defend:new Set()};groups.set(key,group);}group[sideA].add(a);group[sideB].add(b);};
 for(const site of new Set(armies.filter(a=>!a.journey).map(a=>a.location))){const local=armies.filter(a=>!a.journey&&a.location===site);for(let i=0;i<local.length;i++)for(const b of local.slice(i+1))add('city:'+site,site,local[i],b);}
 for(const [a,b] of meetings){const stationary=!a.journey?a:!b.journey?b:null,edge=a.journey?[a.journey.route[a.journey.leg],a.journey.route[a.journey.leg+1]]:[],site=stationary?.location??edge[1],key=stationary?'city:'+site:'road:'+edge.sort().join('|');add(key,site,a,b);}
 return [...groups.values()].map(group=>({site:group.site,attack:[...group.attack],defend:[...group.defend]}));
}
