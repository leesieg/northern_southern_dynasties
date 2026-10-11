import {afterCommand} from './actionFeedback';
import {regimeName} from '../core/government';
import {useEffect,useState} from 'react';
import type {World,GameCommand} from '../core/types';
import type {RealmId} from '../core/realm';
import {playerRealm} from '../core/realm';
import {worldRealms} from '../core/polityRuntime';
import {armyCommander} from '../core/mobility';
import {receptionNames,pactReason,pactQuote,type ReceptionTerms,type PactCommand} from '../core/allegiancePacts';
import {RealmBadge} from './RealmBadge';
import {ActionDialog} from './ActionDialog';
import {CommandButton} from './CommandButton';
export function PactRequestPanel({world:w,armyId,pending,send}:{world:World;armyId?:number;pending:boolean;send:(c:GameCommand)=>Promise<boolean>}){
 const r=playerRealm(w),id=w.characterId!,[open,setOpen]=useState(false),[target,setTarget]=useState<RealmId>('liang'),[terms,setTerms]=useState<ReceptionTerms>(armyId?'retain':'personal');
 useEffect(()=>{setOpen(false);setTerms(armyId?'retain':'personal');},[r,id,armyId]);
 const a=armyId?w.realm!.armies.find(a=>a.id===armyId):undefined;if(armyId&&(!a||armyCommander(w,a)!==id&&a.owner!==id))return null;
 const countries=worldRealms(w).filter(to=>to!==r&&!w.realm!.annexed?.[to]),to=countries.includes(target)?target:countries[0]??'liang',c:PactCommand={type:'pact',action:'request',realm:to,army:armyId,terms},q=pactQuote(w,{person:id,from:r,to,army:armyId??null,terms}),why=pactReason(w,c),pact=w.allegiancePacts?.items.find(p=>p.person===id&&(p.status==='pending'||p.status==='active'));
 return <div className="pact-request"><CommandButton label={pact?'归附议案与待遇':armyId?'携部归附谈判':'个人投奔'} icon="gregarious" pending={pending} reason={!pact&&!countries.length?'暂无可接纳政权':''} selected={open} hint={pact?'查阅已有归附议案与待遇；重议前预览影响力成本。':'选择接纳国与安置条件，预览本人影响力 20 的成本；只有对方批准才改变效忠。'} onClick={()=>{setTarget(countries[0]??'liang');setTerms(pact?.terms??(armyId?'retain':'personal'));setOpen(true);}}/>
 {open&&<ActionDialog title={pact?'归附议案与待遇':'提出归附请求'} onClose={()=>setOpen(false)} actions={pact? <>{pact.status==='active'&&pact.terms!=='personal'&&terms!==pact.terms&&<button className="primary" disabled={pending||!!pactReason(w,{type:'pact',action:'renegotiate',id:pact.id,terms})} onClick={()=>{const command:PactCommand={type:'pact',action:'renegotiate',id:pact.id,terms};if(pending||pactReason(w,command))return;void afterCommand(send(command),()=>{setOpen(false);});}}>确认重议 · 本人影响力 10</button>}</>:<button className="primary" disabled={pending||!!why} onClick={()=>{if(pending||pactReason(w,c))return;void afterCommand(send(c),()=>{setOpen(false);});}}>确认请求 · 本人影响力 20</button>}>
 {pact?<><p><RealmBadge world={w} realm={pact.to}/> · {receptionNames[pact.terms]} · {pact.status==='pending'?'候接纳方回应':'按约效力'}</p>{pact.breaches.length>0&&<p>交涉原因：{pact.breaches.join('、')}</p>}<p>{pact.status==='pending'?'答复余 '+Math.max(0,pact.due-w.day)+' 日':'逐步改编需至少 90 日、供饷无欠缺且本人仍接受安排。'}</p>{pact.status==='active'&&pact.terms!=='personal'&&<><div className="power-options">{(['retain','reform'] as const).map(v=><label key={v}><input type="radio" name="renegotiate-terms" checked={terms===v} onChange={()=>setTerms(v)}/><b>{receptionNames[v]}</b><small>{v==='retain'?'保留部曲与当前兵权，接纳国继续供饷':'从确认起重新计算 90 日，在条件满足后改编公军'}</small></label>)}</div><p>按接纳方当前信任复核；确认后支付本人影响力 10。</p>{terms!==pact.terms&&pactReason(w,{type:'pact',action:'renegotiate',id:pact.id,terms})&&<p role="status">{pactReason(w,{type:'pact',action:'renegotiate',id:pact.id,terms})}</p>}</>}</>:<><div className="power-actions" role="group" aria-label="接纳政权">{countries.map(realm=><span key={realm}><RealmBadge realm={realm} world={w}/><button aria-label={'选择接纳政权 '+regimeName(w,realm)} aria-pressed={to===realm} onClick={()=>setTarget(realm)}>{to===realm?'已选':'选择'}</button></span>)}</div><div className="power-options">{(['retain','reform','personal'] as const).map(v=><label key={v}><input type="radio" name="reception-terms" checked={terms===v} onChange={()=>setTerms(v)}/><b>{receptionNames[v]}</b><small>{v==='retain'?'保留当前部曲，接纳国供饷与保护':v==='reform'?'同意 90 日后有条件改编为公军':'本人投奔，军队和地方留在旧国'}</small></label>)}</div><p>实际追随 {q.troops} 人 · 留守 {q.remaining} 人。接纳保护预算 {q.protection} 中央公款；旧国欠饷留给原账户。</p><p>{terms==='personal'?'个人效忠变更，不自动开战。':'接纳武装归附会承担保护战争；地方易帜仍单独办理。'} 请求在 30 日后失效，承诺供饷、兵权和安全会持续复核。</p>{why&&<p role="status">{why}</p>}</>}
 </ActionDialog>}
 </div>;
}
