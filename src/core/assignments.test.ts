import {presentAt} from './residence';
import {describe,it,expect} from 'vitest';
import {newCampaignWorld,act,advance} from './world';
import {actService,advanceService,assignmentBudget,assignmentEffort,assignmentPause,serviceAttention,serviceReason,serviceTask,serviceChief,serviceRealm,careerStanding,type Assignment,type ServiceCommand} from './assignments';
import {type AssignmentKind} from '../data/assignments';
import {parseWorld,serializeWorld,validateWorld} from './save';
import {governmentOf} from './government';
import {lifeOf} from './lifeState';
import {die} from './life';
import {diplomaticPair} from './diplomacy';
const start=(id='dugu-xin')=>{const w=newCampaignWorld(id,undefined,'sandbox');act(w,{type:'service',action:'begin'});return w;};
const tick=(w:ReturnType<typeof start>)=>{if(w.realm!.event)act(w,{type:'realm',action:'event',choice:'decline'});advance(w);};
function drive(w:ReturnType<typeof start>,id:number){for(let i=0;i<160;i++){const t=serviceTask(w,id)!;if(t.phase==='closed')return t;const chief=serviceChief(w,t.realm)===w.characterId;let c:ServiceCommand|undefined;
 if(chief&&['petition','approval'].includes(t.phase))c={type:'service',action:'approve',id};
 if(chief&&t.phase==='aid')c={type:'service',action:'grant',id};
 if(chief&&t.phase==='report')c={type:'service',action:'close',id};
 if(t.officer===w.characterId){if(t.phase==='proposal')c={type:'service',action:'plan',id,plan:'balanced'};if(t.phase==='ready')c={type:'service',action:'start',id};if(t.phase==='incident')c={type:'service',action:'delay',id};}
 if(c&&!serviceReason(w,c))act(w,c);tick(w);validateWorld(w);
 }throw new Error('case did not close');}
