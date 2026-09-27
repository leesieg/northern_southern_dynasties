import {armyControls,civilWar} from './civilWars';
import {loadRoad} from './roadCapacity';
import {planRoute} from './world';
import {capital,armyDailyFood,type Army} from './realm';
import {grainCapacity,ensurePopulation,civilianFood} from './population';
import {canEnter} from './diplomacy';
import type {World} from './types';
export interface ArmyConvoy {loaded?:number;from:string;to:string;grain:number;route:string[];durations:number[];leg:number;elapsed:number}
/** Carried grain is a stock owned by the army. A larger force needs room for the same number of marching days. */
export const armySupplyCapacity=(a:Army)=>Math.min(6000,Math.max(600,Math.ceil(a.troops/60)*30));
export const armySupplyTarget=(w:World,a:Army)=>Math.min(armySupplyCapacity(a),Math.max(120,armyDailyFood(w,a)*30));
export function advanceArmyLogistics(w:World,a:Army){const s=w.realm!,t=s.treasuries[a.realm],c=a.convoy;
 if(c){if(c.route.slice(c.leg+1).every(id=>canEnter(w,a.realm,s.cities[id].controller,undefined,true)&&(!civilWar(w,a.realm)||armyControls(w,a,id)))){if(c.elapsed===0){c.loaded=(c.loaded??0)+loadRoad(w,c.route[c.leg],c.route[c.leg+1],c.grain-(c.loaded??0));if(c.loaded<c.grain)return;}c.elapsed++;if(c.elapsed>=c.durations[c.leg]){c.elapsed=0;c.loaded=0;c.leg++;if(c.leg>=c.durations.length){const grain=Math.floor(c.grain*.95);if(!a.journey&&a.location===c.to){const used=Math.min(armySupplyCapacity(a)-a.supply,grain);a.supply+=used;if(armyControls(w,a,c.to))s.cities[c.to].grain=Math.min(grainCapacity(w,c.to),s.cities[c.to].grain+grain-used);}else if(armyControls(w,a,c.to))s.cities[c.to].grain=Math.min(grainCapacity(w,c.to),s.cities[c.to].grain+grain);a.convoy=null;}}}return;}
 // A marching army cannot draw grain from a future stop or from a warehouse it has already left.
 if(a.journey||a.supply>=armySupplyTarget(w,a))return;const destination=a.location;
 const sources=Object.entries(s.cities).filter(([id])=>armyControls(w,a,id)).map(([id,c])=>({id,available:Math.max(0,c.grain-civilianFood(w,id)*2)+(id===capital(a.realm)&&!civilWar(w,a.realm)?.civil?.armies.includes(a.id!)?t.grain:0),path:id===destination?{route:[id],durations:[],days:0}:planRoute(id,destination,site=>canEnter(w,a.realm,s.cities[site].controller,undefined,true)&&(!civilWar(w,a.realm)||armyControls(w,a,site)))})).filter(v=>v.available>0&&v.path).sort((a,b)=>a.path!.days-b.path!.days);
 const source=sources[0];if(!source)return;if(source.path!.days===0){const amount=Math.min(source.available,armySupplyTarget(w,a)-a.supply),local=Math.min(Math.max(0,s.cities[source.id].grain-civilianFood(w,source.id)*2),amount);s.cities[source.id].grain-=local;t.grain-=amount-local;a.supply+=amount;return;}const amount=Math.min(source.available,600,armySupplyCapacity(a)-a.supply,Math.max(120,armyDailyFood(w,a)*(source.path!.days+30)));if(amount<1)return;const local=Math.min(Math.max(0,s.cities[source.id].grain-civilianFood(w,source.id)*2),amount);s.cities[source.id].grain-=local;t.grain-=amount-local;a.convoy={from:source.id,to:destination,grain:amount,route:source.path!.route,durations:source.path!.durations,leg:0,elapsed:0};
}

export function returnArmyConvoy(w:World,a:Army){const c=a.convoy;if(!c)return;const s=w.realm!,at=c.route[c.leg],path=at===c.from?{route:[at,at],durations:[1]}:planRoute(at,c.from,id=>s.cities[id].controller===a.realm);
 if(s.cities[c.from].controller===a.realm&&path){ensurePopulation(w);const p=s.population!;p.transfers=p.transfers.filter(t=>t.status==='traveling').concat(p.transfers.filter(t=>t.status!=='traveling').slice(-56));p.transfers.push({id:p.nextId++,realm:a.realm,from:c.from,to:c.from,kind:'grain',sent:c.grain,arrived:0,lost:0,route:path.route,durations:path.durations,leg:0,elapsed:0,created:w.day,status:'traveling',returning:true,lossRate:5});}
 w.chronicle.push({day:w.day,person:'player',text:path&&s.cities[c.from].controller===a.realm?'军队解除编制，军粮队沿安全道路返回原仓，损耗 5%。':'军队解除编制，粮道与原仓无法保全，辎重损失。'});w.chronicle=w.chronicle.slice(-100);a.convoy=null;}
/** Allocate the same store proportionally before processing any individual army. */
export function distributeGarrisonFood(w:World){if(!w.realm)return;const s=w.realm;
 for(const [site,city] of Object.entries(s.cities)){const armies=s.armies.filter(a=>!a.journey&&armyControls(w,a,site)&&a.location===site&&a.supply<armySupplyTarget(w,a)).sort((a,b)=>(a.id??0)-(b.id??0));if(!armies.length)continue;
 const local=Math.max(0,city.grain-civilianFood(w,site)*2),r=armies[0].realm,bank=site===capital(r)&&!civilWar(w,r)?.civil?.cities.includes(site)?s.treasuries[r]:null,available=local+(bank?.grain??0),needs=armies.map(a=>armySupplyTarget(w,a)-a.supply),total=needs.reduce((n,v)=>n+v,0),take=Math.min(available,total);let used=0;
 for(let i=0;i<armies.length;i++){const n=Math.floor(take*needs[i]/total);armies[i].supply+=n;used+=n;}
 let remainder=take-used;for(let n=0;n<armies.length&&remainder;n++){const a=armies[(n+w.day)%armies.length];if(a.supply<armySupplyTarget(w,a)){a.supply++;remainder--;used++;}}
 const fromLocal=Math.min(local,used);city.grain-=fromLocal;if(bank)bank.grain-=used-fromLocal;
 }
}
