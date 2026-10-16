import bundle from 'virtual:official-content-package';
import {installContentPackage,type ContentPackage} from '../core/contentPackage';
import type {Request,Reply} from '../core/types';
let ready:Promise<ReturnType<typeof import('./simulationRuntime')['createSimulationRuntime']>>|undefined;
function start(content:ContentPackage,scope?:string){return (async()=>{
 await installContentPackage(content,bundle.environment);
 const [{createSimulationRuntime},storage]=await Promise.all([import('./simulationRuntime'),import('../core/storage')]);
 const runtime=createSimulationRuntime({...storage,async prepareStorage(){await storage.prepareStorage();if(scope&&storage.storageScope()!==scope)throw new Error('账号会话已变化，未恢复其他账号的切换记录。请重新登录。');}},message=>self.postMessage(message));setInterval(()=>{void runtime.tick();},1000);return runtime;
})();}
self.onmessage=(event:MessageEvent<Request|{type:'bind';content:ContentPackage;scope?:string}>)=>{
 const input=event.data;if(input.type==='bind'){if(ready){self.postMessage({type:'notice',error:true,text:'内容已绑定，请创建新的世界实例。'} satisfies Reply);return;}ready=start(input.content,input.scope);void ready.catch(()=>{});return;}
 ready??=start(bundle.content);
 void ready.then(runtime=>runtime.dispatch(input)).catch(error=>{const text=error instanceof Error?error.message:'内容包加载失败。';self.postMessage({type:'notice',error:true,text} satisfies Reply);if(input.requestId)self.postMessage({type:'receipt',requestId:input.requestId,ok:false,text} satisfies Reply);});
};
