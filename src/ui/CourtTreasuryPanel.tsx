import {useState} from 'react';
import {ActionDialog} from './ActionDialog';
import {ArtIcon,Resource} from './ArtIcon';
import {ConfirmAction} from './ConfirmAction';
import {FiscalPetitionAudience} from './PetitionCases';
import {HoverHint} from './HoverHint';
import {canCommission} from '../core/serviceMandates';
import {countyTerritory,localHasJurisdiction,localTitle} from '../core/localAdministration';
import {accountName,fiscalPath,localBalance,grantFactors,grantPurposes,fiscalReason,type FiscalCommand,type GrantRequest} from '../core/treasury';
import {executive,playerRealm,cityYield} from '../core/realm';
import {politicalName} from '../core/government';
import {siteById} from '../data/scenario';
import type {GameCommand,World} from '../core/types';
import './courtTreasury.css';

export function CourtTreasuryPanel({world:w,pending,send,onPerson,initialTab='budget'}:{world:World;pending:boolean;send:(c:GameCommand)=>void;onPerson:(id:string)=>void;initialTab?:'budget'|'requests'|'ledger'}){
 const [grantOpen,setGrantOpen]=useState(false),[site,setSite]=useState(''),[amount,setAmount]=useState(100),[purpose,setPurpose]=useState<GrantRequest['purpose']>('construction');
 const [ledgerOpen,setLedgerOpen]=useState(initialTab==='ledger'),[historyOpen,setHistoryOpen]=useState(false),[reliefSite,setReliefSite]=useState<string|null>(null);
 const realm=playerRealm(w),chief=executive(w),fiscal=w.realm!.fiscal;
 const cities=Object.entries(w.realm!.cities).filter(([id,c])=>c.owner===realm&&c.controller===realm&&canCommission(w,w.characterId!,realm,id,'relief'));
 const requests=(fiscal?.requests??[]).filter(q=>q.realm===realm&&(chief||q.actor===w.characterId||q.approver===w.characterId));
 const waiting=requests.filter(q=>q.status==='pending').reverse(),history=requests.filter(q=>q.status!=='pending').reverse();
 const ledger=(fiscal?.entries??[]).filter(e=>e.realm===realm).slice().reverse();
 const target=cities.some(([id])=>id===site)?site:cities[0]?.[0]??'';
 const canAllocate=target&&(chief||localHasJurisdiction(w,w.characterId!,countyTerritory(target),realm));
 const grant: FiscalCommand=canAllocate?{type:'fiscal',action:'allocate',site:target,amount}:{type:'fiscal',action:'request',site:target,amount,purpose};
 const grantReason=target?fiscalReason(w,grant):'暂无可申请的城邑';
 const renderRequest=(q:typeof requests[number])=>q.approver===w.characterId&&q.status==='pending'
  ?<FiscalPetitionAudience key={q.id} world={w} request={q} pending={pending} send={send} onPerson={onPerson}/>
  :<article className="court-fiscal-request" key={q.id}><div><strong>{q.territory?localTitle(q.territory):siteById[q.site].name} · {grantPurposes[q.purpose]}</strong><small><button className="court-fiscal-actor" onClick={()=>onPerson(q.actor)}>{politicalName(q.actor)}</button> · {q.amount} 钱 · {q.status==='pending'?'候 '+politicalName(q.approver)+' 批示':q.reply}</small></div><HoverHint label="审批因素" content={<>{(q.evaluation??grantFactors(w,q)).map(f=><p key={f.label}>{f.label} {f.value>=0?'+':''}{f.value}</p>)}</>}><span tabIndex={0}>评分 {(q.evaluation??grantFactors(w,q)).reduce((n,f)=>n+f.value,0)} ⓘ</span></HoverHint>{q.status==='pending'&&q.actor===w.characterId&&<button disabled={pending||!!fiscalReason(w,{type:'fiscal',action:'cancel',id:q.id})} onClick={()=>send({type:'fiscal',action:'cancel',id:q.id})}>撤回</button>}</article>;
 return <div className="court-fiscal">
  <div className="staff-chamber-heading"><h3>中央账房</h3><small>公库收支与地方拨款</small></div>
  <div className="court-fiscal-toolbar"><div><strong>{waiting.length}</strong><span>件候批文书</span><small>中央公款 {w.realm!.treasuries[realm].coins} · 公粮 {w.realm!.treasuries[realm].grain}</small></div><button className="primary" disabled={!target} onClick={()=>setGrantOpen(true)}><ArtIcon name="coins" size={23}/>发起拨款</button></div>
  {waiting.length>0&&<section className="court-fiscal-section"><h4>待批与候复</h4><div className="court-fiscal-requests">{waiting.map(renderRequest)}</div></section>}
  <section className="court-fiscal-section"><h4>地方公库 <small>{cities.length} 城</small></h4><div className="court-fiscal-cities">{cities.map(([id])=>{const relief={type:'fiscal',action:'relief',site:id} as const,reason=fiscalReason(w,relief);return <article key={id}><strong>{siteById[id].name}</strong><Resource name="coins" value={localBalance(w,id)} label="公款" caption/><HoverHint label="税赋路径" content={fiscalPath(w,id).map(accountName).join(' → ')}><span tabIndex={0}>月税 {cityYield(w,id).coins} ⓘ</span></HoverHint><HoverHint label="平粜赈济" content={reason||'支出本城公款 20 钱，秩序 +8'}><button disabled={pending||!!reason} onClick={()=>setReliefSite(id)}>平粜</button></HoverHint></article>;})}{!cities.length&&<p>暂无可管理的地方公库。</p>}</div></section>
  {history.length>0&&<section className="court-fiscal-section"><div className="court-fiscal-section-heading"><h4>近期待复</h4>{history.length>4&&<button aria-expanded={historyOpen} onClick={()=>setHistoryOpen(open=>!open)}>{historyOpen?'收起':'查看全部'} · {history.length}</button>}</div><div className="court-fiscal-requests">{(historyOpen?history:history.slice(0,4)).map(renderRequest)}</div></section>}
  <section className="court-fiscal-section"><div className="court-fiscal-section-heading"><h4>往来账目</h4><button aria-expanded={ledgerOpen} onClick={()=>setLedgerOpen(open=>!open)}>{ledgerOpen?'收起账目':'查看账目'} · {ledger.length}</button></div>{ledgerOpen&&<div className="court-fiscal-ledger">{ledger.slice(0,60).map(e=><article key={e.id}><span>第 {e.day} 日 · {e.reason}</span><strong>{e.coins} 钱</strong><small>{accountName(e.from)} → {accountName(e.to)}</small></article>)}{!ledger.length&&<p>尚无账目。</p>}</div>}</section>
  {grantOpen&&<ActionDialog title="发起拨款" onClose={()=>setGrantOpen(false)} actions={<button className="primary" disabled={pending||!!grantReason} onClick={()=>{if(pending||fiscalReason(w,grant))return;send(grant);setGrantOpen(false);}}>{canAllocate?'确认拨入地方公库':'确认呈请拨款'} · {amount} 钱</button>}><div className="court-fiscal-grant"><label>目标城邑<select value={target} onChange={e=>setSite(e.target.value)}>{cities.map(([id])=><option key={id} value={id}>{siteById[id].name}</option>)}</select></label><label>公款数额<input type="number" min={20} max={400} step={10} value={amount} onChange={e=>setAmount(Number(e.target.value))}/></label>{!canAllocate&&<label>用途<select value={purpose} onChange={e=>setPurpose(e.target.value as GrantRequest['purpose'])}>{Object.entries(grantPurposes).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>}<p>资金来源：{canAllocate?'上级公库，立即拨入目标地方公库':'直属上级公库，获批后转入目标地方公库'}。目标：{siteById[target]?.name??'未选'}。</p>{grantReason&&<p role="status" className="court-fiscal-reason">{grantReason}</p>}</div></ActionDialog>}
  {reliefSite&&<ConfirmAction title={'下令 '+siteById[reliefSite].name+' 平粜？'} detail={'从本城地方公库支出 20 钱，秩序 +8；不动用中央公款或私人财产。'} confirmLabel="确认下令" pending={pending||!!fiscalReason(w,{type:'fiscal',action:'relief',site:reliefSite})} onCancel={()=>setReliefSite(null)} onConfirm={()=>{const cmd={type:'fiscal',action:'relief',site:reliefSite} as const;if(pending||fiscalReason(w,cmd))return;send(cmd);setReliefSite(null);}}/>}
 </div>;
}
