import {actualEstatePolicy} from './estates';
import {describe,it,expect} from 'vitest';
import {newGovernedCampaignWorld} from './governedTestWorld';
import {actService,advanceService,assignmentPlanQuote,serviceAttention,type Assignment} from './assignments';
import {canCommission,serviceApprover,servicePayer} from './serviceMandates';
import {policyExecution,recordPolicyExecution} from './policyExecution';
import {governmentOf} from './government';
import {governanceRules,validGovernanceRules} from './governanceRules';
import {validService} from './assignmentSave';
import {parseWorld,serializeWorld} from './save';
import type {AssignmentKind,AssignmentPlan} from '../data/assignments';
import type {World} from './types';

function start(){
 const w=newGovernedCampaignWorld('dugu-xin',undefined,'sandbox');w.realm!.treasuries.west.coins=10000;w.realm!.treasuries.west.grain=10000;
 w.realm!.cities.tianshui.order=20;w.realm!.cities.tianshui.grain=500;actService(w,{type:'service',action:'begin'});return w;
}
function prepare(w:World,kind:AssignmentKind='taxation',plan:AssignmentPlan='thorough',officer='dugu-xin'){
 actService(w,{type:'service',action:'open',kind,site:'tianshui',officer},officer==='dugu-xin'?officer:'yuwen-tai');
 const t=w.service!.tasks.at(-1)!;
 if(t.phase==='petition')actService(w,{type:'service',action:'approve',id:t.id},'yuwen-tai');
 actService(w,{type:'service',action:'plan',id:t.id,plan},officer);
 actService(w,{type:'service',action:'approve',id:t.id},'yuwen-tai');
 if(officer!=='dugu-xin'){w.mobility!.residences[officer].site='tianshui';w.mobility!.residences[officer].journey=null;}
 actService(w,{type:'service',action:'start',id:t.id},officer);return t;
}
// Exercise the completion boundary directly, without a long whole-world simulation.
function complete(w:World,t:Assignment){w.day+=5;t.progress=t.required;t.contributors={[t.officer]:{lead:t.required,support:0}};t.incidentDone=true;t.phase='report';t.changed=w.day;actService(w,{type:'service',action:'close',id:t.id},'yuwen-tai');}

