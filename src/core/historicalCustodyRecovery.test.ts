import {describe,it,expect} from 'vitest';
import {createCampaign} from './campaignStart';
import {advanceHistorical,historicalPending,northConflict,visibleHistoricalMilestones} from './historicalEvents';
import {actCustody,detainPerson} from './custody';
import {detained} from './custodyState';
import {die} from './life';
import {armyCommander,installCommander} from './mobility';
import {parseWorld,serializeWorld} from './save';

function interrupted(player='hou-jing'){
 const w=createCampaign(player,undefined,'sandbox');w.day=10;
 expect(detainPerson(w,'hou-jing','west','changan','battle','battle:30')).toBe(true);
 advanceHistorical(w);expect(w.historical!.items[0].status).toBe('cancelled');return w;
}
function release(w:ReturnType<typeof interrupted>){w.day++;actCustody(w,{type:'custody',action:'release',person:'hou-jing'},'yuwen-tai');}

describe('Hou Jing resumes a prewar crisis after captivity',()=>{
 it('waits in custody, then rechecks real conflict after release without awarding resources',()=>{
  const w=interrupted();w.day++;die(w,'gao-huan','illness');advanceHistorical(w);
  expect(w.historical!.items[0].status).toBe('cancelled');expect(historicalPending(w)).toEqual([]);
  release(w);installCommander(w,w.realm!.armies.find(a=>a.realm==='east')!,'hou-jing');
  const resources=structuredClone({people:w.people,cities:w.realm!.cities,treasuries:w.realm!.treasuries,armies:w.realm!.armies,influence:w.realm!.personalInfluence});
  expect(northConflict(w,w.historical!.items[0])).not.toBe('');advanceHistorical(w);
  const e=w.historical!.items[0];expect(e.status).toBe('active');expect(e.phase).toBe('north');expect(e.result).toBeUndefined();expect(e.resolvedAt).toBeUndefined();
  expect(historicalPending(w)).toHaveLength(1);expect(e.milestones.some(m=>m.text.includes('已被控制'))).toBe(true);
  expect({people:w.people,cities:w.realm!.cities,treasuries:w.realm!.treasuries,armies:w.realm!.armies,influence:w.realm!.personalInfluence}).toEqual(resources);
  const once=serializeWorld(w);advanceHistorical(w);expect(serializeWorld(w)).toBe(once);expect(parseWorld(once).historical).toEqual(w.historical);
 });
 it('does not invent conflict on release, but can reopen when the protector dies later',()=>{
  const w=interrupted();release(w);expect(detained(w,'hou-jing')).toBe(false);advanceHistorical(w);expect(w.historical!.items[0].status).toBe('cancelled');
  w.day++;die(w,'gao-huan','illness');advanceHistorical(w);expect(w.historical!.items[0].status).toBe('active');expect(w.historical!.items[0].phase).toBe('north');
 });
 it('recovers legacy cancellation without requiring retained custody history or replacing the observer',()=>{
  const w=interrupted('guest-west');release(w);w.custody!.history=[];w.day++;die(w,'gao-huan','illness');
  installCommander(w,w.realm!.armies.find(a=>a.realm==='east')!,'hou-jing');
  const legacy=parseWorld(serializeWorld(w));expect(legacy.historical!.items[0].status).toBe('cancelled');advanceHistorical(legacy);
  expect(legacy.characterId).toBe('guest-west');expect(legacy.historical!.items[0].status).toBe('active');
  expect(visibleHistoricalMilestones(legacy,legacy.historical!.items[0]).some(m=>m.public)).toBe(true);
  expect(parseWorld(serializeWorld(legacy)).historical).toEqual(legacy.historical);
 });
 it.each(['dead','prior-war','other-cancellation','other-realm','resolved-war'] as const)('retains the terminal outcome for %s',kind=>{
  const w=interrupted();release(w);w.day++;die(w,'gao-huan','illness');const e=w.historical!.items[0];
  if(kind==='dead')die(w,'hou-jing','illness');
  if(kind==='prior-war'||kind==='resolved-war')e.warId=1;
  if(kind==='resolved-war'){e.status='resolved';e.result='起兵收场：侯景已死亡或被俘。';}
  if(kind==='other-cancellation')e.result='接纳政权已终止。';
  if(kind==='other-realm')(w.relationships!.allegiances??={})['hou-jing']={realm:'west',from:'east',source:'custody',since:w.day,army:0};
  const before=structuredClone(e);advanceHistorical(w);expect(w.historical!.items[0]).toEqual(before);
 });
 it('lets the restored NPC submit at most one real letter',()=>{
  const w=interrupted('guest-west');release(w);w.day++;die(w,'gao-huan','illness');
  const army=w.realm!.armies.find(a=>a.realm==='east')!;installCommander(w,army,'hou-jing');w.mobility!.residences['hou-jing']={site:army.location,journey:null};
  expect(armyCommander(w,army)).toBe('hou-jing');advanceHistorical(w);advanceHistorical(w);
  expect(w.allegiancePacts!.items).toHaveLength(1);expect(w.allegiancePacts!.items[0].status).toBe('pending');expect(w.allegiancePacts!.items[0].army).toBe(army.id);
  const once=serializeWorld(w);advanceHistorical(w);expect(serializeWorld(w)).toBe(once);
 });
});
