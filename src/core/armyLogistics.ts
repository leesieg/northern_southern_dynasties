import {monthStart} from './calendar';
import {armyControls,civilWar} from './civilWars';
import {loadRoad,loadingDays} from './roadCapacity';
import {planRoute} from './world';
import {capital,armyDailyFood,type Army,type RealmId} from './realm';
import {grainCapacity,ensurePopulation,civilianFood} from './population';
import {canEnter} from './diplomacy';
import {governmentOf} from './government';
import {accountWallet,transferAccount} from './obligations';
import {fiscalRecord,territoryAccount,ensureFiscal} from './treasury';
import {takeCasualties} from './militaryAftermath';
import type {World} from './types';
export interface ArmyConvoy {labor?:number;loaded?:number;from:string;to:string;grain:number;route:string[];durations:number[];leg:number;elapsed:number}
export type SupplyPolicy='civilian'|'normal'|'emergency';
export const armySupplyCapacity=(a:Army)=>Math.min(6000,Math.max(600,Math.ceil(a.troops/60)*30));
export const armySupplyTarget=(w:World,a:Army,lead=0)=>Math.min(armySupplyCapacity(a),Math.max(120,armyDailyFood(w,a)*(30+lead)));
export function supplyReserve(w:World,site:string,r:RealmId){const p=w.realm?.supplyPolicies?.[r]??'normal';return civilianFood(w,site)*(p==='civilian'?3:p==='emergency'?1:2);}
export function mobilizedTransportLabor(w:World,site:string){return (w.realm?.armies??[]).reduce((n,a)=>n+(a.convoy?.from===site?a.convoy.labor??0:0),0);}
export function convoyPassable(w:World,a:Army){return !!a.convoy&&a.convoy.route.slice(a.convoy.leg+1).every(id=>canEnter(w,a.realm,w.realm!.cities[id].controller,undefined,true)&&(!civilWar(w,a.realm)||armyControls(w,a,id)));}
export function convoyETA(w:World,a:Army){const c=a.convoy;if(!c||!convoyPassable(w,a))return null;let days=c.durations.slice(c.leg).reduce((n,d)=>n+d,0)-c.elapsed;for(let i=c.leg;i<c.durations.length;i++)days+=loadingDays(c.route[i],c.route[i+1],i===c.leg?c.grain-(c.loaded??0):c.grain);return Math.max(0,days);}
export function incomingArmySupply(w:World,a:Army){const c=a.convoy;return c&&convoyPassable(w,a)&&c.to===(a.journey?.route.at(-1)??a.location)?Math.floor(c.grain*.95):0;}
function addStore(w:World,a:Army,site:string,amount:number){if(!armyControls(w,a,site)){a.supplyLost=(a.supplyLost??0)+amount;return;}const city=w.realm!.cities[site],kept=Math.min(Math.max(0,grainCapacity(w,site)-city.grain),amount);city.grain+=kept;a.supplyLost=(a.supplyLost??0)+amount-kept;}
function advanceConvoy(w:World,a:Army){const c=a.convoy;if(!c)return;if(!convoyPassable(w,a)){a.logisticsReason='粮道中断或失去通行权';return;}
 if(c.elapsed===0){c.loaded=(c.loaded??0)+loadRoad(w,c.route[c.leg],c.route[c.leg+1],c.grain-(c.loaded??0));if(c.loaded<c.grain){a.logisticsReason='道路装运容量不足，粮队等待';return;}}
 if(++c.elapsed<c.durations[c.leg])return;c.elapsed=0;c.loaded=0;c.leg++;if(c.leg<c.durations.length)return;
 const delivered=Math.floor(c.grain*.95);a.supplyLost=(a.supplyLost??0)+c.grain-delivered;const receive=!a.journey&&a.location===c.to?Math.min(Math.max(0,armySupplyCapacity(a)-a.supply),delivered):0;a.supply+=receive;addStore(w,a,c.to,delivered-receive);a.convoy=null;
}
function dispatch(w:World,a:Army){if(a.convoy||a.troops<=0)return;a.logisticsReason='';const s=w.realm!,to=a.journey?a.journey.route.slice(a.journey.leg+1).reverse().find(id=>armyControls(w,a,id)):a.location;
 if(!to||!armyControls(w,a,to)){a.logisticsReason='前方无安全补给据点';return;}
 const sources=Object.entries(s.cities).filter(([id])=>armyControls(w,a,id)).map(([id,c])=>({id,local:Math.max(0,c.grain-supplyReserve(w,id,a.realm)),bank:!a.owner&&id===capital(a.realm)&&!civilWar(w,a.realm)?.civil?.armies.includes(a.id!)?s.treasuries[a.realm].grain:0,path:id===to?{route:[id],durations:[],days:0}:planRoute(id,to,node=>canEnter(w,a.realm,s.cities[node].controller,undefined,true)&&(!civilWar(w,a.realm)||armyControls(w,a,node)))})).filter(v=>v.path&&v.local+v.bank>0).sort((x,y)=>x.path!.days-y.path!.days),source=sources[0];
 if(!source){a.logisticsReason='安全粮源不足或通路中断';return;}const lead=source.path!.days;if(a.journey&&!lead){a.logisticsReason='前方据点已有储粮，抵达后领取';return;}const need=Math.max(0,armySupplyTarget(w,a,lead)-a.supply-incomingArmySupply(w,a));if(!need)return;
 const city=s.cities[source.id],workers=Math.max(0,Math.floor(city.population*.1)-mobilizedTransportLabor(w,source.id)),mobilization=Math.max(.25,Math.min(1.5,((governmentOf(w,a.realm)?.support??60)+city.order)/120));
 let amount=Math.floor(Math.min(need,source.local+source.bank,lead?Math.min(600,workers*10*mobilization):6000));const wallet=accountWallet(w,a.payer??'central:'+a.realm);if(a.owner)amount=Math.min(amount,Math.max(0,(wallet?.read()??0)-(lead?1:0)));
 const cost=lead?Math.ceil(amount/50):0;if(amount<1||!wallet||wallet.read()<cost+(a.owner?amount:0)){a.logisticsReason=workers<1?'地方民夫已被征用':'运输或购粮预算不足';return;}
 if(a.owner){const destination=territoryAccount(w,a.realm,'county:'+source.id);ensureFiscal(w)!.balances[destination]??=0;const recipient=accountWallet(w,destination)!;if(recipient.read()+amount>recipient.capacity){a.logisticsReason='粮源公库无法收款';return;}transferAccount(w,a.payer!,destination,amount,'部曲购买军粮');}if(cost){wallet.write(wallet.read()-cost);fiscalRecord(w,a.realm,a.payer??'central:'+a.realm,'expense',cost,'军粮运输劳役费用');}
 const local=Math.min(source.local,amount);city.grain-=local;s.treasuries[a.realm].grain-=amount-local;
 emergencyBurden(w,a.realm,source.id,local);
 if(!lead){a.supply+=amount;return;}a.convoy={labor:Math.ceil(amount/(10*mobilization)),from:source.id,to,grain:amount,route:source.path!.route,durations:source.path!.durations,leg:0,elapsed:0};
}
export function advanceArmyLogistics(w:World,a:Army){advanceConvoy(w,a);dispatch(w,a);}
export function advanceNationalLogistics(w:World){for(const a of w.realm?.armies??[])advanceConvoy(w,a);distributeGarrisonFood(w);const ranked=[...(w.realm?.armies??[])].sort((a,b)=>(b.supplyPriority??1)-(a.supplyPriority??1)||a.supply/Math.max(1,armyDailyFood(w,a))-b.supply/Math.max(1,armyDailyFood(w,b))||(a.id??0)-(b.id??0));for(const a of ranked)dispatch(w,a);}
export function settleArmyFood(w:World,a:Army,need:number){const missing=Math.max(0,need-a.supply),fraction=need?missing/need:0;a.supply=Math.max(0,a.supply-need);if(!missing){a.starvationDays=0;a.morale=Math.max(0,Math.min(100,a.morale+(a.arrears?-1:1)));return;}
 const days=a.starvationDays=(a.starvationDays??0)+1,rate=days<=2?0:days<=7?.005:days<=14?.01:.02,lost=rate?takeCasualties(w,a,Math.ceil(a.troops*rate*fraction)):0,penalty=Math.max(1,Math.ceil(fraction*(days>7?4:2)));a.morale=Math.max(0,a.morale-penalty);if(lost||days===1){w.chronicle.push({day:w.day,person:'player',text:`第 ${a.id} 军断粮：缺口 ${missing}/${need}，连续 ${days} 日，减员 ${lost} 人，士气 −${penalty}。`});w.chronicle=w.chronicle.slice(-100);}}
