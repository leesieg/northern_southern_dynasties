import {cancelContentLaunch} from '../host/contentTransfer';
import {getContentContext,LAUNCH_KEY} from '../host/contentContext';
import {readSaveFile} from '../persistence/saveFiles';
import {probePackage} from '../host/packageProbe';
import type {LaunchRequest} from '../persistence/contentLibrary';
import {beginCampaignLoad,finishCampaignLoad,isCampaignLoad,reportCampaignScene} from './campaignLoad';
import {beginFeedback,finishFeedback,dismissFeedback} from './actionFeedback';
import {pauseHasActions} from '../core/pauseEvents';
import type {PauseEvent} from '../core/pauseEvents';
import { useCallback, useEffect, useRef, useState } from 'react';
import { GAME_SESSION_CHANNEL,openGameSession } from './gameSession';
import type { Reply, Request, SaveInfo, World } from '../core/types';

const commandSession=crypto.randomUUID();
let commandSequence=0;
export function useGame() {
  const [pauses,setPauses]=useState<PauseEvent[]>([]);
  const [entry,setEntry]=useState(0);const entryNumber=useRef(0);
  const [page,setPage]=useState<'menu'|'play'>('menu');
  const [connection,setConnection]=useState(0);const sessionPage=useRef<'menu'|'play'>('menu'),sessionReady=useRef(false);
  const reconnect=useCallback(()=>{setBlocked('正在重新连接存档…');setConnection(value=>value+1);},[]);
  const [pending,setPending]=useState(false);
  const requests=useRef(new Map<string,{resolve:(ok:boolean)=>void;visible:boolean;cinematic:boolean}>());
  const nextPage=useRef<'menu'|'play'|null>(null);
  const worker=useRef<Worker|null>(null),checkpoint=useRef<string|null>(null);
  const [world,setWorld]=useState<World|null>(null),[speed,setSpeed]=useState(0),[slots,setSlots]=useState<SaveInfo[]>([]),[lastSaved,setLastSaved]=useState<number|null>(null);
  const [notice,setNotice]=useState<{text:string;error?:boolean}|null>(null),[blocked,setBlocked]=useState('');
  const dismiss=useCallback(()=>setNotice(null),[]);
  const notify=useCallback((text:string,error=false)=>setNotice({text,error}),[]);
  const route=useRef<((message:Request)=>Promise<boolean>)|undefined>(undefined),transferring=useRef(false);
  const sendRaw=useCallback((message:Request):Promise<boolean>=>{
    if(!worker.current)return Promise.resolve(false);
    const requestId=crypto.randomUUID(),visible=!['speed','background','export'].includes(message.type),cinematic=isCampaignLoad(message.type);
    if(isCampaignLoad(message.type)){dismissFeedback();beginCampaignLoad(requestId,entryNumber.current+1,message.type);}
    if(visible){setNotice(null);setPending(true);const active=document.activeElement;const label=active instanceof HTMLElement?(active.getAttribute('aria-label')||active.textContent?.trim().slice(0,42)):null;if(!cinematic)beginFeedback(requestId,label||({new:'准备新战役',resume:'续读行记',load:'读取行记',save:'保存行记',menu:'保存并返回'} as Record<string,string>)[message.type]||'办理指令');}
    return new Promise(resolve=>{requests.current.set(requestId,{resolve,visible,cinematic});try{worker.current!.postMessage(message.type==='command'?{...message,requestId,key:message.key??{session:commandSession,sequence:++commandSequence}}:{...message,requestId});}catch(error){requests.current.delete(requestId);if(cinematic){finishCampaignLoad(requestId,false);beginFeedback(requestId,'行记未能展开');setNotice({text:error instanceof Error?error.message:'指令未能送达，请重试。',error:true});}if(visible){finishFeedback(requestId,false,error instanceof Error?error.message:'指令未能送达，请重试。');setPending([...requests.current.values()].some(r=>r.visible));}resolve(false);}});
  },[]);
  const send=useCallback((message:Request)=>route.current?route.current(message):sendRaw(message),[sendRaw]);
  useEffect(()=>{
    let stopped=false,closeSession:(()=>void)|undefined;sessionReady.current=false;
    sessionPage.current='menu';setPage('menu');setSpeed(0);setWorld(null);setPauses([]);nextPage.current=null;
    const start=()=>{
      if(stopped)return ()=>{};
      const instance=new Worker(new URL('../worker/simulation.ts',import.meta.url),{type:'module'});worker.current=instance;const ctx=getContentContext(),initId=crypto.randomUUID();let launching=false;
      instance.onmessage=(event:MessageEvent<Reply>)=>{
        if(stopped||worker.current!==instance)return;const message=event.data;
        if(message.type==='receipt'){if(message.requestId===initId&&message.ok&&!launching&&ctx.launch){launching=true;const launch=ctx.launch;void (async()=>{const ok=launch.request?await sendRaw(launch.request):true;if(ok){await ctx.library.clearLaunch(launch.id);if(sessionStorage.getItem(LAUNCH_KEY)===launch.id)sessionStorage.removeItem(LAUNCH_KEY);ctx.launch=undefined;notify(launch.request?'内容与行记已恢复，原进度保留在切换前备份。':'已选择此内容，可开始新战役。');}})().catch(e=>notify(e instanceof Error?e.message:String(e),true));}const current=requests.current.get(message.requestId);requests.current.delete(message.requestId);if(current?.cinematic){finishCampaignLoad(message.requestId,message.ok);if(!message.ok){beginFeedback(message.requestId,'行记未能展开');finishFeedback(message.requestId,false,message.text);}if(message.ok)setNotice(n=>n&&!n.error&&/^(已恢复存档|导入成功)/.test(n.text)?null:n);}if(current?.visible){if(!current.cinematic)finishFeedback(message.requestId,message.ok,message.text);setPending([...requests.current.values()].some(r=>r.visible));}current?.resolve(message.ok);}
        else if(message.type==='screen'){sessionPage.current=message.page;nextPage.current=message.page;setPauses([]);}
        else if(message.type==='world'){sessionReady.current=true;if(nextPage.current){setPage(nextPage.current);nextPage.current=null;entryNumber.current+=1;setEntry(entryNumber.current);if(message.world.campaign&&message.world.campaign.status!=='active')reportCampaignScene(entryNumber.current,true,false);}setWorld(message.world);setPauses(items=>items.filter(e=>!['succession','allegiance'].includes(e.kind)||pauseHasActions(message.world,e)));setSpeed(message.speed);setSlots(message.slots);setLastSaved(message.lastSaved);}
        else if(message.type==='checkpoint')checkpoint.current=message.text;
        else if(message.type==='paused')setPauses(items=>[...items,...message.events.filter(e=>!items.some(p=>p.id===e.id))]);
        else if(message.type==='notice')setNotice({text:message.text,error:message.error});
        else {
          const url=URL.createObjectURL(new Blob([message.text],{type:'application/json'}));
          const link=document.createElement('a');link.href=url;link.download=`风云南北朝-${new Date().toISOString().slice(0,10)}.save.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
          notify('存档文件已生成，请妥善保存。');
        }
      };
      instance.onerror=()=>{for(const [id,r] of requests.current){finishCampaignLoad(id,false);finishFeedback(id,false,'世界运行中断，请恢复最近存档。');r.resolve(false);}requests.current.clear();setPending(false);closeSession?.();setBlocked('世界运行出现错误，存档连接已释放。请重新连接后恢复最近存档。');};
      instance.postMessage({type:'bind',content:ctx.content,scope:ctx.scope});
      instance.postMessage({type:'init',skipLoad:!!ctx.launch,requestId:initId} satisfies Request);
      return ()=>{try{for(const [id,r] of requests.current){finishCampaignLoad(id,false);finishFeedback(id,false,'当前会话已结束。');r.resolve(false);}}finally{instance.terminate();if(worker.current===instance)worker.current=null;requests.current.clear();}};
    };
    route.current=async message=>{
      const ctx=getContentContext();
      if(message.type==='cancel-launch'){try{await cancelContentLaunch(ctx);location.reload();return true;}catch(e){notify(String(e),true);return false;}}
      if(!['load','resume','import','catalog'].includes(message.type))return sendRaw(message);
      let id:string|undefined;
      transferring.current=true;setPending(true);setNotice(null);
      try{
       const text=message.type==='import'?message.text:message.type==='load'?await readSaveFile(message.slot):message.type==='resume'?await readSaveFile():null;
       if(message.type!=='catalog'&&text===null)throw new Error('没有找到这个存档。');
       const content=message.type==='catalog'?await ctx.library.get(message.digest):await ctx.library.resolve(text!);
       if(content.digest===ctx.content.digest&&message.type!=='catalog')return await sendRaw(message);
       if(content.digest===ctx.content.digest)return true;
       const request:LaunchRequest|undefined=message.type==='catalog'?undefined:{type:'import',text:text!};
       await sendRaw({type:'speed',speed:0});await probePackage(content,request);
       checkpoint.current=null;if(!await sendRaw({type:'checkpoint'}))throw new Error('切换前备份未成功，当前内容仍保持。');
       id=crypto.randomUUID();await ctx.library.stage({id,digest:content.digest,request,...(checkpoint.current?{rollback:{digest:ctx.content.digest,text:checkpoint.current}}:{})});
       sessionStorage.setItem(LAUNCH_KEY,id);location.reload();return true;
      }catch(e){if(id)await ctx.library.clearLaunch(id).catch(()=>{});notify(e instanceof Error?e.message:String(e),true);return false;}finally{transferring.current=false;setPending(false);}
    };
    if(navigator.locks) {
      closeSession=openGameSession(navigator.locks,{
        start,
        waiting:()=>{setBlocked('另一游戏窗口正在使用存档。请关闭该游戏窗口；释放后此页会自动连接。空闲标题页会自动让出占用。');},
        acquired:()=>setBlocked(''),
        failed:()=>setBlocked('无法连接存档，请重试连接。'),
        suspended:()=>setBlocked('页面已离开，存档连接已释放。请重新连接后继续。'),
        yielded:()=>setBlocked('存档已交由另一窗口使用。如需回到此处，请先关闭另一游戏窗口，再重新连接。'),
      },{lifecycle:window,channel:typeof BroadcastChannel==='undefined'?undefined:new BroadcastChannel(GAME_SESSION_CHANNEL),
        requesterActive:()=>connection>0||!document.hidden,
        canYield:()=>sessionPage.current==='menu'&&sessionReady.current&&requests.current.size===0&&!transferring.current&&!getContentContext().launch,
      });
    } else setBlocked('此浏览器无法提供存档写入保护。请使用支持 Web Locks 的桌面浏览器，并通过本地或 HTTPS 地址打开。');
    const visibility=()=>{if(document.hidden)send({type:'background'});};document.addEventListener('visibilitychange',visibility);
    return()=>{stopped=true;try{closeSession?.();}finally{route.current=undefined;document.removeEventListener('visibilitychange',visibility);}};
  },[notify,send,sendRaw,connection]);
  return {pauses,dismissPause:()=>setPauses(items=>items.slice(1)),entry,page,pending,world,speed,slots,lastSaved,notice,blocked,reconnect,send,notify,dismiss};
}
