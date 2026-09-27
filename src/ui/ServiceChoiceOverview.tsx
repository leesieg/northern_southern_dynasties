import {assignmentPlans,assignmentTemplates,assignmentTradeoffs,type AssignmentKind,type AssignmentPlan} from '../data/assignments';
import {assignmentPlanQuote,serviceReason} from '../core/assignments';
import {servicePolitics} from '../core/serviceNeeds';
import type {World} from '../core/types';
import type {RealmId} from '../core/realm';
import {ArtIcon} from './ArtIcon';
import {SingleChoiceCards} from './SingleChoiceCards';

export function ServiceChoiceOverview({world:w,kind,site,officer,realm,target,plan,onPlan,pending=false}:{world:World;kind:AssignmentKind;site:string;officer:string;realm:RealmId;target?:RealmId;plan?:AssignmentPlan|null;onPlan?:(plan:AssignmentPlan)=>void;pending?:boolean}){
 if(!site)return null;
 const d=assignmentTemplates[kind],info=assignmentTradeoffs[kind],politics=servicePolitics(w,realm,kind);
 const command={type:'service' as const,action:'open' as const,kind,site,officer,...(kind==='envoy'?{target}:{}),...(onPlan&&plan?{plan}:{})};
 const reason=serviceReason(w,command);
 return <section className="service-choice-overview">
  <h4><ArtIcon name={d.icon} size={26}/>{d.name} · 办理预览</h4>
  <div className="service-choice-facts"><p><b>办成后</b>{d.effect}</p><p><b>主要取舍</b>{info.cost}</p><p><b>开办条件</b>{info.condition}</p></div>
  {onPlan?<>
   <SingleChoiceCards label="办理方案 · 单选" value={plan??null} onChange={onPlan} disabled={pending} options={(Object.keys(assignmentPlans) as AssignmentPlan[]).map(option=>{const q=officer?assignmentPlanQuote(w,{kind,site,officer,realm,helper:null},option):null;return {id:option,title:assignmentPlans[option].name,description:assignmentPlans[option].description,detail:<><span>公款 {q?.coins??'—'} · 公粮 {q?.grain??'—'}</span><span>约 {q?.days??'—'} 个有效办理日</span><span>基础质量 {q?.quality??'—'}%</span></>,reason:serviceReason(w,{...command,plan:option})};})}/>
  </>:<p className="service-hint">{officer===w.characterId?'亲自承办：接令后在拟案阶段选择方案。':'本次先委任差事，承办人将在拟案阶段选择方案。'}</p>}
  <p className={reason?'service-warning':'service-hint'} role="status">{reason?reason:'可下令；专项预算仍须依公库余额核定。'}</p>
  <details><summary>查看预算、工期与地方影响</summary><p>预算从现任主管公库拨入专款；地方不足时逐级请款。工期为有效办理日，不含赴任、待批及阻碍；质量影响考绩与部分地方成果，固定建筑等级不随质量放大。</p><p>同类政务对支持与紧张的即时影响每 30 日结算一次。差事占用承办额度和承办人，办理期间本城可用劳力 −8%。{politics.effort!==0&&`集团支持使每日工作量 ${politics.effort>0?'+':''}${politics.effort}。`}</p></details>
 </section>;
}
