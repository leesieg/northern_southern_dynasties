import {visibleHistoricalEvents,historicalTitle} from '../core/historicalEvents';
import {useState} from 'react';
import {dateLabel} from '../core/world';
import {journalEntries} from './journalPeople';
import type {World} from '../core/types';
import {OperationsHeader} from './OperationsHeader';
import {DetailTabs} from './DetailTabs';
import {CharacterPortrait} from './CharacterPortrait';
export function OperationsJournal({world,scope,onScope,onClose,onPerson,onHistorical}:{world:World;scope:'all'|'player';onScope:(value:'all'|'player')=>void;onClose:()=>void;onPerson:(id:string)=>void;onHistorical?:(id:string)=>void}){
 const [limit,setLimit]=useState(60);
 const records=journalEntries(world).filter(({people})=>scope==='all'||people.some(p=>p.id===world.characterId)).reverse();
 return <section className="journal operations-window operations-journal" aria-label="行旅纪事"><OperationsHeader world={world} scene="directory" title="纪事" onClose={onClose}/><DetailTabs label="纪事范围" value={scope} onChange={value=>{onScope(value);setLimit(60);}} items={[{id:'all',label:'天下',icon:'world'},{id:'player',label:'此身',icon:'person'}]}/><div className="journal-entries">{visibleHistoricalEvents(world).map(e=><article className="historical-journal-entry" key={e.id}><div><strong>{historicalTitle(world,e)}</strong><small>{e.status==='active'?'事未定':'已结案'}</small></div><button onClick={()=>onHistorical?.(e.id)}>翻阅事件 ›</button></article>)}<div className="journal-columns" aria-hidden="true"><span>时间</span><span>纪事</span><span>相关人物</span></div>{records.slice(0,limit).map(({event:e,people},i)=><article className="journal-entry" key={`${e.day}-${e.person}-${i}`}><time>{dateLabel(e.day,world.scriptId)}</time><p>{e.text.replace('起始资源与单城治理范围为玩法设定。','')}</p>{people.length?<div className="journal-people">{people.map(p=><button key={p.id} className="journal-person" onClick={()=>onPerson(p.id)}><CharacterPortrait world={world} characterId={p.id} compact/><span>{p.name}</span></button>)}</div>:<span>—</span>}</article>)}{!records.length&&<p>此页尚无已录纪事。</p>}</div><footer className="journal-footer"><span>已列 {Math.min(records.length,limit)} / {records.length} 则</span>{records.length>limit&&<button onClick={()=>setLimit(n=>n+60)}>翻阅更早纪事</button>}</footer></section>;
}
