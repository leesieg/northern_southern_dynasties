import {CustodyPerson} from './CustodyPanel';
import {EconomyCases} from './GovernmentAudit';
import {AppointmentReview} from './AppointmentReview';
import {LocalRequests} from './LocalAdministration';
import {RealmBadge} from './RealmBadge';
import {CourtPetitionAudience,FiscalPetitionAudience} from './PetitionCases';
import {AudienceDecorHostContext,AudienceDeferContext} from './AudienceContext';
import {ActivityProgress} from './MobilityPanel';
import {ServiceOutcome} from './ServiceAudience';
import {AssignmentPanel} from './AssignmentPanel';
import {CouncilPanel} from './ServicePanel';
import {diplomaticQuote,diplomacyActions} from '../core/diplomacy';
import {playerRealm} from '../core/realm';
import {useEffect,useRef,useState} from 'react';
import type {PauseEvent} from '../core/pauseEvents';
import {pauseHasActions} from '../core/pauseEvents';
import type {GameCommand,World} from '../core/types';
import {eventDefinitions,realmReason} from '../core/realm';
import {DutiesPanel} from './DutiesPanel';
import {dutyPhaseNames} from '../core/duties';
import {assignmentPhases} from '../data/assignments';
import {serviceAuthority} from '../core/serviceMandates';
import {serviceChief} from '../core/assignments';
import {chiefOfDuty} from '../core/duties';
import './pauseDialog.css';
export function PauseDialog({event,count,world,pending,error,onClose,onNavigate,send}:{event:PauseEvent;count:number;world:World;pending:boolean;error?:string;onClose:()=>void;onNavigate:(event:PauseEvent)=>void;send:(command:GameCommand)=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 const [decorHost,setDecorHost]=useState<HTMLDivElement|null>(null);
 useEffect(()=>{const dialog=ref.current!;const previous=document.activeElement as HTMLElement|null;dialog.showModal();return()=>{dialog.close();previous?.focus();};},[]);
 const realmEvent=event.kind==='realm'?world.realm?.event:null;
 const actionable=pauseHasActions(world,event);
 const grant=world.realm?.fiscal?.requests.find(q=>q.id===event.fiscalId);
 const task=event.assignmentId?world.service?.tasks.find(t=>t.id===event.assignmentId):undefined;
 const localRequest=event.localId?world.realm?.local?.requests.find(q=>q.id===event.localId):undefined;
 const auditCase=event.economyId?world.economy?.investigations.find(q=>q.id===event.economyId):undefined;
 const council=world.characterId?world.service?.councils[playerRealm(world)]?.proposal:undefined;
 const audience=actionable&&(
  !!task&&['petition','approval','aid','report'].includes(task.phase)&&serviceAuthority(world,task,world.characterId!)
  ||event.kind==='court'
  ||event.kind==='economy'&&auditCase?.phase==='report'
  ||event.kind==='fiscal'&&grant?.status==='pending'&&grant.approver===world.characterId
  ||event.kind==='local'&&localRequest?.status==='pending'&&localRequest.approver===world.characterId
  ||event.kind==='duties'&&!!world.duties?.task&&['approval','aid','report'].includes(world.duties.task.phase)&&chiefOfDuty(world)===world.characterId
  ||event.kind==='service'&&!event.assignmentId&&!!council&&serviceChief(world,playerRealm(world))===world.characterId
 );
 const body=event.kind==='service'&&task&&task.phase!=='closed'?(task.invitation?.person===world.characterId?'同僚邀你协办，请答复。':'差事进展：'+assignmentPhases[task.phase]+'。'):event.kind==='duties'&&world.duties?.task?'粮务进展：'+dutyPhaseNames[world.duties.task.phase]+'。':event.body;
 const label=event.kind==='power'?'审阅政治议案':event.kind==='custody'?'前往人物处置':event.kind==='military'?'裁定军事事项':event.kind==='economy'?'前往政务监察':event.kind==='court'||event.kind==='situation'?'查看朝局':event.kind==='mobility'?'查看人物':event.kind==='service'?'前往差事簿':event.kind==='arrival'?'查看所在地':event.kind==='diplomacy'?'查看邦交':event.kind==='duties'?'前往地方差事':'前往政务';
 return <dialog ref={ref} className={`pause-dialog ${audience?'pause-dialog--audience':'paper-dialog'}`} aria-labelledby="pause-title" aria-describedby={audience?undefined:'pause-body'} onCancel={e=>{e.preventDefault();if(!pending&&(!actionable||audience))onClose();}} onKeyDown={e=>{if(e.key==='Escape')e.stopPropagation();}}>
 {audience&&<div className="pause-audience-decoration" ref={setDecorHost}/>}
 <AudienceDecorHostContext.Provider value={audience?decorHost:null}>
 <AudienceDeferContext.Provider value={audience?onClose:null}>
 <div className={audience?'pause-dialog-scroll':undefined}>
 <header>{!audience&&<span className="eyebrow">时光暂停{count>1?` · 尚有 ${count} 件消息`:''}</span>}<h2 id="pause-title">{event.title}</h2></header>
 {!audience&&<p id="pause-body">{body}</p>}
 {!actionable&&event.id.startsWith('unrest:')&&<button disabled={pending} onClick={()=>onNavigate(event)}>前往当地治理 ›</button>}
 {!actionable&&event.kind==='situation'&&<button disabled={pending} onClick={()=>onNavigate(event)}>查看原因与应对 ›</button>}
 {!actionable&&event.kind==='service'&&task?.result&&<><ServiceOutcome task={task}/><button disabled={pending} onClick={()=>onNavigate(event)}>查看结案与后续 ›</button></>}
 {actionable&&event.kind==='custody'&&event.person&&<CustodyPerson key={event.person} world={world} person={event.person} pending={pending} send={send}/>}
 {actionable&&event.kind==='mobility'&&<ActivityProgress world={world} send={send} pending={pending} id={event.activityId}/>}
 {actionable&&(event.kind==='service'||event.kind==='arrival'&&event.assignmentId)&&(event.assignmentId?task&&<AssignmentPanel key={task.id} world={world} pending={pending} send={send} task={task} onSituation={()=>onNavigate({...event,kind:'situation'})} onTerritory={site=>onNavigate({...event,kind:'arrival',site:site.replace('city:','')})} onPerson={person=>onNavigate({...event,kind:'inheritance',person})}/>:<CouncilPanel world={world} pending={pending} send={send} onPerson={person=>onNavigate({...event,kind:'inheritance',person})}/>)}
 {actionable&&event.kind==='duties'&&world.duties?.task&&<DutiesPanel world={world} pending={pending} send={send} onPerson={person=>onNavigate({...event,kind:'inheritance',person})}/>}
 {event.kind==='economy'&&actionable&&<EconomyCases world={world} pending={pending} send={send} caseId={event.economyId} onPerson={person=>onNavigate({...event,kind:'inheritance',person})}/>}
 {event.kind==='court'&&actionable&&<CourtPetitionAudience world={world} pending={pending} send={send} onPerson={person=>onNavigate({...event,kind:'inheritance',person})}/>}
 {event.kind==='appointments'&&actionable&&event.appointmentRealm&&<AppointmentReview world={world} realm={event.appointmentRealm} pending={pending} send={send}/>}
 {event.kind==='local'&&actionable&&<LocalRequests world={world} pending={pending} send={send} requestId={event.localId} onPerson={person=>onNavigate({...event,kind:'inheritance',person})}/>}
 {event.kind==='fiscal'&&actionable&&grant&&grant.status==='pending'&&grant.approver===world.characterId&&<FiscalPetitionAudience world={world} request={grant} pending={pending} send={send} onPerson={person=>onNavigate({...event,kind:'inheritance',person})}/>}
 {realmEvent&&<section className="pause-decision"><h3>{eventDefinitions[realmEvent.kind].title}</h3><p>{eventDefinitions[realmEvent.kind].body}</p><p>{eventDefinitions[realmEvent.kind].effect}</p><div className="realm-actions">{(['fund','decline'] as const).map(choice=>{const command={type:'realm',action:'event',choice} as const,reason=realmReason(world,command);return <div key={choice}><button disabled={pending||!!reason} onClick={()=>send(command)}>{choice==='fund'?`拨付处理 · ${eventDefinitions[realmEvent.kind].cost}`:'暂缓处理'}</button>{reason&&<small>{reason}</small>}</div>;})}</div></section>}
 {event.kind==='diplomacy'&&world.diplomacy?.missions.filter(m=>m.status==='audience'&&m.to===playerRealm(world)).map(m=><section className="pause-decision" key={m.id}><h3><RealmBadge realm={m.from} world={world}/>使团 · {diplomacyActions[m.action]}</h3><p>答复期限尚余 {Math.max(0,m.expires-world.day)} 日</p><div className="realm-actions">{(['accept','reject'] as const).map(action=>{const command={type:'diplomacy',action,mission:m.id} as const,reason=diplomaticQuote(world,command).reason;return <div key={action}><button disabled={pending||!!reason} onClick={()=>send(command)}>{action==='accept'?'接纳议案':'拒绝议案'}</button>{reason&&<small>{reason}</small>}</div>;})}</div></section>)}
 {event.kind==='realm'&&!realmEvent&&<p role="status">此项政务已处理。</p>}
 {error&&<p className="pause-error" role="alert">{error}</p>}
 {!audience&&<footer>{actionable&&(event.kind==='appointments'||event.kind==='economy')?null:actionable&&(event.kind==='service'&&!!event.assignmentId||event.kind==='arrival'&&!!event.assignmentId||event.kind==='duties')?<button disabled={pending} onClick={onClose}>稍后处理</button>:actionable?<button disabled={pending} className="primary" onClick={()=>onNavigate(event)}>{label} →</button>:<button disabled={pending} onClick={onClose}>知道了</button>}</footer>}
 </div>
 </AudienceDeferContext.Provider>
 </AudienceDecorHostContext.Provider>
 </dialog>;
}
