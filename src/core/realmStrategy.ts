import {civilWar,warArmySide} from './civilWars';
import {worldRealms} from './polityRuntime';
import type {World} from './types';
import {roads,siteById} from '../data/scenario';
import {relationshipPeople} from '../data/relationships';
import {isMonthStart} from './calendar';
import {capital,playerRealm,realmForecast,armyDailyFood,armyMonthlyPay,warApproach,declareRealmWar,declareRealmWarReason,settleWar,type RealmId} from './realm';
import {activeWars,realmAtWar,peaceQuote,warRealmSide} from './wars';
import {warWillToContinue,warScoreFor} from './warScoring';
import {governingAuthority,governingExecutives,governmentOf} from './government';
import {diplomaticPair} from './diplomacy';
import {readyTroops} from './armyOrganization';
import {allegianceRealm,publicOfficeReason} from './officeEligibility';
import {attributes} from './social';
import {armyCommander,installCommander,dispatchNPC,npcRoute} from './mobility';
import {presentAt} from './residence';
import {planRoute} from './world';
import {mobilizeRealm,defensiveReserve} from './militaryAI';

export interface RealmStrategy {phase:'rest'|'prepare'|'war'|'recover';target:string|null;since:number;reviewed:number;reason:string}
export type RealmStrategies=Partial<Record<RealmId,RealmStrategy>>;
function log(w:World,r:RealmId,text:string){w.realm!.strategy??={};const previous=w.realm!.strategy[r];if(previous?.reason!==text){w.chronicle.push({day:w.day,person:'player',text:siteById[capital(r,w)].name+'朝廷：'+text});w.chronicle=w.chronicle.slice(-100);}}
function set(w:World,r:RealmId,phase:RealmStrategy['phase'],target:string|null,reason:string){log(w,r,reason);const old=w.realm!.strategy?.[r];w.realm!.strategy![r]={phase,target,reason,since:old?.phase===phase&&old.target===target?old.since:w.day,reviewed:w.day};}
/** Border objectives, a safe own approach and a funded finite campaign are required. */
export function strategicTargets(w:World,r:RealmId){
 const cities=w.realm!.cities;
 return Object.keys(cities).filter(id=>{const c=cities[id];return c.owner!=='frontier'&&c.owner!==r&&c.controller===c.owner&&roads.some(e=>!e.legacyOnly&&(e.from===id&&cities[e.to].controller===r||e.to===id&&cities[e.from].controller===r))&&warApproach(w,id,r,c.owner);}).map(id=>{const enemy=cities[id].owner as RealmId,pair=diplomaticPair(w,r,enemy),hostility=-(pair?.opinion??0),policy=governmentOf(w,r)?.court?.policy;return {id,enemy,motive:hostility+(policy==='expansion'?25:0)+(cities[id].order<40?15:0),reason:hostility>=40?'边境敌对关系':policy==='expansion'?'朝廷拓境方略':'边境机会'};}).filter(v=>v.motive>=40).sort((a,b)=>b.motive-a.motive||a.id.localeCompare(b.id));
}
export function appointAICommanders(w:World,r:RealmId){
 if(!w.mobility)return;
 for(const a of w.realm!.armies.filter(a=>a.realm===r&&!a.journey&&!armyCommander(w,a)&&!w.mobility!.pendingCommanders?.[a.id!])){
  const candidate=relationshipPeople.filter(p=>p.id!==w.characterId&&allegianceRealm(w,p.id)===r&&(!civilWar(w,r)||civilWar(w,r)!.civil!.supporters.includes(p.id)===(warArmySide(w,civilWar(w,r)!,a)==='attack'))&&!publicOfficeReason(w,p.id)&&!governingExecutives(w,r).includes(p.id)).sort((x,y)=>attributes(w,y.id).martial-attributes(w,x.id).martial).find(p=>presentAt(w,p.id,a.location)||!!npcRoute(w,p.id,a.location));
  if(!candidate)continue;
  if(presentAt(w,candidate.id,a.location))installCommander(w,a,candidate.id);
  else {w.mobility.pendingCommanders??={};w.mobility.pendingCommanders[a.id!]={person:candidate.id,ordered:w.day};dispatchNPC(w,candidate.id,a.location);}
 }
}
export function advanceRealmStrategy(w:World){
 if(!w.realm||!isMonthStart(w.day,w.scriptId))return;
 const s=w.realm;
 for(const r of worldRealms(w)){const actor=governingAuthority(w,r);if(!actor||actor===w.characterId||s.annexed?.[r]||(s.strategy?.[r]?.reviewed??-1)>=w.day)continue;
  const wars=activeWars(w).filter(v=>!v.civil&&[v.attacker,v.defender].includes(r));
  if(wars.length){
   appointAICommanders(w,r);
   for(const war of wars){const enemy=r===war.attacker?war.defender:war.attacker,other=governingAuthority(w,enemy);if(!other||w.day-war.started<30)continue;
    const ownWill=warWillToContinue(w,war,r).total,score=warScoreFor(w,war,r),demand=peaceQuote(w,war,r,'demand'),white=peaceQuote(w,war,r,'white');
    if(other===w.characterId){if(w.day-(war.peaceReviewed??-90)>=90){const terms=!demand.reason&&(score>=demand.cost+10||ownWill<=0)?'demand':!white.reason&&(ownWill<=0||w.day-war.started>=180)?'white':undefined;if(terms){war.peaceOffer={from:r,to:enemy,terms,created:w.day,until:w.day+15};war.peaceReviewed=w.day;log(w,r,'向玩家朝廷提出议和，等待裁定');}}continue;}
    if(!demand.reason&&(score>=demand.cost+10||ownWill<=0)){settleWar(w,war,'demand',r);set(w,r,'recover',null,'有限战争目标达成，转入战后休整');}
    else if(!white.reason&&(ownWill<=0||w.day-war.started>=180)&&warWillToContinue(w,war,enemy).total<=5){settleWar(w,war,'white',r);set(w,r,'recover',null,'继续交战收益不足，双方议定停战');}
   }
   if(realmAtWar(w,r))set(w,r,'war',wars[0].target,'依战争目标作战，按月复核续战成本');
   continue;
  }
  const previous=s.strategy?.[r];if(previous?.phase==='recover'&&w.day-previous.since<90){set(w,r,'recover',null,'战后恢复人口、军饷与粮运');continue;}
  if(previous?.phase==='war'){set(w,r,'recover',null,'战争结束，转入三个月休整');continue;}
  if(activeWars(w).some(v=>v.civil&&warRealmSide(v,r))){set(w,r,'rest',null,'先处理国内战事');continue;}
  const target=strategicTargets(w,r).find(t=>!declareRealmWarReason(w,actor,r,t.id,'territory',false));if(!target){set(w,r,'rest',null,'没有当前合法且值得投入的边境目标');continue;}
  const t=s.treasuries[r],forecast=realmForecast(w,r),own=s.armies.filter(a=>a.realm===r&&!a.owner),local=own.filter(a=>!!planRoute(a.location,target.id,id=>s.cities[id].controller===r||s.cities[id].controller===target.enemy)),enemy=s.armies.filter(a=>a.realm===target.enemy&&!!planRoute(a.location,target.id,id=>s.cities[id].controller===target.enemy));
  const strength=local.reduce((n,a)=>n+readyTroops(a,w.day)*a.morale/100,0),opposition=enemy.reduce((n,a)=>n+readyTroops(a,w.day)*a.morale/100,0),upkeep=own.reduce((n,a)=>n+armyMonthlyPay(w,a),0),budget=t.coins+forecast.income-forecast.expense;
  if(budget<120+upkeep*2||governmentOf(w,r)!.support<35||own.some(a=>(a.arrears??0)>0)){set(w,r,'rest',target.id,'边境动机存在，先修复军饷与两月出征预算');continue;}
  set(w,r,'prepare',target.id,target.reason+'：筹备'+siteById[target.id].name+'方向的有限战争');
  if((strength<Math.max(600,opposition*1.2)||own.length<2)&&own.length<4){const from=Object.keys(s.cities).filter(id=>s.cities[id].controller===r&&s.cities[id].owner===r).map(id=>({id,path:planRoute(id,target.id,node=>s.cities[node].controller===r||s.cities[node].controller===target.enemy)})).filter(v=>v.path).sort((x,y)=>x.path!.days-y.path!.days).find(v=>mobilizeRealm(w,r,v.id));if(from)appointAICommanders(w,r);}
  const ready=local.filter(a=>armyCommander(w,a)&&readyTroops(a,w.day)>=100&&!a.arrears&&a.supply>=Math.ceil(armyDailyFood(w,a)*30));
  if(previous?.phase==='prepare'&&previous.target===target.id&&w.day-previous.since>=30&&own.length>=2&&ready.filter(a=>a!==defensiveReserve(w,r)).reduce((n,a)=>n+readyTroops(a,w.day)*a.morale/100,0)>=Math.max(600,opposition*1.1)&&!declareRealmWarReason(w,actor,r,target.id)){
   declareRealmWar(w,actor,r,target.id);set(w,r,'war',target.id,target.reason+'，预算与前线军队已备妥');
  }
 }
}
export function validRealmStrategy(w:World){const s=w.realm?.strategy;if(s===undefined)return true;return !!s&&typeof s==='object'&&!Array.isArray(s)&&Object.entries(s).every(([r,v])=>worldRealms(w).includes(r as RealmId)&&v&&['rest','prepare','war','recover'].includes(v.phase)&&(v.target===null||!!siteById[v.target])&&Number.isSafeInteger(v.since)&&v.since>=0&&v.since<=w.day&&Number.isSafeInteger(v.reviewed)&&v.reviewed>=v.since&&v.reviewed<=w.day&&typeof v.reason==='string'&&v.reason.length<=200);}

export type PeaceOfferCommand={type:'peaceOffer';war:number;accept:boolean};
export function peaceOfferReason(w:World,c:PeaceOfferCommand){const war=activeWars(w).find(v=>v.id===c.war),q=war?.peaceOffer,r=playerRealm(w);if(!q||q.to!==r||q.until<w.day)return '当前没有有效的议和提议';if(!governingExecutives(w,r).includes(w.characterId!))return '须由实际执政者裁定';if(typeof c.accept!=='boolean')return '无效裁定';return c.accept?peaceQuote(w,war!,q.from,q.terms).reason:'';}
export function actPeaceOffer(w:World,c:PeaceOfferCommand){const reason=peaceOfferReason(w,c);if(reason)throw new Error(reason);const war=activeWars(w).find(v=>v.id===c.war)!,q=war.peaceOffer!;if(c.accept)settleWar(w,war,q.terms,q.from);else {delete war.peaceOffer;w.chronicle.push({day:w.day,person:'player',text:'朝廷拒绝本次议和提议，战争继续'});w.chronicle=w.chronicle.slice(-100);}}
