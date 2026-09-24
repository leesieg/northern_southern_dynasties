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
      grant=async()=>{if(opts.signal?.aborted)return;await callback({} as Lock);resolve();};
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
