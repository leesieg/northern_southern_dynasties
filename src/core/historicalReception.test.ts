import {describe,it,expect} from 'vitest';
import {newCampaignWorld} from './world';
import {initializeHistoricalStart} from './historicalStart';
import {actPact,advancePacts} from './allegiancePacts';

function start(){const w=newCampaignWorld('yuwen-tai',undefined,'sandbox');initializeHistoricalStart(w);return w;}

describe('Hou Jing reception terms',()=>{
 it('lets an NPC host accept a retained defector at -24 but not a lone one',()=>{
  const w=start(),army=w.realm!.armies.find(a=>w.mobility!.armyCommanders?.[a.id!]==='hou-jing')!;
  actPact(w,{type:'pact',action:'request',realm:'liang',army:army.id,terms:'retain'},'hou-jing');
  advancePacts(w);
  const retained=w.allegiancePacts!.items.find(p=>p.person==='hou-jing')!;
  expect(retained.status).toBe('active');
  expect(retained.terms).toBe('retain');
  expect(w.realm!.armies.find(a=>a.id===army.id)!.realm).toBe('liang');

  const v=start();
  actPact(v,{type:'pact',action:'request',realm:'liang',terms:'personal'},'hou-jing');
  advancePacts(v);
  expect(v.allegiancePacts!.items.find(p=>p.person==='hou-jing')!.status).toBe('pending');
 });
});
