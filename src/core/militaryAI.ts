import {recruitmentSources,consumeManpower,recruitmentRegiments} from './manpower';
import {warObjectiveSites} from './warTerritories';
import {localBalance,spendLocal,fiscalPath} from './treasury';
import {governingAuthority} from './government';
import {worldRealms} from './polityRuntime';
import {mobilizedTransportLabor} from './armyLogistics';
import {isMonthStart} from './calendar';
import {civilianFood} from './population';
import type {World} from './types';
import {activeWars,warRealmSide} from './wars';
import {capital,playerRealm,armyDailyFood,canMarchThrough,type Army,type RealmId} from './realm';
import {armyControls,warArmySide,armiesHostile,civilWar} from './civilWars';
import {armyCampaign} from './militaryCampaigns';
import {ensureArmyOrganization,readyTroops} from './armyOrganization';
import {governmentMusterReason,spendGovernmentMuster} from './government';
import {planRoute} from './world';
import {appointAICommanders} from './realmStrategy';
import {governingExecutives} from './government';
/** All non-player armies choose once per day using their own readiness and known objectives. */
export function advanceMilitaryAI(w:World){const s=w.realm;if(!s)return;for(const r of worldRealms(w)){if(s.annexed?.[r])continue;const playerExecutive=r===playerRealm(w)&&governingExecutives(w,r).includes(w.characterId!);const wars=activeWars(w).filter(v=>!!warRealmSide(v,r));if(!wars.length)continue;const treasury=s.treasuries[r];
 const internal=civilWar(w,r);if(internal&&internal.civil!.loyalist!==w.characterId&&!s.armies.some(a=>a.realm===r&&warArmySide(w,internal,a)==='defend')){const localOnly=internal.civil!.supporters.includes(governingAuthority(w,r)),site=Object.keys(s.cities).filter(id=>s.cities[id].owner===r&&s.cities[id].controller===r&&!internal.civil!.cities.includes(id)&&s.cities[id].population-mobilizedTransportLabor(w,id)>=700&&s.cities[id].grain>=120&&(!localOnly||localBalance(w,id)>=120)).sort((a,b)=>s.cities[b].population-s.cities[a].population)[0];if(site)mobilizeRealm(w,r,site,localOnly);}
 const own=s.armies.filter(a=>a.realm===r),opponents=new Set(worldRealms(w).filter(other=>wars.some(v=>warRealmSide(v,other)&&warRealmSide(v,other)!==warRealmSide(v,r)))),enemy=s.armies.filter(a=>opponents.has(a.realm)),reserve=defensiveReserve(w,r),offensive=wars.filter(v=>v.attacker===r&&warObjectiveSites(v,w).some(id=>warRealmSide(v,s.cities[id].controller as typeof r)!=='attack')),required=Math.max(0,...offensive.map(v=>enemy.filter(a=>warObjectiveSites(v,w).includes(a.location)&&!a.journey).reduce((n,a)=>n+readyTroops(a,w.day),0)*1.1)),field=own.filter(a=>a!==reserve&&a.automation!=='direct'&&!a.withdrawalUntil&&!armyCampaign(w,a)),underpowered=field.reduce((n,a)=>n+a.troops,0)<required||own.reduce((n,a)=>n+a.troops,0)<enemy.reduce((n,a)=>n+readyTroops(a,w.day),0)*.8;
 if(!civilWar(w,r)&&!playerExecutive&&(!own.length&&wars.some(v=>w.day-v.started>=5)||underpowered&&isMonthStart(w.day,w.scriptId))&&own.length<16&&treasury.coins>=120&&governingExecutives(w,r).length>0&&s.armies.length<48&&!governmentMusterReason(w,r)){const site=Object.keys(s.cities).filter(id=>s.cities[id].controller===r&&s.cities[id].owner===r&&s.cities[id].population-mobilizedTransportLabor(w,id)>=700&&(id===capital(r,w)?treasury.grain:s.cities[id].grain)>=120).sort((a,b)=>s.cities[b].population-s.cities[a].population)[0];if(site)mobilizeRealm(w,r,site);}
 if(!playerExecutive)appointAICommanders(w,r);
 for(const a of s.armies.filter(a=>a.realm===r)){
  const decision=delegatedArmyDecision(w,a,{wars,own,reserve,playerExecutive});
  if(!decision.route)continue;
  const route=decision.route;
  a.journey={route:route.route,durations:route.durations,leg:0,elapsed:0,started:w.day};
  if(decision.retreat){a.withdrawalUntil=w.day+route.days+1;a.morale=Math.max(0,a.morale-8);}
 }

}}

