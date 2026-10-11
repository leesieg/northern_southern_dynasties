import {afterCommand} from './actionFeedback';
import {politicalAction} from '../core/politicalActions';
import {courtOf} from '../core/court';
import {policies} from '../data/court';
import {servicePriorities} from '../data/assignments';
import {countyTerritory} from '../core/localAdministration';
import {useEffect,useState} from 'react';
import {HoverHint} from './HoverHint';
import {ArtIcon} from './ArtIcon';
import {ActionDialog} from './ActionDialog';
import {SingleChoiceCards} from './SingleChoiceCards';
import {GovernmentPanel} from './GovernmentPanel';
import {governanceRules} from '../core/governanceRules';
import {governmentReason,governingExecutives,currentRealm,politicalName} from '../core/government';
import {policyDefinitions,policyDimensions,policyLabels,policyDefinition,appointmentPolicies,culturalPolicyTradeoffs,type CulturalPolicy,type PolicyDimension} from '../data/governancePolicies';
import {siteById} from '../data/scenario';
import type {RealmId} from '../core/realm';
import type {World,GameCommand} from '../core/types';
import './culturePolicy.css';

export function GovernancePolicyPanel({world:w,realm,pending,send,onPerson,onTerritory,onService}:{world:World;realm:RealmId;pending:boolean;send:(c:GameCommand)=>Promise<boolean>;onPerson:(id:string)=>void;onTerritory:(id:string)=>void;onService:(id?:number,site?:string)=>void}){
 const [editing,setEditing]=useState<PolicyDimension|null>(null),[draft,setDraft]=useState('');
 useEffect(()=>{setEditing(null);setDraft('');},[realm,w.characterId]);
 const rules=governanceRules(w,realm),own=realm===currentRealm(w),executive=own&&governingExecutives(w,realm).includes(w.characterId!);
 const command=editing?{type:'government',action:'policy',dimension:editing,policy:draft} as const:null;
 const reason=command?governmentReason(w,command):'';
 const reports=Object.entries(rules.reports??{}).filter(([site])=>w.realm!.cities[site].owner===realm),current=reports.filter(([,q])=>q.registration===rules.registration&&q.access===rules.access),cities=Object.entries(w.realm!.cities).filter(([,c])=>c.owner===realm&&c.controller===realm);
 return <div className="governance-policy-panel court-policy-desk">
  <GovernmentPanel world={w} realm={realm} compact pending={pending} send={send}/>
  <section className="court-policy-rules"><header className="court-desk-heading"><h3>治理准则</h3><small>版本 {rules.revision}</small></header>
   <div className="governance-rule-grid">{policyDimensions.map(d=>{const definition=policyDefinition(d,rules[d])!;return <section className="court-rule" key={d}>
    <ArtIcon name={d==='appointment'?'influence':d==='access'?'person':d==='cultural'?'gregarious':'coins'} size={30}/>
    <HoverHint label={policyLabels[d]} content={definition.effect}><div tabIndex={0}><small>{policyLabels[d]}</small><strong>{definition.name}</strong><p className="court-rule-effect">{definition.effect}</p></div></HoverHint>
    {own&&<HoverHint label={'调整'+policyLabels[d]} content={executive?'100 本国公款、20 本人影响力、60 个有效日；启办支持 −8，颁行才换规则。':'须由本国实际执政者调整'}><button className="court-icon-button" aria-label={'调整'+policyLabels[d]} disabled={pending||!executive} onClick={()=>{setEditing(d);setDraft(rules[d]);}}><ArtIcon name="diligent" size={23}/></button></HoverHint>}
   </section>;})}</div>
   <section className="court-policy-direction"><HoverHint label="施政方向与季议" content={policies[courtOf(w,realm)!.policy].effect+'；持续规则与季度投入分别结算，急务优先。'}><div tabIndex={0}><ArtIcon name="renown" size={25}/><span>施政方向 <b>{policies[courtOf(w,realm)!.policy].name}</b></span></div></HoverHint><span>本季重心 <b>{servicePriorities[w.service?.councils[realm].priority??'stability']}</b><small>{w.service?.councils[realm].decided?'已议定':'待议'}</small></span></section>
   <HoverHint label="治理覆盖与史料" content="规则名称和权重为游戏抽象，现有户籍资料未细分族群与豁免；旧案沿用原文书，不补造呈报和核查。"><a className="court-source-link" href={appointmentPolicies[rules.appointment].source.url} target="_blank" rel="noreferrer" aria-label={'史料背景 '+appointmentPolicies[rules.appointment].source.title}><ArtIcon name="diligent" size={22}/></a></HoverHint>
  </section>
  <section className="court-policy-execution"><header className="court-desk-heading"><h3>地方落实</h3>{own&&<HoverHint label="安排落实与请示" content="中央定规则和预算，地方沿科层拟案、请款及延期；清税呈报与他人巡察分开。"><button className="court-icon-button" aria-label="安排治理落实与请示" onClick={()=>onService()}><ArtIcon name="person" size={25}/></button></HoverHint>}</header>
   <div className="court-execution-counts"><HoverHint label="执行呈报" content={'现行规则下 '+current.length+' 处呈报，实控地点 '+cities.length+' 处。'}><span tabIndex={0}><ArtIcon name="diligent" size={24}/><b>{current.length}</b></span></HoverHint><HoverHint label="按规则办理" content="符合相应方案与质量条件，不代表已获独立核查。"><span tabIndex={0}><ArtIcon name="city" size={24}/><b>{current.filter(([,q])=>q.applied).length}</b></span></HoverHint><HoverHint label="独立查核" content="另一个承办人，在呈报后立案巡察并符合质量条件。"><span tabIndex={0}><ArtIcon name="wary" size={24}/><b>{current.filter(([,q])=>q.checkedDay!==null).length}</b></span></HoverHint></div>
   <div className="governance-local-reports court-scroll-list">{reports.sort((a,b)=>b[1].reportedDay-a[1].reportedDay).map(([site,q])=>{const archived=!w.service?.tasks.some(t=>t.id===q.task);return <article key={site}>
    <header><button onClick={()=>onTerritory(countyTerritory(site))}>{siteById[site].name}</button><HoverHint label="执行状态" content={<>{policyDefinition('registration',q.registration)!.name}；{q.applied?'符合落实条件':'核籍尚未落实'}。质量 {q.quality}%；第 {q.reportedDay} 日呈报；{q.checkedDay===null?'待独立查核':'第 '+q.checkedDay+' 日独立查核'}。</>}><small tabIndex={0}>{q.checkedDay===null?'待核':'已核'}</small></HoverHint></header>
    <span><ArtIcon name="coins" size={20}/>{q.recovered} 钱</span><button onClick={()=>onPerson(q.officer)}>{politicalName(q.officer,w)}</button>{q.inspector&&<HoverHint label="独立查核人" content={politicalName(q.inspector,w)}><button className="court-icon-button" aria-label={'查看查核人 '+politicalName(q.inspector,w)} onClick={()=>onPerson(q.inspector!)}><ArtIcon name="wary" size={21}/></button></HoverHint>}
    {own&&<HoverHint label="查看案卷" content={archived?'原案已归档，保留当前呈报摘要':'打开该地点的真实清税案卷'}><button className="court-icon-button" aria-label={'查看'+siteById[site].name+'清税案卷'} disabled={archived} onClick={()=>onService(q.task,site)}><ArtIcon name="diligent" size={21}/></button></HoverHint>}
   </article>;})}{!reports.length&&<p className="court-empty">尚无执行呈报</p>}</div>
  </section>
  {editing&&command&&own&&<ActionDialog title={'调整 · '+policyLabels[editing]} onClose={()=>setEditing(null)} actions={<><button className="primary" disabled={pending||!!reason} onClick={()=>{if(pending||!executive||governmentReason(w,command))return;void afterCommand(send(command),()=>{setEditing(null);});}}>呈议 · 100 公款 / 20 影响力</button></>}><div className={editing==='cultural'?'culture-policy-options':undefined}><SingleChoiceCards label={policyLabels[editing]+' · 单选'} value={draft} onChange={setDraft} disabled={pending} options={Object.entries(policyDefinitions[editing]).map(([id,d])=>{const reaction=politicalAction(w,realm,editing==='registration'?'tax':'appointment',{source:'policy-preview',actor:w.characterId,dimension:editing,rule:id});return {id,title:d.name,description:editing==='cultural'?<span className="culture-policy-tradeoffs">{Object.entries(culturalPolicyTradeoffs[id as CulturalPolicy]).map(([label,text])=><span key={label}><b>{label}</b>{text}</span>)}</span>:d.effect,detail:<><span>{id===rules[editing]?'现行规则':'60 个有效实施日 · 支持 −8 · 颁行后才生效'}</span><span>当前集团取舍：{reaction.parts.filter(p=>p.value).map(p=>p.label+' '+(p.value>0?'+':'')+p.value).join(' / ')||'无显著反应'}</span></>};})}/></div><p>当前由 {politicalName(w.characterId!,w)}提出。经本国中央公库支出，议程占用改革名额；战争、危局或执行条件不足时暂停，取消不退已付成本。颁行不追溯扣钱或处分旧官，地方须另行安排落实与查核。</p>{reason&&<p role="status" className="service-warning">{reason}</p>}</ActionDialog>}
 </div>;
}
