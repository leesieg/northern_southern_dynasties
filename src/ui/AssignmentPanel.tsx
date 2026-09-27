import {ConfirmAction} from './ConfirmAction';
import {serviceApprover,serviceAuthority,servicePayer} from '../core/serviceMandates';
import {accountName} from '../core/treasury';
import {incidentChoices,servicePolitics} from '../core/serviceNeeds';
import {RealmBadge} from './RealmBadge';
import {PersonChoice,PositionSeat} from './PersonSelection';
import {attributes} from '../core/social';
import {presentAt} from '../core/residence';
import {personalRoute} from '../core/diplomacy';
import {departureReason} from '../core/mobility';
import {DetailTabs} from './DetailTabs';
import {HoverHint} from './HoverHint';
import {SingleChoiceCards} from './SingleChoiceCards';
import {ServiceAudience,ServiceOutcome,serviceAudienceKind} from './ServiceAudience';
import {useEffect,useState} from 'react';
import {assignmentTemplates,assignmentPlans,assignmentPhases,type AssignmentPlan} from '../data/assignments';
import {assignmentBudget,assignmentPlanQuote,assignmentEffort,assignmentPause,serviceCandidates,serviceReason,type ServiceCommand,type Assignment} from '../core/assignments';
import {politicalName} from '../core/government';
import {siteById} from '../data/scenario';
import type {World,GameCommand} from '../core/types';
import {Resource,ArtIcon} from './ArtIcon';
export type ServiceProps={world:World;pending:boolean;send:(c:GameCommand)=>void;onPerson:(id:string)=>void};
export function AssignmentPanel({world:w,pending,send,onPerson,task:t}:ServiceProps&{task:Assignment}){
 const [chapter,setChapter]=useState<'progress'|'people'|'records'>('progress');
 const [recordOpen,setRecordOpen]=useState(false);
 const [invite,setInvite]=useState(''),[replacement,setReplacement]=useState(''),[confirm,setConfirm]=useState(false);
 const [planDraft,setPlanDraft]=useState<AssignmentPlan|null>(null),[incidentDraft,setIncidentDraft]=useState<'spend'|'delay'|'strain'|null>(null);
 useEffect(()=>{setPlanDraft(null);setIncidentDraft(null);setRecordOpen(false);},[t.id,t.phase]);
 const d=assignmentTemplates[t.kind],chief=serviceApprover(w,t),mine=t.officer===w.characterId,authority=serviceAuthority(w,t,w.characterId!),audience=authority&&serviceAudienceKind(t.kind)&&['petition','approval'].includes(t.phase),effort=assignmentEffort(w,t),pause=assignmentPause(w,t),candidates=serviceCandidates(w,t.realm,t.id).filter(c=>c.id!==t.officer&&c.id!==t.helper);
 const planCommand=planDraft?{type:'service' as const,action:'plan' as const,id:t.id,plan:planDraft}:null,planReason=planCommand?serviceReason(w,planCommand):'';
 const incidentCommand=incidentDraft?{type:'service' as const,action:incidentDraft,id:t.id}:null,incidentReason=incidentCommand?serviceReason(w,incidentCommand):'';
 const consequences:Record<string,string>={approve:t.phase==='petition'?'准予拟案，占用差事与承办人名额；当前不扣预算。':'从主管公庫与对应粮仓划拨所示钱粮，完成前无法用于其他事务。',revise:'不拨款，承办人重新拟案；原限期继续计算。',grant:'主管公款 −20，转入专款；不会自动解决道路阻断或地方失序。',deny:'不增拨公款，承办人须缓办或强令推进；已用时间不返还。',close:'按实际质量、贡献核定功绩，结算地方成果与退回未使用预算。',extend:'限期 +30 日，朝野支持 −3，成果质量 −5；每案仅一次。',spend:'需已获追加 20 公款且道路畅通、秩序至少 25；质量 −5，秩序 −3。'+(t.kind==='inspection'?'另使积弊 −3、朝廷紧张 +5。':t.kind==='envoy'?'承办人与对方执政者好感 −3。':''),delay:'工作量 +40，质量 +10（最高 130%）；不延长限期，可能逾期。',strain:'质量 −15（最低 50%）、秩序 −8；本人办理时压力 +18、工作量 +10；他人办理时工作量 +30。'};
 const button=(command:ServiceCommand,label:string)=>{const reason=serviceReason(w,command);return <div className="realm-action"><HoverHint label={label} content={<>{consequences[command.action]??label}{reason&&<p>{reason}</p>}</>}><button disabled={pending||!!reason} onClick={()=>send(command)}>{label}</button></HoverHint></div>;};
 const action=(action:Extract<ServiceCommand,{id:number}>['action'],label:string)=>button({type:'service',action,id:t.id} as ServiceCommand,label);
 return <article className={`assignment-detail ${audience?'assignment-detail--audience':''}`}>{!audience&&<><header className="assignment-heading"><ArtIcon name={d.icon} size={48}/><div><small><RealmBadge realm={t.realm} world={w}/> · {assignmentPhases[t.phase]}</small><h3>{siteById[t.site].name} · {d.name}</h3></div></header><p>{d.description} {t.target&&<>出使对象：<RealmBadge realm={t.target} world={w}/>。</>}</p><div className="assignment-officers"><PositionSeat compact world={w} holder={t.officer} title="承办" onPerson={onPerson}/><PositionSeat compact world={w} holder={chief} title="主管" onPerson={onPerson}/>{t.helper&&<PositionSeat compact world={w} holder={t.helper} title="协办" onPerson={onPerson}/>}</div></>}
 {audience&&<ServiceAudience world={w} task={t} pending={pending} send={send} onPerson={onPerson}/>}
 {audience&&<button type="button" className="service-audience-record-toggle" aria-expanded={recordOpen} onClick={()=>setRecordOpen(open=>!open)}>{recordOpen?'收起案卷':'查看案卷与人事'} {recordOpen?'−':'＋'}</button>}
 {(!audience||recordOpen)&&<>
 <p>拨款来源：{t.funding?.length?[...new Set(t.funding.map(p=>accountName(p.account)))].join('、'):accountName(servicePayer(w,t,authority&&t.phase==='approval'?w.characterId!:undefined).account)}{t.refunds?.length?" · 未退专款保留至原公库可以接收":""}</p>{authority&&t.phase!=='closed'&&<button aria-pressed={t.mandate?.automatic??false} disabled={pending} onClick={()=>send({type:"service",action:"automation",id:t.id,enabled:!t.mandate?.automatic})}>{t.mandate?.automatic?"本案恢复逐项请示":"本案授权例行办理"}</button>}<div className="service-metrics"><Resource name="coins" value={t.funds.coins} label="专拨公款" caption/><Resource name="grain" value={t.funds.grain} label="专拨公粮" caption/><span>已用 {t.spent?.coins??0} 钱 / {t.spent?.grain??0} 粮</span><span>{t.phase==='closed'?'已结案':`限期余 ${Math.max(0,t.deadline-w.day)} 日`}</span></div>
 {t.started&&<><progress aria-label="办理进度" value={t.progress} max={t.required}/><p>工作量 {t.progress} / {t.required}{t.phase!=='closed'&&` · 约需 ${Math.ceil((t.required-t.progress)/effort.total)} 个有效办理日`}</p></>}
 {w.mobility&&(mine||t.helper===w.characterId)&&!presentAt(w,w.characterId!,t.site)&&!['report','closed','proposal','approval','petition'].includes(t.phase)&&<HoverHint label="赴任要求" content={departureReason(w)||(!personalRoute(w,t.site)?'暂无可通行道路':'前往差事所在地，抵达后办理。')}><button disabled={pending||!!w.people[0].journey||!!departureReason(w)||!personalRoute(w,t.site)} onClick={()=>send({type:'travel',destination:t.site})}><ArtIcon name="world" size={24}/>赴任 · {siteById[t.site].name}</button></HoverHint>}
 {pause&&<p className="service-warning" role="status">{pause}；限期继续计算。</p>}
 <DetailTabs label="差事详情" value={chapter} onChange={setChapter} items={[{id:'progress',label:'办理',icon:d.icon},{id:'people',label:'协办人事',icon:'person'},{id:'records',label:'文书',icon:'diligent'}]}/>
 {chapter==='progress'&&<>
 {t.delivery&&<div className="city-civic-metrics"><span><ArtIcon name="grain" size={24}/>发运 <b>{t.delivery.sent}</b></span><span>{t.delivery.status==='traveling'?'粮队在途':t.delivery.status==='returned'?'粮队已返还':'粮队已交割'} · 抵达 {t.delivery.arrived}</span><span>驻军接收 <b>{t.delivery.delivered}</b></span><span>损耗 {t.delivery.lost}</span></div>}
 {t.result?<section><h4>{t.result.success?'考绩核定':'差事未成'}</h4><p>{t.result.reason}</p>{serviceAudienceKind(t.kind)&&<ServiceOutcome task={t}/>}<h5>本案直接结算</h5>{t.result.effects.map((effect,i)=><p key={i}>{effect}</p>)}{t.result.awards.map(a=><p key={a.person}><button onClick={()=>onPerson(a.person)}>{politicalName(a.person)}</button> · 功绩 {a.merit>=0?'+':''}{a.merit} · 主管交往 {a.opinion>=0?'+':''}{a.opinion} · 家族威望 +{a.prestige}</p>)}</section>:<>
 {t.invitation?.person===w.characterId&&<section className="service-callout"><h4>邀你协办</h4><p>接受后将占用你的差事名额，按实际参与领取考绩。</p><div className="realm-actions">{action('accept','接受协办')}{action('decline','婉拒')}</div></section>}
 {authority&&t.phase==='petition'&&!serviceAudienceKind(t.kind)&&<div className="realm-actions">{action('approve','准予请命')}{action('cancel','不予准许')}</div>}
 {(mine||authority)&&t.phase==='proposal'&&<section className="service-plan-choice">
  <SingleChoiceCards label="办理方案 · 单选" value={planDraft} onChange={setPlanDraft} disabled={pending} options={(Object.keys(assignmentPlans) as AssignmentPlan[]).map(plan=>{const b=assignmentPlanQuote(w,t,plan);return {id:plan,title:assignmentPlans[plan].name,description:assignmentPlans[plan].description,detail:<><span>公款 {b.coins} · 公粮 {b.grain}</span><span>约 {b.days} 个有效办理日</span><span>基础质量 {b.quality}%</span><span className={b.days>t.deadline-w.day?'service-warning':'service-hint'}>{b.days>t.deadline-w.day?'仅办理工期已超限，有逾期风险':'审批前不扣款'}</span></>,reason:serviceReason(w,{type:'service',action:'plan',id:t.id,plan})};})}/>
  <p className="service-hint">限期余 {Math.max(0,t.deadline-w.day)} 日；预估不含赴任、待批与阻碍。</p>
  <div className="single-choice-submit"><span>{planDraft?`已选 ${assignmentPlans[planDraft].name}`:'请选择办理方案'}{planReason&&<small role="status">{planReason}</small>}</span><button className="primary" disabled={pending||!planDraft||!!planReason} onClick={()=>{if(!planCommand||pending||serviceReason(w,planCommand))return;send(planCommand);setPlanDraft(null);}}>{authority?'批定':'呈请'}方案{planDraft?' · '+assignmentPlans[planDraft].name:''}</button></div>
 </section>}
 {authority&&t.phase==='approval'&&!serviceAudienceKind(t.kind)&&<><p>预计 {assignmentPlanQuote(w,t,t.plan!).days} 个有效办理日 · 质量 {t.quality??100}%，工期不含赴任和中途阻碍。</p><p>{assignmentPlans[t.plan!].name} · 公款 {assignmentBudget(t.kind,t.plan!).coins} / 公粮 {assignmentBudget(t.kind,t.plan!).grain}</p><div className="realm-actions">{action('approve','核准并拨款')}{action('revise','退回重拟')}</div></>}
 {(mine||authority)&&t.phase==='ready'&&action('start',authority?'下令开办':'启办差事')}
 {(mine||authority||t.helper===w.characterId&&!!w.mobility&&!presentAt(w,t.officer,t.site)&&presentAt(w,w.characterId!,t.site)&&!['training','inspection'].includes(t.kind))&&t.phase==='incident'&&<section className="service-incident-choice"><p>{t.history.at(-1)?.text}</p><div className="realm-actions">{!t.aidRequested&&mine&&action('request-aid','请求追加公款 20')}{!t.aidRequested&&authority&&action('grant','追加公款 20')}</div><SingleChoiceCards label="阻碍处理 · 单选" value={incidentDraft} onChange={setIncidentDraft} disabled={pending} options={(['spend','delay','strain'] as const).map(choice=>({id:choice,title:incidentChoices(t.kind)[choice],description:consequences[choice],reason:serviceReason(w,{type:'service',action:choice,id:t.id})}))}/><div className="single-choice-submit"><span>{incidentDraft?`已选 ${incidentChoices(t.kind)[incidentDraft]}`:'请选择处理办法'}{incidentReason&&<small role="status">{incidentReason}</small>}</span><button className="primary" disabled={pending||!incidentDraft||!!incidentReason} onClick={()=>{if(!incidentCommand||pending||serviceReason(w,incidentCommand))return;send(incidentCommand);setIncidentDraft(null);}}>确认处理</button></div></section>}
 {authority&&t.phase==='aid'&&<div className="realm-actions">{action('grant','追加公款 20')}{action('deny','不予追加')}</div>}
 {authority&&t.started&&t.phase!=='report'&&!t.extended&&action('extend','批准延期 30 日 · 朝野支持 −3 / 质量 −5')}
 {authority&&t.phase==='report'&&action('close','核定考绩并结案')}
 <p className="service-hint">{t.phase==='working'?'差事正在办理，继续时间以推进。':t.phase==='report'?'呈报已送达主管，等候考绩。':t.phase==='petition'||t.phase==='approval'||t.phase==='aid'?'待主管答复。若由他人裁决，继续时间可接收文书。':authority?'主管可批定办理决定；实际进度仍由到场承办人推进。':'由承办人安排下一步；他人办理时请继续时间。'}</p>
 </>}
 </>}
 {chapter==='people'&&<>{!t.result&&<> {mine&&['proposal','approval','ready','working'].includes(t.phase)&&<section><h4><ArtIcon name="gregarious" size={24}/>邀请协办</h4>{t.helper?<p>已有协办人：{politicalName(t.helper)}</p>:t.invitation?<p>等待{politicalName(t.invitation.person)}答复。</p>:<><PersonChoice world={w} title="协办人" value={invite} onChange={setInvite} pending={pending} onPerson={onPerson} options={candidates.filter(c=>!t.invited.includes(c.id)).map(c=>({id:c.id,score:attributes(w,c.id)[d.skill],metric:"职务能力",reason:serviceReason(w,{type:'service',action:'invite',id:t.id,person:c.id})}))}/>{button({type:'service',action:'invite',id:t.id,person:invite},'邀其协办')}</>}</section>}
 {t.helper===w.characterId&&action('withdraw','退出协办 · 保留既有贡献')}
 {authority&&<section><h4><ArtIcon name="influence" size={24}/>人事与撤回</h4><p>改派保留钱粮、进度和既有贡献；原职失效时可重新委任同一人。</p><PersonChoice world={w} title="承办人" value={replacement} onChange={setReplacement} pending={pending} onPerson={onPerson} options={serviceCandidates(w,t.realm,t.id).filter(c=>c.id!==t.helper).map(c=>({id:c.id,score:attributes(w,c.id)[d.skill],metric:"职务能力",reason:serviceReason(w,{type:'service',action:'replace',id:t.id,person:c.id})}))}/>{button({type:'service',action:'replace',id:t.id,person:replacement},'重新委任')}<p>撤回按实际进度结算支出，未使用的专款与粮食退回原拨款公库和粮仓；容量不足时保留待退。</p><button onClick={()=>setConfirm(true)}>撤回差事</button>{confirm&&<ConfirmAction title='撤回差事？' detail='按实际进度结算支出，未使用的专款与粮食退回原拨款公库和粮仓；容量不足时保留待退。' confirmLabel='确认撤回' danger pending={pending||!!serviceReason(w,{type:'service',action:'cancel',id:t.id})} onCancel={()=>setConfirm(false)} onConfirm={()=>{const cmd={type:'service',action:'cancel',id:t.id} as const;if(pending||serviceReason(w,cmd))return;send(cmd);setConfirm(false);}}/>}</section>}
</>}<section><h4><ArtIcon name="diligent" size={24}/>效率与贡献</h4>{servicePolitics(w,t.realm,t.kind).parts.filter(p=>p.value).map(p=><p key={p.id}>{p.label} · {p.value>0?"支持":"反对"} {Math.abs(p.value)}</p>)}{effort.parts.map(p=><p key={p.label}>{p.label} {p.value>=0?'+':''}{p.value}</p>)}<p>每日合计 {effort.total}；暂停期间不计进度。</p>{Object.entries(t.contributors).map(([id,c])=><p key={id}>{politicalName(id)} · 主办贡献 {c.lead} / 协办贡献 {c.support}</p>)}</section></>}
 {chapter==='records'&&<section><h4><ArtIcon name="diligent" size={24}/>往来文书</h4>{t.history.slice().reverse().map((h,i)=><p key={i}>第 {h.day} 日 · {h.text}</p>)}</section>}</>}</article>;
}