/** Paid peacetime preparation uses the same population, grain and muster constraints. */
export function mobilizeRealm(w:World,r:import('./realm').RealmId,site:string,localOnly=false){
 const s=w.realm!,c=s.cities[site],t=s.treasuries[r],sources=recruitmentSources(w,site,600);if(sources.reason||!c||c.owner!==r||c.controller!==r||s.armies.length>=48||s.armies.filter(a=>a.realm===r).length>=16||c.population-mobilizedTransportLabor(w,site)<700||(localOnly?localBalance(w,site):t.coins)<120||(!localOnly&&site===capital(r,w)?t.grain:c.grain)<120||governmentMusterReason(w,r))return false;
 if(localOnly)spendLocal(w,site,120,'地方守军实际征募');else t.coins-=120;if(!localOnly&&site===capital(r,w))t.grain-=120;else c.grain-=120;consumeManpower(w,site,sources.parts);spendGovernmentMuster(w,r);ensureArmyOrganization(w);const id=s.nextArmyId!++;s.armies.push({id,regiments:recruitmentRegiments(sources.parts,id,site),realm:r,location:site,troops:600,morale:70,supply:120,journey:null,siege:0,...(localOnly?{payer:fiscalPath(w,site)[0]}:{}),automation:'delegated',trainingStarted:w.day,trainingUntil:w.day+30});ensureArmyOrganization(w);return true;
}

export function defensiveReserve(w:World,r:import('./realm').RealmId){return w.realm!.armies.filter(a=>a.realm===r&&!a.owner&&!a.journey&&!(a.arrears??0)&&readyTroops(a,w.day)>=100).sort((a,b)=>Number(b.location===capital(r,w))-Number(a.location===capital(r,w))||a.id!-b.id!)[0];}

