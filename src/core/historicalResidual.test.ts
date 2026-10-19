import {describe,it,expect} from 'vitest';
import {newCampaignWorld} from './world';
import {initializeHistoricalStart} from './historicalStart';
import {advanceHistorical,historicalArmy} from './historicalEvents';
import {actPact,advancePacts} from './allegiancePacts';
import {takeCasualties} from './militaryAftermath';
import {installCommander} from './mobility';
import {disbandArmyReason} from './realm';
import {militaryCareerReason} from './militaryCareer';
import {parseWorld,serializeWorld} from './save';
import {governingAuthority} from './government';
function residual(player='guest-west'){
 const w=newCampaignWorld(player,undefined,'sandbox');initializeHistoricalStart(w);const army=historicalArmy(w,'hou-jing')!;
 actPact(w,{type:'pact',action:'request',realm:'liang',army:army.id,terms:'retain'},'hou-jing');advancePacts(w);
 const p=w.allegiancePacts!.items[0],a=w.realm!.armies.find(a=>a.id===p.army)!;takeCasualties(w,a,a.troops-140);a.location='jiangling';a.journey=null;installCommander(w,a,'hou-jing');w.mobility!.residences['hou-jing']={site:a.location,journey:null};
 const e=w.historical!.items[0];e.pactId=p.id;e.host=p.to;e.site=a.location;e.phase='dispute';e.security={source:'review:'+p.id,raised:w.day,requester:governingAuthority(w,p.to),status:'withdrawn'};e.handlingDue=w.day;e.appliedEffects.push('review:'+p.id);p.revision=1;
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
