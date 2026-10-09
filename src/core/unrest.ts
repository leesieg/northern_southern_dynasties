import {recruitmentSources,consumeManpower,recruitmentRegiments} from './manpower';
import {allPeople,getPerson} from './personRegistry';
import type {World} from './types';
import type {RealmId} from './realm';
import {isRealmId} from './polityRuntime';
import {capital} from './realm';
import {civilWar,settleCivilWar} from './civilWars';
import {ensureWars} from './wars';
import {governanceRules} from './governanceRules';
import {governingAuthority,governingExecutives} from './government';
import {allegianceRealm} from './officeEligibility';
import {personResidence} from './residence';
import {isAlive,ageAt} from './lifeState';
import {detained} from './custodyState';
import {armyCommander} from './mobility';
import {ensureArmyOrganization} from './armyOrganization';
import {civilianFood} from './population';
import {mobilizedTransportLabor} from './armyLogistics';
import {localBalance,fiscalPath,spendLocal} from './treasury';

import {siteById} from '../data/scenario';
import {canCommission} from './serviceMandates';
import {organizedCommander} from './culture';
export type LocalDemand='food'|'tax'|'customs';
export const demandNames:Record<LocalDemand,string>={food:'兑现赈粮',tax:'减轻赋税',customs:'恢复军镇待遇'};
export interface LocalUnrest {id:number;realm:RealmId;site:string;demand:LocalDemand;source:string;organizer:string|null;started:number;distressedDays:number;stage:'growing'|'warning'|'armed'|'closed';deadline:number|null;war:number|null;closed:number|null;outcome:string;reported?:number}
export interface UnrestState {since:number;lastDay:number;nextId:number;items:LocalUnrest[]}
export type UnrestCommand={type:'unrest';action:'report'|'accommodate';id:number};
const log=(w:World,text:string)=>{w.chronicle.push({day:w.day,person:'player',text});w.chronicle=w.chronicle.slice(-100);};
export function ensureUnrest(w:World){return w.unrest??={since:w.day,lastDay:w.day,nextId:1,items:[]};}
function close(w:World,q:LocalUnrest,outcome:string){q.stage='closed';q.closed=w.day;q.deadline=null;q.outcome=outcome;log(w,siteById[q.site].name+' · '+outcome);}
function add(w:World,r:RealmId,site:string,demand:LocalDemand,source:string,organizer:string|null){const s=ensureUnrest(w),old=s.items.find(q=>q.site===site&&q.stage!=='closed');if(old)return old;
 s.items=s.items.filter(q=>q.stage!=='closed'||w.day-q.closed!<180);if(s.items.length>=Object.keys(siteById).length*2)return;
 if(s.items.some(q=>q.site===site&&q.stage==='closed'&&w.day-q.closed!<30))return;
 const q:LocalUnrest={id:s.nextId++,realm:r,site,demand,source,organizer,started:w.day,distressedDays:0,stage:'growing',deadline:null,war:null,closed:null,outcome:''};s.items.push(q);return q;
}
/** A specific loss of existing organizational treatment, once per completed policy revision. */
export function recordCulturalChange(w:World,r:RealmId,previous:string){
 if(governanceRules(w,r).cultural==='customs')return;
 for(const [site,c] of Object.entries(w.realm!.cities))if(c.owner===r&&c.controller===r&&(previous==='customs'||c.culturalExemption)){delete c.culturalExemption;const a=w.realm!.armies.find(a=>a.realm===r&&a.location===site&&!a.journey&&armyCommander(w,a)&&armyCommander(w,a)!==w.characterId&&isAlive(w,armyCommander(w,a)!)&&!governingExecutives(w,r).includes(armyCommander(w,a)!)&&organizedCommander(w,r,armyCommander(w,a)!));if(a){add(w,r,site,'customs','policy:'+r+':'+governanceRules(w,r).revision,armyCommander(w,a)!);}}
}
export function demandSatisfied(w:World,q:LocalUnrest){const c=w.realm!.cities[q.site];return q.demand==='food'?c.grain>=Math.max(50,civilianFood(w,q.site)):q.demand==='tax'?c.tax==='light':governanceRules(w,q.realm).cultural==='customs';}
function organizer(w:World,q:LocalUnrest){return allPeople(w).find(p=>p.id!==w.characterId&&!governingExecutives(w,q.realm).includes(p.id)&&allegianceRealm(w,p.id)===q.realm&&isAlive(w,p.id)&&!detained(w,p.id)&&(ageAt(w,p.id)??0)>=16&&!personResidence(w,p.id).traveling&&personResidence(w,p.id).site===q.site)?.id??null;}
export function unrestBlock(w:World,q:LocalUnrest){const c=w.realm!.cities[q.site],chief=governingAuthority(w,q.realm);
 if(civilWar(w,q.realm))return '本国已有内战，其他地方诉求暂留预警';
 if(!q.organizer||q.organizer===chief||!isAlive(w,q.organizer)||detained(w,q.organizer)||allegianceRealm(w,q.organizer)!==q.realm||personResidence(w,q.organizer).traveling||personResidence(w,q.organizer).site!==q.site)return '缺少在地组织者';
 if(w.realm!.armies.some(a=>a.realm===q.realm&&a.location===q.site&&!a.journey&&armyCommander(w,a)!==q.organizer))return '当地守军仍控制治所，诉求保留预警';
 if(w.militaryCampaigns?.items.some(t=>t.status==='active'&&w.realm!.armies.some(a=>a.id===t.army&&armyCommander(w,a)===q.organizer)))return '组织者的部队仍承担战役委任';
 if(w.realm!.armies.length>=48||w.realm!.armies.filter(a=>a.realm===q.realm).length>=16)return '军队编制已满';
 if(fiscalPath(w,q.site)[0].startsWith('central:'))return '当地缺少可独立控制的公库，诉求保留预警';
 if(recruitmentSources(w,q.site,200).reason)return recruitmentSources(w,q.site,200).reason;
 if(c.population-mobilizedTransportLabor(w,q.site)<300||localBalance(w,q.site)<50)return '地方人口或兵装经费不足以组织起事';
 return '';
}
function rise(w:World,q:LocalUnrest){if(unrestBlock(w,q))return;ensureWars(w);ensureArmyOrganization(w);const s=w.realm!,c=s.cities[q.site],supply=Math.min(40,c.grain),id=s.nextArmyId!++;
 // The undefended seat is actually seized. Only then may its stores pay for arms/supply.
 const following=s.armies.filter(a=>a.realm===q.realm&&a.location===q.site&&!a.journey&&armyCommander(w,a)===q.organizer).map(a=>a.id!);
 const war={id:s.nextWarId!++,attacker:q.realm,defender:q.realm,target:capital(q.realm,w),started:w.day,score:0,battles:0,captureLosses:[],civil:{grievance:q.id,claimant:q.organizer!,loyalist:governingAuthority(w,q.realm),supporters:[q.organizer!],base:q.site,cities:[q.site],armies:[...following,id],name:'民变'}};
 for(const a of s.armies)if(following.includes(a.id!)&&!a.owner)a.payer=fiscalPath(w,q.site)[0];
 s.wars!.push(war);s.war=s.wars![0];spendLocal(w,q.site,50,'民变控制治所后置办兵装');const sources=recruitmentSources(w,q.site,200);consumeManpower(w,q.site,sources.parts);c.grain-=supply;
 s.armies.push({id,realm:q.realm,location:q.site,payer:fiscalPath(w,q.site)[0],troops:200,morale:50,supply,journey:null,siege:0,regiments:recruitmentRegiments(sources.parts,id,q.site,'spear').map(u=>({...u,institution:20,commanderLoyalty:70,loyalTo:q.organizer!,cohesion:40}))});
 // A commander remains bound to the existing army; the new levy needs its own appointment.
 if(w.mobility&&!following.length)(w.mobility.armyCommanders??={})[id]=q.organizer!;
 q.stage='armed';q.war=war.id;q.deadline=null;log(w,siteById[q.site].name+'民变起事：'+demandNames[q.demand]+'；动员本地 200 人、支出已控制公款 50，取当地公粮 '+supply+'。');
}
export function unrestReason(w:World,c:UnrestCommand,actor=w.characterId!){const q=w.unrest?.items.find(q=>q.id===c.id);if(!q||!['warning','armed'].includes(q.stage))return '该诉求当前无需裁决';if(!['report','accommodate'].includes(c.action))return '未知诉求处理';
 if(w.realm!.cities[q.site].owner!==q.realm||w.realm!.cities[q.site].controller!==q.realm)return '原诉求治所已易手';
 if(!isAlive(w,actor)||detained(w,actor)||allegianceRealm(w,actor)!==q.realm)return '须本国在世且自由的人物';
 if(c.action==='report')return !canCommission(w,actor,q.realm,q.site,'inspection')?'须实际地方或中央公务权限':q.reported!==undefined?'已向实际执政者上报':'';
 if(!governingExecutives(w,q.realm).includes(actor))return '文化待遇让步须由实际执政者裁决';
 if(!q.organizer||!isAlive(w,q.organizer)||allegianceRealm(w,q.organizer)!==q.realm)return '原诉求组织者已失效';
 if(q.demand==='customs'&&!organizedCommander(w,q.realm,q.organizer))return '原军镇组织已解散';
 return q.demand!=='customs'?'经济诉求须通过当地减税或实际运粮解决':governanceRules(w,q.realm).cultural==='customs'?'现行规则已保留待遇':'';
}
export function actUnrest(w:World,c:UnrestCommand,actor=w.characterId!){const why=unrestReason(w,c,actor);if(why)throw new Error(why);const q=w.unrest!.items.find(q=>q.id===c.id)!;
 if(c.action==='report'){q.reported=w.day;log(w,siteById[q.site].name+'诉求已上报'+ getPerson(w,governingAuthority(w,q.realm))?.name+'，等待实际处置。');return;}
 // A local exception preserves organization; it does not grant cash or rewrite the whole policy.
 if(q.stage==='armed'){const war=civilWar(w,q.realm);if(war?.civil?.grievance===q.id)settleCivilWar(w,war,'yield','rebel');}
 else {w.realm!.cities[q.site].culturalExemption={leader:q.organizer!,since:w.day};close(w,q,'中央恢复当地军镇待遇，文化诉求和解');}
}
export function settleGrievance(w:World,id:number,rebelWins:boolean,white:boolean){const q=w.unrest?.items.find(q=>q.id===id);if(!q)return;
 if(rebelWins&&q.demand==='tax')w.realm!.cities[q.site].tax='light';
 if(rebelWins&&q.demand==='customs')w.realm!.cities[q.site].culturalExemption={leader:q.organizer!,since:w.day};
 if(rebelWins&&q.demand==='food'&&!demandSatisfied(w,q)){w.realm!.cities[q.site].tax='light';q.stage='warning';q.deadline=w.day+30;q.war=null;log(w,siteById[q.site].name+'停止重税并赦免；赈粮尚未兑现，仍留三十日履约，国统不变。');return;}
 close(w,q,white?'双方赦免停战；原有钱粮损失与经济困境保留':rebelWins?q.demand==='customs'?'保留当地军镇组织待遇；君位不变':q.demand==='tax'?'依约减为轻税；君位不变':'依约停止重税；赈粮仍须实际抵达，君位不变':'组织力量被平定；缺粮、税负及实际损失保留');
}
export function advanceUnrest(w:World){if(!w.realm||w.mode!=='sandbox')return;const s=ensureUnrest(w);if(s.lastDay>=w.day)return;s.lastDay=w.day;
 for(const c of Object.values(w.realm.cities))if(c.culturalExemption&&(!isAlive(w,c.culturalExemption.leader)||allegianceRealm(w,c.culturalExemption.leader)!==c.owner||!organizedCommander(w,c.owner,c.culturalExemption.leader)))delete c.culturalExemption;
 for(const [site,c] of Object.entries(w.realm.cities))if(c.owner!=='frontier'&&c.owner===c.controller&&!w.realm.annexed?.[c.owner]&&c.order<=35){const demand=c.tax==='heavy'?'tax':c.grain<Math.max(50,civilianFood(w,site))?'food':null;if(demand)add(w,c.owner,site,demand,'conditions:'+site+':'+w.day,null);}
 for(const q of s.items){if(q.stage==='closed')continue;const c=w.realm.cities[q.site];
  if(c.owner!==q.realm||c.controller!==q.realm||w.realm.annexed?.[q.realm]){if(q.stage==='armed'){const war=civilWar(w,q.realm);if(war?.civil?.grievance===q.id)settleCivilWar(w,war,'white','loyal');}else close(w,q,'地方易手，原朝廷诉求终止，实际困境保留');continue;}
  if(q.stage==='armed'){const war=civilWar(w,q.realm);if(!war||war.id!==q.war)close(w,q,'战事终止，地方仍按实际钱粮与政策结算');else if(demandSatisfied(w,q))settleCivilWar(w,war,'yield','rebel');continue;}
  if(q.demand==='customs'&&(!q.organizer||!isAlive(w,q.organizer)||allegianceRealm(w,q.organizer)!==q.realm||!organizedCommander(w,q.realm,q.organizer))){close(w,q,'原军镇组织条件已失效，待遇诉求终止');continue;}
  const solved=demandSatisfied(w,q),distress=q.demand==='customs'||c.order<=35;
  if(solved||!distress){close(w,q,solved?'诉求已由实际粮仓、税制或待遇解决':'地方秩序恢复，诉求消退');continue;}
  if(q.started<w.day)q.distressedDays=Math.min(365000,q.distressedDays+1);if(q.organizer&&!isAlive(w,q.organizer)||q.organizer&&allegianceRealm(w,q.organizer)!==q.realm)q.organizer=null;q.organizer??=organizer(w,q);
  if(q.stage==='growing'&&q.distressedDays>=30){q.stage='warning';q.deadline=w.day+30;log(w,siteById[q.site].name+'提出诉求：'+demandNames[q.demand]+'，留三十日处理，未解决且有组织能力才可能起事。');}
  if(q.stage==='warning'&&q.deadline!<=w.day&&!solved)rise(w,q);
 }
}
export function validUnrest(w:World){const s=w.unrest;if(s===undefined)return true;const n=(v:unknown,min:number,max:number)=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
 if(!s||!n(s.since,0,w.day)||!n(s.lastDay,s.since,w.day)||!n(s.nextId,1,1000000000)||!Array.isArray(s.items)||s.items.length>Object.keys(siteById).length*2)return false;
 const ids=new Set<number>(),active=new Set<string>();return s.items.every(q=>{if(!q||!n(q.id,1,s.nextId-1)||ids.has(q.id)||!isRealmId(q.realm)||!w.realm?.governments?.realms[q.realm]||typeof q.site!=='string'||!Object.hasOwn(siteById,q.site)||!Object.hasOwn(demandNames,q.demand)||!['growing','warning','armed','closed'].includes(q.stage)||typeof q.source!=='string'||!q.source.length||q.source.length>160||q.organizer!==null&&(typeof q.organizer!=='string'||!getPerson(w,q.organizer))||!n(q.started,s.since,w.day)||!n(q.distressedDays,0,w.day-q.started)||typeof q.outcome!=='string'||q.outcome.length>200||q.reported!==undefined&&!n(q.reported,q.started,w.day))return false;ids.add(q.id);
 if(q.stage!=='closed'){if(active.has(q.site))return false;active.add(q.site);if(q.closed!==null||q.outcome)return false;}else if(!n(q.closed,q.started,w.day)||!q.outcome)return false;
 if(q.stage==='growing'&&q.distressedDays>=30||['warning','armed'].includes(q.stage)&&q.distressedDays<30)return false;
 if(q.stage==='warning'?!n(q.deadline,q.started+60,w.day+30):q.deadline!==null)return false;
 if(q.stage==='armed'){const war=w.realm!.wars?.find(v=>v.id===q.war);return q.distressedDays>=60&&!!q.organizer&&!!war&&war.civil?.grievance===q.id&&war.attacker===q.realm&&war.civil.base===q.site&&war.civil.claimant===q.organizer;}
 return q.war===null||q.stage==='closed'&&n(q.war,1,(w.realm!.nextWarId??1)-1);
 });
}
