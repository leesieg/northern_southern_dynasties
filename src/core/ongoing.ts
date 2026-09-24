import type {World,Journey} from './types';
import {siteById} from '../data/scenario';
import {relationshipPersonById} from '../data/relationships';
import {assignmentTemplates,assignmentPhases} from '../data/assignments';
import {assignmentPause,serviceChief} from './assignments';
import {dutyPause,dutyPhaseNames,chiefOfDuty} from './duties';
import {activities} from './mobility';
import {governmentOf,governmentTaskPause,governingExecutives} from './government';
import {courtOf,foundingPause} from './court';
import {playerRealm} from './realm';
import {diplomacyActions} from './diplomacy';
import {cityBuildings,estateBuildings} from './construction';
export type OngoingKind='travel'|'activity'|'service'|'petition'|'diplomacy'|'construction'|'reform'|'scheme'|'military'|'retinue';
export type OngoingTarget={page:'person';person:string}|{page:'service';id?:number}|{page:'duties'}|{page:'city';site:string;tab:'travel'|'build'|'military'}|{page:'estate'}|{page:'diplomacy';realm:ReturnType<typeof playerRealm>}|{page:'court'|'government'|'politics'|'retinue'|'treasury'};
export interface OngoingItem {id:string;kind:OngoingKind;title:string;started:number;progress:number|null;days:number|null;clock:'remaining'|'deadline'|'estimate'|'waiting';status:string;target:OngoingTarget}
const ratio=(done:number,total:number)=>total>0?Math.max(0,Math.min(1,done/total)):null;
const name=(id:string)=>relationshipPersonById[id]?.name??id;
function journeyProgress(j:Journey){const total=j.durations.reduce((n,d)=>n+d,0),done=j.durations.slice(0,j.leg).reduce((n,d)=>n+d,0)+j.elapsed;return {progress:ratio(done,total),days:Math.max(0,total-done)};}
/** Read-only projection of actual world state; no extra task timers or saved copies. */
export function ongoingItems(w:World):OngoingItem[]{
 const items:OngoingItem[]=[],actor=w.characterId??'player',r=w.realm?playerRealm(w):null,chief=r?governingExecutives(w,r).includes(actor):false;
 const add=(item:OngoingItem)=>items.push(item);
 const timed=(id:string,kind:OngoingKind,title:string,started:number,due:number,target:OngoingTarget,status='进行中')=>add({id,kind,title,started,progress:ratio(w.day-started,due-started),days:Math.max(0,due-w.day),clock:'remaining',status,target});
 const active=w.mobility?.activities.filter(a=>!['done','cancelled'].includes(a.phase)&&(a.actor===actor||a.delegate===actor))??[];
 const ledArmy=r&&w.mobility?.commanders[r]===actor?w.realm?.armies.find(a=>a.realm===r&&a.journey):undefined;
 const journey=ledArmy?.journey??w.people[0].journey;
 const linked=active.find(a=>!a.delegate&&a.phase==='travel'&&journey?.route.at(-1)===a.site);
 if(journey&&!linked)add({id:ledArmy?'army:'+r+':'+journey.started:'travel:'+journey.started+':'+journey.route.join('-'),kind:ledArmy?'military':'travel',title:(ledArmy?'随军前往':'前往')+siteById[journey.route.at(-1)!].name,started:journey.started,...journeyProgress(journey),clock:'remaining',status:'出行中',target:{page:'city',site:journey.route.at(-1)!,tab:'travel'}});
 for(const a of active){const traveling=a.delegate?w.mobility?.residences[a.delegate]?.journey:linked?.id===a.id?journey:null;const working=a.phase==='working'&&a.due!==null;add({id:'activity:'+a.id,kind:'activity',title:activities[a.kind].name+' · '+siteById[a.site].name,started:a.created,progress:traveling?journeyProgress(traveling).progress:working?ratio(w.day-a.started!,a.due!-a.started!):a.phase==='decision'?1:null,days:traveling?journeyProgress(traveling).days:working?Math.max(0,a.due!-w.day):Math.max(0,a.deadline-w.day),clock:traveling||working?'remaining':'deadline',status:({travel:'赴约途中',ready:'待开始',working:'驻留办理',decision:'待定夺'})[a.phase as 'travel'|'ready'|'working'|'decision'],target:{page:'person',person:actor}});}
 for(const t of w.service?.tasks??[]){if(t.phase==='closed'||t.officer!==actor&&t.helper!==actor&&t.invitation?.person!==actor&&!(r===t.realm&&serviceChief(w,t.realm)===actor))continue;add({id:'service:'+t.id,kind:'service',title:siteById[t.site].name+' · '+assignmentTemplates[t.kind].name,started:t.created,progress:ratio(t.progress,t.required),days:Math.max(0,t.deadline-w.day),clock:'deadline',status:assignmentPause(w,t)||assignmentPhases[t.phase],target:{page:'service',id:t.id}});}
 for(const q of w.realm?.fiscal?.requests??[])if(q.status==='pending'&&(q.actor===actor||q.approver===actor))add({id:'fiscal:'+q.id,kind:'petition',title:siteById[q.site].name+'拨款 '+q.amount+' 钱',started:q.created,progress:null,days:Math.max(0,q.created+60-w.day),clock:'deadline',status:q.approver===actor?'待批复':'候批',target:{page:'treasury'}});
 const duty=w.duties?.task;if(duty&&duty.phase!=='closed'&&(duty.officer===actor||chiefOfDuty(w)===actor))add({id:'duty:'+duty.created,kind:'service',title:'天水粮务',started:duty.created,progress:ratio(duty.progress,duty.required),days:Math.max(0,duty.deadline-w.day),clock:'deadline',status:dutyPause(w)||dutyPhaseNames[duty.phase],target:{page:'duties'}});
 if(r){const court=courtOf(w,r),g=governmentOf(w,r),petition=court?.petition;
  if(petition&&(petition.sponsor===actor||chief))add({id:'petition:'+petition.sponsor+':'+petition.due,kind:'petition',title:'集团奏议',started:petition.due,progress:null,days:Math.max(0,petition.due-w.day),clock:'deadline',status:chief?'待批复':'候旨',target:{page:'court'}});
  const proposal=w.service?.councils[r].proposal;if(proposal&&(proposal.actor===actor||chief))add({id:'council:'+proposal.actor+':'+proposal.day,kind:'petition',title:'本季议事奏请',started:proposal.day,progress:null,days:null,clock:'waiting',status:'待批复',target:{page:'service'}});
  const task=g?.task;if(task&&(task.sponsor===actor||chief))add({id:'reform:'+task.started+':'+task.target,kind:'reform',title:task.kind==='law'?'推行新法':task.kind==='succession'?'继位议程':'政体改革',started:task.started,progress:ratio(task.progress,task.required),days:governmentTaskPause(w,r)?null:Math.max(0,task.required-task.progress),clock:'estimate',status:governmentTaskPause(w,r)||'推行中',target:{page:'government'}});
  const founding=court?.founding;if(founding&&(founding.sponsor===actor||chief))add({id:'founding:'+founding.started,kind:'reform',title:'建朝 · '+founding.name,started:founding.started,progress:ratio(founding.progress,founding.required),days:foundingPause(w,r)?null:Math.max(0,founding.required-founding.progress),clock:'estimate',status:foundingPause(w,r)||'筹备中',target:{page:'court'}});
  for(const o of w.realm!.offices)if(o.candidate===actor||chief&&w.realm!.cities[o.site].owner===r)add({id:'office:'+o.site+':'+o.due,kind:'petition',title:siteById[o.site].name+'任命',started:0,progress:null,days:Math.max(0,o.due-w.day),clock:'remaining',status:'文书送达中',target:{page:'politics'}});
  for(const m of w.diplomacy?.missions??[])if(m.actor===actor||chief&&(m.from===r||m.to===r)){if(m.status==='traveling')timed('envoy:'+m.id,'diplomacy',diplomacyActions[m.action],m.sent,m.due,{page:'diplomacy',realm:m.from===r?m.to:m.from},'使团在途');else add({id:'envoy:'+m.id,kind:'diplomacy',title:diplomacyActions[m.action],started:m.sent,progress:1,days:Math.max(0,m.expires-w.day),clock:'deadline',status:'等待接见',target:{page:'diplomacy',realm:m.from===r?m.to:m.from}});}
  for(const army of w.realm!.armies)if(army.realm===r&&army.journey&&w.mobility?.commanders[r]!==actor&&(chief||w.realm!.mandate))add({id:'army:'+r+':'+army.journey.started,kind:'military',title:'行军 · '+siteById[army.journey.route.at(-1)!].name,started:army.journey.started,...journeyProgress(army.journey),clock:'remaining',status:'行军中',target:{page:'city',site:army.location,tab:'military'}});
 }
 for(const [site,h] of Object.entries(w.holdings.cities)){const p=h.project;if(p&&w.holdings.governedCities.includes(site))timed('city:'+site+':'+p.started,'construction',siteById[site].name+' · '+cityBuildings[p.building as keyof typeof cityBuildings].name,p.started,p.due,{page:'city',site,tab:'build'});}
 const p=w.holdings.estate.project;if(p)timed('estate:'+p.started,'construction',estateBuildings[p.building as keyof typeof estateBuildings].name,p.started,p.due,{page:'estate'});
 for(const [key,s] of [['social',w.social?.scheme],['relationship',w.relationships?.scheme]] as const)if(s)timed('scheme:'+key+':'+s.started+':'+s.target,'scheme',('kind'in s&&s.kind==='control'?'挟制':'交好')+' · '+name(s.target),s.started,s.due,{page:'person',person:s.target});
 for(const [id,m] of Object.entries(w.retinue?.members??{})){const j=w.mobility?.residences[id]?.journey;if(m.host===actor&&j)add({id:'retinue:'+id+':'+j.started,kind:'retinue',title:name(id)+'赴任',started:j.started,...journeyProgress(j),clock:'remaining',status:'赴任途中',target:{page:'retinue'}});}
 return items.sort((a,b)=>a.started-b.started||a.id.localeCompare(b.id));
}
