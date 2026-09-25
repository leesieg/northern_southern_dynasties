import {loadRoad} from './roadCapacity';
import {planRoute} from './world';
import {capital,armyDailyFood,type Army} from './realm';
import {grainCapacity,ensurePopulation} from './population';
import {canEnter} from './diplomacy';
import type {World} from './types';
export interface ArmyConvoy {loaded?:number;from:string;to:string;grain:number;route:string[];durations:number[];leg:number;elapsed:number}
export function advanceArmyLogistics(w:World,a:Army){const s=w.realm!,t=s.treasuries[a.realm],c=a.convoy;
 if(c){if(c.route.slice(c.leg+1).every(id=>canEnter(w,a.realm,s.cities[id].controller,undefined,true))){if(c.elapsed===0){c.loaded=(c.loaded??0)+loadRoad(w,c.route[c.leg],c.route[c.leg+1],c.grain-(c.loaded??0));if(c.loaded<c.grain)return;}c.elapsed++;if(c.elapsed>=c.durations[c.leg]){c.elapsed=0;c.loaded=0;c.leg++;if(c.leg>=c.durations.length){const grain=Math.floor(c.grain*.95);if(a.location===c.to){const used=Math.min(600-a.supply,grain);a.supply+=used;if(s.cities[c.to].controller===a.realm)s.cities[c.to].grain=Math.min(grainCapacity(w,c.to),s.cities[c.to].grain+grain-used);}else if(s.cities[c.to].controller===a.realm)s.cities[c.to].grain=Math.min(grainCapacity(w,c.to),s.cities[c.to].grain+grain);a.convoy=null;}}}return;}
 if(a.supply>100)return;const destination=a.journey?.route.at(-1)??a.location;
 const sources=Object.entries(s.cities).filter(([,c])=>c.controller===a.realm).map(([id,c])=>({id,available:c.grain+(id===capital(a.realm)?t.grain:0),path:id===destination?{route:[id],durations:[],days:0}:planRoute(id,destination,site=>canEnter(w,a.realm,s.cities[site].controller,undefined,true))})).filter(v=>v.available>0&&v.path).sort((a,b)=>a.path!.days-b.path!.days);
 const source=sources[0];if(!source)return;if(source.path!.days===0){const amount=Math.min(source.available,120-a.supply),local=Math.min(s.cities[source.id].grain,amount);s.cities[source.id].grain-=local;t.grain-=amount-local;a.supply+=amount;return;}const amount=Math.min(source.available,600,Math.max(120,armyDailyFood(w,a)*(source.path!.days+30)));if(amount<1)return;const local=Math.min(s.cities[source.id].grain,amount);s.cities[source.id].grain-=local;t.grain-=amount-local;a.convoy={from:source.id,to:destination,grain:amount,route:source.path!.route,durations:source.path!.durations,leg:0,elapsed:0};
}

export function returnArmyConvoy(w:World,a:Army){const c=a.convoy;if(!c)return;const s=w.realm!,at=c.route[c.leg],path=at===c.from?{route:[at,at],durations:[1]}:planRoute(at,c.from,id=>s.cities[id].controller===a.realm);
 if(s.cities[c.from].controller===a.realm&&path){ensurePopulation(w);const p=s.population!;p.transfers=p.transfers.filter(t=>t.status==='traveling').concat(p.transfers.filter(t=>t.status!=='traveling').slice(-56));p.transfers.push({id:p.nextId++,realm:a.realm,from:c.from,to:c.from,kind:'grain',sent:c.grain,arrived:0,lost:0,route:path.route,durations:path.durations,leg:0,elapsed:0,created:w.day,status:'traveling',returning:true,lossRate:5});}
 w.chronicle.push({day:w.day,person:'player',text:path&&s.cities[c.from].controller===a.realm?'军队解除编制，军粮队沿安全道路返回原仓，损耗 5%。':'军队解除编制，粮道与原仓无法保全，辎重损失。'});w.chronicle=w.chronicle.slice(-100);a.convoy=null;}
