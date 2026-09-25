import {relatives} from '../data/families';
import type {World} from './types';
import type {RealmId} from './realm';
import {siteById} from '../data/scenario';
import {relationshipPersonById} from '../data/relationships';
import {economyHost} from './personalEconomyAdapter';
import {personResidence} from './residence';
import {isAlive} from './lifeState';
import {allegianceRealm} from './officeEligibility';
import {localBalance,spendLocal,fiscalPath,ensureFiscal,fiscalRecord} from './treasury';
export interface Enterprise {id:number;owner:string;site:string;kind:'workshop'|'agriculture';capital:number;opened:number;lastOrder:number;earned:number;spent:number;order:{realm:RealmId;account:string;lastWorked:number;escrow:number;price:number;progress:number;required:number;started:number;deadline:number;method:'careful'|'swift'}|null;closed:boolean}
export interface Enterprises {nextId:number;items:Enterprise[]}
export type EnterpriseCommand={type:'enterprise';action:'open';kind:Enterprise['kind']}|{type:'enterprise';action:'order';id:number;method:'careful'|'swift'}|{type:'enterprise';action:'close'|'cancel'|'withdraw'|'invest';id:number};
export function enterpriseReason(w:World,c:EnterpriseCommand){
 if(!w.realm||w.mode!=='sandbox'||!w.characterId)return '仅历史沙盒可用';
 const id=w.characterId,host=economyHost(w),actor=host.actor(id),wallet=host.personal(id);
 if(!actor?.alive||!actor.adult||!wallet)return '须由成年在世人物经营';
 if(c.action==='open'){const site=w.people[0].location,city=w.realm.cities[site];return !['workshop','agriculture'].includes(c.kind)?'无效事业':w.people[0].journey?'抵达后方可置业':city.owner!==allegianceRealm(w,id)||city.controller!==city.owner?'只能在本国安定城市置业':wallet.read()<120?'开业须私财 120 钱':(w.enterprises?.items.filter(e=>!e.closed&&e.owner===id).length??0)>=3?'最多经营三处事业':(w.enterprises?.items.length??0)>=256?'事业名册已满':'';}
 const e=w.enterprises?.items.find(e=>e.id===c.id);if(!e||e.closed||e.owner!==id)return '不是你经营的事业';
 if(c.action==='withdraw')return e.capital<100?'事业资本不足 100 钱':wallet.read()>999900?'私财空间不足':'';
 if(c.action==='invest')return wallet.read()<100?'私财不足 100 钱':e.capital>999900?'事业资本空间不足':'';
 if(c.action==='close')return e.order?'先结清或撤销在办合同':'';
 if(c.action==='cancel')return e.order?'':'没有在办合同';
 if(c.action!=='order'||!['careful','swift'].includes(c.method))return '无效经营行动';
 const city=w.realm.cities[e.site],r=city.owner as RealmId;
 return e.order?'已有在办合同':e.lastOrder+90>w.day?'当地再次发包须相隔 90 日':personResidence(w,id).traveling||personResidence(w,id).site!==e.site?'须亲赴事业所在地承办':!actor.available?'请先交接公务或其他活动':city.controller!==r||r!==actor.realm?'当地失守或效忠发生变化':host.managedAccounts(id).some(a=>a.id===fiscalPath(w,e.site)[0])||host.auditableAccounts(id).some(a=>a.id===fiscalPath(w,e.site)[0])?'不得承接由自己审批或监察的公款合同':e.kind==='workshop'&&city.prosperity>=90?'当地修缮需求已满足':e.kind==='agriculture'&&city.irrigation>=10?'当地水利已完备':localBalance(w,e.site)<100?'地方公库不足合同价款 100 钱':e.capital<(c.method==='careful'?60:30)?'事业资本不足本单成本':'';
}
export function actEnterprise(w:World,c:EnterpriseCommand){const why=enterpriseReason(w,c);if(why)throw new Error(why);const s=w.enterprises??={nextId:1,items:[]},wallet=economyHost(w).personal(w.characterId!)!;
 if(c.action==='open'){wallet.write(wallet.read()-120);s.items.push({id:s.nextId++,owner:w.characterId!,site:w.people[0].location,kind:c.kind,capital:120,opened:w.day,lastOrder:w.day-90,earned:0,spent:0,order:null,closed:false});return;}
 const e=s.items.find(e=>e.id===c.id)!;
 if(c.action==='order'){const price=100,required=c.method==='careful'?30:20,city=w.realm!.cities[e.site];spendLocal(w,e.site,price,'承包预付款','enterprise:'+e.id);const cost=c.method==='careful'?60:30;e.capital-=cost;e.spent+=cost;e.lastOrder=w.day;e.order={lastWorked:w.day,realm:city.owner as RealmId,account:fiscalPath(w,e.site)[0],escrow:price,price,progress:0,required,started:w.day,deadline:w.day+90,method:c.method};}
 else if(c.action==='withdraw'){wallet.write(wallet.read()+100);e.capital-=100;}
 else if(c.action==='invest'){wallet.write(wallet.read()-100);e.capital+=100;}
 else if(c.action==='cancel')refund(w,e);
 else {const n=Math.min(e.capital,1_000_000-wallet.read());wallet.write(wallet.read()+n);e.capital-=n;if(!e.capital)e.closed=true;}
}
function refund(w:World,e:Enterprise){const q=e.order;if(!q)return;const f=ensureFiscal(w)!,room=1_000_000-(f.balances[q.account]??0),n=Math.min(room,q.escrow);f.balances[q.account]=(f.balances[q.account]??0)+n;q.escrow-=n;fiscalRecord(w,q.realm,'enterprise:'+e.id,q.account,n,'承包撤销退回未付价款');if(!q.escrow)e.order=null;}
export function advanceEnterprises(w:World){if(!w.enterprises||!w.realm)return;const host=economyHost(w);
 for(const e of w.enterprises.items){if(e.closed)continue;
 if(!isAlive(w,e.owner)){const successor=w.social?.lineage.findIndex(p=>p.id===e.owner)??-1;if(successor>=0&&w.social?.lineage[successor+1])e.owner=w.social.lineage[successor+1].id;else{const heir=relatives(e.owner,'descendants').find(p=>relationshipPersonById[p.id]&&isAlive(w,p.id));if(heir)e.owner=heir.id;else{refund(w,e);continue;}}}
 const q=e.order;if(!q)continue;const city=w.realm.cities[e.site];
 if(w.day>q.deadline||city.controller!==q.realm||allegianceRealm(w,e.owner)!==q.realm){refund(w,e);continue;}
 if(q.progress===q.required){refund(w,e);continue;}
 if(q.lastWorked>=w.day)continue;q.lastWorked=w.day;
 const actor=host.actor(e.owner),at=personResidence(w,e.owner);if(!actor?.adult||!actor.available||at.traveling||at.site!==e.site)continue;
 q.progress=Math.min(q.required,q.progress+1);if(q.progress<q.required)continue;
 // Actual public demand and finite escrow; a fast contract earns less and restores less.
 const paid=Math.min(1_000_000-e.capital,q.escrow,q.method==='careful'?100:65);e.capital+=paid;e.earned+=paid;q.escrow-=paid;
 if(e.kind==='workshop')city.prosperity=Math.min(100,city.prosperity+(q.method==='careful'?8:3));else city.irrigation=Math.min(10,city.irrigation+1);
 fiscalRecord(w,q.realm,'enterprise:'+e.id,'person:'+e.owner,paid,'承包验收：'+(e.kind==='workshop'?'地方修缮':'水利劳务'));refund(w,e);
 w.chronicle.push({day:w.day,person:'player',text:siteById[e.site].name+'承包验收，收入 '+paid+' 钱，留存事业资本。'});w.chronicle=w.chronicle.slice(-100);
 }
}
export function validEnterprises(w:World){const s=w.enterprises;if(s===undefined)return true;const n=(v:unknown,max=1_000_000)=>Number.isSafeInteger(v)&&Number(v)>=0&&Number(v)<=max;
 return !!s&&n(s.nextId)&&s.nextId>0&&Array.isArray(s.items)&&s.items.length<=256&&new Set(s.items.map(e=>e?.id)).size===s.items.length&&s.items.every(e=>e&&n(e.id,s.nextId-1)&&e.id>0&&!!relationshipPersonById[e.owner]&&!!siteById[e.site]&&['workshop','agriculture'].includes(e.kind)&&n(e.capital)&&n(e.opened,w.day)&&Number.isSafeInteger(e.lastOrder)&&e.lastOrder>=-90&&e.lastOrder<=w.day&&n(e.earned,1e9)&&n(e.spent,1e9)&&typeof e.closed==='boolean'&&(!e.closed||!e.order&&e.capital===0)&&(e.order===null||!!e.order&&['liang','east','west'].includes(e.order.realm)&&e.order.account===e.order.realm+'|city:'+e.site&&n(e.order.lastWorked,w.day)&&e.order.lastWorked>=e.order.started&&n(e.order.escrow,100)&&e.order.price===100&&n(e.order.progress,e.order.required)&&e.order.required===(e.order.method==='careful'?30:20)&&['careful','swift'].includes(e.order.method)&&n(e.order.started,w.day)&&e.order.deadline===e.order.started+90));
}
