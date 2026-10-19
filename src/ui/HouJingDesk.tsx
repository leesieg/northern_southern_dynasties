import {useEffect,useRef,useState} from 'react';
import type {World,GameCommand} from '../core/types';
import {eventStatusNames} from '../core/eventCatalog';
import {dateLabel} from '../core/world';
import {politicalName,regimeName} from '../core/government';
import {getPerson} from '../core/personRegistry';
import {civilPromiseNames} from '../core/civilPromises';
import {ministries,type MinistryId} from '../data/court';
import {siteById} from '../data/scenario';
import {houJingParty,type HouJingPresentation} from './houJingPresentation';
import {HouJingResponses} from './HouJingResponses';
import {HistoricalDossier,type HistoricalNavigation} from './HistoricalEvent';
import {CivilAftermathPanel} from './CivilAftermathPanel';
import {WarDetails} from './WarDetails';
import {WarScoreScale} from './WarScoreScale';
import {CharacterPortrait} from './CharacterPortrait';
import {RealmFlag} from './RealmFlag';
import {DetailTabs} from './DetailTabs';
import {DialogArt} from './DialogArt';
import {CommandButton} from './CommandButton';
import {ArtIcon} from './ArtIcon';
import './houJingDesk.css';

export type HouJingPage='situation'|'responses'|'records'|'peace'|'history';
type Props={world:World;view:HouJingPresentation;pending:boolean;send:(command:GameCommand)=>Promise<boolean>;navigation:HistoricalNavigation;onLocate:(site:string)=>void;onClose:()=>void;onCatalog:()=>void;initialPage?:HouJingPage;active?:boolean;error?:string};
export function HouJingDesk({world:w,view:v,pending,send,navigation:n,onLocate,onClose,onCatalog,initialPage='situation',active=true,error}:Props){
 const [page,setPage]=useState<HouJingPage>(initialPage),[documentOpen,setDocumentOpen]=useState(false),[mobile,setMobile]=useState<'summary'|'workspace'|'map'>(initialPage==='responses'?'workspace':'summary');
 const closeRef=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(active)closeRef.current?.focus({preventScroll:true});},[active]);
 useEffect(()=>{if(!active)setDocumentOpen(false);},[active]);
 const {entry,war,event,deadline}=v,tab=war?page:page==='situation'?'situation':'history';
 const selectPage=(next:HouJingPage)=>{setPage(next);setMobile('workspace');};
 const parties=war?(['defend','attack'] as const).map(side=>({side,...houJingParty(w,war,side)})):[];
 const actions:HistoricalNavigation={onPerson:id=>{setDocumentOpen(false);n.onPerson(id);},onSite:id=>{setDocumentOpen(false);n.onSite(id);},onCourt:()=>{setDocumentOpen(false);n.onCourt();},onArmy:()=>{setDocumentOpen(false);n.onArmy();},onWar:()=>{setDocumentOpen(false);selectPage('situation');}};
 const elapsed=war?Math.max(0,w.day-war.started):event?.status==='active'?Math.max(0,w.day-event.phaseSince):undefined;
 return <section className="hou-jing-desk" hidden={!active} data-mobile={mobile} aria-label="侯景之乱事件工作区">
  <nav className="hou-mobile-switch" aria-label="事件面板显示">{(['summary','workspace','map'] as const).map(value=><button key={value} aria-pressed={mobile===value} onClick={()=>setMobile(value)}>{value==='summary'?'事态':value==='workspace'?'详情':'地图'}</button>)}<button onClick={onClose}>返回地图</button></nav>
  <aside className="hou-panel hou-event-summary" aria-label="事件事态摘要">
   <header className="hou-event-banner"><DialogArt scene={v.scene}/><div><span className="hou-event-seal">{war?'内战':eventStatusNames[entry.status]}</span><h2>侯景之乱</h2><p>{entry.chapter}</p></div></header>
   <div className="hou-summary-scroll">
    <p className="hou-event-lead">{entry.summary}</p>
    {entry.history.length>0&&<ol className="hou-stage-trail" aria-label="最近已知经过">{entry.history.slice(-3).map((item,i,a)=><li key={item.key} data-current={i===a.length-1}><i/><time>{dateLabel(item.day,w.scriptId)}</time><span>{item.text}</span></li>)}</ol>}
    {elapsed!==undefined&&<p className="hou-duration">{war?'内战':'本篇'}已持续 <b>{elapsed}</b> 日</p>}
    {war&&<section className="hou-war-summary"><h3>当前战局</h3><div className="hou-party-pair">{parties.map(p=><article key={p.side}><RealmFlag realm={p.realm} world={w} compact showLabel={false}/>{p.leader&&<button aria-label={'查看'+politicalName(p.leader,w)} onClick={()=>n.onPerson(p.leader!)}><CharacterPortrait world={w} characterId={p.leader} compact/></button>}<div><strong>{p.side==='attack'?politicalName(war.civil!.claimant,w):regimeName(w,war.defender)}</strong><b>{p.troops===null?'兵力未详':p.troops.toLocaleString()+' 人'}</b><small>阵营实控 {p.cities.length} 城邑</small></div></article>)}</div><WarScoreScale value={war.score}/><p className="hou-score-note">起兵方战分 {war.score>0?'+':''}{war.score} · 表示优势，非战争完成度</p></section>}
    <section className="hou-current-wait"><h3>当前等待</h3><ul>{v.waiting.map((text,i)=><li key={text}><ArtIcon name={i===0?'city':i===1?'person':'diligent'} size={20}/><span>{text}</span></li>)}</ul>{deadline&&<div className="hou-deadline"><strong>{deadline.label} {deadline.day>w.day?'余 '+(deadline.day-w.day)+' 日':'已到期'}</strong><small>{deadline.note}</small></div>}</section>
    {v.document&&<button className="hou-document-entry" disabled={pending} onClick={()=>setDocumentOpen(true)}><ArtIcon name="diligent" size={25}/><span>{entry.pending?'办理待决文书':'查看交涉与约定'}</span><span aria-hidden="true">›</span></button>}
   </div>
   <section className="hou-summary-actions"><h3>可办事项</h3><div><CommandButton label="争取响应" icon="person" art="staff" reason={war?.civil?.mobilization?'':'本场尚未开启地方动员'} hint="查看真实人物立场，选择本人立场或按实际权限交涉。" onClick={()=>selectPage('responses')}/><CommandButton label="调军粮运" icon="army" art="military" reason={w.realm?'':'当前模式没有军队系统'} hint="前往军队，按实际兵权、路程与粮运办理。" onClick={n.onArmy}/><CommandButton label="朝廷职官" icon="influence" art="staff" reason={w.realm?'':'当前模式没有朝廷'} hint="查看实际朝廷职官；任命按当前身份权限办理。" onClick={n.onCourt}/><CommandButton label="查看议和" icon="world" art="diplomacy" reason={war?'':'当前没有进行中的相关内战'} hint="查看本场真实议和条件，确认前不会签订和约。" onClick={()=>selectPage('peace')}/></div></section>
  </aside>
  <section className="hou-panel hou-workspace" aria-label="侯景之乱详情">
   <header className="hou-workspace-toolbar"><span>{entry.chapter}</span><button onClick={onCatalog}>全部事件</button><button ref={closeRef} onClick={onClose} aria-label="关闭侯景之乱工作区">×</button></header>
   <DetailTabs label="侯景之乱详情" value={tab} onChange={selectPage} items={[{id:'situation',label:'局势',icon:'world'},...(war?[...(war.civil?.mobilization?[{id:'responses' as const,label:'响应',icon:'person' as const}]:[]),{id:'records' as const,label:'战报',icon:'diligent' as const},{id:'peace' as const,label:'议和',icon:'world' as const}]:[]),{id:'history',label:'经过',icon:'diligent'}]}/>
   <div className="hou-workspace-body" key={tab}>
    {tab==='responses'&&war?.civil?.mobilization?<HouJingResponses key={war.id+':'+w.characterId} world={w} war={war} pending={pending} send={send} onPerson={n.onPerson} onLocate={onLocate} active={active} error={error}/>:tab==='history'?<section className="hou-history"><h3>已知经过</h3><ol>{entry.history.map(item=><li key={item.key}><time>{dateLabel(item.day,w.scriptId)}</time><p>{item.text}</p></li>)}</ol>{!entry.history.length&&<p className="hou-empty">尚无当前身份可知的经过。</p>}{v.commitments.length>0&&<section className="hou-private-promises"><h3>与本人有关的待遇</h3>{v.commitments.map((q,i)=><article key={i}><strong>{politicalName(q.person,w)} · {civilPromiseNames[q.civil.status]}</strong><p>{q.civil.mode==='retain'?'保留':'战后授予'}{q.civil.target.kind==='county'?siteById[q.civil.target.id]?.name:q.civil.target.kind==='army'?'第 '+q.civil.target.id+' 军兵权':ministries[q.civil.target.id as MinistryId]?.name??'中央职掌'}</p>{q.civil.status==='active'&&q.civil.due!==null&&<small>办理余 {Math.max(0,q.civil.due-w.day)} 日；须实际履约</small>}</article>)}{v.commitments.some(q=>q.chief===w.characterId&&q.civil.status==='active')&&<button onClick={n.onCourt}>前往朝廷办理职权</button>}</section>}<section className="hou-historical-reference"><h4>史实参照</h4><p>{entry.reference}</p><a href={entry.source.url} target="_blank" rel="noreferrer">{entry.source.title} ↗</a></section></section>:<>
     {tab==='situation'&&<section className="hou-situation"><h3>{war?'政治目标':'当前事态'}</h3><p>{war?v.goal:entry.summary}</p>{war&&v.politicalTarget&&<p>{v.politicalTarget}</p>}{!war&&entry.facts.length>0&&<dl>{entry.facts.map(f=><div key={f.label}><dt>{f.label}</dt><dd>{f.text}</dd></div>)}</dl>}{war?<div className="hou-objectives">{[{site:war.civil!.base,label:'起兵根据地'},{site:war.target,label:'战争目标'}].map(o=><button key={o.label} onClick={()=>onLocate(o.site)}><ArtIcon name="city" size={25}/><span><small>{o.label}</small><strong>{siteById[o.site]?.name}</strong><small>实控 {regimeName(w,w.realm!.cities[o.site].controller)}</small></span><span aria-hidden="true">⌖</span></button>)}</div>:entry.site&&<button className="hou-location-entry" onClick={()=>onLocate(entry.site!)}><ArtIcon name="city" size={24}/>定位{siteById[entry.site]?.name}</button>}{v.document&&<button className="hou-inline-document" disabled={pending} onClick={()=>setDocumentOpen(true)}>{entry.pending?'办理待决文书':'查看交涉与约定'} ›</button>}</section>}
     {war&&<WarDetails embedded world={w} war={war} page={tab==='records'?'records':tab==='peace'?'peace':'overview'} onPage={next=>selectPage(next==='overview'?'situation':next==='responses'?'responses':next)} showHeading={false} pending={pending} send={send} onPerson={n.onPerson}/>}
     {!war&&<CivilAftermathPanel world={w} war={event?.warId} pending={pending} send={send} onPerson={n.onPerson}/>}
     {!war&&tab==='situation'&&<section className="hou-related-people"><h3>关联人物</h3>{entry.people.filter(id=>!!getPerson(w,id)).map(id=><button key={id} onClick={()=>n.onPerson(id)}><CharacterPortrait world={w} characterId={id} compact/><span>{politicalName(id,w)}</span></button>)}</section>}
    </>}
   </div>
   {error&&<p className="hou-command-error" role="alert">{error}</p>}
  </section>
  {documentOpen&&v.document&&<HistoricalDossier world={w} event={v.document} pending={pending} send={send} navigation={actions} error={error} cancelLabel="返回侯景之乱" onClose={()=>setDocumentOpen(false)}/>}
 </section>;
}
