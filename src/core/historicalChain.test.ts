import {describe,it,expect} from 'vitest';
import {createCampaign} from './campaignStart';
import {advance,act} from './world';
import {localBalance} from './treasury';

describe('Hou Jing historical chain',()=>{
 it('reaches a real rebellion from a landless start without free troops',()=>{
  const w=createCampaign('yuwen-tai',undefined,'sandbox');
  // Fixture fact: the old formations were destroyed before the protector's death.
  w.realm!.armies=w.realm!.armies.filter(a=>w.mobility?.armyCommanders?.[a.id!]!=='hou-jing');
  w.life!.people['gao-huan'].death={day:w.day,cause:'illness'};
  let rebellion=false;
  for(let day=0;day<220&&!rebellion;day++){
   if(w.realm?.event)act(w,{type:'realm',action:'event',choice:'decline'});
   advance(w,1);
   rebellion=['rebellion','siege','court'].includes(w.historical!.items[0].phase);
  }
  const e=w.historical!.items[0],army=w.realm!.armies.find(a=>a.owner==='hou-jing'||w.mobility?.armyCommanders?.[a.id!]==='hou-jing');
  expect(e.phase).toBe('rebellion');
  expect(w.realm!.wars?.some(v=>v.civil?.claimant==='hou-jing')).toBe(true);
  expect(army?.troops??0).toBeGreaterThanOrEqual(300);
  const war=w.realm!.wars!.find(v=>v.civil?.claimant==='hou-jing')!;
  // Independent civil polities transfer the base funds into their actual treasury.
  expect(localBalance(w,war.civil!.base)+w.realm!.treasuries[war.attacker].coins).toBeGreaterThanOrEqual(100);
 },600000);
});