function armyDecisionContext(w:World,r:RealmId){return {
 wars:activeWars(w).filter(v=>!!warRealmSide(v,r)),own:w.realm!.armies.filter(a=>a.realm===r),reserve:defensiveReserve(w,r),
 playerExecutive:r===playerRealm(w)&&governingExecutives(w,r).includes(w.characterId!),
};}
export interface ArmyDecision {
 intent:string;current:string;reason:string;next:string;target?:string;
 route?:NonNullable<ReturnType<typeof planRoute>>;retreat?:boolean;
}
/** Read-only decision shared by autonomous movement and its explanation. No display state is saved. */
export function delegatedArmyDecision(w:World,a:Army,context=armyDecisionContext(w,a.realm)):ArmyDecision {
 const s=w.realm!,r=a.realm,{wars,own,reserve,playerExecutive}=context;
 const report=(intent:string,current:string,reason:string,next:string,target?:string):ArmyDecision=>({intent,current,reason,next,target});
 if(a.journey)return report(a.withdrawalUntil?'撤往安全据点':'执行既定行程','行军中','沿已经下达的路线前进','抵达后按指挥方式重新核对局势',a.journey.route.at(-1));
 if(a.automation==='direct')return report('亲自下令','驻留待命','本军已由你直接指挥','等待新的手动军令');
 if(w.mobility?.pendingCommanders?.[a.id!])return report('将领交接','等待赴任','新任统帅尚未抵营','抵营交接后重新判断行军');
 if(a.withdrawalUntil)return report('战后撤离','撤离保护中','撤离期限尚未清除','保护结束后重新判断局势');
 if(armyCampaign(w,a))return report('奉行战役委任','遵循战役授权','由独立战役目标与预算决定推进','查看战役的停止原因与追加条件');
 if(!wars.length)return report('驻守地方','驻留待命','当前没有本国参与的战争','出现战事后重新核对目标');
 if(readyTroops(a,w.day)<100)return report('整备兵员','等待成军','可战兵员不足 100 人','完成训练或补充可战兵员后再议行军');
 const armyWars=wars.filter(v=>!!warArmySide(w,v,a)),armyEnemy=s.armies.filter(b=>b!==a&&armiesHostile(w,a,b));
 const retreat=a.supply<armyDailyFood(w,a)*2||a.morale<25||(a.arrears??0)>100;
 const threats=Object.keys(s.cities).filter(id=>s.cities[id].owner===r&&!armyControls(w,a,id)||s.sieges?.some(v=>v.site===id&&armyWars.some(war=>war.id===v.war&&warArmySide(w,war,a)!==v.side)));
 const targets=retreat?Object.keys(s.cities).filter(id=>armyControls(w,a,id)&&s.cities[id].grain>civilianFood(w,id)*2+30):[...threats,...armyWars.slice().sort((x,y)=>Number(s.cities[y.target].owner===r)-Number(s.cities[x.target].owner===r)).flatMap(v=>v.civil?[warArmySide(w,v,a)==='attack'?v.target:v.civil.base]:v.territory||v.goal==='annexation'?warObjectiveSites(v,w).filter(id=>!armyControls(w,a,id)):[v.target])];
 const intent=retreat?'整顿补给与士气':threats.length?'恢复失地与解围':'推进战争目标';
 const retreatReason=a.supply<armyDailyFood(w,a)*2?'携粮不足两日':a.morale<25?'士气低于 25':'欠饷超过 100 钱';
 if(!playerExecutive&&!retreat&&!threats.length&&own.length>=2&&a===reserve&&s.cities[a.location].controller===r&&wars.some(v=>v.attacker===r))return report('留守预备','驻防本土','进攻期间保留一支本土预备军','本土遇袭或预备军条件改变后重议');
 if(targets.includes(a.location)&&(!retreat||s.cities[a.location].grain>civilianFood(w,a.location)*2+30))return report(intent,retreat?'就地整顿':'已在目标地',retreat?retreatReason:'军队已抵达本轮目标','按当地补给、交锋与围城规则继续处理',a.location);
 const routes=targets.map(target=>planRoute(a.location,target,id=>retreat?armyControls(w,a,id):canMarchThrough(w,r,id,target,a))).filter(p=>!!p).sort((a,b)=>a.days-b.days);
 let route=routes[0];
 if(!route)return report(intent,'暂无可行路线',retreat?retreatReason+'，无可达安全粮仓':targets.length?'目标通路受阻':'当前无可推进目标','通行或目标条件改变后重新判断');
 let reason=retreat?retreatReason:'采用当前可通行的最短目标路线',current=retreat?'准备撤退':'准备行军',target=route.route.at(-1)!;
 if(!retreat){
  const hostile=armyEnemy.filter(e=>e.location===target&&!e.journey).reduce((n,e)=>n+readyTroops(e,w.day),0);
  const staging=Object.keys(s.cities).filter(id=>id!==target&&armyControls(w,a,id)&&!armyEnemy.some(e=>e.location===id&&!e.journey)&&s.cities[id].grain>civilianFood(w,id)*2+30).map(id=>({id,path:planRoute(id,target,x=>canMarchThrough(w,r,x,target,a))})).filter(v=>v.path).sort((x,y)=>x.path!.days-y.path!.days)[0];
  if(hostile>a.troops*1.25&&staging){
   const assembled=s.armies.filter(b=>b.realm===r&&!armiesHostile(w,a,b)&&b.automation!=='direct'&&!b.withdrawalUntil&&!armyCampaign(w,b)&&!w.mobility?.pendingCommanders?.[b.id!]&&(playerExecutive||threats.length>0||!wars.some(v=>v.attacker===r)||b!==reserve)&&((b.location===staging.id&&!b.journey)||b.journey?.route.at(-1)===target)).reduce((n,b)=>n+readyTroops(b,w.day),0);
   if(assembled<hostile*1.1){
    if(a.location===staging.id)return report(intent,'等待集结',`已集结可战 ${assembled} 人，目标敌军 ${hostile} 人`,'集结达到敌军 1.1 倍后重新评估',target);
    const stagingRoute=planRoute(a.location,staging.id,id=>armyControls(w,a,id));
    if(stagingRoute){route=stagingRoute;target=staging.id;current='前往集结';reason='目标敌军占优，先在安全据点会合';}
   }
  }
  const required=armyDailyFood(w,a)*(Math.min(30,route.days)+5);
  if(armyControls(w,a,a.location)&&a.supply<required&&s.cities[a.location].grain>civilianFood(w,a.location)*2+30)return report(intent,'等待补粮',`随军粮 ${a.supply}，本次行军储备需 ${Math.ceil(required)}`,'补足行军储备后重新核对目标与通路',target);
 }
 return {...report(intent,current,reason,'下次军队决策时复核后出发',target),route,retreat};
}
