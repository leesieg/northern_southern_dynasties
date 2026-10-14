import {useMemo,useState} from 'react';
import type {GameCommand,World} from '../core/types';
import {eventCatalog,eventGroupNames,eventStatusNames,filterCatalog,type CatalogEntry,type EventStatus} from '../core/eventCatalog';
import {dateLabel} from '../core/world';
import {getPerson} from '../core/personRegistry';
import {siteById} from '../data/scenario';
import type {ReformId,SuccessionId} from '../data/governments';
import {ActionDialog} from './ActionDialog';
import {DialogArt} from './DialogArt';
import {DetailTabs} from './DetailTabs';
import {ArtIcon} from './ArtIcon';
import {CharacterPortrait} from './CharacterPortrait';
import {HistoricalDossier,type HistoricalNavigation} from './HistoricalEvent';
import {GovernmentPanel} from './GovernmentPanel';
import {PowerPoliticsPanel} from './PowerPoliticsPanel';
import './eventBrowser.css';

type Tab='situation'|'history'|'people'|'reference';
export function EventBrowser({world:w,initialId,onClose,navigation:n,pending,send,error}:{world:World;initialId:string;onClose:()=>void;navigation:HistoricalNavigation;pending:boolean;send:(c:GameCommand)=>Promise<boolean>;error?:string}){
 const entries=useMemo(()=>eventCatalog(w),[w]);
 const [query,setQuery]=useState(''),[status,setStatus]=useState<EventStatus|'all'>('all');
 const [selected,setSelected]=useState(initialId.startsWith('hou-jing:')?'hou-jing':initialId),[tab,setTab]=useState<Tab>('situation');
 const [action,setAction]=useState<CatalogEntry['action']>();
 const filtered=useMemo(()=>filterCatalog(entries,query,status,w),[entries,query,status,w]);
 const entry=filtered.find(v=>v.id===selected)??filtered[0];
 const target=action?.kind==='historical'?w.historical?.items.find(v=>v.id===action.target):undefined;
 const actionEntry=entries.find(v=>v.action?.kind===action?.kind&&v.action?.target===action?.target);
 const people=(ids:string[])=>ids.map(id=><button type="button" key={id} className="event-person" onClick={()=>n.onPerson(id)}><CharacterPortrait world={w} characterId={id} compact/><span>{getPerson(w,id)?.name} ›</span></button>);
 const timeline=(e:CatalogEntry,recent=false)=><ol className="event-timeline">{(recent?e.history.slice(-3):e.history).map(m=><li key={m.key}><time>{dateLabel(m.day,w.scriptId)}</time><p>{m.text}</p></li>)}</ol>;
 const fullHistory=(e:CatalogEntry)=><>{timeline(e)}<p className="event-note">{e.history.length?'仅列当前身份可知且存档仍保留的经过。':'尚无可展示的经过；未记录更早经过时，不补造日期。'}</p></>;
 return <><ActionDialog title="事件" className="event-browser" heading={<p>历史事件与沿革 <span>已录 {entries.length} 项</span></p>} onClose={onClose} actions={<><small>事件发展以本局局势为准</small>{entry?.war!==undefined&&<button onClick={()=>n.onWar(entry.war!)}>查看战况 ›</button>}{entry?.action&&<button disabled={pending} onClick={()=>setAction(entry.action)}>{entry.action.label} ›</button>}</>}>
  <div className="event-browser-layout">
   <aside className="event-catalog" aria-label="全部事件目录">
    <div className="event-filters"><label className="event-search"><ArtIcon name="diligent" size={22}/><input aria-label="搜索事件、人物、政权" placeholder="搜索事件、人物、政权" value={query} onChange={e=>{setQuery(e.target.value);setTab('situation');}}/></label><div><select aria-label="事件状态" value={status} onChange={e=>{setStatus(e.target.value as EventStatus|'all');setTab('situation');}}><option value="all">全部状态</option>{Object.entries(eventStatusNames).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select><small>按当前状态排序</small></div></div>
    <div className="event-catalog-scroll">{(Object.keys(eventGroupNames) as (keyof typeof eventGroupNames)[]).map(group=>{const rows=filtered.filter(v=>v.group===group);return rows.length>0&&<section key={group}><h3><ArtIcon name={group==='succession'?'influence':group==='reform'?'diligent':'world'} size={20}/>{eventGroupNames[group]} · {rows.length}</h3>{rows.map(e=><button className="event-catalog-row" type="button" key={e.id} aria-pressed={e.id===entry?.id} onClick={()=>{setSelected(e.id);setTab('situation');}}><span><strong>{e.name}</strong><small>{e.chapter}</small></span><span className="event-status" data-status={e.status}>{e.pending?'待你办理':eventStatusNames[e.status]}</span></button>)}</section>;})}{!filtered.length&&<p className="event-empty">没有符合条件的事件。<button onClick={()=>{setQuery('');setStatus('all');}}>清除筛选</button></p>}</div>
   </aside>
   {entry?<section className="event-detail" aria-label={entry.name} key={entry.id}>
    <header className="event-banner"><DialogArt scene={entry.group==='event'?'fortress':entry.group==='succession'?'succession':'rites'}/><div><small>{eventGroupNames[entry.group]}</small><h3>{entry.name}<span className="event-status" data-status={entry.status}>{eventStatusNames[entry.status]}</span></h3><p>{entry.group==='event'?'当前篇章：':''}{entry.chapter}</p></div></header>
    <DetailTabs label="事件详情" value={tab} onChange={setTab} items={[{id:'situation',label:'局势',icon:'world'},{id:'history',label:'经过',icon:'diligent'},{id:'people',label:'人物',icon:'person'},{id:'reference',label:'史实',icon:'influence'}]}/>
    <div className="event-detail-scroll" key={tab}>
     {tab==='situation'?<><div className="event-contacts">{people(entry.people.slice(0,2))}{entry.site&&<button className="event-site" onClick={()=>n.onSite(entry.site!)}>{siteById[entry.site]?.name} ›</button>}</div><h4>当前局势{entry.pending&&<span className="event-pending">待你办理</span>}</h4><p className="event-lead">{entry.summary}</p>{entry.facts.length>0&&<dl className="event-facts">{entry.facts.map(f=><div key={f.label}><dt>{f.label}</dt><dd>{f.text}</dd></div>)}</dl>}{entry.deadline&&<section className="event-deadline"><strong>{entry.deadline.label} {entry.deadline.day>w.day?<>尚余 <b>{entry.deadline.day-w.day}</b> 日</>:'已到期'}</strong><small>{entry.deadline.note}</small></section>}{entry.progress&&<section className="event-progress"><label>有效实施日 <b>{entry.progress.value} / {entry.progress.max}</b></label><progress value={entry.progress.value} max={entry.progress.max}/><p>{entry.progress.pause||'正在实施，受阻等待不计入进度。'}</p></section>}{entry.history.length>0?<><h4>最近经过</h4>{timeline(entry,true)}<button className="event-text-link" onClick={()=>setTab('history')}>查看完整经过 ›</button></>:<p className="event-note">尚无可展示的经过。</p>}<p className="event-note">仅显示当前身份可知的消息。</p></>:tab==='history'?fullHistory(entry):tab==='people'?<><h4>关联人物</h4><div className="event-people">{people(entry.people)}</div>{!entry.people.length&&<p>此项为制度沿革，尚无已记录的本局承办人。</p>}</>:<><h4>史实参照</h4><p className="event-lead">{entry.reference}</p><a href={entry.source.url} target="_blank" rel="noreferrer">{entry.source.title} ↗</a><p className="event-note">史实与本局发展分别记录；历史年代不代表本局一定发生，规则参数不作为史实。</p></>}
    </div>
   </section>:<section className="event-empty">调整左侧筛选后查看事件。</section>}
  </div>
 </ActionDialog>
 {target&&action&&<HistoricalDossier cancelLabel="返回事件" key={target.id+':'+target.revision+':'+(w.allegiancePacts?.items.find(p=>p.id===target.pactId)?.revision??0)} world={w} event={target} pending={pending} send={send} error={error} navigation={n} onClose={()=>setAction(undefined)}/>}
 {action&&action.kind!=='historical'&&actionEntry?.realm&&<ActionDialog title={action.kind==='reform'?'制度与办理':'朝廷与议案'} art={action.kind==='reform'?'rites':'succession'} className="event-action-dialog" onClose={()=>setAction(undefined)} cancelLabel="返回事件" actions={null}>{action.kind==='reform'?<GovernmentPanel key={action.target} world={w} realm={actionEntry.realm} initialLaw={action.target as ReformId} pending={pending} send={send}/>:<PowerPoliticsPanel key={action.target} world={w} realm={actionEntry.realm} initialStage={action.target as SuccessionId} pending={pending} send={send} onPerson={n.onPerson}/>} {error&&<p role="alert">{error}</p>}</ActionDialog>}
 </>;
}
