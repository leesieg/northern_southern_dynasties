import {transferAccount} from './obligations';
import type {World} from './types';
import {armyDailyFood,armyMonthlyPay,realmForecast,type RealmId,type Army} from './realm';
import {planRoute} from './world';
import {readyTroops} from './armyOrganization';
import type {Defection,DefectionCommand} from './defections';
import {activeWars,warRealmSide,ensureWars} from './wars';
import {governingAuthority,governingExecutives,governmentOf,regimeName} from './government';
import {allegianceRealm} from './officeEligibility';
import {worldRealms} from './polityRuntime';
import {isAlive} from './lifeState';
import {getPerson} from './personRegistry';
import {detained} from './custodyState';
import {personResidence} from './residence';
import {treaty,diplomaticWar,diplomaticKey,atWar} from './diplomacy';
import {regionalDefense,fracturedRealm,frontReservations} from './warOpportunities';
import {civilTransferPreview,joinCivilCamp} from './civilTransfers';
import {localBalance,fiscalPath,fiscalRecord} from './treasury';
import {snapshotWarValues,includeParticipantValues} from './warScoring';
import {warArmySide} from './civilWars';
import {roads,siteById} from '../data/scenario';
import {relationOpinion} from './relationships';
import {isMonthStart} from './calendar';

