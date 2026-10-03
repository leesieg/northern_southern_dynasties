import {terrainSceneStyle,personTerrainSite} from './terrainScene';
import {SingleChoiceCards} from './SingleChoiceCards';
import {ActionDialog} from './ActionDialog';
import {economyCommandReason,type PersonalEconomyCommand} from '../core/personalEconomyAdapter';
import {nextMonthStart} from '../core/calendar';
import {estateYield} from '../core/construction';
import {siteById} from '../data/scenario';
import {EnterprisePanel} from './CareerSystems';
import {useState} from 'react';
import type {GameCommand, World} from '../core/types';
import {economyPresentation} from '../core/personalEconomyAdapter';
import {livingStandards, type LivingStandard} from '../core/personalEconomyRules';
import {ArtIcon,Resource} from './ArtIcon';
import {DetailTabs} from './DetailTabs';
import {HoverHint} from './HoverHint';
import {EconomyAction} from './EconomyAction';
import './personalEconomy.css';
type Props={world:World;pending:boolean;send:(c:GameCommand)=>void};
export function PersonalEconomyPanel({world,pending,send,onEstate}:Props&{onEstate?:()=>void}){
 const [livingOpen,setLivingOpen]=useState(false);
 const [section,setSection]=useState<'overview'|'household'|'business'|'accounts'>('overview'),[transfer,setTransfer]=useState<{kind:'donate'|'embezzle';account:string}|null>(null);
 if(world.mode!=='sandbox'||!world.characterId||!world.realm)return null;
 const p=economyPresentation(world),b=p.view.budget;
 const props={world,pending,send},estate=estateYield(world),living=livingStandards[b?.standard??'modest'].monthly,staff=Object.values(world.retinue?.members??{}).filter(m=>m.host===world.characterId).reduce((n,m)=>n+(m.post?4:2),0),net=estate.coins-living-staff;
 const obligations=world.obligations?.items.filter(d=>d.remaining&&(d.from==='person:'+world.characterId||d.to==='person:'+world.characterId))??[];
 return <section className="personal-economy" aria-label="个人经济"><header className="detail-landscape" style={terrainSceneStyle(personTerrainSite(world,world.characterId))}><Resource name="coins" value={world.people[0].coins} label="个人现钱" caption/></header>
 <div className="private-budget" aria-label="每月 1 日基础收支预测">
  <HoverHint label="庄园收入" content="家产每月 1 日收入 4 钱，作坊每级另收入 6 钱；自动存入个人现钱，任官或在途均可领取。"><span><ArtIcon name="estate" size={26}/><small>庄园 / 月</small><b>+{estate.coins}</b></span></HoverHint>
  <HoverHint label="固定支出" content={`持家 ${living} 钱，幕府俸钱 ${staff} 钱；不含旧欠、研习、行动支出。`}><span><ArtIcon name="coins" size={26}/><small>常支 / 月</small><b>−{living+staff}</b></span></HoverHint>
  <HoverHint label="基础结余" content="庄园减去持家和幕俸的预测；官俸须公库有款才实付，事业合同与其他行动另计。"><span><ArtIcon name="frugal" size={26}/><small>基础结余</small><b>{net>=0?'+':''}{net}</b></span></HoverHint>
 </div>
 <DetailTabs label="经济章节" value={section} onChange={setSection} items={[{id:'overview',label:'概览',icon:'coins'},{id:'household',label:'持家',icon:'estate'},{id:'business',label:'事业',icon:'city'},{id:'accounts',label:'公库',icon:'coins'}]}/>
 <div key={section} className="economy-page">
 {section==='overview'&&<>
 <article className="private-estate detail-landscape" style={terrainSceneStyle(world.holdings.estate.location)}><ArtIcon name="estate" size={64}/><div><h4>{siteById[world.holdings.estate.location]?.name} · 家族庄园</h4><small>下期余 {nextMonthStart(world.day,world.scriptId)-world.day} 日 · 行粮 +{estate.food} 日份</small><small>作坊 {world.holdings.estate.levels.workshop} 级 · 每级增收 6 钱／月</small></div>{onEstate&&<button onClick={onEstate}><ArtIcon name="estate" size={22}/>营建</button>}</article>
 {world.chronicle.filter(e=>e.person==='player'&&e.text.startsWith('家产收入结算')).slice(-1).map(e=><p className="private-receipt" key={e.day}>第 {e.day} 日 · {e.text}</p>)}
 <small>官俸按实际任职与公库余款发放；事业须承接并完成合同，收入归个人。</small>
 </>}
 {section==='household'&&<><article className="living-summary"><ArtIcon name="estate" size={36}/><div><h4>{livingStandards[b?.standard??'modest'].name}</h4><p>每月 {living} 钱 · 缓解压力 {livingStandards[b?.standard??'modest'].relief}</p></div><button onClick={()=>setLivingOpen(true)}>调整持家</button></article>{b&&b.lastBill>0&&<small>最近一期：应付 {b.lastBill} ／ 实付 {b.lastPaid} 钱</small>}<article><h4><ArtIcon name="diligent" size={24}/>延师研习</h4><p>每三期管理 +1，最多 +3；当前 {b?.courses??0}/9 期。</p><EconomyAction {...props} label="研习 · 30 钱／30 日" icon="diligent" consequence="先付私财 30 钱，驻留学习 30 日完成一期；每三期管理 +1，最多 +3。公务或出行顺延，久延未成则费用不退。" command={{type:'economy',action:'programme',kind:'study'}}/>{p.view.programmes.filter(a=>a.status==='active').map(a=><small key={a.id}>{a.kind==='study'?'研习':'宴请'}余 {Math.max(0,a.due-world.day)} 日；公务、出行期间顺延</small>)}</article><ol className="economy-records">{p.view.entries.slice(-12).reverse().map(e=><li key={e.id}><small>第 {e.day} 日</small> {e.reason} <b>{e.delta>0?'+':''}{e.delta||''}{e.delta?' 钱':''}</b></li>)}</ol></>}
 {section==='business'&&<EnterprisePanel {...props}/>}
 {section==='accounts'&&<>{obligations.length>0&&<section className="economy-section"><h4><ArtIcon name="coins" size={24}/>债权与负担</h4>{obligations.map(d=><p key={d.id}>{d.to==='person:'+world.characterId?'待收':'待付'} {d.remaining} 钱 · {d.reason} · 下期余 {Math.max(0,d.next-world.day)} 日</p>)}</section>}<article><h4><ArtIcon name="generous" size={24}/>捐输</h4><button onClick={()=>setTransfer({kind:'donate',account:p.donations[0]?.id??''})}><ArtIcon name="generous" size={24}/>选择公库与钱数</button><p>私财等额转入所选公库，不增加功绩。</p></article>{p.managed.map(a=><article key={a.id}><h4>{a.name}</h4><Resource name="coins" value={a.balance} label="可用公款"/><button className="danger" onClick={()=>setTransfer({kind:'embezzle',account:a.id})}><ArtIcon name="wary" size={24}/>侵吞公款…</button></article>)}{p.view.ownMisconduct.length>0&&<article><h4>未清责任</h4>{p.view.ownMisconduct.map(m=><p key={m.id}>第 {m.day} 日 · 侵吞 {m.amount} ／退赔 {m.recovered} 钱</p>)}</article>}</>}

 </div>{livingOpen&&<LivingStandardDialog {...props} onClose={()=>setLivingOpen(false)}/>} {transfer&&<EconomyTransferDialog key={transfer.kind+transfer.account} world={world} pending={pending} send={send} kind={transfer.kind} initialAccount={transfer.account} onClose={()=>setTransfer(null)}/>}</section>;
}
export function PrivateBanquet({target,...props}:Props&{target:string}){return props.world.economy?<EconomyAction {...props} label="私人宴请 · 40 钱／3 日" icon="gregarious" consequence="先付私财 40 钱；与对方同城相聚三日后，好感 +6（慷慨者 +10），本人压力 −5（节俭者 +5）。异地或公务顺延，久延未成费用不退。" command={{type:'economy',action:'programme',kind:'banquet',target}}/>:null;}

