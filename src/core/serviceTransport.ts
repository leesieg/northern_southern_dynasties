import {actorCommandsSide} from './civilWars';
import type {World} from './types';
import type {Assignment} from './assignments';
import {capital} from './realm';
import {ensurePopulation,grainCapacity} from './population';
import {planRoute} from './world';
import {armySupplyCapacity} from './armyLogistics';
export interface ServiceDelivery {transfer:number|null;sent:number;arrived:number;delivered:number;lost:number;status:'traveling'|'arrived'|'returned'}
export function supplyDepartureReason(w:World,t:Assignment){
 if(t.kind!=='supply')return '';const from=t.funding?.find(f=>f.grain>0)?.grainSite??capital(t.realm);
 if(from!==t.site&&!planRoute(from,t.site,id=>w.realm!.cities[id].controller===t.realm))return '拨粮库至驻军的道路中断';
 if(from!==t.site&&(w.realm!.population?.transfers.filter(c=>c.status==='traveling').length??0)>=30)return '先等在途粮队抵达，再启办';
 return '';
}
/** Allocated grain has already left its payer's store. Dispatch never debits it twice. */
export function dispatchServiceGrain(w:World,t:Assignment){
 if(t.kind!=='supply'||t.delivery)return;ensurePopulation(w);const s=w.realm!,p=s.population!,from=t.funding?.find(f=>f.grain>0)?.grainSite??capital(t.realm),sent=t.funds.grain;
 t.delivery={transfer:null,sent,arrived:0,delivered:0,lost:0,status:'traveling'};t.spent={coins:t.spent?.coins??0,grain:sent};
 if(from===t.site){receiveServiceGrain(w,t,sent,false);return;}
 const route=planRoute(from,t.site,id=>s.cities[id].controller===t.realm);if(!route)throw new Error('军粮发运道路中断');
 const id=p.nextId++;t.delivery.transfer=id;p.transfers.push({serviceTask:t.id,id,realm:t.realm,from,to:t.site,kind:'grain',sent,arrived:0,lost:0,route:route.route,durations:route.durations,leg:0,elapsed:0,created:w.day,status:'traveling',lossRate:5});
}
export function receiveServiceGrain(w:World,t:Assignment,received:number,returning:boolean){
 const d=t.delivery!;if(d.status!=='traveling')return 0;if(returning){d.arrived=received;d.lost=d.sent-received;d.status='returned';return received;}const s=w.realm!,armies=returning?[]:s.armies.filter(a=>actorCommandsSide(w,t.officer,a)&&a.location===t.site&&!a.journey),needs=armies.map(a=>Math.max(0,armySupplyCapacity(a)-a.supply)),total=needs.reduce((n,v)=>n+v,0);
 let left=received;for(let i=0;i<armies.length;i++){const give=Math.min(left,needs[i],Math.floor(received*needs[i]/Math.max(1,total)));armies[i].supply+=give;left-=give;d.delivered+=give;}
 if(!returning){const city=s.cities[t.site],stored=Math.min(left,Math.max(0,grainCapacity(w,t.site)-city.grain));city.grain+=stored;left-=stored;}
 d.arrived=received-left;d.lost=d.sent-d.arrived;d.status=returning?'returned':'arrived';return d.arrived;
}
