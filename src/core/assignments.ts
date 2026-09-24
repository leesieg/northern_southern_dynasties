import {relationshipPersonById,relationshipPeople} from '../data/relationships';
import {serviceNeed,servicePolitics,serviceDomain,incidentChoices} from './serviceNeeds';
import {enactPoliticalAction} from './politicalActions';
import {allegianceRealm,officeCandidates} from './officeEligibility';
import {grantRoom,fundAssignment,fiscalRecord,centralAccount} from './treasury';
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
export interface Council {season:number;priority:ServicePriority;decided:boolean;petitioned:string[];proposal:{actor:string;priority:ServicePriority;day:number}|null;completed:number;lastResult:string;reply:{actor:string;day:number;text:string}|null}
export interface Assignment {
 id:number;realm:RealmId;kind:AssignmentKind;site:string;target:RealmId|null;officer:string;credential:string|null;
 created:number;changed:number;deadline:number;travelAllowance?:number;season:number;phase:AssignmentPhase;plan:AssignmentPlan|null;
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
export function serviceBusy(w:World,id:string,except?:number){return retinueBusy(w,id)||!!w.mobility?.appointments[id]||!!w.mobility?.activities.some(a=>!['done','cancelled'].includes(a.phase)&&(a.actor===id&&!a.delegate||a.delegate===id))||Object.values(w.mobility?.commanders??{}).includes(id)||!!w.service?.tasks.some(t=>t.id!==except&&t.phase!=='closed'&&(t.officer===id||t.helper===id))||!!(w.duties?.task&&w.duties.task.phase!=='closed'&&w.duties.task.officer===id);}
export function serviceCandidates(w:World,r:RealmId,except?:number){return officeCandidates(w,r).filter(c=>c.id!==serviceChief(w,r)&&isAlive(w,c.id)&&(ageAt(w,c.id)??0)>=16&&!w.social?.lineage.slice(0,-1).some(p=>p.id===c.id)&&!serviceBusy(w,c.id,except));}
export function recommendedPriority(w:World,r:RealmId):ServicePriority {const cities=Object.values(w.realm!.cities).filter(c=>c.owner===r);if(cities.some(c=>c.controller!==r)||w.realm!.war&&[w.realm!.war.attacker,w.realm!.war.defender].includes(r))return 'military';if(cities.some(c=>c.order<55))return 'stability';if(w.realm!.treasuries[r].coins<300||cities.some(c=>c.prosperity<60))return 'economy';return 'diplomacy';}
export function serviceCredential(w:World,id:string){return officeHierarchy(w).find(n=>n.active&&n.holder===id&&(n.kind==='office'||n.kind==='city'))?.id??null;}
function humanPause(w:World,id:string){if(!isAlive(w,id))return '已故';if(w.social?.lineage.slice(0,-1).some(p=>p.id===id))return '已退居';if(lifeOf(w,id)?.illness?.severity===3)return '重病';if(id===w.characterId&&w.people[0].journey)return '正在出行';return '';}
export function assignmentRoute(w:World,t:Pick<Assignment,'realm'|'site'>){return w.realm?.cities[capital(t.realm)]?.controller===t.realm?planRoute(capital(t.realm),t.site,id=>w.realm?.cities[id]?.controller===t.realm):null;}
export function assignmentUnavailable(w:World,t:Assignment){if(allegianceRealm(w,t.officer)!==t.realm)return '承办人效忠已变，须改派';if(!isAlive(w,t.officer))return '承办人已故，须改派';if(w.social?.lineage.slice(0,-1).some(p=>p.id===t.officer))return '承办人已退居，须改派';if(officialDutyReason(w,t.officer,t.kind))return '承办人失去所需中央职掌，须改派';if(t.officer===serviceChief(w,t.realm))return '承办人已转任执政，须改派';if(t.credential&&!officeHierarchy(w).some(n=>n.id===t.credential&&n.active&&n.holder===t.officer))return '承办人原职已变，须重新委任';return '';}
export function assignmentPause(w:World,t:Assignment){if(t.phase==='closed')return '';const unavailable=assignmentUnavailable(w,t);if(unavailable)return unavailable;const delegated=!!w.mobility&&t.started&&!['training','inspection'].includes(t.kind)&&!!t.helper&&presentAt(w,t.helper,t.site)&&!humanPause(w,t.helper);const hp=humanPause(w,t.officer);if(hp&&!delegated&&t.phase!=='report')return '承办人'+hp;if(w.mobility&&['ready','working','incident','aid'].includes(t.phase)&&!presentAt(w,t.officer,t.site)&&!delegated)return '承办人须赴'+siteById[t.site].name+'，到场后办理';if(w.realm?.cities[t.site]?.controller!==t.realm||w.realm.cities[t.site].owner!==t.realm)return '目的城失去本国控制';if(t.phase!=='report'&&t.kind==='supply'&&!assignmentRoute(w,t))return '国都至目的城道路中断';if(['training','supply'].includes(t.kind)&&!w.realm.armies.some(a=>a.realm===t.realm&&a.location===t.site&&!a.journey))return '目的城没有本国驻军';if(t.kind==='recruitment'&&(w.realm.cities[t.site].population<700||w.realm.armies.some(a=>a.realm===t.realm&&(a.location!==t.site||!!a.journey||a.troops>=600))))return '征募须等待本国军队驻留且留有兵额，本城至少 700 人';if(t.kind==='envoy'&&t.target&&atWar(w,t.realm,t.target))return '两国交战，通使暂停';return '';}
export function assignmentBudget(kind:AssignmentKind,plan:AssignmentPlan){const d=assignmentTemplates[kind],rate=assignmentPlans[plan].cost;return {coins:Math.ceil(d.coins*rate/100),grain:Math.ceil(d.grain*rate/100)};}
export function servicePriorityEffort(w:World,r:RealmId,kind:AssignmentKind){const c=w.service?.councils[r];return c?.decided?(c.priority===assignmentTemplates[kind].category?1:-1):0;}
export function assignmentPlanQuote(w:World,t:Pick<Assignment,'officer'|'helper'|'site'|'realm'|'kind'>,plan:AssignmentPlan){const d=assignmentTemplates[t.kind],b=assignmentBudget(t.kind,plan),work=Math.ceil(d.work*assignmentPlans[plan].work/100)+(t.kind==='supply'?(assignmentRoute(w,t)?.days??0)*4:0),effort=assignmentEffort(w,t).total;return {...b,work,effort,days:Math.ceil(work/effort),quality:plan==='thorough'?115:plan==='urgent'?85:100};}
export function assignmentEffort(w:World,t:Pick<Assignment,'officer'|'helper'|'site'|'realm'|'kind'>){const executor=w.mobility&&(!presentAt(w,t.officer,t.site)||!!humanPause(w,t.officer))&&t.helper&&presentAt(w,t.helper,t.site)&&!humanPause(w,t.helper)?t.helper:t.officer;const d=assignmentTemplates[t.kind],skill=attributes(w,executor)[d.skill],bonuses=lifestyleBonuses(w,executor),helper=t.helper&&executor!==t.helper&&!humanPause(w,t.helper)&&(!w.mobility||presentAt(w,t.helper,t.site))?t.helper:null;const parts=[{label:'基本办理',value:4},{label:'季议资源倾斜',value:servicePriorityEffort(w,t.realm,t.kind)},{label:'集团支持与阻力',value:servicePolitics(w,t.realm,t.kind).effort},{label:'人物能力',value:Math.floor(skill/4)},{label:'勤勉',value:traitsFor(w,executor).includes('diligent')?2:0},{label:'生涯名望',value:careerStanding(w,executor,d.category).bonus},{label:'生活重心',value:Math.min(3,Math.floor((d.category==='military'?bonuses.attack+bonuses.supply:d.category==='diplomacy'?bonuses.acceptance:bonuses.buildTime+bonuses.tax+bonuses.grain)/5))},{label:'同伴协作',value:helper?Math.max(1,Math.floor(attributes(w,helper)[d.skill]/6)+(relationOpinion(w,t.officer,helper)>=40?1:0)):0},{label:'身体与压力',value:-(lifeOf(w,executor)?.illness?.severity??0)-(executor===w.characterId&&(w.social?.stress??0)>=80?2:0)}];return {parts,total:Math.max(1,parts.reduce((n,p)=>n+p.value,0)),helper,executor};}
export function serviceAttention(w:World){if(!w.service?.enabled||!w.characterId)return [];const id=w.characterId,r=serviceRealm(id);if(!r)return [];const s=w.service,keys:string[]=[];if(s.councils[r].reply?.actor===id)keys.push('council-reply:'+r+':'+s.councils[r].reply!.day);if(serviceChief(w,r)===id&&(!s.councils[r].decided||s.councils[r].proposal))keys.push('council:'+r+':'+s.councils[r].season);for(const t of s.tasks){if(t.phase==='closed')continue;const chief=serviceChief(w,t.realm)===id;if(t.invitation?.person===id)keys.push('invite:'+t.id+':'+t.invitation.day);if(chief&&(assignmentUnavailable(w,t)||['petition','approval','aid','report'].includes(t.phase))||t.officer===id&&['proposal','ready','incident'].includes(t.phase)||t.helper===id&&t.phase==='incident'&&!!w.mobility&&!presentAt(w,t.officer,t.site)&&presentAt(w,id,t.site)&&!['training','inspection'].includes(t.kind))keys.push('task:'+t.id+':'+t.phase+':'+t.changed+':'+t.officer);}return keys;}
function log(w:World,t:Assignment,text:string){t.history.push({day:w.day,text});t.history=t.history.slice(-32);if(t.officer===w.characterId||serviceChief(w,t.realm)===w.characterId||t.helper===w.characterId||Object.hasOwn(t.contributors,w.characterId??''))w.chronicle.push({day:w.day,person:'player',text:siteById[t.site].name+assignmentTemplates[t.kind].name+'：'+text});w.chronicle=w.chronicle.slice(-100);}
function phase(w:World,t:Assignment,p:AssignmentPhase){t.phase=p;t.changed=w.day;}
const slotKey=(r:RealmId,kind:AssignmentKind,site:string,target:RealmId|null,season:number)=>[season,r,kind,site,target??''].join('|');
export function serviceReason(w:World,c:ServiceCommand,actor=w.characterId):string {
 if(w.mode!=='sandbox'||!w.realm||w.campaign?.status!=='active'||!actor||!relationshipPersonById[actor]||!isAlive(w,actor))return '在世历史人物可在沙盒中办理';
 const s=w.service,r=serviceRealm(actor,w)!;if(c.action==='begin')return s?.enabled?'已在参与评议':'';if(!s?.enabled)return '请先赴任议事';
 if(c.action==='priority'){if(!Object.hasOwn(servicePriorities,c.priority))return '未知评议目标';if(serviceChief(w,r)===actor&&s.councils[r].decided)return '本季目标已经议定';if(s.councils[r].petitioned.includes(actor))return '本季已上书议事';if(s.councils[r].proposal)return '已有上书待议';return '';}
 if(c.action==='council-accept'||c.action==='council-decline')return serviceChief(w,r)!==actor?'须由执政者裁决':!s.councils[r].proposal?'没有待议的上书':'';
 if(c.action==='open'){
  if(!Object.hasOwn(assignmentTemplates,c.kind)||!Object.hasOwn(siteById,c.site))return '无效差事或城市';
  if(w.realm.cities[c.site].owner!==r||w.realm.cities[c.site].controller!==r)return '只能办理本国法理及控制下的城市';
  if(serviceChief(w,r)!==actor&&c.officer!==actor)return '只能自荐，不能替执政者任命他人';
  if(!serviceCandidates(w,r).some(p=>p.id===c.officer))return '承办人须为本国可用人物，且不能兼办另一差事';
  if(s.tasks.filter(t=>t.realm===r&&t.phase!=='closed').length>=3)return '本国已有三项差事在办';
  if(s.tasks.some(t=>t.phase!=='closed'&&t.realm===r&&t.kind===c.kind&&t.site===c.site))return '同城同类差事正在办理';
  if(s.used.includes(slotKey(r,c.kind,c.site,c.target??null,s.councils[r].season)))return '本季已经受理过这项差事';
  if(['training','supply'].includes(c.kind)&&!w.realm.armies.some(a=>a.realm===r&&a.location===c.site&&!a.journey))return '须选择有本国驻军的城市';
  if(officialDutyReason(w,c.officer,c.kind))return officialDutyReason(w,c.officer,c.kind);
  const building=civicBuildings[c.kind as keyof typeof civicBuildings];
  if(building){if((w.holdings.cities[c.site]?.levels[building]??0)>=3)return '建筑已达最高等级';if(w.holdings.cities[c.site]?.project||s.tasks.some(t=>t.phase!=='closed'&&t.site===c.site&&Object.hasOwn(civicBuildings,t.kind)))return '本城已有营建工程';}
  if(c.kind==='recruitment'&&(w.realm.cities[c.site].population<700||w.realm.armies.some(a=>a.realm===r&&(a.location!==c.site||!!a.journey||a.troops>=600))))return '须选择军队驻地且兵员未满；本城至少 700 人';
  if(c.kind==='envoy'&&(!c.target||!realms.includes(c.target)||c.target===r||atWar(w,r,c.target)))return '须选择未与本国交战的另一政权';
  if(c.kind!=='envoy'&&c.target!==undefined)return '此差事无需指定他国';
  return serviceChief(w,r)?'':'执政席位空缺';
 }
 if(!('id'in c))return '未知差事行动';
 const t=serviceTask(w,c.id);if(!t||t.phase==='closed')return '差事已结案或不存在';if(r!==t.realm)return '不能办理他国差事';
 const chief=actor===serviceChief(w,t.realm),officer=actor===t.officer||!!w.mobility&&t.started&&actor===t.helper&&presentAt(w,actor!,t.site)&&!presentAt(w,t.officer,t.site)&&!['training','inspection'].includes(t.kind);
 if(c.action==='extend')return !chief?'须由执政者批准延期':t.extended?'本案已经延期':!t.started||t.phase==='report'?'仅办理中的差事可延期':'';
 if(c.action==='accept'||c.action==='decline')return t.invitation?.person!==actor?'没有发给你的协办邀请':c.action==='accept'&&(serviceBusy(w,actor,t.id)||humanPause(w,actor))?'你暂时不能参与协办':'';
 if(c.action==='withdraw')return t.helper===actor?'':'你不是此案协办人';
 if(c.action==='replace')return !chief?'须由执政者改派':!serviceCandidates(w,r,t.id).some(p=>p.id===c.person)||!!officialDutyReason(w,c.person,t.kind)||c.person===t.helper?'该人物无法接任':'';
 if(c.action==='cancel')return chief||officer&&['petition','proposal','approval'].includes(t.phase)?'':'须由执政者撤回';
 if(c.action==='invite'){if(!officer)return '须由承办人邀请';if(!['proposal','approval','ready','working'].includes(t.phase))return '当前阶段不能邀请协办';if(t.helper||t.invitation)return '已有协办人或待答邀请';return c.person===t.officer||t.invited.includes(c.person)||!serviceCandidates(w,r,t.id).some(p=>p.id===c.person)?'此人无法接受邀请':'';}
 if(['approve','revise','grant','deny','close'].includes(c.action)&&!chief)return '须由执政者裁决';
 if(['plan','start','request-aid','spend','delay','strain'].includes(c.action)&&!officer)return '须由承办人办理';
 const expected:Partial<Record<ServiceCommand['action'],AssignmentPhase[]>>={plan:['proposal'],approve:['petition','approval'],revise:['approval'],start:['ready'],'request-aid':['incident'],grant:['aid'],deny:['aid'],spend:['incident'],delay:['incident'],strain:['incident'],close:['report']};if(!expected[c.action]?.includes(t.phase))return '差事阶段已经变化';
 if(c.action==='plan')return Object.hasOwn(assignmentPlans,c.plan)?'':'未知方案';
 if(c.action==='approve'&&t.phase==='approval'){const b=assignmentBudget(t.kind,t.plan!),treasury=w.realm.treasuries[r];if(grantRoom(w,t.site,t.realm)<b.coins)return '拨款路径公库容量不足';if(treasury.coins<b.coins||treasury.grain<b.grain)return '公库不足，无法拨款';}
 if(c.action==='request-aid'&&t.aidRequested)return '已请求追加，请选择其他办法';
 if(c.action==='grant'&&grantRoom(w,t.site,t.realm)<20)return '拨款路径公库容量不足';
 if(c.action==='grant'&&w.realm.treasuries[r].coins<20)return '公款不足 20';
 if(c.action==='spend'&&(!assignmentRoute(w,t)||w.realm.cities[t.site].order<25))return '道路或地方执行受阻，经费不能替代疏通与协商';
 if(c.action==='spend'&&t.funds.coins<assignmentBudget(t.kind,t.plan!).coins+20)return '须先获批追加公款 20';
 if(['start','spend','delay','strain','close'].includes(c.action)){const pause=assignmentPause(w,t);if(pause)return pause;}
 if(c.action==='close'&&t.kind==='envoy'&&t.target){const reason=commissionedEnvoyReason(w,t.realm,t.target);if(reason)return reason;}
 if(c.action==='strain'&&actor===w.characterId&&(w.social?.stress??0)>80)return '压力过高，不能再强行督办';
 return '';
}
function finish(w:World,t:Assignment,success:boolean,reason:string){
 if(t.result)return;const s=w.service!,g=governmentOf(w,t.realm)!,chief=serviceChief(w,t.realm),city=w.realm!.cities[t.site],treasury=w.realm!.treasuries[t.realm],d=assignmentTemplates[t.kind],effects:string[]=[],awards:NonNullable<Assignment['result']>['awards']=[];
 const change=(object:Record<string,number>,key:string,delta:number,label:string,max=100,min=0)=>{const before=object[key];object[key]=clamp(before+delta,max,min);effects.push(label+' '+(object[key]-before>=0?'+':'')+(object[key]-before));};
 const fraction=t.started?Math.min(1,t.progress/Math.max(1,t.required)):0,spent=Math.max(t.spent?.coins??0,Math.ceil(t.funds.coins*fraction)),unused=t.funds.coins-spent,unusedGrain=t.funds.grain-Math.max(t.spent?.grain??0,Math.ceil(t.funds.grain*fraction)),refund=Math.min(unused,1_000_000-treasury.coins),grainRefund=Math.min(unusedGrain,1_000_000-treasury.grain);
 fiscalRecord(w,t.realm,'task:'+t.id,'expense',spent,'差事实际支出');
 if(refund){treasury.coins+=refund;fiscalRecord(w,t.realm,'task:'+t.id,centralAccount(t.realm),refund,'退回未使用专款');}treasury.grain+=grainRefund;if(unused>refund||unusedGrain>grainRefund){fiscalRecord(w,t.realm,'task:'+t.id,'expense',unused-refund,'退款超出公库容量损失');effects.push('退回超过库容：公款损失 '+(unused-refund)+' / 公粮损失 '+(unusedGrain-grainRefund));}
 effects.push('进度 '+Math.round(fraction*100)+'%；实际支出 '+spent+'，退回公款 '+refund+' / 公粮 '+grainRefund+'；成果质量 '+(t.quality??100)+'%；'+(w.day<=t.deadline?'按期':'逾期'));
 if(!success&&fraction>=.25&&city.controller===t.realm){const partial=Math.floor(8*fraction);if(['relief','inspection'].includes(t.kind)){city.order=Math.min(100,city.order+partial);effects.push('已完成部分保留：秩序 +'+partial);}if(['agriculture','greatworks','commerce'].includes(t.kind)){city.prosperity=Math.min(100,city.prosperity+partial);effects.push('已完成部分保留：繁荣 +'+partial);}}
 if(success){
  const c=city as unknown as Record<string,number>,army=w.realm!.armies.find(a=>a.realm===t.realm&&a.location===t.site&&!a.journey);
  if(t.kind==='relief'){city.grain=Math.min(1_000_000,city.grain+Math.floor(t.funds.grain*.75));change(c,'order',Math.round(14*(t.quality??100)/100),'城市秩序');}
  if(t.kind==='agriculture'){change(c,'prosperity',Math.round(10*(t.quality??100)/100),'城市繁荣');change(c,'irrigation',1,'水利',10);}
  if(t.kind==='commerce'){change(c,'prosperity',Math.round(8*(t.quality??100)/100),'城市繁荣');change(treasury as unknown as Record<string,number>,'coins',85,'市务回款',1_000_000);}
  if(t.kind==='inspection'){change(c,'order',10,'城市秩序');if(g.court)change(g.court as unknown as Record<string,number>,'corruption',-8,'朝廷积弊');}
  if(t.kind==='training'&&army){change(army as unknown as Record<string,number>,'morale',18,'驻军士气');const recruits=Math.max(0,Math.min(60,600-army.troops,city.population-100));change(army as unknown as Record<string,number>,'troops',recruits,'驻军兵员',600,100);city.population-=recruits;}
  if(t.kind==='supply'&&army)change(army as unknown as Record<string,number>,'supply',Math.min(90,t.funds.grain),'驻军补给',600);
  if(t.kind==='envoy'&&t.target){dispatchCommissionedEnvoy(w,t.realm,t.target);effects.push('修好使团已出发，等候对方答复');}
  const building=civicBuildings[t.kind as keyof typeof civicBuildings];
  if(building){const holding=w.holdings.cities[t.site]??=emptyCity();const before=holding.levels[building];holding.levels[building]=Math.min(3,before+1);effects.push('城市建筑提升 '+(holding.levels[building]-before)+' 级');}
  if(t.kind==='greatworks'){change(c,'prosperity',20,'城市繁荣');change(c,'order',10,'城市秩序');change(c,'irrigation',2,'水利',10);}
  if(t.kind==='taxation'){const amount=Math.max(30,Math.min(150,Math.floor(city.population/50*(city.tax==='light'?.7:city.tax==='heavy'?1.4:1))));change(treasury as unknown as Record<string,number>,'coins',amount,'追征税款',1_000_000);change(c,'order',-5,'城市秩序');}
  if(t.kind==='recruitment'){const existing=w.realm!.armies.find(a=>a.realm===t.realm),recruits=Math.max(0,Math.min(200,600-(existing?.troops??0),city.population-100));if(existing&&existing.location===t.site&&!existing.journey){change(existing as unknown as Record<string,number>,'troops',recruits,'驻军兵员',600,100);}else if(!existing&&recruits>=100){w.realm!.armies.push({realm:t.realm,location:t.site,troops:recruits,morale:80,supply:Math.min(80,t.funds.grain),journey:null,siege:0});effects.push('组建驻军 '+recruits+' 人');}change(c,'population',-recruits,'征募人口',1_000_000,100);change(c,'order',-5,'城市秩序');}
  s.councils[t.realm].completed++;
 }else if(city.controller===t.realm)change(city as unknown as Record<string,number>,'order',-5,'城市秩序');
 const totalLead=Object.values(t.contributors).reduce((n,c)=>n+c.lead,0)||1,totalSupport=Object.values(t.contributors).reduce((n,c)=>n+c.support,0)||1;
 for(const [person,contribution] of Object.entries(t.contributors)){
  if(!isAlive(w,person)||contribution.lead+contribution.support<=0)continue;
  const base=Math.round((s.councils[t.realm].priority===d.category?24:20)*(t.quality??100)/100),merit=success?Math.floor(base*contribution.lead/totalLead+6*contribution.support/totalSupport):-Math.ceil(4*contribution.lead/totalLead),old=g.merit[person]??0;
  g.merit[person]=clamp(old+merit);const memoryBefore=chief?opinionBreakdown(w,person,chief).parts[1].value:0,opinion=success?8:-5;
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
  s.tasks=s.tasks.filter(t=>t.phase!=='closed').concat(s.tasks.filter(t=>t.phase==='closed').slice(-48));
  const t:Assignment={id:s.nextId++,realm:r,kind:c.kind,site:c.site,target:c.target??null,officer:c.officer,credential:serviceCredential(w,c.officer),created:w.day,changed:w.day,travelAllowance:planRoute(personResidence(w,c.officer).site,c.site)?.days??0,deadline:w.day+Math.max(120,Math.ceil(assignmentTemplates[c.kind].work/3)+30)+(planRoute(personResidence(w,c.officer).site,c.site)?.days??0),season:s.councils[r].season,phase:serviceChief(w,r)===actor||dutyMinistries[c.kind]&&!officialDutyReason(w,actor!,c.kind)?'proposal':'petition',plan:null,funds:{coins:0,grain:0},progress:0,required:0,started:false,incidentDone:false,aidRequested:false,helper:null,invitation:null,invited:[],contributors:{},result:null,history:[]};s.tasks.push(t);s.used.push(slotKey(r,c.kind,c.site,c.target??null,t.season));log(w,t,politicalName(actor!)+(t.phase==='petition'?'自荐办理，请执政者批示。':'委派'+politicalName(t.officer)+'拟定方案，路程另计，依差事规模核定限期。'));return;
 }
 if(!('id'in c))throw new Error('未知差事行动');
 const t=serviceTask(w,c.id)!,treasury=w.realm!.treasuries[t.realm];
 switch(c.action){
 case 'extend':t.extended=true;t.deadline+=30;t.quality=Math.max(50,(t.quality??100)-5);governmentOf(w,t.realm)!.support=Math.max(0,governmentOf(w,t.realm)!.support-3);t.changed=w.day;log(w,t,'获准延期 30 日，朝野支持 −3，考绩质量 −5。');break;
 case 'plan':t.plan=c.plan;t.quality=c.plan==='thorough'?115:c.plan==='urgent'?85:100;phase(w,t,'approval');log(w,t,'呈请「'+assignmentPlans[c.plan].name+'」，预算公款 '+assignmentBudget(t.kind,c.plan).coins+'、公粮 '+assignmentBudget(t.kind,c.plan).grain+'。');break;
 case 'approve':if(t.phase==='petition'){phase(w,t,'proposal');log(w,t,'准予请命，请拟议办理方案。');}else{const b=assignmentBudget(t.kind,t.plan!);fundAssignment(w,t.site,t.realm,b.coins,t.id,'差事预算拨付');treasury.grain-=b.grain;t.funds=b;phase(w,t,'ready');log(w,t,'预算获准，专款已拨付。');}break;
 case 'revise':t.plan=null;phase(w,t,'proposal');log(w,t,'方案退回重拟，尚未拨款。');break;
 case 'start':enactPoliticalAction(w,t.realm,serviceDomain(t.kind));t.started=true;t.required=assignmentPlanQuote(w,t,t.plan!).work;phase(w,t,'working');log(w,t,'差事启办；总工作量 '+t.required+'，按实际能力和协作逐日办理。');break;
 case 'invite':t.invitation={person:c.person,day:w.day};t.invited.push(c.person);log(w,t,'邀请'+politicalName(c.person)+'协办，等待答复。');break;
 case 'accept':t.helper=actor!;t.invitation=null;log(w,t,politicalName(actor!)+'接受协办邀请。');break;
 case 'decline':t.invitation=null;log(w,t,politicalName(actor!)+'婉拒协办邀请。');break;
 case 'withdraw':t.helper=null;log(w,t,politicalName(actor!)+'退出协办，既有贡献保留。');break;
 case 'replace':log(w,t,'改委'+politicalName(c.person)+'，钱粮与进度保留，考绩按实际贡献分配。');t.officer=c.person;t.credential=serviceCredential(w,c.person);if(t.invitation?.person===c.person)t.invitation=null;t.changed=w.day;break;
 case 'request-aid':t.aidRequested=true;phase(w,t,'aid');log(w,t,'承办人请增拨公款 20，排除办理阻碍。');break;
 case 'grant':fundAssignment(w,t.site,t.realm,20,t.id,'差事追加拨付');t.funds.coins+=20;phase(w,t,'incident');log(w,t,'增拨公款 20 已获准。');break;
 case 'deny':phase(w,t,'incident');log(w,t,'未获追加，请另择办法。');break;
 case 'spend':if(t.kind==='inspection'){const court=governmentOf(w,t.realm)?.court;if(court){court.corruption=Math.max(0,court.corruption-3);court.tension=Math.min(100,court.tension+5);}}if(t.kind==='envoy'&&t.target){changeRelationOpinion(w,t.officer,serviceChief(w,t.target)??t.officer,-3);}t.quality=Math.max(50,(t.quality??100)-5);w.realm!.cities[t.site].order=Math.max(0,w.realm!.cities[t.site].order-3);t.incidentDone=true;phase(w,t,'working');log(w,t,'动用追加款排除阻碍，工期不变。');break;
 case 'delay':t.quality=Math.min(130,(t.quality??100)+10);t.incidentDone=true;t.required+=40;phase(w,t,'working');log(w,t,'缓办疏通，追加工作量 40，不再花费钱粮。');break;
 case 'strain':w.realm!.cities[t.site].order=Math.max(0,w.realm!.cities[t.site].order-8);t.quality=Math.max(50,(t.quality??100)-15);t.incidentDone=true;t.required+=10;if(actor===w.characterId&&w.social)w.social.stress=clamp(w.social.stress+18);else {t.required+=20;}phase(w,t,'working');log(w,t,actor===w.characterId?'亲自督办，压力 +18，追加工作量 10。':'加紧督办，追加工作量 30。');break;
 case 'close':finish(w,t,true,'办结，考绩核定');break;
 case 'cancel':finish(w,t,false,t.phase==='petition'?'请命未准':'差事撤回');break;
 }
}
function chooseNPCPlan(w:World,t:Assignment):AssignmentPlan{return traitsFor(w,t.officer).includes('frugal')?'thorough':assignmentTemplates[t.kind].category==='military'&&w.realm?.war?'urgent':'balanced';}
export function assignmentOptions(w:World,r:RealmId){const cities=Object.entries(w.realm!.cities).filter(([,c])=>c.owner===r&&c.controller===r).sort((a,b)=>a[1].order+a[1].prosperity-b[1].order-b[1].prosperity);const priority=w.service?.councils[r].priority??recommendedPriority(w,r);return (Object.keys(assignmentTemplates) as AssignmentKind[]).sort((a,b)=>Number(assignmentTemplates[b].category===priority)-Number(assignmentTemplates[a].category===priority)).flatMap(kind=>{const eligible=['training','supply'].includes(kind)?cities.filter(([id])=>w.realm!.armies.some(a=>a.realm===r&&a.location===id&&!a.journey)):kind==='envoy'?cities.filter(([id])=>id===capital(r)):cities;return eligible.flatMap<{kind:AssignmentKind;site:string;target?:RealmId}>(([site])=>kind==='envoy'?realms.filter(target=>target!==r&&!atWar(w,r,target)).map(target=>({kind,site,target})): [{kind,site}]);}).sort((a,b)=>serviceNeed(w,b.kind,b.site).score-serviceNeed(w,a.kind,a.site).score);}
export function advanceService(w:World){
 const s=w.service;if(!s?.enabled||!w.realm||w.campaign?.status!=='active'||s.lastDay>=w.day)return;s.lastDay=w.day;
 for(const r of realms){const c=s.councils[r],chief=serviceChief(w,r),season=Math.floor(w.day/90);
  if(c.season<season){const met=c.completed>=2;c.lastResult=`上季办结 ${c.completed} 项，${met?'达到两项之约':'未达两项之约'}。`;const g=governmentOf(w,r)!;g.support=clamp(g.support+(met?3:-2));c.season=season;c.completed=0;c.priority=recommendedPriority(w,r);c.decided=chief!==w.characterId;c.proposal=null;c.petitioned=[];c.reply=null;}
  if(c.proposal&&chief!==w.characterId&&w.day-c.proposal.day>=2){const proposal=c.proposal;c.priority=relationOpinion(w,proposal.actor,chief??proposal.actor)>=0?proposal.priority:recommendedPriority(w,r);c.decided=true;c.reply={actor:proposal.actor,day:w.day,text:c.priority===proposal.priority?'上书获准，重心已调整。':'朝廷依局势维持原议。'};c.proposal=null;}
  if(!c.decided&&chief!==w.characterId){c.priority=recommendedPriority(w,r);c.decided=true;}
 }
 s.used=s.used.filter(key=>Number(key.split('|')[0])>=Math.floor(w.day/90)-1);
 for(const t of s.tasks){
  if(t.phase==='closed')continue;
  if(t.started&&t.phase!=='report'&&!t.extended&&t.deadline-w.day<15&&t.progress>t.required/2&&serviceChief(w,t.realm)!==w.characterId){const chief=serviceChief(w,t.realm);if(chief&&!serviceReason(w,{type:'service',action:'extend',id:t.id},chief))actService(w,{type:'service',action:'extend',id:t.id},chief);}
  if(w.day>=t.deadline){finish(w,t,false,'逾期未能办结');continue;}
  const chief=serviceChief(w,t.realm);
  if(t.helper&&(!isAlive(w,t.helper)||w.social?.lineage.slice(0,-1).some(p=>p.id===t.helper))){log(w,t,politicalName(t.helper)+'不再协办，既有贡献保留。');t.helper=null;}
  if(t.invitation&&(!isAlive(w,t.invitation.person)||w.social?.lineage.slice(0,-1).some(p=>p.id===t.invitation!.person)))t.invitation=null;
  if(t.invitation&&w.day-t.invitation.day>=2&&t.invitation.person!==w.characterId){const person=t.invitation.person,accept=!serviceBusy(w,person,t.id)&&!humanPause(w,person)&&relationOpinion(w,t.officer,person)>=0;actService(w,{type:'service',action:accept?'accept':'decline',id:t.id},person);}
  if(assignmentUnavailable(w,t)){if(chief&&chief!==w.characterId){const next=serviceCandidates(w,t.realm,t.id).find(c=>c.id!==t.officer&&c.id!==t.helper&&c.id!==w.characterId&&!officialDutyReason(w,c.id,t.kind));if(next)actService(w,{type:'service',action:'replace',id:t.id,person:next.id},chief);}continue;}
  if(t.phase==='working'&&!assignmentPause(w,t)){
   const effort=assignmentEffort(w,t),step=Math.min(effort.total,t.required-t.progress),helperPoints=Math.min(step,effort.parts.find(p=>p.label==='同伴协作')!.value);t.progress+=step;t.spent={coins:Math.max(t.spent?.coins??0,Math.ceil(t.funds.coins*t.progress/t.required)),grain:Math.max(t.spent?.grain??0,Math.ceil(t.funds.grain*t.progress/t.required))};
   (t.contributors[effort.executor]??={lead:0,support:0}).lead+=step-helperPoints;
   if(effort.helper)(t.contributors[effort.helper]??={lead:0,support:0}).support+=helperPoints;
   if(!t.incidentDone&&t.progress>=Math.ceil(t.required/2)){phase(w,t,'incident');log(w,t,t.kind==='envoy'?'使节礼仪与国书措辞尚待协调。':t.kind==='inspection'?'地方官吏推诿，巡察受阻。':t.kind==='training'?'军伍调度不齐，操练受阻。':incidentChoices(t.kind).spend+'；'+incidentChoices(t.kind).delay+'；'+incidentChoices(t.kind).strain);continue;}
   if(t.progress>=t.required){phase(w,t,'report');log(w,t,'办理完成，呈报考绩。');continue;}
  }
  if(w.day-t.changed<2)continue;
  if(t.phase==='proposal'&&t.officer!==w.characterId&&!t.helper&&!t.invitation&&!t.invited.length){const candidate=serviceCandidates(w,t.realm,t.id).sort((a,b)=>Number(b.id===w.characterId)-Number(a.id===w.characterId)).find(c=>c.id!==t.officer&&!humanPause(w,c.id)&&relationOpinion(w,t.officer,c.id)>=0);if(candidate)actService(w,{type:'service',action:'invite',id:t.id,person:candidate.id},t.officer);}
  let action:ServiceCommand|undefined,actor:string|undefined;
  if(['petition','approval'].includes(t.phase)&&chief!==w.characterId){actor=chief;action={type:'service',action:'approve',id:t.id};}
  else if(t.phase==='proposal'&&t.officer!==w.characterId){actor=t.officer;action={type:'service',action:'plan',id:t.id,plan:chooseNPCPlan(w,t)};}
  else if(t.phase==='ready'&&t.officer!==w.characterId){actor=t.officer;action={type:'service',action:'start',id:t.id};}
  else if(t.phase==='incident'&&(t.officer!==w.characterId||!!w.mobility&&!presentAt(w,t.officer,t.site)&&!!t.helper&&presentAt(w,t.helper,t.site)&&!['training','inspection'].includes(t.kind))){actor=t.helper&&w.mobility&&!presentAt(w,t.officer,t.site)?t.helper:t.officer;action={type:'service',action:t.funds.coins>=assignmentBudget(t.kind,t.plan!).coins+20&&!serviceReason(w,{type:'service',action:'spend',id:t.id},actor)?'spend':t.deadline-w.day>20?'delay':!t.aidRequested?'request-aid':'strain',id:t.id};}
  else if(t.phase==='aid'&&chief!==w.characterId){actor=chief;action={type:'service',action:w.realm.treasuries[t.realm].coins>=20?'grant':'deny',id:t.id};}
  else if(t.phase==='report'&&chief!==w.characterId){actor=chief;action={type:'service',action:'close',id:t.id};}
  if(actor&&actor!==w.characterId&&action&&!serviceReason(w,action,actor))actService(w,action,actor);
 }
 // NPC initiative uses the same quotes, capacity limits and budgets as player proposals.
 if(w.day%15===0)for(const r of realms){const chief=serviceChief(w,r);if(!chief)continue;const candidates=serviceCandidates(w,r).filter(c=>c.id!==w.characterId&&!humanPause(w,c.id));for(const c of candidates){const options=assignmentOptions(w,r);const option=options.find(o=>!serviceReason(w,{type:'service',action:'open',...o,officer:c.id},c.id));if(option){actService(w,{type:'service',action:'open',...option,officer:c.id},c.id);break;}}}
}

export function reconcileServiceAllegiance(w:World){for(const t of w.service?.tasks??[])if(t.phase!=='closed'&&allegianceRealm(w,t.officer)!==t.realm)finish(w,t,false,'承办人效忠改变，差事终止并结算未用专款');}
