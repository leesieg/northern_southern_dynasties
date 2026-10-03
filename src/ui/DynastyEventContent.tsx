import type {CSSProperties} from 'react';
import type {DynastyNotice} from '../core/dynastyEvents';
import type {World} from '../core/types';
import {calendarDate} from '../core/calendar';
import {CharacterPortrait} from './CharacterPortrait';
import {RealmFlag} from './RealmFlag';
import './dynastyEvent.css';

export function DynastyEventContent({notice,title,body,world,count}:{notice:DynastyNotice;title:string;body:string;world:World;count:number}){
 const date=calendarDate(notice.day,world.scriptId),cause=notice.cause==='inheritance'?'异姓承统':notice.cause==='civilWar'?'内战易代':'权力更替';
 const artStyle={'--dynasty-court':`url("${import.meta.env.BASE_URL}art/court/audience-hall-v1.png")`,'--dynasty-brush':`url("${import.meta.env.BASE_URL}art/interface/ink-brush-tray.svg")`} as CSSProperties;
 return <div className="dynasty-event-scroll" style={artStyle}>
  <section className="dynasty-event-paper"><div className="dynasty-event-copy"><header><small>国统更替 · {cause}</small><h2 id="pause-title">{title}</h2><time>{date.getUTCFullYear()} 年 {date.getUTCMonth()+1} 月 {date.getUTCDate()} 日</time></header><p id="pause-body">{body}</p><div className="dynasty-event-standards" aria-label={'旧朝'+notice.previousName+'，新朝'+notice.name}><div><small>旧朝</small><RealmFlag realm={notice.realm} world={world} name={notice.previousName} compact/></div><span aria-hidden="true">→</span><div><small>新朝</small><RealmFlag realm={notice.realm} world={world} name={notice.name} compact/></div></div></div>
   <div className="dynasty-event-illustration" aria-hidden="true"><div className="dynasty-event-court"/><div className="dynasty-event-ruler"><CharacterPortrait characterId={notice.ruler} world={world}/></div></div>
  </section>
  <section className="dynasty-event-settlement" aria-label="交接结果"><h3>君位已定</h3><div className="dynasty-event-authority"><span>君主 <strong>{notice.rulerName}</strong></span><span>执政 <strong>{notice.executives.map(p=>p.name).join('、')||'暂无在位者'}</strong></span></div><p>{notice.cause==='inheritance'?'君位与家业分别承继，官职不随家产继承。':'公职依本次交接与表态处理；钱粮、军队、欠款和条约继续按实际归属结算。'}</p><small>时间已暂停{count>1?` · 后续还有 ${count-1} 件消息`:''}</small></section>
 </div>;
}
