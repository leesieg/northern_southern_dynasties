import {PersonChoice,PositionSeat} from './PersonSelection';
import {attributes} from '../core/social';
import {presentAt} from '../core/residence';
import {personalRoute} from '../core/diplomacy';
import {departureReason} from '../core/mobility';
import {DetailTabs} from './DetailTabs';
import {HoverHint} from './HoverHint';
import {useState} from 'react';
import {assignmentTemplates,assignmentPlans,assignmentPhases} from '../data/assignments';
import {assignmentBudget,assignmentEffort,assignmentPause,serviceCandidates,serviceChief,serviceReason,type ServiceCommand,type Assignment} from '../core/assignments';
import {politicalName,regimeName} from '../core/government';
import {siteById} from '../data/scenario';
import type {World,GameCommand} from '../core/types';
import {Resource,ArtIcon} from './ArtIcon';
export type ServiceProps={world:World;pending:boolean;send:(c:GameCommand)=>void;onPerson:(id:string)=>void};
export function AssignmentPanel({world:w,pending,send,onPerson,task:t}:ServiceProps&{task:Assignment}){
 const [chapter,setChapter]=useState<'progress'|'people'|'records'>('progress');
 const [invite,setInvite]=useState(''),[replacement,setReplacement]=useState(''),[confirm,setConfirm]=useState(false);
 const d=assignmentTemplates[t.kind],chief=serviceChief(w,t.realm),mine=t.officer===w.characterId,authority=chief===w.characterId,effort=assignmentEffort(w,t),pause=assignmentPause(w,t),candidates=serviceCandidates(w,t.realm,t.id).filter(c=>c.id!==t.officer&&c.id!==t.helper);
 const button=(command:ServiceCommand,label:string)=>{const reason=serviceReason(w,command);return <div className="realm-action"><HoverHint label={label} content={reason||label}><button disabled={pending||!!reason} onClick={()=>send(command)}>{label}</button></HoverHint></div>;};
 const action=(action:Extract<ServiceCommand,{id:number}>['action'],label:string)=>button({type:'service',action,id:t.id} as ServiceCommand,label);
 return <article className="assignment-detail"><header className="assignment-heading"><ArtIcon name={d.icon} size={48}/><div><small>{regimeName(w,t.realm)} · {assignmentPhases[t.phase]}</small><h3>{siteById[t.site].name} · {d.name}</h3></div></header><p>{d.description} {t.target&&<>出使对象：{regimeName(w,t.target)}。</>}</p><div className="assignment-officers"><PositionSeat world={w} holder={t.officer} title="承办" onPerson={onPerson}/><PositionSeat world={w} holder={chief} title="执政" onPerson={onPerson}/>{t.helper&&<PositionSeat world={w} holder={t.helper} title="协办" onPerson={onPerson}/>}</div>
 <div className="service-metrics"><Resource name="coins" value={t.funds.coins} label="专拨公款" caption/><Resource name="grain" value={t.funds.grain} label="专拨公粮" caption/><span>{t.phase==='closed'?'已结案':`限期余 ${Math.max(0,t.deadline-w.day)} 日`}</span></div>
 {t.started&&<><progress aria-label="办理进度" value={t.progress} max={t.required}/><p>工作量 {t.progress} / {t.required}{t.phase!=='closed'&&` · 约需 ${Math.ceil((t.required-t.progress)/effort.total)} 个有效办理日`}</p></>}
 {w.mobility&&(mine||t.helper===w.characterId)&&!presentAt(w,w.characterId!,t.site)&&!['report','closed','proposal','approval','petition'].includes(t.phase)&&<HoverHint label="赴任要求" content={departureReason(w)||(!personalRoute(w,t.site)?'暂无可通行道路':'前往差事所在地，抵达后办理。')}><button disabled={pending||!!w.people[0].journey||!!departureReason(w)||!personalRoute(w,t.site)} onClick={()=>send({type:'travel',destination:t.site})}><ArtIcon name="world" size={24}/>赴任 · {siteById[t.site].name}</button></HoverHint>}
 {pause&&<p className="service-warning" role="status">{pause}；限期继续计算。</p>}
 <DetailTabs label="差事详情" value={chapter} onChange={setChapter} items={[{id:'progress',label:'办理',icon:d.icon},{id:'people',label:'协办人事',icon:'person'},{id:'records',label:'文书',icon:'diligent'}]}/>
 {chapter==='progress'&&<>
 {t.result?<section><h4>{t.result.success?'考绩核定':'差事未成'}</h4><p>{t.result.reason}</p>{t.result.effects.map((effect,i)=><p key={i}>{effect}</p>)}{t.result.awards.map(a=><p key={a.person}><button onClick={()=>onPerson(a.person)}>{politicalName(a.person)}</button> · 功绩 {a.merit>=0?'+':''}{a.merit} · 执政者交往 {a.opinion>=0?'+':''}{a.opinion} · 家族威望 +{a.prestige}</p>)}</section>:<>
 {t.invitation?.person===w.characterId&&<section className="service-callout"><h4>邀你协办</h4><p>接受后将占用你的差事名额，按实际参与领取考绩。</p><div className="realm-actions">{action('accept','接受协办')}{action('decline','婉拒')}</div></section>}
 {authority&&t.phase==='petition'&&<div className="realm-actions">{action('approve','准予请命')}{action('cancel','不予准许')}</div>}
 {mine&&t.phase==='proposal'&&<div className="service-plan-grid">{(Object.keys(assignmentPlans) as (keyof typeof assignmentPlans)[]).map(plan=>{const b=assignmentBudget(t.kind,plan);return <section key={plan}><h4>{assignmentPlans[plan].name}</h4><p>{assignmentPlans[plan].description}</p><p>公款 {b.coins} · 公粮 {b.grain}</p>{button({type:'service',action:'plan',id:t.id,plan},'呈请此案')}</section>;})}</div>}
 {authority&&t.phase==='approval'&&<><p>{assignmentPlans[t.plan!].name} · 公款 {assignmentBudget(t.kind,t.plan!).coins} / 公粮 {assignmentBudget(t.kind,t.plan!).grain}</p><div className="realm-actions">{action('approve','核准并拨款')}{action('revise','退回重拟')}</div></>}
 {mine&&t.phase==='ready'&&action('start','启办差事')}
 {(mine||t.helper===w.characterId&&!!w.mobility&&!presentAt(w,t.officer,t.site)&&presentAt(w,w.characterId!,t.site)&&!['training','inspection'].includes(t.kind))&&t.phase==='incident'&&<><p>{t.history.at(-1)?.text}</p><div className="realm-actions">{!t.aidRequested&&action('request-aid','请求追加公款 20')}{action('spend','动用追加款')}{action('delay','缓办 · 工作量 +40')}{action('strain','亲自督办 · 压力 +18 / 工作量 +10')}</div></>}
 {authority&&t.phase==='aid'&&<div className="realm-actions">{action('grant','追加公款 20')}{action('deny','不予追加')}</div>}
 {authority&&t.phase==='report'&&action('close','核定考绩并结案')}
 <p className="service-hint">{t.phase==='working'?'差事正在办理，继续时间以推进。':t.phase==='report'?'呈报已送达执政者，等候考绩。':t.phase==='petition'||t.phase==='approval'||t.phase==='aid'?'待执政者答复。若由他人裁决，继续时间可接收文书。':'由承办人安排下一步；他人办理时请继续时间。'}</p>
 </>}
 </>}
 {chapter==='people'&&<>{!t.result&&<> {mine&&['proposal','approval','ready','working'].includes(t.phase)&&<section><h4><ArtIcon name="gregarious" size={24}/>邀请协办</h4>{t.helper?<p>已有协办人：{politicalName(t.helper)}</p>:t.invitation?<p>等待{politicalName(t.invitation.person)}答复。</p>:<><PersonChoice world={w} title="协办人" value={invite} onChange={setInvite} pending={pending} onPerson={onPerson} options={candidates.filter(c=>!t.invited.includes(c.id)).map(c=>({id:c.id,score:attributes(w,c.id)[d.skill],metric:"职务能力",reason:serviceReason(w,{type:'service',action:'invite',id:t.id,person:c.id})}))}/>{button({type:'service',action:'invite',id:t.id,person:invite},'邀其协办')}</>}</section>}
 {t.helper===w.characterId&&action('withdraw','退出协办 · 保留既有贡献')}
 {authority&&<section><h4><ArtIcon name="influence" size={24}/>人事与撤回</h4><p>改派保留钱粮、进度和既有贡献；原职失效时可重新委任同一人。</p><PersonChoice world={w} title="承办人" value={replacement} onChange={setReplacement} pending={pending} onPerson={onPerson} options={serviceCandidates(w,t.realm,t.id).filter(c=>c.id!==t.helper).map(c=>({id:c.id,score:attributes(w,c.id)[d.skill],metric:"职务能力",reason:serviceReason(w,{type:'service',action:'replace',id:t.id,person:c.id})}))}/>{button({type:'service',action:'replace',id:t.id,person:replacement},'重新委任')}<p>撤回按未成结算；启办后投入的钱粮不退。</p>{confirm?<div>{action('cancel','确认撤回')}<button onClick={()=>setConfirm(false)}>暂不撤回</button></div>: <button onClick={()=>setConfirm(true)}>撤回差事</button>}</section>}
</>}<section><h4><ArtIcon name="diligent" size={24}/>效率与贡献</h4>{effort.parts.map(p=><p key={p.label}>{p.label} {p.value>=0?'+':''}{p.value}</p>)}<p>每日合计 {effort.total}；暂停期间不计进度。</p>{Object.entries(t.contributors).map(([id,c])=><p key={id}>{politicalName(id)} · 主办贡献 {c.lead} / 协办贡献 {c.support}</p>)}</section></>}
 {chapter==='records'&&<section><h4><ArtIcon name="diligent" size={24}/>往来文书</h4>{t.history.slice().reverse().map((h,i)=><p key={i}>第 {h.day} 日 · {h.text}</p>)}</section>}</article>;
}
