import {attributes} from './social';
import {enactPoliticalAction} from './politicalActions';
import {siteById} from '../data/scenario';
import {governmentExecutive,governmentOf} from './government';
import {playerRealm,capital,type RealmId} from './realm';
import {planRoute,legDays} from './world';
import {atWar,recordRaid} from './diplomacy';
import type {World} from './types';
export interface PopulationTransfer {id:number;realm:RealmId;from:string;to:string;kind:'assisted'|'forced'|'raid'|'grain';sent:number;arrived:number;lost:number;route:string[];durations:number[];leg:number;elapsed:number;created:number;status:'traveling'|'arrived'|'returned';returning?:boolean;lossRate:number}
export interface PopulationState {version:1;nextId:number;lastDay:number;transfers:PopulationTransfer[]}
export type PopulationCommand={type:'population';action:'transfer';from:string;to:string;amount:number;kind:PopulationTransfer['kind']}|{type:'population';action:'return';id:number};
export function ensurePopulation(w:World){if(!w.realm)return;w.realm.population??={version:1,nextId:1,lastDay:w.day,transfers:[]};for(const c of Object.values(w.realm.cities)){c.grain??=0;c.irrigation??=0;}}
export function civilianFood(w:World,site:string){return Math.ceil(w.realm!.cities[site].population/150);}
export function grainCapacity(w:World,site:string){return 100+Math.ceil(w.realm!.cities[site].population/30)+(w.holdings.cities[site]?.levels.granary??0)*200;}
export function populationQuote(w:World,c:Extract<PopulationCommand,{action:'transfer'}>){
 const r=playerRealm(w),route=planRoute(c.from,c.to,id=>w.realm!.cities[id]?.controller===r),days=route?.days??0;
 const governor=w.realm!.cities[c.from]?.governor,skill=governor?Math.floor(attributes(w,governor).stewardship/6):0;
 const lossRate=Math.max(1,Math.min(60,(c.kind==='assisted'?2:c.kind==='forced'?10:c.kind==='raid'?20:3)+Math.ceil(days/(c.kind==='assisted'?10:5))-skill+(w.realm!.cities[c.from]?.order<40?5:0)));
 return {route,days,lossRate,arrived:Math.floor(c.amount*(100-lossRate)/100),coins:Math.ceil(c.amount*(c.kind==='assisted'?.12:c.kind==='grain'?.08:.04))+Math.ceil(days/3),grain:c.kind==='grain'?0:Math.ceil(c.amount*days/600)};
}
export function populationReason(w:World,c:PopulationCommand){
 if(!w.realm||!w.characterId||w.campaign?.status!=='active')return '仅历史沙盒可用';
 if(w.realm.event)return '先处理待决事务';
 const r=playerRealm(w),s=w.realm;
 if(c.action==='return'){const t=s.population?.transfers.find(t=>t.id===c.id);if(!t||t.realm!==r||t.status!=='traveling'||t.returning)return '没有可撤回的队伍';if(!governmentExecutive(w))return '须由实际执政者下令';return s.cities[t.from].controller!==r?'原籍已失守':t.route[t.leg]===t.from?'':planRoute(t.route[t.leg],t.from,id=>s.cities[id].controller===r)?'':'返程道路中断';}
 if(!['assisted','forced','raid','grain'].includes(c.kind)||!Number.isSafeInteger(c.amount)||c.amount<1)return '数量须为正整数';
 const a=s.cities[c.from],b=s.cities[c.to];if(!a||!b||c.from===c.to)return '请选择不同的有效城市';
 if((s.population?.transfers.filter(t=>t.status==='traveling').length??0)>=30)return '在途队伍已达上限';
 if(b.owner!==r||b.controller!==r||a.controller!==r)return '起点与目的地须受本国控制，目的地须为本国城市';
 if(c.kind==='raid'){
 if(s.population?.transfers.some(t=>t.realm===r&&t.kind==='raid'&&t.status==='traveling'))return '押送队伍尚未返回，不能重复掠夺';
 const army=s.armies.find(a=>a.realm===r&&!a.journey&&a.location===c.from);
 if(!s.mandate||!army||!atWar(w,r,a.owner as RealmId)||a.owner===r)return '须有军务授权、驻军并占领交战敌城';
 if(c.amount>army.troops||c.amount>Math.floor(a.population*.2))return '掠夺人数不得超过驻军人数与当地人口的两成';
 }else if(!governmentExecutive(w)&&!(c.kind==='grain'&&a.governor===w.characterId))return '迁民政策须有实际执政权，调粮亦可由本城刺史发起';
 if(c.kind!=='raid'&&a.owner!==r)return '迁民须从本国城市出发';
 if(c.kind==='grain'){if(c.amount>a.grain+(c.from===capital(r)?s.treasuries[r].grain:0))return '本城公粮不足';if(b.grain+c.amount>grainCapacity(w,c.to))return '目的地仓容不足';}
 else if(b.population+c.amount+(s.population?.transfers.filter(t=>t.to===c.to&&t.status==='traveling'&&t.kind!=='grain').reduce((n,t)=>n+t.sent,0)??0)>1_000_000)return '目的地人口承载已达上限';
 else if(c.amount>a.population-100)return '须保留至少 100 人';
 const q=populationQuote(w,c);if(!q.route)return '没有安全的本国运输道路';
 if(s.treasuries[r].coins<q.coins||s.treasuries[r].grain<q.grain)return '中央钱粮不足以组织队伍';return '';
}
export function actPopulation(w:World,c:PopulationCommand){const reason=populationReason(w,c);if(reason)throw new Error(reason);ensurePopulation(w);const s=w.realm!,p=s.population!,r=playerRealm(w);
 if(c.action==='return'){const t=p.transfers.find(t=>t.id===c.id)!,path=planRoute(t.route[t.leg],t.from,id=>s.cities[id].controller===r)??{route:[t.from],durations:[]};t.to=t.from;t.route=path.route.length>1?path.route:[t.from,t.from];t.durations=path.durations.length?path.durations:[1];t.leg=0;t.elapsed=0;t.returning=true;t.lossRate=Math.min(60,t.lossRate+5);return;}
 enactPoliticalAction(w,r,c.kind==='raid'?'military':'migration');
 const q=populationQuote(w,c),a=s.cities[c.from];s.treasuries[r].coins-=q.coins;s.treasuries[r].grain-=q.grain;
 if(c.kind==='grain'){const local=Math.min(a.grain,c.amount);a.grain-=local;s.treasuries[r].grain-=c.amount-local;}else {a.population-=c.amount;a.order=Math.max(0,a.order-(c.kind==='assisted'?2:c.kind==='forced'?10:25));}
 if(c.kind==='raid'){recordRaid(w,r,a.owner as RealmId);const g=governmentOf(w,r)!;g.legitimacy=Math.max(0,g.legitimacy-5);g.support=Math.max(0,g.support-3);}
 p.transfers.push({id:p.nextId++,realm:r,from:c.from,to:c.to,kind:c.kind,sent:c.amount,arrived:0,lost:0,route:q.route!.route,durations:q.route!.durations,leg:0,elapsed:0,created:w.day,status:'traveling',lossRate:q.lossRate});
 w.chronicle.push({day:w.day,person:'player',text:`${siteById[c.from].name}向${siteById[c.to].name}${c.kind==='grain'?'调粮':'迁送人口'} ${c.amount}，预计 ${q.days} 日，途中损耗 ${q.lossRate}%。`});w.chronicle=w.chronicle.slice(-100);
}
export function advancePopulation(w:World){if(!w.realm)return;ensurePopulation(w);const s=w.realm!,p=s.population!;if(p.lastDay>=w.day)return;p.lastDay=w.day;
 for(const t of p.transfers){if(t.status!=='traveling')continue;const next=t.route[t.leg+1];if(s.cities[next].controller!==t.realm||s.cities[t.to].controller!==t.realm)continue;t.elapsed++;if(t.elapsed<t.durations[t.leg])continue;t.elapsed=0;t.leg++;if(t.leg<t.durations.length)continue;
 const city=s.cities[t.to],received=Math.floor(t.sent*(100-t.lossRate)/100);t.arrived=t.kind==='grain'?Math.min(received,Math.max(0,grainCapacity(w,t.to)-city.grain)):Math.min(received,Math.max(0,1_000_000-city.population));t.lost=t.sent-t.arrived;t.status=t.returning?'returned':'arrived';if(t.kind==='grain')city.grain+=t.arrived;else {city.population+=t.arrived;city.order=Math.max(0,city.order-(t.kind==='assisted'?1:8));}
 w.chronicle.push({day:w.day,person:'player',text:`${siteById[t.to].name}接收${t.kind==='grain'?'公粮':'人口'} ${t.arrived}，途中损耗 ${t.lost}。`});}
 p.transfers=[...p.transfers.filter(t=>t.status!=='traveling').slice(-60),...p.transfers.filter(t=>t.status==='traveling')];w.chronicle=w.chronicle.slice(-100);
}
/** Local harvest after civilian consumption. The capital is the central grain depot. */
export function settleLocalGrain(w:World,r:RealmId,yieldFor:(id:string)=>number){const s=w.realm!;for(const [id,c] of Object.entries(s.cities)){if(c.controller!==r)continue;const net=yieldFor(id)-civilianFood(w,id);const before=c.grain;c.grain=Math.max(0,c.grain+net);if(before+net<0){const deaths=Math.min(c.population-100,Math.ceil(-(before+net)*10));c.population-=Math.max(0,deaths);c.order=Math.max(0,c.order-8);}const loss=Math.floor(c.grain*Math.max(.005,.03-(w.holdings.cities[id]?.levels.granary??0)*.008));c.grain=Math.min(grainCapacity(w,id),c.grain-loss);if(id===capital(r)&&c.owner===r){const reserve=civilianFood(w,id)*2,transfer=Math.max(0,c.grain-reserve);c.grain-=transfer;s.treasuries[r].grain=Math.min(1_000_000,s.treasuries[r].grain+transfer);}}}
export function validPopulation(w:World){
 const p=w.realm?.population;if(p===undefined)return true;
 const int=(v:unknown,max=1_000_000):v is number=>Number.isSafeInteger(v)&&Number(v)>=0&&Number(v)<=max;
 if(!p||p.version!==1||!int(p.nextId)||!int(p.lastDay,w.day)||!Array.isArray(p.transfers)||p.transfers.length>90)return false;
 const seen=new Set<number>();for(const t of p.transfers){if(!t||(t.returning!==undefined&&typeof t.returning!=='boolean')||!int(t.id)||t.id>=p.nextId||seen.has(t.id)||!['liang','east','west'].includes(t.realm)||!siteById[t.from]||!siteById[t.to]||(!t.returning&&t.from===t.to)||!['assisted','forced','raid','grain'].includes(t.kind)||!['traveling','arrived','returned'].includes(t.status)||!int(t.sent)||!t.sent||!int(t.arrived)||!int(t.lost)||!int(t.lossRate,60)||!int(t.created,w.day)||!Array.isArray(t.route)||!t.route.every(id=>!!siteById[id])||(!t.returning&&t.route[0]!==t.from)||t.route.at(-1)!==t.to||!Array.isArray(t.durations)||t.durations.length!==t.route.length-1||!t.durations.length||!t.durations.every(n=>int(n,1000)&&n>0)||!int(t.leg,t.durations.length)||!int(t.elapsed,1000))return false;if(!(t.returning&&t.route.length===2&&t.route[0]===t.route[1]))for(let i=0;i<t.durations.length;i++){try{if(legDays(t.route[i],t.route[i+1])!==t.durations[i])return false;}catch{return false;}}seen.add(t.id);if(t.status==='traveling'?(t.leg>=t.durations.length||t.elapsed>=t.durations[t.leg]||t.arrived!==0||t.lost!==0):(t.arrived+t.lost!==t.sent))return false;}return true;
}
