import {describe,it,expect,vi} from 'vitest';
import {newCampaignWorld,act} from './world';
import {actService,advanceService,serviceTask,serviceReason,serviceAttention} from './assignments';
import {countyTerritory,setLocalHolder,localAncestors} from './localAdministration';
import {serviceApprover,canCommission,settleServiceRefund,serviceException} from './serviceMandates';
import {territoryAccount,ensureFiscal,publicBalance,actFiscal,fiscalReason,localBalance} from './treasury';
import {realmReason} from './realm';
import {buildQuote} from './construction';
import {governmentOf} from './government';
import {parseWorld,serializeWorld,validateWorld} from './save';
function setup(){
 const w=newCampaignWorld('xiao-yan',undefined,'sandbox');actService(w,{type:'service',action:'begin'});
 const site='xunyang',r='liang' as const,t=localAncestors(countyTerritory(site)).find(n=>n.level==='prefecture')!.id;
 setLocalHolder(w,t,r,'xiao-yi');
 const account=territoryAccount(w,r,t);ensureFiscal(w)!.balances[account]=500;w.realm!.cities[site].grain=500;
 actService(w,{type:'service',action:'open',site,kind:'relief',officer:'chen-baxian'},'xiao-yi');
 const task=w.service!.tasks.at(-1)!;actService(w,{type:'service',action:'plan',id:task.id,plan:'balanced'},'chen-baxian');
 return {w,task,account,site,t};
}
describe('scoped service mandates',()=>{
 it('initializes the rules from the shared-duty entry and retains finance commissioning permissions',async()=>{
  vi.resetModules();
  const duties=await import('./officialDuties'),mandates=await import('./serviceMandates'),world=await import('./world');
  const w=world.newCampaignWorld('xiao-yan',undefined,'sandbox');w.realm!.governments!.realms.liang.court!.ministries.finance='xiao-gang';
  expect(duties.dutyMinistries.taxation).toContain('finance');
  expect(mandates.canCommission(w,'xiao-gang','liang','jiankang','taxation')).toBe(true);
  expect(mandates.canCommission(w,'xiao-gang','liang','jiankang','relief')).toBe(true);
  expect(mandates.canCommission(w,'xiao-gang','liang','jiankang','training')).toBe(false);
 });
 it('actual ruler orders local tax and relief without taking the county seat, while a figurehead cannot',()=>{
  const w=newCampaignWorld('xiao-yan',undefined,'sandbox'),site='jiankang';setLocalHolder(w,countyTerritory(site),'liang','xiao-gang');
  w.realm!.cities[site].grain=50;ensureFiscal(w)!.balances['liang|city:'+site]=20;
  const tax={type:'realm',action:'tax',site,tax:'heavy'} as const,grain={type:'realm',action:'relief',site} as const;
  expect(realmReason(w,tax)).toBe('');act(w,tax);expect(w.realm!.cities[site].tax).toBe('heavy');
  expect(realmReason(w,grain)).toBe('');act(w,grain);expect(w.realm!.cities[site].grain).toBe(0);
  const center=w.realm!.treasuries.liang.coins,privateCoins=w.people[0].coins;
  expect(fiscalReason(w,{type:'fiscal',action:'relief',site})).toBe('');act(w,{type:'fiscal',action:'relief',site});
  expect(localBalance(w,site)).toBe(0);expect(w.realm!.treasuries.liang.coins).toBe(center);expect(w.people[0].coins).toBe(privateCoins);
  expect(realmReason(w,{...tax,site:'changan'})).not.toBe('');
  governmentOf(w)!.executives=['chen-baxian'];expect(realmReason(w,{...tax,tax:'light'})).not.toBe('');
  const nominal=newCampaignWorld('yuan-shanjian',undefined,'sandbox');expect(realmReason(nominal,{type:'realm',action:'tax',site:'ye',tax:'heavy'})).not.toBe('');
 });
 it('prefect spends only the county wallet for relief and loses authority after dismissal',()=>{
  const {w,site,t}=setup();ensureFiscal(w)!.balances['liang|city:'+site]=20;
  const central=w.realm!.treasuries.liang.coins,cmd={type:'fiscal',action:'relief',site} as const;
  expect(fiscalReason(w,cmd,'xiao-yi')).toBe('');actFiscal(w,cmd,'xiao-yi');expect(localBalance(w,site)).toBe(0);expect(w.realm!.treasuries.liang.coins).toBe(central);
  setLocalHolder(w,t,'liang',null);expect(fiscalReason(w,cmd,'xiao-yi')).not.toBe('');expect(fiscalReason(w,{...cmd,site:'changan'},'xiao-yi')).not.toBe('');
 });
 it('superior commissions construction with a plan, pays the real treasury, and can direct execution without taking credit',()=>{
  const w=newCampaignWorld('xiao-yan',undefined,'sandbox'),site='jiankang';setLocalHolder(w,countyTerritory(site),'liang','xiao-gang');
  act(w,{type:'service',action:'begin'});const command={type:'service',action:'open',kind:'marketworks',site,officer:'xiao-gang',plan:'balanced'} as const;
  expect(serviceReason(w,command)).toBe('');const center=w.realm!.treasuries.liang.coins,privateCoins=w.people[0].coins;
  act(w,command);const task=w.service!.tasks.at(-1)!;expect(task.phase).toBe('approval');expect(task.mandate?.issuer).toBe('xiao-yan');
  expect(buildQuote(w,{type:'build',scope:'city',site,building:'granary'}).reason).toContain('营建差事');
  expect(serviceReason(w,command)).not.toBe('');act(w,{type:'service',action:'approve',id:task.id});
  expect(w.realm!.treasuries.liang.coins).toBe(center-task.funds.coins);expect(w.people[0].coins).toBe(privateCoins);
  expect(serviceReason(w,{type:'service',action:'start',id:task.id})).toBe('');act(w,{type:'service',action:'start',id:task.id});
  task.phase='incident';const stress=w.social!.stress,required=task.required,preGrant=w.realm!.treasuries.liang.coins;
  act(w,{type:'service',action:'grant',id:task.id});expect(w.realm!.treasuries.liang.coins).toBe(preGrant-20);
  expect(()=>act(w,{type:'service',action:'grant',id:task.id})).toThrow();
  act(w,{type:'service',action:'strain',id:task.id});expect(task.required).toBe(required+30);expect(w.social!.stress).toBe(stress);
  expect(task.contributors['xiao-yan']).toBeUndefined();validateWorld(w);
  governmentOf(w)!.executives=['chen-baxian'];expect(serviceReason(w,{type:'service',action:'cancel',id:task.id})).not.toBe('');
 });
 it('uses local supervisor and real local budget, refunds the same wallet',()=>{
  const {w,task,account,site}=setup(),central=w.realm!.treasuries.liang.coins;
  expect(serviceApprover(w,task)).toBe('xiao-yi');expect(canCommission(w,'xiao-yi','liang',site,'envoy')).toBe(false);
  actService(w,{type:'service',action:'approve',id:task.id},'xiao-yi');
  expect(publicBalance(w,account)).toBe(465);expect(w.realm!.cities[site].grain).toBe(430);expect(w.realm!.treasuries.liang.coins).toBe(central);
  actService(w,{type:'service',action:'cancel',id:task.id},'xiao-yi');
  expect(publicBalance(w,account)).toBe(500);expect(w.realm!.cities[site].grain).toBe(500);expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('retains full treasury refunds in escrow and delivers once capacity is available',()=>{
  const {w,task,account}=setup();actService(w,{type:'service',action:'approve',id:task.id},'xiao-yi');
  w.realm!.fiscal!.balances[account]=1_000_000;actService(w,{type:'service',action:'cancel',id:task.id},'xiao-yi');
  expect(task.refunds?.[0].coins).toBe(35);validateWorld(w);
  w.realm!.fiscal!.balances[account]-=10;settleServiceRefund(w,task);expect(task.refunds?.[0].coins).toBe(25);
  settleServiceRefund(w,task);expect(task.refunds?.[0].coins).toBe(25);
 });
 it('automates routine approval only with explicit authority and keeps exceptions visible',()=>{
  const {w,task}=setup();
  actService(w,{type:'service',action:'automation',id:task.id,enabled:true},'xiao-yi');
  expect(serviceAttention(w).some(k=>k.startsWith('task:'+task.id))).toBe(false);
  w.day=2;advanceService(w);expect(serviceTask(w,task.id)?.phase).toBe('ready');validateWorld(w);
 });
 it('applies standing relief authority only inside its budget boundary and revokes active authority',()=>{
  const make=(plan:'balanced'|'urgent')=>{const w=newCampaignWorld('xiao-yan',undefined,'sandbox');act(w,{type:'service',action:'begin'});act(w,{type:'service',action:'routine',kind:'relief',enabled:true});act(w,{type:'service',action:'open',site:'jiankang',kind:'relief',officer:'xiao-gang',plan});return {w,task:w.service!.tasks.at(-1)!};};
  const normal=make('balanced');expect(normal.task.mandate?.automatic).toBe(true);expect(serviceAttention(normal.w).some(k=>k.startsWith('task:'+normal.task.id))).toBe(false);expect(parseWorld(serializeWorld(normal.w))).toEqual(normal.w);
  act(normal.w,{type:'service',action:'routine',kind:'relief',enabled:false});expect(normal.task.mandate?.automatic).toBe(false);expect(serviceAttention(normal.w).some(k=>k.startsWith('task:'+normal.task.id))).toBe(true);validateWorld(normal.w);
  const expensive=make('urgent');expect(expensive.task.mandate?.automatic).toBe(true);expect(serviceAttention(expensive.w).some(k=>k.startsWith('task:'+expensive.task.id))).toBe(true);validateWorld(expensive.w);
 });
 it('allows an actual local supervisor to grant routine authority, and reports a failed automatic case',()=>{
  const {w,task}=setup();actService(w,{type:'service',action:'routine',kind:'relief',enabled:true},'xiao-yi');expect(w.service!.routine).toContainEqual({realm:'liang',issuer:'xiao-yi',kind:'relief'});
  actService(w,{type:'service',action:'automation',id:task.id,enabled:true},'xiao-yi');w.day=task.deadline;advanceService(w);expect(task.result?.success).toBe(false);expect(serviceException(w,task)).toBe(true);validateWorld(w);
 });
 it('rechecks the supervisor after dismissal instead of retaining former access',()=>{
  const {w,task}=setup();for(const [key,seat] of Object.entries(w.realm!.local!.seats))if(seat.holder==='xiao-yi')setLocalHolder(w,key.split('|')[1],'liang',null);for(const c of Object.values(w.realm!.cities))if(c.governor==='xiao-yi')c.governor=null;
  expect(serviceApprover(w,task)).not.toBe('xiao-yi');expect(serviceReason(w,{type:'service',action:'approve',id:task.id},'xiao-yi')).toContain('主管');
 });
 it('does not revive a former supervisor’s standing authority after reappointment',()=>{
  const {w,task,t}=setup();actService(w,{type:'service',action:'routine',kind:'relief',enabled:true},'xiao-yi');actService(w,{type:'service',action:'automation',id:task.id,enabled:true},'xiao-yi');
  for(const [key,seat] of Object.entries(w.realm!.local!.seats))if(seat.holder==='xiao-yi')setLocalHolder(w,key.split('|')[1],'liang',null);for(const c of Object.values(w.realm!.cities))if(c.governor==='xiao-yi')c.governor=null;
  w.day++;advanceService(w);expect(task.mandate?.automatic).toBe(false);expect(w.service!.routine).toEqual([]);
  setLocalHolder(w,t,'liang','xiao-yi');w.day++;advanceService(w);expect(task.mandate?.automatic).toBe(false);expect(w.service!.routine).toEqual([]);validateWorld(w);
 });
 it('rejects malformed authorization and outcome snapshots in saves',()=>{
  const {w,task}=setup(),order=task.baseline!.order;task.baseline!.order=101;expect(()=>serializeWorld(w)).toThrow('存档');task.baseline!.order=order;
  actService(w,{type:'service',action:'routine',kind:'relief',enabled:true},'xiao-yi');w.service!.routine!.push({...w.service!.routine![0]});expect(()=>serializeWorld(w)).toThrow('存档');
 });
 it('runs NPC service without opting the player into service',()=>{
  const w=newCampaignWorld('dugu-xin',undefined,'sandbox');w.day=15;advanceService(w);
  expect(w.service!.enabled).toBe(false);expect(w.service!.tasks.length).toBeGreaterThan(0);expect(serviceAttention(w)).toEqual([]);validateWorld(w);
 });
});