function EconomyTransferDialog({world,pending,send,kind,initialAccount,onClose}:Props&{kind:'donate'|'embezzle';initialAccount:string;onClose:()=>void}){
 const [account,setAccount]=useState(initialAccount),[amount,setAmount]=useState(20);
 const p=economyPresentation(world),accounts=kind==='donate'?p.donations:p.managed,selected=accounts.find(a=>a.id===account);
 const command:PersonalEconomyCommand={type:'economy',action:kind,account,amount};
 const reason=!selected?'该公库已不可操作，请重新选择。':economyCommandReason(world,command);
 const donation=kind==='donate',title=donation?'捐输公库':'侵吞公款';
 return <ActionDialog scene="landscape" title={title} onClose={onClose} actions={<button className={donation?'primary':'danger'} disabled={pending||!!reason} onClick={()=>{if(pending||!selected||economyCommandReason(world,command))return;send(command);onClose();}}>确认{donation?'捐输':'侵吞'} · {Number.isFinite(amount)?amount:0} 钱</button>}>
  <p>{donation?'从个人现钱拨入所选公库，不能撤回。不增加功绩或官职，赈助的秩序与性格效果每九十日最多一次。':'公共预算减少、私财等额增加。可能受到监察、追缴和处分，离任不免除责任。'}</p>
  <div className="economy-parameters"><label>公库<select value={account} onChange={e=>setAccount(e.target.value)}>{!selected&&<option value={account}>请选择可用公库</option>}{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label>钱数<input type="number" min={10} max={200} step={5} value={Number.isFinite(amount)?amount:''} onChange={e=>setAmount(e.target.valueAsNumber)}/></label></div>
  <p>{donation?'来源：个人现钱 '+world.people[0].coins+' 钱':'来源：'+(selected?.name??'未选择公库')} → {donation?selected?.name??'未选择公库':'个人现钱'}</p>
  {reason&&<p role="status">{reason}</p>}
 </ActionDialog>;
}

function LivingStandardDialog({world,pending,send,onClose}:Props&{onClose:()=>void}){
 const current=economyPresentation(world).view.budget?.standard??'modest';
 const [standard,setStandard]=useState<LivingStandard>(current);
 const command:PersonalEconomyCommand={type:'economy',action:'living',standard};
 const reason=economyCommandReason(world,command),chosen=livingStandards[standard];
 return <ActionDialog scene="landscape" title="调整持家" onClose={onClose} actions={<button className="primary" disabled={pending||!!reason||standard===current} onClick={()=>{if(pending||standard===current||economyCommandReason(world,command))return;send(command);onClose();}}>确认 · {chosen.name}</button>}>
  <p>支出来源：个人现钱 {world.people[0].coins} 钱。当前采用{livingStandards[current].name}；确认后按新标准结算后续账期。</p>
  <SingleChoiceCards label="持家方案" value={standard} onChange={setStandard} disabled={pending} options={(Object.keys(livingStandards) as LivingStandard[]).map(id=>({id,title:livingStandards[id].name,description:`每月 ${livingStandards[id].monthly} 钱 · 缓解压力 ${livingStandards[id].relief}`,detail:'欠费时降为朴素度日并增加压力。'}))}/>
  <p role="status">{reason||`已选${chosen.name}：每月从私财支付 ${chosen.monthly} 钱。`}</p>
 </ActionDialog>;
}
