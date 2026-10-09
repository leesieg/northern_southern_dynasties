import {ConfirmAction} from './ConfirmAction';
import {siteById} from '../data/scenario';
import {useState} from 'react';
import type {World,GameCommand} from '../core/types';
import {playerRealm,type RealmId} from '../core/realm';
import {monthStart} from '../core/calendar';
import {fiscalReport} from '../core/fiscalReport';
import {centralAccount,publicFiscalEntries,accountName,publicBalance,territoryAccount,fiscalReason,grantSource,grantPurposes,type FiscalCommand,type GrantRequest} from '../core/treasury';
import {canonicalTerritory,localSeatSite,localSites,localSuperior} from '../core/localAdministration';
import {childrenOf,ancestorsOf,territoryNodes} from '../data/territorialHierarchy';
import {politicalName} from '../core/government';
import {ActionDialog} from './ActionDialog';
import {FiscalPetitionAudience} from './PetitionCases';
import {ArtIcon} from './ArtIcon';
import {HoverHint} from './HoverHint';
import {CountyArtwork} from './TerritoryArtwork';

type Props={world:World;territory:string;realm:RealmId;pending:boolean;send:(c:GameCommand)=>void;onSelect:(id:string)=>void;onPerson?:(id:string)=>void};
type Transfer=Extract<FiscalCommand,{action:'request'|'allocate'}>;
export function InkTreasury({world:w,territory,realm:r,pending,send,onSelect,onPerson}:Props){
 const [relief,setRelief]=useState(false);
 const [page,setPage]=useState<'ledger'|'requests'|'rules'|'allocate'|null>(null),[draft,setDraft]=useState<Transfer|null>(null);
 const key=territoryNodes[territory].level==='realm'?centralAccount(r):territoryAccount(w,r,territory),since=monthStart(w.day,w.scriptId),report=fiscalReport(publicFiscalEntries(w,r),[key],since,w.day),balance=publicBalance(w,key);
 const node=territoryNodes[canonicalTerritory(territory)],regional=['realm','province','prefecture'].includes(node.level),parent=node.parent;
 const children=childrenOf(node.id).filter(n=>localSites(w,n.id,r).length),peers=regional?children:parent?childrenOf(parent).filter(n=>localSites(w,n.id,r).length):[];
 const requests=(w.realm?.fiscal?.requests??[]).filter(q=>q.realm===r&&(q.actor===w.characterId||q.approver===w.characterId)&&localSites(w,q.territory??'county:'+q.site,r).some(id=>localSites(w,node.id,r).includes(id))),waiting=requests.filter(q=>q.status==='pending');
 const site=localSeatSite(w,node.id,r),request:Transfer={type:'fiscal',action:'request',territory:node.id,site:site??'',amount:100,purpose:'construction'},requestReason=fiscalReason(w,request);
 const own=r===playerRealm(w),title=node.name+'公库',allocate:Transfer={type:'fiscal',action:'allocate',territory:node.id,site:site??'',amount:100},reliefReason=fiscalReason(w,{type:'fiscal',action:'relief',site:site??''});
 const columns=[{title:'收入',value:report.income,groups:report.incoming,kind:'income'},{title:'支出',value:report.expense,groups:report.outgoing,kind:'expense'}];
 return <div className="ink-treasury">
 <section className="ink-treasury-book" aria-label={title}>
  <header className="ink-treasury-title"><nav aria-label="公库层级">{ancestorsOf(node.id).filter(n=>n.id!==node.id).map(n=><button key={n.id} onClick={()=>onSelect(n.id)}>{n.name} ›</button>)}</nav><h2>{title}</h2></header>
  <div className="ink-treasury-balance"><ArtIcon name="coins" size={52}/><div><small>当前余额</small><strong>{balance.toLocaleString()}<small> 钱</small></strong></div><div className="ink-fiscal-period"><span>本月已记账</span><b className={report.net>=0?'income':'expense'}>{report.net>=0?'+':''}{report.net.toLocaleString()} 钱</b><small>仅计本级公库</small></div></div>
  <div className="ink-fiscal-body"><div className="ink-fiscal-columns">{columns.map(col=><section key={col.title}><h3>{col.title}<b className={col.kind}>{col.value.toLocaleString()}</b></h3><div className="ink-fiscal-rows">{col.groups.map(group=><HoverHint key={group.label} label={group.label} content={<div>{group.entries.map(e=><p key={e.id}>第 {e.day+1} 日 · {accountName(e.from)} → {accountName(e.to)} · {e.coins} 钱</p>)}</div>}><button onClick={()=>setPage('ledger')}><span>{group.label}</span><strong>{group.total.toLocaleString()} ›</strong></button></HoverHint>)}{!col.groups.length&&<p className="ink-empty">本月暂无已记账{col.title}</p>}</div></section>)}</div>
  <p className="ink-ledger-note">按现存流水汇总；旧档或截断账目不反推期初余额。</p>
  <section className="ink-fiscal-rules"><h3><ArtIcon name="diligent" size={23}/>征收与留用</h3><p>县留用税收的 35%<br/>郡、州各留用所收上缴额的 10%<br/>余款入中央公库</p><button onClick={()=>setPage('rules')}>查看规则 ›</button>{!regional&&own&&<HoverHint label="下令平粜" content={reliefReason||'本县公库支出 20 钱，秩序 +8；预览后确认。'}><button className="ink-relief-entry" disabled={pending||!!reliefReason} onClick={()=>setRelief(true)}>下令平粜</button></HoverHint>}</section>
  <button className="ink-fiscal-petitions" onClick={()=>setPage('requests')}><ArtIcon name="diligent" size={25}/><span>待办拨款 <b>{waiting.length}</b> 件待批</span><span>查看文书 ›</span></button>
  </div><footer className="ink-fiscal-actions"><button onClick={()=>setPage('ledger')}><ArtIcon name="world" size={27}/>查看账目</button><HoverHint label="向上级请款" content={requestReason||'选择金额与用途，呈交直属上级审批。'}><button disabled={pending||!own||!!requestReason} onClick={()=>setDraft(request)}><ArtIcon name="diligent" size={27}/>向上级请款</button></HoverHint><HoverHint label={regional?'拨付下辖':'拨入本县'} content={regional?'选择辖区，按当前身份核对实际付款公库。':'预览由上级公库拨入本县的金额与权限。'}><button disabled={!own||regional&&!children.length} onClick={()=>regional?setPage('allocate'):setDraft(allocate)}><ArtIcon name="coins" size={27}/>{regional?'拨付下辖':'拨入本县'}</button></HoverHint></footer>
 </section>
 <aside className="ink-treasury-jurisdictions"><h3>{regional?'辖下公库':'同郡公库'}</h3><small>{regional?node.name:parent?territoryNodes[parent].name:''} · 已录辖区</small><div>{peers.map(n=><button key={n.id} aria-current={n.id===node.id?'location':undefined} onClick={()=>onSelect(n.id)}><CountyArtwork terrain={siteById[localSeatSite(w,n.id,r)??'']?.terrain}/><strong>{n.name}</strong><span><small>公款</small><b>{publicBalance(w,territoryAccount(w,r,n.id)).toLocaleString()}</b></span><span>›</span></button>)}</div><p>各地余额独立核算</p></aside>
 {page&&<ActionDialog title={page==='ledger'?title+' · 账目':page==='requests'?'拨款文书':page==='allocate'?'选择拨款辖区':'征收与留用规则'} onClose={()=>setPage(null)} actions={null} cancelLabel="返回公库">
 {page==='ledger'&&<div className="treasury-ledger">{report.entries.map(e=><article key={e.id}><strong>{e.to===key?'+':'−'}{e.coins} 钱</strong><span>第 {e.day+1} 日 · {e.reason}</span><small>{accountName(e.from)} → {accountName(e.to)}</small></article>)}{!report.entries.length&&<p>本月暂无已记录的公库流水。</p>}</div>}
 {page==='rules'&&<><p>每月 1 日征收。县先留用税收的 35%，郡、州分别留用其实际收到上缴额的 10%，余款上缴中央。</p><p>县、郡、州与中央公库独立核算；拨款是账户之间转移，不能在全辖区收入中重复相加。专款、私人财产不属于本级可直接支配余额。</p><p>请款由直属上级审批。选择金额不会立即划款；确认前会再次核对身份、余额及实际付款账户。</p></>}
 {page==='allocate'&&<div className="ink-allocation-list">{children.map(n=>{const command:Transfer={type:'fiscal',action:'allocate',territory:n.id,site:localSeatSite(w,n.id,r)??'',amount:100};return <button key={n.id} onClick={()=>{setPage(null);setDraft(command);}}>{n.name}<span>公库 {publicBalance(w,territoryAccount(w,r,n.id))} 钱 · 预览拨付 ›</span></button>;})}</div>}
 {page==='requests'&&<>{requests.map(q=>q.status==='pending'&&q.approver===w.characterId?<FiscalPetitionAudience key={q.id} world={w} request={q} pending={pending} send={send} onPerson={onPerson}/>:<article className="treasury-request" key={q.id}><strong>{q.amount} 钱 · {grantPurposes[q.purpose]}</strong><p>{q.status==='pending'?'候 '+politicalName(q.approver,w)+' 批示':q.reply}</p>{q.status==='pending'&&q.actor===w.characterId&&<button disabled={pending||!!fiscalReason(w,{type:'fiscal',action:'cancel',id:q.id})} onClick={()=>send({type:'fiscal',action:'cancel',id:q.id})}>撤回申请</button>}</article>)}{!requests.length&&<p>当前没有与你办理权限相关的拨款文书。</p>}</>}
 </ActionDialog>}
 {relief&&site&&<ConfirmAction title="确认下令平粜？" detail={siteById[site].name+'公库支出 20 钱，秩序 +8；不动用中央公款或私人财产。'} confirmLabel="确认平粜" pending={pending||!!reliefReason} onCancel={()=>setRelief(false)} onConfirm={()=>{const command={type:'fiscal',action:'relief',site} as const;if(pending||fiscalReason(w,command))return;send(command);setRelief(false);}}/>}
 {draft&&<FiscalTransferDialog key={draft.territory+draft.action} world={w} pending={pending} send={send} initial={draft} onClose={()=>setDraft(null)}/>}
 </div>;
}

