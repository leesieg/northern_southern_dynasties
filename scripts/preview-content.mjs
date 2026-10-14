import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';

// Bounded official-content smoke run for authors/AI. No production storage and no timer.
const args=process.argv.slice(2),characterId=args[0]??'xiao-gang',days=Number(args[1]??0);
if(args.length>2||!Number.isSafeInteger(days)||days<0||days>7){
 console.error('Usage: npm run content:preview -- [character-id] [days: 0..7]');process.exitCode=1;
}else{
 const server=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),configFile:false,appType:'custom',logLevel:'error',server:{middlewareMode:true,hmr:false,ws:false,watch:null}});
 try{
  const {createPreviewSession}=await server.ssrLoadModule('/src/worker/previewSession.ts');
  let snapshot,receipt;const preview=createPreviewSession(message=>{
   if(message.type==='world')snapshot=message;
   if(message.type==='receipt')receipt=message;
  });
  async function request(value){receipt=undefined;await preview.dispatch({...value,requestId:'cli-preview'});if(!receipt)throw new Error('试玩未返回回执。');return receipt;}
  let result=await request({type:'init'});if(!result.ok)throw new Error(result.text);
  result=await request({type:'new',characterId,mode:'sandbox'});if(!result.ok)throw new Error(result.text);
  const initialSeed=snapshot.world.life.seed;
  for(let i=0;i<days;i++){result=await request({type:'step'});if(!result.ok)break;}
  const world=snapshot.world,completed=world.day===days;
  console.log(JSON.stringify({scope:'official-content-preview',storage:'isolated-memory',scriptId:world.scriptId,contentVersion:world.contentVersion,characterId,initialSeed,requestedDays:days,actualDays:world.day,status:completed?'completed':'paused',reason:result.text??null,person:world.people[0],armyCount:world.realm?.armies.length??0,saveSlots:snapshot.slots.map(s=>s.id)},null,2));
  if(!completed)process.exitCode=2;
 }catch(error){console.error(error instanceof Error?error.message:String(error));process.exitCode=1;}
 finally{await server.close();}
}
