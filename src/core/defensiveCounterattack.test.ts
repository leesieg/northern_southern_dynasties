import {describe,it,expect} from 'vitest';
import {newCampaignWorld} from './world';
import {delegatedArmyDecision} from './militaryAI';
import {ensureWars} from './wars';
import {ensureArmyOrganization} from './armyOrganization';
import {armyAtEnemyCity} from './militaryRoutes';
function setup(){
 const w=newCampaignWorld('guest-west',undefined,'sandbox'),s=w.realm!;
 s.war={attacker:'east',defender:'west',target:'hongnong',started:0,score:-17};delete s.wars;ensureWars(w);
 s.armies=[{id:101,realm:'west',location:'hongnong',troops:875,morale:70,supply:10000,journey:null,siege:0,automation:'delegated'},{id:102,realm:'east',location:'ye',troops:600,morale:70,supply:120,journey:null,siege:0,trainingUntil:30}];
 s.cities.hongnong.owner='west';s.cities.hongnong.controller='west';w.day=15;ensureArmyOrganization(w);w.mobility!.pendingCommanders={};
 return {w,s,a:s.armies[0]};
}
describe('defending armies counterattack actual enemies',()=>{
 it('leaves the defended objective when the enemy field army is depleted, without changing war claims',()=>{
  const {w,s,a}=setup(),before=structuredClone(s.wars);const decision=delegatedArmyDecision(w,a);
  expect(decision.intent).toBe('乘势反攻敌境');expect(decision.route).toBeDefined();expect(s.cities[decision.target!].controller).toBe('east');expect(s.wars).toEqual(before);expect(a.journey).toBeNull();
 });
 it('holds when the ready enemy outnumbers available defenders and excludes direct-control troops',()=>{
  const {w,s,a}=setup();s.armies[1].trainingUntil=0;s.armies[1].regiments![0].troops=2000;
  s.armies.push({...a,id:103,troops:6000,regiments:undefined,automation:'direct'});
  expect(delegatedArmyDecision(w,a).route).toBeUndefined();expect(delegatedArmyDecision(w,s.armies[2]).current).toBe('驻留待命');
 });
 it('prioritizes recovering occupied home territory over counterattacks',()=>{
  const {w,s,a}=setup();s.cities.huayin.controller='east';s.cities.huayin.owner='west';
  const decision=delegatedArmyDecision(w,a);expect(decision.intent).toBe('恢复失地与解围');expect(decision.target).toBe('huayin');
 });
 it('never selects third-party cities and respects an unfinished enemy siege',()=>{
  const {w,s,a}=setup();for(const c of Object.values(s.cities))if(c.controller==='east')c.controller='liang';
  expect(delegatedArmyDecision(w,a).route).toBeUndefined();
  s.cities.hongnong.controller='east';expect(armyAtEnemyCity(w,a)).toBe(true);expect(delegatedArmyDecision(w,a).current).toBe('攻取沿途据点');
 });
 it('retains supply and morale gates even with overwhelming strength',()=>{
  const {w,a}=setup();a.morale=20;expect(delegatedArmyDecision(w,a).intent).toBe('整顿补给与士气');
 });
});
