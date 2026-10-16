import {contentDigest,loadContentPackage,type ContentEnvironment,type ContentPackage} from '../core/contentPackage';
import {sameContentLock,officialSaveCompatible,type ContentLock} from '../core/contentBinding';
import {storageScope} from './saveFiles';
import {assertSaveSize} from '../core/saveCapacity';
export interface InstalledContent {digest:string;packageId:string;name:string;scripts:{id:string;name:string;year:number}[];installedAt:number}
export type LaunchRequest={type:'new';mode?:'sandbox'|'tutorial';scriptId?:string;characterId?:string}|{type:'import';text:string};
export interface ContentLaunch {id:string;digest:string;scope?:string;request?:LaunchRequest;rollback?:{digest:string;text:string}}
const DB='fynbc-content-v1';
async function database():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{r.result.createObjectStore('packages',{keyPath:'digest'});r.result.createObjectStore('launches',{keyPath:'id'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(new Error('无法打开剧本藏库，请检查浏览器存储权限。'));r.onblocked=()=>reject(new Error('剧本藏库被其他窗口占用。'));});}
async function transact<T>(store:string,mode:IDBTransactionMode,run:(s:IDBObjectStore)=>IDBRequest<T>):Promise<T>{const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction(store,mode);let r:IDBRequest<T>;try{r=run(tx.objectStore(store));}catch(e){db.close();reject(e);return;}tx.oncomplete=()=>{db.close();resolve(r.result);};tx.onerror=tx.onabort=()=>{db.close();reject(tx.error??new Error('剧本藏库写入失败；原内容仍保留。'));};});}
export function packageLock(p:ContentPackage):ContentLock{return {packageId:p.packageId,digest:p.digest,engine:p.dependencies.engine,assets:p.dependencies.assets};}
export function packageInfo(p:ContentPackage,installedAt=0):InstalledContent {const scripts=p.tables.scripts.gameScripts as InstalledContent['scripts'];return {digest:p.digest,packageId:p.packageId,name:scripts.map(s=>s.name).join('／'),scripts:scripts.map(({id,name,year})=>({id,name,year})),installedAt};}
function safeJSON(v:unknown,depth=0,counter={n:0}){if(depth>64||++counter.n>500000)throw new Error('内容文件层级或节点数超出限制。');if(v&&typeof v==='object')for(const [k,x] of Object.entries(v)){if(['__proto__','prototype','constructor'].includes(k))throw new Error('内容文件包含危险字段。');safeJSON(x,depth+1,counter);}}
export async function decodePackageFile(source:string,environment:ContentEnvironment):Promise<ContentPackage>{
 if(new TextEncoder().encode(source).length>16*1024*1024)throw new Error('内容文件超过 16 MiB。');const value=JSON.parse(source);safeJSON(value);
 if(value?.format==='fynbc-content-package')return loadContentPackage(value,environment);
 if(!['fynbc-studio-release-v1','fynbc-studio-release-v2'].includes(value?.format)||Object.keys(value).sort().join()!=='authoring,content,digest,format,manifest,scenarioId')throw new Error('请选择运行内容包或完整发行包；作者备份须在创作台恢复。');
 const {digest,...body}=value;if(await contentDigest(body)!==digest)throw new Error('发行包摘要错误。');
 const m=value.manifest;if(m?.engine!==environment.engine||m?.assets!==environment.assets||!Array.isArray(m.files)||m.files.length>10000)throw new Error('发行包规则或资产版本不匹配，请在创作台迁移并重新导出。');
 const paths=new Set();for(const f of m.files){if(!f||Object.keys(f).sort().join()!=='bytes,path,sha256'||typeof f.path!=='string'||!f.path||f.path.includes('\\')||f.path.includes(':')||f.path.split('/').some((p:string)=>!p||p==='.'||p==='..')||paths.has(f.path)||!Number.isSafeInteger(f.bytes)||f.bytes<0||!/^[a-f0-9]{64}$/.test(f.sha256))throw new Error('发行包资产清单无效。');paths.add(f.path);}
 const expected=new Map((environment.assetFiles??[]).map(f=>[f.path,f]));if(!expected.size||expected.size!==m.files.length||m.files.some((f:{path:string;bytes:number;sha256:string})=>expected.get(f.path)?.bytes!==f.bytes||expected.get(f.path)?.sha256!==f.sha256))throw new Error('发行包资产清单与当前游戏资产不一致。');
 const p=await loadContentPackage(value.content,environment);if(!(p.tables.scripts.gameScripts as {id:string}[]).some(s=>s.id===value.scenarioId))throw new Error('发行包引用的剧本不存在。');return p;
}
export function inspectSaveLock(source:string):ContentLock|undefined {
 assertSaveSize(source);const e=JSON.parse(source);if(!e||e.format!=='fynbc-save'||e.version!==1||typeof e.payload!=='string')throw new Error('存档格式错误，当前进度未改变。');let hash=2166136261;for(let i=0;i<e.payload.length;i++)hash=Math.imul(hash^e.payload.charCodeAt(i),16777619);if((hash>>>0).toString(16)!==e.checksum)throw new Error('存档校验值错误，当前进度未改变。');
 if(e.content===undefined)return;const c=e.content;if(!c||Object.keys(c).sort().join()!=='assets,digest,engine,packageId'||typeof c.packageId!=='string'||!['digest','engine','assets'].every(k=>typeof c[k]==='string'&&/^[a-f0-9]{64}$/.test(c[k])))throw new Error('存档内容锁格式错误。');return c;
}
export function createContentLibrary(official:ContentPackage,environment:ContentEnvironment,scope:()=>string=storageScope){
 async function get(digest:string):Promise<ContentPackage>{if(digest===official.digest)return loadContentPackage(official,environment);const row=await transact<any>('packages','readonly',s=>s.get(digest));if(!row)throw new Error('缺少存档绑定的内容包 '+digest.slice(0,12)+'。请导入原内容包，当前进度未改变。');if(row.content?.dependencies?.engine!==environment.engine||row.content?.dependencies?.assets!==environment.assets)throw new Error('原内容包规则或资产版本不匹配。请使用匹配的游戏版本；创作台可迁移作者内容，但不会自动迁移旧行记。');const p=await loadContentPackage(row.content,environment);if(p.digest!==digest)throw new Error('已安装内容包记录损坏，请保留备份并重新导入原包。');return p;}
 return {get,
  async pending():Promise<ContentLaunch[]>{return (await transact<ContentLaunch[]>('launches','readonly',s=>s.getAll())).filter(l=>l.scope===scope());},
  async list():Promise<InstalledContent[]>{const rows=await transact<any[]>('packages','readonly',s=>s.getAll());return [packageInfo(official),...rows.filter(r=>r.digest!==official.digest).map(r=>r.info??packageInfo(r.content,r.installedAt))];},
  async install(p:ContentPackage){const valid=await loadContentPackage(p,environment);if(p.digest===official.digest)return packageInfo(valid);const row=await transact<any>('packages','readonly',s=>s.get(p.digest)),installedAt=row?.installedAt??Date.now(),info=packageInfo(valid,installedAt);if(row){try{await get(p.digest);return info;}catch{await transact('packages','readwrite',s=>s.put({digest:valid.digest,content:valid,installedAt,info}));return info;}}await transact('packages','readwrite',s=>s.add({digest:valid.digest,content:valid,installedAt,info}));return info;},
  async resolve(source:string){const lock=inspectSaveLock(source);if(!lock||officialSaveCompatible(lock,packageLock(official),environment.officialSaves))return get(official.digest);const p=await get(lock.digest);if(!sameContentLock(lock,packageLock(p)))throw new Error('存档内容包、规则或资产版本不匹配，当前进度未改变。');return p;},
  async remove(digest:string,referenced:string[]){if(digest===official.digest)throw new Error('官方基础内容不可移除。');if(referenced.includes(digest))throw new Error('此包仍被存档或当前窗口引用。请先导出内容包与相关存档，再处理引用。');await transact('packages','readwrite',s=>s.delete(digest));},
  async stage(launch:ContentLaunch){await get(launch.digest);await transact('launches','readwrite',s=>s.add({...launch,scope:scope()}));},
  async launch(id:string):Promise<ContentLaunch|undefined>{const l=await transact<ContentLaunch|undefined>('launches','readonly',s=>s.get(id));if(l&&l.scope!==scope()){const error=new Error('此内容切换属于另一账号。请切回原账号，或取消本窗口切换后读取当前账号行记。');error.name='ContentScopeError';throw error;}return l;},
  async clearLaunch(id:string){await transact('launches','readwrite',s=>s.delete(id));},
 };
}
