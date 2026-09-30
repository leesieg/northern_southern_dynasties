import type {World,GameCommand} from './types';
import type {Regiment,TroopKind} from './armyOrganization';
import {troopKinds,readyTroops} from './armyOrganization';
import {playerRealm,canMarchThrough,armyMonthlyPay,armyDailyFood} from './realm';
import {planRoute} from './world';
import {supplyReserve,mobilizedTransportLabor} from './armyLogistics';
export type RecruitmentPlanCommand={type:'recruitmentPlan';entries:{site:string;kind:TroopKind;service:Regiment['service'];count:number}[];rally?:string};

/** Validate the complete order on a draft, then commit once. Future training and travel remain real. */
export function executeRecruitmentPlan(w:World,c:RecruitmentPlanCommand,act:(w:World,c:GameCommand)=>void){
 if(!Array.isArray(c.entries)||!c.entries.length||c.entries.length>16||new Set(c.entries.map(e=>e.site)).size!==c.entries.length)throw new Error('请选择 1 至 16 处不同的征募地');
 const next=structuredClone(w),r=playerRealm(next),rows=[];
 if(c.rally&&(!next.realm?.cities[c.rally]||next.realm.cities[c.rally].controller!==r))throw new Error('集结地须由本国控制');
 for(const e of c.entries){
  if(!Number.isSafeInteger(e.count)||e.count<1||e.count>30||!Object.hasOwn(troopKinds,e.kind))throw new Error('每处征募 1 至 30 个兵团');
  let target:number|undefined;
  for(let i=0;i<e.count;i++){
   act(next,{type:'army',action:'raise',site:e.site,kind:e.kind,service:e.service,target});
   target??=next.realm!.armies.at(-1)!.id;
  }
  const a=next.realm!.armies.find(a=>a.id===target)!,route=c.rally&&c.rally!==e.site?planRoute(e.site,c.rally,id=>canMarchThrough(next,r,id,c.rally!)):null;
  if(c.rally&&c.rally!==e.site&&!route)throw new Error('征募地至集结地无可用道路');
  if(c.rally)a.rally=c.rally;
  rows.push({site:e.site,troops:a.troops,coins:troopKinds[e.kind].cost*(e.service==='standing'?2:1)*e.count,grain:60*e.count,ready:next.day+(e.service==='standing'?60:30),travel:route?.days??0,population:next.realm!.cities[e.site].population-mobilizedTransportLabor(next,e.site),foodReserve:next.realm!.cities[e.site].grain-supplyReserve(next,e.site,r),pay:armyMonthlyPay(next,a),food:armyDailyFood(next,a)});
 }
 Object.assign(w,next);return rows;
}
export function recruitmentPlanQuote(w:World,c:RecruitmentPlanCommand,act:(w:World,c:GameCommand)=>void){try{return {reason:'',rows:executeRecruitmentPlan(structuredClone(w),c,act)};}catch(e){return {reason:e instanceof Error?e.message:'征募计划无法执行',rows:[]};}}
export function advanceRecruitmentRallies(w:World){for(const a of w.realm?.armies??[]){if(!a.rally||a.journey||readyTroops(a,w.day)<a.troops||a.arrears||a.supply<=0)continue;if(a.location===a.rally){delete a.rally;continue;}if(w.realm!.cities[a.rally].controller!==a.realm){a.logisticsReason='集结地失守，停止集结';continue;}const route=planRoute(a.location,a.rally,id=>canMarchThrough(w,a.realm,id,a.rally!));if(route)a.journey={route:route.route,durations:route.durations,leg:0,elapsed:0,started:w.day};else a.logisticsReason='集结道路受阻';}}