export const foreignAidModes={paid:'出资请援',tribute:'称藩求援',cession:'献城求保'} as const;
export type ForeignAidMode=keyof typeof foreignAidModes;
export type ForeignAidRequest={type:'defection';action:'request';site:string;target:RealmId;mode:ForeignAidMode};
const border=(w:World,site:string,r:RealmId)=>roads.some(e=>!e.legacyOnly&&(e.from===site&&w.realm!.cities[e.to].controller===r||e.to===site&&w.realm!.cities[e.from].controller===r));
const control=(w:World,id:string)=>w.realm!.cities[id].controller;
const approaching=(a:Army,site:string)=>!a.journey&&(a.location===site||roads.some(e=>!e.legacyOnly&&(e.from===site&&e.to===a.location||e.to===site&&e.from===a.location)))||a.journey?.route.at(-1)===site&&a.journey.durations.slice(a.journey.leg).reduce((n,d)=>n+d,0)-a.journey.elapsed<=30;
function aidTreatyReason(w:World,war:import('./wars').War,from:RealmId,to:RealmId){const side=warRealmSide(war,from);return worldRealms(w).some(r=>warRealmSide(war,r)&&warRealmSide(war,r)!==side&&(treaty(w,to,r,'pact')||treaty(w,to,r,'alliance')||(w.realm!.truces[diplomaticKey(to,r)]??0)>w.day))?'接纳国与对手有条约或停战，不能绕过外交约束出兵':'';}
export function foreignAidThreat(w:World,site:string){
 const from=control(w,site);if(from==='frontier')return;
 return activeWars(w).filter(war=>warRealmSide(war,from)).map(war=>({war,side:warRealmSide(war,from)!})).filter(({war,side})=>w.realm!.armies.some(a=>warRealmSide(war,a.realm)&&warRealmSide(war,a.realm)!==side&&approaching(a,site)))[0];
}
function payer(w:World,site:string,actor:string,from:RealmId){return governingExecutives(w,from).includes(actor)?w.realm!.treasuries[from].coins:localBalance(w,site);}
export function foreignAidQuote(w:World,c:ForeignAidRequest,actor=w.characterId!){
 const city=w.realm?.cities[c.site],from=city?.controller,threat=city&&foreignAidThreat(w,c.site),chief=from&&from!=='frontier'&&governingExecutives(w,from).includes(actor),at=personResidence(w,actor);
 let reason=(w.defections?.items.length??0)>=1000?'归附与求援记录容量已满':!city||!from||from==='frontier'?'须有实际地方政权':!isAlive(w,actor)||detained(w,actor)?'须由自由在世人物交涉':allegianceRealm(w,actor)!==from||!chief&&(city.governor!==actor||at.traveling||at.site!==c.site)?'须实际掌权者，或在城且有治理权的主官':!Object.hasOwn(foreignAidModes,c.mode)?'未知求援条件':!worldRealms(w).includes(c.target)||c.target===from||w.realm!.annexed?.[c.target]?'接纳国已失效':!border(w,c.site,c.target)?'接纳国须有可达的相邻边境':!threat?'当前没有需要外国援助的实际战事':warRealmSide(threat.war,c.target)?'接纳国已参与本场战事':atWar(w,from,c.target)?'须先与接纳国停止交战':w.defections?.items.some(q=>q.site===c.site&&q.status==='pending')?'此地已有待决交涉':'';
 const enemy=threat?(threat.side==='attack'?threat.war.defender:threat.war.attacker):undefined;
 const cost=c.mode==='paid'?100:0;
 if(!reason&&c.mode==='tribute'){
  let next:RealmId|undefined=c.target;const seen=new Set([from as RealmId]);while(next&&!reason){if(seen.has(next))reason='臣属关系不能形成循环';seen.add(next);next=w.diplomacy?.subjects[next];}
  if(!chief)reason='地方官不能替全国称藩，须由本政权执政者决定';
 }
 if(!reason&&c.mode==='paid'&&payer(w,c.site,actor,from as RealmId)<cost)reason='实际公库不足援费 100 钱';
 if(!reason&&threat)reason=aidTreatyReason(w,threat.war,from as RealmId,c.target);
 if(!reason&&c.mode==='cession'){
  if(governmentOf(w,from as RealmId)?.ruler===actor||chief)reason='君主或执政者不能以个人归附放弃本政权；可出资或称藩求援';
  else if(city!.owner==='frontier')reason='此地没有可交涉的法理归属';
  else {const fake={id:w.realm!.nextWarId??1,attacker:c.target,defender:city!.owner,target:c.site,started:w.day,score:0};if(!civilTransferPreview(w,fake,actor,c.target,[c.site]).cities.includes(c.site))reason='没有可和平交接的实控县域，须先处理抵抗驻军与围城';}
 }
 const transfer=city&&city.owner!=='frontier'&&worldRealms(w).includes(c.target)&&c.mode==='cession'?civilTransferPreview(w,{id:w.realm!.nextWarId??1,attacker:c.target,defender:city.owner,target:c.site,started:w.day,score:0},actor,c.target,[c.site]):null;
 return {reason,from:from as RealmId,enemy,war:threat?.war.id,cost,chief,transfer};
}
export function requestForeignAid(w:World,c:ForeignAidRequest,actor=w.characterId!){
 const q=foreignAidQuote(w,c,actor);if(q.reason)throw new Error(q.reason);
 const state=w.defections??={nextId:1,lastDay:Math.max(0,w.day-1),items:[]};
 state.items.push({id:state.nextId++,site:c.site,from:q.from,to:c.target,created:w.day,status:'pending',reason:foreignAidModes[c.mode]+'：地方受到实际军事威胁，请求外国提供保护；按当前兵地与外交条件复核',mode:c.mode,actor,war:q.war,enemy:q.enemy});
 w.chronicle.push({day:w.day,person:'player',text:siteById[c.site].name+'向'+regimeName(w,c.target)+'提出'+foreignAidModes[c.mode]+'，等待七日交涉与实际出兵条件。'});w.chronicle=w.chronicle.slice(-100);
}
function subjectCycle(w:World,from:RealmId,to:RealmId){const seen=new Set([from]);let next:RealmId|undefined=to;while(next){if(seen.has(next))return true;seen.add(next);next=w.diplomacy?.subjects[next];}return false;}
function currentAidReason(w:World,q:Defection){
 if(!q.actor||!q.mode||!q.enemy||!q.war)return '求援记录不完整';
 if(!isAlive(w,q.actor)||detained(w,q.actor)||allegianceRealm(w,q.actor)!==q.from||control(w,q.site)!==q.from||!activeWars(w).some(v=>v.id===q.war&&warRealmSide(v,q.from)))return '求援者、实控地区或原战事已变化';
 if(!governingExecutives(w,q.from).includes(q.actor)&&(w.realm!.cities[q.site].governor!==q.actor||personResidence(w,q.actor).traveling||personResidence(w,q.actor).site!==q.site))return '原主官已无在城处分权';
 if(q.mode!=='cession'&&activeWars(w).some(v=>v.id===q.war&&warRealmSide(v,q.to)))return '接纳国已参与本场战事';
 if(atWar(w,q.from,q.to))return '接纳方已与求援方交战';
 const original=activeWars(w).find(v=>v.id===q.war)!,barrier=aidTreatyReason(w,original,q.from,q.to);if(barrier)return barrier;
 if(q.mode==='paid'&&(payer(w,q.site,q.actor,q.from)<100||w.realm!.treasuries[q.to].coins>999900))return '援费来源不足或接纳国公库容量不足';
 if(q.mode==='tribute'&&(!governingExecutives(w,q.from).includes(q.actor)||subjectCycle(w,q.from,q.to)))return '当前不能合法订立称藩关系';
 if(q.mode==='cession'){
  if(activeWars(w).filter(v=>!v.civil).length>=6&&!activeWars(w).some(v=>!v.civil&&v.attacker===q.to&&v.defender===w.realm!.cities[q.site].owner))return '外战已达容量上限';
  const fake={id:w.realm!.nextWarId??1,attacker:q.to,defender:w.realm!.cities[q.site].owner as RealmId,target:q.site,started:w.day,score:0};
  if(!civilTransferPreview(w,fake,q.actor,q.to,[q.site]).cities.includes(q.site))return '实际驻军仍抵抗交城';
  if(w.realm!.treasuries[q.to].coins<100)return '接纳国保护预算不足 100 钱';
  if(treaty(w,q.to,fake.defender,'pact')||treaty(w,q.to,fake.defender,'alliance')||(w.realm!.truces[diplomaticKey(q.to,fake.defender)]??0)>w.day)return '接纳国须先合法结束与法理朝廷的条约或停战';
 }
 return '';
}
export function foreignAidAnswerReason(w:World,q:Defection,c:Exclude<DefectionCommand,ForeignAidRequest>,actor=w.characterId!){
 if(w.defections?.items.find(v=>v.id===q.id)?.status!=='pending')return '求援事项已处理';
 if(!isAlive(w,actor)||detained(w,actor)||!governingExecutives(w,q.to).includes(actor))return '须由接纳国当前自由执政者裁定';
 if(c.action==='reject')return '';
 const forecast=realmForecast(w,q.to),own=w.realm!.armies.filter(a=>a.realm===q.to);if(w.realm!.treasuries[q.to].coins+forecast.income-forecast.expense<own.reduce((n,a)=>n+armyMonthlyPay(w,a)*2,0)||own.some(a=>(a.arrears??0)>0))return '接纳国须先留足既有军费并处理欠饷';
 return c.action!=='accept'?'政治求援须由接纳方接受或拒绝':w.day-q.created<7?'须等待七日交涉期':currentAidReason(w,q)||(!w.realm!.armies.some(a=>{if(a.realm!==q.to||frontReservations(w,q.to).has(a.id!)||readyTroops(a,w.day)<200||a.morale<40)return false;const route=planRoute(a.location,q.site,id=>control(w,id)===q.to||control(w,id)===q.from);return !!route&&a.supply>=Math.ceil(armyDailyFood(w,a)*Math.min(30,route.days));})?'接纳国没有未被现有战线占用的保护部队':'');
}
export function answerForeignAid(w:World,q:Defection,c:Exclude<DefectionCommand,ForeignAidRequest>,actor=w.characterId!){
 const why=foreignAidAnswerReason(w,q,c,actor);if(why)throw new Error(why);const before=structuredClone(w);try{performForeignAid(w,w.defections!.items.find(v=>v.id===q.id)!,c,actor);}catch(error){Object.assign(w,before);throw error;}
}
function performForeignAid(w:World,q:Defection,c:Exclude<DefectionCommand,ForeignAidRequest>,actor:string){
 const why=foreignAidAnswerReason(w,q,c,actor);if(why)throw new Error(why);if(c.action==='reject'){q.status='rejected';return;}
 const s=w.realm!,war=activeWars(w).find(v=>v.id===q.war)!;
 if(q.mode==='cession'){
  ensureWars(w);const owner=s.cities[q.site].owner as RealmId;
  let external=activeWars(w).find(v=>!v.civil&&warRealmSide(v,q.to)==='attack'&&warRealmSide(v,owner)==='defend');
  if(!external){external={id:s.nextWarId!++,attacker:q.to,defender:owner,target:q.site,goal:'defection',started:w.day,score:0,battles:0,captureLosses:[],disputes:[]};snapshotWarValues(w,external);s.wars!.push(external);diplomaticWar(w,q.to,owner);}
  if(q.from!==owner){external.allies??={};external.allies[q.from]='defend';includeParticipantValues(w,external);}
  s.treasuries[q.to].coins-=100;fiscalRecord(w,q.to,'central:'+q.to,'expense',100,'接纳献城的实际保护支出');q.status='accepted';if(!external.disputes?.includes(q.site))(external.disputes??=[]).push(q.site);joinCivilCamp(w,external,q.actor!,q.to,[q.site]);s.war=s.wars![0];
 }else{
  if(q.mode==='paid'){transferAccount(w,governingExecutives(w,q.from).includes(q.actor!)?'central:'+q.from:fiscalPath(w,q.site)[0],'central:'+q.to,100,'实付外国军援费用');}
  else w.diplomacy!.subjects[q.from]=q.to;
  (war.allies??={})[q.to]=warRealmSide(war,q.from)!;includeParticipantValues(w,war);diplomaticWar(w,q.to,q.enemy!);
 }
 q.status='accepted';w.chronicle.push({day:w.day,person:'player',text:regimeName(w,q.to)+'接受'+siteById[q.site].name+'的'+foreignAidModes[q.mode!]+'；军队保持实际指挥与供饷，法理领土只按有权参与者的和约处理。'});w.chronicle=w.chronicle.slice(-100);
}
export function advanceForeignAid(w:World){
 const s=w.defections!;
 for(const q of s.items.filter(q=>q.mode&&q.status==='pending')){
  if(currentAidReason(w,q)){q.status='withdrawn';continue;}
  if(w.day-q.created<7||governingExecutives(w,q.to).includes(w.characterId!))continue;
  const c={type:'defection',action:'accept',id:q.id} as const;
  if(!foreignAidAnswerReason(w,q,c,governingAuthority(w,q.to)))answerForeignAid(w,q,c,governingAuthority(w,q.to));else if(w.day-q.created>=30)q.status='rejected';
 }
 if(!isMonthStart(w.day,w.scriptId))return;
 for(const [site,city] of Object.entries(w.realm!.cities)){
  const actor=city.governor,from=city.controller;if(from==='frontier'||!actor||actor===w.characterId||!fracturedRealm(w,from)||!foreignAidThreat(w,site)||s.items.some(q=>q.site===site&&(q.status==='pending'||w.day-q.created<180)))continue;
  const threat=foreignAidThreat(w,site)!,enemies=w.realm!.armies.filter(a=>warArmySide(w,threat.war,a)&&warArmySide(w,threat.war,a)!==threat.side),pressure=enemies.filter(a=>approaching(a,site)).reduce((n,a)=>n+a.troops*a.morale/100,0);
  if(pressure<=regionalDefense(w,from,site)*1.2||relationOpinion(w,actor,governingAuthority(w,from))>40)continue;
  const targets=worldRealms(w).filter(r=>r!==from&&r!==(threat.side==='attack'?threat.war.defender:threat.war.attacker)&&border(w,site,r));
  const modes:ForeignAidMode[]=governingExecutives(w,from).includes(actor)?['paid','tribute']:['paid','cession'];
  const command=targets.flatMap(target=>modes.map(mode=>({type:'defection',action:'request',site,target,mode} as const))).find(c=>!foreignAidQuote(w,c,actor).reason);
  if(command)requestForeignAid(w,command,actor);
 }
}
export function validForeignAid(w:World,q:Defection){return q.mode===undefined?q.actor===undefined&&q.war===undefined&&q.enemy===undefined:Object.hasOwn(foreignAidModes,q.mode)&&!!q.actor&&!!getPerson(w,q.actor)&&!!q.enemy&&worldRealms(w).includes(q.enemy)&&Number.isSafeInteger(q.war)&&q.war!>0&&q.war!<(w.realm!.nextWarId??1);}
