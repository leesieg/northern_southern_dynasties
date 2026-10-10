import {courtOf,courtPolicyActive,courtEnabled} from './court';
import {claimantWarReason} from './wars';
import {allPeople,getPerson} from './personRegistry';
import {armyCampaign} from './militaryCampaigns';
import {civilWar,warArmySide} from './civilWars';
import {worldRealms} from './polityRuntime';
import type {World} from './types';
import {roads,siteById} from '../data/scenario';

import {isMonthStart,monthIndex} from './calendar';
import {capital,playerRealm,realmForecast,armyDailyFood,armyMonthlyPay,warApproach,declareRealmWar,declareRealmWarReason,settleWar,type RealmId} from './realm';
import {activeWars,realmAtWar,defaultPeaceQuote,defaultPeaceReturns,peaceSignature,warRealmSide} from './wars';
import {warWillToContinue,warScoreFor,warObjectiveControl} from './warScoring';
import {governingAuthority,governingExecutives,governmentOf} from './government';
import {diplomaticPair} from './diplomacy';
import {readyTroops} from './armyOrganization';
import {allegianceRealm,publicOfficeReason} from './officeEligibility';
import {attributes} from './social';
import {armyCommander,installCommander,dispatchNPC,npcRoute} from './mobility';
import {presentAt} from './residence';
import {planRoute} from './world';
import {mobilizeRealm,defensiveReserve} from './militaryAI';
import {activeClaim,supportClaim,rulerEligibility} from './claims';
import {relationOpinion} from './relationships';
import {personResidence} from './residence';

