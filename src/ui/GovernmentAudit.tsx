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
import {ActionDialog} from './ActionDialog';
import {PetitionAudience} from './PetitionAudience';
import {HoverHint} from './HoverHint';
import './personalEconomy.css';
import './governmentAudit.css';
type Props={world:World;pending:boolean;send:(c:GameCommand)=>void};
export function EconomyCases({world,pending,send,caseId,onPerson}:Props&{caseId?:number;onPerson?:(id:string)=>void}){
 const p=economyPresentation(world);
 const portrait=(id:string)=><button className="audit-person" disabled={!onPerson} aria-label={'查看'+politicalName(id)} onClick={()=>onPerson?.(id)}><CharacterPortrait characterId={id} world={world} compact/><span>{politicalName(id)}</span></button>;
 return <div className="economy-cases">{p.view.investigations.filter(q=>caseId===undefined||q.id===caseId).slice().reverse().map(q=>{
 const people=[...new Set(q.findings.map(m=>m.person))].map(id=>({id,amount:q.findings.filter(m=>m.person===id).reduce((n,m)=>n+m.amount,0),recovered:q.findings.filter(m=>m.person===id).reduce((n,m)=>n+m.recovered,0)})),proved=q.outcome==='substantiated';
 if(q.phase==='report')return <PetitionAudience key={q.id} identity={`audit:${q.id}:${q.phase}`} world={world} person={q.inspector} realm={q.realm as RealmId} subject={`${accountName(q.account)} · 查核呈报`} role="查核人呈报" speech={proved?`${q.inspector===world.characterId?'我已':'臣已'}查实${accountName(q.account)}公款被侵吞，请裁定是否追缴。`:`${q.inspector===world.characterId?'我已':'臣已'}查核${accountName(q.account)}，未取得足以认定侵吞的证据，请准予结案。`} terms={<div className="service-audience-terms"><span>查实公款 <b>{people.reduce((n,m)=>n+m.amount,0)}</b></span><span>尚欠 <b>{people.reduce((n,m)=>n+m.amount-m.recovered,0)}</b></span></div>} options={proved?[{id:'recover',title:'责令退赔',description:`从责任人私财追缴并归还${accountName(q.account)}；不足继续追偿，功绩与关系依实结算。`,command:{type:'economy',action:'resolve',caseId:q.id,decision:'recover'}},{id:'dismiss',title:'免予追缴',description:'本案结案，不追缴、不扣功绩；已查实的责任记录保留。',command:{type:'economy',action:'resolve',caseId:q.id,decision:'dismiss'}}]:[{id:'dismiss',title:'证据不足，结案',description:'不追缴、不处罚；结束本次查核。',command:{type:'economy',action:'resolve',caseId:q.id,decision:'dismiss'}}]} reason={command=>economyCommandReason(world,command as Parameters<typeof economyCommandReason>[1])} pending={pending} send={send} onPerson={onPerson} detailLabel="查看查核案卷" details={<>{people.length?people.map(m=><p key={m.id}>{politicalName(m.id)}：查实 {m.amount} 钱，已追回 {m.recovered} 钱，尚欠 {m.amount-m.recovered} 钱。</p>):<p>未查得足够证据，不能据此追缴或处罚。</p>}<small>核查第 {q.started} 日及以前的公款支出。</small></>}/>;
 return <article key={q.id} className="audit-report"><header className="audit-heading"><RealmBadge world={world} realm={q.realm as RealmId}/><strong>{accountName(q.account)}</strong><small>{q.phase==='investigating'?'查核中':'已结案'}</small></header><div className="audit-officers"><div><small>委托人</small>{portrait(q.commissioner)}</div><div><small>查核人</small>{portrait(q.inspector)}</div></div><p className="audit-context">核查第 {q.started} 日及以前的公款支出{q.phase==='investigating'?` · 驻留查核余 ${Math.max(0,q.due-world.day)} 日，另计赴任`:''}</p>
 <div className="audit-verdict"><ArtIcon name={proved?'stress':'diligent'} size={26}/><strong>{q.phase==='investigating'?'尚未形成结论':proved?'查实侵吞公款':q.outcome==='cancelled'?'查核已中止':'未查得足够证据'}</strong></div>
 {people.map(m=><div className="audit-finding" key={m.id}>{portrait(m.id)}<div><Resource name="coins" value={m.amount} label="本案查实侵吞公款" unit="钱"/><small>已追回 {m.recovered} · 尚欠 {m.amount-m.recovered}</small></div></div>)}
 {q.outcome==='inconclusive'&&<p>本次未取得足以认定侵吞的证据，不能据此追缴或处罚。</p>}
 {q.phase==='closed'&&<p>{q.resolution==='recover'?'已裁定追缴；尚欠部分继续从责任人私财中追偿。':q.resolution==='dismiss'?(proved?'已结案，本案不追缴，责任记录保留。':'已结案，未认定有罪。'):'查核未完成，不作有罪认定。'}</p>}
 </article>;
 })}</div>;
}
export function GovernmentAuditPanel({world,pending,send,onPerson,compact=false}:Props&{onPerson:(id:string)=>void;compact?:boolean}){
 const [auditAccount,setAuditAccount]=useState(''),[inspector,setInspector]=useState(''),[commissionOpen,setCommissionOpen]=useState(false);
 const [caseId,setCaseId]=useState<number|null>(null);
 const p=economyPresentation(world),audit=p.audits.some(a=>a.id===auditAccount)?auditAccount:p.audits[0]?.id??'';
 const props={world,pending,send},command={type:'economy',action:'audit',account:audit,inspector} as const,reason=economyCommandReason(world,command);
 if(!compact&&!p.audits.length&&!p.view.investigations.length)return null;
 return <div className="government-audit"><h3><ArtIcon name="wary" size={26}/>监察</h3>
  {p.audits.length>0&&<div className="government-audit-launch"><span>核查公库支出与追缴记录</span><HoverHint label="委托查核" content="私财 20 钱；选择公库与监察人，赴当地驻留查核 14 日，另计赴任。"><button className={compact?'court-icon-button':undefined} aria-label="委托查核" onClick={()=>setCommissionOpen(true)}><ArtIcon name="influence" size={24}/>{!compact&&'委托查核 · 私财 20 钱'}</button></HoverHint></div>}
  {commissionOpen&&<ActionDialog title="委托查核" onClose={()=>setCommissionOpen(false)} actions={<button className="primary" disabled={pending||!!reason} onClick={()=>{if(pending||economyCommandReason(world,command))return;send(command);setCommissionOpen(false);}}>确认委托 · 私财 20 钱</button>}><div className="government-audit-parameters"><label>查核公库<select value={audit} onChange={e=>setAuditAccount(e.target.value)}>{p.audits.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><PersonChoice world={world} title="监察人" value={inspector} onChange={setInspector} pending={pending} options={p.inspectors.map(a=>({id:a.id,score:attributes(world,a.id).stewardship,metric:'管理',reason:economyCommandReason(world,{type:'economy',action:'audit',account:audit,inspector:a.id})}))}/></div><p>监察人赴当地驻留查核 14 日；可能查无实据，因失守或人事变化中止时不退已付费用。</p>{reason&&<p role="status" className="court-fiscal-reason">{reason}</p>}</ActionDialog>}
  {p.view.investigations.length>0&&<section className="government-audit-records"><h3><ArtIcon name="diligent" size={24}/>查核案件{compact&&<small>{p.view.investigations.length}</small>}</h3>{compact?<div className="court-audit-cases">{p.view.investigations.slice().reverse().map(q=><article key={q.id}><header><strong>{accountName(q.account)}</strong><HoverHint label={q.phase==='report'?'审阅查核呈报':'查看查核案卷'} content={q.phase==='report'?'查阅证据、责任金额与追缴方案，确认后才裁决。':'查看委托人、经办人、核查日期与实际结论。'}><button className="court-icon-button" aria-label={'查看'+accountName(q.account)+'查核案卷'} onClick={()=>setCaseId(q.id)}><ArtIcon name={q.phase==='report'?'influence':'diligent'} size={24}/></button></HoverHint></header><small>{q.phase==='investigating'?'查核中 · 驻留余 '+Math.max(0,q.due-world.day)+' 日，另计赴任':q.phase==='report'?'呈报待裁':'已结案'} · 第 {q.started} 日立案</small><button className="court-audit-inspector" aria-label={'查看监察人 '+politicalName(q.inspector)} onClick={()=>onPerson(q.inspector)}><CharacterPortrait world={world} characterId={q.inspector} compact/><span>监察人 <strong>{politicalName(q.inspector)}</strong></span></button>{q.phase!=='investigating'&&<p>{q.outcome==='substantiated'?'查实侵吞公款':q.outcome==='cancelled'?'查核已中止':'未查得足够证据'}</p>}</article>)}</div>:<EconomyCases {...props} onPerson={onPerson}/>}</section>}
  {compact&&!p.audits.length&&!p.view.investigations.length&&<p className="court-empty">暂无有权查核的公库与案件</p>}
  {compact&&caseId!==null&&<ActionDialog title="公库查核案卷" onClose={()=>setCaseId(null)} cancelLabel="返回监察" actions={null}><EconomyCases {...props} caseId={caseId} onPerson={onPerson}/></ActionDialog>}
 </div>;
}
