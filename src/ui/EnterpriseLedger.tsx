import {afterCommand} from './actionFeedback';
import {useState} from 'react';
import {ActionDialog} from './ActionDialog';
import {ArtIcon} from './ArtIcon';
import {CommercePanel} from './CommercePanel';
import {ConfirmAction} from './ConfirmAction';
import {HoverHint} from './HoverHint';
import {SingleChoiceCards} from './SingleChoiceCards';
import {enterpriseReason,type Enterprise,type EnterpriseCommand} from '../core/enterprises';
import {siteById} from '../data/scenario';
import type {GameCommand,World} from '../core/types';
import './enterpriseLedger.css';

type Props={world:World;pending:boolean;send:(command:GameCommand)=>Promise<boolean>};
type Method='careful'|'swift';

function EnterpriseAction({world,pending,send,command,label,detail,danger=false}:{world:World;pending:boolean;send:Props['send'];command:EnterpriseCommand;label:string;detail:string;danger?:boolean}){
 const [confirm,setConfirm]=useState(false),reason=enterpriseReason(world,command);
 return <HoverHint label={label} content={<>{detail}{reason&&<p>{reason}</p>}</>}><span className="enterprise-action"><button disabled={pending||!!reason} onClick={()=>setConfirm(true)}>{label}</button>{reason&&<small className="enterprise-action-reason">{reason}</small>}{confirm&&<ConfirmAction title={label} detail={detail} confirmLabel={label} danger={danger} pending={pending||!!reason} onCancel={()=>setConfirm(false)} onConfirm={()=>{if(pending||enterpriseReason(world,command))return;void afterCommand(send(command),()=>{setConfirm(false);});}}/>}</span></HoverHint>;
}

