import {canCommission,serviceApprover} from '../core/serviceMandates';
import {ServiceChoiceOverview} from './ServiceChoiceOverview';
import {HoverHint} from './HoverHint';
import {ActionDialog} from './ActionDialog';
import {serviceNeed} from '../core/serviceNeeds';
import {RealmBadge} from './RealmBadge';
import {PersonChoice,PositionSeat} from './PersonSelection';
import {attributes} from '../core/social';
import {useEffect,useState} from 'react';
import {assignmentTemplates,assignmentTradeoffs,assignmentPhases,servicePriorities,priorityIcons,type AssignmentKind,type ServicePriority} from '../data/assignments';
import {serviceChief,serviceCandidates,serviceRealm,serviceReason,assignmentOptions,careerStanding,recommendedPriority,type ServiceCommand} from '../core/assignments';
import {governmentOf,politicalName,regimeName} from '../core/government';
import {realms,capital,type RealmId} from '../core/realm';
import {siteById} from '../data/scenario';
import {AssignmentPanel,type ServiceProps} from './AssignmentPanel';
import {ArtIcon} from './ArtIcon';
import './service.css';
export function CouncilPanel({world:w,pending,send,onPerson}:ServiceProps){
 const [choice,setChoice]=useState<ServicePriority|null>(null);
 const r=serviceRealm(w.characterId!,w)!,c=w.service?.councils[r],chief=serviceChief(w,r);
 useEffect(()=>{if(c?.proposal)setChoice(null);},[c?.proposal]);
 if(!c)return null;
 const selected=c.proposal?.priority??choice??c.priority,isChief=chief===w.characterId,command={type:'service',action:'priority',priority:selected} as const,reason=serviceReason(w,command),tasks=w.service!.tasks.filter(t=>t.realm===r&&t.phase!=='closed');
 const action=(command:ServiceCommand,label:string,detail:string)=>{const blocked=serviceReason(w,command);return <HoverHint label={label} content={blocked||detail}><button disabled={pending||!!blocked} onClick={()=>send(command)}>{label}</button></HoverHint>;};
 return <section className="service-council"><small>本季评议 · 余 {90-w.day%90} 日 · 已办结 {c.completed} / 2 项</small><PositionSeat compact world={w} holder={chief} title="执政" status={`${c.decided?'本季重心':'暂行重心'}：${servicePriorities[c.priority]}`} onPerson={onPerson}/>
 <div className="service-priority-grid">{(Object.keys(servicePriorities) as ServicePriority[]).map(priority=><button key={priority} disabled={!!c.proposal} onClick={()=>setChoice(priority)}><ArtIcon name={priorityIcons[priority]} size={28}/><span>{servicePriorities[priority]}<small>{Object.values(assignmentTemplates).filter(d=>d.category===priority).map(d=>d.name).join('、')}</small>{priority===recommendedPriority(w,r)&&<small>当前局势建议</small>}</span></button>)}</div>
 {choice&&!c.proposal&&<ActionDialog title={(isChief?'议定':'上书')+' · '+servicePriorities[selected]} onClose={()=>setChoice(null)} actions={<button className="primary" disabled={pending||!!reason} onClick={()=>{if(pending||serviceReason(w,command))return;send(command);setChoice(null);}}>{isChief?'确认议定':'确认上书'}</button>}><section className="service-choice-overview"><h4>{servicePriorities[selected]}</h4><p><b>所得</b>　议定后，此类差事每日工作量 +1，基础主办考绩 24；质量和贡献另计。</p><p><b>取舍</b>　其他类每日工作量 −1，基础主办考绩 20。不是额外增发钱粮。</p><p><b>条件</b>　执政者每季议定一次；其他人物每季可上书一次，获准后才生效。上书获准可调整原议，不改变已结案成果。</p>{tasks.length>0&&<p>当前在办：{tasks.map(t=>`${siteById[t.site].name}·${assignmentTemplates[t.kind].name} ${assignmentTemplates[t.kind].category===selected?'+1':'−1'}/日`).join('；')}</p>}<small>以上为议定后的效率修正，已包含在办理日预估中。季末办结至少两项：支持 +3；不足：支持 −2。</small></section>{reason&&<p className="service-warning" role="status">{reason}</p>}</ActionDialog>}
 {c.lastResult&&<p>{c.lastResult}</p>}{c.reply&&<p>{c.reply.text}</p>}
 {c.proposal?<><p>{politicalName(c.proposal.actor)}请以「{servicePriorities[c.proposal.priority]}」为重心。采纳将覆盖当前重心；维持原议则保留当前方向。</p>{isChief?<div className="realm-actions">{action({type:'service',action:'council-accept'},'采纳上书','采用上书所请重心，重新分配办理效率与考绩。')}{action({type:'service',action:'council-decline'},'维持原议','保留当前重心并结束此次议事。')}</div>:<p>等待执政者裁决，请继续时间。</p>}</>:null}
 </section>;
}
export function ServiceProfile({world:w,person,onOpen}:Pick<ServiceProps,'world'>&{person:string;onOpen:()=>void}){if(!w.service?.enabled)return <button onClick={onOpen}>差事与生涯 →</button>;const tasks=w.service.tasks.filter(t=>t.phase!=='closed'&&(t.officer===person||t.helper===person||t.invitation?.person===person)),r=serviceRealm(person);if(!r)return null;return <section className="service-profile"><h3>任职履历</h3><p>官僚功绩 {governmentOf(w,r)?.merit[person]??0} · 可用于请任与军务授权</p>{(Object.keys(servicePriorities) as ServicePriority[]).map(category=>{const p=careerStanding(w,person,category);return <p key={category}>{p.name} · 完成 {p.count} 项 · 对应差事效率 +{p.bonus}</p>;})}{tasks.map(t=><p key={t.id}>{siteById[t.site].name}{assignmentTemplates[t.kind].name} · {assignmentPhases[t.phase]}{t.invitation?.person===person?' · 邀请待答':''}</p>)}<button onClick={onOpen}>查看差事簿 →</button></section>;}
export function ServicePanel(props:ServiceProps&{initialTaskId?:number;initialTab?:'active'|'council'}){
 const {world:w,pending,send,onPerson}=props,r=serviceRealm(w.characterId!,w)!,s=w.service;
 const [offerOpen,setOfferOpen]=useState(false),[selected,setSelected]=useState<number|null>(props.initialTaskId??null),[kind,setKind]=useState<AssignmentKind>('relief'),[city,setCity]=useState(''),[officer,setOfficer]=useState(''),[target,setTarget]=useState<RealmId>(r==='west'?'east':'west');
 if(!s?.enabled)return <section className="service-welcome"><ArtIcon name="influence" size={56}/><h3>赴任议事</h3><p>从一城一事做起，与同僚共理国事。执政者议定目标、任命与考课；官员和宗室请命办理，积累功绩与声望。</p><button className="primary" disabled={pending} onClick={()=>send({type:'service',action:'begin'})}>赴任议事</button></section>;
 const chief=serviceChief(w,r)===w.characterId,candidates=serviceCandidates(w,r),cities=Object.keys(w.realm!.cities).filter(id=>w.realm!.cities[id].owner===r&&w.realm!.cities[id].controller===r),site=cities.includes(city)?city:cities.includes(capital(r))?capital(r):cities[0]??'',commission=canCommission(w,w.characterId!,r,site,kind),candidate=commission?(candidates.some(c=>c.id===officer)?officer:candidates[0]?.id??''):w.characterId!,command={type:'service',action:'open',kind,site,officer:candidate,...(kind==='envoy'?{target}:{})} as const,reason=serviceReason(w,command),task=selected?s.tasks.find(t=>t.id===selected):undefined;
 const relevant=s.tasks.filter(t=>t.realm===r&&(chief||t.officer===w.characterId||t.helper===w.characterId||t.invitation?.person===w.characterId||serviceApprover(w,t)===w.characterId)),active=relevant.filter(t=>t.phase!=='closed'),archive=relevant.filter(t=>t.phase==='closed').slice().reverse();
 const record=(t:typeof relevant[number])=><button className="assignment-card" key={t.id} onClick={()=>setSelected(t.id)}><ArtIcon name={assignmentTemplates[t.kind].icon} size={42}/><span><strong>{siteById[t.site].name} · {assignmentTemplates[t.kind].name}</strong><small>{politicalName(t.officer)} · {assignmentPhases[t.phase]}{t.phase!=='closed'?` · 限期余 ${Math.max(0,t.deadline-w.day)} 日`:''}</small></span><span>→</span></button>;
 return <div className="service-panel service-board">
  {task?<><button className="service-back" onClick={()=>setSelected(null)}>← 返回差事</button><AssignmentPanel {...props} task={task}/></>:<>
   {props.initialTab==='council'&&<CouncilPanel {...props}/>}
   <section className="service-board-section"><header className="service-board-heading"><h3>在办差事 · {active.length}</h3><button onClick={()=>setOfferOpen(true)}>{commission?'委任新差事':'请领新差事'} →</button></header>{active.length>0&&<div className="service-active-list">{active.map(record)}</div>}</section>
   {props.initialTab!=='council'&&<CouncilPanel {...props}/>}
   {archive.length>0&&<section className="service-board-section"><h3>结案文书 · {archive.length}</h3><div className="service-archive-list">{archive.map(record)}</div></section>}
   {offerOpen&&<ActionDialog title={commission?'委任差事':'请领差事'} onClose={()=>setOfferOpen(false)} actions={<button className="primary" disabled={pending||!!reason} onClick={()=>{if(pending||serviceReason(w,command))return;send(command);setOfferOpen(false);}}>{commission?'确认委任':'确认请命'}</button>}>
    <section className="service-recommendations"><h4><ArtIcon name="diligent" size={24}/>本季推荐</h4><div className="service-offers">{assignmentOptions(w,r).slice(0,6).map((o,i)=><button key={i} onClick={()=>{setKind(o.kind);setCity(o.site);if(o.target)setTarget(o.target);}}>{siteById[o.site].name} · {assignmentTemplates[o.kind].name}<small>{serviceNeed(w,o.kind,o.site).tier} · {serviceNeed(w,o.kind,o.site).reason}</small></button>)}</div></section>
    <div className="service-offers">{(Object.keys(assignmentTemplates) as AssignmentKind[]).map(id=>{const d=assignmentTemplates[id],blocked=serviceReason(w,{...command,kind:id,...(id==='envoy'?{target}:{target:undefined})});return <HoverHint key={id} label={d.name} content={<><p>{d.effect}</p><p>取舍：{assignmentTradeoffs[id].cost}</p><p>{blocked||assignmentTradeoffs[id].condition}</p></>}><button aria-pressed={kind===id} data-unavailable={!!blocked} onClick={()=>setKind(id)}><ArtIcon name={d.icon}/><span>{d.name}<small>{d.coins} 钱 · {d.grain} 粮（常额）</small></span></button></HoverHint>;})}</div>
    {site&&<p>{serviceNeed(w,kind,site).tier} · {serviceNeed(w,kind,site).reason}；暂缓：{serviceNeed(w,kind,site).neglect}</p>}<label>办理城邑 <select value={site} onChange={e=>setCity(e.target.value)}>{cities.map(id=><option key={id} value={id}>{siteById[id].name}</option>)}</select></label>{commission&&<PersonChoice world={w} title="承办人" value={candidate} onChange={setOfficer} pending={pending} onPerson={onPerson} options={candidates.map(c=>({id:c.id,score:attributes(w,c.id)[assignmentTemplates[kind].skill],metric:'职务能力',reason:serviceReason(w,{...command,officer:c.id})}))}/>}{kind==='envoy'&&<div className="realm-choice-row" role="group" aria-label="出使政权">{realms.filter(x=>x!==r).map(x=><span key={x} data-selected={target===x}><RealmBadge realm={x} world={w}/><button aria-label={'选择出使'+regimeName(w,x)} aria-pressed={target===x} onClick={()=>setTarget(x)}>{target===x?'已选':'选择'}</button></span>)}</div>}
    <ServiceChoiceOverview world={w} kind={kind} site={site} officer={candidate} realm={r} target={target}/>{reason&&<p className="service-warning" role="status">{reason}</p>}
   </ActionDialog>}
  </>}
 </div>;
}
