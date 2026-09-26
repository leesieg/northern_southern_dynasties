import {coordinatedPlanReason,programmePlans} from './coordinatedService';
import {ensureArmyOrganization} from './armyOrganization';
import {requestAccountFunding,publicBalance} from './treasury';
import {servicePayer} from './serviceMandates';
import {civilCanAdmin,actorCommandsSide,civilWar} from './civilWars';
import {supplyDepartureReason,dispatchServiceGrain,type ServiceDelivery} from './serviceTransport';
import {realmAtWar} from './wars';
import {canCommission,serviceApprover,serviceAuthority,serviceCapacity,serviceBudgetReason,payService,refundService,settleServiceRefund,serviceException,type ServiceMandate,type ServiceFunding,type ServiceRefund} from './serviceMandates';
import {awardDeed} from './deeds';
import {relationshipPersonById,relationshipPeople} from '../data/relationships';
import {serviceNeed,servicePolitics,serviceDomain,incidentChoices} from './serviceNeeds';
import {enactPoliticalAction} from './politicalActions';
import {allegianceRealm,officeCandidates} from './officeEligibility';
import {fiscalRecord} from './treasury';
import {awardInfluence} from './personalInfluence';
import {civicBuildings,officialDutyReason,dutyMinistries} from './officialDuties';
import {emptyCity} from './construction';
import {retinueBusy} from './retinue';
import {presentAt,personResidence} from './residence';
import {assignmentTemplates,assignmentPlans,careerNames,type AssignmentKind,type AssignmentPlan,type AssignmentPhase,type ServicePriority,servicePriorities} from '../data/assignments';
import {siteById} from '../data/scenario';
import {governmentOf,governingExecutives,politicalName} from './government';
import {realms,capital,type RealmId} from './realm';
import {lifeOf,isAlive,ageAt} from './lifeState';
import {attributes,traitsFor} from './social';
import {changeRelationOpinion,relationOpinion,opinionBreakdown} from './relationships';
import {lifestyleBonuses} from './lifestyle';
import {awardPrestige} from './family';
import {officeHierarchy} from './offices';
import {commissionedEnvoyReason,dispatchCommissionedEnvoy,atWar} from './diplomacy';
import {planRoute} from './world';
import type {World} from './types';
import {assignmentIncidentRisk} from './assignmentIncidentRisk';
export interface Council {season:number;priority:ServicePriority;decided:boolean;petitioned:string[];proposal:{actor:string;priority:ServicePriority;day:number}|null;completed:number;lastResult:string;reply:{actor:string;day:number;text:string}|null}
export interface Assignment {
 delivery?:ServiceDelivery;
 id:number;realm:RealmId;kind:AssignmentKind;site:string;target:RealmId|null;officer:string;credential:string|null;
 created:number;changed:number;deadline:number;travelAllowance?:number;season:number;phase:AssignmentPhase;plan:AssignmentPlan|null;
 mandate?:ServiceMandate;funding?:ServiceFunding[];refunds?:ServiceRefund[];
 extended?:boolean;quality?:number;spent?:{coins:number;grain:number};
 funds:{coins:number;grain:number};progress:number;required:number;started:boolean;incidentDone:boolean;aidRequested:boolean;
 helper:string|null;invitation:{person:string;day:number}|null;invited:string[];
 contributors:Record<string,{lead:number;support:number}>;
 result:null|{day:number;success:boolean;reason:string;effects:string[];awards:{person:string;merit:number;opinion:number;prestige:number}[]};
 history:{day:number;text:string}[];
}
export interface ServiceState {version:1;since:number;lastDay:number;enabled:boolean;nextId:number;councils:Record<RealmId,Council>;tasks:Assignment[];careers:Record<string,Record<ServicePriority,number>>;used:string[]}
export type ServiceCommand=
 {type:'service';action:'begin'|'council-accept'|'council-decline'}|
 {type:'service';action:'automation';id:number;enabled:boolean}|
 {type:'service';action:'priority';priority:ServicePriority}|
 {type:'service';action:'open';kind:AssignmentKind;site:string;officer:string;target?:RealmId}|
 {type:'service';action:'plan';id:number;plan:AssignmentPlan}|
 {type:'service';action:'invite'|'replace';id:number;person:string}|
 {type:'service';action:'extend'|'accept'|'decline'|'approve'|'revise'|'start'|'request-aid'|'grant'|'deny'|'spend'|'delay'|'strain'|'close'|'cancel'|'withdraw';id:number};
