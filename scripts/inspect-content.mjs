import {createServer} from 'vite';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

// Local, read-only entry shared by human authors and AI. No HTTP listener or game saves.
const args=process.argv.slice(2),command=args[0]??'summary';
if(!['summary','find','route'].includes(command)||command==='summary'&&args.length>1||command==='find'&&(args.length!==3||!['person','site','script'].includes(args[1]))||command==='route'&&args.length!==3){
 console.error('Usage: npm run content:inspect -- [summary | find person|site|script <query> | route <from-id> <to-id>]');
 process.exitCode=1;
}else{
 const server=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),configFile:false,appType:'custom',logLevel:'error',server:{middlewareMode:true,hmr:false,ws:false,watch:null}});
 try{
  const {createOfficialContent}=await server.ssrLoadModule('/src/data/officialContent.ts');
  const {canonicalContent}=await server.ssrLoadModule('/src/core/contentRegistry.ts');
  const registry=createOfficialContent(),source=registry.snapshot;
  const metadata={format:source.format,schemaVersion:source.schemaVersion,packageId:source.packageId,contentVersion:source.contentVersion,catalogSha256:createHash('sha256').update(canonicalContent(source)).digest('hex'),loadablePackage:false};
  let result;
  if(command==='summary')result={counts:{sites:source.sites.length,roads:source.roads.length,characters:source.characters.length,people:source.people.length,families:source.families.length,familyPeople:source.familyPeople.length,scripts:source.scripts.length},limitations:['只读内容目录；不是可加载的完整内容包','尚不支持把自定义目录送入游戏模拟','摘要仅覆盖此目录，不能作为完整规则或存档锁']};
  else if(command==='find'){
   const values=args[1]==='person'?source.familyPeople:args[1]==='site'?source.sites:source.scripts;
   const query=args[2].toLocaleLowerCase();result={items:values.filter(value=>value.id.toLocaleLowerCase().includes(query)||value.name.toLocaleLowerCase().includes(query))};
  }else{
   if(!registry.map.getSite(args[1])||!registry.map.getSite(args[2]))throw new Error('地图中不存在此地点。');
   result={route:registry.map.planRoute(args[1],args[2]),scope:'地理道路；未包含本局外交、国境或人物通行权限'};
  }
  console.log(JSON.stringify({...metadata,...result},null,2));
 }catch(error){console.error(error instanceof Error?error.message:String(error));process.exitCode=1;}
 finally{await server.close();}
}
