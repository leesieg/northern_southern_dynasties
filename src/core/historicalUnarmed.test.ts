import {describe,it,expect} from 'vitest';
import {newCampaignWorld} from './world';
import {initializeHistoricalStart} from './historicalStart';
import {advanceHistorical,historicalArmy,historicalPending,historicalReason,actHistorical,historicalRiseCommand,northConflict} from './historicalEvents';
import {armyCommander} from './mobility';
import {die} from './life';
import {personInfluence,awardInfluence} from './personalInfluence';
import {governingAuthority} from './government';
import {ensurePowerPolitics} from './powerPolitics';
import {changeRelationOpinion,relationOpinion} from './relationships';
import {actPact} from './allegiancePacts';
import {civilReason} from './civilWars';
import {personResidence} from './residence';
import {parseWorld,serializeWorld} from './save';

function start(id='hou-jing',armed=false){
 const w=newCampaignWorld(id,undefined,'sandbox');initializeHistoricalStart(w);
 if(!armed){
  // Fixture fact: the defeated formations and their command bindings no longer exist.
  const lost=w.realm!.armies.filter(a=>a.owner==='hou-jing'||armyCommander(w,a)==='hou-jing');
  w.realm!.armies=w.realm!.armies.filter(a=>!lost.includes(a));
  for(const a of lost)delete w.mobility!.armyCommanders![a.id!];
  if(w.mobility!.commanders.east==='hou-jing')delete w.mobility!.commanders.east;
 }
 return w;
}
function command(w:ReturnType<typeof start>,terms:'personal'|'retain'='personal'){
 const e=w.historical!.items[0],d=e.decision!;
 return {type:'historicalEvent',instanceId:e.id,decisionId:d.id,revision:d.revision,optionId:'seek',realm:'liang',terms} as const;
}

