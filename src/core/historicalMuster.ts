import type {World} from './types';
import type {HistoricalEventInstance} from './historicalEventState';
import {allPeople} from './personRegistry';
import {isAlive,ageAt} from './lifeState';
import {allegianceRealm} from './officeEligibility';
import {governingAuthority} from './government';
import {personResidence} from './residence';
import {detained} from './custodyState';
import {accountWallet,transferAccount} from './obligations';
import {relationOpinion} from './relationships';
import {militaryCareerReason,privateRecruitmentQuote,actMilitaryCareer} from './militaryCareer';
import {installCommander,npcRoute} from './mobility';
import {manpower} from './manpower';
import {civilianFood} from './population';
import {administration} from '../data/administration';

/** The old followers are Henan men, not a kingdom-wide levy. */
const HENAN_SITES=new Set(['yingchuan','chenliu','liangxian','luoyang','pengcheng']);
const HENAN_PROVINCES=new Set(['颍州','梁州','北荆州','洛州','徐州']);
const HENAN_RESERVE=200;
const henanDonor=(site:string)=>HENAN_PROVINCES.has(administration[site]?.province??'');

/** Up to 800 real recruits, one rally; all equipment, grain and reserve have actual private payers. */
export function historicalMusterQuote(w:World,e:HistoricalEventInstance,site=personResidence(w,e.actors.protagonist).site){
 const id=e.actors.protagonist,chief=governingAuthority(w,e.origin),available=Math.min(800,manpower(w,site,id).publicAvailable);
 const command=(amount:number)=>({type:'militaryCareer',action:'privateRaise',site,kind:'shield',amount} as const);
 const cash=accountWallet(w,'person:'+id)?.read()??0;
 const donorsFor=(gap:number)=>{
  const donors:{person:string;coins:number}[]=[];let left=gap;
  for(const p of allPeople(w)){
   if(!left)break;
   if([id,chief,w.characterId].includes(p.id)||!isAlive(w,p.id)||(ageAt(w,p.id)??0)<18||detained(w,p.id)||allegianceRealm(w,p.id)!==e.origin||relationOpinion(w,id,p.id)<10||relationOpinion(w,id,p.id)<relationOpinion(w,chief,p.id))continue;
   const home=personResidence(w,p.id).site,oath=w.relationships?.oaths[p.id]?.lord===id;
   const subordinate=Object.entries(w.mobility?.armyCommanders??{}).some(([army,cmd])=>cmd===p.id&&w.realm?.armies.find(a=>a.id===Number(army))?.location===site);
   if(!henanDonor(home)&&!oath&&!subordinate)continue;
   const gift=Math.min(left,60,Math.floor((accountWallet(w,'person:'+p.id)?.read()??0)/4));if(gift){donors.push({person:p.id,coins:gift});left-=gift;}
  }
  return donors;
 };
 const quote=(amount:number)=>{
  const q=privateRecruitmentQuote(w,command(amount),id,w.realm?.treasuries[e.origin].grain??0),need=q.coins+HENAN_RESERVE,donors=donorsFor(Math.max(0,need-cash));
  return {...q,command:command(amount),need,donors,contributions:donors.reduce((n,d)=>n+d.coins,0)};
 };
 // A real rally recruits what the old followers can actually equip and feed, never a fixed 800.
 let result=quote(available);
 if(result.need>cash+result.contributions&&result.coins>0){
  const perMan=result.coins/available,affordable=Math.max(0,Math.min(available,Math.floor((cash+result.contributions-HENAN_RESERVE)/perMan)));
  if(affordable<available)result=quote(affordable);
 }
 // Keep two periods of civilian grain; buy only the surplus, never the city's reserve.
 const city=w.realm?.cities[site],maxPurchase=city?Math.max(0,city.grain-civilianFood(w,site)*2):0;
 if(result.purchase>maxPurchase){
  const byGrain=Math.floor((maxPurchase+result.estateGrain)/.3),next=Math.min(result.amount,byGrain);
  if(next<result.amount)result=quote(next);
 }
 const gap=Math.max(0,result.need-cash-result.contributions);
 let reason=e.status!=='active'||e.phase!=='north'||!e.lastConflict||allegianceRealm(w,id)!==e.origin?'当前没有可收拢旧部的交接危机':e.appliedEffects.includes('old-followers')?'本次旧部已经集结':!isAlive(w,id)||detained(w,id)?'须由在世自由人物集结':!HENAN_SITES.has(site)?'须在河南旧部所在县域集结':result.amount<300?(available>=300?'旧部自筹私财不足，仅能募 '+result.amount+' 人':'本县可募旧部不足 300 人'):gap?'旧部自筹私财不足，还差 '+gap+' 钱':'';
 if(!reason){const probe=structuredClone(w);accountWallet(probe,'person:'+id)!.write(Math.max(cash,result.need));if(site!==personResidence(w,id).site||personResidence(w,id).traveling)reason='须实际抵达可募兵县域';else reason=militaryCareerReason(probe,result.command,id,true);}
 return {...result,reserve:HENAN_RESERVE,reason};
}
export function historicalMusterDestination(w:World,e:HistoricalEventInstance){
 const current=personResidence(w,e.actors.protagonist);if(current.traveling)return;
 for(const site of [current.site,...Object.keys(w.realm!.cities).filter(s=>HENAN_SITES.has(s)&&w.realm!.cities[s].owner===e.origin&&w.realm!.cities[s].controller===e.origin)]){
  const probe=structuredClone(w),id=e.actors.protagonist;
  if(id===w.characterId)probe.people[0].location=site;else if(probe.mobility?.residences[id])probe.mobility.residences[id].site=site;
  if(!historicalMusterQuote(probe,e,site).reason&&npcRoute(w,id,site))return site;
 }
}
export function actHistoricalMuster(w:World,e:HistoricalEventInstance){
 const q=historicalMusterQuote(w,e);if(q.reason)throw new Error(q.reason);const next=structuredClone(w),id=e.actors.protagonist;
 for(const d of q.donors)transferAccount(next,'person:'+d.person,'person:'+id,d.coins,'河南旧部自筹：支持集结');
 actMilitaryCareer(next,q.command,id,true);const army=q.target?next.realm!.armies.find(a=>a.id===q.target!.id)!:next.realm!.armies.at(-1)!;
 army.automation='direct';installCommander(next,army,id);
 const event=next.historical!.items.find(v=>v.id===e.id)!;event.appliedEffects.push('old-followers');event.appliedEffects=event.appliedEffects.slice(-128);
 event.milestones.push({key:'old-followers',day:next.day,text:'河南旧部集结 '+q.amount+' 人；支持者以实际私财资助 '+q.contributions+' 钱，原部军粮 '+q.bankGrain+' 自东魏中央仓调拨，兵员、兵装与军粮均从实有来源扣除，训练三十日。',public:false,realms:[e.origin],people:[id]});
 if(event.milestones.length>128)event.milestones.splice(1,1);
 Object.assign(w,next);
}
