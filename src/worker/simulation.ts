import bundle from 'virtual:official-content-package';
import {installContentPackage} from '../core/contentPackage';
import type {Request,Reply} from '../core/types';

// Binding must precede the rule modules and all their caches.
const ready=(async()=>{
 await installContentPackage(bundle.content,bundle.environment);
 const [{createSimulationRuntime},storage]=await Promise.all([import('./simulationRuntime'),import('../core/storage')]);
 const runtime=createSimulationRuntime(storage,message=>self.postMessage(message));
 setInterval(()=>{void runtime.tick();},1000);
 return runtime;
})();
void ready.catch(()=>{});
self.onmessage=(event:MessageEvent<Request>)=>{
 void ready.then(runtime=>runtime.dispatch(event.data)).catch(error=>{
  const text=error instanceof Error?error.message:'内容包加载失败。';
  self.postMessage({type:'notice',error:true,text} satisfies Reply);
  if(event.data.requestId)self.postMessage({type:'receipt',requestId:event.data.requestId,ok:false,text} satisfies Reply);
 });
};
