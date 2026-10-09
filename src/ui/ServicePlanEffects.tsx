import {cityYield} from '../core/realm';
import {manpower} from '../core/manpower';
import {estatePolicies,actualEstatePolicy} from '../core/estates';
import {assignmentPlanQuote,assignmentPoliticalContext,type Assignment} from '../core/assignments';
import {policyExecution,servicePolicy} from '../core/policyExecution';
import {politicalAction} from '../core/politicalActions';
import {serviceDomain} from '../core/serviceNeeds';
import {nextMonthStart} from '../core/calendar';
import {policyDefinition} from '../data/governancePolicies';
import type {AssignmentPlan} from '../data/assignments';
import type {World} from '../core/types';

type Preview=Pick<Assignment,'realm'|'site'|'kind'|'officer'|'helper'>&Partial<Assignment>;
export function ServicePlanEffects({world:w,task:t,plan}:{world:World;task:Preview;plan:AssignmentPlan}){
 const quote=assignmentPlanQuote(w,t,plan),policy=servicePolicy(w,t),tax=t.kind==='taxation'?policyExecution(w,t,plan,t.started&&t.plan===plan?t.quality??quote.quality:quote.quality):null;
 const politics=politicalAction(w,t.realm,serviceDomain(t.kind),assignmentPoliticalContext(w,{...t,plan,funds:t.plan===plan&&t.funds?.coins?t.funds:{coins:quote.coins,grain:quote.grain}}));
 const actual=actualEstatePolicy(w,t.site),after=tax?.applied?(()=>{const next=structuredClone(w);next.realm!.cities[t.site].estatePolicy=tax.rule;return {tax:cityYield(next,t.site).agriculturalTax,army:manpower(next,t.site).publicLimit};})():null;
 const days=t.started?Math.ceil(((t.required??0)-(t.progress??0))/quote.effort):quote.days;
 return <div className="service-plan-effects">
  {tax&&<span>{t.id!==undefined&&!t.policy?'原案清税口径':policyDefinition('registration',policy.registration)!.name}：按当前人口与税率，结案预计实收 {tax.recovered} 钱、秩序 {tax.order>=0?'+':''}{tax.order}；{tax.applied?'符合落实条件':'不计完成核籍'}。实际按结案质量复核。</span>}
  {after&&<span>成功核籍后实际赋役：{estatePolicies[actual].name} → {estatePolicies[tax!.rule].name}；每月农业税 {cityYield(w,t.site).agriculturalTax} → {after.tax} 钱，公共总兵额 {manpower(w,t.site).publicLimit} → {after.army}。上述长期税基变化不计入一次追征款；已有部队保留。</span>}
  <span>集团条件反应：{politics.parts.filter(p=>p.value).map(p=>p.label+' '+(p.value>0?'+':'')+p.value).join(' / ')||'无显著反应'}；同地同类同阶段按规模累计，30 日内封顶。</span>
  <small>{w.day+days>=nextMonthStart(w.day,w.scriptId)?'按当前效率，即刻办理也无法在下次月结前办结。':'预估不含赴任、审批与阻碍，能否在下次月结前办结取决于执行条件。'}</small>
 </div>;
}
