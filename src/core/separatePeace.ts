import type {World} from './types';
import type {RealmId} from './realm';
import {playerRealm,syncGovernance} from './realm';
import {activeWars,warRealmSide} from './wars';
import {governingExecutives} from './government';
import {accountWallet,transferAccount} from './obligations';
import {planRoute} from './world';
import {canEnter} from './diplomacy';
export type SeparatePeaceCommand={type:'separatePeace';war:number;coins:number};
export function separatePeaceReason(w:World,c:SeparatePeaceCommand){if(!w.realm||!w.characterId)return '须有效身份';const r=playerRealm(w),war=activeWars(w).find(v=>v.id===c.war),side=war&&warRealmSide(war,r);return !war||war.civil||!side||r===war.attacker||r===war.defender?'仅参战盟国可单独退出':!governingExecutives(w,r).includes(w.characterId)?'须实际执政者裁定':![0,100,300].includes(c.coins)?'无效退出赔款':w.realm.treasuries[r].coins<c.coins?'退出赔款须足额支付':w.day-war.started<30?'参战未满三十日':c.coins===0&&war.score*(side==='attack'?1:-1)<-20?'敌方拒绝无条件退出，请提出赔款':'';}
export function actSeparatePeace(w:World,c:SeparatePeaceCommand){const why=separatePeaceReason(w,c);if(why)throw new Error(why);const r=playerRealm(w),war=activeWars(w).find(v=>v.id===c.war)!,side=warRealmSide(war,r),enemy=side==='attack'?war.defender:war.attacker;
 if(c.coins){const recipient=accountWallet(w,'central:'+enemy)!;if(recipient.read()+c.coins>recipient.capacity)throw new Error('对方公库无法接收退出赔款');transferAccount(w,'central:'+r,'central:'+enemy,c.coins,'盟国单独议和赔款');}
 for(const city of Object.values(w.realm!.cities))if(city.occupiedByWar===war.id&&(city.controller===r||city.owner===r)&&city.owner!==city.controller){city.controller=city.owner;delete city.occupiedSince;delete city.occupiedByWar;}
 delete war.allies?.[r];for(const [id,otherSide] of [[war.attacker,'attack'],[war.defender,'defend'],...Object.entries(war.allies??{})])if(otherSide!==side&&!activeWars(w).some(v=>v!==war&&warRealmSide(v,r)&&warRealmSide(v,id as RealmId)&&warRealmSide(v,r)!==warRealmSide(v,id as RealmId)))w.realm!.truces[[r,id].sort().join('|')]=w.day+360;
 for(const a of w.realm!.armies.filter(a=>a.realm===r)){const foreign=w.realm!.cities[a.location].controller;if(foreign===r||foreign==='frontier'||activeWars(w).some(v=>v!==war&&warRealmSide(v,r)&&warRealmSide(v,foreign)&&warRealmSide(v,r)!==warRealmSide(v,foreign)))continue;const routes=Object.keys(w.realm!.cities).filter(id=>w.realm!.cities[id].controller===r).map(id=>planRoute(a.location,id,node=>w.realm!.cities[node].controller===r||canEnter(w,r,w.realm!.cities[node].controller,undefined,true)||w.realm!.cities[node].controller===enemy)).filter(p=>p!==null).sort((a,b)=>a.days-b.days),path=routes[0];a.journey=path?{route:path.route,durations:path.durations,leg:0,elapsed:0,started:w.day}:null;a.withdrawalUntil=w.day+(path?.days??30)+30;a.siege=0;}
 w.realm!.sieges=w.realm!.sieges?.filter(s=>s.war!==war.id||w.realm!.armies.some(a=>a.location===s.site&&!a.journey&&warRealmSide(war,a.realm)===s.side));
 syncGovernance(w);w.chronicle.push({day:w.day,person:'player',text:'本国单独退出战争，仅处理本国占领与义务，战争主导国继续交战；驻外部队沿道路撤军。'});w.chronicle=w.chronicle.slice(-100);
}
