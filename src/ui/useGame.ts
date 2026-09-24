import type {PauseEvent} from '../core/pauseEvents';
import { useCallback, useEffect, useRef, useState } from 'react';
import { openGameSession } from './gameSession';
import type { Reply, Request, SaveInfo, World } from '../core/types';

export function useGame() {
  const [pauses,setPauses]=useState<PauseEvent[]>([]);
  const [entry,setEntry]=useState(0);
  const [page,setPage]=useState<'menu'|'play'>('menu');
  const [pending,setPending]=useState(false);
  const nextPage=useRef<'menu'|'play'|null>(null);
  const worker=useRef<Worker|null>(null);
  const [world,setWorld]=useState<World|null>(null),[speed,setSpeed]=useState(0),[slots,setSlots]=useState<SaveInfo[]>([]),[lastSaved,setLastSaved]=useState<number|null>(null);
  const [notice,setNotice]=useState<{text:string;error?:boolean}|null>(null),[blocked,setBlocked]=useState('');
  const notify=useCallback((text:string,error=false)=>setNotice({text,error}),[]);
  const send=useCallback((message:Request)=>{if(worker.current){if(['new','resume','menu','load','import'].includes(message.type))setNotice(null);setPending(true);worker.current.postMessage(message);}},[]);
  useEffect(()=>{
    let stopped=false,closeSession:(()=>void)|undefined;
    const start=()=>{
      if(stopped)return ()=>{};
      const instance=new Worker(new URL('../worker/simulation.ts',import.meta.url),{type:'module'});worker.current=instance;
      instance.onmessage=(event:MessageEvent<Reply>)=>{
        if(stopped)return;const message=event.data;
        if(message.type==='screen'){nextPage.current=message.page;setPauses([]);}
        else if(message.type==='world'){if(nextPage.current){setPage(nextPage.current);nextPage.current=null;setEntry(n=>n+1);}setPending(false);setWorld(message.world);setSpeed(message.speed);setSlots(message.slots);setLastSaved(message.lastSaved);}
        else if(message.type==='paused')setPauses(items=>[...items,...message.events.filter(e=>!items.some(p=>p.id===e.id))]);
        else if(message.type==='notice')setNotice({text:message.text,error:message.error});
        else {
          const url=URL.createObjectURL(new Blob([message.text],{type:'application/json'}));
          const link=document.createElement('a');link.href=url;link.download=`风云南北朝-${new Date().toISOString().slice(0,10)}.save.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
          notify('存档文件已生成，请妥善保存。');
        }
      };
      instance.onerror=()=>{setBlocked('世界运行出现错误。请刷新页面恢复最近存档。');};
      instance.postMessage({type:'init'} satisfies Request);
      return ()=>{instance.terminate();if(worker.current===instance)worker.current=null;};
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
