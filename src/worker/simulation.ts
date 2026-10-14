import * as storage from '../core/storage';
import type {Request} from '../core/types';
import {createSimulationRuntime} from './simulationRuntime';

const runtime=createSimulationRuntime(storage,message=>self.postMessage(message));
self.onmessage=(event:MessageEvent<Request>)=>{void runtime.dispatch(event.data);};
setInterval(()=>{void runtime.tick();},1000);
