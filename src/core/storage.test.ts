import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newWorld, advance, act } from './world';
import { listSaves, loadWorld, saveWorld } from './storage';

beforeEach(async()=>{await new Promise<void>((resolve,reject)=>{const request=indexedDB.deleteDatabase('fynbc-world-v1');request.onsuccess=()=>resolve();request.onerror=()=>reject(request.error);});});
describe('transactional local saves',()=>{
  it('saves and restores world state including an active journey',async()=>{
    const w=newWorld();act(w,{type:'travel',destination:'changan'});advance(w,3);await saveWorld(w);
    expect(await loadWorld('manual')).toEqual(w);expect((await listSaves())[0].day).toBe(3);
  });
  it('rotates exactly three automatic slots and keeps manual saves',async()=>{
    const w=newWorld();await saveWorld(w);
    for(let i=0;i<5;i++){advance(w,10);await saveWorld(w,true);}
    const slots=await listSaves();expect(slots).toHaveLength(4);expect(slots[0].day).toBe(50);
    expect(slots.filter(s=>s.id.startsWith('auto-')).map(s=>s.day).sort((a,b)=>a-b)).toEqual([30,40,50]);
    expect((await loadWorld('manual'))?.day).toBe(0);expect((await loadWorld())?.day).toBe(50);
  });
  it('reports failed storage without overwriting the previous snapshot',async()=>{
    const w=newWorld();await saveWorld(w);advance(w,10);
    const put=vi.spyOn(IDBObjectStore.prototype,'put').mockImplementationOnce(()=>{throw new DOMException('Full','QuotaExceededError');});
    await expect(saveWorld(w)).rejects.toThrow('保存失败');put.mockRestore();
    expect((await loadWorld('manual'))?.day).toBe(0);
  });
});
