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
 const quote=plan&&officer?assignmentPlanQuote(w,{kind,site,officer,realm,helper:null},plan):null;
 return <section className="service-choice-overview">
  <h4><ArtIcon name={d.icon} size={26}/>{d.name}</h4>
  <p><b>所得</b>　{d.effect}</p>
  <p><b>代价</b>　{info.cost}</p>
  <p><b>条件</b>　{info.condition}</p>
  <p className={reason?'service-warning':'service-hint'} role="status">{reason?'当前不可委任：'+reason:onPlan&&!plan?'请选择办理方案；核准时再审核公库能否拨款。':'当前可委任；方案核准时再审核公库能否拨款。'}</p>
  {onPlan?<>
   <SingleChoiceCards label="办理方案 · 单选" value={plan??null} onChange={onPlan} disabled={pending} options={(Object.keys(assignmentPlans) as AssignmentPlan[]).map(option=>{const q=officer?assignmentPlanQuote(w,{kind,site,officer,realm,helper:null},option):null;return {id:option,title:assignmentPlans[option].name,description:assignmentPlans[option].description,detail:<><span>公款 {q?.coins??'—'} · 公粮 {q?.grain??'—'}</span><span>约 {q?.days??'—'} 个有效办理日</span><span>基础质量 {q?.quality??'—'}%</span></>,reason:serviceReason(w,{...command,plan:option})};})}/>
   {quote&&<p className="service-hint">已选 {assignmentPlans[plan!].name}：需公款 {quote.coins}、公粮 {quote.grain}；约 {quote.days} 个有效办理日，基础质量 {quote.quality}%。下令后待核定专项预算。</p>}
  </>:<p className="service-hint">{officer===w.characterId?'亲自承办时在拟案阶段选择办理方案；改派其他承办人可在委任时预先批定。':'本次仅创建差事；承办人在拟案阶段选择办理方案。'}</p>}
  <small>预算由现任主管的公库拨入专款；地方余额不足时逐级请款。工期按当前能力计算，不含赴任、待批及中途阻碍；质量影响考绩，赈济、农桑、市务的地方成果也随质量变化，建筑等级等固定成果不放大。</small>
  <p>同类政务对支持与紧张的即时影响每 30 日结算一次。占用主管承办额度和承办人；补充有俸禄的官署或幕府人员可扩大承办能力。办理期间本城可用劳力 −8%。{politics.effort!==0&&`集团支持使每日工作量 ${politics.effort>0?'+':''}${politics.effort}。`}</p>
 </section>;
}
