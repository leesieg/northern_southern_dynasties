import type {World} from './types';
import type {War} from './wars';
import type {RealmId} from './realm';
import {activeWars} from './wars';
import {governingExecutives,governmentOf} from './government';
import {allegianceRealm,publicOfficeReason} from './officeEligibility';
import {isAlive} from './lifeState';
import {detained} from './custodyState';
import {personInfluence,awardInfluence} from './personalInfluence';
import {changeRelationOpinion} from './relationships';
import {armyCommander} from './mobility';
import {civilTransferPreview} from './civilTransfers';
import {ensurePowerPolitics} from './powerPolitics';
import {ministries,ministryIds,type MinistryId} from '../data/court';
import {siteById} from '../data/scenario';
import {appointmentEvaluation} from './appointmentRules';
import type {CivilStance} from './civilMobilization';

export interface CivilPromise {war:number;created:number;target:{kind:'county'|'ministry'|'army';id:string};mode:'retain'|'after';status:'offered'|'active'|'kept'|'broken'|'void';due:number|null}
export interface CivilCommitment {realm:RealmId;person:string;chief:string;kind:'office'|'command';until:number;broken:boolean;civil:CivilPromise}
export type CivilPledgeCommand={type:'civilWar';action:'pledge';war:number;person:string;side:'loyal'|'rebel';target:CivilPromise['target'];mode:CivilPromise['mode']};
export const civilPromiseNames={offered:'待遇待接受',active:'承诺有效',kept:'已兑现',broken:'已违约',void:'条件失效'};
export function civilCommitments(w:World){return (w.politics?.commitments??[]).filter((q):q is CivilCommitment=>q.civil!==undefined);}
const live=(q:CivilCommitment)=>q.civil.status==='offered'||q.civil.status==='active';
const targetKey=(target:CivilPromise['target'])=>target.kind+':'+target.id;
export function civilPromiseHeld(w:World,q:CivilCommitment){
 if(q.civil.target.kind==='county'){const c=w.realm?.cities[q.civil.target.id];return c?.controller===q.realm&&c.governor===q.person;}
 if(q.civil.target.kind==='ministry')return governmentOf(w,q.realm)?.court?.ministries[q.civil.target.id as MinistryId]===q.person;
 const a=w.realm?.armies.find(a=>a.id===Number(q.civil.target.id));return a?.realm===q.realm&&(a.owner===q.person||armyCommander(w,a)===q.person);
}
export function civilPromiseOptions(w:World,war:War,actor:string,person:string){
 const r=allegianceRealm(w,actor),from=allegianceRealm(w,person);if(person===actor||person===war.civil?.claimant||person===governmentOf(w,war.defender)?.ruler||governingExecutives(w,war.defender).includes(person)||!r||!from||![war.attacker,war.defender].includes(r)||!governingExecutives(w,r).includes(actor)||!war.civil?.mobilization?.members[person]||!isAlive(w,person)||detained(w,person))return [];
 const assets=from!==r?civilTransferPreview(w,war,person,r):null,options:{target:CivilPromise['target'];mode:CivilPromise['mode'];label:string}[]=[],g=governmentOf(w,r)!;
 for(const [site,c] of Object.entries(w.realm!.cities))if(c.governor===person&&(c.controller===r||assets?.cities.includes(site)))options.push({target:{kind:'county',id:site},mode:'retain',label:'保留'+siteById[site].name+'县域职权'});
 for(const a of w.realm!.armies)if((a.owner===person||armyCommander(w,a)===person)&&(a.realm===r||assets?.armies.includes(a.id!)))options.push({target:{kind:'army',id:String(a.id)},mode:'retain',label:'保留第 '+a.id+' 军兵权'});
 for(const id of ministryIds){const holder=g.court?.ministries[id];if(holder===person)options.push({target:{kind:'ministry',id},mode:'retain',label:'保留'+ministries[id].name});
  else if(!holder&&!publicOfficeReason(w,person)&&appointmentEvaluation(w,r,person,{ministry:id},actor).ordinary)options.push({target:{kind:'ministry',id},mode:'after',label:'战后授予'+ministries[id].name+'（当前空席）'});
 }
 return options.filter(o=>!civilCommitments(w).some(q=>q.realm===r&&live(q)&&(q.person===person||targetKey(q.civil.target)===targetKey(o.target))));
}
export function civilPledgeReason(w:World,war:War,c:CivilPledgeCommand,actor:string){
 const r=c.side==='rebel'?war.attacker:war.defender;
 if(!['loyal','rebel'].includes(c.side)||!governingExecutives(w,r).includes(actor)||allegianceRealm(w,actor)!==r||!isAlive(w,actor)||detained(w,actor))return '须由本阵营在位且自由的实际执政者承诺';
 if((w.politics?.commitments?.length??0)>=270)return '政治承诺记录已满';
 if(!c.target||!civilPromiseOptions(w,war,actor,c.person).some(o=>o.mode===c.mode&&targetKey(o.target)===targetKey(c.target)))return '职位、兵权或候选资格已变化，或已有冲突承诺';
 return personInfluence(w,actor)<10?'本人影响力不足 10':'';
}
export function actCivilPledge(w:World,war:War,c:CivilPledgeCommand,actor:string){
 const why=civilPledgeReason(w,war,c,actor);if(why)throw new Error(why);
 const realm=c.side==='rebel'?war.attacker:war.defender;
 const accepted=war.civil!.mobilization!.members[c.person]?.choice===c.side&&allegianceRealm(w,c.person)===realm;
 awardInfluence(w,actor,-10);const q:CivilCommitment={realm,person:c.person,chief:actor,kind:c.target.kind==='army'?'command':'office',until:w.day+180,broken:false,civil:{war:war.id!,created:w.day,target:{...c.target},mode:c.mode,status:accepted?'active':'offered',due:null}};
 (ensurePowerPolitics(w).commitments??=[]).push(q);
}
export function civilPromiseBonus(w:World,war:War,id:string){return civilCommitments(w).filter(q=>q.civil.war===war.id&&q.person===id&&live(q)&&isAlive(w,q.chief)&&!detained(w,q.chief)&&governingExecutives(w,q.realm).includes(q.chief)).reduce((n,q)=>n+(q.realm===war.attacker?30:-30),0);}
export function activateCivilPromises(w:World,war:War,id:string,choice:CivilStance){
 if(choice==='watch'){for(const q of civilCommitments(w))if(q.civil.war===war.id&&q.person===id&&q.civil.status==='active')q.civil.status='void';return;}
 const r=choice==='rebel'?war.attacker:war.defender;
 for(const q of civilCommitments(w))if(q.civil.war===war.id&&q.person===id&&live(q)){if(q.realm===r)q.civil.status='active';else q.civil.status='void';}
}
function breach(w:World,q:CivilCommitment){q.broken=true;q.civil.status='broken';changeRelationOpinion(w,q.chief,q.person,-25);w.chronicle.push({day:w.day,person:'player',text:'内战保留待遇／授官承诺未兑现，双方关系 −25。'});w.chronicle=w.chronicle.slice(-100);}
/** Called before the wartime entity disappears, so promises survive ordinary reunification. */
export function settleCivilPromises(w:World,war:War,winner:RealmId|null,partition=false){
 for(const q of civilCommitments(w).filter(q=>q.civil.war===war.id&&live(q))){
  if(q.civil.status==='offered'||winner!==null&&q.realm!==winner||q.civil.mode==='after'&&winner===null){q.civil.status='void';continue;}
  if(!partition)q.realm=war.defender;
  q.civil.due=w.day+30;q.until=w.day+180;
 }
}
export function advanceCivilPromises(w:World){
 for(const q of civilCommitments(w)){
  if(!live(q))continue;
  const war=activeWars(w).find(v=>v.id===q.civil.war),available=isAlive(w,q.person)&&isAlive(w,q.chief)&&!detained(w,q.chief)&&governingExecutives(w,q.realm).includes(q.chief);
  if(!available||allegianceRealm(w,q.person)!==q.realm&&q.civil.status==='active'){q.civil.status='void';continue;}
  if(q.civil.status==='offered'){if(w.day>=q.until||!war)q.civil.status='void';continue;}
  if(!war&&q.civil.due===null){q.civil.status='void';continue;}
  const held=civilPromiseHeld(w,q);
  if(war&&q.civil.mode==='retain'&&!held)breach(w,q);
  else if(!war&&held)q.civil.status='kept';
  else if(!war&&q.civil.due!==null&&w.day>=q.civil.due)breach(w,q);
 }
 for(const settlement of w.politics?.civilSettlements??[])for(const p of settlement.promises??[]){if(p.outcome)continue;const live=[...civilCommitments(w)].reverse().find(q=>q.civil.war===settlement.war&&q.person===p.person&&q.chief===p.chief&&q.civil.created===p.created&&q.civil.target.kind===p.target.kind&&q.civil.target.id===p.target.id);if(live&&['kept','broken','void'].includes(live.civil.status))p.outcome=live.civil.status as 'kept'|'broken'|'void';}
 // Closed records retain a bounded audit window, while unfulfilled obligations cannot be dropped.
 if(w.politics?.commitments)w.politics.commitments=w.politics.commitments.filter(q=>!q.civil||live(q as CivilCommitment)||w.day-q.until<180);
}
export function validCivilPromise(w:World,q:{kind:'office'|'command';broken:boolean;civil?:CivilPromise}){
 const c=q.civil;if(c===undefined)return true;
 if(!c||typeof c!=='object'||!Number.isSafeInteger(c.war)||c.war<1||c.war>=(w.realm?.nextWarId??1)||!Number.isSafeInteger(c.created)||c.created<0||c.created>w.day||!['retain','after'].includes(c.mode)||!['offered','active','kept','broken','void'].includes(c.status)||!c.target||typeof c.target.id!=='string'||!['county','ministry','army'].includes(c.target.kind)||c.due!==null&&(!Number.isSafeInteger(c.due)||c.due<0||c.due>w.day+30)||q.broken!==(c.status==='broken'))return false;
 if(c.target.kind==='county'&&!Object.hasOwn(w.realm?.cities??{},c.target.id)||c.target.kind==='ministry'&&!ministryIds.includes(c.target.id as MinistryId)||c.target.kind==='army'&&(!/^[1-9]\d*$/.test(c.target.id)||Number(c.target.id)>=(w.realm?.nextArmyId??1)))return false;
 return q.kind===(c.target.kind==='army'?'command':'office');
}
