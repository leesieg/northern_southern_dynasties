import {readFile} from 'node:fs/promises';
import {compileOfficialPackage,openPackagePreview} from './contentPackageCompiler.mjs';

// Bounded official-content smoke run for authors/AI. No production storage and no timer.
const args=process.argv.slice(2),characterId=args[0]??'xiao-gang',days=Number(args[1]??0);
if(args.length>3||!Number.isSafeInteger(days)||days<0||days>7){
 console.error('Usage: npm run content:preview -- [character-id] [days: 0..7] [package.json]');process.exitCode=1;
}else{
 let preview;
 try{
  const {content,environment}=await compileOfficialPackage();
  const input=args[2]?JSON.parse(await readFile(args[2],'utf8')):content;
  let snapshot,receipt;preview=await openPackagePreview(input,environment,message=>{
   if(message.type==='world')snapshot=message;
   if(message.type==='receipt')receipt=message;
  });
  async function request(value){receipt=undefined;await preview.dispatch({...value,requestId:'cli-preview'});if(!receipt)throw new Error('试玩未返回回执。');return receipt;}
  let result=await request({type:'init'});if(!result.ok)throw new Error(result.text);
  result=await request({type:'new',characterId,mode:'sandbox'});if(!result.ok)throw new Error(result.text);
  const initialSeed=snapshot.world.life.seed;
  for(let i=0;i<days;i++){result=await request({type:'step'});if(!result.ok)break;}
  const world=snapshot.world,completed=world.day===days;
  console.log(JSON.stringify({scope:'content-package-preview',packageId:input.packageId,digest:input.digest,storage:'isolated-memory',scriptId:world.scriptId,contentVersion:world.contentVersion,characterId,initialSeed,requestedDays:days,actualDays:world.day,status:completed?'completed':'paused',reason:result.text??null,person:world.people[0],armyCount:world.realm?.armies.length??0,saveSlots:snapshot.slots.map(s=>s.id)},null,2));
  if(!completed)process.exitCode=2;
 }catch(error){console.error(error instanceof Error?error.message:String(error));process.exitCode=1;}
 finally{await preview?.close();}
}
