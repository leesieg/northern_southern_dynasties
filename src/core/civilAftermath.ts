import type {World,GameCommand} from './types';
import type {War} from './wars';
import type {RealmId} from './realm';
import type {CivilFact} from './civilConduct';
import {validCivilConduct,recordCivilBattle,recordCivilFact} from './civilConduct';
import {ensurePowerPolitics} from './powerPolitics';
import {getPerson} from './personRegistry';
import {allegianceRealm} from './officeEligibility';
import {governmentOf,governingExecutives} from './government';
import {isAlive} from './lifeState';
import {detained} from './custodyState';
import {civilCommitments,advanceCivilPromises,civilPromiseHeld} from './civilPromises';
import {actCourt,courtReason,centralAppointmentCost} from './court';
import {actLocal,localReason,localInfluenceCost,countyTerritory,localTitle} from './localAdministration';
import {ministryIds,ministries,type MinistryId} from '../data/court';
import {accountWallet} from './obligations';
import {fiscalRecord} from './treasury';
import {armyCommander,actMobility,mobilityReason} from './mobility';
import {commanderCompliance} from './militaryCareer';
import {changeRelationOpinion,relationOpinion} from './relationships';
import {siteById} from '../data/scenario';
import {survivingRealm} from './polityLifecycle';
import {isMonthStart} from './calendar';

