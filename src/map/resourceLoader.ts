export interface MapResourceEntry{url:string;sha256:string;bytes:number;packed:boolean;}
export interface MapResourceManifest{version:string;build?:string;entries:Record<string,MapResourceEntry>;}
declare const __MAP_RESOURCE_MANIFEST__:MapResourceManifest;
const manifest:MapResourceManifest=typeof __MAP_RESOURCE_MANIFEST__==='undefined'?{version:'development',entries:{}}:__MAP_RESOURCE_MANIFEST__;
export type ResourceFailure='auth'|'http'|'timeout'|'network'|'corrupt';
export class MapResourceError extends Error{
 constructor(readonly kind:ResourceFailure,readonly resource:string,readonly status=0){super(kind==='auth'?'登录已失效，请重新登录后继续。':kind==='timeout'?'连接较慢，资源读取超时。':kind==='network'?'网络连接暂时中断。':kind==='corrupt'?'地图资源校验未通过。':status===404?'当前版本缺少地图资源。':`地图资源暂时不可用（${status}）。`);this.name='MapResourceError';}
}
interface ResourceOptions{signal?:AbortSignal;priority?:number;timeout?:number;}
interface Diagnostic{time:string;version:string;build:string;resource:string;kind:string;status:number;attempt:number;elapsedMs:number;}
const diagnostics:Diagnostic[]=[];
function record(diagnostic:Diagnostic){diagnostics.push(diagnostic);if(diagnostics.length>80)diagnostics.shift();}
let cacheIssueReported=false;
function cacheIssue(){if(cacheIssueReported)return;cacheIssueReported=true;const diagnostic={time:new Date().toISOString(),version:manifest.version,build:manifest.build??manifest.version,resource:'elevation-cache',kind:'cache-unavailable',status:0,attempt:0,elapsedMs:0};record(diagnostic);console.info('[Map cache: continuing with network]',diagnostic);}
export function mapResourceDiagnostics(){return {version:manifest.version,build:manifest.build,failures:[...diagnostics]};}
const abort=()=>new DOMException('地图读取已取消','AbortError');
function delay(ms:number,signal?:AbortSignal){return new Promise<void>((resolve,reject)=>{if(signal?.aborted)return reject(abort());const done=()=>{signal?.removeEventListener('abort',cancel);resolve();},timer=setTimeout(done,ms),cancel=()=>{clearTimeout(timer);signal?.removeEventListener('abort',cancel);reject(abort());};signal?.addEventListener('abort',cancel,{once:true});});}
/** Four transfers total; base terrain precedes detail, artwork and models. */
export function resourceQueue(limit=4){
 let active=0;const waiting:{priority:number;start:()=>void}[]=[];
 function pump(){waiting.sort((a,b)=>a.priority-b.priority);while(active<limit&&waiting.length){active++;waiting.shift()!.start();}}
 return function run<T>(work:()=>Promise<T>,priority=1,signal?:AbortSignal){return new Promise<T>((resolve,reject)=>{
  if(signal?.aborted)return reject(abort());
  const item={priority,start(){signal?.removeEventListener('abort',cancel);if(signal?.aborted){active--;reject(abort());pump();return;}void work().then(resolve,reject).finally(()=>{active--;pump();});}};
  const cancel=()=>{const i=waiting.indexOf(item);if(i>=0){waiting.splice(i,1);reject(abort());}};
  waiting.push(item);signal?.addEventListener('abort',cancel,{once:true});pump();
 });};
}
const transfer=resourceQueue();
const CACHE='fynbc-map-elevation-v1';let cacheWrites=Promise.resolve();
export async function flushMapResourceCache(){await cacheWrites;}
async function tileCache(){try{return typeof caches==='undefined'?undefined:await caches.open(CACHE);}catch{cacheIssue();return undefined;}}
async function persistTile(url:string,payload:ArrayBuffer){
 // Static elevation only. No account responses, saved games or failed responses enter this cache.
 cacheWrites=cacheWrites.then(async()=>{const cache=await tileCache();if(!cache)return;await cache.delete(url);await cache.put(url,new Response(payload));const keys=await cache.keys();for(const key of keys.slice(0,Math.max(0,keys.length-96)))await cache.delete(key);}).catch(()=>cacheIssue());
 await cacheWrites;
}
async function unpack(payload:ArrayBuffer,packed:boolean){const signature=new Uint8Array(payload,0,Math.min(2,payload.byteLength));return packed&&signature[0]===31&&signature[1]===139?new Response(new Blob([payload]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():payload;}
export async function validateResource(payload:ArrayBuffer,entry:MapResourceEntry|undefined,path:string){
 let decoded:ArrayBuffer;try{decoded=await unpack(payload,entry?.packed??path.endsWith('.gz'));}catch{throw new MapResourceError('corrupt',path);}
 if(entry){if(decoded.byteLength!==entry.bytes)throw new MapResourceError('corrupt',path);const digest=await crypto.subtle.digest('SHA-256',decoded),hex=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');if(hex!==entry.sha256)throw new MapResourceError('corrupt',path);}
 return decoded;
}
export function createMapResourceLoader(catalog:MapResourceManifest,base:string){
 return async function read(path:string,options:ResourceOptions={}){
  const entry=catalog.entries[path],url=base+(entry?.url??path),persistent=!!entry&&/^art\/campaign\/elevation\/\d+-\d+\.bin\.gz$/.test(path);
  if(options.signal?.aborted)throw abort();
  if(persistent){const cache=await tileCache();let cached:Response|undefined;try{cached=await cache?.match(url);}catch{cacheIssue();}if(cached){try{const data=await validateResource(await cached.arrayBuffer(),entry,path);if(options.signal?.aborted)throw abort();void persistTile(url,data);return new Response(data);}catch(error){if(options.signal?.aborted)throw error;try{await cache?.delete(url);}catch{cacheIssue();}}}}
  for(let attempt=1;attempt<=3;attempt++){
   const start=performance.now();let retryAfter=0,timed:AbortSignal|undefined;
   try{
    return await transfer(async()=>{
     timed=AbortSignal.timeout(options.timeout??25000);const signal=options.signal?AbortSignal.any([options.signal,timed]):timed;
     const response=await fetch(url,{signal,credentials:'same-origin',cache:'default',redirect:'manual'}),type=response.headers.get('content-type')??'';
     if(response.status===401||response.status===403||response.type==='opaqueredirect'||response.status>=300&&response.status<400)throw new MapResourceError('auth',path,response.status);
     if(!response.ok){retryAfter=Math.min(5000,Math.max(0,Number(response.headers.get('retry-after'))*1000||0));throw new MapResourceError('http',path,response.status);}
     if(type.includes('text/html'))throw new MapResourceError('auth',path,response.status);
     const payload=await validateResource(await response.arrayBuffer(),entry,path);if(signal.aborted)throw signal.reason;
     if(persistent)void persistTile(url,payload);return new Response(payload,{headers:{'content-type':type}});
    },options.priority??1,options.signal);
   }catch(error){
    if(options.signal?.aborted)throw abort();
    const failure=error instanceof MapResourceError?error:new MapResourceError(timed?.aborted||error instanceof DOMException&&error.name==='TimeoutError'?'timeout':'network',path);
    const diagnostic={time:new Date().toISOString(),version:catalog.version,build:catalog.build??catalog.version,resource:path,kind:failure.kind,status:failure.status,attempt,elapsedMs:Math.round(performance.now()-start)};record(diagnostic);console.warn('[Map resource]',diagnostic);
    const transient=failure.kind==='network'||failure.kind==='timeout'||failure.kind==='http'&&(failure.status===408||failure.status===429||failure.status>=500);
    if(!transient||attempt===3)throw failure;
    await delay(Math.max(retryAfter,400*2**(attempt-1)+Math.random()*200),options.signal);
   }
  }throw new MapResourceError('network',path);
 };
}
export const mapResource=createMapResourceLoader(manifest,import.meta.env.BASE_URL);
