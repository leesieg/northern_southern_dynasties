import {afterEach,expect,it,vi} from 'vitest';
import {newWorld} from './world';
import {serializeWorld,parseWorld} from './save';

afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();vi.resetModules();});

it('binds deployed saves to the current homepage account and rejects a changed session',async()=>{
 vi.stubEnv('BASE_URL','/games/fengyun-nanbeichao/');vi.resetModules();
 const requests:{url:string;options?:RequestInit}[]=[];
 let changed=false;const data=serializeWorld(newWorld());
 vi.stubGlobal('fetch',vi.fn(async(url:string,options?:RequestInit)=>{
  requests.push({url,options});
  if(url==='/agent-api/account')return Response.json({user:{id:'account-a'}});
  if(changed)return Response.json({error:'account_changed'},{status:409});
  if(options?.method==='POST')return Response.json({savedAt:123});
  if(url.endsWith('/manual'))return Response.json({data});
  return Response.json({saves:[{id:'manual',savedAt:123,day:0}]});
 }));
 const storage=await import('./storage');
 await storage.prepareStorage();
 expect(await storage.listSaves()).toEqual([{id:'manual',savedAt:123,day:0}]);
 expect(await storage.saveWorld(newWorld())).toBe(123);
 expect(await storage.loadWorld()).toEqual(parseWorld(data));
 expect(requests.filter(r=>r.url.startsWith('/agent-api/fynbc/')).every(r=>(r.options?.headers as Record<string,string>)['X-Fynbc-Account']==='account-a')).toBe(true);
 changed=true;
 await expect(storage.saveWorld(newWorld())).rejects.toThrow('账号会话已变更');
});

it.each([413,429,403,500,502,507,400])('reports HTTP %s without pretending the save succeeded',async(status)=>{
 vi.stubEnv('BASE_URL','/games/fengyun-nanbeichao/');vi.resetModules();
 vi.stubGlobal('fetch',vi.fn(async(url:string)=>url==='/agent-api/account'?Response.json({user:{id:'account-a'}}):new Response('private backend trace',{status})));
 const storage=await import('./storage');await storage.prepareStorage();
 await expect(storage.saveWorld(newWorld())).rejects.toThrow(`HTTP ${status}`);
 await expect(storage.saveWorld(newWorld())).rejects.toThrow('导出备份');
 await expect(storage.saveWorld(newWorld())).rejects.not.toThrow('private backend trace');
 if(status===413)await expect(storage.saveWorld(newWorld())).rejects.toThrow('MB');
});
it('handles a login page returned with HTTP 200 as an unconfirmed operation',async()=>{
 vi.stubEnv('BASE_URL','/games/fengyun-nanbeichao/');vi.resetModules();
 vi.stubGlobal('fetch',vi.fn(async(url:string)=>url==='/agent-api/account'?Response.json({user:{id:'account-a'}}):new Response('<html>login</html>',{status:200})));
 const storage=await import('./storage');await storage.prepareStorage();await expect(storage.saveWorld(newWorld())).rejects.toThrow('操作结果未确认');
});
it.each([{},null,{savedAt:-1},{savedAt:'123'},{error:'unavailable'}])('requires a valid server save receipt for %j',async(body)=>{
 vi.stubEnv('BASE_URL','/games/fengyun-nanbeichao/');vi.resetModules();
 vi.stubGlobal('fetch',vi.fn(async(url:string)=>url==='/agent-api/account'?Response.json({user:{id:'account-a'}}):Response.json(body)));
 const storage=await import('./storage');await storage.prepareStorage();await expect(storage.saveWorld(newWorld())).rejects.toThrow('未获确认');
});
