import {culturalMilitarySupport} from './culture';
import {pactBreachRisk} from './allegiancePacts';
import type {World} from './types';
import type {Army} from './realm';
import {playerRealm} from './realm';
import {authorityGrant} from './authority';
import {armyCommander,commandArmy} from './mobility';
import {isAlive,ageAt} from './lifeState';
import {presentAt} from './residence';
import {relationOpinion} from './relationships';
import {governingAuthority,governingExecutives} from './government';
import {accountWallet,transferAccount} from './obligations';
import {territoryAccount,ensureFiscal,fiscalRecord} from './treasury';
import {activeWars} from './wars';
import {ensureArmyOrganization,troopKinds,type TroopKind} from './armyOrganization';
import {mobilizedTransportLabor} from './armyLogistics';
import {relationshipPersonById} from '../data/relationships';
import {isMonthStart} from './calendar';
export interface MilitaryCareer {lastDay:number;xp:Record<string,number>;studies:Record<string,{started:number;due:number;progress?:number}>}
export type MilitaryCareerCommand={type:'militaryCareer';action:'study'}|{type:'militaryCareer';action:'privateRaise';site:string;kind:TroopKind}|{type:'militaryCareer';action:'pacify'|'integrate';army:number}|{type:'militaryCareer';action:'automation';army:number;control:'direct'|'delegated'}|{type:'militaryCareer';action:'priority';army:number;priority:number}|{type:'militaryCareer';action:'supplyPolicy';policy:'civilian'|'normal'|'emergency'};
function log(w:World,text:string){w.chronicle.push({day:w.day,person:'player',text});w.chronicle=w.chronicle.slice(-100);}
export function commanderCompliance(w:World,a:Army,kind:'replace'|'disband',successor?:string){const leader=armyCommander(w,a)??a.owner,ruler=governingAuthority(w,a.realm),cultural=leader?culturalMilitarySupport(w,a.realm,leader):0,cooperative=!leader||leader===w.characterId||leader===successor||relationOpinion(w,leader,ruler)+cultural>=20;
 const personal=(a.regiments??[]).reduce((n,u)=>n+u.troops*(u.loyalTo===leader?(u.commanderLoyalty??0):0),0)/Math.max(1,a.troops),institution=(a.regiments??[]).reduce((n,u)=>n+u.troops*(u.institution??60),0)/Math.max(1,a.troops),risk=pactBreachRisk(w,leader,a.id)||!cooperative&&personal>=75&&institution<50||kind==='disband'&&personal>=85&&institution<30&&!!a.arrears;
 return {refuses:risk,cultural,personal:Math.round(personal),institution:Math.round(institution),reason:(risk?'部队追随原将、制度信任不足，交接可能被拒绝':cooperative?'原将配合交接':'原将与朝廷不和，但部队尚可交接')+(cultural?'；文化待遇评价 '+(cultural>0?'+':'')+cultural:'')};
}
export function attemptCompliance(w:World,a:Army,kind:'replace'|'disband',successor?:string){const q=commanderCompliance(w,a,kind,successor);if(!q.refuses){delete a.refusal;return true;}if(!a.refusal){a.refusal={kind,commander:armyCommander(w,a)??null,day:w.day,reason:q.reason};log(w,`第 ${a.id} 军拒绝${kind==='replace'?'更换统帅':'遣散'}，原编制与资源保留，须安抚或结清欠饷。`);}return false;}
export function awardMilitaryExperience(w:World,id:string,amount:number){const s=w.militaryCareer??={lastDay:w.day,xp:{},studies:{}};s.xp[id]=Math.min(240,(s.xp[id]??0)+Math.max(0,Math.floor(amount)));}
function studyAvailable(w:World,id:string){return !(id===w.characterId?w.people[0].journey:w.mobility?.residences[id]?.journey)&&!commandArmy(w,id)&&!w.diplomacy?.missions.some(m=>m.envoy===id)&&!w.service?.tasks.some(t=>t.phase!=='closed'&&(t.officer===id||t.helper===id))&&!w.mobility?.activities.some(a=>!['done','cancelled'].includes(a.phase)&&(a.actor===id||a.delegate===id));}
export function militaryCareerReason(w:World,c:MilitaryCareerCommand){if(!w.realm||!w.characterId||!isAlive(w,w.characterId)||w.campaign?.status!=='active')return '须有在世人物与有效身份';const id=w.characterId,r=playerRealm(w);
 if(c.action==='study')return (ageAt(w,id)??0)<16?'须成年':w.militaryCareer?.studies[id]?'研习尚未完成':(w.militaryCareer?.xp[id]??0)>=240?'历练已达到研习上限':!studyAvailable(w,id)?'须在驻地且没有在办军务、差事或出使':(accountWallet(w,'person:'+id)?.read()??0)<10?'兵法研习需要私财 10 钱':'';
 if(c.action==='supplyPolicy')return !governingExecutives(w,r).includes(id)?'须实际执政者调整国家征粮政策':!['civilian','normal','emergency'].includes(c.policy)?'无效征粮政策':'';
 if(c.action==='privateRaise'){const city=w.realm.cities[c.site],owner=w.realm.armies.filter(a=>a.owner===id).reduce((n,a)=>n+a.troops,0),limit=activeWars(w).some(v=>[v.attacker,v.defender].includes(r))?1800:600;return !city||city.owner!==r||city.controller!==r||!presentAt(w,id,c.site)?'须在本国控制的驻地私募':!Object.hasOwn(troopKinds,c.kind)?'无效兵种':owner+200>limit?'私募兵额达到当前上限':(w.realm.fiscal?.balances[territoryAccount(w,r,'county:'+c.site)]??0)>999940?'当地公库无法收取购粮款':w.realm.armies.length>=48||w.realm.armies.filter(a=>a.realm===r).length>=16?'军队编制已满':city.population-mobilizedTransportLabor(w,c.site)<300||city.grain<60?'驻地人口或粮仓不足':(accountWallet(w,'person:'+id)?.read()??0)<troopKinds[c.kind].cost+60?'私财不足以支付兵装和 60 粮':'';}
 const a=w.realm.armies.find(a=>a.id===c.army);if(!a)return '军队不存在';if(!authorityGrant(w,id,'command',{realm:a.realm,site:a.location,army:a}).allowed)return '没有本军指挥权';
 if(c.action==='automation')return !['direct','delegated'].includes(c.control)?'无效指挥方式':'';
 if(c.action==='priority')return ![0,1,2].includes(c.priority)?'无效补给优先级':'';
 if(a.journey)return '军队抵达后方可办理';
 if(c.action==='integrate')return !a.owner?'已经是公军':!governingExecutives(w,r).includes(id)?'须实际执政者批准改编':relationOpinion(w,a.owner,id)<20&&a.owner!==id?'部曲主人尚未同意改编':a.arrears?'须先清偿私人欠饷':'';
 if(a.owner&&a.owner!==id)return '部曲主人须自行批准并用私财安抚';const cost=Math.ceil(a.troops/20)+(a.arrears??0);return (accountWallet(w,a.payer??'central:'+a.realm)?.read()??0)<cost?`须原供饷账户 ${cost} 钱，含欠饷与安置支出`:'';
}
export function actMilitaryCareer(w:World,c:MilitaryCareerCommand){const why=militaryCareerReason(w,c);if(why)throw new Error(why);const id=w.characterId!,r=playerRealm(w),s=w.militaryCareer??={lastDay:w.day,xp:{},studies:{}};
 if(c.action==='study'){const wallet=accountWallet(w,'person:'+id)!;wallet.write(wallet.read()-10);s.studies[id]={started:w.day,due:w.day+30,progress:0};log(w,'支出私财 10 钱研习兵法，三十个有效驻留日形成历练，收益随已有历练递减。');return;}
 if(c.action==='supplyPolicy'){(w.realm!.supplyPolicies??={})[r]=c.policy;return;}
 if(c.action==='privateRaise'){ensureArmyOrganization(w);const city=w.realm!.cities[c.site],payer='person:'+id,wallet=accountWallet(w,payer)!,cost=troopKinds[c.kind].cost;const destination=territoryAccount(w,r,'county:'+c.site);ensureFiscal(w)!.balances[destination]??=0;transferAccount(w,payer,destination,60,'私募部曲购买军粮');wallet.write(wallet.read()-cost);city.population-=200;city.grain-=60;const armyId=w.realm!.nextArmyId!++;w.realm!.armies.push({id:armyId,owner:id,payer,realm:r,location:c.site,troops:200,morale:60,supply:60,journey:null,siege:0,arrears:0,trainingStarted:w.day,trainingUntil:w.day+30,regiments:[{id:armyId+':1',kind:c.kind,service:'levy',origin:c.site,troops:200,experience:0,institution:30,commanderLoyalty:60,loyalTo:id,cohesion:60}]});log(w,'私财组织 200 人部曲，兵员来自驻地人口，军粮和薪饷由私人承担。');return;}
 const a=w.realm!.armies.find(a=>a.id===c.army)!;
 if(c.action==='automation'){a.automation=c.control;return;}
 if(c.action==='priority'){a.supplyPriority=c.priority;return;}
 if(c.action==='integrate'){delete a.owner;a.payer='central:'+r;for(const u of a.regiments??[])u.institution=Math.max(60,u.institution??0);log(w,`第 ${a.id} 军经主人同意正式改编，转入公饷，原籍与私人忠诚保留。`);return;}
 const wallet=accountWallet(w,a.payer??'central:'+r)!,cost=Math.ceil(a.troops/20)+(a.arrears??0);wallet.write(wallet.read()-cost);fiscalRecord(w,r,a.payer??'central:'+r,'expense',cost,'结清军饷与老兵安置');a.arrears=0;for(const u of a.regiments??[])u.institution=Math.min(100,(u.institution??60)+30);delete a.refusal;log(w,`第 ${a.id} 军支出 ${cost} 钱清偿与安抚，制度信任 +30。`);
}
export function advanceMilitaryCareer(w:World){const s=w.militaryCareer??={lastDay:Math.max(0,w.day-1),xp:{},studies:{}};if(s.lastDay>=w.day)return;s.lastDay=w.day;for(const [id,q] of Object.entries(s.studies)){if(!isAlive(w,id)){delete s.studies[id];continue;}q.progress??=Math.max(0,Math.min(29,w.day-q.started-1));if(studyAvailable(w,id))q.progress++;q.due=w.day+30-q.progress;if(q.progress>=30){awardMilitaryExperience(w,id,Math.max(2,20-Math.floor((s.xp[id]??0)/40)));log(w,'兵法研习完成，军事历练已计入能力来源。');delete s.studies[id];}}
 if(isMonthStart(w.day,w.scriptId))for(const a of w.realm?.armies??[]){const leader=armyCommander(w,a);for(const u of a.regiments??[]){u.institution=Math.max(0,Math.min(100,(u.institution??60)+(a.arrears?-5:a.starvationDays?-3:2)));u.cohesion=Math.max(0,Math.min(100,(u.cohesion??60)+(a.starvationDays?-3:1)));if(leader){if(u.loyalTo!==leader){u.loyalTo=leader;u.commanderLoyalty=Math.max(0,(u.commanderLoyalty??0)-20);}u.commanderLoyalty=Math.min(100,(u.commanderLoyalty??0)+2);}}}
}
export function validMilitaryCareer(w:World){const s=w.militaryCareer;if(!s)return s===undefined;const n=(v:unknown,max:number)=>Number.isSafeInteger(v)&&Number(v)>=0&&Number(v)<=max;return n(s.lastDay,w.day)&&!!s.xp&&!Array.isArray(s.xp)&&Object.entries(s.xp).every(([id,xp])=>!!relationshipPersonById[id]&&n(xp,240))&&!!s.studies&&!Array.isArray(s.studies)&&Object.entries(s.studies).every(([id,q])=>!!relationshipPersonById[id]&&!!q&&n(q.started,w.day)&&(q.progress===undefined?q.due===q.started+30:q.progress>=0&&n(q.progress,29)&&q.due>=q.started+30)&&q.due>w.day);}
