import {dynastyNameOptions} from './dynastyNaming';
import {civilOrigin,independentCivil,recognizeCivilPolity,establishCivilPolity} from './civilPolities';
import {ensureFortifications,establishCapitalFortification} from './fortifications';
import {isMonthStart} from './calendar';
import {relationOpinion} from './relationships';
import {redirectCourtEnvoys} from './diplomacy';
import type {World} from './types';
import {capital,syncGovernance,type RealmId} from './realm';
import {worldRealms,realmOrigin,isRealmId,initialPoliticalRealm,permanentRealmCount,administrativeRealm,provisionalRealm} from './polityRuntime';
import {governmentOf,governingExecutives,regimeName} from './government';
import {civilWar,warArmySide} from './civilWars';
import {activeWars} from './wars';
import {validDynastyName} from './courtSave';
import {allegianceRealm} from './officeEligibility';
import {siteById} from '../data/scenario';
import {isAlive} from './lifeState';
import {detained} from './custodyState';
import {personResidence} from './residence';
export type PolityCommand={type:'polity';action:'relocate';site:string}|{type:'polity';action:'partition';name:string}|{type:'polity';action:'partition-answer';accept:boolean};
export function polityReason(w:World,c:PolityCommand,actor=w.characterId!){if(!w.realm?.governments||!actor||!isAlive(w,actor)||detained(w,actor)||w.campaign?.status!=='active')return '当前不能办理政权安排';const r=allegianceRealm(w,actor)!,war=civilWar(w,r);
 if(c.action==='relocate'){const city=w.realm.cities[c.site];return !governingExecutives(w,r).includes(actor)?'须当前实际执政者决定朝廷驻地':!city||administrativeRealm(w,c.site)!==r||city.controller!==r||!warCityCompatible(w,r,c.site,actor)?'须本方实际控制的法理辖地':capital(r,w)===c.site?'朝廷已驻此地':personResidence(w,actor).site!==c.site||personResidence(w,actor).traveling?'执政者须实际抵达新驻地':w.realm.treasuries[r].coins<100?'迁移朝廷需中央公款 100 钱':'';}
 if(!war?.civil)return '须有本国正在持续的内战';const civil=war.civil;
 if(c.action==='partition-answer'){if(typeof c.accept!=='boolean')return '须明确接受或拒绝';if(!civil.partitionOffer||civil.partitionOffer.until<w.day)return '没有有效的割据议案';if(actor!==civil.loyalist)return '须原朝廷领袖裁定';if(!c.accept)return '';return partitionBasisReason(w,war,civil.partitionOffer.name,civil.claimant);}
 const basis=partitionBasisReason(w,war,c.name,actor);return basis||(civil.partitionOffer&&civil.partitionOffer.until>=w.day?'已有割据议案候复':'');
}
function partitionBasisReason(w:World,war:import('./wars').War,name:string,actor:string){if(war.civil?.grievance!==undefined)return '地方诉求须按待遇与钱粮和解，不能据此另立政权';const r=war.attacker,c=war.civil!,cities=c.cities.filter(id=>w.realm!.cities[id].controller===r&&w.realm!.cities[id].owner===civilOrigin(war)),troops=w.realm!.armies.filter(a=>a.realm===r&&warArmySide(w,war,a)==='attack').reduce((n,a)=>n+a.troops,0);return actor!==c.claimant||!isAlive(w,actor)||detained(w,actor)||allegianceRealm(w,actor)!==r?'须当前自由起兵领袖提出割据和解':!validDynastyName(name)?'须议定 1—6 个汉字的新国号':worldRealms(w).some(id=>!w.realm!.annexed?.[id]&&regimeName(w,id)===name)?'不能与存续政权使用同一国号':permanentRealmCount(w)>=9?'本局并立政权已达上限':w.day-war.started<180?'须有至少 180 日的持续阵营':!cities.includes(c.base)||troops<300?'须有实际控制的根据地及至少 300 人军队':governmentOf(w,civilOrigin(war))!.ruler===actor?'不能同时继承原朝廷与另建割据政权':Math.abs(war.score)>30?'军事压力差距过大，对方不接受割据和解':'';}
function warCityCompatible(w:World,r:RealmId,site:string,actor:string){const war=civilWar(w,r);return !war||independentCivil(war)||war.civil!.supporters.includes(actor)===war.civil!.cities.includes(site);}
function log(w:World,text:string){w.chronicle.push({day:w.day,person:'player',text});w.chronicle=w.chronicle.slice(-100);}
export function actPolity(w:World,c:PolityCommand,actor=w.characterId!){const next=structuredClone(w);perform(next,c,actor);Object.assign(w,next);}
function perform(w:World,c:PolityCommand,actor:string){const why=polityReason(w,c,actor);if(why)throw new Error(why);const s=w.realm!,r=allegianceRealm(w,actor)!;
 if(c.action==='relocate'){ensureFortifications(w);const previous=capital(r,w);s.treasuries[r].coins-=100;(s.identities??={})[r]={...s.identities?.[r],origin:realmOrigin(w,r) as 'liang'|'east'|'west',capital:c.site,created:s.identities?.[r]?.created??s.governments!.since,predecessor:s.identities?.[r]?.predecessor??null};if(!provisionalRealm(w,r))establishCapitalFortification(w,c.site);redirectCourtEnvoys(w,r,previous);log(w,'朝廷迁驻'+siteById[c.site].name+'，使团、公务与补给按新驻地办理。');return;}
 const war=civilWar(w,r)!,civil=war.civil!;
 if(c.action==='partition'){civil.partitionOffer={from:actor,name:c.name,created:w.day,until:w.day+15};log(w,'起兵方提出承认实际割据的和解，等待原朝廷回应。');return;}
 if(!c.accept){delete civil.partitionOffer;return;}formSeparateRealm(w,war.id!,civil.partitionOffer!.name);
}
/** Partition recognizes the existing wartime entity rather than creating a second polity or treasury. */
export function formSeparateRealm(w:World,warId:number,name:string){const war=activeWars(w).find(v=>v.id===warId);if(!war?.civil)throw new Error('内战已结束');const why=partitionBasisReason(w,war,name,war.civil.claimant);if(why)throw new Error(why);establishCivilPolity(w,war);recognizeCivilPolity(w,war,name);syncGovernance(w);log(w,name+'经和约承认为并立政权，仅交割其实际控制的县域；既有钱粮、军队和外战继续结算。');}
export function advanceSeparations(w:World){if(!w.realm?.governments||w.campaign?.status!=='active')return;for(const r of worldRealms(w)){const chief=governingExecutives(w,r)[0],seat=capital(r,w),at=chief&&personResidence(w,chief);if(chief&&chief!==w.characterId&&at&&!at.traveling&&(administrativeRealm(w,seat)!==r||w.realm.cities[seat].controller!==r||!warCityCompatible(w,r,seat,chief))&&!polityReason(w,{type:'polity',action:'relocate',site:at.site},chief))perform(w,{type:'polity',action:'relocate',site:at.site},chief);}
 for(const war of activeWars(w)){if(war.civil&&war.civil.loyalist&&war.civil.grievance===undefined&&!war.civil.partitionOffer&&war.civil.claimant!==w.characterId&&isMonthStart(w.day,w.scriptId)&&w.day-war.started>=180&&relationOpinion(w,war.civil.loyalist,war.civil.claimant)<=-30){const name=(!war.civil.arrangement||war.civil.arrangement.goal==='dynasty'?war.civil.arrangement?.name??war.civil.name:dynastyNameOptions(w,war.attacker,war.civil.claimant)[0]?.name);if(name){const command={type:'polity',action:'partition',name} as const;if(!polityReason(w,command,war.civil.claimant))perform(w,command,war.civil.claimant);}}const p=war.civil?.partitionOffer;if(!p)continue;if(w.day>p.until){delete war.civil!.partitionOffer;continue;}if(war.civil!.loyalist&&war.civil!.loyalist!==w.characterId&&!polityReason(w,{type:'polity',action:'partition-answer',accept:true},war.civil!.loyalist))formSeparateRealm(w,war.id!,p.name);}}
