import {awardDeed} from './deeds';
import {grainCapacity} from './population';
import {fundAssignment,fiscalRecord,centralAccount} from './treasury';
import {presentAt} from './residence';
import {serviceBusy} from './assignments';
import {characterById,historicalCharacters} from '../data/characters';
import {governingExecutives,politicalName} from './government';
import {ageAt,isAlive,lifeOf} from './lifeState';
import {changeRelationOpinion} from './relationships';
import {planRoute} from './world';
import type {World} from './types';

// Authored sandbox incident, not a claim that this particular famine occurred in 546.
export const dutyPlans={convoy:{name:'自长安转运',coins:40,grain:120,description:'公款 40、公粮 120；须保持长安至天水道路畅通。'},purchase:{name:'就地采买',coins:60,grain:0,description:'公款 60；筹粮较快，但集中采购使当地繁荣下降 3。'}} as const;
export type DutyPlan=keyof typeof dutyPlans;
export type DutyPhase='proposal'|'approval'|'ready'|'working'|'incident'|'aid'|'report'|'closed';
export interface Duty {
 id:'tianshui-relief';created:number;changed:number;deadline:number;officer:string;
 phase:DutyPhase;plan:DutyPlan|null;progress:number;required:number;started:boolean;
 incidentDone:boolean;aidRequested:boolean;funds:{coins:number;grain:number};
 result:null|{day:number;success:boolean;reason:string;merit:number;opinion:number;returned:boolean};
 history:{day:number;text:string}[];
}
export interface DutiesState {version:1;since:number;lastDay:number;task:Duty|null}
export type DutyCommand={type:'duty';action:'open'|'approve'|'revise'|'start'|'escort'|'detour'|'request-aid'|'grant'|'deny'|'close'|'cancel'}|{type:'duty';action:'propose';plan:DutyPlan}|{type:'duty';action:'replace';candidate:string};
export const chiefOfDuty=(w:World)=>governingExecutives(w,'west')[0];
export const dutyPhaseNames:Record<DutyPhase,string>={proposal:'拟定方案',approval:'待批预算',ready:'待启办',working:'办理中',incident:'道路受阻',aid:'待复求援',report:'待考绩',closed:'已结案'};
export function ensureDuties(w:World){if(w.mode==='sandbox')w.duties??={version:1,since:w.day,lastDay:w.day,task:null};return w.duties;}
export function dutyRoute(w:World){return w.realm?.cities.changan.controller!=='west'?null:planRoute('changan','tianshui',id=>w.realm?.cities[id]?.controller==='west');}
export function dutyCandidates(w:World){return historicalCharacters.filter(c=>c.polity==='west'&&c.id!==chiefOfDuty(w)&&!serviceBusy(w,c.id)&&isAlive(w,c.id)&&(ageAt(w,c.id)??0)>=16&&!w.social?.lineage.slice(0,-1).some(p=>p.id===c.id));}
export function dutyUnavailable(w:World,id:string){
 if(!isAlive(w,id))return '负责人已经去世，须改派';
 if(w.social?.lineage.slice(0,-1).some(p=>p.id===id))return '负责人已退居，须改派';
 if(id===chiefOfDuty(w))return '负责人已转任执政，须改派';
 return '';
}
export function dutyPause(w:World){const t=w.duties?.task;if(!t||t.phase==='closed')return '';
 if(w.mobility&&['ready','working','incident','aid'].includes(t.phase)&&!presentAt(w,t.officer,'tianshui'))return t.officer===w.characterId&&w.people[0].journey?'负责人正在出行，办理暂停':'须赴天水办理粮务';
 if(dutyUnavailable(w,t.officer))return dutyUnavailable(w,t.officer);
 if(lifeOf(w,t.officer)?.illness?.severity===3)return '负责人重病，办理暂停';
 if(t.officer===w.characterId&&w.people[0].journey)return '负责人正在出行，办理暂停';
 if(w.realm?.cities.tianshui.controller!=='west')return '天水失守，办理暂停';
 if(t.phase!=='report'&&t.plan==='convoy'&&!dutyRoute(w))return '运粮道路不通，办理暂停';
 return '';
}
export function dutyAttention(w:World){const t=w.duties?.task;if(!t||t.phase==='closed')return '';
 const chief=w.characterId===chiefOfDuty(w),officer=w.characterId===t.officer;
 if(chief&&dutyUnavailable(w,t.officer))return t.id+':replace:'+t.officer;
 if(chief&&['approval','aid','report'].includes(t.phase)||officer&&['proposal','ready','incident'].includes(t.phase))return t.id+':'+t.phase+':'+t.changed;
 return '';
}
function log(w:World,t:Duty,text:string){t.history.push({day:w.day,text});t.history=t.history.slice(-40);w.chronicle.push({day:w.day,person:'player',text:'天水粮务：'+text});w.chronicle=w.chronicle.slice(-100);}
function phase(w:World,t:Duty,next:DutyPhase){t.phase=next;t.changed=w.day;}
export function dutyReason(w:World,c:DutyCommand,actor=w.characterId):string{
 if(w.mode!=='sandbox'||!w.realm||w.campaign?.status!=='active'||!actor||characterById[actor]?.polity!=='west'||!isAlive(w,actor))return '仅西魏在世人物可参与此项差事';
 const chief=actor===chiefOfDuty(w),t=w.duties?.task;
 if(c.action==='open'&&w.service?.tasks.some(t=>t.phase!=='closed'&&(t.officer==='dugu-xin'||t.helper==='dugu-xin')))return '独孤信正在办理另一项差事';
 if(c.action==='open')return t?'此项差事已受理':!chief&&actor!=='dugu-xin'?'须由执政者或独孤信受理':!!dutyUnavailable(w,'dugu-xin')||!chiefOfDuty(w)?'受理人已不在任':w.realm.cities.tianshui.controller!=='west'?'天水不在本国控制下':'';
 if(!t||t.phase==='closed')return '没有待办的粮务';
 if(c.action==='replace')return !chief?'须由执政者改派':!dutyCandidates(w).some(p=>p.id===c.candidate)||c.candidate===t.officer?'请选择其他在世且合格的本国人物':'';
 if(c.action==='cancel')return chief?'':'须由执政者撤回差事';
 const officer=actor===t.officer;
 if(['approve','revise','grant','deny','close'].includes(c.action)&&!chief)return '须由执政者裁决';
 if(['propose','start','escort','detour','request-aid'].includes(c.action)&&!officer)return '须由承办人办理';
 const expected:Partial<Record<DutyCommand['action'],DutyPhase>>={propose:'proposal',approve:'approval',revise:'approval',start:'ready',escort:'incident',detour:'incident','request-aid':'incident',grant:'aid',deny:'aid',close:'report'};
 if(expected[c.action]!==t.phase)return '差事阶段已经变化';
 if(c.action==='propose')return Object.hasOwn(dutyPlans,c.plan)?'':'未知筹粮方案';
 if(c.action==='approve'){const p=dutyPlans[t.plan!],treasury=w.realm.treasuries.west;return treasury.coins<p.coins||treasury.grain<p.grain?'公库不足，不能批准预算':'';}
 if(c.action==='grant')return w.realm.treasuries.west.coins<20?'公款不足 20':'';
 if(c.action==='request-aid')return t.aidRequested?'已请求过追加预算，可选择绕行':'';
 if(c.action==='close'||c.action==='start'||c.action==='escort'||c.action==='detour'){const pause=dutyPause(w);if(pause)return pause;}
 if(c.action==='escort')return t.funds.coins<dutyPlans[t.plan!].coins+20?'增派护送需获批追加公款 20':'';
 return '';
}
function finish(w:World,t:Duty,success:boolean,reason:string){
 if(t.result)return;
 const chief=chiefOfDuty(w),merit=success?20:0,opinion=success?12:-8;
 fiscalRecord(w,'west','task:0',t.started?'expense':centralAccount('west'),t.funds.coins,t.started?'天水粮务结算':'天水粮务退回结余');
 if(!t.started){const treasury=w.realm!.treasuries.west;treasury.coins=Math.min(1_000_000,treasury.coins+t.funds.coins);treasury.grain=Math.min(1_000_000,treasury.grain+t.funds.grain);}
 if(success){const city=w.realm!.cities.tianshui;city.order=Math.min(100,city.order+12);city.prosperity=Math.min(100,city.prosperity+4);const army=w.realm!.armies.find(a=>a.realm==='west'&&a.location==='tianshui'),cargo=t.plan==='convoy'?t.funds.grain:90,toArmy=army?Math.min(60,cargo,600-army.supply):0;if(army)army.supply+=toArmy;city.grain=Math.min(grainCapacity(w,'tianshui'),city.grain+cargo-toArmy);log(w,t,'粮务交割：军粮 '+toArmy+'，余粮 '+(cargo-toArmy)+' 入本地仓（超仓损耗）。');}
 else w.realm!.cities.tianshui.order=Math.max(0,w.realm!.cities.tianshui.order-8);
 if(isAlive(w,t.officer)){awardDeed(w,'west',t.officer,'duty:'+t.created,merit,'天水粮务结案');if(chief&&chief!==t.officer){changeRelationOpinion(w,chief,t.officer,opinion);changeRelationOpinion(w,t.officer,chief,opinion);}}
 t.result={day:w.day,success,reason,merit,opinion,returned:!t.started};phase(w,t,'closed');
 log(w,t,reason+(success?'；考绩上等，承办人功绩最多 +20，双方交往积累各最多 +12，天水秩序最多 +12、繁荣最多 +4。':'；天水秩序最多 −8，在世承办人与执政者的交往积累各最多 −8。')+(!t.started?'未动用预算退回公库。':'已投入钱粮不退回。'));
}
export function actDuty(w:World,c:DutyCommand,actor=w.characterId){
 const reason=dutyReason(w,c,actor);if(reason)throw new Error(reason);const s=ensureDuties(w)!;
 if(c.action==='open'){s.task={id:'tianshui-relief',created:w.day,changed:w.day,deadline:w.day+120,officer:'dugu-xin',phase:'proposal',plan:null,progress:0,required:0,started:false,incidentDone:false,aidRequested:false,funds:{coins:0,grain:0},result:null,history:[]};log(w,s.task,'天水请求筹措军民口粮，限一百二十日办结，由独孤信拟议。');return;}
 const t=s.task!,treasury=w.realm!.treasuries.west;
 switch(c.action){
 case 'propose':t.plan=c.plan;phase(w,t,'approval');log(w,t,politicalName(actor!)+'呈请「'+dutyPlans[c.plan].name+'」，请核拨预算。');break;
 case 'approve':{const p=dutyPlans[t.plan!];fundAssignment(w,'tianshui','west',p.coins,0,'天水粮务预算');treasury.grain-=p.grain;t.funds={coins:p.coins,grain:p.grain};phase(w,t,'ready');log(w,t,politicalName(actor!)+'核准方案，专拨公款 '+p.coins+'、公粮 '+p.grain+'。');break;}
 case 'revise':t.plan=null;phase(w,t,'proposal');log(w,t,'方案退回重拟，尚未拨款。');break;
 case 'start':t.started=true;t.required=t.plan==='convoy'?dutyRoute(w)!.days+12:20;phase(w,t,'working');if(t.plan==='purchase')w.realm!.cities.tianshui.prosperity=Math.max(0,w.realm!.cities.tianshui.prosperity-3);log(w,t,politicalName(actor!)+'启办粮务，预计 '+t.required+' 个有效办理日。');break;
 case 'request-aid':t.aidRequested=true;phase(w,t,'aid');log(w,t,'承办人求援：请追加公款 20，增派护送。');break;
 case 'grant':fundAssignment(w,'tianshui','west',20,0,'天水粮务追加');t.funds.coins+=20;phase(w,t,'incident');log(w,t,'追加公款 20 已拨付，可增派护送。');break;
 case 'deny':phase(w,t,'incident');log(w,t,'公库暂不追加，承办人须另择路线。');break;
 case 'escort':t.incidentDone=true;phase(w,t,'working');log(w,t,'增派护送，保持原定工期。');break;
 case 'detour':t.incidentDone=true;t.required+=5;phase(w,t,'working');log(w,t,'改走迂回路段，增加五个办理日，不追加预算。');break;
 case 'replace':log(w,t,politicalName(t.officer)+'所办粮务移交'+politicalName(c.candidate)+'，原预算和进度保留。');t.officer=c.candidate;t.changed=w.day;break;
 case 'close':if(dutyPause(w))throw new Error(dutyPause(w));finish(w,t,true,'粮务办结，军民口粮已经接济');break;
 case 'cancel':finish(w,t,false,'朝廷撤回粮务');break;
 }
}
export function advanceDuties(w:World){
 const t=w.duties?.task;if(!t||t.phase==='closed'||!w.realm||w.campaign?.status!=='active'||w.duties!.lastDay>=w.day)return;
 w.duties!.lastDay=w.day;
 if(w.day>=t.deadline){finish(w,t,false,'逾期未能办结');return;}
 const chief=chiefOfDuty(w),unavailable=dutyUnavailable(w,t.officer);
 if(unavailable){if(chief&&chief!==w.characterId&&w.day-t.changed>=2){const next=dutyCandidates(w)[0];if(next)actDuty(w,{type:'duty',action:'replace',candidate:next.id},chief);}return;}
 if(t.phase==='working'&&!dutyPause(w)){
  t.progress++;
  if(t.plan==='convoy'&&!t.incidentDone&&t.progress>=Math.ceil(t.required/2)){phase(w,t,'incident');log(w,t,'粮队遇险路，需选择增派护送或绕行。');return;}
  if(t.progress>=t.required){phase(w,t,'report');log(w,t,'筹粮完成，承办人呈报结项，等待考绩。');return;}
 }
 if(w.day-t.changed<2)return;
 let action:DutyCommand|undefined,actor:string|undefined;
 if(t.phase==='proposal'&&t.officer!==w.characterId){actor=t.officer;action={type:'duty',action:'propose',plan:dutyRoute(w)?'convoy':'purchase'};}
 else if(t.phase==='approval'&&chief!==w.characterId){actor=chief;action={type:'duty',action:'approve'};}
 else if(t.phase==='ready'&&t.officer!==w.characterId){actor=t.officer;action={type:'duty',action:'start'};}
 else if(t.phase==='incident'&&t.officer!==w.characterId){actor=t.officer;action=t.funds.coins>=dutyPlans[t.plan!].coins+20?{type:'duty',action:'escort'}:!t.aidRequested?{type:'duty',action:'request-aid'}:{type:'duty',action:'detour'};}
 else if(t.phase==='aid'&&chief!==w.characterId){actor=chief;action={type:'duty',action:treasuryEnough(w)?'grant':'deny'};}
 else if(t.phase==='report'&&chief!==w.characterId&&!dutyPause(w)){actor=chief;action={type:'duty',action:'close'};}
 if(action&&actor&&!dutyReason(w,action,actor))actDuty(w,action,actor);
}
function treasuryEnough(w:World){return w.realm!.treasuries.west.coins>=20;}
