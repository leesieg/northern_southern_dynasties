import {civilPoliticsReason as importCivilReason,ensureCivilMobilization,advanceCivilMobilization,civilCandidates,civilPoliticalEvaluation,actCivilPolitics,type CivilPoliticsCommand,type CivilMobilization,validCivilMobilization} from './civilMobilization';
import {civilResponseAssets} from './civilTransfers';
import {settleCivilPromises} from './civilPromises';
import {syncRulerHistory} from './rulerHistory';
import {finishCampaign} from './militaryCampaigns';
import {civilOrigin,independentCivil,establishCivilPolity,reuniteCivilPolity,closeCivilOccupations,inheritCivilFronts} from './civilPolities';
import {historicalOwnsDecision} from './historicalEventState';
import {settleCaptureLoss,type CaptureCause} from './warOccupation';
import {getPerson,allPeople} from './personRegistry';
import {validArrangement} from './powerPoliticsSave';
import {settleGrievance} from './unrest';
import {applyPowerArrangement,type PowerArrangement} from './powerPolitics';
import {detained} from './custodyState';
import {regimentFollows,splitRevoltArmies} from './regimentAllegiance';
import {armyCommander} from './mobility';
import {personInfluence,awardInfluence} from './personalInfluence';
import {economyHost} from './personalEconomyAdapter';
import {personResidence} from './residence';
import {syncCourt} from './court';
import {syncDiplomacy} from './diplomacy';
import {syncRelationships} from './relationships';
import type {World} from './types';
import type {Army,RealmId} from './realm';
import {capital,playerRealm,syncGovernance} from './realm';
import {activeWars,ensureWars,warRealmSide,type War} from './wars';
import {governmentOf,governingAuthority,governingExecutives} from './government';
import {isAlive,ageAt} from './lifeState';
import {relationOpinion} from './relationships';
import {allegianceRealm} from './officeEligibility';
import {localBalance,fiscalPath,ensureFiscal,fiscalRecord} from './treasury';
import {validDynastyName} from './courtSave';
import {dynastyNameOptions} from './dynastyNaming';
import {worldRealms} from './polityRuntime';

