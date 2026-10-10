import {readFileSync,readdirSync} from 'node:fs';
import {join,basename,extname} from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';

/** Fingerprints canonical bytes: HTTP decompression cannot change the integrity check. */
export function mapResourcesPlugin() {
 const publicRoot=join(process.cwd(),'public'),entries={},assets=new Map();
 function add(path){
  const original=readFileSync(join(publicRoot,path)),source=path.endsWith('.gz')?gunzipSync(original):original;
  const sha256=createHash('sha256').update(source).digest('hex'),packed=/\.(bin|json|geojson|glb)(\.gz)?$/.test(path),name=basename(path).replace(/\.gz$/,'');
  const url=`map-assets/${sha256.slice(0,20)}-${name}${packed?'.gz':''}`;
  entries[path]={url,sha256,bytes:source.length,packed};assets.set(url,packed?gzipSync(source):source);
 }
 function walk(path){for(const item of readdirSync(join(publicRoot,path),{withFileTypes:true})){const child=path+'/'+item.name;if(item.isDirectory())walk(child);else if(!/\.(md|txt)$/.test(item.name))add(child);}}
 walk('art/campaign');walk('art/military');add('data/land.geojson');
 const version=createHash('sha256').update(JSON.stringify(entries)).digest('hex').slice(0,16);
 const sourceHash=createHash('sha256');
 function sourceTree(path){for(const item of readdirSync(path,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const child=join(path,item.name);if(item.isDirectory())sourceTree(child);else if(!/\.test\.[cm]?[jt]sx?$/.test(item.name))sourceHash.update(child).update(readFileSync(child));}}
 sourceTree('src');sourceHash.update(readFileSync('vite.config.ts')).update(readFileSync('scripts/mapResourcesPlugin.mjs'));
 let revision='source';try{revision=execFileSync('git',['rev-parse','--short','HEAD'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{/* Source archives still have a reproducible content identifier. */}
 const build=revision+'-'+sourceHash.digest('hex').slice(0,12),manifest=JSON.stringify({version,build,entries});
 return {name:'campaign-map-resources',
  config:()=>({define:{__MAP_RESOURCE_MANIFEST__:manifest}}),
  configureServer(server){server.middlewares.use((request,response,next)=>{
   const url=new URL(request.url??'/','http://localhost'),key=url.pathname.startsWith(server.config.base)?url.pathname.slice(server.config.base.length):url.pathname.replace(/^\//,'');
   if(key==='map-resources.json'){response.setHeader('Cache-Control','private, no-cache');response.setHeader('Content-Type','application/json');response.end(manifest);return;}
   const payload=assets.get(key);
   if(!payload)return next();
   response.setHeader('Cache-Control','private, max-age=31536000, immutable');response.setHeader('Content-Type',key.endsWith('.gz')?'application/gzip':extname(key)==='.png'?'image/png':extname(key)==='.webp'?'image/webp':extname(key)==='.jpg'?'image/jpeg':'application/octet-stream');response.setHeader('Content-Length',payload.length);response.end(payload);
  });},
  configurePreviewServer(server){server.middlewares.use((request,response,next)=>{const path=new URL(request.url??'/','http://localhost').pathname,base=server.config.base;if(assets.has(path.slice(base.length)))response.setHeader('Cache-Control','private, max-age=31536000, immutable');else if(path===base||path===base+'index.html'||path===base+'map-resources.json')response.setHeader('Cache-Control','private, no-cache');next();});},
  generateBundle(){for(const [fileName,source] of assets)this.emitFile({type:'asset',fileName,source});this.emitFile({type:'asset',fileName:'map-resources.json',source:manifest});},
 };
}
