import {getPerson} from './personRegistry';
import {worldRealms} from './polityRuntime';
import {detained} from './custodyState';
import {relationOpinion} from './relationships';
import {armyCommander} from './mobility';
import type {World} from './types';
import type {RealmId,Army} from './realm';
import {playerRealm,canMarchThrough,armyDailyFood} from './realm';
import {activeWars,warRealmSide} from './wars';
import {armyControls} from './civilWars';
import {attemptCompliance} from './militaryCareer';
import {readyTroops} from './armyOrganization';
import {governingExecutives} from './government';
import {allegianceRealm,publicOfficeReason} from './officeEligibility';
import {presentAt} from './residence';
import {isAlive} from './lifeState';
import {publicBalance,ensureFiscal,fiscalRecord} from './treasury';
import {planRoute} from './world';
import {awardDeed} from './deeds';
import {siteById} from '../data/scenario';

export interface MilitaryCampaign {doctrine?:'cautious'|'balanced'|'aggressive';allowLoot?:boolean;id:number;lastDay:number;realm:RealmId;war:number;army:number;commander:string;issuer:string;target:string;goal:'capture'|'defend';source:string;budget:number;remaining:number;spent:number;started:number;deadline:number;strength:number;lossLimit:number;held:number;status:'active'|'success'|'failed'|'cancelled';reason:string}
export interface MilitaryCampaigns {nextId:number;items:MilitaryCampaign[]}
export type MilitaryCampaignCommand={type:'militaryCampaign';action:'commission';doctrine?:'cautious'|'balanced'|'aggressive';allowLoot?:boolean;army:number;war:number;commander:string;target:string;goal:'capture'|'defend';budget:number;lossLimit:number}|{type:'militaryCampaign';action:'cancel'|'reinforce';id:number};
export function armyCampaign(w:World,a:Army){return w.militaryCampaigns?.items.find(c=>c.army===a.id&&c.status==='active');}
function balance(w:World,key:string,n:number){if(key.startsWith('central:'))w.realm!.treasuries[key.slice(8) as RealmId].coins=n;else ensureFiscal(w)!.balances[key]=n;}
export function campaignReason(w:World,c:MilitaryCampaignCommand){
 if(!w.realm||!w.characterId)return '仅历史沙盒可用';const r=playerRealm(w);
 if(c.action!=='commission'){const q=w.militaryCampaigns?.items.find(q=>q.id===c.id);return !q||q.status!=='active'?'战役已结束':c.action==='cancel'&&w.realm.armies.find(a=>a.id===q.army)?.journey?'行军途中，须抵达后交接':q.commander!==w.characterId&&!governingExecutives(w,q.realm).includes(w.characterId)?'须由本战统帅或执政者处理':c.action==='reinforce'&&!governingExecutives(w,q.realm).includes(w.characterId)?'追加预算须执政者批准':c.action==='reinforce'&&publicBalance(w,q.source)<100?'原拨款账户不足 100 钱':c.action==='reinforce'&&q.budget+100>10000?'战役预算达到上限':'';}
 if(!governingExecutives(w,r).includes(w.characterId))return '须由实际执政者下达战役委任';
 const a=w.realm.armies.find(a=>a.id===c.army&&a.realm===r),war=activeWars(w).find(q=>q.id===c.war&&!!warRealmSide(q,r));
 if(!a||!war)return '须选择本国军队与正在进行的战争';
 if(a.owner&&a.owner!==w.characterId&&relationOpinion(w,a.owner,w.characterId)<20)return '部曲主人尚未同意承担本场战役';
 if(armyCampaign(w,a)||w.militaryCampaigns?.items.some(q=>q.status==='active'&&q.commander===c.commander))return '军队或统帅已有战役';
 if((w.militaryCampaigns?.items.filter(q=>q.status==='active').length??0)>=48)return '战役委任已满';
 if(c.doctrine!==undefined&&!['cautious','balanced','aggressive'].includes(c.doctrine)||c.allowLoot!==undefined&&typeof c.allowLoot!=='boolean')return '无效战役授权';
 if(!['capture','defend'].includes(c.goal)||!Number.isInteger(c.budget)||c.budget<100||c.budget>1000||![25,50,75].includes(c.lossLimit))return '预算须为 100–1000 钱；损失上限为 25%、50% 或 75%';
 const city=w.realm.cities[c.target],enemy=warRealmSide(war,r)==='attack'?war.defender:war.attacker;
 if(!city||c.goal==='capture'&&city.controller!==enemy||c.goal==='defend'&&city.owner!==r)return '攻取须敌方控制；守备须本国领土';
 const current=armyCommander(w,a),eligible=current===c.commander&&w.mobility?{...w,mobility:{...w.mobility,armyCommanders:Object.fromEntries(Object.entries(w.mobility.armyCommanders??{}).filter(([key])=>Number(key)!==a.id)),commanders:Object.fromEntries(Object.entries(w.mobility.commanders).filter(([,id])=>id!==c.commander))}}:w;
 return allegianceRealm(w,c.commander)!==r?'统帅须效忠本国':publicOfficeReason(eligible,c.commander)||(!presentAt(w,c.commander,a.location)?'统帅须赴军队驻地接掌军权':a.journey?'军队抵达后方可委任':readyTroops(a,w.day)<100?'可出征兵员不足 100':publicBalance(w,a.owner?'central:'+r:a.payer??'central:'+r)<c.budget?'供饷账户预算不足':'');
}
export function actMilitaryCampaign(w:World,c:MilitaryCampaignCommand){const why=campaignReason(w,c);if(why)throw new Error(why);const s=w.militaryCampaigns??={nextId:1,items:[]};
 if(c.action==='commission'){s.items=s.items.filter(q=>q.status==='active'||q.remaining>0).concat(s.items.filter(q=>q.status!=='active'&&!q.remaining).slice(-80));const a=w.realm!.armies.find(a=>a.id===c.army)!,source=a.owner?'central:'+a.realm:a.payer??'central:'+a.realm;if(!attemptCompliance(w,a,'replace',c.commander))return;if(w.mobility){delete w.mobility.armyCommanders?.[a.id!];if(w.realm!.armies.find(v=>v.realm===a.realm)===a)delete w.mobility.commanders[a.realm];}balance(w,source,publicBalance(w,source)-c.budget);const id=s.nextId++;s.items.push({doctrine:c.doctrine??'balanced',allowLoot:c.allowLoot??false,id,lastDay:w.day,realm:a.realm,war:c.war,army:a.id!,commander:c.commander,issuer:w.characterId!,target:c.target,goal:c.goal,source,budget:c.budget,remaining:c.budget,spent:0,started:w.day,deadline:w.day+180,strength:a.troops,lossLimit:c.lossLimit,held:0,status:'active',reason:''});fiscalRecord(w,a.realm,source,'campaign:'+id,c.budget,'战役专款');}
 else {const q=s.items.find(q=>q.id===c.id)!;if(c.action==='cancel')finishCampaign(w,q,'cancelled','撤销战役，余款退回，军队保留原地');else{balance(w,q.source,publicBalance(w,q.source)-100);q.remaining+=100;q.budget+=100;fiscalRecord(w,q.realm,q.source,'campaign:'+q.id,100,'追加战役军饷');}}
}
function refund(w:World,q:MilitaryCampaign){const n=Math.min(q.remaining,1_000_000-publicBalance(w,q.source));balance(w,q.source,publicBalance(w,q.source)+n);q.remaining-=n;fiscalRecord(w,q.realm,'campaign:'+q.id,q.source,n,'战役结余退还');}
export function finishCampaign(w:World,q:MilitaryCampaign,status:MilitaryCampaign['status'],reason:string){q.status=status;q.reason=reason;const a=w.realm!.armies.find(a=>a.id===q.army);if(a&&isAlive(w,q.commander)&&!detained(w,q.commander)&&allegianceRealm(w,q.commander)===a.realm&&w.mobility){w.mobility.armyCommanders??={};w.mobility.armyCommanders[a.id!]=q.commander;}if(!detained(w,q.commander)){if(q.commander===w.characterId)w.people[0].journey=null;else if(w.mobility?.residences[q.commander])w.mobility.residences[q.commander].journey=null;}refund(w,q);if(status==='success')awardDeed(w,q.realm,q.commander,'military-campaign:'+q.id,Math.max(1,Math.round(15*(a?.troops??0)/q.strength)),reason);w.chronicle.push({day:w.day,person:'player',text:'战役 '+q.id+'：'+reason});w.chronicle=w.chronicle.slice(-100);}
export function interruptCommanderCampaigns(w:World,id:string){for(const q of w.militaryCampaigns?.items??[])if(q.commander===id&&q.status==='active')finishCampaign(w,q,'failed','统帅被拘押，委任中止、结余退回原账户');}
export function advanceMilitaryCampaigns(w:World){if(!w.realm)return;for(const q of w.militaryCampaigns?.items??[]){if(q.status!=='active'){if(q.remaining)refund(w,q);continue;}const a=w.realm.armies.find(a=>a.id===q.army);
 if(!a||!isAlive(w,q.commander)||detained(w,q.commander)||allegianceRealm(w,q.commander)!==q.realm||!activeWars(w).some(v=>v.id===q.war)){finishCampaign(w,q,'failed','部队、统帅或战争已经变化');continue;}
 const breached=w.day>q.deadline||a.troops*100<=q.strength*(100-q.lossLimit);if(breached&&!a.journey){finishCampaign(w,q,'failed',w.day>q.deadline?'超过战役期限':'已达到授权损失上限');continue;}
 if(q.lastDay>=w.day)continue;q.lastDay=w.day;
 // Commander follows this specific army rather than the national first-army proxy.
 if(q.commander===w.characterId){w.people[0].location=a.location;w.people[0].journey=a.journey?structuredClone(a.journey):null;}else if(w.mobility)w.mobility.residences[q.commander]={site:a.location,journey:a.journey?structuredClone(a.journey):null};
 const city=w.realm.cities[q.target],war=activeWars(w).find(v=>v.id===q.war)!,controller=q.goal==='capture'?(warRealmSide(war,q.realm)==='attack'?war.attacker:war.defender):q.realm;if(city.controller===controller&&!a.journey&&a.location===q.target){q.held++;if(q.goal==='capture'||q.held>=30){finishCampaign(w,q,'success',q.goal==='capture'?'按委任攻取目标，核记统帅功绩':'守备目标三十日，核记统帅功绩');continue;}}else q.held=0;
 const threshold=armyDailyFood(w,a)*(q.doctrine==='cautious'?10:q.doctrine==='aggressive'?2:5);
 if(!a.journey&&(a.supply<threshold||a.morale<25)&&!armyControls(w,a,a.location)){const retreat=Object.keys(w.realm.cities).filter(id=>armyControls(w,a,id)).map(id=>planRoute(a.location,id,node=>armyControls(w,a,node))).filter(p=>p!==null).sort((x,y)=>x.days-y.days)[0];if(retreat){a.journey={route:retreat.route,durations:retreat.durations,leg:0,elapsed:0,started:w.day};q.reason='按授权撤往安全据点整顿补给';continue;}}
 q.reason=breached?'达到期限或损失上限，抵达后交接':!q.remaining?'军饷专款用尽，等待追加':a.supply<threshold?'补给不足，暂停推进':a.arrears?'军饷拖欠，暂停推进':'';
 if(!q.reason&&!a.journey&&a.location!==q.target){const route=planRoute(a.location,q.target,id=>canMarchThrough(w,a.realm,id,q.target));const enemy=w.realm.armies.filter(b=>b.realm!==q.realm&&warRealmSide(war,b.realm)&&warRealmSide(war,b.realm)!==warRealmSide(war,q.realm)&&b.location===q.target&&!b.journey).reduce((n,b)=>n+readyTroops(b,w.day),0),risk=q.doctrine==='cautious'?1.25:q.doctrine==='aggressive'?.8:1;if(enemy>a.troops/risk){q.reason='敌军优势，等待援军或调整战役授权';continue;}if(route)a.journey={route:route.route,durations:route.durations,leg:0,elapsed:0,started:w.day};else q.reason='通路中断或敌方城防封锁';}
 }}
