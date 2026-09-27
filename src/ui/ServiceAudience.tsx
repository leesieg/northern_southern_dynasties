import {useEffect,useState} from 'react';
import {CharacterPortrait} from './CharacterPortrait';
import {SingleChoiceCards} from './SingleChoiceCards';
import {assignmentBudget,assignmentPlanQuote,serviceReason,type Assignment,type ServiceCommand} from '../core/assignments';
import {serviceApprover,servicePayer} from '../core/serviceMandates';
import {serviceNeed} from '../core/serviceNeeds';
import {publicBalance,accountName} from '../core/treasury';
import {cityYield} from '../core/realm';
import {attributes,traitsFor} from '../core/social';
import {officeHierarchy} from '../core/offices';
import {politicalName} from '../core/government';
import {civicBuildings} from '../core/officialDuties';
import {siteById} from '../data/scenario';
import {assignmentPlans,assignmentTemplates,type AssignmentPlan} from '../data/assignments';
import type {World,GameCommand} from '../core/types';
import './serviceAudience.css';

export const serviceAudienceKind=(kind:Assignment['kind'])=>['relief','marketworks','granaryworks','hostelworks','greatworks'].includes(kind);
type Question='situation'|'accounts'|'alternatives'|'delay';
type Decision='approve'|'revise'|'cancel';