import {siteById} from '../data/scenario';
export interface CivilWar {mobilization?:CivilMobilization;grievance?:number;responses?:Record<string,{choice:'troops'|'supply'|'wait';day:number}>;partitionOffer?:{from:string;name:string;created:number;until:number};arrangement?:PowerArrangement;claimant:string;loyalist:string|null;supporters:string[];base:string;cities:string[];armies:number[];name:string}
export type CivilCommand=CivilPoliticsCommand|{type:'civilWar';action:'rise';name:string;arrangement?:PowerArrangement}|{type:'civilWar';action:'respond';war:number;choice:'troops'|'supply'|'wait';army?:number};
export function civilWar(w:World,r:RealmId){return activeWars(w).find(v=>v.civil&&(v.attacker===r||v.defender===r));}
export function warArmySide(_w:World,war:War,a:Army):'attack'|'defend'|null{return war.civil&&!independentCivil(war)?a.realm!==war.attacker?war.allies?.[a.realm]??null:war.civil.armies.includes(a.id!)?'attack':'defend':warRealmSide(war,a.realm);}
export function warCitySide(w:World,war:War,site:string){if(!Object.hasOwn(w.realm?.cities??{},site))return null;const city=w.realm!.cities[site];return war.civil&&!independentCivil(war)?city.controller!==war.attacker?city.controller==='frontier'?null:war.allies?.[city.controller]??null:war.civil.cities.includes(site)?'attack':'defend':city.controller==='frontier'?null:warRealmSide(war,city.controller);}
export function armyControls(w:World,a:Army,site:string){if(w.realm!.cities[site].controller!==a.realm)return false;const war=civilWar(w,a.realm);return !war||warArmySide(w,war,a)===warCitySide(w,war,site);}
export function playerCommandsArmy(w:World,a:Army){const war=civilWar(w,a.realm);return a.realm===playerRealm(w)&&(!war||independentCivil(war)||warArmySide(w,war,a)===(war.civil!.supporters.includes(w.characterId!)?'attack':'defend'));}
export function armiesHostile(w:World,a:Army,b:Army){return activeWars(w).some(v=>{const x=warArmySide(w,v,a),y=warArmySide(w,v,b);return x&&y&&x!==y;});}
export function revoltSupport(w:World,claimant=w.characterId!,arrangement?:PowerArrangement){
 const r=allegianceRealm(w,claimant)!,chief=governingAuthority(w,r),g=governmentOf(w,r)!,supporters=[claimant,...civilCandidates(w,r,claimant).filter(id=>id!==claimant&&id!==chief&&id!==g.ruler&&id!==w.characterId&&isAlive(w,id)&&!detained(w,id)&&(ageAt(w,id)??0)>=16&&civilPoliticalEvaluation(w,r,claimant,chief,id,undefined,arrangement).choice==='rebel')];
 const assets=civilResponseAssets(w,r,supporters,undefined,personResidence(w,claimant).site),armies=assets.armies.filter(id=>assets.cities.includes(w.realm!.armies.find(a=>a.id===id)!.location));
 return {supporters,cities:assets.cities,armies};
}
export function civilReason(w:World,c:CivilCommand,actor=w.characterId!){if(c.action==='respond')return civilResponseReason(w,c,actor);if(c.action!=='rise')return importCivilReason(w,c,actor);if(c.arrangement&&(!validArrangement(c.arrangement,w)||c.arrangement.sponsor!==actor||detained(w,c.arrangement.executive)||(ageAt(w,c.arrangement.executive)??0)<16||c.arrangement.goal!=='executive'&&detained(w,c.arrangement.beneficiary)||![c.arrangement.beneficiary,c.arrangement.executive].every(id=>isAlive(w,id)&&allegianceRealm(w,id)===allegianceRealm(w,actor))))return '政治目标参与人已失效';if(!w.realm||!w.characterId||w.mode!=='sandbox')return '仅历史沙盒可用';const r=allegianceRealm(w,actor)!,g=governmentOf(w,r)!,support=revoltSupport(w,actor,c.arrangement),at=personResidence(w,actor),site=at.site;
 return !isAlive(w,actor)||detained(w,actor)||(ageAt(w,actor)??0)<16?'须由成年在世人物举兵':localBalance(w,site)>999900?'起兵公库无法接收捐资':(!c.arrangement||c.arrangement.goal==='dynasty')&&(c.name.trim().length<1||c.name.trim().length>6||!validDynastyName(c.name.trim()))?'国号须为有效的一至六字名称':! getPerson(w,actor)!?'此人不能成为拥立对象':governingExecutives(w,r).includes(actor)?'你已执掌朝廷，无须起兵夺权':civilWar(w,r)?'本国已有内战':w.realm.annexed?.[r]?'原政权已终止':at.traveling||!support.cities.includes(site)?'须在自己或支持者实控县域举兵':support.armies.length===0||w.realm.armies.filter(a=>support.armies.includes(a.id!)).reduce((n,a)=>n+(a.regiments?.filter(u=>regimentFollows(u,a,support.supporters,support.cities.includes(a.location)&&(a.payer??'').startsWith(r+'|'))).reduce((m,u)=>m+u.troops,0)??a.troops),0)<300?'须有驻于支持地区的地方军至少 300 人':localBalance(w,site)<100||w.realm.cities[site].grain<60?'起兵基地须有地方公款 100、公粮 60':(economyHost(w).personal(actor)?.read()??0)<100?'须以私财 100 钱充实起兵军府':personInfluence(w,actor)<60?'需影响力 60':(!c.arrangement||c.arrangement.goal==='dynasty')&&w.realm.governments!.regimes.filter(v=>v.realm===r).length>=12?'本局国统记录已满':!isAlive(w,g.ruler)?'须先处理继承':'';
}
export function actCivilWar(w:World,c:CivilCommand,actor=w.characterId!){if(c.action==='respond'){respondCivil(w,c,actor);return;}if(c.action!=='rise'){actCivilPolitics(w,c,actor);return;}const why=civilReason(w,c,actor);if(why)throw new Error(why);const s=w.realm!,r=allegianceRealm(w,actor)!,support=revoltSupport(w,actor,c.arrangement),base=personResidence(w,actor).site;ensureWars(w);const source=fiscalPath(w,base)[0],f=ensureFiscal(w)!;const wallet=economyHost(w).personal(actor)!;wallet.write(wallet.read()-100);f.balances[source]=(f.balances[source]??0)+100;awardInfluence(w,actor,-60);fiscalRecord(w,r,'person:'+actor,source,100,'举兵军府私财捐输');
 support.armies=splitRevoltArmies(w,support.supporters,support.cities,support.armies);
 const war:War={id:s.nextWarId!++,attacker:r,defender:r,target:capital(r,w),started:w.day,score:0,battles:0,captureLosses:[],goal:'territory',civil:{...(c.arrangement?{arrangement:c.arrangement}:{}),claimant:actor,loyalist:governingAuthority(w,r),...support,base,name:c.name.trim()||'讨奸'}};s.wars!.push(war);s.war=s.wars![0];
 for(const a of s.armies.filter(a=>support.armies.includes(a.id!)&&!a.owner))a.payer=source;
 if(actor===w.characterId)s.mandate=true;governmentOf(w,r)!.support=Math.max(0,governmentOf(w,r)!.support-20);establishCivilPolity(w,war,true);ensureCivilMobilization(w,war);w.chronicle.push({day:w.day,person:'player',text:'起兵方设立独立军府，响应地区的钱粮与军队由其统筹；法理归属待和约裁定。'});w.chronicle=w.chronicle.slice(-100);
}
export function civilPeaceReason(w:World,war:War,terms:string){if(!['white','demand','yield'].includes(terms))return '无效内战和约';const c=war.civil!,rebel=c.claimant===w.characterId,leader=rebel?c.claimant:c.loyalist;
 if(leader!==w.characterId)return '须由起兵领袖或朝廷执政者议定内战和约';
 if(terms==='white')return w.day-war.started<90||Math.abs(war.score)>30?'需交战至少九十日，且双方军事压力接近，才能议定赦免停战':'';
 const rebelWins=terms==='yield'?!rebel:rebel,winning=rebelWins?'attack':'defend';
 if(terms==='yield')return '';
 const losingArmy=w.realm!.armies.some(a=>warArmySide(w,war,a)===(winning==='attack'?'defend':'attack')&&a.troops>=100&&a.morale>20),seat=rebelWins?war.target:c.base;
 return warCitySide(w,war,seat)!==winning?'须实际控制对方权力中心':losingArmy?'对方仍有有效抵抗部队':'';
}
export function settleCivilWar(w:World,war:War,terms:string,forced?:'rebel'|'loyal'){if(!activeWars(w).includes(war))return;const c=war.civil!,r=civilOrigin(war),s=w.realm!,rebelsWin=forced?forced==='rebel':terms!=='white'&&(terms==='yield'?w.characterId!==c.claimant:w.characterId===c.claimant),g=governmentOf(w,r)!;
 if(independentCivil(war))c.supporters=allPeople(w).filter(p=>allegianceRealm(w,p.id)===war.attacker).map(p=>p.id);
 for(const q of w.militaryCampaigns?.items??[])if(q.status==='active'&&q.war===war.id)finishCampaign(w,q,'failed','内战结束，战役委任结案并退回未用专款');
 settleCivilPromises(w,war,terms==='white'?null:rebelsWin?war.attacker:war.defender);
 reuniteCivilPolity(w,war);
 if(c.grievance!==undefined)settleGrievance(w,c.grievance,rebelsWin,terms==='white');
 else if(rebelsWin)applyPowerArrangement(w,r,c.arrangement??{goal:'dynasty',sponsor:c.claimant,beneficiary:c.claimant,executive:c.claimant,name:c.name},c.supporters.includes(g.ruler)?[]:[g.ruler]);
 if(terms!=='white'&&(c.grievance===undefined||!rebelsWin)){for(const city of Object.values(s.cities))if(city.owner===r&&city.governor&&(c.supporters.includes(city.governor)!==rebelsWin))city.governor=null;for(const [key,seat] of Object.entries(s.local?.seats??{}))if(key.startsWith(r+'|')&&seat.holder&&c.supporters.includes(seat.holder)!==rebelsWin){seat.holder=null;seat.delegated=false;}}
 for(const a of s.armies)if(a.realm===r){if(!activeWars(w).some(v=>v!==war&&!!warArmySide(w,v,a))&&a.journey)a.withdrawalUntil=w.day+a.journey.durations.slice(a.journey.leg).reduce((n,d)=>n+d,0)-a.journey.elapsed+1;if(!activeWars(w).some(v=>v!==war&&!!warArmySide(w,v,a)))a.siege=0;if(!a.owner)a.payer='central:'+r;}
 if(w.politics?.proposals[r]&&w.politics.proposals[r]!.sponsor===c.claimant&&!rebelsWin){delete w.politics.proposals[r];w.politics.cooldowns[r]=w.day+180;}s.wars=s.wars!.filter(v=>v!==war);s.war=s.wars[0]??null;s.sieges=s.sieges?.filter(q=>q.war!==war.id);closeCivilOccupations(w,war);if(playerRealm(w)===r)s.mandate=governingExecutives(w,r).includes(w.characterId!);syncGovernance(w);syncRelationships(w);syncCourt(w,r);syncDiplomacy(w);
 w.chronicle.push({day:w.day,person:'player',text:c.grievance!==undefined?'诉求型民变结束，恢复输税；君位与国号沿原国统，存活兵员与欠饷保留。':terms==='white'?'内战议定赦免停战，恢复输税，保留实际损失。':rebelsWin?'起兵方取得朝廷，重建公职与统属；军饷欠款继续偿还。':'朝廷平定内战，撤免起兵方公职；人物保留私产继续生涯。'});w.chronicle=w.chronicle.slice(-100);
}
export function validCivil(w:World,war:War){const c=war.civil;if(!validCivilMobilization(w,war))return false;if(!c)return war.attacker!==war.defender;if(c.grievance!==undefined&&(!Number.isSafeInteger(c.grievance)||c.arrangement||c.partitionOffer||!w.unrest?.items.some(q=>q.id===c.grievance&&q.war===war.id&&q.stage==='armed'&&q.realm===civilOrigin(war)&&q.site===c.base&&q.organizer===c.claimant)))return false;return (!c.arrangement||validArrangement(c.arrangement,w)&&c.arrangement.sponsor===c.claimant)&&(!c.partitionOffer||c.partitionOffer.from===c.claimant&&validDynastyName(c.partitionOffer.name)&&Number.isSafeInteger(c.partitionOffer.created)&&c.partitionOffer.created<=w.day&&c.partitionOffer.until===c.partitionOffer.created+15)&&(!c.responses||typeof c.responses==='object'&&!Array.isArray(c.responses)&&Object.entries(c.responses).every(([id,v])=>!! getPerson(w,id)!&&v&&['troops','supply','wait'].includes(v.choice)&&Number.isSafeInteger(v.day)&&v.day>=0&&v.day<=w.day))&&(war.attacker===war.defender||w.realm?.identities?.[war.attacker]?.civilWar===war.id&&w.realm?.identities?.[war.attacker]!.predecessor===war.defender)&&!! getPerson(w,c.claimant)!&&(c.loyalist===null||typeof c.loyalist==='string'&&!!getPerson(w,c.loyalist))&&c.claimant!==c.loyalist&&validDynastyName(c.name)&&!!siteById[c.base]&&Array.isArray(c.supporters)&&new Set(c.supporters).size===c.supporters.length&&c.supporters.includes(c.claimant)&&c.supporters.every(id=>!! getPerson(w,id)!)&&Array.isArray(c.cities)&&new Set(c.cities).size===c.cities.length&&c.cities.every(id=>!!siteById[id])&&Array.isArray(c.armies)&&new Set(c.armies).size===c.armies.length&&c.armies.every(id=>Number.isSafeInteger(id)&&id>0&&id<(w.realm?.nextArmyId??0));}

