import {describe,it,expect} from 'vitest';
import {createSimulationRuntime} from './simulationRuntime';
import {createPreviewStorage} from '../core/previewStorage';
import {createCampaign} from '../core/campaignStart';
import {actPact} from '../core/allegiancePacts';
import {armyCommander} from '../core/mobility';
import {diplomaticPair} from '../core/diplomacy';
import {parseWorld} from '../core/save';
import type {Reply} from '../core/types';

describe('Lu Minghui observes a restored Henan letter in the real request loop',()=>{
 it('advances an NPC letter to reception settlement without requiring observer input',async()=>{
  const w=createCampaign('guest-west',undefined,'sandbox'),army=w.realm!.armies.find(a=>armyCommander(w,a)==='hou-jing')!;
  actPact(w,{type:'pact',action:'request',realm:'liang',army:army.id!,terms:'retain'},'hou-jing');diplomaticPair(w,'east','liang')!.opinion=-100;
  const e=w.historical!.items[0];e.phase='reception';e.pactId=1;e.host='liang';
  const storage=createPreviewStorage();await storage.saveWorld(w);const replies:Reply[]=[],runtime=createSimulationRuntime(storage,m=>replies.push(structuredClone(m)));
  await runtime.dispatch({type:'init'});await runtime.dispatch({type:'step',requestId:'next-day'});
  const state=replies.filter((m):m is Extract<Reply,{type:'world'}>=>m.type==='world').at(-1)!.world;
  expect(replies.at(-1)).toMatchObject({type:'receipt',requestId:'next-day',ok:true});expect(state.day).toBe(1);
  expect(state.characterId).toBe('guest-west');expect(state.allegiancePacts!.items[0].status).toBe('active');expect(state.historical!.items[0].phase).toBe('settlement');
  expect(state.people[0].coins).toBe(w.people[0].coins);expect(replies.some(m=>m.type==='paused'&&m.events.some(e=>e.kind==='historical'))).toBe(false);
  await runtime.dispatch({type:'export'});const exported=replies.filter((m):m is Extract<Reply,{type:'export'}>=>m.type==='export').at(-1)!;
  expect(parseWorld(exported.text).historical).toEqual(state.historical);expect((await storage.loadWorld())!.historical).toEqual(state.historical);
 });
});
