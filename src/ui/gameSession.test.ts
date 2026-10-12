import { afterEach, describe, expect, it, vi } from 'vitest';
import { openGameSession } from './gameSession';

// A controllable Web Locks callback boundary: browser ownership is simulated;
// session disposal, asynchronous release and UI recovery run as production code.
function lockHarness(){
  let grant:(()=>Promise<void>)|undefined;
  let options:LockOptions|undefined;
  const request=vi.fn((_name:string,opts:LockOptions,callback:(lock:Lock)=>Promise<void>)=>{
    options=opts;
    return new Promise<void>((resolve,reject)=>{
      opts.signal?.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true});
      grant=async()=>{if(opts.signal?.aborted)return;try{await callback({} as Lock);resolve();}catch(error){reject(error);throw error;}};
    });
  });
  return {locks:{request} as unknown as Pick<LockManager,'request'>,request,grant:()=>grant!(),options:()=>options!};
}
function callbacks(){const stop=vi.fn();return {stop,start:vi.fn(()=>stop),waiting:vi.fn(),acquired:vi.fn(),failed:vi.fn()};}
afterEach(()=>vi.useRealTimers());
describe('exclusive game session recovery',()=>{
  it('recovers automatically after a delayed grant instead of retaining the blocked screen',async()=>{
    vi.useFakeTimers();const h=lockHarness(),c=callbacks();const close=openGameSession(h.locks,c);
    await vi.advanceTimersByTimeAsync(400);expect(c.waiting).toHaveBeenCalledOnce();expect(c.start).not.toHaveBeenCalled();
    const held=h.grant();expect(c.acquired).toHaveBeenCalledOnce();expect(c.start).toHaveBeenCalledOnce();
    expect(h.options().ifAvailable).toBeUndefined();
    close();await held;expect(c.stop).toHaveBeenCalledOnce();expect(c.failed).not.toHaveBeenCalled();
  });
  it('does not flash the waiting screen when ownership is immediately available',async()=>{
    vi.useFakeTimers();const h=lockHarness(),c=callbacks();const close=openGameSession(h.locks,c),held=h.grant();
    await vi.advanceTimersByTimeAsync(500);expect(c.waiting).not.toHaveBeenCalled();close();await held;
  });
  it('cancels an unmounted request so hot reload cannot start a stale writer',async()=>{
    vi.useFakeTimers();const h=lockHarness(),c=callbacks();const close=openGameSession(h.locks,c);close();
    await h.grant();await vi.advanceTimersByTimeAsync(500);
    expect(h.options().signal?.aborted).toBe(true);expect(c.start).not.toHaveBeenCalled();expect(c.waiting).not.toHaveBeenCalled();expect(c.failed).not.toHaveBeenCalled();
  });
  it('terminates the writer before its lock callback settles',async()=>{
    const h=lockHarness(),c=callbacks();const close=openGameSession(h.locks,c);const order:string[]=[];
    c.stop.mockImplementation(()=>{order.push('writer stopped');});
    const held=h.grant().then(()=>order.push('lock released'));close();await held;
    expect(order).toEqual(['writer stopped','lock released']);
  });
});

function channelHarness(){
 const target=new EventTarget();return {postMessage:vi.fn(),close:vi.fn(),
  addEventListener:(_type:'message',listener:(e:MessageEvent)=>void)=>target.addEventListener('message',listener as EventListener),
  removeEventListener:(_type:'message',listener:(e:MessageEvent)=>void)=>target.removeEventListener('message',listener as EventListener),
  request:()=>target.dispatchEvent(new MessageEvent('message',{data:{type:'request-idle-session'}})),
 };
}
it('releases a departing page exactly once without needing a React unmount',async()=>{
 const h=lockHarness(),c={...callbacks(),suspended:vi.fn()},lifecycle=new EventTarget(),close=openGameSession(h.locks,c,{lifecycle}),held=h.grant();
 lifecycle.dispatchEvent(new Event('pagehide'));await held;close();
 expect(c.stop).toHaveBeenCalledOnce();expect(c.suspended).toHaveBeenCalledOnce();expect(c.failed).not.toHaveBeenCalled();
});
it('cancels a queued departing page before it can become a stale owner',async()=>{
 vi.useFakeTimers();const h=lockHarness(),c=callbacks(),lifecycle=new EventTarget();openGameSession(h.locks,c,{lifecycle});
 lifecycle.dispatchEvent(new Event('pagehide'));await h.grant();await vi.advanceTimersByTimeAsync(400);
 expect(c.start).not.toHaveBeenCalled();expect(c.waiting).not.toHaveBeenCalled();
});
it('allows only an idle title page to voluntarily yield, never steals a live game lock',async()=>{
 const h=lockHarness(),c={...callbacks(),yielded:vi.fn()},channel=channelHarness();let idle=false;
 const close=openGameSession(h.locks,c,{channel,canYield:()=>idle}),held=h.grant();
 channel.request();expect(c.stop).not.toHaveBeenCalled();expect(c.yielded).not.toHaveBeenCalled();
 idle=true;channel.request();await held;channel.request();close();
 expect(c.stop).toHaveBeenCalledOnce();expect(c.yielded).toHaveBeenCalledOnce();expect(channel.close).toHaveBeenCalledOnce();expect(h.options().steal).toBeUndefined();
});
it('retries a cooperative request only while visible and stops requests after grant',async()=>{
 vi.useFakeTimers();const h=lockHarness(),c=callbacks(),channel=channelHarness();let visible=false;
 const close=openGameSession(h.locks,c,{channel,requesterActive:()=>visible});
 await vi.advanceTimersByTimeAsync(400);expect(channel.postMessage).not.toHaveBeenCalled();visible=true;
 await vi.advanceTimersByTimeAsync(2000);expect(channel.postMessage).toHaveBeenCalledOnce();
 const held=h.grant();await vi.advanceTimersByTimeAsync(5000);expect(channel.postMessage).toHaveBeenCalledOnce();close();await held;
});
it('cleans up a failed startup and releases its lifecycle listeners',async()=>{
 const h=lockHarness(),c={...callbacks(),suspended:vi.fn()},lifecycle=new EventTarget(),channel=channelHarness();c.start.mockImplementation(()=>{throw new Error('worker startup failed');});
 const close=openGameSession(h.locks,c,{lifecycle,channel});
 await expect(h.grant()).rejects.toThrow('worker startup failed');close();lifecycle.dispatchEvent(new Event('pagehide'));
 expect(channel.close).toHaveBeenCalledOnce();expect(c.suspended).not.toHaveBeenCalled();expect(c.failed).toHaveBeenCalledOnce();
});
it('still releases ownership when UI cleanup throws',async()=>{
 const h=lockHarness(),c=callbacks(),close=openGameSession(h.locks,c),held=h.grant();
 c.stop.mockImplementation(()=>{throw new Error('UI cleanup failure');});
 expect(close).toThrow('UI cleanup failure');await held;expect(h.options().signal?.aborted).toBe(true);expect(()=>close()).not.toThrow();
});
