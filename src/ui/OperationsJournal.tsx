import {useState} from 'react';
import {dateLabel} from '../core/world';
import {getPerson} from '../core/personRegistry';
import type {World} from '../core/types';
import {OperationsHeader} from './OperationsHeader';
import {DetailTabs} from './DetailTabs';
import {CharacterPortrait} from './CharacterPortrait';
export function OperationsJournal({world,scope,onScope,onClose,onPerson}:{world:World;scope:'all'|'player';onScope:(value:'all'|'player')=>void;onClose:()=>void;onPerson:(id:string)=>void}){
 const [limit,setLimit]=useState(60);
 const records=world.chronicle.filter(e=>scope==='all'||e.person==='player'||e.person===world.characterId).slice().reverse();
 return <section className="journal operations-window operations-journal" aria-label="行旅纪事"><OperationsHeader world={world} scene="directory" title="纪事" onClose={onClose}/><DetailTabs label="纪事范围" value={scope} onChange={value=>{onScope(value);setLimit(60);}} items={[{id:'all',label:'天下',icon:'world'},{id:'player',label:'此身',icon:'person'}]}/><div className="journal-entries"><div className="journal-columns" aria-hidden="true"><span>时间</span><span>纪事</span><span>相关人物</span></div>{records.slice(0,limit).map((e,i)=>{const id=e.person==='player'?world.characterId:e.person,p=id?getPerson(world,id):undefined;return <article className="journal-entry" key={`${e.day}-${e.person}-${i}`}><time>{dateLabel(e.day,world.scriptId)}</time><p>{e.text.replace('起始资源与单城治理范围为玩法设定。','')}</p>{p&&id?<button className="journal-person" onClick={()=>onPerson(id)}><CharacterPortrait world={world} characterId={id} compact/><span>{p.name}</span></button>:<span>—</span>}</article>;})}{!records.length&&<p>此页尚无已录纪事。</p>}</div><footer className="journal-footer"><span>已列 {Math.min(records.length,limit)} / {records.length} 则</span>{records.length>limit&&<button onClick={()=>setLimit(n=>n+60)}>翻阅更早纪事</button>}</footer></section>;
}
