import {noticeCategories,noticeCategoryNames,type NoticeCategory} from '../core/noticePolicy';
import {useNoticeSettings,changeNoticeSettings} from './noticeSettings';
import {useEffect,useState} from 'react';
import {paperIcon,type PaperIcon} from '../map/artSample/paperSymbols';
import type {PauseEvent} from '../core/pauseEvents';
import './noticeStack.css';
const noticeIcons:Record<NoticeCategory,PaperIcon>={travel:'horse',family:'city',personnel:'objective',military:'army',economy:'coin',report:'objective'};
function NoticeCard({event,held,onView,onDismiss}:{event:PauseEvent;held:boolean;onView:(event:PauseEvent)=>void;onDismiss:(id:string)=>void}){
 useEffect(()=>{if(held)return;const timer=setTimeout(()=>onDismiss(event.id),10000);return()=>clearTimeout(timer);},[held,event.id,onDismiss]);
 const category=event.notice,label=category==='military'?'军报':category?noticeCategoryNames[category]:'消息';
 return <article className="notice-card">
  <span className="notice-card-emblem" dangerouslySetInnerHTML={{__html:paperIcon(category?noticeIcons[category]:'objective')}}/>
  <div className="notice-card-main"><div className="notice-card-heading"><span className="notice-card-kind">{label}</span><strong>{event.title}</strong></div><p>{event.body}</p></div>
  <div className="notice-card-actions"><button className="notice-card-read" aria-label={'展阅'+event.title} onClick={()=>onView(event)}>展阅<span aria-hidden="true">›</span></button><button className="notice-card-dismiss" aria-label={'关闭通知：'+event.title} onClick={()=>onDismiss(event.id)}>×</button></div>
 </article>;
}
export function NoticeStack({notices,onView,onDismiss}:{notices:PauseEvent[];onView:(event:PauseEvent)=>void;onDismiss:(id:string)=>void}){
 const [held,setHeld]=useState(false);
 if(!notices.length)return null;
 return <aside className="notice-stack" aria-label="通知" aria-live="polite" onMouseEnter={()=>setHeld(true)} onMouseLeave={()=>setHeld(false)} onFocusCapture={()=>setHeld(true)} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))setHeld(false);}}>{notices.slice(0,4).map(event=><NoticeCard key={event.id} event={event} held={held} onView={onView} onDismiss={onDismiss}/>)}</aside>;
}
export function NoticePreferences(){
 const settings=useNoticeSettings();
 return <section className="notice-preferences" aria-label="通知设置"><h3>通知</h3><p className="notice-preferences-note">无需裁断的消息可只作提示，不打断时间。</p>{noticeCategories.map((category:NoticeCategory)=><div className="notice-preference-row" key={category}><span>{noticeCategoryNames[category]}</span><div role="radiogroup" aria-label={noticeCategoryNames[category]+'通知方式'}>{(['notice','pause'] as const).map(tier=><button key={tier} role="radio" aria-checked={settings[category]===tier} className={settings[category]===tier?'active':''} onClick={()=>changeNoticeSettings(category,tier)}>{tier==='notice'?'提示':'暂停'}</button>)}</div></div>)}</section>;
}
