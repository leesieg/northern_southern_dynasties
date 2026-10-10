import 'fake-indexeddb/auto';
import {beforeEach,expect,it,vi} from 'vitest';
import {SAVE_MAX_BYTES,assertSaveSize} from './saveCapacity';
import {newCampaignWorld} from './world';
import * as saves from './save';
import {saveWorld,loadWorld} from './storage';
import {ensureAftermath} from './militaryAftermath';
import {combatArmySnapshot} from './combatSnapshots';
import type {Army} from './realm';

beforeEach(async()=>{vi.restoreAllMocks();await new Promise<void>((resolve,reject)=>{const r=indexedDB.deleteDatabase('fynbc-world-v1');r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error);});});
it('uses the same UTF-8 byte boundary for ASCII, Chinese, emoji and unpaired surrogates',()=>{
 expect(()=>assertSaveSize('x'.repeat(SAVE_MAX_BYTES))).not.toThrow();expect(()=>assertSaveSize('x'.repeat(SAVE_MAX_BYTES+1))).toThrow('32 MB');
 expect(()=>assertSaveSize('兵'.repeat(Math.floor(SAVE_MAX_BYTES/3)))).not.toThrow();expect(()=>assertSaveSize('兵'.repeat(Math.floor(SAVE_MAX_BYTES/3)+1))).toThrow('32 MB');
 expect(()=>assertSaveSize('😀'.repeat(SAVE_MAX_BYTES/4))).not.toThrow();expect(()=>assertSaveSize('😀'.repeat(SAVE_MAX_BYTES/4+1))).toThrow('32 MB');
 expect(()=>assertSaveSize('\ud800'.repeat(Math.floor(SAVE_MAX_BYTES/3)+1))).toThrow('32 MB');
});
it('saves and restores a valid battle archive larger than the old 2 MB cap without dropping history',async()=>{
 const w=newCampaignWorld('xiao-yan',undefined,'sandbox');w.day=24;const aftermath=ensureAftermath(w),kinds=['shield','spear','archer','lightHorse','heavyHorse','siege'] as const;
 const rows=Array.from({length:12},(_,i)=>{const a:Army={id:1001+i,realm:i<6?'liang':'east',location:'luoyang',troops:600,morale:80,supply:1000,siege:0,journey:null,regiments:kinds.map((kind,j)=>({id:`${i}:${j}`,kind,troops:100,experience:40,service:'standing',origin:i<6?'jiankang':'luoyang'}))};return combatArmySnapshot(w,a,i<6?'attack':'defend');});
 aftermath.battles=Array.from({length:8},(_,i)=>({id:i+1,key:'city:luoyang',site:'luoyang',day:0,last:24,ended:24,round:24,stage:'clash',a:1001,b:1007,lossA:0,lossB:0,rounds:Array.from({length:24},(_,r)=>({day:r+1,round:r+1,stage:'clash',before:rows,after:rows,lossA:0,lossB:0}))}));aftermath.nextBattleId=9;
 const data=saves.serializeWorld(w);expect(new TextEncoder().encode(data).length).toBeGreaterThan(2_000_000);expect(saves.parseWorld(data).militaryAftermath!.battles).toEqual(aftermath.battles);
 await saveWorld(w);const restored=await loadWorld('manual');expect(restored!.militaryAftermath!.battles).toEqual(aftermath.battles);expect(restored!.realm!.armies).toEqual(w.realm!.armies);expect(restored!.people).toEqual(w.people);
 const envelope=JSON.parse(data);envelope.payload=envelope.payload.replace('"lossA":0','"lossA":1');expect(()=>saves.parseWorld(JSON.stringify(envelope))).toThrow('校验值');
});
it('rejects oversized reads before parsing and preserves the last slot when a write exceeds capacity',async()=>{
 const w=newCampaignWorld('xiao-yan',undefined,'sandbox');await saveWorld(w);const original=await loadWorld('manual'),oversized='x'.repeat(SAVE_MAX_BYTES+1);
 expect(()=>saves.parseWorld(oversized)).toThrow('32 MB');const put=vi.spyOn(IDBObjectStore.prototype,'put');vi.spyOn(saves,'serializeWorld').mockReturnValueOnce(oversized);
 await expect(saveWorld(w)).rejects.toThrow('本次未保存');expect(put).not.toHaveBeenCalled();expect(await loadWorld('manual')).toEqual(original);
});