describe('赋役规则、分层执行与真实结案',()=>{
 it('清税预估和结算同源，核籍须详办且质量达标；急办不能伪造完成',()=>{
  const w=start(),t=prepare(w);const q=policyExecution(w,t,'thorough',115),base=policyExecution(w,t,'balanced');
  expect(actualEstatePolicy(w,'tianshui')).toBe('compact');expect(q.recovered).toBeGreaterThan(base.recovered);expect(q.applied).toBe(true);expect(policyExecution(w,t,'urgent').applied).toBe(false);expect(policyExecution(w,t,'thorough',95).applied).toBe(false);
  const money=w.realm!.treasuries.west.coins,order=w.realm!.cities.tianshui.order;complete(w,t);
  expect(actualEstatePolicy(w,'tianshui')).toBe('survey');expect(w.realm!.treasuries.west.coins-money).toBe(q.recovered);expect(w.realm!.cities.tianshui.order-order).toBe(q.order);
  expect(governanceRules(w,'west').reports!.tianshui).toMatchObject({task:t.id,issuer:'yuwen-tai',quality:115,recovered:q.recovered,applied:true,checkedDay:null});
  expect(parseWorld(serializeWorld(w))).toEqual(w);const settled=structuredClone(w);expect(()=>actService(w,{type:'service',action:'close',id:t.id},'yuwen-tai')).toThrow();expect(w).toEqual(settled);
 });
 it('改变赋役规则同时改变工期、收入与地方负担，未到任和审批等待不造进度',()=>{
  const w=start(),p={officer:'dugu-xin',helper:null,realm:'west' as const,site:'tianshui',kind:'taxation' as const};
  const values=(registration:'compact'|'survey'|'equalized')=>{governmentOf(w)!.rules!.registration=registration;return {...assignmentPlanQuote(w,p,'thorough'),...policyExecution(w,p,'thorough')};};
  const compact=values('compact'),survey=values('survey'),equalized=values('equalized');
  expect(compact.work).toBeLessThan(survey.work);expect(survey.work).toBeLessThan(equalized.work);expect(compact.recovered).toBeLessThan(survey.recovered);expect(survey.recovered).toBeLessThan(equalized.recovered);expect(equalized.order).toBeLessThan(compact.order);
 });
 it('在途案卷锁定原规则，新政策不改原预算、进度和结案口径',()=>{
  const w=start(),t=prepare(w),quote=assignmentPlanQuote(w,t,'thorough'),coins=w.realm!.treasuries.west.coins;
  const g=governmentOf(w)!;g.rules={...g.rules!,revision:2,registration:'equalized'};
  expect(assignmentPlanQuote(w,t,'thorough')).toEqual(quote);expect(w.realm!.treasuries.west.coins).toBe(coins);complete(w,t);
  expect(g.rules.reports!.tianshui).toMatchObject({revision:1,registration:'survey'});expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('呈报不等于独立查核；自己查自己、事前巡察、低质量核查不能盖过原报告',()=>{
  const w=start(),t=prepare(w);complete(w,t);const snapshot=structuredClone(w),report=governanceRules(w,'west').reports!.tianshui;
  const self=prepare(w,'inspection','thorough');complete(w,self);expect(report.checkedDay).toBeNull();
  const other=structuredClone(snapshot),i=prepare(other,'inspection','thorough','yuan-qin');
  const fake={...i,created:0,result:{day:other.day,success:true,reason:'',effects:[],awards:[]}};recordPolicyExecution(other,fake,0);expect(governanceRules(other,'west').reports!.tianshui.checkedDay).toBeNull();
  complete(other,i);const checked=governanceRules(other,'west').reports!.tianshui;expect(checked).toMatchObject({inspector:'yuan-qin',inspectionTask:i.id,checkedDay:other.day});expect(parseWorld(serializeWorld(other))).toEqual(other);
  const recorded=structuredClone(checked);recordPolicyExecution(other,i,0);expect(checked).toEqual(recorded);
  const low=structuredClone(snapshot),inspection=prepare(low,'inspection','thorough','yuan-qin');inspection.quality=95;complete(low,inspection);expect(governanceRules(low,'west').reports!.tianshui.checkedDay).toBeNull();
 });
 it('结案严格分开本案直接变化与同期环境，额度、支出与退款仍走原公库',()=>{
  const w=start(),t=prepare(w,'relief','balanced');w.realm!.cities.tianshui.order-=7;w.realm!.cities.tianshui.grain+=40;complete(w,t);
  expect(t.result!.direct).toMatchObject({order:14,grain:Math.floor(t.funds.grain*.75)});expect(t.result!.ambient).toMatchObject({order:-7,grain:40});
  for(const key of ['order','grain','prosperity','irrigation','building'] as const)expect(t.result!.direct![key]+t.result!.ambient![key]).toBe(t.result!.after![key]-t.baseline![key]);
  expect(t.spent).toEqual(t.funds);expect(t.result!.pressure).toBeDefined();expect(parseWorld(serializeWorld(w))).toEqual(w);
  t.result!.ambient!.order++;expect(()=>serializeWorld(w)).toThrow('存档');
 });
 it('旧案不补造政策执行报告或历史因果，不改变既有专款与工作量',()=>{
  const w=start(),t=prepare(w);delete t.policy;delete t.direct;const terms=structuredClone({funds:t.funds,required:t.required,progress:t.progress});
  const loaded=parseWorld(serializeWorld(w)),old=loaded.service!.tasks[0];expect({funds:old.funds,required:old.required,progress:old.progress}).toEqual(terms);
  expect(policyExecution(loaded,old,'thorough')).toMatchObject({work:0,order:-5,applied:false});complete(loaded,old);expect(governanceRules(loaded,'west').reports).toBeUndefined();expect(old.result!.direct).toBeUndefined();expect(old.result!.ambient).toBeUndefined();expect(parseWorld(serializeWorld(loaded))).toEqual(loaded);
 });
 it('县官请求延期仍由实际主管裁决，等待期间不改限期；越权、重复请求不产生半次写入',()=>{
  const w=start(),t=prepare(w,'relief','balanced'),deadline=t.deadline;
  actService(w,{type:'service',action:'request-extension',id:t.id},'dugu-xin');expect(t.deadline).toBe(deadline);expect(serviceAttention({...w,characterId:'yuwen-tai'})).toContain('task:'+t.id+':extension:0');
  const pending=structuredClone(w);expect(()=>actService(w,{type:'service',action:'extend',id:t.id},'dugu-xin')).toThrow('主管');expect(w).toEqual(pending);expect(()=>actService(w,{type:'service',action:'request-extension',id:t.id},'dugu-xin')).toThrow('已经');
  actService(w,{type:'service',action:'extend',id:t.id},'yuwen-tai');expect(t.deadline).toBe(deadline+30);expect(t.extension).toMatchObject({decidedBy:'yuwen-tai',approved:true});expect(t.quality).toBe(95);expect(parseWorld(serializeWorld(w))).toEqual(w);
  const denied=start(),d=prepare(denied,'relief','balanced');actService(denied,{type:'service',action:'request-extension',id:d.id},'dugu-xin');denied.day=1;advanceService(denied);expect(d.extension!.approved).toBe(false);expect(d.extended).toBeUndefined();
 });
 it('中央职掌只能按对口职责委派；离任、离都或名义君主不能沿用权限与预算',()=>{
  const w=start(),g=governmentOf(w)!;g.court!.ministries.finance='yuan-qin';
  expect(canCommission(w,'yuan-qin','west','tianshui','taxation')).toBe(true);expect(canCommission(w,'yuan-qin','west','tianshui','training')).toBe(false);expect(canCommission(w,'yuan-baoju','west','tianshui','taxation')).toBe(false);
  const t={realm:'west' as const,site:'tianshui',kind:'taxation' as const,officer:'dugu-xin',mandate:{issuer:'yuan-qin',automatic:false,orderFloor:40,qualityFloor:85,reserve:0}};
  expect(serviceApprover(w,t)).toBe('yuan-qin');expect(servicePayer(w,t)).toEqual({account:'central:west',grainSite:null});
  w.mobility!.residences['yuan-qin'].site='tianshui';expect(canCommission(w,'yuan-qin','west','tianshui','taxation')).toBe(false);expect(serviceApprover(w,t)).not.toBe('yuan-qin');
 });
 it('存档拒绝无效政策、直接变化、查核人与延期元数据；损坏空任务返回失败',()=>{
  const w=start(),t=prepare(w);const broken=structuredClone(w.service!);broken.tasks=[null as unknown as Assignment];expect(validService(broken,w.day,w.mode,w)).toBe(false);
  const invalid=structuredClone(w.service!);invalid.tasks[0].policy!.revision=0;expect(validService(invalid,w.day,w.mode,w)).toBe(false);
  t.direct={order:NaN,grain:0,prosperity:0,irrigation:0,building:0};expect(()=>serializeWorld(w)).toThrow('存档');delete t.direct;
  complete(w,t);const rules=governanceRules(w,'west'),report=rules.reports!.tianshui;report.checkedDay=w.day;report.inspector=report.officer;report.inspectionTask=2;expect(validGovernanceRules(rules,w.day)).toBe(false);
 });
});
