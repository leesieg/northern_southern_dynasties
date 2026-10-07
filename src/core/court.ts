import {allPeople,getCharacter,getPerson} from './personRegistry';
import {worldRealms} from './polityRuntime';
import {applyPowerArrangement,actPower,powerReason} from './powerPolitics';
import {constitutionalExecutives} from './government';
import {isMonthStart,monthStart,nextMonthStart} from './calendar';
import {commandArmy} from './mobility';
import {realmAtWar,activeWars,warRealmSide} from './wars';
import {clearLocalPerson,localActive,localSites,localOfficeLoad} from './localAdministration';

import {allegianceRealm,publicOfficeReason} from './officeEligibility';
import {isAlive,ageAt,lifeOf} from './lifeState';
import { creditPersonalCoins } from './relationships';
import {expandedPersonById} from '../data/expandedPeople';

import { movements,movementIds,ministries,ministryIds,policyIds,type MovementId,type MinistryId,type CourtPhase,type CourtPolicy } from '../data/court';
import { governmentOf,governingExecutives,governingAuthority,currentRealm,governmentExecutive,politicalName } from './government';
import { type RealmId } from './realm';
import { familyStanding } from './family';
import { traitsFor,acceptance } from './social';
import type { World } from './types';
import {personInfluence,awardInfluence} from './personalInfluence';
import {governanceRules} from './governanceRules';
import {appointmentEvaluation,ministryAbility} from './appointmentRules';
import {attributes} from './social';
import {presentAt} from './residence';
import {capital,cityYield,realmForecast} from './realm';
import {phases} from '../data/court';
import {dispatchNPC,npcRoute} from './mobility';
import {servicePayer} from './serviceMandates';
import {assignmentTemplates,assignmentPlans} from '../data/assignments';
export interface CourtSettlement {day:number;from:CourtPhase;to:CourtPhase;tensionBefore:number;tensionAfter:number;supportDelta:number;corruptionDelta:number;causes:{label:string;value:number}[]}
export interface CourtState {
 capitalLost?:boolean;
 impacts?:import('./politicalActions').PoliticalImpact[];
 politicalWindows?:Record<string,import('./politicalActions').PoliticalWindow>;
 settlement?:CourtSettlement;
 version:1;since:number;lastMonthly:number;regimeId:string;tenure:string;phase:CourtPhase;policy:CourtPolicy;tension:number;corruption:number;
 ministries:Record<MinistryId,string|null>;members:Record<string,MovementId>;favored:MovementId|null;
 boosts:Record<string,{until:number;power:number}>;cooldowns:Record<string,number>;
 petition:{group:MovementId;sponsor:string;due:number}|null;
 founding:{name:string;mode:'usurp'|'unify';sponsor:string;started:number;progress:number;required:120}|null;
 history:{day:number;text:string}[];
}
export type CourtCommand={type:'court';action:'policy';policy:CourtPolicy}|{type:'court';action:'seek-office';ministry:MinistryId}|{type:'court';action:'join';group:MovementId}|{type:'court';action:'convince';target:string}|{type:'court';action:'debate'|'petition'|'audit'|'cancel'}|{type:'court';action:'favor';group:MovementId}|{type:'court';action:'appoint';ministry:MinistryId;candidate:string|null}|{type:'court';action:'resolve';accept:boolean}|{type:'court';action:'found';name:string;mode:'usurp'|'unify'};
const cap=(v:number,max=100)=>Math.max(0,Math.min(max,Math.round(v)));
const roster=(w:World,r:RealmId)=> allPeople(w).filter(p=>p.realm===r||allegianceRealm(w,p.id)===r).map(p=>({...p,role: getCharacter(w,p.id)?.role??expandedPersonById[p.id]?.role??'scholar'}));
export const courtOf=(w:World,r=currentRealm(w))=>governmentOf(w,r)?.court;
export const courtEnabled=(w:World,r:RealmId)=>['celestial','meritocratic','khanate'].includes(governmentOf(w,r)?.type??'');
export function newCourt(w:World,r:RealmId):CourtState{
 const g=governmentOf(w,r)!;
 return {version:1,since:w.day,lastMonthly:monthStart(w.day,w.scriptId),regimeId:g.regimeId,tenure:g.ruler+'|'+constitutionalExecutives(w,r).join('|'),phase:'stable',policy:'consolidation',tension:15,corruption:0,ministries:Object.fromEntries(ministryIds.map(k=>[k,null])) as CourtState['ministries'],members:Object.fromEntries(roster(w,r).map(p=>[p.id,p.id===g.ruler?'unaligned':p.role==='prince'?'dynastic':p.role==='commander'?'expansion':p.role==='regent'?'reform':'conservative'])),favored:null,boosts:{},cooldowns:{},petition:null,founding:null,history:[]};
}
export function ensureCourts(w:World){if(!w.realm?.governments)return;for(const r of worldRealms(w)){governmentOf(w,r)!.rules??=governanceRules(w,r);governmentOf(w,r)!.court??=newCourt(w,r);}}
function log(w:World,r:RealmId,text:string){const c=courtOf(w,r)!;c.history.push({day:w.day,text});c.history=c.history.slice(-60);}
export function ministryPerformance(w:World,r:RealmId,m:MinistryId){const holder=courtOf(w,r)?.ministries[m];if(!holder)return {score:0,reason:'职位空缺'};if(w.custody?.records[holder])return {score:0,reason:'被拘押，履职暂停'};if(!isAlive(w,holder)||allegianceRealm(w,holder)!==r)return {score:0,reason:'任职身份失效'};if((lifeOf(w,holder)?.illness?.severity??0)>=3)return {score:0,reason:'重病，履职暂停'};if(!presentAt(w,holder,capital(r,w)))return {score:0,reason:'未在都城履职'};const ability=attributes(w,holder)[ministryAbility[m]],experience=Math.min(4,Math.floor((governmentOf(w,r)?.merit[holder]??0)/20)),score=ability+experience;return {score,reason:`对口能力 ${ability}＋履历经验 ${experience}；达到 10 称职`};}
export function ministryCompetent(w:World,r:RealmId,m:MinistryId){return ministryPerformance(w,r,m).score>=10;}
export function movementPowerParts(w:World,r:RealmId,id:string){
 if(!isAlive(w,id)||(ageAt(w,id)??18)<16||governmentOf(w,r)?.ruler===id||allegianceRealm(w,id)!==r)return [];
 const c=courtOf(w,r)!,g=governmentOf(w,r)!,upperSites=new Set(Object.entries(w.realm!.local?.seats??{}).filter(([key,seat])=>seat.holder===id&&key.startsWith(r+'|')&&localActive(w,key.split('|')[1],r)).flatMap(([key])=>localSites(w,key.split('|')[1],r,true))),cities=Object.entries(w.realm!.cities).filter(([site,p])=>p.owner===r&&p.controller===r&&(p.governor===id||upperSites.has(site))).map(([,p])=>p),group=c.members[id],traits=traitsFor(w,id);
 return [{label:'政治资历',value:10+Math.floor((g.merit[id]??0)/5)},{label:'中央职掌',value:Object.values(c.ministries).filter(p=>p===id).length*20},{label:'地方人口与税基',value:Math.min(60,cities.reduce((n,c)=>n+Math.floor(c.population/10000)+Math.floor(c.population*c.prosperity/500000),0))},{label:'统领军队',value:Math.floor((commandArmy(w,id)?.troops??0)/20)},{label:'家族声望',value:familyStanding(w,id).tier*3},{label:'政治倾向',value:(group==='reform'&&traits.includes('diligent')||group==='conservative'&&traits.includes('frugal')||group==='dynastic'&&traits.includes('gregarious')||group==='expansion'&&traits.includes('steadfast'))?5:0},{label:'清议动员',value:c.boosts[id]?.until>w.day?c.boosts[id].power:0},{label:'实际执政',value:governingExecutives(w,r).includes(id)?10:0}];
}
export function movementPower(w:World,r:RealmId,id:string){return movementPowerParts(w,r,id).reduce((n,p)=>n+p.value,0);}
function movementPowers(w:World,r:RealmId){return Object.keys(courtOf(w,r)!.members).map(id=>({id,power:movementPower(w,r,id)}));}
export function movementSummary(w:World,r:RealmId,group:MovementId,powers=movementPowers(w,r)){
 const c=courtOf(w,r)!;
 const ranked=powers.filter(p=>p.power>0&&c.members[p.id]===group).sort((a,b)=>b.power-a.power||a.id.localeCompare(b.id));
 const members=ranked.map(p=>p.id),power=ranked.reduce((n,p)=>n+p.power,0),total=powers.reduce((n,p)=>n+p.power,0);
 return {members,power,share:total?Math.floor(power*100/total):0,leader:group==='unaligned'?null:members[0]??null};
}
/** Derived from live political conditions; no second membership or satisfaction ledger. */
export function movementMood(w:World,r:RealmId,group:MovementId,powers?:ReturnType<typeof movementPowers>){
 const c=courtOf(w,r)!,g=governmentOf(w,r)!,m=movementSummary(w,r,group,powers),factors:{label:string;value:number}[]=[];
 const add=(label:string,value:number)=>factors.push({label,value});
 if(group==='unaligned'||!m.members.length)return {...m,satisfaction:50,factors,tension:0,support:0};
 add('基本认同',50);
 if(c.favored===group)add('朝廷眷顾',20);else if(c.favored)add('他派受眷顾',-10);
 const aligned=group==='reform'?c.policy==='reform':group==='expansion'?c.policy==='expansion':group==='conservative'?c.policy==='consolidation':null;
 if(aligned!==null){if(c.phase==='stable')add(aligned?'国策符合诉求':'国策背离诉求',aligned?20:-15);else add('安定方略暂停',0);}
 const occupied=Object.values(c.ministries).filter((id):id is string=>!!id&&isAlive(w,id));
 if(occupied.length){const seats=occupied.filter(id=>c.members[id]===group).length;add('中央任职份额',Math.max(-15,Math.min(15,Math.round((seats/occupied.length-m.share/100)*30))));}
 if(group==='dynastic')add('君主合法性',Math.round((g.legitimacy-50)/3));
 if(group==='reform'||group==='conservative')add('官场积弊',-Math.floor(c.corruption/5));
 if(realmAtWar(w,r))add('战争立场',group==='expansion'?10:group==='conservative'?-15:-5);
 const satisfaction=cap(factors.reduce((n,v)=>n+v.value,0));
 const tension=satisfaction<40?m.share*(40-satisfaction)/200:satisfaction>=70?-m.share*(satisfaction-60)/500:0;
 const support=satisfaction<30?-m.share/25:satisfaction>=70?m.share/25:0;
 return {...m,satisfaction,factors,tension,support};
}
/** Derived pressure: actual office, army, family and tax power weighted by unmet demands. */
export function courtPolicyPressure(w:World,r:RealmId){
 const powers=movementPowers(w,r);
 return movementIds.filter(group=>group!=='unaligned').map(group=>{const mood=movementMood(w,r,group,powers),policy:CourtPolicy=group==='reform'?'reform':group==='expansion'?'expansion':'consolidation';return {group,policy,...mood,pressure:Math.round(mood.power*(150-mood.satisfaction)/100)};}).filter(v=>v.power>0).sort((a,b)=>b.pressure-a.pressure||b.power-a.power||a.group.localeCompare(b.group));
}
export function courtPolicyActive(w:World,r:RealmId){const c=courtOf(w,r);return c&&courtEnabled(w,r)&&c.phase==='stable'?c.policy:null;}
export function courtBonus(w:World,r:RealmId){
 const c=courtOf(w,r);if(!c||!courtEnabled(w,r))return {tax:0,pay:0,attack:0};
 return {tax:(c.phase==='strained'?-10:c.phase==='chaos'?-25:0)+(ministryCompetent(w,r,'finance')?8:0)+(c.phase==='stable'&&c.policy==='reform'?8:0),pay:(ministryCompetent(w,r,'military')?-8:0)+(c.phase==='chaos'?15:c.phase==='stable'&&c.policy==='expansion'?5:0),attack:c.phase==='stable'?(c.policy==='expansion'?10:c.policy==='reform'?-5:0):0};
}
export function controlledShare(w:World,r:RealmId){const cities=Object.values(w.realm!.cities).filter(c=>c.owner!=='frontier');return cities.length?Math.floor(cities.filter(c=>c.owner===r&&c.controller===r).length*100/cities.length):0;}
export function foundingPause(w:World,r:RealmId){const c=courtOf(w,r),f=c?.founding;if(!f)return '';const g=governmentOf(w,r)!;const seat=w.realm!.cities[capital(r,w)];
 if(!courtEnabled(w,r))return '当前政体不支持朝廷拥立';if(realmAtWar(w,r))return '战争中暂停';if(seat.owner!==r||seat.controller!==r)return '都城失守，暂停';if(g.support<60)return '朝野支持低于 60';
 if(f.mode==='unify')return controlledShare(w,r)<75||g.legitimacy<80?'重建天朝需实控 75% 已录非边疆城市、天命 80':'';
 const group=c!.members[f.sponsor];return group==='unaligned'||movementSummary(w,r,group).leader!==f.sponsor||movementSummary(w,r,group).share<50?'拥立集团需由发起人领衔、势力至少 50%':'';
}
export function centralAppointmentCost(w:World,r:RealmId,ministry:MinistryId,candidate:string|null){const g=governmentOf(w,r);return candidate&&g&&!g.court?.ministries[ministry]&&appointmentEvaluation(w,r,candidate,{ministry},governingAuthority(w,r)).ordinary&&!localOfficeLoad(w,candidate)&&!w.realm?.offices.some(o=>o.candidate===candidate)?0:15;}
function centralAppointmentReason(w:World,cmd:Extract<CourtCommand,{action:'appoint'}>,actor:string){
 const r=allegianceRealm(w,actor),g=r&&governmentOf(w,r),c=r&&courtOf(w,r);
 if(!w.realm||!isAlive(w,actor)||w.campaign?.status!=='active'||!g||!c)return '当前无法办理中央官职';
 if(!courtEnabled(w,r!))return '需贤能、天朝或宫帐政体';if(w.realm.event&&actor===w.characterId)return '先处理待决事务';
 if(w.realm.cities[capital(r,w)].owner!==r||w.realm.cities[capital(r,w)].controller!==r)return '须实际控制本国都城';
 if(!governingExecutives(w,r!).includes(actor))return '需要实际执政权';if(!ministryIds.includes(cmd.ministry))return '未知中央职位';
 if((c.cooldowns['appoint|'+cmd.ministry]??0)>w.day)return '行动冷却中，余 '+(c.cooldowns['appoint|'+cmd.ministry]-w.day)+' 日';
 if(cmd.candidate!==null&&allegianceRealm(w,cmd.candidate)!==r)return '需当前效忠本国的人物';if(cmd.candidate&&publicOfficeReason(w,cmd.candidate))return publicOfficeReason(w,cmd.candidate);if(cmd.candidate&&!npcRoute(w,cmd.candidate,capital(r!,w)))return '赴任道路不通，需先恢复通行';
 if(cmd.candidate&&(g.laws.includes('west-offices')||g.laws.includes('east-assessment'))&&(g.merit[cmd.candidate]??0)<20)return '现行考课法令要求功绩至少 20';if(cmd.candidate&&Object.values(c.ministries).includes(cmd.candidate))return '一人只可担任一个中央职掌，请先免职';if(c.ministries[cmd.ministry]===cmd.candidate)return '职位未变化';const cost=centralAppointmentCost(w,r!,cmd.ministry,cmd.candidate);return personInfluence(w,actor)<cost?'任免需影响力 '+cost:'';
}
export function courtPolicyReason(w:World,cmd:Extract<CourtCommand,{action:'policy'}>,actor=w.characterId!){
 if(!w.realm||!actor||!getPerson(w,actor)||!isAlive(w,actor)||w.campaign?.status!=='active')return '当前无法议定安定方略';
 const r=allegianceRealm(w,actor),c=r&&courtOf(w,r);if(!r||!c||w.realm.annexed?.[r])return '须有本国朝廷';
 if(!courtEnabled(w,r))return '需贤能、天朝或宫帐政体';if(!governingExecutives(w,r).includes(actor))return '需要实际执政权';
 if(actor===w.characterId&&w.realm.event)return '先处理待决事务';if((c.cooldowns.policy??0)>w.day)return '行动冷却中，余 '+(c.cooldowns.policy-w.day)+' 日';
 return !policyIds.includes(cmd.policy)?'未知安定方略':c.phase!=='stable'?'须先恢复安定，方略加成在动荡与混乱时暂停':cmd.policy===c.policy?'已采用此方略':personInfluence(w,actor)<20?'调整方略需影响力 20':'';
}
export function courtReason(w:World,cmd:CourtCommand,actor=w.characterId!):string{
 if(cmd.action==='policy')return courtPolicyReason(w,cmd,actor);
 if(cmd.action==='appoint')return centralAppointmentReason(w,cmd,actor);if(actor!==w.characterId)return '须由本人办理朝廷行动';
 if(!w.realm||!w.characterId||w.campaign?.status!=='active')return '仅历史沙盒可用';const r=currentRealm(w),g=governmentOf(w)!,c=courtOf(w);if(!c)return '请重新读取以初始化朝廷';if(!courtEnabled(w,r))return '需贤能、天朝或宫帐政体';if(w.realm.event)return '先处理待决事务';
 if(cmd.action==='convince'&&!isAlive(w,cmd.target))return '人物已经去世';
 const id=w.characterId,t=w.realm.treasuries[r],group=c.members[id],key=cmd.action==='join'?'join|'+id:cmd.action==='debate'?'debate|'+id:cmd.action==='convince'?'convince|'+id:cmd.action==='seek-office'?'appoint|'+cmd.ministry:cmd.action;
 if((c.cooldowns[key]??0)>w.day)return '行动冷却中，余 '+(c.cooldowns[key]-w.day)+' 日';
 if(['join','convince','debate','petition'].includes(cmd.action)&&g.ruler===id)return '君主通过眷顾和裁决协调集团，不以普通成员结党';
 if(cmd.action==='join')return !movementIds.includes(cmd.group)?'未知集团':cmd.group===group?'已在此集团':w.realm.influence<10?'需影响力 10':'';
 if(cmd.action==='convince')return !Object.hasOwn(c.members,cmd.target)||cmd.target===id?'需本国其他已录人物':group==='unaligned'?'先加入政治集团':c.members[cmd.target]===group?'已是同道':w.people[0].coins<30||w.realm.influence<10?'需个人钱 30、影响力 10':acceptance(w,cmd.target).reduce((s,v)=>s+v.value,0)+(c.favored===group?15:0)<50?'游说接受度需达到 50（受眷顾集团 +15）':'';
 if(cmd.action==='debate')return group==='unaligned'?'未结党不能清议':w.people[0].coins<30?'清议需个人钱 30':'';
 if(cmd.action==='petition')return c.petition?'已有集团奏议待决':group==='unaligned'||movementSummary(w,r,group).leader!==id?'需担任集团领袖':w.realm.influence<15?'奏议需影响力 15':'';
 if(cmd.action==='seek-office')return !ministryIds.includes(cmd.ministry)?'未知中央职位':c.ministries[cmd.ministry]!==null?'此职位已有任官':Object.values(c.ministries).includes(id)?'你已有中央职掌':!!publicOfficeReason(w,id)?publicOfficeReason(w,id):!appointmentEvaluation(w,r,id,{ministry:cmd.ministry},governingAuthority(w,r)).ordinary?'未达常额任用条件；可积累履历、争取担保或试任通道':appointmentEvaluation(w,r,id,{ministry:cmd.ministry},governingAuthority(w,r)).score<appointmentEvaluation(w,r,id,{ministry:cmd.ministry}).threshold?'任用评价未达此职参考，请由执政者审议破格':!npcRoute(w,id,capital(r,w))?'赴任道路不通':w.realm.influence<25?'请任需影响力 25':'';
 if(cmd.action==='cancel')return !c.founding?'没有拥立议程':c.founding.sponsor!==id&&!governmentExecutive(w)?'仅发起人或执政者可撤回':'';
 if(cmd.action==='found')return powerReason(w,{type:'power',action:'propose',goal:'dynasty',beneficiary:w.characterId!,executive:w.characterId!,name:cmd.name});
 if(!governmentExecutive(w))return '需要实际执政权';
 if(cmd.action==='favor')return !movementIds.includes(cmd.group)||cmd.group==='unaligned'?'请选择政治集团':!movementSummary(w,r,cmd.group).members.length?'该集团无人':w.realm.influence<20?'眷顾需影响力 20':'';
 if(cmd.action==='resolve')return !c.petition?'没有待决奏议':typeof cmd.accept!=='boolean'?'无效决断':cmd.accept&&(t.coins<80||w.realm.influence<20)?'批准需公款 80、影响力 20':'';
 if(cmd.action==='audit')return t.coins<60||w.realm.influence<15?'整饬需公款 60、影响力 15':'';
 return '未知朝廷行动';
}
function resolvePetition(w:World,r:RealmId,accept:boolean,actor:string){const c=courtOf(w,r)!,g=governmentOf(w,r)!,p=c.petition!;if(accept){if(!governingExecutives(w,r).includes(actor)||personInfluence(w,actor)<20||w.realm!.treasuries[r].coins<80)throw new Error('批准需执政者本人影响力 20、公款 80');w.realm!.treasuries[r].coins-=80;awardInfluence(w,actor,-20);c.favored=p.group;if(p.group==='reform'||p.group==='expansion')c.policy=p.group;else if(p.group==='conservative')c.policy='consolidation';else g.legitimacy=cap(g.legitimacy+8);g.support=cap(g.support+5);c.tension=cap(c.tension-8);}else {g.support=cap(g.support-5);c.tension=cap(c.tension+8);}log(w,r,movements[p.group].name+'奏议'+(accept?'获准，施政方向／天命已调整。':'遭否决，朝野支持 −5、紧张 +8。'));c.petition=null;}
export function actCourt(w:World,cmd:CourtCommand,actor=w.characterId!){const reason=courtReason(w,cmd,actor);if(reason)throw new Error(reason);
 if(cmd.action==='policy'){const r=allegianceRealm(w,actor)!,c=courtOf(w,r)!;awardInfluence(w,actor,-20);c.policy=cmd.policy;c.cooldowns.policy=w.day+30;log(w,r,politicalName(actor,w)+'议定安定方略：'+({reform:'变革',expansion:'拓境',consolidation:'固本'})[cmd.policy]+'；集团态度依实际诉求重新计算。');return;}
 if(cmd.action==='appoint'){
  const r=allegianceRealm(w,actor)!,g=governmentOf(w,r)!,c=courtOf(w,r)!;
  const cost=centralAppointmentCost(w,r,cmd.ministry,cmd.candidate);
  if(cmd.candidate){clearLocalPerson(w,cmd.candidate);c.members[cmd.candidate]??='unaligned';g.merit[cmd.candidate]??=0;}
  awardInfluence(w,actor,-cost);c.ministries[cmd.ministry]=cmd.candidate;c.cooldowns['appoint|'+cmd.ministry]=w.day+30;
  if(cmd.candidate&&!appointmentEvaluation(w,r,cmd.candidate,{ministry:cmd.ministry},actor).ordinary){g.support=cap(g.support-3);c.tension=cap(c.tension+3);log(w,r,'破格授官：朝野支持 −3、紧张 +3；履职能力另行判断。');}if(cmd.candidate)dispatchNPC(w,cmd.candidate,capital(r,w));
  log(w,r,ministries[cmd.ministry].name+'：'+(cmd.candidate?'任命'+politicalName(cmd.candidate,w)+'；履职由到任、对口能力与履历经验决定。':'免职，增益即时撤销。'));return;
 }
 const r=currentRealm(w),g=governmentOf(w)!,c=courtOf(w)!,id=w.characterId!,s=w.realm!,t=s.treasuries[r];
 switch(cmd.action){
 case 'seek-office':clearLocalPerson(w,id);s.influence-=25;c.ministries[cmd.ministry]=id;dispatchNPC(w,id,capital(r,w));c.cooldowns['appoint|'+cmd.ministry]=w.day+30;log(w,r,politicalName(id,w)+'符合现行任用评价与通道，获准请任'+ministries[cmd.ministry].name+'。');break;
 case 'join':s.influence-=10;c.members[id]=cmd.group;c.cooldowns['join|'+id]=w.day+90;log(w,r,politicalName(id,w)+'加入'+movements[cmd.group].name+'。');break;
 case 'convince':w.people[0].coins-=30;s.influence-=10;c.members[cmd.target]=c.members[id];c.cooldowns['convince|'+id]=w.day+30;log(w,r,politicalName(cmd.target,w)+'经游说加入'+movements[c.members[id]].name+'。');break;
 case 'debate':w.people[0].coins-=30;c.boosts[id]={until:w.day+180,power:25};c.cooldowns['debate|'+id]=w.day+180;log(w,r,politicalName(id,w)+'主持清议，180 日内集团个人势力 +25。');break;
 case 'petition':s.influence-=15;c.petition={group:c.members[id],sponsor:id,due:w.day+15};c.cooldowns.petition=w.day+90;log(w,r,'集团奏议已呈送，15 日内等待朝廷裁决。');break;
 case 'resolve':resolvePetition(w,r,cmd.accept,id);break;
 case 'favor':s.influence-=20;c.favored=cmd.group;c.cooldowns.favor=w.day+90;log(w,r,'朝廷眷顾'+movements[cmd.group].name+'。');break;
 case 'audit':t.coins-=60;s.influence-=15;c.corruption=cap(c.corruption-20);c.tension=cap(c.tension-10);g.support=cap(g.support-3);c.cooldowns.audit=w.day+90;log(w,r,'整饬吏治：积弊 −20、紧张 −10、朝野支持 −3。');break;
 case 'found':actPower(w,{type:'power',action:'propose',goal:'dynasty',beneficiary:id,executive:id,name:cmd.name});break;
 case 'cancel':c.founding=null;log(w,r,'撤回拥立议程，已付成本不退。');break;
 }
}
export function syncCourt(w:World,r:RealmId){const c=courtOf(w,r),g=governmentOf(w,r)!;if(!c)return; c.members[g.ruler]='unaligned'; for(const city of Object.values(w.realm!.cities))if(city.owner===r&&city.governor&& getPerson(w,city.governor)!){c.members[city.governor]??='unaligned';g.merit[city.governor]??=0;} const tenure=g.ruler+'|'+constitutionalExecutives(w,r).join('|');if(c.regimeId===g.regimeId&&c.tenure===tenure)return;
 c.regimeId=g.regimeId;c.tenure=tenure;for(const k of ministryIds)if(c.ministries[k]&&(!isAlive(w,c.ministries[k]!)||allegianceRealm(w,c.ministries[k]!)!==r))c.ministries[k]=null;c.founding=null;c.petition=null;c.favored=null;c.boosts={};c.tension=cap(c.tension+5);log(w,r,'朝廷交接：有效中央任职与地方治理继续，未决旧奏议撤回。');
}
function foundDynasty(w:World,r:RealmId){const c=courtOf(w,r)!,f=c.founding!;applyPowerArrangement(w,r,{goal:'dynasty',sponsor:f.sponsor,beneficiary:f.sponsor,executive:f.sponsor,name:f.name});if(f.mode==='unify')governmentOf(w,r)!.type='celestial';}

