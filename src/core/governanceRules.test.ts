import {describe,it,expect} from 'vitest';
import {newCampaignWorld,act} from './world';
import {governmentOf,governmentReason,advanceGovernments} from './government';
import {governanceRules,validGovernanceRules} from './governanceRules';
import {appointmentEvaluation} from './appointmentRules';
import {makeAppointmentRound,appointmentFactors,appointmentReason} from './appointmentCycle';
import {localMeritFactors,countyTerritory,candidateReason} from './localAdministration';
import {courtOf,courtMonthPreview,advanceCourts,courtPhaseAfter,courtLocalPressures,ministryPerformance,courtBonus,courtReason} from './court';
import {pauseSnapshot,pauseEvents} from './pauseEvents';
import {politicalAction,enactPoliticalAction} from './politicalActions';
import {recommendedPriority} from './assignments';
import {validCourt} from './courtSave';
import {nextMonthStart} from './calendar';
import {parseWorld,serializeWorld} from './save';
import {relationshipPeople} from '../data/relationships';
import {attributes} from './social';
import {presentAt} from './residence';

function ready(id='xiao-yan'){
 const w=newCampaignWorld(id,undefined,'sandbox');w.realm!.influence=500;
 for(const r of ['liang','east','west'] as const){const g=governmentOf(w,r)!;g.support=80;g.legitimacy=80;w.realm!.treasuries[r].coins=10000;w.realm!.treasuries[r].grain=10000;}
 return w;
}
describe('国家治理准则、月結与可追溯反馈',()=>{
 it('三国按既有法令初始化；旧档只补规则，保持资产与历史，迁移幂等',()=>{
  const w=ready();expect(governanceRules(w,'liang')).toMatchObject({appointment:'lineage',access:'patronage',registration:'compact'});
  expect(governanceRules(w,'east').appointment).toBe('selection');expect(governanceRules(w,'west')).toMatchObject({appointment:'assessment',access:'trial',registration:'survey'});
  for(const g of Object.values(w.realm!.governments!.realms))delete g.rules;
  const assets=structuredClone({people:w.people,treasuries:w.realm!.treasuries,holdings:w.holdings,offices:w.realm!.offices,history:w.realm!.governments!.history});
  const loaded=parseWorld(serializeWorld(w));expect({people:loaded.people,treasuries:loaded.realm!.treasuries,holdings:loaded.holdings,offices:loaded.realm!.offices,history:loaded.realm!.governments!.history}).toEqual(assets);
  expect(governanceRules(loaded,'west').reports).toBeUndefined();expect(courtOf(loaded)!.settlement).toBeUndefined();expect(parseWorld(serializeWorld(loaded))).toEqual(loaded);
 });
 it('同组候选人在不同准则下排序改变；地方评价与三年铨选复用逐职公式',()=>{
  const w=ready(),g=governmentOf(w)!;w.families!.prestige['xiao-gang']=500;
  const people=relationshipPeople.filter(p=>p.realm==='liang'&&p.adult&&p.id!=='xiao-yan');
  const rank=(policy:'lineage'|'assessment')=>{g.rules!.appointment=policy;return people.map(p=>({id:p.id,score:appointmentEvaluation(w,'liang',p.id,{ministry:'secretariat'},'xiao-yan').score})).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).map(p=>p.id);};
  expect(rank('lineage')).not.toEqual(rank('assessment'));
  const t=countyTerritory('jiankang'),evaluation=appointmentEvaluation(w,'liang','xiao-gang',{territory:t,site:'jiankang'},'xiao-yan');
  expect(localMeritFactors(w,t,'xiao-gang','xiao-yan','liang').reduce((n,p)=>n+p.value,0)).toBe(evaluation.score+20-evaluation.threshold);
  const round=makeAppointmentRound(w,'liang');for(const row of round.rows)if(row.candidate)expect(row.factors).toEqual(appointmentFactors(w,row.candidate,'liang',row.territory).factors);
  w.realm!.local!.cycle={lastYear:round.year,rounds:{liang:round}};g.rules!.revision++;
  expect(appointmentReason(w,{type:'appointments',action:'approve',realm:'liang',year:round.year})).toContain('重新编制');
 });
 it('低资历不等于腐败；已到任的对口能力可以产生实际职掌增益',()=>{
  const w=ready(),g=governmentOf(w)!,c=courtOf(w)!;const candidate=relationshipPeople.find(p=>p.realm==='liang'&&p.id!=='xiao-yan'&&presentAt(w,p.id,'jiankang')&&attributes(w,p.id).stewardship>=10&&!courtReason(w,{type:'court',action:'appoint',ministry:'finance',candidate:p.id}))!.id;g.merit[candidate]=0;
  act(w,{type:'court',action:'appoint',ministry:'finance',candidate});
  expect(c.corruption).toBe(0);expect(ministryPerformance(w,'liang','finance').score).toBeGreaterThanOrEqual(10);expect(courtBonus(w,'liang').tax).toBe(8);
  w.mobility!.residences[candidate].site='xunyang';w.mobility!.residences[candidate].journey=null;
  expect(ministryPerformance(w,'liang','finance').reason).toContain('都城');expect(courtBonus(w,'liang').tax).toBe(0);
 });
 it('后期考课法令的资格门槛约束所有新任路径，不能以试任或执政权绕过',()=>{
  const w=ready('gao-huan'),g=governmentOf(w)!;g.laws.push('east-assessment');g.rules!.access='trial';g.merit['gao-yang']=0;
  expect(appointmentEvaluation(w,'east','gao-yang',{ministry:'finance'}).ordinary).toBe(false);
  expect(courtReason(w,{type:'court',action:'appoint',ministry:'finance',candidate:'gao-yang'})).toContain('功绩至少 20');
  expect(candidateReason(w,countyTerritory('ye'),'gao-yang','east')).toContain('功绩至少 20');
 });
 it('条件预估不写入世界，计入下月到期的动员，实际月结使用同一计算顺序',()=>{
  const w=ready(),c=courtOf(w)!;c.boosts['xiao-gang']={until:10,power:25};c.tension=39;c.corruption=12;
  const before=structuredClone(w),q=courtMonthPreview(w,'liang');expect(w).toEqual(before);
  w.day=nextMonthStart(w.day,w.scriptId);advanceCourts(w);
  expect(c.tension).toBe(q.tension);expect(c.phase).toBe(q.phase);expect(c.corruption).toBe(q.corruption);expect(governmentOf(w)!.support).toBe(q.support);expect(c.boosts['xiao-gang']).toBeUndefined();
  expect(c.settlement!.causes).toEqual(q.causes);const settled=structuredClone(w);advanceCourts(w);expect(w).toEqual(settled);
 });
 it('进入动荡暂停一次，恢复、他国变化和读档不重播；退出阈值抑制临界抖动',()=>{
  const w=ready(),c=courtOf(w)!;c.tension=55;const before=pauseSnapshot(w);w.day=nextMonthStart(w.day,w.scriptId);advanceCourts(w);
  const notices=pauseEvents(before,w).filter(e=>e.kind==='situation');expect(notices).toHaveLength(1);expect(notices[0].body).toContain('主要原因');expect(notices[0].body).toContain('任官与赋役规则继续有效');
  expect(pauseEvents(pauseSnapshot(w),w).filter(e=>e.kind==='situation')).toEqual([]);
  const loaded=parseWorld(serializeWorld(w));expect(pauseEvents(pauseSnapshot(loaded),loaded).filter(e=>e.kind==='situation')).toEqual([]);
  const foreign=ready(),snapshot=pauseSnapshot(foreign);courtOf(foreign,'east')!.tension=85;foreign.day=31;advanceCourts(foreign);expect(pauseEvents(snapshot,foreign).some(e=>e.kind==='situation')).toBe(false);
  expect(courtPhaseAfter('strained',36,80)).toBe('strained');expect(courtPhaseAfter('strained',34,80)).toBe('stable');expect(courtPhaseAfter('chaos',71,80)).toBe('chaos');expect(courtPhaseAfter('chaos',69,80)).toBe('strained');
 });
 it('地方压力按人口范围归一，缺粮与失序不重复相加，大国不会按县数倍增',()=>{
  const w=ready(),cities=Object.entries(w.realm!.cities).filter(([,c])=>c.owner==='liang'&&c.controller==='liang');
  for(const [,c] of cities){c.population=1000;c.order=100;c.grain=1000000;}
  const bad=cities[0][1];bad.population=900000;bad.order=0;const large=courtLocalPressures(w,'liang').pressure;bad.population=100;
  expect(courtLocalPressures(w,'liang').pressure).toBeLessThan(large);
  for(const c of Object.values(w.realm!.cities)){c.owner='liang';c.controller='liang';c.order=0;c.grain=0;}
  expect(courtLocalPressures(w,'liang').pressure).toBe(8);
 });
 it('政策议程按原改革权限付款一次，颁行才换版本；取消不改现行规则',()=>{
  const w=ready('yuwen-tai'),g=governmentOf(w)!,rules=structuredClone(g.rules!);const cmd={type:'government',action:'policy',dimension:'access',policy:'sponsorship'} as const;
  const coins=w.realm!.treasuries.west.coins,influence=w.realm!.influence;expect(governmentReason(w,cmd)).toBe('');act(w,cmd);
  expect(g.rules).toEqual(rules);expect(w.realm!.treasuries.west.coins).toBe(coins-100);expect(w.realm!.influence).toBe(influence-20);
  const pending=structuredClone(w);expect(()=>act(w,cmd)).toThrow();expect(w).toEqual(pending);
  act(w,{type:'government',action:'cancel'});expect(g.rules).toEqual(rules);expect(w.realm!.treasuries.west.coins).toBe(coins-100);
  act(w,cmd);g.support=80;g.task!.progress=59;w.day=60;advanceGovernments(w);expect(g.rules).toMatchObject({access:'sponsorship',revision:2,since:60});expect(g.task).toBeNull();
  const lower=ready('dugu-xin');expect(governmentReason(lower,cmd)).toContain('执政权');
 });
 it('同类事项按地点、规模与手段产生不同反馈，后续规模可累计且重复来源幂等',()=>{
  const w=ready(),context={source:'test:first',site:'jiankang',actor:'xiao-gang',authorizer:'xiao-yan',stage:'commitment' as const,scale:.25,plan:'urgent' as const};
  expect(politicalAction(w,'liang','tax',context).parts).not.toEqual(politicalAction(w,'liang','tax',{...context,plan:'thorough'}).parts);
  enactPoliticalAction(w,'liang','tax',context);const first=structuredClone(w);expect(enactPoliticalAction(w,'liang','tax',context)).toBeUndefined();expect(w).toEqual(first);
  const next=enactPoliticalAction(w,'liang','tax',{...context,source:'test:second',scale:1});expect(next!.scale).toBe(1);
  enactPoliticalAction(w,'liang','tax',{...context,source:'test:third',scale:2});const exhausted=enactPoliticalAction(w,'liang','tax',{...context,source:'test:fourth',scale:2});expect(exhausted).toMatchObject({scale:0,support:0,tension:0});
  expect(enactPoliticalAction(w,'liang','tax',{...context,source:'test:other-place',site:'xunyang',scale:1})!.scale).toBe(1);
  expect(validCourt(w,'liang')).toBe(true);expect(parseWorld(serializeWorld(w))).toEqual(w);
  w.day=30;expect(enactPoliticalAction(w,'liang','tax',{...context,source:'test:new-window',scale:1})!.scale).toBe(1);
 });
 it('新增规则与影响元数据拒绝伪造，失败不产生补款或追溯履历',()=>{
  const w=ready(),rules=structuredClone(governanceRules(w,'liang'));expect(validGovernanceRules({...rules,registration:'invented'},w.day)).toBe(false);
  expect(validGovernanceRules({...rules,revision:0},w.day)).toBe(false);expect(validGovernanceRules({...rules,reports:{unknown:{}}},w.day)).toBe(false);
  const c=courtOf(w)!;c.politicalWindows={'tax|jiankang|commitment':{until:30,used:3,support:0,opposition:0}};expect(validCourt(w,'liang')).toBe(false);
 });
 it('规则选项有不同集团取舍，季议在急务之外承接施政方向',()=>{
  const w=ready(),context={source:'policy-preview',dimension:'access' as const};
  expect(politicalAction(w,'liang','appointment',{...context,rule:'patronage'}).parts).not.toEqual(politicalAction(w,'liang','appointment',{...context,rule:'trial'}).parts);
  for(const c of Object.values(w.realm!.cities))if(c.owner==='liang'){c.order=100;c.prosperity=100;}
  courtOf(w)!.policy='expansion';expect(recommendedPriority(w,'liang')).toBe('military');courtOf(w)!.policy='reform';expect(recommendedPriority(w,'liang')).toBe('economy');
  w.realm!.cities.jiankang.order=30;expect(recommendedPriority(w,'liang')).toBe('stability');
 });
 it('拆成小份不会增加同一窗口的政治收益，账簿裁剪后封顶仍有效',()=>{
  const once=ready(),split=ready(),context={site:'jiankang',plan:'balanced' as const,stage:'execution' as const};
  enactPoliticalAction(once,'liang','tax',{...context,source:'once',scale:2});for(let i=0;i<8;i++)enactPoliticalAction(split,'liang','tax',{...context,source:'split:'+i,scale:.25});
  expect(governmentOf(split)!.support).toBe(governmentOf(once)!.support);expect(courtOf(split)!.tension).toBe(courtOf(once)!.tension);
  courtOf(split)!.impacts=[];expect(enactPoliticalAction(split,'liang','tax',{...context,source:'after-trim',scale:1})!.scale).toBe(0);
 });
});
