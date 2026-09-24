export const GAME_LOCK='fynbc-active-game';

// Wait for ownership instead of treating a transient release (e.g. hot reload)
// as a permanent failure. Abort pending requests when the effect is disposed.
export function openGameSession(locks:Pick<LockManager,'request'>, callbacks:{
  start:()=>()=>void; waiting:()=>void; acquired:()=>void; failed:()=>void;
}){
  const controller=new AbortController();
  let disposed=false,release:(()=>void)|undefined,stop:(()=>void)|undefined;
  const timer=setTimeout(()=>{if(!disposed&&!release)callbacks.waiting();},350);
  void locks.request(GAME_LOCK,{signal:controller.signal},async ()=>{
    if(disposed)return;
    clearTimeout(timer);
    const held=new Promise<void>(resolve=>{release=resolve;});
    callbacks.acquired();
    stop=callbacks.start();
    await held;
  }).catch(()=>{clearTimeout(timer);if(!disposed)callbacks.failed();});
  return ()=>{
    disposed=true;clearTimeout(timer);controller.abort();
    // Terminate the writer before allowing another page to own the save.
    stop?.();release?.();
  };
}
