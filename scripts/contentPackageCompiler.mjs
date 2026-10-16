import {createServer} from 'vite';
import {createHash,randomUUID} from 'node:crypto';
import {readFile,readdir,mkdir,writeFile,rename} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
export const projectRoot=fileURLToPath(new URL('../',import.meta.url));
export async function createContentRealm(){
 return createServer({root:projectRoot,configFile:false,appType:'custom',logLevel:'error',optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,ws:false,watch:null}});
}
async function fingerprint(roots,files){
 const hash=createHash('sha256');
 async function walk(path){for(const item of (await readdir(join(projectRoot,path),{withFileTypes:true})).sort((a,b)=>a.name<b.name?-1:1)){
  const name=path+'/'+item.name;if(item.isDirectory())await walk(name);else if(!/\.test\.|\.DS_Store/.test(name)){const bytes=await readFile(join(projectRoot,name));hash.update(name).update('\0').update(bytes).update('\0');if(files)files.push({path:name.slice(7),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
 }}
 for(const root of roots)await walk(root);
 if(roots.includes('src/core'))for(const name of ['package-lock.json','scripts/contentPackageCompiler.mjs','scripts/contentPackagePlugin.mjs'])hash.update(name).update(await readFile(join(projectRoot,name)));
 return hash.digest('hex');
}
export async function compileOfficialPackage({development=false}={}){
 const assetFiles=[];const [engine,assets]=await Promise.all([fingerprint(['src/core','src/data','src/worker']),fingerprint(['public'],assetFiles)]);
 const realm=await createContentRealm();
 try{
  const {captureContentTables}=await realm.ssrLoadModule('/src/data/contentTables.ts');
  const {compileContentPackage}=await realm.ssrLoadModule('/src/core/contentPackage.ts');
  // JSON removes optional undefined fields; the serialized package is the authority.
  const tables=JSON.parse(JSON.stringify(captureContentTables()));
  const environment={engine,assets,tables:Object.fromEntries(Object.entries(tables).map(([id,table])=>[id,Object.keys(table).sort()]))};
  const content=await compileContentPackage(tables,'official-nsd',environment);
  const officialSaves=[];
  // Only trusted local compilation records checkpoints. Imported packages and
  // save headers cannot extend this allowlist; unchanged tables are required.
  if(development){const dir=join(projectRoot,'.cache/content-studio/official-history');await mkdir(dir,{recursive:true});const tablesDigest=createHash('sha256').update(JSON.stringify(tables)).digest('hex'),lock={packageId:content.packageId,digest:content.digest,engine,assets};
   const temporary=join(dir,'.'+randomUUID()+'.tmp');await writeFile(temporary,JSON.stringify({tablesDigest,lock}),{flag:'wx'});await rename(temporary,join(dir,content.digest+'.json'));
   for(const name of (await readdir(dir)).filter(n=>/^[a-f0-9]{64}\.json$/.test(n)).slice(-256)){const v=JSON.parse(await readFile(join(dir,name),'utf8'));if(v.tablesDigest===tablesDigest&&v.lock?.packageId==='official-nsd'&&v.lock.assets===assets&&Object.keys(v.lock).length===4&&['digest','engine','assets'].every(k=>/^[a-f0-9]{64}$/.test(v.lock[k])))officialSaves.push(v.lock);}
  }
  return {content,environment:{...environment,officialDigest:content.digest,assetFiles,...(development?{officialSaves}:{})}};
 }finally{await realm.close();}
}
/** A separate Vite SSR graph is the Node host equivalent of a browser Worker.
 * It owns all module caches and never imports the production storage adapter. */
export async function openPackagePreview(content,environment,onReply){
 const realm=await createContentRealm();
 try{
  const {installContentPackage}=await realm.ssrLoadModule('/src/core/contentPackage.ts');
  await installContentPackage(content,environment);
  const {createPreviewSession}=await realm.ssrLoadModule('/src/worker/previewSession.ts');
  const session=createPreviewSession(onReply);let closed=false;
  return {async dispatch(request){if(closed)throw new Error('试玩实例已关闭。');return session.dispatch(request);},async tick(){if(closed)throw new Error('试玩实例已关闭。');return session.tick();},async close(){closed=true;await realm.close();},
   async inspect(module){if(closed)throw new Error('试玩实例已关闭。');return realm.ssrLoadModule(module);}};
 }catch(error){await realm.close();throw error;}
}
