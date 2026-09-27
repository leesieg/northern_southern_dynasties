import {useState} from 'react';
import type {GameCommand,World} from '../core/types';
import type {RealmId} from '../core/realm';
import {accountName} from '../core/treasury';
import {economyCommandReason,economyPresentation} from '../core/personalEconomyAdapter';
import {attributes} from '../core/social';
import {politicalName} from '../core/government';
import {RealmBadge} from './RealmBadge';
import {ArtIcon,Resource} from './ArtIcon';
import {CharacterPortrait} from './CharacterPortrait';
import {PersonChoice} from './PersonSelection';
import {EconomyAction} from './EconomyAction';
import './personalEconomy.css';
import './governmentAudit.css';
type Props={world:World;pending:boolean;send:(c:GameCommand)=>void};
export function EconomyCases({world,pending,send,caseId,onPerson}:Props&{caseId?:number;onPerson?:(id:string)=>void}){
 const p=economyPresentation(world);
 const portrait=(id:string)=><button className="audit-person" disabled={!onPerson} aria-label={'查看'+politicalName(id)} onClick={()=>onPerson?.(id)}><CharacterPortrait characterId={id} world={world} compact/><span>{politicalName(id)}</span></button>;
 return <div className="economy-cases">{p.view.investigations.filter(q=>caseId===undefined||q.id===caseId).slice().reverse().map(q=>{
 const people=[...new Set(q.findings.map(m=>m.person))].map(id=>({id,amount:q.findings.filter(m=>m.person===id).reduce((n,m)=>n+m.amount,0),recovered:q.findings.filter(m=>m.person===id).reduce((n,m)=>n+m.recovered,0)})),proved=q.outcome==='substantiated';
 return <article key={q.id} className="audit-report"><header className="audit-heading"><RealmBadge world={world} realm={q.realm as RealmId}/><strong>{accountName(q.account)}</strong><small>{q.phase==='investigating'?'查核中':q.phase==='report'?'待你裁决':'已结案'}</small></header><div className="audit-officers"><div><small>委托人</small>{portrait(q.commissioner)}</div><div><small>查核人</small>{portrait(q.inspector)}</div></div><p className="audit-context">核查第 {q.started} 日及以前的公款支出{q.phase==='investigating'?` · 驻留查核余 ${Math.max(0,q.due-world.day)} 日，另计赴任`:''}</p>
 <div className="audit-verdict"><ArtIcon name={proved?'stress':'diligent'} size={26}/><strong>{q.phase==='investigating'?'尚未形成结论':proved?'查实侵吞公款':q.outcome==='cancelled'?'查核已中止':'未查得足够证据'}</strong></div>
 {people.map(m=><div className="audit-finding" key={m.id}>{portrait(m.id)}<div><Resource name="coins" value={m.amount} label="本案查实侵吞公款" unit="钱"/><small>已追回 {m.recovered} · 尚欠 {m.amount-m.recovered}</small></div></div>)}
 {q.outcome==='inconclusive'&&<p>本次未取得足以认定侵吞的证据，不能据此追缴或处罚。</p>}
 {q.phase==='closed'&&<p>{q.resolution==='recover'?'已裁定追缴；尚欠部分继续从责任人私财中追偿。':q.resolution==='dismiss'?(proved?'已结案，本案不追缴，责任记录保留。':'已结案，未认定有罪。'):'查核未完成，不作有罪认定。'}</p>}
 {q.phase==='report'&&<div className="economy-grid audit-decisions">{proved&&<EconomyAction world={world} pending={pending} send={send} command={{type:'economy',action:'resolve',caseId:q.id,decision:'recover'}} label="责令退赔" icon="coins" summary="退赔归还原公库；欠款继续追偿" consequence={`从责任人现有私财中追缴，归还${accountName(q.account)}；不足部分继续追偿。${people.map(m=>politicalName(m.id)+'功绩最多 −'+Math.min(20,5+Math.floor((m.amount-m.recovered)/20))).join('，')}；各责任人与你的关系 −15。`}/>}<EconomyAction world={world} pending={pending} send={send} command={{type:'economy',action:'resolve',caseId:q.id,decision:'dismiss'}} label={proved?'免予追缴':'证据不足，结案'} icon="diligent" summary={proved?'不收回公款，不扣功绩；责任记录保留':'不追缴、不处罚；结束本次查核'} consequence={proved?'本案结案，不追缴、不扣功绩；已查实的侵吞责任仍留档。':undefined}/></div>}</article>;
 })}</div>;
}
export function GovernmentAuditPanel({world,pending,send,onPerson}:Props&{onPerson:(id:string)=>void}){
 const [auditAccount,setAuditAccount]=useState(''),[inspector,setInspector]=useState('');
 const p=economyPresentation(world),audit=p.audits.some(a=>a.id===auditAccount)?auditAccount:p.audits[0]?.id??'';
 const props={world,pending,send};
 if(!p.audits.length&&!p.view.investigations.length)return null;
 return <div className="government-audit"><h3><ArtIcon name="wary" size={26}/>监察</h3>
  {p.audits.length>0&&<section className="government-audit-commission"><h3><ArtIcon name="influence" size={24}/>委托查核</h3><div className="government-audit-parameters"><label>查核公库<select value={audit} onChange={e=>setAuditAccount(e.target.value)}>{p.audits.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><PersonChoice world={world} title="监察人" value={inspector} onChange={setInspector} pending={pending} options={p.inspectors.map(a=>({id:a.id,score:attributes(world,a.id).stewardship,metric:'管理',reason:economyCommandReason(world,{type:'economy',action:'audit',account:audit,inspector:a.id})}))}/></div><EconomyAction {...props} label="委托查核 · 私财 20 钱" icon="influence" command={{type:'economy',action:'audit',account:audit,inspector}} consequence="监察人赴当地驻留查核 14 日；可能查无实据，因失守或人事变化中止时不退已付费用。"/></section>}
  {p.view.investigations.length>0&&<section className="government-audit-records"><h3><ArtIcon name="diligent" size={24}/>查核案件</h3><EconomyCases {...props} onPerson={onPerson}/></section>}
 </div>;
}