export function returnArmyConvoy(w:World,a:Army){const c=a.convoy;if(!c)return;const s=w.realm!,at=c.route[c.leg],path=at===c.from?{route:[at,at],durations:[1]}:planRoute(at,c.from,id=>s.cities[id].controller===a.realm);if(s.cities[c.from].controller===a.realm&&path){ensurePopulation(w);const p=s.population!;p.transfers=p.transfers.filter(t=>t.status==='traveling').concat(p.transfers.filter(t=>t.status!=='traveling').slice(-56));p.transfers.push({id:p.nextId++,realm:a.realm,from:c.from,to:c.from,kind:'grain',sent:c.grain,arrived:0,lost:0,route:path.route,durations:path.durations,leg:0,elapsed:0,created:w.day,status:'traveling',returning:true,lossRate:5});}else a.supplyLost=(a.supplyLost??0)+c.grain;w.chronicle.push({day:w.day,person:'player',text:path&&s.cities[c.from].controller===a.realm?'军粮队沿安全道路返回原仓，损耗 5%。':'粮道与原仓无法保全，辎重损失。'});w.chronicle=w.chronicle.slice(-100);a.convoy=null;}
function emergencyBurden(w:World,r:RealmId,site:string,taken:number){
 const city=w.realm!.cities[site],safe=civilianFood(w,site)*2,excess=Math.max(0,Math.min(taken,safe-city.grain));if(!excess||w.realm!.supplyPolicies?.[r]!=='emergency')return;
 const month=monthStart(w.day,w.scriptId);if(city.militaryRequisition?.month!==month)city.militaryRequisition={month,grain:0,burden:0};const q=city.militaryRequisition;
 q.grain+=excess;const cumulative=Math.ceil(q.grain/100),burden=cumulative-q.burden;q.burden=cumulative;city.order=Math.max(0,city.order-burden);
 if(burden){w.chronicle.push({day:w.day,person:'player',text:`紧急征粮 ${taken}，${site}突破常规民食线；本月累计征发 ${q.grain}，本次秩序 −${burden}。`});w.chronicle=w.chronicle.slice(-100);}
}
export function distributeGarrisonFood(w:World){
 if(!w.realm)return;const s=w.realm;
 for(const [site,city] of Object.entries(s.cities)){
  const eligible=s.armies.filter(a=>!a.owner&&!a.journey&&armyControls(w,a,site)&&a.location===site&&a.supply+incomingArmySupply(w,a)<armySupplyTarget(w,a));if(!eligible.length)continue;
  const r=eligible[0].realm,bank=site===capital(r)&&!civilWar(w,r)?.civil?.cities.includes(site)?s.treasuries[r]:null;
  for(const priority of [2,1,0]){
   const armies=eligible.filter(a=>(a.supplyPriority??1)===priority);if(!armies.length)continue;
   const local=Math.max(0,city.grain-supplyReserve(w,site,r)),needs=armies.map(a=>armySupplyTarget(w,a)-a.supply-incomingArmySupply(w,a)),total=needs.reduce((n,v)=>n+v,0),take=Math.min(local+(bank?.grain??0),total);let used=0;
   for(let i=0;i<armies.length;i++){const n=Math.floor(take*needs[i]/total);armies[i].supply+=n;used+=n;}
   let remainder=take-used;for(let n=0;n<armies.length&&remainder;n++){const i=(n+w.day)%armies.length;if(armies[i].supply+incomingArmySupply(w,armies[i])<armySupplyTarget(w,armies[i])){armies[i].supply++;remainder--;used++;}}
   const taken=Math.min(local,used);city.grain-=taken;if(bank)bank.grain-=Math.max(0,used-local);emergencyBurden(w,r,site,taken);
  }
 }
}