export function validMilitaryCampaigns(w:World){const s=w.militaryCampaigns;if(s===undefined)return true;const n=(v:unknown,max=1e9)=>Number.isSafeInteger(v)&&Number(v)>=0&&Number(v)<=max;
 return !!s&&n(s.nextId)&&Array.isArray(s.items)&&s.items.length<=256&&new Set(s.items.map(q=>q?.id)).size===s.items.length&&new Set(s.items.filter(q=>q.status==='active').map(q=>q.army)).size===s.items.filter(q=>q.status==='active').length&&s.items.every(q=>q&&(q.doctrine===undefined||['cautious','balanced','aggressive'].includes(q.doctrine))&&(q.allowLoot===undefined||typeof q.allowLoot==='boolean')&&n(q.id,s.nextId-1)&&q.id>0&&worldRealms(w).includes(q.realm)&&!! getPerson(w,q.commander)!&&!! getPerson(w,q.issuer)!&&!!siteById[q.target]&&n(q.war)&&n(q.army)&&['capture','defend'].includes(q.goal)&&typeof q.source==='string'&&(q.source==='central:'+q.realm||q.source.startsWith(q.realm+'|')&&!!w.realm?.fiscal?.balances&&Object.hasOwn(w.realm.fiscal.balances,q.source))&&n(q.budget,10000)&&n(q.remaining,q.budget)&&n(q.spent,q.budget)&&q.remaining+q.spent<=q.budget&&n(q.lastDay,w.day)&&q.lastDay>=q.started&&n(q.started,w.day)&&q.deadline===q.started+180&&n(q.strength,6000)&&q.strength>=100&&[25,50,75].includes(q.lossLimit)&&n(q.held,30)&&['active','success','failed','cancelled'].includes(q.status)&&typeof q.reason==='string'&&q.reason.length<=200);
}