export interface RealmStrategy {goal?:'territory'|'claimant';claimant?:string;phase:'rest'|'prepare'|'war'|'recover';target:string|null;since:number;reviewed:number;reason:string}
export type RealmStrategies=Partial<Record<RealmId,RealmStrategy>>;
function log(w:World,r:RealmId,text:string){w.realm!.strategy??={};const previous=w.realm!.strategy[r];if(previous?.reason!==text){w.chronicle.push({day:w.day,person:'player',text:siteById[capital(r,w)].name+'朝廷：'+text});w.chronicle=w.chronicle.slice(-100);}}
function set(w:World,r:RealmId,phase:RealmStrategy['phase'],target:string|null,reason:string,goal?:RealmStrategy['goal'],claimant?:string){log(w,r,reason);const old=w.realm!.strategy?.[r];w.realm!.strategy![r]={phase,target,reason,...(goal?{goal}:{}),...(claimant?{claimant}:{}),since:old?.phase===phase&&old.target===target&&(old.goal??'territory')===(goal??'territory')&&old.claimant===claimant?old.since:w.day,reviewed:w.day};}
/** Border objectives, a safe own approach and a funded finite campaign are required. */
export function strategicTargets(w:World,r:RealmId){
 const cities=w.realm!.cities;
 return Object.keys(cities).filter(id=>{const c=cities[id];return c.owner!=='frontier'&&c.owner!==r&&c.controller===c.owner&&roads.some(e=>!e.legacyOnly&&(e.from===id&&cities[e.to].controller===r||e.to===id&&cities[e.from].controller===r))&&warApproach(w,id,r,c.owner);}).map(id=>{
  const city=cities[id],enemy=city.owner as RealmId,hostility=-(diplomaticPair(w,r,enemy)?.opinion??0),policy=courtPolicyActive(w,r);
  const approach=Math.min(...Object.keys(cities).filter(site=>cities[site].controller===r).map(site=>planRoute(site,id,node=>cities[node].controller===r||node===id)?.days??Infinity));
  const defenders=w.realm!.armies.filter(a=>a.realm===enemy&&a.location===id).reduce((n,a)=>n+readyTroops(a,w.day),0),value=Math.min(15,Math.floor(city.population/10000)+Math.floor(city.prosperity/20)),opportunity=hostility>0?Math.max(0,25-Math.ceil(defenders/100))+value:0;
  const motive=hostility+(policy==='expansion'?25:0)+(city.order<40?15:0)+opportunity,priority=motive+value-approach-Math.ceil(defenders/200);
  return {id,enemy,motive,priority,approach,defenders,reason:hostility>=40?'边境敌对关系':policy==='expansion'?'朝廷拓境方略':'边境收益与驻防机会'};
 }).filter(v=>v.motive>=40&&Number.isFinite(v.approach)).sort((a,b)=>b.priority-a.priority||a.approach-b.approach||a.id.localeCompare(b.id));
}
export function strategicClaimantTargets(w:World,r:RealmId){const actor=governingAuthority(w,r),cities=w.realm!.cities;if(!actor)return [];return (w.claims?.records??[]).filter(c=>c.until===null&&c.patron===actor&&c.realm!==r&&!claimantWarReason(w,c.realm,actor,c.person)).flatMap(claim=>Object.keys(cities).filter(id=>cities[id].owner===claim.realm&&cities[id].controller===claim.realm&&roads.some(e=>!e.legacyOnly&&(e.from===id&&cities[e.to].controller===r||e.to===id&&cities[e.from].controller===r))&&warApproach(w,id,r,claim.realm)).map(id=>({id,enemy:claim.realm,motive:80,priority:80,approach:0,defenders:0,reason:'明确支持'+claim.person+'的真实君位宣称',goal:'claimant' as const,claimant:claim.person})));}
/** A foreign NPC court may back an actual exiled claimant it hosts and has reason to trust. */
export function supportHostedClaimant(w:World,r:RealmId,actor:string){
 if(actor===w.characterId||courtPolicyActive(w,r)!=='expansion')return;
 for(const person of allPeople(w)){if(person.id===w.characterId||allegianceRealm(w,person.id)!==r||w.realm!.cities[personResidence(w,person.id).site]?.controller!==r||relationOpinion(w,actor,person.id)<20)continue;
  for(const target of worldRealms(w)){if(target===r)continue;const claim=w.claims?.records.find(c=>c.realm===target&&c.person===person.id&&c.until===null&&(c.kind==='designated'||c.kind==='deposed'));if(!claim||!activeClaim(w,target,person.id)||rulerEligibility(w,target,person.id,{allowForeign:true})||governmentOf(w,target)?.ruler===person.id)continue;
   const border=Object.keys(w.realm!.cities).some(id=>w.realm!.cities[id].owner===target&&warApproach(w,id,r,target));if(!border)continue;
   supportClaim(w,target,person.id,actor);if(!claimantWarReason(w,target,actor,person.id))return;
  }
 }
}
export function appointAICommanders(w:World,r:RealmId){
 if(!w.mobility)return;
 for(const a of w.realm!.armies.filter(a=>a.realm===r&&!a.journey&&!armyCommander(w,a)&&!w.mobility!.pendingCommanders?.[a.id!])){
  const candidate= allPeople(w).filter(p=>p.id!==w.characterId&&allegianceRealm(w,p.id)===r&&(!civilWar(w,r)||civilWar(w,r)!.civil!.supporters.includes(p.id)===(warArmySide(w,civilWar(w,r)!,a)==='attack'))&&!publicOfficeReason(w,p.id)&&!governingExecutives(w,r).includes(p.id)).sort((x,y)=>attributes(w,y.id).martial-attributes(w,x.id).martial).find(p=>presentAt(w,p.id,a.location)||!!npcRoute(w,p.id,a.location));
  if(!candidate)continue;
  if(presentAt(w,candidate.id,a.location))installCommander(w,a,candidate.id);
  else {w.mobility.pendingCommanders??={};w.mobility.pendingCommanders[a.id!]={person:candidate.id,ordered:w.day};dispatchNPC(w,candidate.id,a.location);}
 }
}
export function advanceRealmStrategy(w:World){
 if(!w.realm||!isMonthStart(w.day,w.scriptId))return;
 const s=w.realm;
 const realms=worldRealms(w),offset=monthIndex(w.day,w.scriptId)%realms.length;
 for(const r of [...realms.slice(offset),...realms.slice(0,offset)]){const actor=governingAuthority(w,r);if(!actor||actor===w.characterId||s.annexed?.[r]||(s.strategy?.[r]?.reviewed??-1)>=w.day)continue;
  const wars=activeWars(w).filter(v=>!v.civil&&[v.attacker,v.defender].includes(r));
  if(wars.length){
   appointAICommanders(w,r);
   for(const war of wars){const enemy=r===war.attacker?war.defender:war.attacker,other=governingAuthority(w,enemy);if(!other||w.day-war.started<30)continue;
    const ownWill=warWillToContinue(w,war,r).total,score=warScoreFor(w,war,r),demand=defaultPeaceQuote(w,war,r,'demand'),white=defaultPeaceQuote(w,war,r,'white'),statusQuo=defaultPeaceQuote(w,war,r,'statusQuo'),annex=defaultPeaceQuote(w,war,r,'annex'),enthrone=defaultPeaceQuote(w,war,r,'enthrone'),hasDemand=demand.takesLand||demand.coins>0||demand.tributary||demand.annexes,enemyWill=warWillToContinue(w,war,enemy).total,repelled=r===war.defender&&score>=20&&enemyWill<=-15&&warObjectiveControl(w,war)==='defend'&&!s.armies.some(a=>warRealmSide(war,a.realm)==='attack'&&readyTroops(a,w.day)>=100&&a.morale>=25&&a.supply>=armyDailyFood(w,a)*2);
    const terms:import('./wars').PeaceTerms|undefined=enthrone.enthrones&&!enthrone.reason&&(score>=enthrone.cost+10||ownWill<=0)?'enthrone':hasDemand&&!demand.reason&&(score>=demand.cost+10||ownWill<=0)?'demand':!annex.reason&&(score>=annex.cost+10||ownWill<=0)?'annex':!statusQuo.reason&&(ownWill<=0&&enemyWill<=5||repelled)?'statusQuo':!white.reason&&(ownWill<=0&&enemyWill<=5||repelled)?'white':undefined;
    if(other===w.characterId){if(terms&&w.day-(war.peaceReviewed??-90)>=90){war.peaceOffer={from:r,to:enemy,terms,created:w.day,until:w.day+15,signature:peaceSignature(defaultPeaceQuote(w,war,r,terms))};war.peaceReviewed=w.day;log(w,r,'向玩家朝廷提出议和，等待裁定');}continue;}
    if(terms){settleWar(w,war,terms,r,[],0,undefined,defaultPeaceReturns(w,war,terms));set(w,r,'recover',null,terms==='white'?'双方归还占领地，转入战后休整':terms==='statusQuo'?'双方按实际占领交割，转入战后休整':'战争条件达成，转入战后休整');}
   }
   if(realmAtWar(w,r))set(w,r,'war',wars[0].target,'依战争目标作战，按月复核续战成本');
   continue;
  }
  const previous=s.strategy?.[r];if(previous?.phase==='recover'&&w.day-previous.since<90){set(w,r,'recover',null,'战后恢复人口、军饷与粮运');continue;}
  if(previous?.phase==='war'){set(w,r,'recover',null,'战争结束，转入三个月休整');continue;}
  if(activeWars(w).some(v=>v.civil&&warRealmSide(v,r))){set(w,r,'rest',null,'先处理国内战事');continue;}
  // Stable court policies bias motives and costs; they do not veto hostile border preparation.
  const court=courtOf(w,r);if(court&&courtEnabled(w,r)&&court.phase!=='stable'){set(w,r,'recover',null,'局势'+(court.phase==='chaos'?'混乱':'动荡')+'：安定方略暂停，先处理真实国内政治与民生压力');continue;}
  supportHostedClaimant(w,r,actor);
  const candidates=[...strategicClaimantTargets(w,r),...strategicTargets(w,r).map(t=>({...t,goal:'territory' as const,claimant:undefined as string|undefined}))].filter(t=>!declareRealmWarReason(w,actor,r,t.id,t.goal,false,undefined,t.claimant)),prepared=candidates.find(t=>t.id===previous?.target),target=prepared&&prepared.priority>=(candidates[0]?.priority??0)-10?prepared:candidates[0];if(!target){set(w,r,'rest',null,'没有当前合法且值得投入的边境目标');continue;}
  const t=s.treasuries[r],forecast=realmForecast(w,r),own=s.armies.filter(a=>a.realm===r&&!a.owner),local=own.filter(a=>!!planRoute(a.location,target.id,id=>s.cities[id].controller===r||s.cities[id].controller===target.enemy)),enemy=s.armies.filter(a=>a.realm===target.enemy&&(a.location===target.id||!!planRoute(a.location,target.id,id=>s.cities[id].controller===target.enemy)));
  const reserve=defensiveReserve(w,r),field=local.filter(a=>a!==reserve&&a.automation!=='direct'&&!a.withdrawalUntil&&!armyCampaign(w,a)),planned=field.reduce((n,a)=>n+a.troops*a.morale/100,0),opposition=enemy.reduce((n,a)=>{const days=a.location===target.id?0:planRoute(a.location,target.id,id=>s.cities[id].controller===target.enemy)!.days;return n+readyTroops(a,w.day)*a.morale/100*(days===0?1:days<=10?.75:days<=30?.5:.25);},0),upkeep=own.reduce((n,a)=>n+armyMonthlyPay(w,a),0),budget=t.coins+forecast.income-forecast.expense;
  if(budget<120+upkeep*2||governmentOf(w,r)!.support<35||own.some(a=>(a.arrears??0)>0)){set(w,r,'rest',target.id,'边境动机存在，先修复军饷与两月出征预算');continue;}
  set(w,r,'prepare',target.id,target.reason+'：筹备'+siteById[target.id].name+'方向的有限战争',target.goal,target.claimant);
  if((planned<Math.max(600,opposition*1.1)||own.length<2)&&own.length<16){const from=Object.keys(s.cities).filter(id=>s.cities[id].controller===r&&s.cities[id].owner===r).map(id=>({id,path:planRoute(id,target.id,node=>s.cities[node].controller===r||s.cities[node].controller===target.enemy)})).filter(v=>v.path).sort((x,y)=>x.path!.days-y.path!.days).find(v=>mobilizeRealm(w,r,v.id));if(from)appointAICommanders(w,r);}
  const ready=field.filter(a=>armyCommander(w,a)&&!w.mobility?.pendingCommanders?.[a.id!]&&readyTroops(a,w.day)>=100&&!a.arrears&&a.supply>=Math.ceil(armyDailyFood(w,a)*30));
  if(previous?.phase==='prepare'&&previous.target===target.id&&(previous.goal??'territory')===target.goal&&previous.claimant===target.claimant&&w.day-previous.since>=30&&own.length>=2&&ready.reduce((n,a)=>n+readyTroops(a,w.day)*a.morale/100,0)>=Math.max(600,opposition*1.1)&&!declareRealmWarReason(w,actor,r,target.id,target.goal,true,undefined,target.claimant)){
   declareRealmWar(w,actor,r,target.id,target.goal,undefined,target.claimant);set(w,r,'war',target.id,target.reason+'，预算与前线军队已备妥',target.goal,target.claimant);
  }
 }
}
export function validRealmStrategy(w:World){const s=w.realm?.strategy;if(s===undefined)return true;return !!s&&typeof s==='object'&&!Array.isArray(s)&&Object.entries(s).every(([r,v])=>worldRealms(w).includes(r as RealmId)&&v&&(v.goal===undefined||['territory','claimant'].includes(v.goal))&&(v.goal==='claimant'?!!getPerson(w,v.claimant??''):v.claimant===undefined)&&['rest','prepare','war','recover'].includes(v.phase)&&(v.target===null||!!siteById[v.target])&&Number.isSafeInteger(v.since)&&v.since>=0&&v.since<=w.day&&Number.isSafeInteger(v.reviewed)&&v.reviewed>=v.since&&v.reviewed<=w.day&&typeof v.reason==='string'&&v.reason.length<=200);}

