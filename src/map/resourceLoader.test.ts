import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {createMapResourceLoader,flushMapResourceCache,MapResourceError,resourceQueue,validateResource,type MapResourceEntry} from './resourceLoader';
const empty={version:'test',entries:{}};
const read=createMapResourceLoader(empty,'/game/');
beforeEach(()=>{vi.spyOn(console,'warn').mockImplementation(()=>{});});
afterEach(async()=>{await flushMapResourceCache();vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();});
async function entry(data:Uint8Array):Promise<MapResourceEntry>{const payload=new Uint8Array(data).buffer,digest=await crypto.subtle.digest('SHA-256',payload),sha256=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');return {url:`map-assets/${sha256.slice(0,20)}-tile.gz`,sha256,bytes:data.byteLength,packed:true};}
it('retries transient failures and succeeds without restarting the map',async()=>{
 vi.useFakeTimers();const fetcher=vi.fn().mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce(new Response('',{status:503})).mockResolvedValue(new Response('ok'));vi.stubGlobal('fetch',fetcher);
 const pending=read('art/campaign/test.bin');await vi.runAllTimersAsync();expect(await (await pending).text()).toBe('ok');expect(fetcher).toHaveBeenCalledTimes(3);
});
it.each([401,403,302])('stops on authentication response %i instead of retrying or parsing it',async status=>{
 const fetcher=vi.fn().mockResolvedValue(new Response('',{status}));vi.stubGlobal('fetch',fetcher);await expect(read('terrain')).rejects.toMatchObject({kind:'auth'});expect(fetcher).toHaveBeenCalledTimes(1);expect(fetcher.mock.calls[0][1].redirect).toBe('manual');
});
it('rejects a login HTML page with status 200',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('<html>login</html>',{headers:{'content-type':'text/html'}})));await expect(read('terrain')).rejects.toMatchObject({kind:'auth'});});
it('reports missing files separately and never retries a 404 HTML response',async()=>{const fetcher=vi.fn().mockResolvedValue(new Response('<html>missing</html>',{status:404,headers:{'content-type':'text/html'}}));vi.stubGlobal('fetch',fetcher);await expect(read('terrain')).rejects.toMatchObject({kind:'http',status:404});expect(fetcher).toHaveBeenCalledTimes(1);});
it('cancels backoff immediately when the map is removed',async()=>{vi.useFakeTimers();const controller=new AbortController(),fetcher=vi.fn().mockRejectedValue(new TypeError('offline'));vi.stubGlobal('fetch',fetcher);const pending=read('terrain',{signal:controller.signal}),assertion=expect(pending).rejects.toMatchObject({name:'AbortError'});await vi.advanceTimersByTimeAsync(1);controller.abort();await assertion;expect(fetcher).toHaveBeenCalledTimes(1);});
it('recognizes body timeout AbortError as retryable timeout',async()=>{vi.useFakeTimers();const controller=new AbortController();controller.abort(new DOMException('timeout','TimeoutError'));vi.spyOn(AbortSignal,'timeout').mockReturnValue(controller.signal);const fetcher=vi.fn().mockRejectedValue(new DOMException('body aborted','AbortError'));vi.stubGlobal('fetch',fetcher);const pending=read('terrain'),assertion=expect(pending).rejects.toMatchObject({kind:'timeout'});await vi.runAllTimersAsync();await assertion;expect(fetcher).toHaveBeenCalledTimes(3);});
it('prioritizes terrain over queued models, limits concurrency and discards canceled work',async()=>{
 const run=resourceQueue(1),order:string[]=[];let release!:()=>void;const first=run(()=>new Promise<void>(resolve=>{release=resolve;}));const controller=new AbortController(),canceled=run(async()=>{order.push('canceled');},3,controller.signal),assertion=expect(canceled).rejects.toMatchObject({name:'AbortError'});const model=run(async()=>{order.push('model');},3),terrain=run(async()=>{order.push('terrain');},0);controller.abort();release();await Promise.all([first,model,terrain,assertion]);expect(order).toEqual(['terrain','model']);
});
it('validates raw gzip and HTTP-decoded data, including same-size corruption',async()=>{
 const data=new Uint8Array([1,2,3,4]),meta=await entry(data),compressed=await new Response(new Blob([data]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();expect(new Uint8Array(await validateResource(compressed,meta,'tile'))).toEqual(data);expect(new Uint8Array(await validateResource(data.buffer,meta,'tile'))).toEqual(data);await expect(validateResource(new Uint8Array([1,2,3,5]).buffer,meta,'tile')).rejects.toBeInstanceOf(MapResourceError);
});
function fakeCache(){const stored=new Map<string,Response>();return {stored,match:async(url:string)=>stored.get(url)?.clone(),delete:async(url:string|Request)=>stored.delete(typeof url==='string'?url:url.url),put:async(url:string,response:Response)=>{stored.set(url,response.clone());},keys:async()=>[...stored.keys()].map(url=>new Request(url))};}
it('reuses validated persistent tiles, evicts corruption and caps the cache at 96 entries',async()=>{
 const data=new Uint8Array([1,2]),meta=await entry(data),cache=fakeCache();vi.stubGlobal('caches',{open:async()=>cache});const fetcher=vi.fn().mockImplementation(async()=>new Response(data));vi.stubGlobal('fetch',fetcher);
 const paths=Array.from({length:97},(_,i)=>`art/campaign/elevation/${i}-0.bin.gz`),entries=Object.fromEntries(paths.map((path,i)=>[path,{...meta,url:`map-assets/${meta.sha256.slice(0,20)}-${i}.gz`}])) ,loader=createMapResourceLoader({version:'test',entries},'https://game.test/');
 await loader(paths[0]);await flushMapResourceCache();await loader(paths[0]);expect(fetcher).toHaveBeenCalledTimes(1);await flushMapResourceCache();
 cache.stored.set('https://game.test/'+entries[paths[0]].url,new Response(new Uint8Array([9,9])));await loader(paths[0]);expect(fetcher).toHaveBeenCalledTimes(2);await flushMapResourceCache();
 await Promise.all(paths.slice(1).map(path=>loader(path)));await flushMapResourceCache();expect(cache.stored.size).toBe(96);
});
it('continues with network loading when CacheStorage is unavailable',async()=>{vi.stubGlobal('caches',{open:async()=>{throw new Error('storage blocked');}});const data=new Uint8Array([7]),meta=await entry(data),path='art/campaign/elevation/1-1.bin.gz',loader=createMapResourceLoader({version:'test',entries:{[path]:meta}},'https://game.test/');vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(data)));expect(new Uint8Array(await (await loader(path)).arrayBuffer())).toEqual(data);});
