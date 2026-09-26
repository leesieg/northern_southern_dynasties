import {accountName} from '../core/treasury';
import {RealmBadge} from './RealmBadge';
import type {RealmId} from '../core/realm';
import {EnterprisePanel} from './CareerSystems';
import {useState} from 'react';
import type {GameCommand, World} from '../core/types';
import {economyCommandReason, economyPresentation, type PersonalEconomyCommand} from '../core/personalEconomyAdapter';
import {livingStandards, type LivingStandard} from '../core/personalEconomyRules';
import {attributes} from '../core/social';
import {politicalName} from '../core/government';
import {ArtIcon,Resource,type ArtName} from './ArtIcon';
import {DetailTabs} from './DetailTabs';
import {HoverHint} from './HoverHint';
import {PersonChoice} from './PersonSelection';
import {CharacterPortrait} from './CharacterPortrait';
import './personalEconomy.css';
type Props={world:World;pending:boolean;send:(c:GameCommand)=>void};
function EconomyAction({world,pending,send,command,label,icon='coins',consequence,hint,summary,active}:{command:PersonalEconomyCommand;label:string;icon?:ArtName;consequence?:string;hint?:string;summary?:string;active?:boolean}&Props){
 const [confirm,setConfirm]=useState(false),reason=economyCommandReason(world,command);
 return <div className="economy-action"><HoverHint label={label} content={<>{hint||consequence||label}{reason&&<p>{reason}</p>}</>}><button aria-pressed={active} disabled={pending||!!reason} onClick={()=>consequence?setConfirm(true):send(command)}><ArtIcon name={icon} size={26}/>{label}</button></HoverHint>{summary&&<small>{summary}</small>}{confirm&&<div className="economy-confirm" role="group" aria-label="确认操作"><p>{consequence}</p>{reason&&<small>{reason}</small>}<button disabled={pending||!!reason} onClick={()=>{send(command);setConfirm(false);}}>确认</button><button disabled={pending} onClick={()=>setConfirm(false)}>取消</button></div>}</div>;
}
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
export function PersonalEconomyPanel({world,pending,send}:Props){
 const [section,setSection]=useState<'household'|'business'|'accounts'|'cases'>('household'),[account,setAccount]=useState(''),[auditAccount,setAuditAccount]=useState(''),[inspector,setInspector]=useState(''),[amount,setAmount]=useState(20);
 if(world.mode!=='sandbox'||!world.characterId||!world.realm)return null;
 const p=economyPresentation(world),b=p.view.budget,chosen=p.donations.some(a=>a.id===account)?account:p.donations[0]?.id??'',audit=p.audits.some(a=>a.id===auditAccount)?auditAccount:p.audits[0]?.id??'';
 const props={world,pending,send};
 return <section className="personal-economy" aria-label="私财与监察"><header><Resource name="coins" value={world.people[0].coins} label="个人现钱" caption/><HoverHint label="持家预算" content="按当前规格预计未来三期持家支出；不含其他活动、幕俸及新增承诺。"><span><ArtIcon name="estate" size={24}/>{livingStandards[b?.standard??'modest'].monthly*3} 钱 / 90 日</span></HoverHint></header>
 {!world.economy&&<EconomyAction {...props} label="建立持家账簿" command={{type:'economy',action:'activate'}} consequence="按生活规格每三十日结算持家支出，可安排研习、宴请与公私往来。"/>}
 <DetailTabs label="财务章节" value={section} onChange={setSection} items={[{id:'household',label:'持家',icon:'estate'},{id:'business',label:'事业',icon:'city'},{id:'accounts',label:'公私往来',icon:'coins'},{id:'cases',label:'监察',icon:'influence'}]}/>
 {section==='household'&&<><div className="economy-grid">{(Object.keys(livingStandards) as LivingStandard[]).map(standard=><EconomyAction key={standard} {...props} label={`${livingStandards[standard].name} · ${livingStandards[standard].monthly} 钱/30日`} icon="estate" active={(b?.standard??'modest')===standard} summary={`每期缓解压力 ${livingStandards[standard].relief}；欠费降为朴素度日并增压。`} hint={`每期支出 ${livingStandards[standard].monthly} 钱，缓解压力 ${livingStandards[standard].relief}；不足支付时降为朴素度日并增加压力。`} command={{type:'economy',action:'living',standard}}/>)}</div>{b&&b.lastBill>0&&<small>最近一期：应付 {b.lastBill} ／ 实付 {b.lastPaid} 钱</small>}<article><h4><ArtIcon name="diligent" size={24}/>延师研习</h4><p>每三期管理 +1，最多 +3；当前 {b?.courses??0}/9 期。</p><EconomyAction {...props} label="研习 · 30 钱／30 日" icon="diligent" consequence="先付私财 30 钱，驻留学习 30 日完成一期；每三期管理 +1，最多 +3。公务或出行顺延，久延未成则费用不退。" command={{type:'economy',action:'programme',kind:'study'}}/>{p.view.programmes.filter(a=>a.status==='active').map(a=><small key={a.id}>{a.kind==='study'?'研习':'宴请'}余 {Math.max(0,a.due-world.day)} 日；公务、出行期间顺延</small>)}</article><ol className="economy-records">{p.view.entries.slice(-12).reverse().map(e=><li key={e.id}><small>第 {e.day} 日</small> {e.reason} <b>{e.delta>0?'+':''}{e.delta||''}{e.delta?' 钱':''}</b></li>)}</ol></>}
 {section==='business'&&<EnterprisePanel {...props}/>}
 {section==='accounts'&&<><section><h4><ArtIcon name="coins" size={24}/>债权与负担</h4>{world.obligations?.items.filter(d=>d.remaining&&(d.from==='person:'+world.characterId||d.to==='person:'+world.characterId)).map(d=><p key={d.id}>{d.to==='person:'+world.characterId?'待收':'待付'} {d.remaining} 钱 · {d.reason} · 下期余 {Math.max(0,d.next-world.day)} 日</p>)}</section><label>钱数<input type="number" min={10} max={200} step={5} value={amount} onChange={e=>setAmount(Number(e.target.value))}/></label><article><h4><ArtIcon name="generous" size={24}/>捐输</h4><label>公库<select value={chosen} onChange={e=>setAccount(e.target.value)}>{p.donations.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><EconomyAction {...props} label={`捐输 ${amount} 钱`} command={{type:'economy',action:'donate',account:chosen,amount}} consequence="从私财拨入公库，不换取功绩或官职。"/></article>{p.managed.map(a=><article key={a.id}><h4>{a.name}</h4><Resource name="coins" value={a.balance} label="可用公款"/><EconomyAction {...props} label={`侵吞 ${amount} 钱`} icon="wary" command={{type:'economy',action:'embezzle',account:a.id,amount}} consequence={`公共预算减少 ${amount} 钱、私财增加等额钱款。可能受到监察、追缴和处分，离任不免除责任。`}/></article>)}{p.view.ownMisconduct.length>0&&<article><h4>未清责任</h4>{p.view.ownMisconduct.map(m=><p key={m.id}>第 {m.day} 日 · 侵吞 {m.amount} ／退赔 {m.recovered} 钱</p>)}</article>}</>}
 {section==='cases'&&<>{p.audits.length>0&&<><label>查核公库<select value={audit} onChange={e=>setAuditAccount(e.target.value)}>{p.audits.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><PersonChoice world={world} title="监察人" value={inspector} onChange={setInspector} pending={pending} options={p.inspectors.map(a=>({id:a.id,score:attributes(world,a.id).stewardship,metric:'管理',reason:economyCommandReason(world,{type:'economy',action:'audit',account:audit,inspector:a.id})}))}/><EconomyAction {...props} label="委托查核 · 私财 20 钱" icon="influence" command={{type:'economy',action:'audit',account:audit,inspector}} consequence="监察人赴当地驻留查核 14 日；可能查无实据，因失守或人事变化中止时不退已付费用。"/></>}<EconomyCases {...props}/></>}
 </section>;
}
export function PrivateBanquet({target,...props}:Props&{target:string}){return props.world.economy?<EconomyAction {...props} label="私人宴请 · 40 钱／3 日" icon="gregarious" consequence="先付私财 40 钱；与对方同城相聚三日后，好感 +6（慷慨者 +10），本人压力 −5（节俭者 +5）。异地或公务顺延，久延未成费用不退。" command={{type:'economy',action:'programme',kind:'banquet',target}}/>:null;}
