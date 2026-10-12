export const GAME_LOCK='fynbc-active-game';
export const GAME_SESSION_CHANNEL='fynbc-game-session';
interface SessionChannel{
 postMessage:(message:unknown)=>void;
 addEventListener:(type:'message',listener:(event:MessageEvent)=>void)=>void;
 removeEventListener:(type:'message',listener:(event:MessageEvent)=>void)=>void;
 close:()=>void;
}
interface SessionEnvironment{
 lifecycle?:Pick<EventTarget,'addEventListener'|'removeEventListener'>;
 channel?:SessionChannel;
 canYield?:()=>boolean;
 requesterActive?:()=>boolean;
}
const sessions=new Set<()=>void>();
if(import.meta.hot)import.meta.hot.dispose(()=>{for(const close of [...sessions])try{close();}catch(error){console.error('Game session cleanup failed; ownership was released.',error);}});

// No lock stealing: an idle title page can voluntarily stop its writer.
// Active games keep ownership until their page is closed or navigated away.
export function openGameSession(locks:Pick<LockManager,'request'>, callbacks:{
 start:()=>()=>void;waiting:()=>void;acquired:()=>void;failed:()=>void;
 suspended?:()=>void;yielded?:()=>void;
},environment:SessionEnvironment={}){
 const controller=new AbortController();
 let retryTimer:ReturnType<typeof setInterval>|undefined;
 let disposed=false,release:(()=>void)|undefined,stop:(()=>void)|undefined;
 const close=()=>{
  if(disposed)return;
  disposed=true;clearTimeout(timer);clearInterval(retryTimer);controller.abort();
  environment.lifecycle?.removeEventListener('pagehide',leave);
  environment.channel?.removeEventListener('message',request);environment.channel?.close();
  sessions.delete(close);
  // Stop the writer before resolving the ownership callback, even on pagehide/HMR.
  try{stop?.();}finally{release?.();}
 };
 const leave=()=>{close();callbacks.suspended?.();};
 const request=(event:MessageEvent)=>{
  if(!disposed&&release&&event.data?.type==='request-idle-session'&&environment.canYield?.()){
   close();callbacks.yielded?.();
  }
 };
 const timer=setTimeout(()=>{
  if(disposed||release)return;
  callbacks.waiting();
  const ask=()=>{if(environment.requesterActive?.())environment.channel?.postMessage({type:'request-idle-session'});};
  ask();if(environment.channel)retryTimer=setInterval(ask,2000);
 },350);
 environment.lifecycle?.addEventListener('pagehide',leave);
 environment.channel?.addEventListener('message',request);sessions.add(close);
 void locks.request(GAME_LOCK,{signal:controller.signal},async()=>{
  if(disposed)return;
  clearTimeout(timer);clearInterval(retryTimer);
  const held=new Promise<void>(resolve=>{release=resolve;});
  callbacks.acquired();stop=callbacks.start();await held;
 }).catch(()=>{if(!disposed){close();callbacks.failed();}});
 return close;
}