describe('Hou Jing handover after loss of his army',()=>{
 it('opens one real handover decision after the protector dies even when a saved dormant instance has no troops',()=>{
  const w=start();expect(historicalArmy(w,'hou-jing')).toBeUndefined();
  advanceHistorical(w);expect(w.historical!.items[0].phase).toBe('dormant');
  die(w,'gao-huan','illness');const restored=parseWorld(serializeWorld(w)),before=structuredClone(restored.realm);
  advanceHistorical(restored);const e=restored.historical!.items[0];
  expect(e.phase).toBe('north');expect(e.decision?.actor).toBe('hou-jing');expect(historicalPending(restored)).toHaveLength(1);
  expect(restored.realm).toEqual(before);const once=structuredClone(restored);advanceHistorical(restored);expect(restored).toEqual(once);
  expect(parseWorld(serializeWorld(restored)).historical).toEqual(restored.historical);
 });
 it('permits personal reception only, charges influence once and never grants an army or protection budget',()=>{
  const w=start();die(w,'gao-huan','illness');advanceHistorical(w);
  const before=structuredClone(w),influence=personInfluence(w,'hou-jing'),q=command(w);
  expect(historicalReason(w,command(w,'retain'))).not.toBe('');expect(historicalReason(w,q)).toBe('');
  actHistorical(w,q);expect(personInfluence(w,'hou-jing')).toBe(influence-20);expect(()=>actHistorical(w,q)).toThrow();advanceHistorical(w);
  expect(w.historical!.items[0].phase).toBe('reception');const p=w.allegiancePacts!.items[0];expect(p.terms).toBe('personal');expect(p.army).toBeNull();
  actPact(w,{type:'pact',action:'answer',id:p.id,accept:true},governingAuthority(w,'liang'));advanceHistorical(w);
  expect(w.historical!.items[0].status).toBe('resolved');expect(w.historical!.items[0].result).toContain('个人归附');
  expect(w.realm!.armies).toEqual(before.realm!.armies);expect(w.realm!.treasuries).toEqual(before.realm!.treasuries);
  expect(w.realm!.wars).toEqual(before.realm!.wars);expect(parseWorld(serializeWorld(w)).historical).toEqual(w.historical);
 });
 it('lets an unarmed NPC send a personal request to the player host rather than silently waiting',()=>{
  const w=start('xiao-yan'),before=structuredClone(w.realm),influence=personInfluence(w,'hou-jing');die(w,'gao-huan','illness');
  advanceHistorical(w);advanceHistorical(w);
  expect(w.allegiancePacts!.items[0]).toMatchObject({person:'hou-jing',to:'liang',terms:'personal',army:null,status:'pending'});
  expect(w.historical!.items[0].phase).toBe('reception');expect(historicalPending(w)).toHaveLength(1);
  expect(personInfluence(w,'hou-jing')).toBe(influence-20);expect(w.realm!.armies).toEqual(before!.armies);
  const once=structuredClone(w);advanceHistorical(w);expect(w).toEqual(once);
 });
 it('keeps an NPC decision pending while a real request condition is blocked, then retries without a new conflict',()=>{
  const w=start('xiao-yan');die(w,'gao-huan','illness');awardInfluence(w,'hou-jing',19-personInfluence(w,'hou-jing'));
  advanceHistorical(w);expect(w.historical!.items[0].phase).toBe('north');expect(w.historical!.items[0].decision?.handled).not.toBe(true);
  expect(w.allegiancePacts?.items??[]).toHaveLength(0);const once=structuredClone(w);advanceHistorical(w);expect(w).toEqual(once);
  awardInfluence(w,'hou-jing',1);advanceHistorical(w);expect(w.allegiancePacts!.items).toHaveLength(1);expect(w.allegiancePacts!.items[0].terms).toBe('personal');expect(personInfluence(w,'hou-jing')).toBe(0);
 });
 it('routes an unarmed handover to the actual player executive and honors a paid assurance without restoring troops',()=>{
  const w=start('gao-cheng');die(w,'gao-huan','illness');expect(governingAuthority(w,'east')).toBe(w.characterId);advanceHistorical(w);
  const e=w.historical!.items[0],d=e.decision!,influence=personInfluence(w,'gao-cheng'),armies=structuredClone(w.realm!.armies);
  expect(d.kind).toBe('council');const q={type:'historicalEvent',instanceId:e.id,decisionId:d.id,revision:d.revision,optionId:'assure'} as const;
  actHistorical(w,q);advanceHistorical(w);expect(personInfluence(w,'gao-cheng')).toBe(influence-10);expect(northConflict(w,w.historical!.items[0])).toBe('');expect(w.historical!.items[0].phase).toBe('dormant');expect(w.realm!.armies).toEqual(armies);
 });
 it('preserves the actual relationship and recent-assurance gates even without an army',()=>{
  const w=start();die(w,'gao-huan','illness');const e=w.historical!.items[0],chief=governingAuthority(w,'east');
  changeRelationOpinion(w,'hou-jing',chief,-29-relationOpinion(w,'hou-jing',chief));expect(northConflict(w,e)).toBe('');
  changeRelationOpinion(w,'hou-jing',chief,-1);expect(northConflict(w,e)).not.toBe('');
  ensurePowerPolitics(w).assurances.push({realm:'east',person:'hou-jing',chief,due:w.day,status:'kept'});expect(northConflict(w,e)).toBe('');
 });
 it('still prefers a valid armed reception and never lets a landholder rise without real troops',()=>{
  const armed=start('xiao-yan',true);die(armed,'gao-huan','illness');advanceHistorical(armed);expect(armed.allegiancePacts!.items[0].terms).toBe('retain');
  const w=start(),site=personResidence(w,'hou-jing').site;w.realm!.armies=[];w.realm!.cities[site].governor='hou-jing';
  expect(civilReason(w,historicalRiseCommand(w,w.historical!.items[0]),'hou-jing')).toContain('300');
 });
});
