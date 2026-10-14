import {readFile,writeFile} from 'node:fs/promises';
import {compileOfficialPackage,createContentRealm,openPackagePreview} from './contentPackageCompiler.mjs';
const [action,path,...rest]=process.argv.slice(2);
let realm,session;
try{
 if(!['export','verify'].includes(action)||!path||rest.length)throw new Error('Usage: npm run content:package -- export|verify <package.json>');
 const {content,environment}=await compileOfficialPackage();
 if(action==='export')await writeFile(path,JSON.stringify(content,null,2)+'\n',{flag:'wx'});
 const input=JSON.parse(await readFile(path,'utf8'));
 realm=await createContentRealm();const {loadContentPackage}=await realm.ssrLoadModule('/src/core/contentPackage.ts');const loaded=await loadContentPackage(input,environment);
 let receipt;session=await openPackagePreview(loaded,environment,message=>{if(message.type==='receipt')receipt=message;});
 for(const request of [{type:'init'},{type:'new',characterId:loaded.tables.scripts.gameScripts.find(s=>s.id===loaded.tables.scripts.DEFAULT_SCRIPT).defaultCharacter,mode:'sandbox'}]){
  await session.dispatch({...request,requestId:'verify'});if(!receipt?.ok)throw new Error(receipt?.text??'开局校验无回执');
 }
 console.log(JSON.stringify({status:'valid',packageId:loaded.packageId,digest:loaded.digest,tables:Object.keys(loaded.tables).length,dependencies:loaded.dependencies,path,storage:'isolated-memory'},null,2));
}catch(error){console.error(error instanceof Error?error.message:String(error));process.exitCode=1;}
finally{await session?.close();await realm?.close();}