const open=(w:ReturnType<typeof start>,kind:AssignmentKind='relief',site='tianshui',officer='dugu-xin')=>{act(w,{type:'service',action:'open',kind,site,officer});return w.service!.tasks.at(-1)!;};
const prepared=(kind:AssignmentKind='relief')=>{const w=start(),t=open(w,kind);actService(w,{type:'service',action:'approve',id:t.id},'yuwen-tai');act(w,{type:'service',action:'plan',id:t.id,plan:'balanced'});actService(w,{type:'service',action:'approve',id:t.id},'yuwen-tai');act(w,{type:'service',action:'start',id:t.id});return {w,t};};
describe('general appointments and service lifecycle',()=>{
 it.each([['xiao-yan','xiao-yi','xunyang'],['gao-huan','gao-yang','ye'],['yuwen-tai','dugu-xin','tianshui']])('chief %s completes appointments with NPC officials', (chief,officer,site)=>{
  const w=start(chief),t=open(w,'relief',site,officer),coins=w.people[0].coins;
  const result=drive(w,t.id);expect(result.result?.success).toBe(true);expect(result.result?.awards.some(a=>a.person===officer&&a.merit>0)).toBe(true);expect(w.people[0].coins).toBeGreaterThanOrEqual(coins);expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it.each([['xiao-yi','xunyang'],['gao-yang','ye'],['dugu-xin','tianshui']])('officer %s requests work and receives NPC approvals',(id,site)=>{const w=start(id),t=open(w,'agriculture',site,id);expect(t.phase).toBe('petition');expect(drive(w,t.id).result?.success).toBe(true);expect(w.service!.careers[id].economy).toBe(1);});
 it('uses one actor capacity, one seasonal task slot and authority checks',()=>{
  const w=start(),t=open(w);expect(()=>open(w,'commerce')).toThrow('承办人');expect(()=>act(w,{type:'service',action:'approve',id:t.id})).toThrow('执政');
  act(w,{type:'service',action:'cancel',id:t.id});expect(()=>open(w)).toThrow('本季');
  expect(()=>act(w,{type:'service',action:'open',kind:'relief',site:'ye',officer:'dugu-xin'})).toThrow('本国');
  expect(()=>act(w,{type:'service',action:'open',kind:'commerce',site:'tianshui',officer:'yuan-qin'})).toThrow('自荐');
 });
 it('keeps public funds separate, refuses repeated payment and refunds unspent allocations',()=>{
  const w=start(),t=open(w);actService(w,{type:'service',action:'approve',id:t.id},'yuwen-tai');act(w,{type:'service',action:'plan',id:t.id,plan:'thorough'});
  const personal=w.people[0].coins,b=assignmentBudget('relief','thorough'),money=w.realm!.treasuries.west.coins;
  actService(w,{type:'service',action:'approve',id:t.id},'yuwen-tai');expect(w.realm!.treasuries.west.coins).toBe(money-b.coins);expect(w.people[0].coins).toBe(personal);
  expect(()=>actService(w,{type:'service',action:'approve',id:t.id},'yuwen-tai')).toThrow();actService(w,{type:'service',action:'cancel',id:t.id},'yuwen-tai');expect(w.realm!.treasuries.west.coins).toBe(money);
  const next=prepared();const balance=next.w.realm!.treasuries.west.coins;actService(next.w,{type:'service',action:'cancel',id:next.t.id},'yuwen-tai');expect(next.w.realm!.treasuries.west.coins).toBe(balance+next.t.funds.coins);validateWorld(next.w);
 });
 it('refuses insufficient budget without mutation',()=>{const w=start(),t=open(w);actService(w,{type:'service',action:'approve',id:t.id},'yuwen-tai');act(w,{type:'service',action:'plan',id:t.id,plan:'urgent'});w.realm!.treasuries.west.coins=0;const before=structuredClone(w);expect(()=>actService(w,{type:'service',action:'approve',id:t.id},'yuwen-tai')).toThrow('公库');expect(w).toEqual(before);});
 it('lets helpers accept, makes abilities and relationships affect actual progress, and records contribution',()=>{
  const {w,t}=prepared();const base=assignmentEffort(w,t).total;
  act(w,{type:'service',action:'invite',id:t.id,person:'yuan-qin'});actService(w,{type:'service',action:'accept',id:t.id},'yuan-qin');expect(assignmentEffort(w,t).total).toBe(base);for(let i=0;i<100&&!presentAt(w,'yuan-qin',t.site);i++)tick(w);expect(assignmentEffort(w,t).total).toBeGreaterThan(base);
  w.social!.opinions['dugu-xin|yuan-qin']=90;const friendly=assignmentEffort(w,t).total;w.social!.opinions['dugu-xin|yuan-qin']=-90;expect(assignmentEffort(w,t).total).toBeLessThan(friendly);
  if(t.phase==='incident')act(w,{type:'service',action:'delay',id:t.id});tick(w);expect(t.contributors['yuan-qin'].support).toBeGreaterThan(0);const saved=parseWorld(serializeWorld(w));expect(saved).toEqual(w);
  const result=drive(w,t.id);expect(result.result?.awards.find(a=>a.person==='yuan-qin')?.merit).toBeGreaterThan(0);expect(result.result?.awards.find(a=>a.person==='yuan-qin')?.prestige).toBe(5);
 });
 it('supports rejection and withdrawal without erasing prior contribution',()=>{const {w,t}=prepared();act(w,{type:'service',action:'invite',id:t.id,person:'yuan-qin'});actService(w,{type:'service',action:'decline',id:t.id},'yuan-qin');expect(t.helper).toBeNull();expect(()=>act(w,{type:'service',action:'invite',id:t.id,person:'yuan-qin'})).toThrow();act(w,{type:'service',action:'invite',id:t.id,person:'yuan-baoju'});actService(w,{type:'service',action:'accept',id:t.id},'yuan-baoju');for(let i=0;i<100&&!presentAt(w,'yuan-baoju',t.site);i++)tick(w);if(t.phase==='incident')act(w,{type:'service',action:'delay',id:t.id});tick(w);const contribution=t.contributors['yuan-baoju'].support;actService(w,{type:'service',action:'withdraw',id:t.id},'yuan-baoju');expect(t.contributors['yuan-baoju'].support).toBe(contribution);});
 it('pauses work during serious illness and travel and invalidates lost office mandates',()=>{
  const {w,t}=prepared();lifeOf(w,'dugu-xin')!.illness={kind:'fever',since:0,severity:3};tick(w);expect(t.progress).toBe(0);expect(assignmentPause(w,t)).toContain('重病');lifeOf(w,'dugu-xin')!.illness=null;
  act(w,{type:'travel',destination:'changan'});tick(w);expect(t.progress).toBe(0);expect(assignmentPause(w,t)).toContain('出行');
  governmentOf(w,'west')!.dynasty='zhou';expect(assignmentPause(w,t)).toContain('原职');
 });
 it('does not transfer the entire reward to a last-minute replacement',()=>{
  const {w,t}=prepared();for(let i=0;i<5;i++)tick(w);const contribution=t.contributors['dugu-xin'].lead;
  actService(w,{type:'service',action:'replace',id:t.id,person:'yuan-qin'},'yuwen-tai');expect(t.contributors['dugu-xin'].lead).toBe(contribution);
  const result=drive(w,t.id);expect(result.result?.awards.find(a=>a.person==='dugu-xin')?.merit).toBeGreaterThan(0);expect(result.result?.awards.find(a=>a.person==='yuan-qin')?.merit).toBeLessThanOrEqual(24);expect(result.result?.awards.reduce((n,a)=>n+a.merit,0)).toBeLessThanOrEqual(30);
 });
 it('expires blocked tasks, avoids double progress or rewards, and rejects posthumous execution',()=>{const {w,t}=prepared();tick(w);const progress=t.progress;advanceService(w);expect(t.progress).toBe(progress);w.realm!.cities.tianshui.controller='east';expect(assignmentPause(w,t)).toContain('控制');w.day=t.deadline;advanceService(w);expect(t.result?.success).toBe(false);const before=structuredClone(w);advanceService(w);expect(w).toEqual(before);expect(()=>act(w,{type:'service',action:'close',id:t.id})).toThrow();});
 it('supports periodic councils, petitions and career efficiency progression',()=>{
  const w=start();act(w,{type:'service',action:'priority',priority:'military'});tick(w);tick(w);expect(w.service!.councils.west.priority).toBe('military');expect(()=>act(w,{type:'service',action:'priority',priority:'economy'})).toThrow('本季');
  w.service!.careers['dugu-xin'].military=3;expect(careerStanding(w,'dugu-xin','military').bonus).toBe(2);
  while(w.day<90)tick(w);expect(w.service!.councils.west.season).toBe(1);expect(w.service!.councils.west.lastResult).toContain('上季');expect(w.service!.councils.west.petitioned).toEqual([]);validateWorld(w);
 });
 it('keeps the accepted pilot playable and excludes its officer from other assignments',()=>{const w=newCampaignWorld('dugu-xin',undefined,'sandbox');act(w,{type:'duty',action:'open'});act(w,{type:'service',action:'begin'});expect(()=>open(w)).toThrow('承办人');expect(w.duties?.task?.phase).toBe('proposal');const other=prepared();expect(()=>act(other.w,{type:'duty',action:'open'})).toThrow('另一项');});
 it('migrates old saves without retroactive work and rejects malformed task data',()=>{
  const old=newCampaignWorld('dugu-xin',undefined,'sandbox');delete old.service;old.day=181;const loaded=parseWorld(serializeWorld(old));expect(loaded.service?.since).toBe(181);expect(loaded.service?.enabled).toBe(false);expect(loaded.service?.tasks).toEqual([]);
  for(const mutate of [(t:Assignment)=>{t.progress++;},(t:Assignment)=>{t.officer='gao-huan';},(t:Assignment)=>{t.funds.coins++;},(t:Assignment)=>{t.phase='report';},(t:Assignment)=>{t.deadline++;}]){const {w,t}=prepared();mutate(t);expect(()=>serializeWorld(w)).toThrow('存档');}
 });
 it('creates NPC proposals and invites the player without deciding for them',()=>{const w=start('yuan-baoju');for(let i=0;i<22;i++)tick(w);expect(w.service!.tasks.some(t=>t.officer!=='yuan-baoju')).toBe(true);expect(w.service!.tasks.some(t=>t.invitation?.person==='yuan-baoju')).toBe(true);expect(serviceAttention(w).some(k=>k.startsWith('invite:'))).toBe(true);validateWorld(w);});
 it('death requires reassignment and does not break subsequent saves',()=>{const w=start('yuwen-tai'),t=open(w);die(w,'dugu-xin','age');expect(assignmentPause(w,t)).toContain('已故');act(w,{type:'service',action:'replace',id:t.id,person:'yuan-qin'});expect(t.officer).toBe('yuan-qin');validateWorld(w);});
 it.each(['commerce','inspection','envoy','training','supply'] as const)('completes %s with its real world effect',kind=>{
  const w=start('yuwen-tai');if(kind==='training'||kind==='supply')w.realm!.armies.push({realm:'west',location:'tianshui',troops:300,morale:60,supply:60,journey:null,siege:0});
  act(w,{type:'service',action:'open',kind,site:'tianshui',officer:'dugu-xin',...(kind==='envoy'?{target:'liang' as const}:{})});const t=w.service!.tasks.at(-1)!,result=drive(w,t.id);expect(result.result?.success).toBe(true);expect(result.result?.effects.length).toBeGreaterThan(0);
  if(kind==='envoy'){expect(w.diplomacy!.missions.some(m=>m.from==='west'&&m.to==='liang'&&m.action==='improve')).toBe(true);expect(diplomaticPair(w,'west','liang')!.treaties).toEqual([]);}validateWorld(w);
 });
 it('runs several seasons deterministically with bounded archives and valid daily saves',()=>{
  const initial=start('gao-huan');const saved=serializeWorld(initial);
  const run=(w:ReturnType<typeof start>)=>{for(let day=0;day<370;day++){
    const r=w.characterId?serviceRealm(w.characterId):undefined;if(!r||w.campaign?.status!=='active')break;
    const council=w.service!.councils[r];if(serviceChief(w,r)===w.characterId&&!council.decided)act(w,{type:'service',action:'priority',priority:'economy'});
    for(const t of w.service!.tasks){if(t.phase==='closed')continue;let cmd:ServiceCommand|undefined;
      if(t.invitation?.person===w.characterId)cmd={type:'service',action:'decline',id:t.id};
      else if(serviceChief(w,t.realm)===w.characterId){if(['petition','approval'].includes(t.phase))cmd={type:'service',action:'approve',id:t.id};if(t.phase==='aid')cmd={type:'service',action:'deny',id:t.id};if(t.phase==='report')cmd={type:'service',action:'close',id:t.id};}
      if(cmd&&!serviceReason(w,cmd))act(w,cmd);
    }tick(w);validateWorld(w);
  }return w;};
  const a=run(parseWorld(saved)),b=run(parseWorld(saved));expect(a).toEqual(b);expect(a.service!.councils.east.season).toBeGreaterThanOrEqual(3);expect(a.service!.tasks.filter(t=>t.result?.success).length).toBeGreaterThan(5);expect(a.service!.tasks.length).toBeLessThanOrEqual(64);
 });
 it('rejects mutated contribution totals, council proposals and reward ledgers',()=>{
  const {w,t}=prepared();drive(w,t.id);
  const mutations=[(v:typeof w)=>{v.service!.tasks[0].contributors['dugu-xin'].lead++;},(v:typeof w)=>{v.service!.councils.west.petitioned=['gao-huan'];},(v:typeof w)=>{v.service!.tasks[0].result!.awards[0].merit=500;},(v:typeof w)=>{v.service!.nextId=1;}];
  for(const mutate of mutations){const bad=structuredClone(w);mutate(bad);expect(()=>serializeWorld(bad)).toThrow();}
 });

});
