import type {World} from './types';
import type {RealmId} from './realm';
import {realms,playerRealm,syncGovernance} from './realm';
import {presentAt} from './residence';
import {oathCycle,changeRelationOpinion} from './relationships';
import {armyCommander} from './mobility';
import {bilateralWar} from './wars';
import {governingAuthority,governingExecutives} from './government';
import {ensureArmyOrganization} from './armyOrganization';
import {armyCampaign} from './militaryCampaigns';
import {returnArmyConvoy} from './armyLogistics';
export type MilitaryDefectionCommand={type:'militaryDefection';army:number;realm:RealmId};
export function militaryDefectionQuote(w:World,c:MilitaryDefectionCommand){const a=w.realm?.armies.find(a=>a.id===c.army),r=playerRealm(w),id=w.characterId,units=a?.regiments??[],following=units.filter(u=>u.loyalTo===id&&(u.commanderLoyalty??0)>=60&&(u.commanderLoyalty??0)>(u.institution??60)),troops=following.reduce((n,u)=>n+u.troops,0),remaining=(a?.troops??0)-troops;
 const reason=!w.realm||!id||!a||a.realm!==r||w.campaign?.status!=='active'?'须本国实际部队与有效人物身份':governingExecutives(w,r).includes(id)?'在位执政者须通过国家议和裁定，不能携军个人投降':a.owner&&a.owner!==id?'不能处分他人的私人部曲':armyCommander(w,a)!==id&&a.owner!==id?'须本人统领或所有的部队':armyCampaign(w,a)?'须先交接战役委任与专款':!realms.includes(c.realm)||!bilateralWar(w,r,c.realm)?'仅可投向正在交战的敌国':a.journey||!presentAt(w,id,a.location)?'须本人随军抵达后决定投降':w.retinue?.members[id]?'须先解除旧国幕府归属':w.diplomacy?.missions.some(m=>m.envoy===id)||w.service?.tasks.some(t=>t.phase!=='closed'&&(t.officer===id||t.helper===id))||w.mobility?.activities.some(q=>!['done','cancelled'].includes(q.phase)&&(q.actor===id||q.delegate===id))?'须先交接在办差事与使团':oathCycle(w,id,governingAuthority(w,c.realm))?'新的效忠会形成循环':w.realm.cities[a.location].controller!==c.realm?'须在对方控制的驻地交涉':troops<100?'愿追随的兵团不足 100 人':remaining>0&&remaining<100?'留守兵团不足独立编制':remaining>0&&(w.realm.armies.length>=48||w.realm.armies.filter(a=>a.realm===r).length>=16)?'无法保留抵抗方编制':!w.relationships?'人物效忠关系未初始化':'';
 return {reason,following,troops,remaining};}
export function actMilitaryDefection(w:World,c:MilitaryDefectionCommand){const q=militaryDefectionQuote(w,c);if(q.reason)throw new Error(q.reason);ensureArmyOrganization(w);const s=w.realm!,a=s.armies.find(a=>a.id===c.army)!,old=a.realm,id=w.characterId!,source=a.payer??'central:'+old,share=q.troops/a.troops,supply=Math.floor(a.supply*share),arrears=Math.floor((a.arrears??0)*share);
 returnArmyConvoy(w,a);
 if(q.remaining){const stays=a.regiments!.filter(u=>!q.following.includes(u)),newId=s.nextArmyId!++;s.armies.push({...a,id:newId,troops:q.remaining,regiments:stays,supply:a.supply-supply,arrears:(a.arrears??0)-arrears,foodRemainder:0});}
 if(arrears)(s.armyDebts??=[]).push({realm:old,account:source,coins:arrears});a.troops=q.troops;a.regiments=q.following;a.supply=supply;a.arrears=0;a.realm=c.realm;a.payer=a.owner?'person:'+id:'central:'+c.realm;delete a.refusal;delete a.rally;
 for(const [key,leader] of Object.entries(w.mobility?.armyCommanders??{}))if(leader===id)delete w.mobility!.armyCommanders![Number(key)];if(w.mobility){if(w.mobility.commanders[old]===id)delete w.mobility.commanders[old];w.mobility.armyCommanders??={};w.mobility.armyCommanders[a.id!]=id;}
 (w.relationships!.allegiances??={})[id]={realm:c.realm,from:old,since:w.day,army:a.id!};changeRelationOpinion(w,id,governingAuthority(w,old),-40);w.relationships!.oaths[id]={lord:governingAuthority(w,c.realm),since:w.day,loyalty:60};syncGovernance(w);w.chronicle.push({day:w.day,person:'player',text:`本人投向敌国：${q.troops} 人按兵团忠诚追随，${q.remaining} 人保留原阵营；旧国欠饷仍由原账户承担。`});w.chronicle=w.chronicle.slice(-100);
}
