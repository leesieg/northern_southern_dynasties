import {describe,it,expect} from 'vitest';
import {newCampaignWorld} from './world';
import {initializeHistoricalStart} from './historicalStart';
import {advanceHistorical,northConflict,visibleHistoricalMilestones} from './historicalEvents';
import {advancePacts,pactReason} from './allegiancePacts';
import {die} from './life';
import {personInfluence} from './personalInfluence';
import {changeRelationOpinion} from './relationships';

function start(id='yuwen-tai'){const w=newCampaignWorld(id,undefined,'sandbox');initializeHistoricalStart(w);return w;}
function withoutArmy(w:ReturnType<typeof start>){w.realm!.armies=w.realm!.armies.filter(a=>w.mobility?.armyCommanders?.[a.id!]!=='hou-jing');}
function noOldFollowers(w:ReturnType<typeof start>){w.realm!.treasuries.east.grain=0;for(const s of ['yingchuan','chenliu','liangxian','luoyang','pengcheng'])if(w.realm!.cities[s])w.realm!.cities[s].grain=0;}

describe('Hou Jing trigger buffer and protector-death reopening',()=>{
 it('keeps a small relation buffer but still lets an armed Hou Jing act at -22',()=>{
  const w=start(),e=w.historical!.items[0];
  changeRelationOpinion(w,'hou-jing','gao-cheng',8);
  die(w,'gao-huan','illness');
  expect(northConflict(w,e)).toContain('交替');
  const unarmed=structuredClone(w);withoutArmy(unarmed);
  expect(northConflict(unarmed,unarmed.historical!.items[0])).toBe('');
 });

 it('reopens a refused asylum once when the protector dies later',()=>{
  const w=start(),e=w.historical!.items[0];
  withoutArmy(w);noOldFollowers(w);
  w.life!.people['gao-huan'].illness={kind:'wasting',severity:3,since:0};
  advanceHistorical(w);
  expect(e.phase).toBe('north');
  expect(w.allegiancePacts!.items[0].status).toBe('pending');
  expect(w.allegiancePacts!.items[0].to).toBe('liang');
  for(let i=0;i<31;i++){w.day++;advancePacts(w);advanceHistorical(w);}
  expect(w.historical!.items[0].status).toBe('resolved');
  expect(w.allegiancePacts!.items[0].status).toBe('rejected');
  expect(personInfluence(w,'hou-jing')).toBe(70);
  die(w,'gao-huan','illness');
  advanceHistorical(w);
  const reopened=w.historical!.items[0];
  expect(reopened.status).toBe('active');
  expect(reopened.phase).toBe('north');
  expect(reopened.appliedEffects.filter(v=>v==='reopen:protector-death')).toHaveLength(1);
  expect(pactReason(w,{type:'pact',action:'request',realm:'west',terms:'personal'},'hou-jing')).toBe('');
  advanceHistorical(w);
  expect(w.allegiancePacts!.items).toHaveLength(2);
  expect(w.allegiancePacts!.items.at(-1)!.to).toBe('west');
  expect(w.allegiancePacts!.items.at(-1)!.status).toBe('pending');
  advanceHistorical(w);
  expect(w.historical!.items[0].appliedEffects.filter(v=>v==='reopen:protector-death')).toHaveLength(1);
 });

 it('publishes the north-phase notice to an outside observer',()=>{
  const w=start(),e=w.historical!.items[0];
  w.life!.people['gao-huan'].death={day:w.day,cause:'illness'};
  advanceHistorical(w);
  const visible=visibleHistoricalMilestones(w,e);
  expect(visible.some(m=>m.public&&m.text.includes('原有权力保护'))).toBe(true);
 });
});
