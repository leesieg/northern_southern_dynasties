import type {ContentPackage} from '../core/contentPackage';
import type {Request,Reply} from '../core/types';

/** One Worker per package. Termination releases rules, caches and memory saves. */
export async function createPackagePreview(content:ContentPackage,onReply:(reply:Reply)=>void){
 const worker=new Worker(new URL('./contentPreview.ts',import.meta.url),{type:'module'});
 let nextId=0,closed=false;
 const pending=new Map<number,{resolve:()=>void;reject:(error:Error)=>void}>();
 let resolveReady:()=>void,rejectReady:(error:Error)=>void;
 const ready=new Promise<void>((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});
 function close(reason='试玩实例已关闭。'){
  closed=true;worker.terminate();const error=new Error(reason);rejectReady(error);
  for(const promise of pending.values())promise.reject(error);pending.clear();
 }
 worker.onerror=event=>close(event.message||'试玩 Worker 加载失败。');
 worker.onmessage=event=>{
  const message=event.data;
  if(message.type==='ready')resolveReady();
  else if(message.type==='reply')onReply(message.message);
  else if(message.type==='failed')close(message.text);
  else if(message.type==='done'){pending.get(message.id)?.resolve();pending.delete(message.id);}
 };
 try{worker.postMessage({type:'boot',content});await ready;}catch(error){close();throw error;}
 function send(type:'request'|'tick',request?:Request){
  if(closed)return Promise.reject(new Error('试玩实例已关闭。'));
  const id=++nextId;
  return new Promise<void>((resolve,reject)=>{
   pending.set(id,{resolve,reject});
   try{worker.postMessage({type,id,request});}catch(error){pending.delete(id);reject(error);}
  });
 }
 return {dispatch:(request:Request)=>send('request',request),tick:()=>send('tick'),close:()=>close()};
}