export function validRealmIdentities(w:World){const ids=worldRealms(w);if(permanentRealmCount(w)>9||!worldRealms().every(id=>ids.includes(id))||!ids.every(isRealmId))return false;const state=w.realm?.identities;if(state===undefined)return ids.every(id=>!id.startsWith('realm-')&&!id.startsWith('rebel-'));if(!state||typeof state!=='object'||Array.isArray(state))return false;return Object.entries(state).every(([id,v])=>ids.includes(id as RealmId)&&v&&(!initialPoliticalRealm(id as RealmId)||v.origin===initialPoliticalRealm(id as RealmId)!.template&&v.created===0&&v.predecessor===null)&&['liang','east','west'].includes(v.origin)&&!!siteById[v.capital]&&Number.isSafeInteger(v.created)&&v.created>=0&&v.created<=w.day&&(v.predecessor===null||ids.includes(v.predecessor)&&v.predecessor!==id)&&(v.civilWar===undefined||id==='rebel-'+v.civilWar&&Number.isSafeInteger(v.civilWar)&&v.civilWar>0&&(w.realm?.annexed?.[id as RealmId]||activeWars(w).some(q=>q.id===v.civilWar&&q.attacker===id&&q.defender===v.predecessor&&q.civil))))&&ids.filter(id=>id.startsWith('realm-')||id.startsWith('rebel-')).every(id=>!!state[id]&&(!!initialPoliticalRealm(id)||state[id]!.predecessor!==null));}
