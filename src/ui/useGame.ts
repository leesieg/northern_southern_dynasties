import {beginFeedback,finishFeedback} from './actionFeedback';
import {pauseHasActions} from '../core/pauseEvents';
import type {PauseEvent} from '../core/pauseEvents';
import { useCallback, useEffect, useRef, useState } from 'react';
import { openGameSession } from './gameSession';
import type { Reply, Request, SaveInfo, World } from '../core/types';

const commandSession=crypto.randomUUID();
let commandSequence=0;
export function useGame() {
  const [pauses,setPauses]=useState<PauseEvent[]>([]);
  const [entry,setEntry]=useState(0);
  const [page,setPage]=useState<'menu'|'play'>('menu');
  const [pending,setPending]=useState(false);
  const requests=useRef(new Map<string,{resolve:(ok:boolean)=>void;visible:boolean}>());
  const nextPage=useRef<'menu'|'play'|null>(null);
  const worker=useRef<Worker|null>(null);
  const [world,setWorld]=useState<World|null>(null),[speed,setSpeed]=useState(0),[slots,setSlots]=useState<SaveInfo[]>([]),[lastSaved,setLastSaved]=useState<number|null>(null);
  const [notice,setNotice]=useState<{text:string;error?:boolean}|null>(null),[blocked,setBlocked]=useState('');
  const notify=useCallback((text:string,error=false)=>setNotice({text,error}),[]);
  const send=useCallback((message:Request):Promise<boolean>=>{
    if(!worker.current)return Promise.resolve(false);
    const requestId=crypto.randomUUID(),visible=!['speed','background','export'].includes(message.type);
    if(visible){setNotice(null);setPending(true);const active=document.activeElement;const label=active instanceof HTMLElement?(active.getAttribute('aria-label')||active.textContent?.trim().slice(0,42)):null;beginFeedback(requestId,label||({new:'准备新战役',resume:'续读行记',load:'读取行记',save:'保存行记',menu:'保存并返回'} as Record<string,string>)[message.type]||'办理指令');}
    return new Promise(resolve=>{requests.current.set(requestId,{resolve,visible});try{worker.current!.postMessage(message.type==='command'?{...message,requestId,key:message.key??{session:commandSession,sequence:++commandSequence}}:{...message,requestId});}catch(error){requests.current.delete(requestId);if(visible){finishFeedback(requestId,false,error instanceof Error?error.message:'指令未能送达，请重试。');setPending([...requests.current.values()].some(r=>r.visible));}resolve(false);}});
  },[]);
  useEffect(()=>{
    let stopped=false,closeSession:(()=>void)|undefined;
    const start=()=>{
      if(stopped)return ()=>{};
      const instance=new Worker(new URL('../worker/simulation.ts',import.meta.url),{type:'module'});worker.current=instance;
      instance.onmessage=(event:MessageEvent<Reply>)=>{
        if(stopped)return;const message=event.data;
        if(message.type==='receipt'){const current=requests.current.get(message.requestId);requests.current.delete(message.requestId);if(current?.visible){finishFeedback(message.requestId,message.ok,message.text);setPending([...requests.current.values()].some(r=>r.visible));}current?.resolve(message.ok);}
        else if(message.type==='screen'){nextPage.current=message.page;setPauses([]);}
        else if(message.type==='world'){if(nextPage.current){setPage(nextPage.current);nextPage.current=null;setEntry(n=>n+1);}setWorld(message.world);setPauses(items=>items.filter(e=>!['succession','allegiance'].includes(e.kind)||pauseHasActions(message.world,e)));setSpeed(message.speed);setSlots(message.slots);setLastSaved(message.lastSaved);}
        else if(message.type==='paused')setPauses(items=>[...items,...message.events.filter(e=>!items.some(p=>p.id===e.id))]);
        else if(message.type==='notice')setNotice({text:message.text,error:message.error});
        else {
          const url=URL.createObjectURL(new Blob([message.text],{type:'application/json'}));
          const link=document.createElement('a');link.href=url;link.download=`风云南北朝-${new Date().toISOString().slice(0,10)}.save.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
          notify('存档文件已生成，请妥善保存。');
        }
      };
      instance.onerror=()=>{for(const [id,r] of requests.current){finishFeedback(id,false,'世界运行中断，请恢复最近存档。');r.resolve(false);}requests.current.clear();setPending(false);setBlocked('世界运行出现错误。请刷新页面恢复最近存档。');};
      instance.postMessage({type:'init'} satisfies Request);
      return ()=>{for(const [id,r] of requests.current){finishFeedback(id,false,'当前会话已结束。');r.resolve(false);}requests.current.clear();instance.terminate();if(worker.current===instance)worker.current=null;};
    };
    if(navigator.locks) {
      closeSession=openGameSession(navigator.locks,{
        start,
        waiting:()=>setBlocked('正在等待游戏存档使用权。如果其他窗口正在运行游戏，请关闭该窗口；释放后此页会自动进入，无需反复刷新。'),
        acquired:()=>setBlocked(''),
        failed:()=>setBlocked('无法取得存档写入权限，请重新载入。'),
      });
    } else setBlocked('此浏览器无法提供存档写入保护。请使用支持 Web Locks 的桌面浏览器，并通过本地或 HTTPS 地址打开。');
    const visibility=()=>{if(document.hidden)send({type:'background'});};document.addEventListener('visibilitychange',visibility);
    return()=>{stopped=true;closeSession?.();document.removeEventListener('visibilitychange',visibility);};
  },[notify,send]);
  return {pauses,dismissPause:()=>setPauses(items=>items.slice(1)),entry,page,pending,world,speed,slots,lastSaved,notice,blocked,send,notify,dismiss:()=>setNotice(null)};
}