function FiscalTransferDialog({world:w,initial,pending,send,onClose}:{world:World;initial:Transfer;pending:boolean;send:(c:GameCommand)=>void;onClose:()=>void}){
 const [amount,setAmount]=useState(initial.amount),[purpose,setPurpose]=useState<GrantRequest['purpose']>('construction');
 const request=initial.action==='request',command={...initial,amount,...(request?{purpose}:{})} as Transfer,r=playerRealm(w),territory=initial.territory!,actor=request?localSuperior(w,territory,r,w.characterId!)?.holder??'':w.characterId!,source=grantSource(w,r,territory,actor),target=territoryAccount(w,r,territory),reason=fiscalReason(w,command);
 return <ActionDialog title={(request?'向上级请款':'拨付公款')+' · '+territoryNodes[territory].name} onClose={onClose} actions={<button className="primary" disabled={pending||!!reason} onClick={()=>{if(pending||fiscalReason(w,command))return;send(command);onClose();}}>确认{request?'请款':'拨付'} · {Number.isFinite(amount)?amount:0} 钱</button>}>
 <div className="action-summary"><p>办理人：{politicalName(w.characterId!,w)}</p><p>{accountName(source)}（余额 {publicBalance(w,source)} 钱） → {accountName(target)}（余额 {publicBalance(w,target)} 钱）</p><p>{request?'提交申请后等待直属上级审批，当前不会转账。':'确认后按实际拨款路径划转，不动用私人财产。'}</p></div>
 <label>钱数<input aria-label="拨款钱数" type="number" min={20} max={400} step={10} value={Number.isFinite(amount)?amount:''} onChange={e=>setAmount(e.target.valueAsNumber)}/></label>
 {request&&<label>用途<select value={purpose} onChange={e=>setPurpose(e.target.value as GrantRequest['purpose'])}>{Object.entries(grantPurposes).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>}
 {reason&&<p role="status">{reason}</p>}
 </ActionDialog>;
}
