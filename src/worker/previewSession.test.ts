import {describe,it,expect,vi,afterEach} from 'vitest';
import {createPreviewSession} from './previewSession';
import {createSimulationRuntime} from './simulationRuntime';
import {createPreviewStorage} from '../core/previewStorage';
import {createCampaign} from '../core/campaignStart';
import {newCampaignWorld,act} from '../core/world';
import {initializeHistoricalStart} from '../core/historicalStart';
import type {Reply} from '../core/types';
const state=(messages:Reply[])=>messages.filter((r):r is Extract<Reply,{type:'world'}>=>r.type==='world').at(-1)!;
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
describe('headless editor previews',()=>{
 it('matches the original official initialization, including resource-funded historical armies',()=>{
  const original=newCampaignWorld('xiao-yan',undefined,'sandbox');initializeHistoricalStart(original);
  expect(createCampaign('xiao-yan',undefined,'sandbox')).toEqual(original);
 });
 it('runs two independent sessions without production storage or network calls',async()=>{
  const forbidden=vi.fn(()=>{throw new Error('production side effect');});
  vi.stubGlobal('fetch',forbidden);vi.stubGlobal('indexedDB',{open:forbidden,deleteDatabase:forbidden});
  const a:Reply[]=[],b:Reply[]=[],one=createPreviewSession(m=>a.push(m)),two=createPreviewSession(m=>b.push(m));
  await one.dispatch({type:'init'});await two.dispatch({type:'init'});
  await one.dispatch({type:'new'});await two.dispatch({type:'new',characterId:'xiao-gang'});
  await one.dispatch({type:'step'});expect(state(a).world.day).toBe(1);expect(state(b).world.day).toBe(0);
  const expected=structuredClone(state(a).world);state(a).world.people[0].coins=0;
  await one.dispatch({type:'menu'});await one.dispatch({type:'resume'});expect(state(a).world).toEqual(expected);
  await one.dispatch({type:'export'});const text=a.filter((m):m is Extract<Reply,{type:'export'}>=>m.type==='export').at(-1)!.text;
  await two.dispatch({type:'import',text});expect(state(b).world).toEqual(expected);
  await two.dispatch({type:'delete-save',slot:'manual'});expect(state(b).slots.some(s=>s.id==='manual')).toBe(false);
  expect(state(a).slots.some(s=>s.id==='manual')).toBe(true);expect(forbidden).not.toHaveBeenCalled();
 });
 it('executes real rules once for duplicate keys and rejects unsupported scripts atomically',async()=>{
  const replies:Reply[]=[],preview=createPreviewSession(m=>replies.push(m));
  await preview.dispatch({type:'init'});await preview.dispatch({type:'new'});
  const expected=structuredClone(state(replies).world),command={type:'provision'} as const;act(expected,command);
  const request={type:'command',command,key:{session:'preview-test',sequence:1}} as const;
  await preview.dispatch(request);const changed=structuredClone(state(replies));
  expect(changed.world.people).toEqual(expected.people);await preview.dispatch(request);expect(state(replies).world).toEqual(changed.world);
  await preview.dispatch({type:'new',scriptId:'custom-not-supported',requestId:'unsupported'});
  expect(state(replies).world).toEqual(changed.world);expect(state(replies).slots).toEqual(changed.slots);
  expect(replies.at(-1)).toMatchObject({type:'receipt',requestId:'unsupported',ok:false});
 });
 it('keeps failed writes atomic and allows the next queued request to proceed',async()=>{
  const storage=createPreviewStorage(),replies:Reply[]=[],runtime=createSimulationRuntime(storage,m=>replies.push(structuredClone(m)));
  // The adapter remains an explicit capability; fault injection happens before construction.
  const save=vi.fn(storage.saveWorld);const faulty=createSimulationRuntime({...storage,saveWorld:save},m=>replies.push(structuredClone(m)));
  await faulty.dispatch({type:'init'});await faulty.dispatch({type:'new'});const before=structuredClone(state(replies).world);
  save.mockRejectedValueOnce(new Error('preview full'));
  await faulty.dispatch({type:'command',command:{type:'provision'},requestId:'failed'});
  expect(state(replies).world).toEqual(before);expect(replies.at(-1)).toMatchObject({type:'receipt',ok:false});
  await faulty.dispatch({type:'step'});expect(state(replies).world.day).toBe(1);
  // A separately constructed runner does not start ticking or alter saved state by itself.
  await runtime.tick();expect(state(replies).world.day).toBe(1);
 });
});
