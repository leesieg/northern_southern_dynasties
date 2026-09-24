import {ActivityProgress} from './MobilityPanel';
import {AssignmentPanel} from './AssignmentPanel';
import {CouncilPanel} from './ServicePanel';
import {diplomaticQuote,diplomacyActions} from '../core/diplomacy';
import {playerRealm} from '../core/realm';
import {regimeName} from '../core/government';
import {useEffect,useRef} from 'react';
import type {PauseEvent} from '../core/pauseEvents';
import {pauseHasActions} from '../core/pauseEvents';
import type {GameCommand,World} from '../core/types';
import {eventDefinitions,realmReason} from '../core/realm';
import {DutiesPanel} from './DutiesPanel';
import './pauseDialog.css';
export function PauseDialog({event,count,world,pending,error,onClose,onNavigate,send}:{event:PauseEvent;count:number;world:World;pending:boolean;error?:string;onClose:()=>void;onNavigate:(event:PauseEvent)=>void;send:(command:GameCommand)=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const dialog=ref.current!;const previous=document.activeElement as HTMLElement|null;dialog.showModal();return()=>{dialog.close();previous?.focus();};},[]);
 const realmEvent=event.kind==='realm'?world.realm?.event:null;
 const actionable=pauseHasActions(world,event);
 const label=event.kind==='mobility'?'查看人物':event.kind==='service'?'前往差事簿':event.kind==='arrival'?'查看所在地':event.kind==='diplomacy'?'查看邦交':event.kind==='duties'?'前往地方差事':'前往政务';
 return <dialog ref={ref} className="pause-dialog" aria-labelledby="pause-title" aria-describedby="pause-body" onCancel={e=>{e.preventDefault();if(!pending&&!actionable)onClose();}} onKeyDown={e=>{if(e.key==='Escape')e.stopPropagation();}}>
 <header><span className="eyebrow">时光暂停{count>1?` · 尚有 ${count} 件消息`:''}</span><h2 id="pause-title">{event.title}</h2></header>
 <p id="pause-body">{event.body}</p>
 {actionable&&event.kind==='mobility'&&<ActivityProgress world={world} send={send} pending={pending} id={event.activityId}/>}
 {actionable&&(event.kind==='service'||event.kind==='arrival'&&event.assignmentId)&&(event.assignmentId?world.service?.tasks.filter(t=>t.id===event.assignmentId).map(task=><AssignmentPanel key={task.id} world={world} pending={pending} send={send} task={task} onPerson={person=>onNavigate({...event,kind:'inheritance',person})}/>):<CouncilPanel world={world} pending={pending} send={send} onPerson={person=>onNavigate({...event,kind:'inheritance',person})}/>)}
 {actionable&&event.kind==='duties'&&world.duties?.task&&<DutiesPanel world={world} pending={pending} send={send} onPerson={person=>onNavigate({...event,kind:'inheritance',person})}/>}
 {realmEvent&&<section className="pause-decision"><h3>{eventDefinitions[realmEvent.kind].title}</h3><p>{eventDefinitions[realmEvent.kind].body}</p><p>{eventDefinitions[realmEvent.kind].effect}</p><div className="realm-actions">{(['fund','decline'] as const).map(choice=>{const command={type:'realm',action:'event',choice} as const,reason=realmReason(world,command);return <div key={choice}><button disabled={pending||!!reason} onClick={()=>send(command)}>{choice==='fund'?`拨付处理 · ${eventDefinitions[realmEvent.kind].cost}`:'暂缓处理'}</button>{reason&&<small>{reason}</small>}</div>;})}</div></section>}
 {event.kind==='diplomacy'&&world.diplomacy?.missions.filter(m=>m.status==='audience'&&m.to===playerRealm(world)).map(m=><section className="pause-decision" key={m.id}><h3>{regimeName(world,m.from)}使团 · {diplomacyActions[m.action]}</h3><p>答复期限尚余 {Math.max(0,m.expires-world.day)} 日</p><div className="realm-actions">{(['accept','reject'] as const).map(action=>{const command={type:'diplomacy',action,mission:m.id} as const,reason=diplomaticQuote(world,command).reason;return <div key={action}><button disabled={pending||!!reason} onClick={()=>send(command)}>{action==='accept'?'接纳议案':'拒绝议案'}</button>{reason&&<small>{reason}</small>}</div>;})}</div></section>)}
 {event.kind==='realm'&&!realmEvent&&<p role="status">此项政务已处理。</p>}
 {error&&<p className="pause-error" role="alert">{error}</p>}
 <footer>{actionable?<button disabled={pending} className="primary" onClick={()=>onNavigate(event)}>{label} →</button>:<button disabled={pending} onClick={onClose}>知道了</button>}</footer>
 </dialog>;
}
