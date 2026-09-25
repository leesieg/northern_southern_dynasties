import {serviceApprover,serviceException} from './serviceMandates';
import {economyPending} from './personalEconomyAdapter';
import {appointmentPauses} from './appointmentCycle';
import type {RealmId} from './realm';
import {localTitle} from './localAdministration';
import {currentRealm} from './government';
import {courtOf} from './court';
import {governmentExecutive} from './government';
import {movements} from '../data/court';
import {retinueMembers,postStatus} from './retinue';
import {clanStanding} from './clans';
import {relationshipPersonById} from '../data/relationships';
import {activities} from './mobility';
import {serviceAttention,serviceChief} from './assignments';
import {assignmentPhases,assignmentTemplates} from '../data/assignments';
import {dutyAttention,dutyPhaseNames} from './duties';
import {lifeOf} from './lifeState';
import {siteById} from '../data/scenario';
import type {World} from './types';
import {playerRealm} from './realm';
export function pauseHasActions(w:World,event:PauseEvent){
 if(event.kind==='economy')return economyPending(w).some(q=>q.id===event.economyId);
 if(event.kind==='appointments')return w.campaign?.status==='active'&&!!event.appointmentRealm&&w.realm?.local?.cycle?.rounds[event.appointmentRealm]?.status==='pending'&&w.realm.local.cycle.rounds[event.appointmentRealm]?.approver===w.characterId;
 if(event.kind==='local')return !!w.realm?.local?.requests.some(q=>q.id===event.localId&&q.status==='pending'&&q.approver===w.characterId);
 if(event.kind==='court')return !!w.characterId&&!!courtOf(w)?.petition&&courtOf(w)?.petition?.due===event.courtDue&&governmentExecutive(w);
 if(event.kind==='fiscal')return !!w.realm?.fiscal?.requests.some(q=>q.id===event.fiscalId&&q.status==='pending'&&q.approver===w.characterId);
 if(event.kind==='realm')return !!w.realm?.event;
 if(event.kind==='diplomacy')return !!w.realm&&!!w.diplomacy?.missions.some(m=>m.status==='audience'&&m.to===playerRealm(w));
 if(event.kind==='mobility')return !!w.mobility?.captivity||!!w.mobility?.activities.some(a=>(event.activityId===undefined||a.id===event.activityId)&&!['done','cancelled'].includes(a.phase));
 if(event.kind==='duties')return !!w.duties?.task&&w.duties.task.phase!=='closed';
 if(event.kind==='service'||event.kind==='arrival'&&event.assignmentId){
  if(event.assignmentId)return !!w.service?.tasks.some(t=>t.id===event.assignmentId&&t.phase!=='closed');
  if(!w.realm)return false;const r=playerRealm(w),c=w.service?.councils[r];return !!c&&(!c.decided||!!c.proposal&&serviceChief(w,r)===w.characterId);
 }
 return false;
}
export interface PauseEvent {id:string;economyId?:number;appointmentRealm?:RealmId;localId?:number;courtDue?:number;fiscalId?:number;assignmentId?:number;activityId?:number;kind:'economy'|'appointments'|'local'|'court'|'fiscal'|'retinue'|'clan'|'mobility'|'service'|'arrival'|'journey'|'duties'|'health'|'inheritance'|'diplomacy'|'realm'|'outcome'|'background'|'error';title:string;body:string;site?:string;person?:string}
export function pauseSnapshot(w:World){return {campaigns:new Map(w.militaryCampaigns?.items.map(q=>[q.id,q.status+'|'+q.reason])),business:new Map(w.enterprises?.items.map(e=>[e.id,e.order?.started])),wars:new Set(w.realm?.wars?.map(v=>v.id)),economy:new Set(economyPending(w).map(q=>q.id)),appointments:new Set(appointmentPauses(w).map(e=>e.id)),local:new Map(w.realm?.local?.requests.map(q=>[q.id,q.status+'|'+q.approver])),transfers:new Map(w.realm?.population?.transfers.map(t=>[t.id,t.status])),courtDue:w.characterId?courtOf(w)?.petition?.due:undefined,fiscal:new Map(w.realm?.fiscal?.requests.map(q=>[q.id,q.status+'|'+q.approver])),clan:clanStanding(w,w.characterId??''),retinue:retinueMembers(w).map(m=>({id:m.id,arrears:m.arrears,ready:!!m.post&&!postStatus(w,m.post,m.site??undefined).reason})),mobility:new Map(w.mobility?.activities.map(a=>[a.id,a.phase])),reported:w.mobility?.reported??0,service:serviceAttention(w),closedTasks:new Set(w.service?.tasks.filter(t=>t.phase==='closed').map(t=>t.id)),day:w.day,actor:w.characterId,ill:!!lifeOf(w,w.characterId)?.illness,destination:w.people[0].journey?.route.at(-1),attention:dutyAttention(w),closed:w.duties?.task?.phase==='closed',audiences:new Set(w.diplomacy?.missions.filter(m=>m.status==='audience').map(m=>m.id)),event:JSON.stringify(w.realm?.event??null),status:w.campaign?.status};}
export function pauseEvents(before:ReturnType<typeof pauseSnapshot>,w:World):PauseEvent[]{
 const events:PauseEvent[]=economyPauses(w).filter(e=>!before.economy.has(e.economyId!));
 const add=(kind:PauseEvent['kind'],title:string,body:string,extra:Partial<PauseEvent>={})=>events.push({id:`${w.day}:${kind}:${events.length}`,kind,title,body,...extra});
 for(const q of w.militaryCampaigns?.items??[])if((q.issuer===w.characterId||q.commander===w.characterId)&&before.campaigns.has(q.id)&&before.campaigns.get(q.id)!==q.status+'|'+q.reason&&(q.status!=='active'||q.reason))add('background','战役呈报',q.reason||'战役状态变化',{site:q.target,person:q.commander});
 for(const e of w.enterprises?.items??[])if(e.owner===w.characterId&&before.business.get(e.id)!==undefined&&!e.order)add('background','承包结算',siteById[e.site].name+'承包已结清，请在私人事业查看资本和收支。',{person:e.owner,site:e.site});
 for(const v of w.realm?.wars??[])if(v.civil&&v.attacker===(w.characterId?currentRealm(w):null)&&!before.wars.has(v.id))add('background','内战爆发','地方举兵，支持地区停止输税。须在军务中安排部队与议和。',{site:v.civil.base,person:v.civil.claimant});
 if([...before.wars].some(id=>!w.realm?.wars?.some(v=>v.id===id)))add('background','战事结束','和约已执行，请查看领土、公职及财政变化。');
 for(const t of w.realm?.population?.transfers??[])if(t.realm===(w.characterId?currentRealm(w):null)&&t.status!=='traveling'&&before.transfers.get(t.id)==='traveling')add('background',t.kind==='grain'?'公粮抵达':'迁民抵达',`${siteById[t.to].name}接收 ${t.arrived}${t.kind==='grain'?'粮':'人'}，损耗 ${t.lost}。`,{site:t.to});
 for(const e of appointmentPauses(w))if(!before.appointments.has(e.id))events.push(e);
 for(const q of w.realm?.local?.requests??[])if(before.local.get(q.id)!==q.status+'|'+q.approver&&(q.status==='pending'?q.approver===w.characterId:q.actor===w.characterId))add('local',q.status==='pending'?'地方授官奏请':'授官批复',localTitle(q.territory)+' · '+(q.reply||'请审议候选人'),{localId:q.id,person:q.candidate});
 for(const q of w.realm?.fiscal?.requests??[])if(before.fiscal.get(q.id)!==q.status+'|'+q.approver&&(q.status==='pending'?q.approver===w.characterId:q.actor===w.characterId))add('fiscal',q.status==='pending'?'地方请款':'拨款批复',(q.territory?localTitle(q.territory):siteById[q.site].name)+' · '+q.amount+' 钱 · '+(q.reply||'请审议本城公款申请'),{fiscalId:q.id,site:q.site});
 for(const a of w.mobility?.activities??[])if(before.mobility.get(a.id)!==a.phase&&['ready','decision','done','cancelled'].includes(a.phase))add('mobility',activities[a.kind].name,a.result||`${siteById[a.site].name} · ${a.phase==='ready'?'参加者已到齐，可以开始办理。':'驻留事务已有进展，请决定下一步。'}`,{activityId:a.id,site:a.site});
 if(w.mobility?.captivity&&(w.mobility.reported>before.reported))add('mobility','统帅被俘','所部溃散，可筹措赎金。');
 if(w.mobility&&w.mobility.reported>before.reported&&!events.some(e=>e.kind==='mobility'))add('mobility','军中急报','所部溃散，你负伤脱离军队，请安排休养。');
 for(const old of before.retinue){const m=w.retinue?.members[old.id],name=relationshipPersonById[old.id]?.name??old.id;if(!m||m.host!==w.characterId)add('retinue','幕府人事有变',name+'已离开幕府，请查看空缺职位。');else if(m.arrears>old.arrears)add('retinue','幕府欠俸',name+'俸钱未付，职务暂停；请备足钱财，下期结清。');else if(m.post&&!old.ready&&!postStatus(w,m.post,m.site??undefined).reason)add('retinue','幕职就绪',name+'已可履职。');}
 const standing=clanStanding(w,w.characterId??'');if(before.actor===w.characterId&&standing&&(standing.elite!==!!before.clan?.elite||standing.elite&&standing.rank!==before.clan?.rank))add('clan','门第有变',standing.family.name+(standing.elite?'跻身本国世族，族望第 '+standing.rank+' 位。':'不再位列本国世族。'));
 const serviceKeys=serviceAttention(w).filter(key=>!before.service.includes(key));
 const announced=new Set<number>();
 for(const key of serviceKeys){if(key.startsWith('council')){add('service',key.startsWith('council-reply:')?'议事批复送达':'本季评议',key.startsWith('council-reply:')?'你的议事上书已有批复，请阅朝廷文书。':'请议定本季重心，或裁决呈上的议事文书。');continue;}const id=Number(key.split(':')[1]),task=w.service?.tasks.find(t=>t.id===id);if(task&&!announced.has(id)){announced.add(id);add('service',siteById[task.site].name+' · '+assignmentTemplates[task.kind].name,key.startsWith('invite:')?'同僚邀你协办，请答复。':'差事进展：'+assignmentPhases[task.phase]+'。',{assignmentId:id});}}
 for(const task of w.service?.tasks??[])if(task.phase==='closed'&&!before.closedTasks.has(task.id)&&(task.officer===w.characterId||serviceApprover(w,task)===w.characterId&&serviceException(w,task)||Object.hasOwn(task.contributors,w.characterId??'')))add('service','考绩文书送达',siteById[task.site].name+assignmentTemplates[task.kind].name+'已结案。',{assignmentId:task.id});
 if(before.actor!==w.characterId)add('inheritance','家业有继',`家业已由${w.people[0].name}承继。请查看新身份与家族。`,{person:w.characterId});
 if(!before.ill&&lifeOf(w,w.characterId)?.illness)add('health','身体有恙','你身体有恙，可查看病情并安排延医休养。',{person:w.characterId});
 if(dutyAttention(w)&&dutyAttention(w)!==before.attention||!before.closed&&w.duties?.task?.phase==='closed')add('duties','天水粮务有报',`粮务进展：${dutyPhaseNames[w.duties!.task!.phase]}。请阅文书。`);
 if(w.diplomacy?.missions.some(m=>m.status==='audience'&&!before.audiences.has(m.id)))add('diplomacy','使团抵达','使团已经抵达，等待你的答复。');
 if(w.realm?.event&&JSON.stringify(w.realm.event)!==before.event)add('realm','政务待决','有新的政务呈报，请作出裁决。');
 if(w.campaign&&w.campaign.status!=='active'&&w.campaign.status!==before.status)add('outcome','此段生涯已终','本局已经结束，请查看生涯结果。');
 if(before.destination&&!w.people[0].journey&&before.actor===w.characterId&&!events.some(e=>e.kind==='mobility'&&e.site===w.people[0].location)){const arrived=w.people[0].location===before.destination;add(arrived?'arrival':'journey',arrived?'抵达目的地':'行程中止',arrived?`你已抵达${siteById[w.people[0].location].name}，可以拜访当地人物或安排下一步行程。`:'行程因局势变化中止，请查看当前所在地与纪事。',{site:w.people[0].location,assignmentId:w.service?.tasks.find(t=>t.site===w.people[0].location&&(t.officer===w.characterId||t.helper===w.characterId)&&!['report','closed'].includes(t.phase))?.id});}
 const petition=w.characterId?courtOf(w)?.petition:null;if(petition&&petition.due!==before.courtDue&&governmentExecutive(w))add('court',movements[petition.group].name+'奏议',movements[petition.group].goal+' 请决定批准或否决。',{courtDue:petition.due});
 return events;
}

export function economyPauses(w:World):PauseEvent[]{return economyPending(w).map(q=>({id:'economy:'+q.id,kind:'economy',economyId:q.id,title:'查核呈报',body:'监察人已呈报查核结果，请审议证据并决定是否追缴。'}));}