export function ServiceAudience({world:w,task:t,pending,send,onPerson}:{world:World;task:Assignment;pending:boolean;send:(command:GameCommand)=>void;onPerson:(id:string)=>void}){
 const [question,setQuestion]=useState<Question>('situation'),[decision,setDecision]=useState<Decision|null>(null);
 useEffect(()=>{setQuestion('situation');setDecision(null);},[t.id,t.phase]);
 const city=w.realm!.cities[t.site],yieldHere=cityYield(w,t.site),need=serviceNeed(w,t.kind,t.site),d=assignmentTemplates[t.kind];
 const building=civicBuildings[t.kind as keyof typeof civicBuildings],level=building?w.holdings.cities[t.site]?.levels[building]??0:0;
 const plan=t.plan??'balanced',quote=assignmentPlanQuote(w,t,plan),payer=servicePayer(w,t,w.characterId!),balance=publicBalance(w,payer.account),grain=payer.grainSite?w.realm!.cities[payer.grainSite].grain:w.realm!.treasuries[t.realm].grain;
 const court=officeHierarchy(w,t.officer).find(o=>o.active&&o.holder===t.officer&&o.realm===t.realm),skill=attributes(w,t.officer)[d.skill],frugal=traitsFor(w,t.officer).includes('frugal');
 const controlled=Object.entries(w.realm!.cities).filter(([,c])=>c.controller===t.realm),realmTax=controlled.reduce((n,[site])=>n+cityYield(w,site).coins,0),realmFood=controlled.reduce((n,[site])=>{const y=cityYield(w,site);return n+y.grain-y.food;},0),realmPopulation=controlled.reduce((n,[,c])=>n+c.population,0);
 const expected=t.kind==='relief'?`若按当前质量办结，当地秩序预计 +${Math.min(100-city.order,Math.round(14*quote.quality/100))}，当地粮仓补入 ${Math.min(1_000_000-city.grain,Math.floor(quote.grain*.75))} 粮；批准的赈粮仍计入差事耗用。`:t.kind==='greatworks'?'如能办结，当地繁荣最多 +20、秩序最多 +10、水利最多 +2；实际受各项上限约束。':`如能办结，本城${d.name.replace('营建','')}提升 1 级；后续收益按地方生产与征收规则逐期发生。`;
 const options:{id:Decision;title:string;description:string}[]=t.phase==='petition'?[{id:'approve',title:'准其拟案',description:'同意承办人拟定方案；此时不拨款。'},{id:'cancel',title:'此事暂不受理',description:'差事结案；现有规则使当地秩序 −5。'}]:[{id:'approve',title:'准奏，依此办理',description:`从${accountName(payer.account)}拨公款 ${quote.coins}、公粮 ${quote.grain}；进入待启办。`},{id:'revise',title:'另拟一案，再来奏报',description:'不拨款，退回承办人重拟；原限期继续计算。'}];
 const command:ServiceCommand|null=decision?{type:'service',action:decision,id:t.id}:null,blocked=command?serviceReason(w,command):'';
 const speech=t.phase==='petition'?`臣请为${siteById[t.site].name}办理${d.name}：${need.reason}。请准臣拟案。`:t.kind==='relief'?`本地现存公粮 ${city.grain}，秩序 ${city.order}。臣请依「${assignmentPlans[plan].name}」赈济，先稳地方。`:t.kind==='greatworks'?`本地水利 ${city.irrigation}，繁荣 ${city.prosperity}。臣请依「${assignmentPlans[plan].name}」兴修水利。`:`${siteById[t.site].name}现有${d.name.replace('营建','')} ${level} 级，臣请依「${assignmentPlans[plan].name}」办理。`;
 const voice=t.phase==='approval'?(frugal&&plan==='thorough'?'臣以节费为先，愿以更长工期换取稳妥成果。':skill>=12?'臣可依现有职掌主持办理，仍须按实际钱粮拨付。':'臣请详核钱粮和限期，办理期间若有阻碍再行上报。'):'';
 return <section className="service-audience" aria-label="差事奏事">
  <header className="service-audience-speaker"><button type="button" className="service-audience-portrait" aria-label={'查看'+politicalName(t.officer)} onClick={()=>onPerson(t.officer)}><CharacterPortrait characterId={t.officer} world={w}/></button><div><small>{court?.name??'承办官'} · {siteById[t.site].name} · {t.officer===w.characterId?'亲办':'下属奏事'}</small><strong>{politicalName(t.officer)}</strong><p>“{speech}{voice}”</p><small>管理／职掌能力 {skill}{frugal?' · 俭用倾向':''} · {need.tier}：{need.reason}</small></div></header>
  <div className="service-audience-facts"><span>人口 <b>{city.population}</b></span><span>公粮 <b>{city.grain}</b></span><span>秩序 <b>{city.order}</b></span><span>每 30 日粮食结余 <b>{yieldHere.grain-yieldHere.food>=0?'+':''}{yieldHere.grain-yieldHere.food}</b></span></div>
  <nav className="service-audience-questions" aria-label="追问奏事"><button aria-pressed={question==='situation'} onClick={()=>setQuestion('situation')}>当地何事？</button><button aria-pressed={question==='accounts'} onClick={()=>setQuestion('accounts')}>把账目呈上来</button><button aria-pressed={question==='alternatives'} onClick={()=>setQuestion('alternatives')}>还有其他办法？</button><button aria-pressed={question==='delay'} onClick={()=>setQuestion('delay')}>若暂缓呢？</button></nav>
  <div className="service-audience-answer" aria-live="polite">
   {question==='situation'&&<><p>{need.reason}。{expected}</p><p>本城当前每 30 日税收 {yieldHere.coins}，全境受控城市合计 {realmTax}；本城粮食结余 {yieldHere.grain-yieldHere.food}，全境合计 {realmFood}；本城人口 {city.population}，全境合计 {realmPopulation}。地方变化通过后续生产与征收传导，结案不会直接计作全国收入。</p></>}
   {question==='accounts'&&<><p>主管付款公库：{accountName(payer.account)}，现有公款 {balance}；拨付粮仓：{payer.grainSite?siteById[payer.grainSite].name:'中央国库'}，现有公粮 {grain}。</p><p>{t.plan?'本案方案':'常额参考'}需公款 {quote.coins}、公粮 {quote.grain}；若现在拨付，余额分别为 {balance-quote.coins}、{grain-quote.grain}。{balance<quote.coins||grain<quote.grain?'现有余额不足，需先走实际拨款路径。':'真正扣款发生在核准预算时。'}</p></>}
   {question==='alternatives'&&<><div className="service-audience-comparison">{(Object.keys(assignmentPlans) as AssignmentPlan[]).map(p=>{const q=assignmentPlanQuote(w,t,p);return <article key={p} data-selected={t.plan===p}><strong>{assignmentPlans[p].name}{t.plan===p?' · 已呈请':''}</strong><span>公款 {q.coins} · 公粮 {q.grain}</span><span>约 {q.days} 个有效办理日 · 基础质量 {q.quality}%</span></article>;})}</div><small>办理日不含赴任、审批和中途阻碍；改案须退回重拟，比较不直接变更方案。</small></>}
   {question==='delay'&&<><p>限期尚余 {Math.max(0,t.deadline-w.day)} 日。本城每 30 日产粮 {yieldHere.grain}、民食需求 {yieldHere.food}；现存公粮 {city.grain}。</p><p>{need.neglect}。暂缓此案不扣专款；地方民食、生产和其他事务仍按现有规则结算。</p></>}
  </div>
  <SingleChoiceCards label="如何回复 · 单选" value={decision} onChange={setDecision} disabled={pending} options={options.map(o=>({id:o.id,title:o.title,description:o.description,reason:serviceReason(w,{type:'service',action:o.id,id:t.id})}))}/>
  <div className="service-audience-confirm"><div>{decision?<><strong>{options.find(o=>o.id===decision)?.title}</strong><small>目标：{siteById[t.site].name} · 承办：{politicalName(t.officer)} · 下令：{politicalName(w.characterId!)} · 原主管：{serviceApprover(w,t)?politicalName(serviceApprover(w,t)!):'席位空缺'}</small><small>预算来源：{accountName(payer.account)}；预计办理 {quote.days} 个有效日、基础质量 {quote.quality}%，限期余 {Math.max(0,t.deadline-w.day)} 日。{options.find(o=>o.id===decision)?.description}{decision==='approve'&&t.phase==='approval'&&expected}</small></>:<span>先选择回复，再核对目标、承办人与钱粮。</span>}{blocked&&<small role="status" className="service-warning">{blocked}</small>}</div><button className="primary" disabled={pending||!command||!!blocked} onClick={()=>{if(!command||pending||serviceReason(w,command))return;send(command);setDecision(null);}}>确认回复</button></div>
 </section>;
}

