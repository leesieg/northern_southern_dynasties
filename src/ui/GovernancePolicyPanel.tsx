import {politicalAction} from '../core/politicalActions';
import {courtOf} from '../core/court';
import {policies} from '../data/court';
import {servicePriorities} from '../data/assignments';
import {countyTerritory} from '../core/localAdministration';
import {useState} from 'react';
import {ArtIcon} from './ArtIcon';
import {ActionDialog} from './ActionDialog';
import {SingleChoiceCards} from './SingleChoiceCards';
import {GovernmentPanel} from './GovernmentPanel';
import {governanceRules} from '../core/governanceRules';
import {governmentReason,governingExecutives,currentRealm,politicalName} from '../core/government';
import {policyDefinitions,policyDimensions,policyLabels,policyDefinition,appointmentPolicies,type PolicyDimension} from '../data/governancePolicies';
import {siteById} from '../data/scenario';
import type {RealmId} from '../core/realm';
import type {World,GameCommand} from '../core/types';

export function GovernancePolicyPanel({world:w,realm,pending,send,onPerson,onTerritory,onService}:{world:World;realm:RealmId;pending:boolean;send:(c:GameCommand)=>void;onPerson:(id:string)=>void;onTerritory:(id:string)=>void;onService:()=>void}){
 const [editing,setEditing]=useState<PolicyDimension|null>(null),[draft,setDraft]=useState('');
 const rules=governanceRules(w,realm),own=realm===currentRealm(w),executive=own&&governingExecutives(w,realm).includes(w.characterId!);
 const command=editing?{type:'government',action:'policy',dimension:editing,policy:draft} as const:null;
 const reason=command?governmentReason(w,command):'';
 const reports=Object.entries(rules.reports??{}).filter(([site])=>w.realm!.cities[site].owner===realm),current=reports.filter(([,q])=>q.registration===rules.registration&&q.access===rules.access),cities=Object.entries(w.realm!.cities).filter(([,c])=>c.owner===realm&&c.controller===realm);
 return <div className="governance-policy-panel">
  <div className="governance-rule-grid">{policyDimensions.map(d=>{const definition=policyDefinition(d,rules[d])!;return <section key={d}><header><ArtIcon name={d==='appointment'?'influence':d==='access'?'person':'coins'} size={28}/><h3>{policyLabels[d]}</h3></header><strong>{definition.name}</strong><p>{definition.effect}</p>{own&&<button disabled={pending||!executive} title={executive?'政策调整需公款 100、影响力 20、60 个有效实施日；支持 −8，沿用改革暂停条件。':'须由本国实际执政者修改全国规则'} onClick={()=>{setEditing(d);setDraft(rules[d]);}}>调整规则</button>}</section>;})}</div>
  <p className="service-hint">任官准则与任职通道持续有效；季议决定当前差事重心，急务优先，条件平稳时依朝局施政方向建议投入。当前方向为{policies[courtOf(w,realm)!.policy].name}，本季重心为{servicePriorities[w.service?.councils[realm].priority??'stability']}{w.service?.councils[realm].decided?'（已议定）':'（待议）'}。通道按效忠、履历和担保判断，现有户籍资料未细分族群及豁免。</p>
  <section><h3>地方落实</h3><p>现行赋役规则：{policyDefinition('registration',rules.registration)!.name} · {cities.length} 处实控地点</p><div className="service-metrics"><span>呈报 {current.length} 处</span><span>按规则办理 {current.filter(([,q])=>q.applied).length} 处</span><span>独立查核 {current.filter(([,q])=>q.checkedDay!==null).length} 处</span></div><p className="service-hint">中央定规则与预算；州郡分配差事和协调县域；县级主官拟案、请款、申请延期。清税形成呈报，另由其他承办人巡察查核。旧规则的在途案卷按原文书结案。</p>{own&&<button onClick={onService}>安排执行与请示 ›</button>}
   {reports.length?<div className="governance-local-reports">{reports.sort((a,b)=>b[1].reportedDay-a[1].reportedDay).map(([site,q])=><article key={site}><button onClick={()=>onTerritory(countyTerritory(site))}>{siteById[site].name} ›</button><span>{policyDefinition('registration',q.registration)!.name} · {q.applied?'已呈报落实':'核籍尚未落实'} · {q.checkedDay===null?'待独立查核':'已独立查核'}</span><small>实收 {q.recovered} 钱 · 质量 {q.quality}% · 第 {q.reportedDay} 日 · 案 {q.task}</small><button onClick={()=>onPerson(q.officer)}>承办 {politicalName(q.officer)} ›</button>{q.inspector&&<button onClick={()=>onPerson(q.inspector!)}>查核 {politicalName(q.inspector)} ›</button>}</article>)}</div>:<p>尚无已录执行呈报。</p>}
  </section>
  <GovernmentPanel world={w} realm={realm} pending={pending} send={send}/>
  <p className="service-hint">任官卡名及权重为治理模拟。史料背景：<a href={appointmentPolicies[rules.appointment].source.url} target="_blank" rel="noreferrer">{appointmentPolicies[rules.appointment].source.title}</a>。</p>
  {editing&&command&&<ActionDialog title={'调整 · '+policyLabels[editing]} onClose={()=>setEditing(null)} actions={<button className="primary" disabled={pending||!!reason} onClick={()=>{if(pending||governmentReason(w,command))return;send(command);setEditing(null);}}>呈议 · 100 公款 / 20 影响力</button>}><SingleChoiceCards label={policyLabels[editing]+' · 单选'} value={draft} onChange={setDraft} disabled={pending} options={Object.entries(policyDefinitions[editing]).map(([id,d])=>{const reaction=politicalAction(w,realm,editing==='registration'?'tax':'appointment',{source:'policy-preview',actor:w.characterId,dimension:editing,rule:id});return {id,title:d.name,description:d.effect,detail:<><span>{id===rules[editing]?'现行规则':'60 个有效实施日 · 支持 −8 · 颁行后才生效'}</span><span>当前集团取舍：{reaction.parts.filter(p=>p.value).map(p=>p.label+' '+(p.value>0?'+':'')+p.value).join(' / ')||'无显著反应'}</span></>};})}/><p>当前由 {politicalName(w.characterId!)}提出。经本国中央公库支出，议程占用改革名额；战争、危局或执行条件不足时暂停，取消不退已付成本。颁行不追溯扣钱或处分旧官，地方须另行安排落实与查核。</p>{reason&&<p role="status" className="service-warning">{reason}</p>}</ActionDialog>}
 </div>;
}
