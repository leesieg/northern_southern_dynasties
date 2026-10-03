import {worldRealms} from './polityRuntime';
import type {World} from './types';
import type {RealmId} from './realm';
import {occupyCity,playerRealm,syncGovernance} from './realm';
import {activeWars,bilateralWar,ensureWars} from './wars';
import {snapshotWarValues} from './warScoring';
import {civilianFood} from './population';
import {isMonthStart} from './calendar';
import {governingExecutives,governmentOf,regimeName} from './government';
import {relationOpinion} from './relationships';
import {armyCommander} from './mobility';
import {governingAuthority} from './government';
import {courtOf} from './court';
import {diplomaticWar} from './diplomacy';
import {roads,siteById} from '../data/scenario';
export interface Defection {id:number;site:string;from:RealmId;to:RealmId;created:number;status:'pending'|'accepted'|'rejected'|'withdrawn';reason:string}
export interface Defections {nextId:number;lastDay:number;items:Defection[]}
export type DefectionCommand={type:'defection';action:'accept'|'reject'|'relieve';id:number};
export function defectionReason(w:World,c:DefectionCommand){const q=w.defections?.items.find(q=>q.id===c.id),r=playerRealm(w);if(!q||q.status!=='pending')return '归附事项已结束';const city=w.realm!.cities[q.site];return !w.characterId||!governingExecutives(w,r).includes(w.characterId)?'须实际执政者裁定':c.action==='relieve'?(r!==q.from?'须原属国赈济':city.grain<50?'本城赈济需公粮 50':''):r!==q.to?'须接纳国裁定':city.owner!==q.from||city.controller!==q.from?'该城的控制或归属已经变化':c.action==='accept'&&w.day-q.created<7?'须等待原属国七日处置期':c.action==='accept'&&w.realm!.treasuries[q.to].coins<100?'接纳归附需中央保护预算 100 钱':'';}
function resolve(w:World,q:Defection,action:DefectionCommand['action']){const city=w.realm!.cities[q.site];if(action==='relieve'){city.grain-=50;city.order=Math.min(100,city.order+20);q.status='withdrawn';return;}if(action==='reject'){q.status='rejected';return;}
 ensureWars(w);const s=w.realm!,existing=bilateralWar(w,q.to,q.from);s.treasuries[q.to].coins-=100;
 const war=existing??{id:s.nextWarId!++,attacker:q.to,defender:q.from,target:q.site,goal:'defection' as const,started:w.day,score:0,battles:0,captureLosses:[],disputes:[]};
 if(!existing){for(const v of activeWars(w))if(!v.civil&&v.allies&&v.allies[q.to]&&v.allies[q.to]===((v.attacker===q.from)?'attack':(v.defender===q.from)?'defend':v.allies[q.from]))delete v.allies[q.to];snapshotWarValues(w,war);s.wars!.push(war);s.war=s.wars![0];diplomaticWar(w,q.to,q.from);delete s.truces[[q.to,q.from].sort().join('|')];}
 if(!war.disputes?.includes(q.site))(war.disputes??=[]).push(q.site);
 occupyCity(w,war,q.site,q.to,true);city.governor=null;q.status='accepted';city.order=Math.max(0,city.order-5);syncGovernance(w);
 w.chronicle.push({day:w.day,person:'player',text:`${regimeName(w,q.to)}接纳${siteById[q.site].name}归附，支出保护预算 100 钱，与${regimeName(w,q.from)}进入战争；法理归属保留，盟约与停战破坏由接纳方负责。`});w.chronicle=w.chronicle.slice(-100);
}
export function actDefection(w:World,c:DefectionCommand){const why=defectionReason(w,c);if(why)throw new Error(why);resolve(w,w.defections!.items.find(q=>q.id===c.id)!,c.action);}
export function advanceDefections(w:World){if(!w.realm)return;const s=w.defections??={nextId:1,lastDay:Math.max(0,w.day-1),items:[]};if(s.lastDay>=w.day)return;s.lastDay=w.day;
 for(const q of s.items.filter(q=>q.status==='pending')){const city=w.realm.cities[q.site];if(city.owner!==q.from||city.controller!==q.from||city.order>=55){q.status='withdrawn';continue;}if(w.day-q.created<7)continue;if(governingExecutives(w,q.to).includes(w.characterId!))continue;const capable=w.realm.armies.some(a=>a.realm===q.to&&a.troops>=200&&a.morale>=40);if(w.realm.treasuries[q.to].coins>=100&&capable)resolve(w,q,'accept');else if(w.day-q.created>=30)resolve(w,q,'reject');}
 if(!isMonthStart(w.day,w.scriptId))return;
 for(const [site,city] of Object.entries(w.realm.cities)){if(city.owner==='frontier'||city.controller!==city.owner||city.order>=35||city.grain>=civilianFood(w,site)||s.items.some(q=>q.site===site&&(q.status==='pending'||w.day-q.created<180)))continue;
 const from=city.owner,chief=governingAuthority(w,from),attitude=city.governor?relationOpinion(w,city.governor,chief):0,garrison=w.realm.armies.filter(a=>a.realm===from&&a.location===site&&!a.journey&&a.troops>=100&&a.morale>=40),loyalGarrison=garrison.some(a=>a.regiments?.some(u=>(u.institution??60)>=60)||armyCommander(w,a)===chief);if(attitude>20||loyalGarrison&&attitude>-30)continue;const crisis=(governmentOf(w,from)?.support??100)<40||courtOf(w,from)?.phase==='chaos'||activeWars(w).some(v=>!!v.civil&&v.attacker===from||v.attacker===from||v.defender===from);if(!crisis)continue;
 const to=worldRealms(w).filter(r=>r!==from&&!w.realm!.annexed?.[r]&&roads.some(e=>!e.legacyOnly&&(e.from===site&&w.realm!.cities[e.to].controller===r||e.to===site&&w.realm!.cities[e.from].controller===r))).sort((a,b)=>w.realm!.treasuries[b].coins-w.realm!.treasuries[a].coins)[0];if(!to||!w.realm.armies.some(a=>a.realm===to&&a.troops>=200&&a.morale>=40))continue;
 s.items.push({id:s.nextId++,site,from,to,created:w.day,status:'pending',reason:'地方失序且缺粮，朝廷保护削弱；主官与驻军未能维持效忠，接纳国有可用军力'});
 }
 s.items=s.items.filter(q=>q.status==='pending'||w.day-q.created<360);
}
export function validDefections(w:World){const s=w.defections;if(s===undefined)return true;return !!s&&Number.isSafeInteger(s.nextId)&&s.nextId>0&&Number.isSafeInteger(s.lastDay)&&s.lastDay>=0&&s.lastDay<=w.day&&Array.isArray(s.items)&&s.items.length<=1000&&new Set(s.items.map(q=>q.id)).size===s.items.length&&s.items.every(q=>q&&Number.isSafeInteger(q.id)&&q.id>0&&q.id<s.nextId&&!!siteById[q.site]&&worldRealms(w).includes(q.from)&&worldRealms(w).includes(q.to)&&q.from!==q.to&&Number.isSafeInteger(q.created)&&q.created>=0&&q.created<=w.day&&['pending','accepted','rejected','withdrawn'].includes(q.status)&&typeof q.reason==='string'&&q.reason.length<=200);}