function EnterpriseHolding({world:w,pending,send,enterprise:e}:Props&{enterprise:Enterprise}){
 const [orderOpen,setOrderOpen]=useState(false),[method,setMethod]=useState<Method>('careful');
 const kind=e.kind==='workshop'?'作坊':'农务',command:EnterpriseCommand={type:'enterprise',action:'order',id:e.id,method},reason=enterpriseReason(w,command),margin=e.earned-e.spent;
 return <article className="enterprise-holding">
  <header><span className="enterprise-emblem"><ArtIcon name={e.kind==='workshop'?'city':'grain'} size={30}/></span><div><small>{siteById[e.site].name} · 私营</small><h4>{kind}</h4></div><span className="enterprise-state">{e.order?'履约中':'可安排经营'}</span></header>
  <div className="enterprise-balances"><span><small>事业资本</small><strong>{e.capital} 钱</strong></span><span><small>历来验收收入</small><strong>{e.earned} 钱</strong></span><span><small>历来投入成本</small><strong>{e.spent} 钱</strong></span><span><small>合同收支差</small><strong>{margin>=0?'+':''}{margin} 钱</strong></span></div>
  <p className="enterprise-capital-note">事业资本与个人现钱分开。承包验收、商旅交货的收入先进入事业资本；支取后才成为个人现钱。</p>
  {e.order?<section className="enterprise-work"><div><strong>地方合同办理中</strong><small>限期余 {Math.max(0,e.order.deadline-w.day)} 日</small></div><progress value={e.order.progress} max={e.order.required}/><p>已办理 {e.order.progress} / {e.order.required} 个有效日 · 验收可收 {e.order.method==='careful'?100:65} 钱至事业资本</p><small>公库预留 {e.order.escrow} 钱待验；撤销时未支付部分退回公库，已投入的事业成本不退。</small><EnterpriseAction world={w} pending={pending} send={send} command={{type:'enterprise',action:'cancel',id:e.id}} label="撤销合同" detail="未验收价款退回公库；已投入的事业成本不退。" danger/></section>:<section className="enterprise-work"><div><strong>承接地方工程</strong><small>亲赴所在地，选定办理方式</small></div><p>{e.kind==='workshop'?'作坊承接地方修缮，验收后提升当地繁荣。':'农务承接水利劳务，验收后提升当地水利。'}合同由当地公库支付，完成后收入先归事业资本。</p><HoverHint label="承接地方工程" content={enterpriseReason(w,{type:'enterprise',action:'order',id:e.id,method:'careful'})||'可查看精工与简办两种方案。'}><button className="enterprise-order-button" onClick={()=>{setMethod('careful');setOrderOpen(true);}}>查看合同方案 ›</button></HoverHint></section>}
  <section className="enterprise-funds"><h5>调拨事业资本</h5><div><EnterpriseAction world={w} pending={pending} send={send} command={{type:'enterprise',action:'invest',id:e.id}} label="增资 100 钱" detail="个人现钱减少 100 钱，事业资本等额增加。"/><EnterpriseAction world={w} pending={pending} send={send} command={{type:'enterprise',action:'withdraw',id:e.id}} label="支取 100 钱" detail="事业资本减少 100 钱，个人现钱等额增加；可能影响下一单承接。"/><EnterpriseAction world={w} pending={pending} send={send} command={{type:'enterprise',action:'close',id:e.id}} label="结业／取回资本" detail="将可划转的剩余事业资本转回私财；全部取回后结业。须先结清合同、货物与在途商约。" danger/></div></section>
  <CommercePanel world={w} enterprise={e.id} pending={pending} send={send}/>
  {orderOpen&&<ActionDialog title={siteById[e.site].name+' · '+kind+'承包'} onClose={()=>setOrderOpen(false)} actions={<button className="primary" disabled={pending||!!reason} onClick={()=>{if(pending||enterpriseReason(w,command))return;void afterCommand(send(command),()=>{setOrderOpen(false);});}}>确认承接 · {method==='careful'?'精工':'简办'}</button>}><div className="enterprise-order-dialog"><p>从事业资本支付成本，亲自在 {siteById[e.site].name} 办理；验收收入回到事业资本。当地公库预留 100 钱，未支付部分退回公库。</p><SingleChoiceCards label="办理方式 · 单选" value={method} onChange={setMethod} options={[{id:'careful',title:'精工承包',description:'30 个有效办理日；修缮繁荣 +8，或水利 +1。',detail:<>事业成本 60 钱 · 验收收入 100 钱 · 差额 +40 钱</>,reason:enterpriseReason(w,{type:'enterprise',action:'order',id:e.id,method:'careful'})},{id:'swift',title:'简办承包',description:'20 个有效办理日；修缮繁荣 +3，或水利 +1。',detail:<>事业成本 30 钱 · 验收收入 65 钱 · 差额 +35 钱</>,reason:enterpriseReason(w,{type:'enterprise',action:'order',id:e.id,method:'swift'})}]}/>{reason&&<p className="service-warning" role="status">{reason}</p>}<small>办理日不包含行旅与其他事务占用；每地再次发包至少间隔 90 日。不得承接自己审批或监察的合同。</small></div></ActionDialog>}
 </article>;
}

export function EnterpriseLedger({world:w,pending,send}:Props){
 const entries=w.enterprises?.items.filter(e=>e.owner===w.characterId&&!e.closed)??[],place=w.people[0].location;
 return <section className="enterprise-ledger"><header><span className="enterprise-emblem"><ArtIcon name="coins" size={29}/></span><div><h3>经营私人事业</h3><p>在本国安定城邑开业，接地方合同或经营商旅。收入留在事业资本，支取后转成个人现钱。</p></div></header>
  <div className="enterprise-opening"><div><small>当前所在地</small><strong>{siteById[place]?.name??place}</strong><span>开业时，从个人现钱划入 120 钱作为事业资本。</span></div><div className="enterprise-opening-actions"><EnterpriseAction world={w} pending={pending} send={send} command={{type:'enterprise',action:'open',kind:'workshop'}} label="置办作坊 · 120 钱" detail="在当前城邑开办作坊，个人现钱 120 钱转入事业资本；可承接地方修缮及制作、运售农具。"/><EnterpriseAction world={w} pending={pending} send={send} command={{type:'enterprise',action:'open',kind:'agriculture'}} label="兴办农务 · 120 钱" detail="在当前城邑开办农务，个人现钱 120 钱转入事业资本；可承接水利劳务及购粮、运售。"/></div></div>
  {entries.length>0?<div className="enterprise-holdings">{entries.map(e=><EnterpriseHolding key={e.id} world={w} pending={pending} send={send} enterprise={e}/>)}</div>:<p className="enterprise-empty">尚无事业。选择作坊或农务开业后，再安排合同、资本与商旅。</p>}
 </section>;
}