const clamp=(n:number,max=100,min=0)=>Math.max(min,Math.min(max,n));
export const serviceChief=(w:World,r:RealmId)=>governingExecutives(w,r)[0];
export const serviceRealm=(id:string,w?:World)=>w?allegianceRealm(w,id):relationshipPersonById[id]?.realm;
function newCouncil(day:number):Council{return {season:Math.floor(day/90),priority:'stability',decided:false,petitioned:[],proposal:null,completed:0,lastResult:'',reply:null};}
export function ensureService(w:World){if(w.mode!=='sandbox')return;return w.service??={version:1,since:w.day,lastDay:w.day,enabled:false,nextId:1,councils:{liang:newCouncil(w.day),east:newCouncil(w.day),west:newCouncil(w.day)},tasks:[],careers:Object.fromEntries(relationshipPeople.map(c=>[c.id,{economy:0,stability:0,military:0,diplomacy:0}])),used:[]};}
export const serviceTask=(w:World,id:number)=>w.service?.tasks.find(t=>t.id===id);
export function careerStanding(w:World,id:string,category:ServicePriority){const count=w.service?.careers[id]?.[category]??0,tier=count>=16?3:count>=8?2:count>=3?1:0;return {count,tier,name:careerNames[category][tier],bonus:tier*2};}
export function serviceBusy(w:World,id:string,except?:number){return !!w.diplomacy?.missions.some(m=>m.envoy===id)||!!w.militaryCampaigns?.items.some(q=>q.status==='active'&&q.commander===id)|| !!w.economy?.investigations.some(q=>q.inspector===id&&q.phase==='investigating')||retinueBusy(w,id)||!!w.mobility?.appointments[id]||!!w.mobility?.activities.some(a=>!['done','cancelled'].includes(a.phase)&&(a.actor===id&&!a.delegate||a.delegate===id))||(Object.values(w.mobility?.commanders??{}).includes(id)||Object.values(w.mobility?.armyCommanders??{}).includes(id))||!!w.service?.tasks.some(t=>t.id!==except&&t.phase!=='closed'&&(t.officer===id||t.helper===id))||!!(w.duties?.task&&w.duties.task.phase!=='closed'&&w.duties.task.officer===id);}
export function serviceCandidates(w:World,r:RealmId,except?:number){const chief=serviceChief(w,r);return officeCandidates(w,r).filter(c=>c.id!==chief&&isAlive(w,c.id)&&(ageAt(w,c.id)??0)>=16&&!w.social?.lineage.slice(0,-1).some(p=>p.id===c.id)&&!serviceBusy(w,c.id,except));}
export function recommendedPriority(w:World,r:RealmId):ServicePriority {const cities=Object.values(w.realm!.cities).filter(c=>c.owner===r);if(cities.some(c=>c.controller!==r)||realmAtWar(w,r))return 'military';if(cities.some(c=>c.order<55))return 'stability';if(w.realm!.treasuries[r].coins<300||cities.some(c=>c.prosperity<60))return 'economy';return 'diplomacy';}
export function serviceCredential(w:World,id:string){return officeHierarchy(w,id).find(n=>n.active&&n.holder===id&&(n.kind==='office'||n.kind==='city'))?.id??null;}
function humanPause(w:World,id:string){if(!isAlive(w,id))return '已故';if(w.social?.lineage.slice(0,-1).some(p=>p.id===id))return '已退居';if(lifeOf(w,id)?.illness?.severity===3)return '重病';if(id===w.characterId&&w.people[0].journey)return '正在出行';return '';}
export function assignmentRoute(w:World,t:Pick<Assignment,'realm'|'site'>){return w.realm?.cities[capital(t.realm)]?.controller===t.realm?planRoute(capital(t.realm),t.site,id=>w.realm?.cities[id]?.controller===t.realm):null;}
export function assignmentUnavailable(w:World,t:Assignment){if(allegianceRealm(w,t.officer)!==t.realm)return '承办人效忠已变，须改派';if(!isAlive(w,t.officer))return '承办人已故，须改派';if(w.social?.lineage.slice(0,-1).some(p=>p.id===t.officer))return '承办人已退居，须改派';if(officialDutyReason(w,t.officer,t.kind,t.site))return '承办人失去所需中央职掌，须改派';if(t.officer===serviceChief(w,t.realm))return '承办人已转任执政，须改派';if(t.credential&&!officeHierarchy(w,t.officer).some(n=>n.id===t.credential&&n.active&&n.holder===t.officer))return '承办人原职已变或失去控制，须重新委任';return '';}
export function assignmentPause(w:World,t:Assignment){if(t.phase==='closed')return '';if(!civilCanAdmin(w,t.officer,t.site))return '目的地由内战对方控制';const unavailable=assignmentUnavailable(w,t);if(unavailable)return unavailable;const delegated=!!w.mobility&&t.started&&!['training','inspection'].includes(t.kind)&&!!t.helper&&presentAt(w,t.helper,t.site)&&!humanPause(w,t.helper);const hp=humanPause(w,t.officer);if(hp&&!delegated&&t.phase!=='report')return '承办人'+hp;if(w.mobility&&['ready','working','incident','aid'].includes(t.phase)&&!presentAt(w,t.officer,t.site)&&!delegated)return '承办人须赴'+siteById[t.site].name+'，到场后办理';if(w.realm?.cities[t.site]?.controller!==t.realm||w.realm.cities[t.site].owner!==t.realm)return '目的城失去本国控制';if(t.phase!=='report'&&t.kind==='supply'&&supplyDepartureReason(w,t))return supplyDepartureReason(w,t);if(['training','supply'].includes(t.kind)&&!w.realm.armies.some(a=>actorCommandsSide(w,t.officer,a)&&a.location===t.site&&!a.journey))return '目的城没有本国驻军';if(t.kind==='recruitment'&&(w.realm.cities[t.site].population<700||w.realm.armies.filter(a=>a.realm===t.realm).length>=16&&!w.realm.armies.some(a=>actorCommandsSide(w,t.officer,a)&&a.location===t.site&&!a.journey&&a.troops<=5800)))return '征募须等待本国军队驻留且留有兵额，本城至少 700 人';if(t.kind==='envoy'&&t.target&&atWar(w,t.realm,t.target))return '两国交战，通使暂停';return '';}
export function assignmentBudget(kind:AssignmentKind,plan:AssignmentPlan){const d=assignmentTemplates[kind],rate=assignmentPlans[plan].cost;return {coins:Math.ceil(d.coins*rate/100),grain:Math.ceil(d.grain*rate/100)};}
export function servicePriorityEffort(w:World,r:RealmId,kind:AssignmentKind){const c=w.service?.councils[r];return c?.decided?(c.priority===assignmentTemplates[kind].category?1:-1):0;}
export function assignmentPlanQuote(w:World,t:Pick<Assignment,'officer'|'helper'|'site'|'realm'|'kind'>,plan:AssignmentPlan){const d=assignmentTemplates[t.kind],b=assignmentBudget(t.kind,plan),work=Math.ceil(d.work*assignmentPlans[plan].work/100)+(t.kind==='supply'?(assignmentRoute(w,t)?.days??0)*4:0),effort=assignmentEffort(w,t).total;return {...b,work,effort,days:Math.ceil(work/effort),quality:plan==='thorough'?115:plan==='urgent'?85:100};}
export function assignmentEffort(w:World,t:Pick<Assignment,'officer'|'helper'|'site'|'realm'|'kind'>){const executor=w.mobility&&(!presentAt(w,t.officer,t.site)||!!humanPause(w,t.officer))&&t.helper&&presentAt(w,t.helper,t.site)&&!humanPause(w,t.helper)?t.helper:t.officer;const d=assignmentTemplates[t.kind],skill=attributes(w,executor)[d.skill],bonuses=lifestyleBonuses(w,executor),helper=t.helper&&executor!==t.helper&&!humanPause(w,t.helper)&&(!w.mobility||presentAt(w,t.helper,t.site))?t.helper:null;const parts=[{label:'基本办理',value:4},{label:'季议资源倾斜',value:servicePriorityEffort(w,t.realm,t.kind)},{label:'集团支持与阻力',value:servicePolitics(w,t.realm,t.kind).effort},{label:'人物能力',value:Math.floor(skill/4)},{label:'勤勉',value:traitsFor(w,executor).includes('diligent')?2:0},{label:'生涯名望',value:careerStanding(w,executor,d.category).bonus},{label:'生活重心',value:Math.min(3,Math.floor((d.category==='military'?bonuses.attack+bonuses.supply:d.category==='diplomacy'?bonuses.acceptance:bonuses.buildTime+bonuses.tax+bonuses.grain)/5))},{label:'同伴协作',value:helper?Math.max(1,Math.floor(attributes(w,helper)[d.skill]/6)+(relationOpinion(w,t.officer,helper)>=40?1:0)):0},{label:'身体与压力',value:-(lifeOf(w,executor)?.illness?.severity??0)-(executor===w.characterId&&(w.social?.stress??0)>=80?2:0)}];return {parts,total:Math.max(1,parts.reduce((n,p)=>n+p.value,0)),helper,executor};}
export function serviceAttention(w:World){if(!w.service?.enabled||!w.characterId)return [];const id=w.characterId,r=serviceRealm(id,w);if(!r)return [];const s=w.service,keys:string[]=[];if(s.councils[r].reply?.actor===id)keys.push('council-reply:'+r+':'+s.councils[r].reply!.day);if(serviceChief(w,r)===id&&(!s.councils[r].decided||s.councils[r].proposal))keys.push('council:'+r+':'+s.councils[r].season);for(const t of s.tasks){if(t.phase==='closed')continue;const chief=serviceApprover(w,t)===id&&(serviceException(w,t)||!!assignmentUnavailable(w,t));if(t.invitation?.person===id)keys.push('invite:'+t.id+':'+t.invitation.day);if(chief&&(assignmentUnavailable(w,t)||['petition','approval','aid','report'].includes(t.phase))||t.officer===id&&['proposal','ready','incident'].includes(t.phase)||t.helper===id&&t.phase==='incident'&&!!w.mobility&&!presentAt(w,t.officer,t.site)&&presentAt(w,id,t.site)&&!['training','inspection'].includes(t.kind))keys.push('task:'+t.id+':'+t.phase+':'+t.changed+':'+t.officer);}return keys;}
function log(w:World,t:Assignment,text:string){t.history.push({day:w.day,text});t.history=t.history.slice(-32);if(t.officer===w.characterId||serviceApprover(w,t)===w.characterId||t.helper===w.characterId||Object.hasOwn(t.contributors,w.characterId??''))w.chronicle.push({day:w.day,person:'player',text:siteById[t.site].name+assignmentTemplates[t.kind].name+'：'+text});w.chronicle=w.chronicle.slice(-100);}
function phase(w:World,t:Assignment,p:AssignmentPhase){t.phase=p;t.changed=w.day;}
const slotKey=(r:RealmId,kind:AssignmentKind,site:string,target:RealmId|null,season:number)=>[season,r,kind,site,target??''].join('|');
export function serviceReason(w:World,c:ServiceCommand,actor=w.characterId):string {
 if(w.mode!=='sandbox'||!w.realm||w.campaign?.status!=='active'||!actor||!relationshipPersonById[actor]||!isAlive(w,actor))return '在世历史人物可在沙盒中办理';
 if('site'in c&&typeof c.site==='string'&&!civilCanAdmin(w,actor,c.site))return '该地由内战对方控制';
 const s=w.service,r=serviceRealm(actor,w)!;if(c.action==='begin')return s?.enabled?'已在参与评议':'';if(!s||!s.enabled&&actor===w.characterId)return '请先赴任议事';
 if(c.action==='priority'){if(!Object.hasOwn(servicePriorities,c.priority))return '未知评议目标';if(serviceChief(w,r)===actor&&s.councils[r].decided)return '本季目标已经议定';if(s.councils[r].petitioned.includes(actor))return '本季已上书议事';if(s.councils[r].proposal)return '已有上书待议';return '';}
 if(c.action==='council-accept'||c.action==='council-decline')return serviceChief(w,r)!==actor?'须由主管裁决':!s.councils[r].proposal?'没有待议的上书':'';
 if(c.action==='open'){
  if(!Object.hasOwn(assignmentTemplates,c.kind)||!Object.hasOwn(siteById,c.site))return '无效差事或城市';
  if(w.realm.cities[c.site].owner!==r||w.realm.cities[c.site].controller!==r)return '只能办理本国法理及控制下的城市';
  if(!civilCanAdmin(w,c.officer,c.site))return '承办人与目的地分属内战双方';
  if(c.officer!==actor&&!canCommission(w,actor,r,c.site,c.kind))return '只能在职掌辖区委任他人，其他地区须自荐';
  if(!serviceCandidates(w,r).some(p=>p.id===c.officer))return '承办人须为本国可用人物，且不能兼办另一差事';
  const approver=serviceApprover(w,{realm:r,site:c.site,kind:c.kind,officer:c.officer,mandate:c.officer!==actor?{issuer:actor,automatic:false,orderFloor:40,qualityFloor:85,reserve:0}:undefined});
  if(!approver)return '主管席位空缺';
  if(s.tasks.filter(t=>t.phase!=='closed'&&serviceApprover(w,t)===approver).length>=serviceCapacity(w,approver,r))return '主管承办能力已满，须增补有俸禄的官署或幕府人员';
  if(s.tasks.filter(t=>t.phase!=='closed'&&t.realm===r).length>=128||s.tasks.filter(t=>t.phase!=='closed'||t.refunds?.length).length>=208)return '旧案尚待退款，须先清理专款';
  if(s.tasks.some(t=>t.phase!=='closed'&&t.realm===r&&t.kind===c.kind&&t.site===c.site))return '同城同类差事正在办理';
  if(s.used.includes(slotKey(r,c.kind,c.site,c.target??null,s.councils[r].season)))return '本季已经受理过这项差事';
  if(['training','supply'].includes(c.kind)&&!w.realm.armies.some(a=>actorCommandsSide(w,c.officer,a)&&a.location===c.site&&!a.journey))return '须选择有本国驻军的城市';
  if(officialDutyReason(w,c.officer,c.kind,c.site))return officialDutyReason(w,c.officer,c.kind,c.site);
  const building=civicBuildings[c.kind as keyof typeof civicBuildings];
  if(building){if((w.holdings.cities[c.site]?.levels[building]??0)>=3)return '建筑已达最高等级';if(w.holdings.cities[c.site]?.project||s.tasks.some(t=>t.phase!=='closed'&&t.site===c.site&&Object.hasOwn(civicBuildings,t.kind)))return '本城已有营建工程';}
  if(c.kind==='recruitment'&&(w.realm.cities[c.site].population<700||w.realm.armies.filter(a=>a.realm===r).length>=16&&!w.realm.armies.some(a=>actorCommandsSide(w,c.officer,a)&&a.location===c.site&&!a.journey&&a.troops<=5800)))return '须选择军队驻地且兵员未满；本城至少 700 人';
  if(c.kind==='envoy'&&(!c.target||!realms.includes(c.target)||c.target===r||atWar(w,r,c.target)))return '须选择未与本国交战的另一政权';
  if(c.kind!=='envoy'&&c.target!==undefined)return '此差事无需指定他国';
  return serviceChief(w,r)?'':'执政席位空缺';
 }
 if(!('id'in c))return '未知差事行动';
 const t=serviceTask(w,c.id);if(!t||t.phase==='closed')return '差事已结案或不存在';if(r!==t.realm)return '不能办理他国差事';
 const chief=serviceAuthority(w,t,actor),officer=actor===t.officer||!!w.mobility&&t.started&&actor===t.helper&&presentAt(w,actor!,t.site)&&!presentAt(w,t.officer,t.site)&&!['training','inspection'].includes(t.kind);
 if(c.action==='automation')return !chief?'须由主管设置授权':typeof c.enabled!=='boolean'?'无效授权':'';
 if(c.action==='extend')return !chief?'须由主管批准延期':t.extended?'本案已经延期':!t.started||t.phase==='report'?'仅办理中的差事可延期':'';
 if(c.action==='accept'||c.action==='decline')return t.invitation?.person!==actor?'没有发给你的协办邀请':c.action==='accept'&&(serviceBusy(w,actor,t.id)||humanPause(w,actor))?'你暂时不能参与协办':'';
 if(c.action==='withdraw')return t.helper===actor?'':'你不是此案协办人';
 if(c.action==='replace')return !chief?'须由主管改派':!serviceCandidates(w,r,t.id).some(p=>p.id===c.person)||!!officialDutyReason(w,c.person,t.kind,t.site)||c.person===t.helper?'该人物无法接任':'';
 if(c.action==='cancel')return chief||officer&&['petition','proposal','approval'].includes(t.phase)?'':'须由主管撤回';
 if(c.action==='invite'){if(!officer)return '须由承办人邀请';if(!['proposal','approval','ready','working'].includes(t.phase))return '当前阶段不能邀请协办';if(t.helper||t.invitation)return '已有协办人或待答邀请';return c.person===t.officer||t.invited.includes(c.person)||!serviceCandidates(w,r,t.id).some(p=>p.id===c.person)?'此人无法接受邀请':'';}
 if(['approve','revise','grant','deny','close'].includes(c.action)&&!chief)return '须由主管裁决';
 if(['plan','start','request-aid','spend','delay','strain'].includes(c.action)&&!officer)return '须由承办人办理';
 const expected:Partial<Record<ServiceCommand['action'],AssignmentPhase[]>>={plan:['proposal'],approve:['petition','approval'],revise:['approval'],start:['ready'],'request-aid':['incident'],grant:['aid'],deny:['aid'],spend:['incident'],delay:['incident'],strain:['incident'],close:['report']};if(!expected[c.action]?.includes(t.phase))return '差事阶段已经变化';
 if(c.action==='start'&&supplyDepartureReason(w,t))return supplyDepartureReason(w,t);
 if(c.action==='plan')return !Object.hasOwn(assignmentPlans,c.plan)?'未知方案':coordinatedPlanReason(w,t.id,c.plan);
 if(c.action==='approve'&&t.phase==='approval'){const b=assignmentBudget(t.kind,t.plan!);const reason=serviceBudgetReason(w,t,b.coins,b.grain,actor);if(reason)return reason;}
 if(c.action==='request-aid'&&t.aidRequested)return '已请求追加，请选择其他办法';
 if(c.action==='grant'){const reason=serviceBudgetReason(w,t,20,0,actor);if(reason)return reason;}
 if(c.action==='spend'&&(!assignmentRoute(w,t)||w.realm.cities[t.site].order<25))return '道路或地方执行受阻，经费不能替代疏通与协商';
 if(c.action==='spend'&&t.funds.coins<assignmentBudget(t.kind,t.plan!).coins+20)return '须先获批追加公款 20';
 if(['start','spend','delay','strain','close'].includes(c.action)){const pause=assignmentPause(w,t);if(pause)return pause;}
 if(c.action==='close'&&t.kind==='envoy'&&t.target){const reason=commissionedEnvoyReason(w,t.realm,t.target);if(reason)return reason;}
 if(c.action==='strain'&&actor===w.characterId&&(w.social?.stress??0)>80)return '压力过高，不能再强行督办';
 return '';
}
function finish(w:World,t:Assignment,success:boolean,reason:string){
 if(t.result)return;if(success&&t.kind==='supply'&&!t.delivery?.delivered){success=false;reason='没有实际驻军接收凭证，不计转运军功';}const s=w.service!,g=governmentOf(w,t.realm)!,chief=serviceApprover(w,t),city=w.realm!.cities[t.site],treasury=w.realm!.treasuries[t.realm],d=assignmentTemplates[t.kind],effects:string[]=[],awards:NonNullable<Assignment['result']>['awards']=[];
 const change=(object:Record<string,number>,key:string,delta:number,label:string,max=100,min=0)=>{const before=object[key];object[key]=clamp(before+delta,max,min);effects.push(label+' '+(object[key]-before>=0?'+':'')+(object[key]-before));};
 const fraction=t.started?Math.min(1,t.progress/Math.max(1,t.required)):0,spent=Math.max(t.spent?.coins??0,Math.ceil(t.funds.coins*fraction)),unused=t.funds.coins-spent,spentGrain=Math.max(t.spent?.grain??0,Math.ceil(t.funds.grain*fraction)),unusedGrain=t.funds.grain-spentGrain;
 t.spent={coins:spent,grain:spentGrain};
 fiscalRecord(w,t.realm,'task:'+t.id,'expense',spent,'差事实际支出');refundService(w,t,unused,unusedGrain);
 const pending=t.refunds?.reduce((n,p)=>n+p.coins+p.grain,0)??0;
 effects.push('进度 '+Math.round(fraction*100)+'%；实际支出 '+spent+'，未用公款 '+unused+' / 公粮 '+unusedGrain+' 原路退回'+(pending?'；库容或失守待退 '+pending:'')+'；成果质量 '+(t.quality??100)+'%；'+(w.day<=t.deadline?'按期':'逾期'));
 if(!success&&fraction>=.25&&city.controller===t.realm){const partial=Math.floor(8*fraction);if(['relief','inspection'].includes(t.kind)){city.order=Math.min(100,city.order+partial);effects.push('已完成部分保留：秩序 +'+partial);}if(['agriculture','greatworks','commerce'].includes(t.kind)){city.prosperity=Math.min(100,city.prosperity+partial);effects.push('已完成部分保留：繁荣 +'+partial);}}
 if(success){
  const c=city as unknown as Record<string,number>,army=w.realm!.armies.find(a=>actorCommandsSide(w,t.officer,a)&&a.location===t.site&&!a.journey);
  if(t.kind==='relief'){city.grain=Math.min(1_000_000,city.grain+Math.floor(t.funds.grain*.75));change(c,'order',Math.round(14*(t.quality??100)/100),'城市秩序');}
  if(t.kind==='agriculture'){change(c,'prosperity',Math.round(10*(t.quality??100)/100),'城市繁荣');change(c,'irrigation',1,'水利',10);}
  if(t.kind==='commerce'){change(c,'prosperity',Math.round(8*(t.quality??100)/100),'城市繁荣');change(treasury as unknown as Record<string,number>,'coins',85,'市务回款',1_000_000);}
  if(t.kind==='inspection'){change(c,'order',10,'城市秩序');if(g.court)change(g.court as unknown as Record<string,number>,'corruption',-8,'朝廷积弊');}
  if(t.kind==='training'&&army){change(army as unknown as Record<string,number>,'morale',18,'驻军士气');for(const u of army.regiments??[])u.experience=Math.min(100,u.experience+10);effects.push('兵团经验 +10（最高 100）');}
  if(t.kind==='supply')effects.push('军粮实发 '+(t.delivery?.sent??0)+'、抵达 '+(t.delivery?.arrived??0)+'、驻军有效补给 '+(t.delivery?.delivered??0)+'、损耗 '+(t.delivery?.lost??0));
  if(t.kind==='envoy'&&t.target){dispatchCommissionedEnvoy(w,t.realm,t.target);effects.push('修好使团已出发，等候对方答复');}
  const building=civicBuildings[t.kind as keyof typeof civicBuildings];
  if(building){const holding=w.holdings.cities[t.site]??=emptyCity();const before=holding.levels[building];holding.levels[building]=Math.min(3,before+1);effects.push('城市建筑提升 '+(holding.levels[building]-before)+' 级');}
  if(t.kind==='greatworks'){change(c,'prosperity',20,'城市繁荣');change(c,'order',10,'城市秩序');change(c,'irrigation',2,'水利',10);}
  if(t.kind==='taxation'){const amount=Math.max(30,Math.min(150,Math.floor(city.population/50*(city.tax==='light'?.7:city.tax==='heavy'?1.4:1))));change(treasury as unknown as Record<string,number>,'coins',amount,'追征税款',1_000_000);change(c,'order',-5,'城市秩序');}
  if(t.kind==='recruitment'){const existing=w.realm!.armies.find(a=>actorCommandsSide(w,t.officer,a)&&a.location===t.site&&!a.journey&&a.troops<=5800),recruits=Math.max(0,Math.min(200,6000-(existing?.troops??0),city.population-100));if(existing&&existing.location===t.site&&!existing.journey){change(existing as unknown as Record<string,number>,'troops',recruits,'驻军兵员',6000,100);existing.trainingStarted=w.day;existing.trainingUntil=w.day+30;}else if(!existing&&recruits>=100){w.realm!.armies.push({trainingStarted:w.day,trainingUntil:w.day+30,realm:t.realm,location:t.site,troops:recruits,morale:80,supply:Math.min(80,t.funds.grain),journey:null,siege:0});ensureArmyOrganization(w);const revolt=civilWar(w,t.realm);if(revolt?.civil?.supporters.includes(t.officer))revolt.civil.armies.push(w.realm!.armies.at(-1)!.id!);effects.push('组建驻军 '+recruits+' 人');}change(c,'population',-recruits,'征募人口',1_000_000,100);change(c,'order',-5,'城市秩序');}
  s.councils[t.realm].completed++;
 }else if(city.controller===t.realm)change(city as unknown as Record<string,number>,'order',-5,'城市秩序');
 const totalLead=Object.values(t.contributors).reduce((n,c)=>n+c.lead,0)||1,totalSupport=Object.values(t.contributors).reduce((n,c)=>n+c.support,0)||1;
 for(const [person,contribution] of Object.entries(t.contributors)){
  if(!isAlive(w,person)||contribution.lead+contribution.support<=0)continue;
  const base=Math.round((s.councils[t.realm].priority===d.category?24:20)*(t.quality??100)/100),merit=success?Math.floor(base*contribution.lead/totalLead+6*contribution.support/totalSupport):-Math.ceil(4*contribution.lead/totalLead),old=g.merit[person]??0;
  awardDeed(w,t.realm,person,'assignment:'+t.id,merit,assignmentTemplates[t.kind].name+'结案；质量 '+(t.quality??100)+'，承担主办 '+contribution.lead+'、协办 '+contribution.support,chief?{task:t.id,site:t.site,issuer:t.mandate?.issuer??chief,assessor:chief,allocated:{...t.funds},spent:{...t.spent!},quality:t.quality??100,progress:Math.round(fraction*100),effects:[...effects],contributors:Object.entries(t.contributors).map(([person,c])=>({person,...c}))}:undefined);const memoryBefore=chief?opinionBreakdown(w,person,chief).parts[1].value:0,opinion=success?8:-5;
  if(chief&&chief!==person){changeRelationOpinion(w,person,chief,opinion);changeRelationOpinion(w,chief,person,opinion);}
  const prestigeBefore=w.families?.prestige[person]??0;
  if(success){awardInfluence(w,person,Math.max(1,Math.floor(merit/2)));awardPrestige(w,person,'service');(s.careers[person]??={economy:0,stability:0,military:0,diplomacy:0})[d.category]=clamp((s.careers[person]??={economy:0,stability:0,military:0,diplomacy:0})[d.category]+1,100000);}
  awards.push({person,merit:g.merit[person]-old,opinion:chief?opinionBreakdown(w,person,chief).parts[1].value-memoryBefore:0,prestige:(w.families?.prestige[person]??0)-prestigeBefore});
 }
 const participants=Object.keys(t.contributors).filter(id=>isAlive(w,id));if(success)for(let i=0;i<participants.length;i++)for(const other of participants.slice(i+1)){changeRelationOpinion(w,participants[i],other,5);changeRelationOpinion(w,other,participants[i],5);}
 t.result={day:w.day,success,reason,effects,awards};t.invitation=null;t.helper=null;phase(w,t,'closed');log(w,t,reason+'；'+effects.join('，')+'。');
}
export function actService(w:World,c:ServiceCommand,actor=w.characterId){
 const reason=serviceReason(w,c,actor);if(reason)throw new Error(reason);const s=ensureService(w)!,r=serviceRealm(actor!,w)!;
 if(c.action==='begin'){s.enabled=true;s.lastDay=w.day;for(const realm of realms){s.councils[realm].season=Math.floor(w.day/90);s.councils[realm].priority=recommendedPriority(w,realm);s.councils[realm].decided=serviceChief(w,realm)!==actor;}return;}
 if(c.action==='priority'){const council=s.councils[r];if(serviceChief(w,r)===actor){council.priority=c.priority;council.decided=true;}else {council.proposal={actor:actor!,priority:c.priority,day:w.day};council.petitioned.push(actor!);}return;}
 if(c.action==='council-accept'||c.action==='council-decline'){const council=s.councils[r];if(c.action==='council-accept')council.priority=council.proposal!.priority;council.reply={actor:council.proposal!.actor,day:w.day,text:c.action==='council-accept'?'上书获准，重心已调整。':'朝廷维持原议。'};council.proposal=null;council.decided=true;return;}
 if(c.action==='open'){
  s.tasks=s.tasks.filter(t=>t.phase!=='closed'||t.refunds?.length).concat(s.tasks.filter(t=>t.phase==='closed'&&!t.refunds?.length).slice(-48));
  const t:Assignment={id:s.nextId++,mandate:{issuer:canCommission(w,actor!,r,c.site,c.kind)&&actor!==c.officer?actor!:serviceApprover(w,{realm:r,site:c.site,kind:c.kind,officer:c.officer})!,automatic:false,orderFloor:40,qualityFloor:85,reserve:0},realm:r,kind:c.kind,site:c.site,target:c.target??null,officer:c.officer,credential:serviceCredential(w,c.officer),created:w.day,changed:w.day,travelAllowance:planRoute(personResidence(w,c.officer).site,c.site)?.days??0,deadline:w.day+Math.max(120,Math.ceil(assignmentTemplates[c.kind].work/3)+30)+(planRoute(personResidence(w,c.officer).site,c.site)?.days??0),season:s.councils[r].season,phase:canCommission(w,actor!,r,c.site,c.kind)&&actor!==c.officer||dutyMinistries[c.kind]&&!officialDutyReason(w,actor!,c.kind,c.site)?'proposal':'petition',plan:null,funds:{coins:0,grain:0},progress:0,required:0,started:false,incidentDone:false,aidRequested:false,helper:null,invitation:null,invited:[],contributors:{},result:null,history:[]};s.tasks.push(t);s.used.push(slotKey(r,c.kind,c.site,c.target??null,t.season));log(w,t,politicalName(actor!)+(t.phase==='petition'?'自荐办理，请执政者批示。':'委派'+politicalName(t.officer)+'拟定方案，路程另计，依差事规模核定限期。'));return;
 }
 if(!('id'in c))throw new Error('未知差事行动');
 const t=serviceTask(w,c.id)!;
 switch(c.action){
 case 'automation':t.mandate={issuer:serviceApprover(w,t)!,automatic:c.enabled,orderFloor:40,qualityFloor:85,reserve:0};t.changed=w.day;log(w,t,c.enabled?'授权常额内例行审批；低于秩序 40、质量 85 或追加预算仍须请示。':'改为逐项请示。');break;
 case 'extend':t.extended=true;t.deadline+=30;t.quality=Math.max(50,(t.quality??100)-5);governmentOf(w,t.realm)!.support=Math.max(0,governmentOf(w,t.realm)!.support-3);t.changed=w.day;log(w,t,'获准延期 30 日，朝野支持 −3，考绩质量 −5。');break;
 case 'plan':t.plan=c.plan;t.quality=c.plan==='thorough'?115:c.plan==='urgent'?85:100;phase(w,t,'approval');log(w,t,'呈请「'+assignmentPlans[c.plan].name+'」，预算公款 '+assignmentBudget(t.kind,c.plan).coins+'、公粮 '+assignmentBudget(t.kind,c.plan).grain+'。');break;
 case 'approve':if(t.phase==='petition'){phase(w,t,'proposal');log(w,t,'准予请命，请拟议办理方案。');}else{const b=assignmentBudget(t.kind,t.plan!);payService(w,t,b.coins,b.grain,actor!);t.funds=b;phase(w,t,'ready');log(w,t,'预算获准，专款已拨付。');}break;
 case 'revise':t.plan=null;phase(w,t,'proposal');log(w,t,'方案退回重拟，尚未拨款。');break;
 case 'start':dispatchServiceGrain(w,t);enactPoliticalAction(w,t.realm,serviceDomain(t.kind));t.started=true;t.required=assignmentPlanQuote(w,t,t.plan!).work;phase(w,t,'working');log(w,t,'差事启办；总工作量 '+t.required+'，按实际能力和协作逐日办理。');break;
 case 'invite':t.invitation={person:c.person,day:w.day};t.invited.push(c.person);log(w,t,'邀请'+politicalName(c.person)+'协办，等待答复。');break;
 case 'accept':t.helper=actor!;t.invitation=null;log(w,t,politicalName(actor!)+'接受协办邀请。');break;
 case 'decline':t.invitation=null;log(w,t,politicalName(actor!)+'婉拒协办邀请。');break;
 case 'withdraw':t.helper=null;log(w,t,politicalName(actor!)+'退出协办，既有贡献保留。');break;
 case 'replace':log(w,t,'改委'+politicalName(c.person)+'，钱粮与进度保留，考绩按实际贡献分配。');t.officer=c.person;t.credential=serviceCredential(w,c.person);if(t.invitation?.person===c.person)t.invitation=null;t.changed=w.day;break;
 case 'request-aid':t.aidRequested=true;phase(w,t,'aid');log(w,t,'承办人请增拨公款 20，排除办理阻碍。');break;
 case 'grant':payService(w,t,20,0,actor!);t.funds.coins+=20;phase(w,t,'incident');log(w,t,'增拨公款 20 已获准。');break;
 case 'deny':phase(w,t,'incident');log(w,t,'未获追加，请另择办法。');break;
 case 'spend':if(t.kind==='inspection'){const court=governmentOf(w,t.realm)?.court;if(court){court.corruption=Math.max(0,court.corruption-3);court.tension=Math.min(100,court.tension+5);}}if(t.kind==='envoy'&&t.target){changeRelationOpinion(w,t.officer,serviceChief(w,t.target)??t.officer,-3);}t.quality=Math.max(50,(t.quality??100)-5);w.realm!.cities[t.site].order=Math.max(0,w.realm!.cities[t.site].order-3);t.incidentDone=true;phase(w,t,'working');log(w,t,'动用追加款排除阻碍，工期不变。');break;
 case 'delay':t.quality=Math.min(130,(t.quality??100)+10);t.incidentDone=true;t.required+=40;phase(w,t,'working');log(w,t,'缓办疏通，追加工作量 40，不再花费钱粮。');break;
 case 'strain':w.realm!.cities[t.site].order=Math.max(0,w.realm!.cities[t.site].order-8);t.quality=Math.max(50,(t.quality??100)-15);t.incidentDone=true;t.required+=10;if(actor===w.characterId&&w.social)w.social.stress=clamp(w.social.stress+18);else {t.required+=20;}phase(w,t,'working');log(w,t,actor===w.characterId?'亲自督办，压力 +18，追加工作量 10。':'加紧督办，追加工作量 30。');break;
 case 'close':finish(w,t,true,'办结，考绩核定');break;
 case 'cancel':finish(w,t,false,t.phase==='petition'?'请命未准':'差事撤回');break;
 }
}
function chooseNPCPlan(w:World,t:Assignment):AssignmentPlan{return traitsFor(w,t.officer).includes('frugal')?'thorough':assignmentTemplates[t.kind].category==='military'&&realmAtWar(w,t.realm)?'urgent':'balanced';}
export function assignmentOptions(w:World,r:RealmId){const cities=Object.entries(w.realm!.cities).filter(([,c])=>c.owner===r&&c.controller===r).sort((a,b)=>a[1].order+a[1].prosperity-b[1].order-b[1].prosperity);const priority=w.service?.councils[r].priority??recommendedPriority(w,r);return (Object.keys(assignmentTemplates) as AssignmentKind[]).sort((a,b)=>Number(assignmentTemplates[b].category===priority)-Number(assignmentTemplates[a].category===priority)).flatMap(kind=>{const eligible=['training','supply'].includes(kind)?cities.filter(([id])=>w.realm!.armies.some(a=>a.realm===r&&a.location===id&&!a.journey)):kind==='envoy'?cities.filter(([id])=>id===capital(r)):cities;return eligible.flatMap<{kind:AssignmentKind;site:string;target?:RealmId}>(([site])=>kind==='envoy'?realms.filter(target=>target!==r&&!atWar(w,r,target)).map(target=>({kind,site,target})): [{kind,site}]);}).map(option=>({option,score:serviceNeed(w,option.kind,option.site).score})).sort((a,b)=>b.score-a.score).map(row=>row.option);}
export function advanceService(w:World){
 const s=ensureService(w);if(!s||!w.realm||w.campaign?.status!=='active'||s.lastDay>=w.day)return;s.lastDay=w.day;
 for(const r of realms){if(w.realm.annexed?.[r])continue;const c=s.councils[r],chief=serviceChief(w,r),season=Math.floor(w.day/90);
  if(c.season<season){const met=c.completed>=2;c.lastResult=`上季办结 ${c.completed} 项，${met?'达到两项之约':'未达两项之约'}。`;const g=governmentOf(w,r)!;g.support=clamp(g.support+(met?3:-2));c.season=season;c.completed=0;c.priority=recommendedPriority(w,r);c.decided=chief!==w.characterId;c.proposal=null;c.petitioned=[];c.reply=null;}
  if(c.proposal&&chief!==w.characterId&&w.day-c.proposal.day>=2){const proposal=c.proposal;c.priority=relationOpinion(w,proposal.actor,chief??proposal.actor)>=0?proposal.priority:recommendedPriority(w,r);c.decided=true;c.reply={actor:proposal.actor,day:w.day,text:c.priority===proposal.priority?'上书获准，重心已调整。':'朝廷依局势维持原议。'};c.proposal=null;}
  if(!c.decided&&chief!==w.characterId){c.priority=recommendedPriority(w,r);c.decided=true;}
 }
 s.used=s.used.filter(key=>Number(key.split('|')[0])>=Math.floor(w.day/90)-1);
 for(const t of s.tasks){
  if(t.phase==='closed'){if(t.refunds?.length)settleServiceRefund(w,t);continue;}
  if(t.started&&t.phase!=='report'&&!t.extended&&t.deadline-w.day<15&&t.progress>t.required/2&&serviceApprover(w,t)!==w.characterId){const chief=serviceApprover(w,t);if(chief&&!serviceReason(w,{type:'service',action:'extend',id:t.id},chief))actService(w,{type:'service',action:'extend',id:t.id},chief);}
  if(w.day>=t.deadline){finish(w,t,false,'逾期未能办结');continue;}
  const chief=serviceApprover(w,t);
  if(t.helper&&(!isAlive(w,t.helper)||w.social?.lineage.slice(0,-1).some(p=>p.id===t.helper))){log(w,t,politicalName(t.helper)+'不再协办，既有贡献保留。');t.helper=null;}
  if(t.invitation&&(!isAlive(w,t.invitation.person)||w.social?.lineage.slice(0,-1).some(p=>p.id===t.invitation!.person)))t.invitation=null;
  if(t.invitation&&w.day-t.invitation.day>=2&&t.invitation.person!==w.characterId){const person=t.invitation.person,accept=!serviceBusy(w,person,t.id)&&!humanPause(w,person)&&relationOpinion(w,t.officer,person)>=0;actService(w,{type:'service',action:accept?'accept':'decline',id:t.id},person);}
  if(assignmentUnavailable(w,t)){if(chief&&chief!==w.characterId){const next=serviceCandidates(w,t.realm,t.id).find(c=>c.id!==t.officer&&c.id!==t.helper&&c.id!==w.characterId&&!officialDutyReason(w,c.id,t.kind,t.site));if(next)actService(w,{type:'service',action:'replace',id:t.id,person:next.id},chief);}continue;}
  if(t.phase==='working'&&!assignmentPause(w,t)){
   if(t.kind==='supply'&&!t.delivery){if(supplyDepartureReason(w,t))continue;dispatchServiceGrain(w,t);}
   const effort=assignmentEffort(w,t),step=Math.min(effort.total,t.required-t.progress),helperPoints=Math.min(step,effort.parts.find(p=>p.label==='同伴协作')!.value);t.progress+=step;t.spent={coins:Math.max(t.spent?.coins??0,Math.ceil(t.funds.coins*t.progress/t.required)),grain:Math.max(t.spent?.grain??0,Math.ceil(t.funds.grain*t.progress/t.required))};
   (t.contributors[effort.executor]??={lead:0,support:0}).lead+=step-helperPoints;
   if(effort.helper)(t.contributors[effort.helper]??={lead:0,support:0}).support+=helperPoints;
   if(!t.incidentDone&&t.progress>=Math.ceil(t.required/2)&&assignmentIncidentRisk(t,w.realm!.cities[t.site].order)){phase(w,t,'incident');log(w,t,t.kind==='envoy'?'使节礼仪与国书措辞尚待协调。':t.kind==='inspection'?'地方官吏推诿，巡察受阻。':t.kind==='training'?'军伍调度不齐，操练受阻。':incidentChoices(t.kind).spend+'；'+incidentChoices(t.kind).delay+'；'+incidentChoices(t.kind).strain);continue;}
   if(!t.incidentDone&&t.progress>=Math.ceil(t.required/2))t.incidentDone=true;
   if(t.progress>=t.required){if(t.kind==='supply'&&t.delivery?.status==='traveling')continue;if(t.kind==='supply'&&t.delivery&&!t.delivery.delivered){finish(w,t,false,'粮队未形成有效驻军补给，不计军功');continue;}phase(w,t,'report');log(w,t,'办理完成，呈报考绩。');continue;}
  }
  if(w.day-t.changed<2)continue;
  if(t.phase==='proposal'&&t.officer!==w.characterId&&!t.helper&&!t.invitation&&!t.invited.length){const candidate=serviceCandidates(w,t.realm,t.id).sort((a,b)=>Number(b.id===w.characterId)-Number(a.id===w.characterId)).find(c=>c.id!==t.officer&&!humanPause(w,c.id)&&relationOpinion(w,t.officer,c.id)>=0);if(candidate&&(s.enabled||candidate.id!==w.characterId))actService(w,{type:'service',action:'invite',id:t.id,person:candidate.id},t.officer);}
  if(t.phase==='approval'&&chief&&chief!==w.characterId&&t.plan){const payer=servicePayer(w,t,chief),need=assignmentBudget(t.kind,t.plan).coins-publicBalance(w,payer.account);if(need>0)requestAccountFunding(w,chief,payer.account,need,assignmentTemplates[t.kind].category==='military'?'military':'construction');}
  let action:ServiceCommand|undefined,actor:string|undefined;
  if(['petition','approval'].includes(t.phase)&&(chief!==w.characterId||!serviceException(w,t))){actor=chief;action={type:'service',action:'approve',id:t.id};}
  else if(t.phase==='proposal'&&t.officer!==w.characterId){actor=t.officer;action={type:'service',action:'plan',id:t.id,plan:(()=>{const preferred=chooseNPCPlan(w,t),p=w.coordinatedService?.items.find(p=>p.tasks.includes(t.id));return p&&!programmePlans(p.policy).includes(preferred)?programmePlans(p.policy)[0]:preferred;})()};}
  else if(t.phase==='ready'&&t.officer!==w.characterId){actor=t.officer;action={type:'service',action:'start',id:t.id};}
  else if(t.phase==='incident'&&(t.officer!==w.characterId||!!w.mobility&&!presentAt(w,t.officer,t.site)&&!!t.helper&&presentAt(w,t.helper,t.site)&&!['training','inspection'].includes(t.kind))){actor=t.helper&&w.mobility&&!presentAt(w,t.officer,t.site)?t.helper:t.officer;action={type:'service',action:t.funds.coins>=assignmentBudget(t.kind,t.plan!).coins+20&&!serviceReason(w,{type:'service',action:'spend',id:t.id},actor)?'spend':t.deadline-w.day>20?'delay':!t.aidRequested?'request-aid':'strain',id:t.id};}
  else if(t.phase==='aid'&&chief!==w.characterId){actor=chief;action={type:'service',action:w.realm.treasuries[t.realm].coins>=20?'grant':'deny',id:t.id};}
  else if(t.phase==='report'&&(chief!==w.characterId||!serviceException(w,t))){actor=chief;action={type:'service',action:'close',id:t.id};}
  if(actor&&(actor!==w.characterId||['approve','close'].includes(action?.action??'')&&!serviceException(w,t))&&action&&!serviceReason(w,action,actor))actService(w,action,actor);
 }
 // NPC initiative uses the same quotes, capacity limits and budgets as player proposals.
 if(w.day%15===0)for(const r of realms){const chief=serviceChief(w,r);if(!chief)continue;const options=assignmentOptions(w,r),candidates=serviceCandidates(w,r).filter(c=>c.id!==w.characterId&&!humanPause(w,c.id));for(const c of candidates){const option=options.find(o=>!serviceReason(w,{type:'service',action:'open',...o,officer:c.id},c.id));if(option){actService(w,{type:'service',action:'open',...option,officer:c.id},c.id);break;}}}
}

export function reconcileServiceAllegiance(w:World){for(const t of w.service?.tasks??[])if(t.phase!=='closed'&&allegianceRealm(w,t.officer)!==t.realm)finish(w,t,false,'承办人效忠改变，差事终止并结算未用专款');}
