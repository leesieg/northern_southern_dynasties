import {ensureArmyOrganization} from './armyOrganization';
import {ensureFiscal,fiscalPath} from './treasury';
import {delegatedArmyDecision} from './militaryAI';
import {describe,it,expect} from 'vitest';
import {newCampaignWorld} from './world';
import {initializeHistoricalStart} from './historicalStart';
import {prepareHistoricalBase,advanceHistorical,historicalArmy} from './historicalEvents';
import {actPact,advancePacts} from './allegiancePacts';
import {takeCasualties} from './militaryAftermath';
import {installCommander} from './mobility';
import {disbandArmyReason} from './realm';
import {militaryCareerReason} from './militaryCareer';
import {parseWorld,serializeWorld} from './save';
import {governingAuthority} from './government';
function residual(player='guest-west',troops=140){
 const w=newCampaignWorld(player,undefined,'sandbox');initializeHistoricalStart(w);const army=historicalArmy(w,'hou-jing')!;
 actPact(w,{type:'pact',action:'request',realm:'liang',army:army.id,terms:'retain'},'hou-jing');advancePacts(w);
 const p=w.allegiancePacts!.items[0],a=w.realm!.armies.find(a=>a.id===p.army)!;takeCasualties(w,a,a.troops-troops);a.location='jiangling';a.journey=null;installCommander(w,a,'hou-jing');w.mobility!.residences['hou-jing']={site:a.location,journey:null};
 const e=w.historical!.items[0];e.pactId=p.id;e.host=p.to;e.site=a.location;e.phase='dispute';e.securitySince=w.day;e.security={source:'review:'+p.id,raised:w.day,requester:governingAuthority(w,p.to),status:'withdrawn'};e.handlingDue=w.day;e.appliedEffects.push('review:'+p.id);p.revision=1;
 return {w,p,a,e};
}
describe('NPC residual force placement',()=>{
 it('voluntarily demobilizes an unreplenishable residual through the shared population and grain settlement',()=>{
  const {w,a}=residual();expect(militaryCareerReason(w,{type:'militaryCareer',action:'privateRaise',site:a.location,kind:'shield',amount:200,target:a.id},'hou-jing')).not.toBe('');expect(disbandArmyReason(w,a,'hou-jing')).toBe('');
  const population=w.realm!.cities[a.location].population,coins=w.realm!.treasuries.liang.coins,grain=w.realm!.cities[a.location].grain,supply=a.supply;advanceHistorical(w);
  expect(historicalArmy(w,'hou-jing')).toBeUndefined();expect(w.realm!.cities[a.location].population).toBe(population+140);expect(w.realm!.cities[a.location].grain).toBe(grain+supply);expect(w.realm!.treasuries.liang.coins).toBe(coins);
  advanceHistorical(w);expect(w.historical!.items[0].status).toBe('resolved');expect(parseWorld(serializeWorld(w)).historical).toEqual(w.historical);
 });
 it('retains real troops and debts while demobilization is blocked, and never decides for the player',()=>{
  const {w,a}=residual();a.arrears=10;advanceHistorical(w);expect(historicalArmy(w,'hou-jing')!.troops).toBe(140);expect(a.arrears).toBe(10);
  const player=residual('hou-jing');advanceHistorical(player.w);expect(historicalArmy(player.w,'hou-jing')!.troops).toBe(140);expect(player.w.historical!.items[0].decision?.handled).not.toBe(true);
 });
});

it('moves the existing private force to a currently legal base instead of repeating an impossible uprising',()=>{
 const {w,a,e}=residual('guest-west',600);e.decision={id:e.id+':base-review',revision:e.revision,actor:'hou-jing',kind:'crisis',created:w.day};w.realm!.armies.push({realm:'liang',location:a.location,troops:1200,morale:100,supply:120,journey:null,siege:0});ensureArmyOrganization(w);ensureFiscal(w)!.balances[fiscalPath(w,'jingkou')[0]]=500;w.realm!.cities.jingkou.grain=500;
 const troops=w.realm!.armies.reduce((n,a)=>n+a.troops,0),cash=Object.values(w.realm!.treasuries).reduce((n,t)=>n+t.coins,0)+Object.values(w.realm!.fiscal!.balances).reduce((n,v)=>n+v,0);expect(prepareHistoricalBase(w,e)).toBe(true);
 expect(a.journey).not.toBeNull();expect(a.journey!.route.at(-1)).not.toBe(a.location);expect(w.realm!.armies.reduce((n,a)=>n+a.troops,0)).toBe(troops);expect(Object.values(w.realm!.treasuries).reduce((n,t)=>n+t.coins,0)+Object.values(w.realm!.fiscal!.balances).reduce((n,v)=>n+v,0)).toBe(cash);expect(parseWorld(serializeWorld(w))).toEqual(w);
});
it('does not let the host military AI requisition a private force during an active settlement dispute',()=>{
 const {w,a}=residual('guest-west',600);const decision=delegatedArmyDecision(w,a);expect(decision.route).toBeUndefined();expect(decision.current).toBe('部曲留营');
});
