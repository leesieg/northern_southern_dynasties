import {afterCommand} from './actionFeedback';
import {ActionDialog} from './ActionDialog';
import {CommandButton} from './CommandButton';
import {useState} from 'react';
import type {World,GameCommand} from '../core/types';
import {coordinatedReason,programmePlans,type CoordinateCommand} from '../core/coordinatedService';
import {localSites} from '../core/localAdministration';
import {playerRealm} from '../core/realm';
import {serviceCandidates} from '../core/assignments';
import {assignmentTemplates,type AssignmentKind} from '../data/assignments';
import {siteById} from '../data/scenario';
import {attributes} from '../core/social';
import {assignmentBudget} from '../core/assignments';
import {politicalName} from '../core/government';
import {SingleChoiceCards} from './SingleChoiceCards';
import {PersonChoice} from './PersonSelection';
import {ArtIcon} from './ArtIcon';
export function CoordinatedServicePanel({world:w,territory,pending,send,onCity}:{world:World;territory:string;pending:boolean;send:(c:GameCommand)=>Promise<boolean>;onCity:(site:string)=>void}){
 const [open,setOpen]=useState(false);
 return <section className="career-systems"><h3><ArtIcon name="influence" size={24}/>统筹辖县</h3><CommandButton label="拟定统筹委任" icon="influence" pending={pending} hint="选择差事、办理要求和各县承办人；预览各县预算后确认。" onClick={()=>setOpen(true)}/>{open&&<CoordinatedServiceDialog world={w} territory={territory} pending={pending} send={send} onClose={()=>setOpen(false)}/>}{w.coordinatedService?.items.filter(p=>p.territory===territory).slice(-4).reverse().map(p=><article key={p.id}><h4>{assignmentTemplates[p.kind].name} · {p.tasks.length} 县</h4><p>已结 {p.reports?.length??0} / {p.tasks.length} · 实支 {p.reports?.reduce((n,r)=>n+r.coins,0)??0} 钱</p>{p.quarters?.slice(-1).map(q=><p key={q.day}>第 {q.day} 日季报 · 已结 {q.closed} · 未成 {q.failed} · 累计实支 {q.coins} 钱 / {q.grain} 粮</p>)}{p.assessed&&<small>统筹考课已记入委任人功绩；承办人按各案成果独立计绩。</small>}{p.tasks.map(id=>w.service?.tasks.find(t=>t.id===id)).filter(t=>!!t).map(t=><button key={t.id} onClick={()=>onCity(t.site)}><ArtIcon name={assignmentTemplates[t.kind].icon} size={24}/>{siteById[t.site].name} · {t.phase==='closed'?'结案':'在办'} · 实支 {t.spent?.coins??0} 钱</button>)}</article>)}</section>;
}
function CoordinatedServiceDialog({world:w,territory,pending,send,onClose}:{world:World;territory:string;pending:boolean;send:(c:GameCommand)=>Promise<boolean>;onClose:()=>void}){
 const [kind,setKind]=useState<AssignmentKind>('relief'),[policy,setPolicy]=useState<CoordinateCommand['policy']>('economy'),[orders,setOrders]=useState<CoordinateCommand['orders']>([]),r=playerRealm(w),sites=localSites(w,territory,r),command:CoordinateCommand={type:'coordinate',territory,kind,policy,orders},reason=coordinatedReason(w,command),candidates=serviceCandidates(w,r);
 const quotes=programmePlans(policy).map(plan=>assignmentBudget(kind,plan)),coins=quotes.map(q=>q.coins),grain=quotes.map(q=>q.grain);
 return <ActionDialog art="realm" title="统筹辖县" scene="landscape" onClose={onClose} actions={<button className="primary" disabled={pending||!!reason} onClick={()=>{if(pending||coordinatedReason(w,command))return;void afterCommand(send(command),onClose);}}>确认委任 · {orders.length} 县</button>}><label>目标<select value={kind} onChange={e=>{setKind(e.target.value as AssignmentKind);}}>{Object.entries(assignmentTemplates).filter(([id])=>id!=='envoy').map(([id,d])=><option key={id} value={id}>{d.name}</option>)}</select></label><SingleChoiceCards label="书面办理要求 · 单选" value={policy} disabled={pending} onChange={id=>{setPolicy(id);}} options={[{id:'economy',title:'节用',description:'仅准从容详办：常额八成预算，工作量 125%，基础质量 115%。'},{id:'quality',title:'保质',description:'准按部就班或从容详办；不准赶工压低质量。'},{id:'speed',title:'限时',description:'准按部就班或增拨赶办；赶办需常额 140% 预算、80% 工作量，基础质量 85%。'}]}/><p>预期成果：{assignmentTemplates[kind].effect}</p><p>各县拟案后分别申请：每县 {Math.min(...coins)}–{Math.max(...coins)} 公款、{Math.min(...grain)}–{Math.max(...grain)} 公粮；下达委任时不立即拨款。承办人各占一项额度，未处理的县域暂不受此令影响。</p><div className="detail-record-group">{sites.map(site=>{const selected=orders.find(o=>o.site===site);return <article key={site}><label><input type="checkbox" checked={!!selected} disabled={!selected&&orders.length>=8} onChange={e=>{setOrders(e.target.checked?[...orders,{site,officer:w.realm!.cities[site].governor??''}]:orders.filter(o=>o.site!==site));}}/>{siteById[site].name}</label>{selected&&<PersonChoice world={w} title={siteById[site].name+'承办'} pending={pending} value={selected.officer} onChange={id=>{setOrders(orders.map(o=>o.site===site?{...o,officer:id}:o));}} options={candidates.map(p=>({id:p.id,score:attributes(w,p.id)[assignmentTemplates[kind].skill],metric:'职务能力',reason:orders.some(o=>o.site!==site&&o.officer===p.id)?'已承办其他县域':''}))}/>}</article>;})}</div><p>{orders.map(o=>`${siteById[o.site].name}—${o.officer?politicalName(o.officer,w):'待选承办人'}`).join('、')}</p>{reason&&<p className="service-warning" role="status">{reason}</p>}</ActionDialog>;
}
