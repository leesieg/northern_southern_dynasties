import {HistoricalArmyOrder} from './HistoricalArmyOrder';
import {militaryArmyView} from '../core/militaryView';
import type {RealmId} from '../core/realm';
import {warArmySide} from '../core/civilWars';
import {useState} from 'react';
import type {World,GameCommand} from '../core/types';
import type {HistoricalEventInstance} from '../core/historicalEventState';
import {historicalPact,historicalArmy,historicalTitle,historicalReason,visibleHistoricalMilestones} from '../core/historicalEvents';
import {pactQuote,pactReason,currentPactBreaches,receptionNames,type ReceptionTerms,type PactCommand} from '../core/allegiancePacts';
import {governingExecutives} from '../core/government';
import {getPerson} from '../core/personRegistry';
import {allegianceRealm} from '../core/officeEligibility';
import {worldRealms} from '../core/polityRuntime';
import {regimeName} from '../core/government';
import {siteById} from '../data/scenario';
import {dateLabel} from '../core/world';
import {CharacterPortrait} from './CharacterPortrait';
import {SingleChoiceCards} from './SingleChoiceCards';
import {DetailTabs} from './DetailTabs';
import {DialogArt} from './DialogArt';
import {ActionDialog} from './ActionDialog';
import {LifeSummary} from './LifeDetails';
import './historicalEvent.css';
export interface HistoricalNavigation {onPerson:(id:string)=>void;onSite:(id:string)=>void;onWar:(id:number)=>void;onCourt:()=>void;onArmy:()=>void}
type Props={error?:string;world:World;event:HistoricalEventInstance;pending:boolean;send:(c:GameCommand)=>Promise<boolean>;navigation:HistoricalNavigation};
const termNotes:Record<ReceptionTerms,string>={retain:'原将继续统领追随部曲；接纳方承担中央公饷与保护责任。',reform:'先接收追随部曲，九十日后按关系、欠饷和安全条件检查改编；条件未满足则延期。',personal:'只改变个人效忠，原部队留在原国；不支付武装保护预算。'};
export function HistoricalContent({world:w,event:e,pending,send,navigation:n,error}:Props){
 const rawPact=historicalPact(w,e),p=rawPact&&(rawPact.person===w.characterId||governingExecutives(w,rawPact.to).includes(w.characterId!))?rawPact:undefined,d=e.decision,mine=d&&!d.handled&&d.actor===w.characterId;
 const [orderTarget,setOrderTarget]=useState<string|null>(null);
 const [tab,setTab]=useState<'situation'|'history'|'people'>('situation');
 const [terms,setTerms]=useState<ReceptionTerms>(p?.offer?.terms??p?.terms??'retain');
 const [host,setHost]=useState<RealmId>('liang');
 const a=historicalArmy(w,e.actors.protagonist),milestones=visibleHistoricalMilestones(w,e),war=w.realm?.wars?.find(v=>v.id===e.warId);
 const pactActor=!!p&&(p.person===w.characterId||governingExecutives(w,p.to).includes(w.characterId!));
 const reception=p?.status==='pending',offerMine=p?.offer?.respondent===w.characterId;
 const quote=p?pactQuote(w,{...p,terms}):null;
 const command:PactCommand|undefined=pactActor&&p?(p.offer?offerMine?{type:'pact',action:'respondOffer',id:p.id,revision:p.offer.revision,accept:true}:undefined:terms!==p.terms?{type:'pact',action:'propose',id:p.id,terms}:reception&&p.person!==w.characterId?{type:'pact',action:'answer',id:p.id,accept:true}:undefined):undefined;
 const reason=command?pactReason(w,command):'';
 const reject:PactCommand|undefined=pactActor&&p?(p.offer&&offerMine?{type:'pact',action:'respondOffer',id:p.id,revision:p.offer.revision,accept:false}:reception?p.person===w.characterId?{type:'pact',action:'withdraw',id:p.id}:{type:'pact',action:'answer',id:p.id,accept:false}:undefined):undefined;
 const deadline=p?.offer?.expiresAt??(reception?p?.due:e.handlingDue);
 const decisionBase=d?{type:'historicalEvent' as const,instanceId:e.id,decisionId:d.id,revision:d.revision}:null;
 const council=mine&&d.kind==='council';
 const [choice,setChoice]=useState<string|null>(null);
 const decisions=d&&decisionBase?(d.kind==='council'?[
 {id:'assure',title:'确认原有待遇',description:'个人影响力 −10；确认现有待遇，不保证永久掌军。',art:'rites' as const,command:{...decisionBase,optionId:'assure' as const}},
 {id:'wait',title:'暂缓答复',description:'保持现状，待交接处境明确；侯景仍可自行寻求出路。',art:'care' as const,command:{...decisionBase,optionId:'wait' as const}},
 ]:d.kind==='north'?[
 {id:'seek',title:'请求保留部曲归附',description:'个人影响力 −20；向所选朝廷送出提案，收到接纳前不转移军队。',art:'dispatch' as const,command:{...decisionBase,optionId:'seek' as const,realm:host,terms:'retain' as const}},
 {id:'personal',title:'以个人身份归附',description:'个人影响力 −20；不携带部曲，待对方接纳后改变效忠。',art:'migration' as const,command:{...decisionBase,optionId:'seek' as const,realm:host,terms:'personal' as const}},
 {id:'wait',title:'维持当前安排',description:'不支付费用，不改变统属；继续应对真实军政变化。',art:'rites' as const,command:{...decisionBase,optionId:'wait' as const}},
 ]:[{id:'rise',title:'举兵讨奸',description:'要求更换实际执政者，保留现任君位。须有真实基地、兵力与私财，费用按起兵规则执行。',art:'dispatch' as const,command:{...decisionBase,optionId:'rise' as const}},{id:'wait',title:'继续交涉',description:'维持现状，三十日后重新审视尚未解决的争议；不会替你起兵。',art:'rites' as const,command:{...decisionBase,optionId:'wait' as const}}]).map(o=>({...o,reason:historicalReason(w,o.command)})):[],selected=decisions.find(v=>v.id===choice);

 return <><div className="historical-layout">
 <aside className="historical-identity"><button className="historical-portrait" onClick={()=>n.onPerson(council?e.actors.protector:e.actors.protagonist)} aria-label="查看人物"><CharacterPortrait world={w} characterId={council?e.actors.protector:e.actors.protagonist}/></button><h3>{getPerson(w,council?e.actors.protector:e.actors.protagonist)?.name}</h3><LifeSummary world={w} id={council?e.actors.protector:e.actors.protagonist}/><p>{regimeName(w,allegianceRealm(w,council?e.actors.protector:e.actors.protagonist)??e.origin)}</p><button onClick={()=>n.onSite(e.site)}>{siteById[e.site]?.name??e.site} ›</button><div className="historical-seal">{e.status==='active'?'事未定':e.status==='resolved'?'已结案':'已终止'}</div>{deadline!==undefined&&<p className="historical-deadline">{Math.max(0,deadline-w.day)} 日<br/><small>{reception?'来书答复期限':p?.offer?'新条款答复期限':'下一次交涉期限'}</small></p>}</aside>
 <section className="historical-workspace"><DetailTabs label="事件文书" value={tab} onChange={setTab} items={[{id:'situation',label:'局势',icon:'world'},{id:'history',label:'经过',icon:'diligent'},{id:'people',label:'人物',icon:'person'}]}/>
 <div className="historical-scroll">
 {tab==='history'?<ol className="historical-timeline">{milestones.map(m=><li key={m.key}><time>{dateLabel(m.day,w.scriptId)}</time><p>{m.text}</p></li>)}</ol>:tab==='people'?<div className="historical-people">{[...new Set([e.actors.protagonist,e.actors.protector,...milestones.flatMap(m=>m.people)])].map(id=><button key={id} onClick={()=>n.onPerson(id)}><CharacterPortrait world={w} characterId={id} compact/><span>{getPerson(w,id)?.name}<LifeSummary world={w} id={id}/></span></button>)}</div>:<>
 <p className="historical-lead">{e.result??milestones.at(-1)?.text??'当前事实尚未形成新的交涉。'}</p>
 {mine&&decisionBase?<>
 {d.kind==='north'&&<label className="historical-host">接纳朝廷 <select value={host} onChange={v=>setHost(v.target.value as RealmId)} disabled={pending}>{worldRealms(w).filter(r=>r!==allegianceRealm(w,w.characterId!)&&!w.realm!.annexed?.[r]).map(r=><option key={r} value={r}>{regimeName(w,r)}</option>)}</select></label>}
 <SingleChoiceCards value={choice} onChange={setChoice} label={council?'议定军政交接':'决定下一步'} disabled={pending} options={decisions}/>
 {council&&<button onClick={n.onCourt}>前往朝廷安排继任与职权 ›</button>}
 </>:p&&['pending','active'].includes(p.status)?<>
 <h3>{reception?'请议定接纳之法':'归附之约'}</h3><SingleChoiceCards label={p.offer?'对方提出的新条款':'安置条款'} value={terms} onChange={setTerms} disabled={pending||!pactActor||!!p.offer} options={(Object.keys(receptionNames) as ReceptionTerms[]).filter(t=>reception||t!=='personal').map(t=>({id:t,title:receptionNames[t],description:termNotes[t],art:t==='personal'?'migration':t==='reform'?'rites':'dispatch'}))}/>
 <section className="historical-consequences"><h3>{reception?'接纳后果':'当前约定与争议'}</h3><dl><div><dt>追随兵员</dt><dd>{quote?.troops??0} 人</dd></div><div><dt>{reception?'接纳国中央支出':'现行条款'}</dt><dd>{reception?(quote?.protection??0)+' 钱':receptionNames[p.terms]}</dd></div><div><dt>原地部队</dt><dd>{quote?.remaining??0} 人</dd></div></dl><p>{reception&&terms!=='personal'?'接纳将承担保护战争；原县域归属不随军队转移。':p.integrationCompletedAt!==undefined?'已按约完成改编。':'授职、调军与安置须另行办理。'}</p>{p.status==='active'&&<p>{currentPactBreaches(w,p).join('、')||'当前没有未解决的违约事项。'}</p>}{p.offer&&<p>新条款由 {getPerson(w,p.offer.proposer)?.name} 提出；等待 {getPerson(w,p.offer.respondent)?.name} 答复。</p>}{command?.action==='propose'&&<p>本次仅提出改约，个人影响力 −10；对方确认后才生效。</p>}</section>

 </>:null}
 {war&&<section className="historical-consequences"><h3>{siteById[war.target]?.name}军情</h3><p>起兵方兵力 {w.realm!.armies.filter(v=>warArmySide(w,war,v)==='attack').every(a=>militaryArmyView(w,a).exact)?w.realm!.armies.filter(v=>warArmySide(w,war,v)==='attack').reduce((sum,v)=>sum+v.troops,0)+' 人':'未详'}</p><p>{w.realm?.sieges?.find(s=>s.war===war.id&&s.site===war.target)?'已形成围城；守军、补给与战况详见本场战事。':'尚未形成首都围城；以军队实际行程为准。'}</p><button onClick={()=>n.onWar(war.id!)}>查看战况与议和 ›</button><button onClick={()=>setOrderTarget(war.target)}>{war.civil?.supporters.includes(w.characterId!)?'进军首都':'救援首都'} ›</button>{war.civil&&<button onClick={()=>setOrderTarget(war.civil!.base)}>调军至{siteById[war.civil.base].name} ›</button>}<button onClick={n.onArmy}>军队与粮运 ›</button></section>}
 {!mine&&p?.status!=='pending'&&<div className="historical-links"><button onClick={n.onCourt}>朝廷与任命</button><button onClick={n.onArmy}>军队与供饷</button><button onClick={()=>n.onSite(e.site)}>当地治理</button></div>}
 {!p&&!mine&&!war&&<p>当前无待办裁决。可以翻阅已经发生的经过。</p>}
 {a&&militaryArmyView(w,a).exact&&<small>当前所统部队：第 {a.id} 军 · {a.troops} 人 · {siteById[a.location]?.name}{a.journey?'（在途）':''}</small>}
 </>}
 </div>{(mine||command||reject)&&<footer className="historical-decision-footer">{mine?<>{selected?.reason&&<p role="status">{selected.reason}</p>}<button className="primary" disabled={pending||!selected||!!selected.reason} onClick={()=>{if(selected&&!pending&&!selected.reason)void send(selected.command);}}>{selected?'确认'+selected.title:'请选择处置方案'}</button></>:<>{reason&&<p role="status">{reason}</p>}{reject&&<button disabled={pending||!!pactReason(w,reject)} onClick={()=>send(reject)}>{p?.offer?'拒绝新条款':p?.person===w.characterId?'撤回来书':'拒绝接纳'}</button>}{command&&<button className="primary" disabled={pending||!!reason} onClick={()=>send(command)}>{command.action==='propose'?'提出新条款':command.action==='respondOffer'?'确认新条款':'确认接纳'}</button>}</>}</footer>}{error&&<p className="pause-error" role="alert">{error}</p>}</section></div>{orderTarget&&<HistoricalArmyOrder key={orderTarget} world={w} site={orderTarget} pending={pending} send={send} error={error} onClose={()=>setOrderTarget(null)}/>}</>;
}
export function HistoricalDossier(props:Props&{onClose:()=>void;cancelLabel?:string}){return <ActionDialog title={historicalTitle(props.world,props.event)} className="historical-dialog" art={props.event.phase==='siege'?'fortress':'dispatch'} onClose={props.onClose} cancelLabel={props.cancelLabel??"返回地图"} actions={null}><HistoricalContent {...props}/></ActionDialog>;}
export function HistoricalHeading({world,event}:{world:World;event:HistoricalEventInstance}){return <header className="historical-heading"><DialogArt scene={event.phase==='siege'?'fortress':event.decision?.kind==='council'?'care':'dispatch'}/><div><span className="eyebrow">{dateLabel(world.day,world.scriptId)} · 待决文书</span><h2 id="pause-title">{historicalTitle(world,event)}</h2></div></header>;}
