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

/** Up to 800 real recruits, one rally; all equipment, grain and reserve have actual private payers. */
export function historicalMusterQuote(w:World,e:HistoricalEventInstance,site=personResidence(w,e.actors.protagonist).site){
 const id=e.actors.protagonist,chief=governingAuthority(w,e.origin),amount=Math.min(800,manpower(w,site,id).publicAvailable),command={type:'militaryCareer',action:'privateRaise',site,kind:'shield',amount} as const;
 const q=privateRecruitmentQuote(w,command,id),cash=accountWallet(w,'person:'+id)?.read()??0,target=q.coins+150,donors:{person:string;coins:number}[]=[];
 let gap=Math.max(0,target-cash);
 for(const p of allPeople(w)){
  if(!gap)break;
  if([id,chief,w.characterId].includes(p.id)||!isAlive(w,p.id)||(ageAt(w,p.id)??0)<18||detained(w,p.id)||allegianceRealm(w,p.id)!==e.origin||w.social?.lineage.slice(0,-1).some(l=>l.id===p.id)||relationOpinion(w,id,p.id)<0||relationOpinion(w,id,p.id)<relationOpinion(w,chief,p.id))continue;
  const gift=Math.min(gap,60,Math.floor((accountWallet(w,'person:'+p.id)?.read()??0)/4));if(gift){donors.push({person:p.id,coins:gift});gap-=gift;}
 }
 let reason=e.status!=='active'||e.phase!=='north'||!e.lastConflict||allegianceRealm(w,id)!==e.origin?'当前没有可收拢旧部的交接危机':e.appliedEffects.includes('old-followers')?'本次旧部已经集结':!isAlive(w,id)||detained(w,id)?'须由在世自由人物集结':amount<300?'本县可募旧部不足 300 人':gap?'旧部自筹私财不足，还差 '+gap+' 钱':'';
 if(!reason){const probe=structuredClone(w);accountWallet(probe,'person:'+id)!.write(Math.max(cash,target));if(site!==personResidence(w,id).site||personResidence(w,id).traveling)reason='须实际抵达可募兵县域';else reason=militaryCareerReason(probe,command,id,true);}
 return {...q,command,donors,contributions:donors.reduce((n,d)=>n+d.coins,0),reserve:150,reason};
}
export function historicalMusterDestination(w:World,e:HistoricalEventInstance){
 const current=personResidence(w,e.actors.protagonist);if(current.traveling)return;
 for(const site of [current.site,...Object.keys(w.realm!.cities).filter(s=>w.realm!.cities[s].owner===e.origin&&w.realm!.cities[s].controller===e.origin)]){
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
 event.milestones.push({key:'old-followers',day:next.day,text:'河南旧部集结 '+q.amount+' 人；支持者以实际私财资助 '+q.contributions+' 钱，兵员、兵装与军粮均从实有来源扣除，训练三十日。',public:false,realms:[e.origin],people:[id]});
 if(event.milestones.length>128)event.milestones.splice(1,1);
 Object.assign(w,next);
}
