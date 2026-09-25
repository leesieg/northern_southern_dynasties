import type {World,Journey} from './types';
import type {Army} from './realm';
import {armiesHostile} from './civilWars';

/** Swept progress detects an encounter before either army advances through the edge. */
export function roadMeeting(a:Journey,b:Journey){
 const a0=a.route[a.leg],a1=a.route[a.leg+1],b0=b.route[b.leg],b1=b.route[b.leg+1];
 if(a0!==b1||a1!==b0)return false;
 const x=a.elapsed/a.durations[a.leg],y=b.elapsed/b.durations[b.leg];
 return x+y<=1&&(a.elapsed+1)/a.durations[a.leg]+(b.elapsed+1)/b.durations[b.leg]>=1;
}
export function roadEncounters(w:World){
 const armies=w.realm?.armies??[],pairs:[Army,Army][]=[];
 for(let i=0;i<armies.length;i++)for(const b of armies.slice(i+1)){const a=armies[i];if(a.journey&&b.journey&&a.troops>=100&&b.troops>=100&&!a.withdrawalUntil&&!b.withdrawalUntil&&armiesHostile(w,a,b)&&roadMeeting(a.journey,b.journey))pairs.push([a,b]);}
 return pairs;
}
