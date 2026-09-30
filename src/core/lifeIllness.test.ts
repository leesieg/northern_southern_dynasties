import {nextMonthStart} from './calendar';
import {describe,it,expect} from 'vitest';
import {newCampaignWorld} from './world';
import {advanceLife} from './life';
import {illnessCourse,illnessKind,monthlyIllnessRisk,type Illness} from './lifeState';
import {validLife} from './lifeSave';
import {parseWorld,serializeWorld} from './save';

describe('temporary illness course',()=>{
 it('reduces baseline incidence and preserves age, stress and inherited vitality effects',()=>{
  expect(monthlyIllnessRisk(30)).toBe(.007);
  expect(monthlyIllnessRisk(80)).toBeGreaterThan(monthlyIllnessRisk(30));
  expect(monthlyIllnessRisk(30,100)).toBeGreaterThan(monthlyIllnessRisk(30));
  expect(monthlyIllnessRisk(30,0,true)).toBeLessThan(monthlyIllnessRisk(30));
  expect(monthlyIllnessRisk(300,1000)).toBeLessThanOrEqual(.05);
 });
 it('distributes common ailments instead of giving all young people fever',()=>{
  expect([.1,.6,.9].map(n=>illnessKind(30,n))).toEqual(['cold','flux','fever']);
  expect(illnessKind(70,.1)).toBe('wasting');
 });
 it.each(Object.keys(illnessCourse) as Illness[])('clears %s at its course limit and keeps the saved world valid',kind=>{
  const w=newCampaignWorld('gao-huan',undefined,'sandbox'),p=w.life!.people['gao-huan'];
  p.illness={kind,since:0,severity:1};p.health=75;
  expect(parseWorld(serializeWorld(w)).life!.people['gao-huan'].illness?.kind).toBe(kind);
  w.day=nextMonthStart(illnessCourse[kind].duration-1,w.scriptId);advanceLife(w);
  expect(p.illness).toBeNull();expect(p.health).toBeGreaterThan(75);expect(validLife(w)).toBe(true);
  const snapshot=structuredClone(w.life);advanceLife(w);expect(w.life).toEqual(snapshot);
 });
 it('rejects unknown diseases while retaining older fever saves',()=>{
  const w=newCampaignWorld('gao-huan',undefined,'sandbox');
  w.life!.people['gao-huan'].illness={kind:'fever',since:0,severity:1};expect(validLife(w)).toBe(true);
  (w.life!.people['gao-huan'].illness as {kind:string}).kind='unknown';expect(validLife(w)).toBe(false);
 });
});