export function courtLocalPressures(w:World,r:RealmId){
 const rows=Object.entries(w.realm!.cities).filter(([,c])=>c.owner===r).map(([site,c])=>{const y=cityYield(w,site),deficit=Math.max(0,y.food-y.grain-c.grain-(site===capital(r,w)&&c.controller===r?w.realm!.treasuries[r].grain:0)),disorder=Math.max(0,(45-c.order)/45),shortage=y.food?deficit/y.food:0;return {site,population:c.population,order:c.order,deficit,severity:Math.max(disorder,shortage),governor:c.governor,tasks:w.service?.tasks.filter(t=>t.realm===r&&t.site===site&&t.phase!=='closed').map(t=>t.id)??[]};});
 const total=rows.reduce((n,v)=>n+v.population,0),pressure=total?Math.ceil(rows.reduce((n,v)=>n+v.population*v.severity,0)/total*8):0;
 return {pressure,affected:rows.filter(v=>v.severity>0).sort((a,b)=>b.population*b.severity-a.population*a.severity),population:rows.filter(v=>v.severity>0).reduce((n,v)=>n+v.population,0),total};
}
export function courtCatalysts(w:World,r:RealmId,powers=movementPowers(w,r)){const c=courtOf(w,r)!,g=governmentOf(w,r)!,s=w.realm!,t=s.treasuries[r],local=courtLocalPressures(w,r),capitalCity=s.cities[capital(r,w)],forecast=realmForecast(w,r);
 const promised=w.service?.tasks.filter(q=>q.realm===r&&q.phase==='approval'&&servicePayer(w,q).account==='central:'+r).reduce((n,q)=>n+Math.ceil(assignmentTemplates[q.kind].coins*assignmentPlans[q.plan??'balanced'].cost/100),0)??0;
 const gap=Math.max(0,forecast.expense+promised-forecast.income-t.coins);
 const rows:{label:string;value:number}[]=[];const add=(label:string,value:number)=>rows.push({label,value});
 const ongoing=activeWars(w).filter(v=>warRealmSide(v,r));if(ongoing.length)add('实际战线与续战负担',Math.min(6,ongoing.length*2));const disputed=(w.claims?.records??[]).filter(q=>q.realm===r&&q.until===null&&q.person!==g.ruler&&isAlive(w,q.person)&&isAlive(w,q.patron)&&allegianceRealm(w,q.patron)!==r);if(disputed.length)add('境外支持的君位宣称',Math.min(6,disputed.length*2));
 if(gap)add('拟拨预算与月支出缺口 '+gap+' 钱',Math.min(10,Math.max(1,Math.ceil(gap/Math.max(1,forecast.expense+promised)*10))));
 if(capitalCity.owner!==r||capitalCity.controller!==r)add('都城失守冲击',c.capitalLost?0:8);const unpaid=s.armies.filter(a=>a.realm===r&&(a.arrears??0)>0);if(unpaid.length)add('军队实际欠饷',Math.min(8,unpaid.length*2));if(local.pressure)add('地方失序与民食缺口',local.pressure);if(g.legitimacy<40)add('天命受疑',8);if(g.support<40)add('朝野离心',6);if(c.corruption>=50)add('积弊深重',6);
 const incapable=ministryIds.filter(m=>c.ministries[m]&&!ministryCompetent(w,r,m));if(incapable.length)add('官署履职受阻',Math.min(5,incapable.length));
 const political=movementIds.reduce((n,group)=>n+movementMood(w,r,group,powers).tension,0),baseline=Math.min(35,15+Math.max(0,political)*2);if(c.tension<baseline&&political>0)add('集团分歧',Math.round(Math.min(political,baseline-c.tension)));else if(political<0)add('集团支持',Math.round(political));
 if(!gap&&!unpaid.length)add('收支与军饷平稳',-2);if(!local.pressure&&capitalCity.controller===r)add('民食与地方秩序平稳',-2);if(ministryCompetent(w,r,'censorate'))add('监察履职',-2);
 return rows;
}
export function courtPhaseAfter(previous:CourtPhase,tension:number,legitimacy:number):CourtPhase {
 if(tension>=80||legitimacy<15||previous==='chaos'&&(tension>=70||legitimacy<20))return 'chaos';
 return tension>=40||previous!=='stable'&&tension>=35?'strained':'stable';
}
/** Pure conditional projection of the same ordered monthly court calculation. */
export function courtMonthPreview(w:World,r:RealmId,asOf=nextMonthStart(w.day,w.scriptId)){
 const g=governmentOf(w,r)!,c=courtOf(w,r)!,projected={...c,boosts:Object.fromEntries(Object.entries(c.boosts).filter(([,b])=>b.until>asOf)),history:c.history},pg={...g,court:projected};
 const preview={...w,day:asOf,realm:{...w.realm!,governments:{...w.realm!.governments!,realms:{...w.realm!.governments!.realms,[r]:pg}}}};
 if(ministryCompetent(preview,r,'secretariat'))pg.support=cap(pg.support+2);
 projected.corruption=cap(projected.corruption-(ministryCompetent(preview,r,'censorate')?5:0)-(c.phase==='stable'&&c.policy==='consolidation'?1:0));
 const powers=movementPowers(preview,r),moods=movementIds.map(group=>({group,...movementMood(preview,r,group,powers)}));
 pg.support=cap(pg.support+moods.reduce((n,m)=>n+m.support,0));
 const causes=courtCatalysts(preview,r,powers),tension=cap(c.tension+causes.reduce((n,v)=>n+v.value,0));
 return {causes,moods,tension,phase:courtPhaseAfter(c.phase,tension,g.legitimacy),support:pg.support,corruption:projected.corruption,delta:tension-c.tension,enabled:courtEnabled(w,r)};
}
export function courtResponse(w:World,r:RealmId){return governingExecutives(w,r).includes(w.characterId!)?'可调整国策、协调集团、查核公库并安排地方差事。':'可办理辖区赈济、核查与清税，向直属上级请款或呈报执行困难。';}
export function courtTransitionBody(w:World,r:RealmId){const c=courtOf(w,r)!,q=c.settlement;return `主要原因：${q?.causes.filter(v=>v.value>0).sort((a,b)=>b.value-a.value).slice(0,3).map(v=>v.label+' +'+v.value).join('；')||'月度条件变化'}。已生效：${phases[c.phase].effect}；任官与赋役规则继续有效。${courtResponse(w,r)}`;}
export function advanceCourts(w:World){if(!w.realm?.governments)return;for(const r of worldRealms(w)){if(w.realm.annexed?.[r])continue;syncCourt(w,r);const c=courtOf(w,r);if(!c)continue;const g=governmentOf(w,r)!;
 if(c.petition&&c.petition.due<=w.day){const actor=governingAuthority(w,r),mayPay=!!actor&&w.realm.treasuries[r].coins>=80&&personInfluence(w,actor)>=20,supported=courtEnabled(w,r)&&!governingExecutives(w,r).includes(w.characterId!)&&movementSummary(w,r,c.petition.group).share>=30;if(!supported||mayPay||w.day-c.petition.due>=60)resolvePetition(w,r,supported&&mayPay,actor??'');}
 if(!courtEnabled(w,r))continue;
 if(c.founding&&!foundingPause(w,r)){c.founding.progress++;if(c.founding.progress>=c.founding.required)foundDynasty(w,r);}
 if(!isMonthStart(w.day,w.scriptId)||c.lastMonthly>=w.day)continue;c.lastMonthly=w.day;
 for(const [id,b] of Object.entries(c.boosts))if(b.until<=w.day)delete c.boosts[id];
 if(c.phase==='stable'&&(c.cooldowns.policy??0)<=w.day&&!governingExecutives(w,r).includes(w.characterId!)){const dominant=courtPolicyPressure(w,r)[0];if(dominant&&dominant.policy!==c.policy){c.policy=dominant.policy;log(w,r,movements[dominant.group].name+'依实际势力与未满诉求推动'+({reform:'变革',expansion:'拓境',consolidation:'固本'})[c.policy]+'方略。');}}
 const projection=courtMonthPreview(w,r,w.day),supportDelta=projection.support-g.support,corruptionDelta=projection.corruption-c.corruption,moods=projection.moods;
 g.support=projection.support;c.corruption=projection.corruption;
 if(supportDelta)log(w,r,'集团态度：朝野支持 '+(supportDelta>0?'+':'')+supportDelta+'。');
 if(!c.petition&&(c.cooldowns.petition??0)<=w.day){const opposition=moods.filter(m=>m.leader&&m.leader!==w.characterId&&m.satisfaction<40&&m.share>=25).sort((a,b)=>b.share-a.share)[0];if(opposition){c.petition={group:opposition.group,sponsor:opposition.leader!,due:w.day+15};c.cooldowns.petition=w.day+90;log(w,r,movements[opposition.group].name+'因诉求未获满足呈递奏议，15 日内等待裁决。');}}
 const catalysts=projection.causes,previous=c.phase,before=c.tension;c.tension=projection.tension;c.phase=projection.phase;
 c.capitalLost=w.realm.cities[capital(r,w)].owner!==r||w.realm.cities[capital(r,w)].controller!==r;c.settlement={day:w.day,from:previous,to:c.phase,tensionBefore:before,tensionAfter:c.tension,supportDelta,corruptionDelta,causes:catalysts};
 log(w,r,`月度局势：${catalysts.map(v=>v.label+(v.value>0?'+':'')+v.value).join('；')}。紧张 ${c.tension}。`);
 if(previous!==c.phase)log(w,r,'局势转入'+({stable:'安定',strained:'动荡',chaos:'危局'})[c.phase]+'。');
 }}

export function courtSalary(w:World,r:RealmId){return courtEnabled(w,r)?Object.values(courtOf(w,r)?.ministries??{}).filter(Boolean).length*4:0;}
export function payCourtSalary(w:World,r:RealmId,paid:number){const c=courtOf(w,r);if(!c||!courtEnabled(w,r))return;const holders=Object.values(c.ministries).filter(Boolean);if(paid<holders.length*4){c.tension=cap(c.tension+5);log(w,r,'中央俸给不足：紧张 +5。');}for(let i=0;i<holders.length;i++)creditPersonalCoins(w,holders[i]!,Math.floor(paid/holders.length)+(i<paid%holders.length?1:0));}
