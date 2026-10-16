import {describe,it,expect} from 'vitest';
import {createSimulationRuntime} from './simulationRuntime';
import {createPreviewStorage} from '../core/previewStorage';
import {createCampaign} from '../core/campaignStart';
import {parseWorld} from '../core/save';
import type {Reply} from '../core/types';
describe('package handoff persistence',()=>{
 it('backs up the actual current day, and skips incompatible startup reads only for a prepared launch',async()=>{
  const storage=createPreviewStorage(),replies:Reply[]=[],runtime=createSimulationRuntime(storage,m=>replies.push(m));
  await storage.saveWorld(createCampaign('xiao-gang','three-realms-546','sandbox'));await runtime.dispatch({type:'init'});await runtime.dispatch({type:'step'});await runtime.dispatch({type:'checkpoint',requestId:'checkpoint'});
  const checkpoint=replies.find(m=>m.type==='checkpoint');expect(checkpoint?.type).toBe('checkpoint');if(checkpoint?.type!=='checkpoint'||!checkpoint.text)throw new Error('missing checkpoint');expect(parseWorld(checkpoint.text).day).toBe(1);expect((await storage.loadWorld('previous-run'))!.day).toBe(1);expect((await storage.loadWorld('manual'))!.day).toBe(0);
  let reads=0;const launch=createSimulationRuntime({...storage,loadWorld:async()=>{reads++;throw new Error('other content');}},m=>replies.push(m));await launch.dispatch({type:'init',skipLoad:true});expect(reads).toBe(0);await launch.dispatch({type:'new',characterId:'xiao-gang',mode:'sandbox',requestId:'launch'});expect(replies.some(m=>m.type==='receipt'&&m.requestId==='launch'&&m.ok)).toBe(true);expect((await storage.loadWorld('previous-run'))!.day).toBe(1);
 });
 it('does not publish a successful checkpoint or change progress when backup storage fails',async()=>{
  const storage=createPreviewStorage(),replies:Reply[]=[],w=createCampaign('xiao-gang','three-realms-546','sandbox');await storage.saveWorld(w);
  const runtime=createSimulationRuntime({...storage,saveWorld:async()=>{throw new Error('quota');}},m=>replies.push(m));await runtime.dispatch({type:'init'});await runtime.dispatch({type:'checkpoint',requestId:'blocked'});expect(replies.some(m=>m.type==='checkpoint')).toBe(false);expect(replies.find(m=>m.type==='receipt'&&m.requestId==='blocked')).toMatchObject({ok:false,text:'quota'});expect((await storage.loadWorld('manual'))!.day).toBe(0);expect(await storage.loadWorld('previous-run')).toBeNull();
 });
});
