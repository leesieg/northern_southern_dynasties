import bundle from 'virtual:official-content-package';
import {installContentPackage} from '../core/contentPackage';
import type {ContentPackage} from '../core/contentPackage';
import type {Request} from '../core/types';
type Input={type:'boot';content:ContentPackage}|{type:'request';request:Request;id:number}|{type:'tick';id:number};
let session:Promise<ReturnType<typeof import('./previewSession')['createPreviewSession']>>|undefined;
self.onmessage=(event:MessageEvent<Input>)=>{
 const input=event.data;
 if(input.type==='boot'){
  if(session){self.postMessage({type:'failed',text:'此实例已经绑定内容。'});return;}
  session=(async()=>{
   await installContentPackage(input.content,bundle.environment);
   const {createPreviewSession}=await import('./previewSession');
   const instance=createPreviewSession(message=>self.postMessage({type:'reply',message}));
   self.postMessage({type:'ready'});return instance;
  })();
  void session.catch(error=>self.postMessage({type:'failed',text:String(error)}));return;
 }
 if(!session){self.postMessage({type:'failed',text:'请先加载完整内容包。'});return;}
 void session.then(instance=>input.type==='tick'?instance.tick():instance.dispatch(input.request))
  .then(()=>self.postMessage({type:'done',id:input.id}))
  .catch(error=>self.postMessage({type:'failed',id:input.id,text:String(error)}));
};
