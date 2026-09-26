import {assignmentPlans,assignmentTemplates,assignmentTradeoffs,type AssignmentKind} from '../data/assignments';
import {assignmentBudget,assignmentPlanQuote,serviceReason} from '../core/assignments';
import {servicePolitics} from '../core/serviceNeeds';
import type {World} from '../core/types';
import type {RealmId} from '../core/realm';
import {ArtIcon} from './ArtIcon';
export function ServiceChoiceOverview({world:w,kind,site,officer,realm,target}:{world:World;kind:AssignmentKind;site:string;officer:string;realm:RealmId;target?:RealmId}){
 if(!site)return null;
 const d=assignmentTemplates[kind],info=assignmentTradeoffs[kind],reason=serviceReason(w,{type:'service',action:'open',kind,site,officer,...(kind==='envoy'?{target}:{})}),politics=servicePolitics(w,realm,kind);
 return <section className="service-choice-overview"><h4><ArtIcon name={d.icon} size={26}/>{d.name}</h4><p><b>所得</b>　{d.effect}</p><p><b>代价</b>　{info.cost}</p><p><b>条件</b>　{info.condition}</p><p className={reason?'service-warning':'service-hint'} role="status">{reason?'当前不可委任：'+reason:'当前可委任；拟案后另行审核公库能否拨款。'}</p><div className="service-comparison">{(Object.keys(assignmentPlans) as (keyof typeof assignmentPlans)[]).map(plan=>{const q=officer?assignmentPlanQuote(w,{kind,site,officer,realm,helper:null},plan):null;const budget=assignmentBudget(kind,plan);return <div key={plan}><strong>{assignmentPlans[plan].name}</strong><span><ArtIcon name="coins" size={20}/>{budget.coins}　<ArtIcon name="grain" size={20}/>{budget.grain}</span>{q&&<><span>约 {q.days} 个办理日</span><small>质量 {q.quality}%</small></>}</div>;})}</div><small>预算由现任主管的公库拨入专款；地方余额不足时逐级请款。工期按当前能力计算，不含赴任、待批及中途阻碍；质量影响考绩，赈济、农桑、市务的地方成果也随质量变化，建筑等级等固定成果不放大。</small><p>同类政务对支持与紧张的即时影响每 30 日结算一次。占用主管承办额度和承办人；补充有俸禄的官署或幕府人员可扩大承办能力。办理期间本城可用劳力 −8%。{politics.effort!==0&&`集团支持使每日工作量 ${politics.effort>0?'+':''}${politics.effort}。`}</p></section>;
}
