import {createServer} from 'vite';
import {createHash} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
export const projectRoot=fileURLToPath(new URL('../',import.meta.url));
export async function createContentRealm(){
 return createServer({root:projectRoot,configFile:false,appType:'custom',logLevel:'error',server:{middlewareMode:true,hmr:false,ws:false,watch:null}});
}
async function fingerprint(roots){
 const hash=createHash('sha256');
 async function walk(path){for(const item of (await readdir(join(projectRoot,path),{withFileTypes:true})).sort((a,b)=>a.name<b.name?-1:1)){
  const name=path+'/'+item.name;if(item.isDirectory())await walk(name);else if(!/\.test\.|\.DS_Store/.test(name))hash.update(name).update('\0').update(await readFile(join(projectRoot,name))).update('\0');
 }}
 for(const root of roots)await walk(root);
 if(roots.includes('src/core'))for(const name of ['package-lock.json','scripts/contentPackageCompiler.mjs','scripts/contentPackagePlugin.mjs'])hash.update(name).update(await readFile(join(projectRoot,name)));
 return hash.digest('hex');
}
export async function compileOfficialPackage(){
 const [engine,assets]=await Promise.all([fingerprint(['src/core','src/data','src/worker']),fingerprint(['public'])]);
 const realm=await createContentRealm();
 try{
  const {captureContentTables}=await realm.ssrLoadModule('/src/data/contentTables.ts');
  const {compileContentPackage}=await realm.ssrLoadModule('/src/core/contentPackage.ts');
  // JSON removes optional undefined fields; the serialized package is the authority.
  const tables=JSON.parse(JSON.stringify(captureContentTables()));
  const environment={engine,assets,tables:Object.fromEntries(Object.entries(tables).map(([id,table])=>[id,Object.keys(table).sort()]))};
  const content=await compileContentPackage(tables,'official-nsd',environment);
  return {content,environment:{...environment,officialDigest:content.digest}};
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
