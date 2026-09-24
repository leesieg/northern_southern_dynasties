import {afterEach,expect,it,vi} from 'vitest';
import {newWorld} from './world';
import {serializeWorld} from './save';

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
  if(url.endsWith('/latest'))return Response.json({data});
  return Response.json({saves:[]});
 }));
 const storage=await import('./storage');
 await storage.prepareStorage();
 expect(await storage.listSaves()).toEqual([]);
 expect(await storage.saveWorld(newWorld())).toBe(123);
 expect(await storage.loadWorld()).toEqual(newWorld());
 expect(requests.filter(r=>r.url.startsWith('/agent-api/fynbc/')).every(r=>(r.options?.headers as Record<string,string>)['X-Fynbc-Account']==='account-a')).toBe(true);
 changed=true;
 await expect(storage.saveWorld(newWorld())).rejects.toThrow('账号会话已变更');
});
