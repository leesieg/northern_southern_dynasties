import {planRoute} from './world';
import {capital,armyDailyFood,type Army} from './realm';
import {canEnter} from './diplomacy';
import type {World} from './types';
export interface ArmyConvoy {from:string;to:string;grain:number;route:string[];durations:number[];leg:number;elapsed:number}
export function advanceArmyLogistics(w:World,a:Army){const s=w.realm!,t=s.treasuries[a.realm],c=a.convoy;
 if(c){if(c.route.slice(c.leg+1).every(id=>canEnter(w,a.realm,s.cities[id].controller,undefined,true))){c.elapsed++;if(c.elapsed>=c.durations[c.leg]){c.elapsed=0;c.leg++;if(c.leg>=c.durations.length){const grain=Math.floor(c.grain*.95);if(a.location===c.to){const used=Math.min(600-a.supply,grain);a.supply+=used;if(s.cities[c.to].controller===a.realm)s.cities[c.to].grain+=grain-used;}else if(s.cities[c.to].controller===a.realm)s.cities[c.to].grain+=grain;a.convoy=null;}}}return;}
 if(a.supply>100)return;const destination=a.journey?.route.at(-1)??a.location;
 const sources=Object.entries(s.cities).filter(([,c])=>c.controller===a.realm).map(([id,c])=>({id,available:c.grain+(id===capital(a.realm)?t.grain:0),path:planRoute(id,destination,site=>canEnter(w,a.realm,s.cities[site].controller,undefined,true))})).filter(v=>v.available>0&&v.path).sort((a,b)=>a.path!.days-b.path!.days);
 const source=sources[0];if(!source)return;const amount=Math.min(source.available,600,Math.max(120,armyDailyFood(w,a)*(source.path!.days+30)));if(amount<1)return;const local=Math.min(s.cities[source.id].grain,amount);s.cities[source.id].grain-=local;t.grain-=amount-local;a.convoy={from:source.id,to:destination,grain:amount,route:source.path!.route,durations:source.path!.durations,leg:0,elapsed:0};
}
