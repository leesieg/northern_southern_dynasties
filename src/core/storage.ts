import { DEFAULT_SCRIPT } from '../data/scripts';
import { parseWorld, serializeWorld } from './save';
import {assertSaveSize} from './saveCapacity';
import type { SaveInfo, World } from './types';
import {latestSaveInfo} from './simulationStorage';
export {latestSaveInfo} from './simulationStorage';

interface SaveRecord extends SaveInfo { data: string }
const DB_NAME = 'fynbc-world-v1';
const REMOTE = import.meta.env.BASE_URL.startsWith('/games/fengyun-nanbeichao/');
let accountId: string | null = null;
const API = '/agent-api/fynbc/saves';

export async function prepareStorage(): Promise<void> {
  if (!REMOTE) return;
  const response = await fetch('/agent-api/account', {credentials:'same-origin',cache:'no-store'});
  const body = response.ok ? await response.json() as {user?:{id?:string}} : null;
  if (!body?.user?.id) throw new Error('登录已失效，请回到游戏室重新登录。');
  accountId = body.user.id;
}
async function remote(path = '', options?: RequestInit): Promise<{saves?:SaveInfo[];data?:string|null;savedAt?:number}> {
  if (!accountId) throw new Error('请先登录主页账号，再进入游戏。');
  let response: Response;
  try { response = await fetch(API+path,{...options,credentials:'same-origin',cache:'no-store',headers:{'X-Fynbc-Account':accountId,...options?.headers}}); }
  catch { throw new Error('无法连接存档服务，请检查网络后重试；当前进度可导出备份。'); }
  if (response.status===401||response.status===409) throw new Error('账号会话已变更，请刷新页面后重新进入游戏。');
  if (!response.ok) {
    const writing=options?.method==='POST',size=writing&&typeof options.body==='string'?`（本次请求 ${(new TextEncoder().encode(options.body).length/1_000_000).toFixed(2)} MB）`:'';
    const reason=response.status===413?'存档请求超过服务器接收上限'+size:response.status===429?'存档请求过于频繁，请稍后重试':response.status===403?'当前账号无权访问此存档，请重新登录':response.status===507?'服务器存储空间不足':response.status>=500?'存档服务处理失败，请稍后重试':'存档请求被服务器拒绝';
    throw new Error(`${reason}（HTTP ${response.status}）。${writing?'本次保存未获确认，请导出备份后重试。':'请重试；若正在游戏，可先导出备份。'}`);
  }
  if(response.status===204)return {};
  try { return await response.json(); }
  catch { throw new Error('存档服务返回了无法识别的响应，操作结果未确认；请导出备份并重新登录后核查。'); }
}
function database(): Promise<IDBDatabase> {
  return new Promise((resolve,reject) => {
    const request = indexedDB.open(DB_NAME,1);
    request.onupgradeneeded = () => request.result.createObjectStore('saves',{keyPath:'id'});
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('无法打开本地存档。请检查浏览器存储权限。'));
    request.onblocked = () => reject(new Error('存档被其他窗口占用，请关闭旧窗口。'));
  });
}
async function readRecords(): Promise<SaveRecord[]> {
  const db = await database();
  return new Promise((resolve,reject) => {
    const tx = db.transaction('saves','readonly');
    const request = tx.objectStore('saves').getAll();
    tx.oncomplete = () => { db.close(); resolve(request.result as SaveRecord[]); };
    tx.onerror = tx.onabort = () => { db.close(); reject(new Error('读取本地存档失败。')); };
  });
}
export async function listSaves(): Promise<SaveInfo[]> {
  if (REMOTE) return [...((await remote()).saves??[])].sort((a,b)=>b.savedAt-a.savedAt);
  return (await readRecords()).sort((a,b)=>b.savedAt-a.savedAt).map(({id,savedAt,day,characterName,scriptId,mode})=>({id,savedAt,day,characterName,mode,scriptId:scriptId??DEFAULT_SCRIPT}));
}
export async function saveWorld(world: World, auto = false, backup?:'previous-run'): Promise<number> {
  const data = serializeWorld(world);
  assertSaveSize(data,'保存');
  if (REMOTE) {
    const result=await remote('',{method:'POST',headers:{'Content-Type':'application/json','X-Li-Client':'1'},body:JSON.stringify({slot:backup??(auto?'auto':'manual'),data})});
    if(!result||!Number.isSafeInteger(result.savedAt)||result.savedAt!<=0)throw new Error('服务器未返回有效保存凭据，本次保存未获确认；请导出备份后核查。');
    return result.savedAt!;
  }
  const db = await database();
  return new Promise((resolve,reject) => {
    const tx = db.transaction('saves','readwrite');
    const store = tx.objectStore('saves');
    const request = store.getAll();
    let savedAt = Date.now();
    request.onsuccess = () => {
      const all = request.result as SaveRecord[];
      savedAt = Math.max(savedAt, ...all.map(s=>s.savedAt+1));
      let id = backup??'manual';
      if (auto) {
        const slots = ['auto-1','auto-2','auto-3'];
        id = slots.find(s=>!all.some(r=>r.id === s)) ?? all.filter(r=>r.id.startsWith('auto-')).sort((a,b)=>a.savedAt-b.savedAt)[0].id;
      }
      store.put({id,savedAt,day:world.day,mode:world.mode,scriptId:world.scriptId??DEFAULT_SCRIPT,characterName:world.people[0].name,data} satisfies SaveRecord);
    };
    tx.oncomplete = () => { db.close(); resolve(savedAt); };
    tx.onerror = tx.onabort = () => { db.close(); reject(new Error('保存失败：浏览器存储不可用或空间不足。请导出存档备份。')); };
  });
}
export async function loadWorld(slot?: string): Promise<World | null> {
  if (REMOTE) {
    const id=slot??latestSaveInfo(await listSaves())?.id;if(!id)return null;
    const result=await remote('/'+encodeURIComponent(id));
    return result.data?parseWorld(result.data):null;
  }
  const records = (await readRecords()).sort((a,b)=>b.savedAt-a.savedAt);
  const record = records.find(r=>r.id===(slot??latestSaveInfo(records)?.id));
  return record ? parseWorld(record.data) : null;
}

export async function deleteSave(slot:string):Promise<void>{
 if(!['manual','previous-run','auto-1','auto-2','auto-3'].includes(slot))throw new Error('无效存档槽位。');
 if(REMOTE){await remote('/'+encodeURIComponent(slot),{method:'DELETE',headers:{'X-Li-Client':'1'}});return;}
 const db=await database();
 return new Promise((resolve,reject)=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').delete(slot);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=tx.onabort=()=>{db.close();reject(new Error('删除存档失败，请重试。'));};});
}