export interface CivilSettlementMember {person:string;side:'attack'|'defend'|'watch'|'outside';facts:CivilFact[];justice:'pending'|'pardon'|'retain'|'dismiss';reward:number;removed:string[]}
export interface CivilSettlementPromise {person:string;chief:string;created:number;target:import('./civilPromises').CivilPromise['target'];mode:'retain'|'after';atEnd:import('./civilPromises').CivilPromise['status'];outcome?:'kept'|'broken'|'void'}
export interface CivilSettlement {purpose?:'political'|'grievance';promises?:CivilSettlementPromise[];war:number;crisis:number;realm:RealmId;rebelRealm:RealmId;claimant:string;loyalist:string|null;site:string;ended:number;reviewed?:number;result:'rebel'|'loyal'|'white'|'partition';members:CivilSettlementMember[]}
export type CivilAftermathCommand={type:'civilAftermath';war:number;person:string;action:'pardon'|'retain'|'dismiss'|'reward'|'appoint'|'fulfil';coins?:number;office?:string};
export const settlementResults={rebel:'起兵方取得朝廷',loyal:'朝廷平定内战',white:'赦免停战',partition:'承认割据'};
export function settlementResultName(s:CivilSettlement){return s.purpose==='grievance'&&s.result==='rebel'?'地方诉求获准':s.purpose==='grievance'&&s.result==='loyal'?'地方民变平定':settlementResults[s.result];}
export function civilSettlements(w:World){return w.politics?.civilSettlements??[];}
export function visibleCivilSettlements(w:World){const r=w.characterId&&allegianceRealm(w,w.characterId);return civilSettlements(w).filter(s=>survivingRealm(w,s.realm)===r||s.result==='partition'&&survivingRealm(w,s.rebelRealm)===r||s.members.some(p=>p.person===w.characterId));}
export function captureCivilSettlement(w:World,war:War,result:CivilSettlement['result']){
 const s=war.civil!;if(civilSettlements(w).some(q=>q.war===war.id))return;
 // Recover only surviving, recorded evidence for old saves; never invent a missing contribution.
 for(const b of w.militaryAftermath?.battles??[])if(b.war===war.id)for(const round of b.rounds??[])recordCivilBattle(w,war.id,b.id,round.before,round.day);
 for(const e of w.militaryAftermath?.siegeEvents??[])if(e.after.war===war.id&&e.before.controller!==e.after.controller&&['surrender','assaultWon'].includes(e.kind))for(const a of e.before.armies)if(a.commander)recordCivilFact(w,war,a.commander,{source:'capture:'+e.after.site,kind:'capture',side:e.after.side,day:e.day,amount:1});
 const people=new Set([s.claimant,...(s.loyalist?[s.loyalist]:[]),...s.supporters,...Object.keys(s.mobilization?.members??{}),...Object.keys(s.conduct??{})]);
 const members:CivilSettlementMember[]=[...people].filter(id=>!!getPerson(w,id)).map(person=>{const actual=allegianceRealm(w,person),choice=s.mobilization?.members[person]?.choice;return {person,side:person===s.claimant||(war.attacker===war.defender?s.supporters.includes(person):actual===war.attacker)?'attack':person===s.loyalist?'defend':actual!==war.defender?'outside':choice==='watch'||choice==='pending'?'watch':'defend',facts:structuredClone(s.conduct?.[person]??[]),justice:result==='white'||result==='partition'?'pardon':'pending',reward:0,removed:[]};});
 (ensurePowerPolitics(w).civilSettlements??=[]).push({purpose:s.grievance===undefined?'political':'grievance',war:war.id!,crisis:s.crisis??war.id!,realm:war.defender,rebelRealm:war.attacker,claimant:s.claimant,loyalist:s.loyalist,site:war.target,ended:w.day,result,members,promises:civilCommitments(w).filter(q=>q.civil.war===war.id).map(q=>({person:q.person,chief:q.chief,created:q.civil.created,target:{...q.civil.target},mode:q.civil.mode,atEnd:q.civil.status,...(['kept','broken','void'].includes(q.civil.status)?{outcome:q.civil.status as 'kept'|'broken'|'void'}:{})}))});
}
export function civilOffices(w:World,realm:RealmId,person:string){
 const options:{id:string;label:string;command:GameCommand}[]=[];
 for(const ministry of ministryIds)if(governmentOf(w,realm)?.court?.ministries[ministry]===person)options.push({id:'ministry:'+ministry,label:ministries[ministry].name,command:{type:'court',action:'appoint',ministry,candidate:null}});
 for(const [key,seat] of Object.entries(w.realm?.local?.seats??{}))if(key.startsWith(realm+'|')&&seat.holder===person){const territory=key.slice(realm.length+1);options.push({id:'county:'+territory,label:localTitle(territory),command:{type:'local',action:'remove',territory}});}
 for(const [site,city] of Object.entries(w.realm?.cities??{})){const territory=countyTerritory(site),id='county:'+territory;if(city.controller===realm&&city.governor===person&&!options.some(o=>o.id===id))options.push({id,label:localTitle(territory),command:{type:'local',action:'remove',territory}});}
 for(const a of w.realm?.armies??[])if(a.realm===realm&&armyCommander(w,a)===person)options.push({id:'army:'+a.id,label:'第 '+a.id+' 军统帅',command:{type:'mobility',action:'dismiss-command',army:a.id!}});
 return options;
}
export function civilAppointmentOptions(w:World,realm:RealmId,person:string){
 return ministryIds.filter(id=>!governmentOf(w,realm)?.court?.ministries[id]).map(ministry=>({id:'ministry:'+ministry,label:ministries[ministry].name,command:{type:'court',action:'appoint',ministry,candidate:person} as GameCommand}));
}
function officeCommand(w:World,c:CivilAftermathCommand,realm:RealmId):GameCommand|undefined{
 if(c.action==='dismiss')return civilOffices(w,realm,c.person).find(o=>o.id===c.office)?.command;
 if(c.action==='appoint')return civilAppointmentOptions(w,realm,c.person).find(o=>o.id===c.office)?.command;
 if(c.action==='fulfil'){const q=civilCommitments(w).find(q=>q.civil.war===c.war&&q.person===c.person&&q.realm===realm&&q.civil.status==='active');if(!q)return;
  const t=q.civil.target;if(t.kind==='ministry')return {type:'court',action:'appoint',ministry:t.id as MinistryId,candidate:c.person};
  if(t.kind==='army')return {type:'mobility',action:'command',army:Number(t.id),person:c.person};
  if(t.kind==='county')return {type:'local',action:'appoint',territory:countyTerritory(t.id),candidate:c.person};
 }
}
function appointmentReason(w:World,c:GameCommand,actor:string){if(c.type==='mobility'){if(actor!==w.characterId)return '军职变更须在军队实际交接';const why=mobilityReason(w,c);if(why)return why;if(c.action==='dismiss-command'||c.action==='command'){const a=w.realm!.armies.find(a=>a.id===c.army);if(a){const q=commanderCompliance(w,a,'replace',c.action==='command'?c.person:undefined);if(q.refuses)return q.reason;}}return '';}
 return c.type==='court'?courtReason(w,c,actor):c.type==='local'?localReason(w,c,actor):'没有可执行职权方案';}
