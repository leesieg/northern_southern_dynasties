import {createPreviewStorage} from '../core/previewStorage';
import {createSimulationRuntime} from './simulationRuntime';
import type {Reply,Request} from '../core/types';

/** Headless editor host. Uses the same rules/requests as the game, but owns no timer
 * and can never select the production storage adapter. Only official content is supported. */
export function createPreviewSession(onReply:(message:Reply)=>void){
 const runtime=createSimulationRuntime(createPreviewStorage(),message=>onReply(structuredClone(message)));
 return {
  dispatch(request:Request){return runtime.dispatch(structuredClone(request));},
  tick(){return runtime.tick();},
 };
}