export type PeaceOfferCommand={type:'peaceOffer';war:number;accept:boolean};
export function peaceOfferReason(w:World,c:PeaceOfferCommand){const war=activeWars(w).find(v=>v.id===c.war),q=war?.peaceOffer,r=playerRealm(w);if(!q||q.to!==r||q.until<w.day)return '当前没有有效的议和提议';if(!governingExecutives(w,r).includes(w.characterId!))return '须由实际执政者裁定';if(typeof c.accept!=='boolean')return '无效裁定';if(!c.accept)return '';const quote=defaultPeaceQuote(w,war!,q.from,q.terms);return q.signature!==undefined&&q.signature!==peaceSignature(quote)?'占领或条款已变化，须重新议和':quote.reason;}
export function actPeaceOffer(w:World,c:PeaceOfferCommand){const reason=peaceOfferReason(w,c);if(reason)throw new Error(reason);const war=activeWars(w).find(v=>v.id===c.war)!,q=war.peaceOffer!;if(c.accept)settleWar(w,war,q.terms,q.from,[],0,undefined,defaultPeaceReturns(w,war,q.terms));else {delete war.peaceOffer;w.chronicle.push({day:w.day,person:'player',text:'朝廷拒绝本次议和提议，战争继续'});w.chronicle=w.chronicle.slice(-100);}}