export function ServiceOutcome({task:t}:{task:Assignment}){
 const before=t.baseline,after=t.result?.after;if(!before||!after)return null;
 const building=civicBuildings[t.kind as keyof typeof civicBuildings],budget=t.plan?assignmentBudget(t.kind,t.plan):null,plannedQuality=t.plan?t.plan==='thorough'?115:t.plan==='urgent'?85:100:null;
 return <div className="service-outcome"><h5>从奏请到结案</h5><p>第 {before.day} 日提出 → 第 {after.day} 日结案。{t.plan&&`原定「${assignmentPlans[t.plan].name}」，公款 ${budget?.coins}、公粮 ${budget?.grain}，基础质量 ${plannedQuality}%；最终质量 ${t.quality??100}%，实际耗用 ${t.spent?.coins??0} 钱、${t.spent?.grain??0} 粮。`}</p><p>下列为两日间的当地状态变化，包含同期其他因素；本案直接成果以结案记录为准。</p><div><span>秩序 <b>{before.order} → {after.order}</b></span><span>公粮 <b>{before.grain} → {after.grain}</b></span><span>繁荣 <b>{before.prosperity} → {after.prosperity}</b></span><span>水利 <b>{before.irrigation} → {after.irrigation}</b></span>{building&&<span>建筑等级 <b>{before.building} → {after.building}</b></span>}</div><small>后续税收、民食和仓储变化可在{siteById[t.site].name}详情继续观察。</small></div>;
}