export function civilCanAdmin(w:World,actor:string,site:string){if(!Object.hasOwn(w.realm?.cities??{},site))return false;const r=allegianceRealm(w,actor);if(!r)return true;const war=civilWar(w,r);return !war|| (independentCivil(war)?warCitySide(w,war,site)!==(r===war.attacker?'defend':'attack'):war.civil!.supporters.includes(actor)===war.civil!.cities.includes(site));}

export function advanceCivilPolitics(w:World){if(!w.realm)return;advanceCivilMobilization(w);
 for(const war of [...activeWars(w)])if(war.civil){establishCivilPolity(w,war);inheritCivilFronts(w,war);const c=war.civil,origin=civilOrigin(war);c.cities=Object.keys(w.realm.cities).filter(id=>w.realm!.cities[id].controller===war.attacker);c.armies=w.realm.armies.filter(a=>a.realm===war.attacker).map(a=>a.id!);
 if(!isAlive(w,c.claimant)||detained(w,c.claimant)||allegianceRealm(w,c.claimant)!==war.attacker){settleCivilWar(w,war,'demand','loyal');continue;}
 if(c.arrangement&&(!isAlive(w,c.arrangement.executive)||allegianceRealm(w,c.arrangement.executive)!==war.attacker||c.arrangement.goal!=='executive'&&(!isAlive(w,c.arrangement.beneficiary)||![origin,war.attacker].includes(allegianceRealm(w,c.arrangement.beneficiary)!)))){c.arrangement={goal:'executive',sponsor:c.claimant,beneficiary:governmentOf(w,origin)!.ruler,executive:c.claimant,name:''};delete w.politics?.proposals[origin];w.chronicle.push({day:w.day,person:'player',text:'原定拥立对象或执政者已失效，起兵方改为争夺实际执政权，君位沿当前继承继续。'});w.chronicle=w.chronicle.slice(-100);}
 const g=governmentOf(w,origin)!,leaders=[...g.executives,...Object.entries(w.realm.cities).filter(([site,city])=>city.owner===origin&&city.controller===origin&&!c.cities.includes(site)).map(([,city])=>city.governor),...w.realm.armies.filter(a=>a.realm===origin&&warArmySide(w,war,a)==='defend').map(a=>armyCommander(w,a))].filter((id):id is string=>!!id&&isAlive(w,id)&&!detained(w,id)&&allegianceRealm(w,id)===origin&&!c.supporters.includes(id));const chief=leaders.find(id=>g.executives.includes(id))??(c.loyalist&&leaders.includes(c.loyalist)?c.loyalist:leaders.sort((a,b)=>(g.merit[b]??0)-(g.merit[a]??0))[0]);c.loyalist=chief??null;
 const rebels=w.realm.armies.some(a=>warArmySide(w,war,a)==='attack'&&a.troops>=100&&a.morale>20);
 const loyal=w.realm.armies.some(a=>warArmySide(w,war,a)==='defend'&&a.troops>=100&&a.morale>20);
 if(!rebels&&(c.grievance!==undefined||!c.cities.length))settleCivilWar(w,war,'demand','loyal');
 else if(!loyal&&warCitySide(w,war,war.target)==='attack'&&c.claimant!==w.characterId)settleCivilWar(w,war,'demand','rebel');
 }
 if(w.day%90)return;
 for(const r of worldRealms(w)){const g=governmentOf(w,r);if(!g||w.realm.annexed?.[r]||g.support>=25||g.legitimacy>=35||civilWar(w,r))continue;
 const chief=governingAuthority(w,r),candidates=[...new Set(Object.values(w.realm.cities).filter(c=>c.owner===r).map(c=>c.governor))].filter((id):id is string=>!!id&&id!==w.characterId&&!historicalOwnsDecision(w,id)&&!! getPerson(w,id)!&&isAlive(w,id)&&relationOpinion(w,id,chief)<=-30);
 for(const id of candidates){const name=dynastyNameOptions(w,r,id)[0]?.name;if(!name)continue;const command:CivilCommand={type:'civilWar',action:'rise',name};if(!civilReason(w,command,id)){actCivilWar(w,command,id);break;}}
 }
}

