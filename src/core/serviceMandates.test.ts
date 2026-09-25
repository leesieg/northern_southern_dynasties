import {describe,it,expect} from 'vitest';
import {newCampaignWorld} from './world';
import {actService,advanceService,serviceTask,serviceReason,serviceAttention} from './assignments';
import {countyTerritory,setLocalHolder,localAncestors} from './localAdministration';
import {serviceApprover,canCommission,settleServiceRefund} from './serviceMandates';
import {territoryAccount,ensureFiscal,publicBalance} from './treasury';
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
 it('rechecks the supervisor after dismissal instead of retaining former access',()=>{
  const {w,task}=setup();for(const [key,seat] of Object.entries(w.realm!.local!.seats))if(seat.holder==='xiao-yi')setLocalHolder(w,key.split('|')[1],'liang',null);for(const c of Object.values(w.realm!.cities))if(c.governor==='xiao-yi')c.governor=null;
  expect(serviceApprover(w,task)).not.toBe('xiao-yi');expect(serviceReason(w,{type:'service',action:'approve',id:task.id},'xiao-yi')).toContain('主管');
 });
 it('runs NPC service without opting the player into service',()=>{
  const w=newCampaignWorld('dugu-xin',undefined,'sandbox');w.day=15;advanceService(w);
  expect(w.service!.enabled).toBe(false);expect(w.service!.tasks.length).toBeGreaterThan(0);expect(serviceAttention(w)).toEqual([]);validateWorld(w);
 });
});
