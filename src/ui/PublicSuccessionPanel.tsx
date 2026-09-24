import {RealmBadge} from './RealmBadge';
import './publicSuccession.css';
import {useState} from 'react';
import {PositionSeat,PersonSelectionDialog} from './PersonSelection';
import {ArtIcon} from './ArtIcon';
import {governmentOf,currentRealm,governmentReason,politicalName,type GovernmentCommand} from '../core/government';
import {publicFamily,publicSuccessor,successionCandidates,type PublicOffice} from '../core/publicSuccession';
import {isAlive} from '../core/lifeState';
import type {World} from '../core/types';
export function PublicSuccessionPanel({world:w,pending,send,onPerson}:{world:World;pending:boolean;send:(c:GovernmentCommand)=>void;onPerson:(id:string)=>void}){
 const r=currentRealm(w),g=governmentOf(w)!,[office,setOffice]=useState<PublicOffice|null>(null),[candidate,setCandidate]=useState(''),[name,setName]=useState('');
 const person=(id:string|null,label:string)=><PositionSeat world={w} holder={id} title={label} onPerson={onPerson} status={id&&!isAlive(w,id)?'已故 · 位虚':undefined}/>;
 const choices=office?successionCandidates(w,r).filter(id=>id!==(office==='ruler'?g.ruler:g.executives[0])):[],chosen=choices.includes(candidate)?candidate:choices[0]??'',newHouse=office==='ruler'&&publicFamily(chosen)!==publicFamily(g.ruler),command={type:'government',action:'nominate',office:office??'ruler',candidate:chosen,...(newHouse?{name}:{})} as const;
 return <section className="public-succession"><p>君位与执政分别传承。指定继承人优先；未指定时，依在世成年子嗣、同族长幼承继。私人家业继承另行议定。</p>{(['ruler','executive'] as const).map(key=>{const holder=key==='ruler'?g.ruler:g.executives[0]??null,next=publicSuccessor(w,r,key);return <article key={key}><h3><ArtIcon name={key==='ruler'?'renown':'influence'}/>{key==='ruler'?'君位传承':'执政交接'}</h3><div className="succession-chain">{person(holder,key==='ruler'?'在位君主':'当前执政')}<span aria-hidden="true">→</span>{person(next,g.heirs?.[key]===next&&next?'已指定':'依序继承')}</div>{key==='ruler'&&g.heirs?.dynasty&&<p>异姓承统后国号：<RealmBadge realm={r} world={w} name={g.heirs.dynasty}/></p>}<button aria-expanded={office===key} onClick={()=>{setOffice(office===key?null:key);setCandidate(g.heirs?.[key]??'');setName(key==='ruler'?g.heirs?.dynasty??'':'');}}>议定继承 ›</button></article>;})}
 {office&&<PersonSelectionDialog world={w} title={office==='ruler'?'议定君位继承':'议定执政继任'} value={chosen} onSelect={id=>{setCandidate(id);setName('');}} onClose={()=>setOffice(null)} pending={pending} description={newHouse?'异姓继承人在君主身后建立新朝，承接本国实际控制的辖地。':'在位者去世后交接，不会立即撤换现任人物。'} options={choices.map(id=>({id,score:g.merit[id]??0,metric:'功绩',reason:governmentReason(w,{...command,candidate:id,...(office==='ruler'&&publicFamily(id)!==publicFamily(g.ruler)?{name}:{name:undefined})})}))} confirmLabel="指定继承人 · 20 影响力" onConfirm={()=>{send(command);setOffice(null);}}>{newHouse&&<label>承统国号 <input value={name} maxLength={6} placeholder="新国号" onChange={e=>setName(e.target.value)}/></label>}{g.heirs?.[office]&&<button disabled={pending||!!governmentReason(w,{type:'government',action:'nominate',office,candidate:null})} onClick={()=>{send({type:'government',action:'nominate',office,candidate:null});setOffice(null);}}>撤销指定</button>}</PersonSelectionDialog>}

 <details><summary>传承纪事 · <RealmBadge realm={r} world={w}/></summary>{w.life?.successions.filter(e=>e.realm===r).map((e,i)=><p key={i}>第 {e.day} 日 · {politicalName(e.deceased)}身后，{politicalName(e.ruler)}居君位；{e.executives.map(politicalName).join('、')||'无人'}执政。</p>)}{w.realm!.governments!.regimes.filter(v=>v.realm===r).map(v=><p key={v.id}><RealmBadge realm={r} world={w} name={v.name??({liang:'梁',east:'东魏',west:'西魏',qi:'北齐',zhou:'北周',chen:'陈'} as Record<string,string>)[v.dynasty]}/> · 第 {v.from} 日 — {v.until??'今'}</p>)}</details>
 </section>;
}