export function actorCommandsSide(w:World,actor:string,a:Army){const r=allegianceRealm(w,actor);if(a.realm!==r)return false;const war=civilWar(w,a.realm);return !war||independentCivil(war)||war.civil!.supporters.includes(actor)===war.civil!.armies.includes(a.id!);}

export function civilCityCapture(w:World,war:War,site:string,side:'attack'|'defend',army:Army,cause:CaptureCause='battle'){const c=war.civil!;if(warCitySide(w,war,site)!==side)settleCaptureLoss(w,war,site,side,cause);if(side==='attack'){if(!c.cities.includes(site))c.cities.push(site);}else c.cities=c.cities.filter(id=>id!==site);const origin=civilOrigin(war),g=governmentOf(w,origin)!;if(independentCivil(war)){const city=w.realm!.cities[site];city.controller=side==='attack'?war.attacker:origin;delete city.occupiedFrom;city.occupiedSince=w.day;city.occupiedByWar=war.id;if(city.owner===city.controller){delete city.occupiedSince;delete city.occupiedByWar;delete city.occupiedFrom;}if(city.governor&&allegianceRealm(w,city.governor)!==city.controller)city.governor=null;}
 for(const id of [g.ruler,w.realm!.cities[site].governor,...g.executives]){if(!id||!isAlive(w,id)||detained(w,id)||!presentAt(w,id,site)||c.supporters.includes(id)===(side==='attack'))continue;detainPerson(w,id,army.realm,site,'city','civil:'+war.id+':'+site+':'+w.day,army);}
 const custody=w.custody?.records[g.ruler];if(!independentCivil(war)&&c.grievance===undefined&&custody&&custody.war===war.id&&custody.side===side&&side==='attack'&&w.relationships){w.relationships.regencies[origin]={realm:origin,regimeId:g.regimeId,basis:powerBasis(w,origin),ruler:g.ruler,controller:c.claimant,since:w.day,grip:70,origin:'custody'};}
 syncRulerHistory(w);
}
export function civilResponseReason(w:World,c:Extract<CivilCommand,{action:'respond'}>,actor=w.characterId!){const war=activeWars(w).find(v=>v.id===c.war&&v.civil),r=allegianceRealm(w,actor);if(!war||r!==war.attacker&&r!==war.defender||detained(w,actor)||!isAlive(w,actor))return '须本国内战中的自由人物';if(!['troops','supply','wait'].includes(c.choice))return '未知救援回应';if(c.choice==='wait')return '';
 const stance=war.civil!.mobilization?.members[actor]?.choice;if(stance==='pending'||stance==='watch')return '须先选择参战立场，再响应出兵或供粮';
 const a=w.realm!.armies.find(a=>a.id===c.army);if(!a||warArmySide(w,war,a)!==(war.civil!.supporters.includes(actor)?'attack':'defend'))return '须选择本方实际军队';if(!authorityGrant(w,actor,'command',{realm:r!,army:a}).allowed)return '没有这支军队的实际指挥权';if(c.choice==='troops')return a.location===(war.civil!.supporters.includes(actor)?war.target:war.civil!.base)?'军队已在该战场':a.journey?'军队仍在行军':!planRoute(a.location,war.civil!.supporters.includes(actor)?war.target:war.civil!.base,id=>canMarchThrough(w,r!,id,war.civil!.supporters.includes(actor)?war.target:war.civil!.base,a))?'救援道路不通':'';
 const at=personResidence(w,actor).site;return a.journey||a.location!==at?'须在军队实际驻地供粮':!civilCanAdmin(w,actor,at)||w.realm!.cities[at].governor!==actor&&!governingExecutives(w,r!).includes(actor)?'没有驻地公粮处分权':w.realm!.cities[at].grain<40?'驻地公粮不足 40':a.supply+40>armySupplyCapacity(a)?'军粮仓容不足':'';
}
function respondCivil(w:World,c:Extract<CivilCommand,{action:'respond'}>,actor:string){const reason=civilResponseReason(w,c,actor);if(reason)throw new Error(reason);const war=activeWars(w).find(v=>v.id===c.war)!,civil=war.civil!;(civil.responses??={})[actor]={choice:c.choice,day:w.day};if(c.choice==='wait')return;const a=w.realm!.armies.find(a=>a.id===c.army)!;if(c.choice==='supply'){w.realm!.cities[a.location].grain-=40;a.supply+=40;}else {const target=civil.supporters.includes(actor)?war.target:civil.base,route=planRoute(a.location,target,id=>canMarchThrough(w,a.realm,id,target,a))!;a.journey={route:route.route,durations:route.durations,leg:0,elapsed:0,started:w.day};}}
import {presentAt} from './residence';
import {detainPerson} from './custody';
import {powerBasis} from './relationships';
import {authorityGrant} from './authority';
import {armySupplyCapacity} from './armyLogistics';
import {planRoute} from './world';
import {canMarchThrough} from './realm';

export function civilControlledCities(w:World,war:War){return Object.keys(w.realm!.cities).filter(id=>warCitySide(w,war,id)==='attack'&&w.realm!.cities[id].controller===war.attacker);}