export function civilAftermathInfluenceCost(w:World,c:CivilAftermathCommand,actor=w.characterId!){
 const realm=allegianceRealm(w,actor);if(!realm)return 0;
 if(c.action==='fulfil'&&civilCommitments(w).some(q=>q.civil.war===c.war&&q.person===c.person&&q.realm===realm&&q.civil.status==='active'&&civilPromiseHeld(w,q)))return 0;
 const command=officeCommand(w,c,realm);
 return command?.type==='court'&&command.action==='appoint'?centralAppointmentCost(w,realm,command.ministry,command.candidate):command?.type==='local'?localInfluenceCost(w,command,actor):0;
}
export function civilAftermathReason(w:World,c:CivilAftermathCommand,actor=w.characterId!){
 const s=civilSettlements(w).find(s=>s.war===c.war),p=s?.members.find(p=>p.person===c.person),r=allegianceRealm(w,actor);
 if(!s||!p)return '善后记录或人物不存在';
 if(!r||r!==survivingRealm(w,s.realm)&&!(s.result==='partition'&&r===survivingRealm(w,s.rebelRealm))||!governingExecutives(w,r).includes(actor)||!isAlive(w,actor)||detained(w,actor))return '须由相关朝廷当前自由执政者办理';
 if(!isAlive(w,c.person))return '人物已去世，保留实际参与记录';
 if(!['pardon','retain','dismiss','reward','appoint','fulfil'].includes(c.action))return '无效善后行动';
 const q=officeCommand(w,c,r);
 if(c.action==='reward'){
  const side=s.result==='partition'?(p.side==='attack'||p.side==='defend'?p.side:null):s.result==='rebel'?'attack':s.result==='loyal'?'defend':null;
  if(!side||p.side!==side||!p.facts.some(f=>f.side===side&&(['battle','capture'].includes(f.kind)||f.kind==='supply'&&f.amount>(f.returned??0))))return '须有胜方实际参战、夺城或送达供粮凭据';
  if(p.reward>0)return '本场功劳已经领赏';
  if(allegianceRealm(w,c.person)!==r)return '只能向当前效忠本国的参与者发赏';
  if(!Number.isSafeInteger(c.coins)||![25,50,100].includes(c.coins!))return '请选择赏钱 25、50 或 100';
  const wallet=accountWallet(w,'person:'+c.person);return !wallet?'个人财产账户不可用':wallet.read()+c.coins!>1000000?'收款人私财容量不足':w.realm!.treasuries[r].coins<c.coins!?'本国中央公库不足':'';
 }
 if(c.action==='dismiss'){
  if(s.result==='white'||s.result==='partition'||p.justice==='pardon'||p.justice==='retain')return '和约赦免或已作留任，不得再借本场战争追责';
  const loser=s.result==='rebel'?'defend':'attack';if(p.side!==loser)return '只可按实际失败阵营追责，不能因观望清算';
  if(!q||p.removed.includes(c.office!))return '该职位已撤免或当前不由此人合法担任';return appointmentReason(w,q,actor);
 }
 if(c.action==='fulfil'&&civilCommitments(w).some(q=>q.civil.war===c.war&&q.person===c.person&&q.realm===r&&q.civil.status==='active'&&civilPromiseHeld(w,q)))return '';
 if(c.action==='appoint'||c.action==='fulfil')return !q?'当前没有可执行的空席或有效待履约方案':appointmentReason(w,q,actor);
 if(p.justice!=='pending')return '本场抚慰或留任已记录';
 if(c.action==='retain'&&(allegianceRealm(w,c.person)!==r||!civilOffices(w,r,c.person).length))return '当前没有可确认的本国合法任职，不恢复旧职';
 return '';
}
export function actCivilAftermath(w:World,c:CivilAftermathCommand,actor=w.characterId!,transactional=true){
 const why=civilAftermathReason(w,c,actor);if(why)throw new Error(why);
 const next=transactional?structuredClone(w):w,s=civilSettlements(next).find(s=>s.war===c.war)!,p=s.members.find(p=>p.person===c.person)!,r=allegianceRealm(next,actor)!;
 if(c.action==='reward'){next.realm!.treasuries[r].coins-=c.coins!;const wallet=accountWallet(next,'person:'+c.person)!;wallet.write(wallet.read()+c.coins!);p.reward=c.coins!;fiscalRecord(next,r,'central:'+r,'person:'+c.person,c.coins!,'内战善后赏钱，战争 '+s.war);}
 else if(c.action==='appoint'||c.action==='dismiss'||c.action==='fulfil'){const command=c.action==='fulfil'&&civilCommitments(next).some(q=>q.civil.war===c.war&&q.person===c.person&&q.realm===r&&q.civil.status==='active'&&civilPromiseHeld(next,q))?undefined:officeCommand(next,c,r);if(command?.type==='court')actCourt(next,command,actor);else if(command?.type==='local')actLocal(next,command,actor);else if(command?.type==='mobility')actMobility(next,command);if(c.action==='dismiss'){p.justice='dismiss';p.removed.push(c.office!);}advanceCivilPromises(next);}
 else {p.justice=c.action;if(actor!==c.person)changeRelationOpinion(next,actor,c.person,5);}
 next.chronicle.push({day:next.day,person:'player',text:'内战善后：'+(getPerson(next,c.person)?.name??c.person)+' · '+({reward:'赏钱 '+c.coins,appoint:'按现行规则任官',fulfil:'办理战后承诺',dismiss:'按现职撤免',retain:'确认当前合法任职',pardon:'抚慰赦免'})[c.action]});next.chronicle=next.chronicle.slice(-100);
 if(next!==w)Object.assign(w,next);
}
export function advanceCivilAftermath(w:World){
 if(!isMonthStart(w.day,w.scriptId))return;
 for(const s of civilSettlements(w)){if(s.reviewed===w.day)continue;s.reviewed=w.day;for(const r of [...new Set((s.result==='partition'?[s.realm,s.rebelRealm]:[s.realm]).map(r=>survivingRealm(w,r)))]){
  const actor=governingExecutives(w,r).find(id=>isAlive(w,id)&&!detained(w,id));if(!actor||actor===w.characterId)continue;
  for(const p of s.members){if(p.justice==='pending'){const office=civilOffices(w,r,p.person)[0],loser=s.result==='rebel'?'defend':'attack',punish=office&&p.side===loser&&p.facts.some(f=>['battle','capture','switch'].includes(f.kind))&&relationOpinion(w,actor,p.person)<-30&&office.command.type!=='mobility';const c:CivilAftermathCommand={type:'civilAftermath',war:s.war,person:p.person,action:punish?'dismiss':office?'retain':'pardon',...(punish?{office:office.id}:{})};if(!civilAftermathReason(w,c,actor))actCivilAftermath(w,c,actor,false);}
   if(civilCommitments(w).some(q=>q.civil.war===s.war&&q.person===p.person&&q.realm===r&&q.civil.status==='active')){const c:CivilAftermathCommand={type:'civilAftermath',war:s.war,person:p.person,action:'fulfil'};if(!civilAftermathReason(w,c,actor))actCivilAftermath(w,c,actor,false);}
  }
  if(w.realm!.treasuries[r].coins>=125){for(const p of s.members){const c:CivilAftermathCommand={type:'civilAftermath',war:s.war,person:p.person,action:'reward',coins:25};if(!civilAftermathReason(w,c,actor)){actCivilAftermath(w,c,actor,false);break;}}}
 }}
}
export function validCivilSettlements(w:World){
 const rows=w.politics?.civilSettlements;if(rows===undefined)return true;const realms=Object.keys(w.realm?.governments?.realms??{}),person=(id:unknown)=>typeof id==='string'&&!!getPerson(w,id),integer=(n:unknown,max:number)=>Number.isSafeInteger(n)&&Number(n)>=0&&Number(n)<=max;
 return Array.isArray(rows)&&rows.length<=128&&new Set(rows.map(s=>s?.war)).size===rows.length&&rows.every(s=>s&&(s.purpose===undefined||['political','grievance'].includes(s.purpose))&&integer(s.war,(w.realm?.nextWarId??1)-1)&&s.war>0&&integer(s.crisis,s.war)&&s.crisis>0&&!w.realm?.wars?.some(q=>q.id===s.war)&&realms.includes(s.realm)&&realms.includes(s.rebelRealm)&&person(s.claimant)&&(s.loyalist===null||person(s.loyalist))&&!!siteById[s.site]&&integer(s.ended,w.day)&&(s.reviewed===undefined||integer(s.reviewed,w.day)&&s.reviewed>=s.ended)&&['rebel','loyal','white','partition'].includes(s.result)&&(s.promises===undefined||Array.isArray(s.promises)&&s.promises.length<=270&&s.promises.every(p=>p&&person(p.person)&&person(p.chief)&&integer(p.created,s.ended)&&['retain','after'].includes(p.mode)&&['offered','active','kept','broken','void'].includes(p.atEnd)&&(p.outcome===undefined||['kept','broken','void'].includes(p.outcome))&&p.target&&['county','ministry','army'].includes(p.target.kind)&&typeof p.target.id==='string'&&p.target.id.length<=180&&(p.target.kind==='county'?!!siteById[p.target.id]:p.target.kind==='ministry'?ministryIds.includes(p.target.id as MinistryId):/^[1-9]\d*$/.test(p.target.id)&&Number(p.target.id)<(w.realm?.nextArmyId??1))))&&Array.isArray(s.members)&&new Set(s.members.map(p=>p?.person)).size===s.members.length&&s.members.every(p=>p&&person(p.person)&&['attack','defend','watch','outside'].includes(p.side)&&['pending','pardon','retain','dismiss'].includes(p.justice)&&integer(p.reward,100)&&[0,25,50,100].includes(p.reward)&&Array.isArray(p.removed)&&new Set(p.removed).size===p.removed.length&&p.removed.every(k=>typeof k==='string'&&k.length<=180)&&validCivilConduct(w,{[p.person]:p.facts})));
}
