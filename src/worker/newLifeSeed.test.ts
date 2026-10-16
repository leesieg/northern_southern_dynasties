import {afterEach,it,expect,vi} from 'vitest';
import {createSimulationRuntime} from './simulationRuntime';
import {createPreviewStorage} from '../core/previewStorage';
import {parseWorld} from '../core/save';
import type {Reply} from '../core/types';
afterEach(()=>vi.unstubAllGlobals());
it('draws a new seed only for a new run; load and export preserve it even after a failed cloud write',async()=>{
 let seed=100;const draw=vi.fn((a:Uint32Array)=>{a[0]=++seed;return a;});vi.stubGlobal('crypto',{getRandomValues:draw});
 const storage=createPreviewStorage(),save=vi.fn(storage.saveWorld),replies:Reply[]=[],runtime=createSimulationRuntime({...storage,saveWorld:save},m=>replies.push(structuredClone(m)));
 const current=()=>replies.filter((m):m is Extract<Reply,{type:'world'}>=>m.type==='world').at(-1)!.world;
 await runtime.dispatch({type:'init'});await runtime.dispatch({type:'new',characterId:'guest-west',mode:'sandbox'});expect(current().life!.seed).toBe(101);
 await runtime.dispatch({type:'new',characterId:'guest-west',mode:'sandbox'});expect(current().life!.seed).toBe(102);
 await runtime.dispatch({type:'load',slot:'manual'});expect(draw).toHaveBeenCalledTimes(2);expect(current().life!.seed).toBe(102);
 const before=structuredClone(current());save.mockRejectedValueOnce(new Error('存档服务处理失败（HTTP 500）'));
 await runtime.dispatch({type:'step',requestId:'failed'});expect(current()).toEqual(before);expect(replies.at(-1)).toMatchObject({type:'receipt',ok:false});
 await runtime.dispatch({type:'export'});const exported=replies.filter((m):m is Extract<Reply,{type:'export'}>=>m.type==='export').at(-1)!;
 expect(parseWorld(exported.text)).toEqual(before);
 await runtime.dispatch({type:'step'});expect(current().day).toBe(before.day+1);
});
