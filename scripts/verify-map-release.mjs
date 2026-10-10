import {readFile,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';

const args=process.argv.slice(2),directory=resolve(args[0]??'dist'),urlIndex=args.indexOf('--url'),remote=urlIndex>=0?new URL(args[urlIndex+1]):undefined;
const catalog=JSON.parse(await readFile(join(directory,'map-resources.json'),'utf8'));
function canonical(bytes,entry){return entry.packed&&bytes[0]===31&&bytes[1]===139?gunzipSync(bytes):bytes;}
function verify(bytes,entry,path){const decoded=canonical(bytes,entry);if(decoded.length!==entry.bytes||createHash('sha256').update(decoded).digest('hex')!==entry.sha256)throw new Error(`Integrity mismatch: ${path}`);if(/\.(json|geojson)$/.test(path))JSON.parse(decoded.toString('utf8'));if(path.endsWith('.glb')&&(decoded.length<12||decoded.toString('ascii',0,4)!=='glTF'||decoded.readUInt32LE(4)!==2||decoded.readUInt32LE(8)!==decoded.length))throw new Error(`Invalid GLB container: ${path}`);return decoded;}
let count=0,wire=0;
for(const [path,entry] of Object.entries(catalog.entries)){
 if(!/^map-assets\/[a-f0-9]{20}-[^/]+$/.test(entry.url)||!entry.url.startsWith('map-assets/'+entry.sha256.slice(0,20)+'-'))throw new Error(`Invalid asset path: ${path}`);
 const bytes=await readFile(join(directory,entry.url));verify(bytes,entry,path);count++;wire+=bytes.length;
}
const manifest=JSON.parse(verify(await readFile(join(directory,catalog.entries['art/campaign/elevation/manifest.json'].url)),catalog.entries['art/campaign/elevation/manifest.json'],'elevation manifest'));
for(let x=manifest.west;x<manifest.east;x++)for(let y=manifest.north;y<manifest.south;y++){const path=`art/campaign/elevation/${x}-${y}.bin.gz`;if(catalog.entries[path]?.bytes!==manifest.tileSize**2*2)throw new Error(`Missing or incomplete tile: ${path}`);}
if(manifest.tiles!==(manifest.east-manifest.west)*(manifest.south-manifest.north))throw new Error('Elevation count mismatch');
const national=JSON.parse(verify(await readFile(join(directory,catalog.entries['art/campaign/national-terrain.json'].url)),catalog.entries['art/campaign/national-terrain.json'],'national metadata'));
if(catalog.entries['art/campaign/national-elevation.bin'].bytes!==national.columns*national.rows*4)throw new Error('National DEM dimensions mismatch');
const basePaths=['art/campaign/national-terrain.json','art/campaign/national-elevation.bin','data/land.geojson','art/campaign/river-corridors.geojson'];
const baseWire=(await Promise.all(basePaths.map(path=>stat(join(directory,catalog.entries[path].url))))).reduce((total,s)=>total+s.size,0);
console.log(JSON.stringify({build:catalog.build,version:catalog.version,verified:count,elevationTiles:manifest.tiles,packedMiB:+(wire/2**20).toFixed(2),baseMiB:+(baseWire/2**20).toFixed(2)}));
if(remote){
 if(!remote.pathname.endsWith('/'))throw new Error('--url must end with /');
 const cookiePath=process.env.FYNBC_VERIFY_COOKIE_FILE,headers={};
 if(cookiePath){const info=await stat(cookiePath);if((info.mode&0o077)!==0)throw new Error('Cookie file must be private (chmod 600)');headers.Cookie=(await readFile(cookiePath,'utf8')).trim();}
 const local=['127.0.0.1','localhost','[::1]'].includes(remote.hostname),remoteManifest=await fetch(new URL('map-resources.json',remote),{headers,redirect:'manual',signal:AbortSignal.timeout(30000)});
 if(!remoteManifest.ok||remoteManifest.headers.get('content-type')?.includes('text/html'))throw new Error('Release manifest unavailable; login or release verification required');
 const deployed=await remoteManifest.json();if(deployed.version!==catalog.version||deployed.build!==catalog.build)throw new Error('Deployed resource/build version mismatch');
 const paths=[...basePaths,'art/campaign/national-relief.png','art/campaign/hidden-shanshui-v2.png','art/campaign/terrain-atlas-v1.png','art/campaign/city-v2.glb','art/military/infantry-rigged-v1.glb','art/campaign/elevation/manifest.json',...Array.from({length:9},(_,i)=>`art/campaign/elevation/${99+i%3}-${50+Math.floor(i/3)}.bin.gz`)];
 for(const path of paths){const entry=catalog.entries[path],response=await fetch(new URL(entry.url,remote),{headers,redirect:'manual',signal:AbortSignal.timeout(30000)});
  if(response.status===302||response.status===401||response.status===403)throw new Error('Login required; authenticated static resources were not verified.');
  if(!response.ok||response.headers.get('content-type')?.includes('text/html'))throw new Error(`Unexpected resource response: ${path} (${response.status})`);
  verify(Buffer.from(await response.arrayBuffer()),entry,path);
  const cache=response.headers.get('cache-control')??'';if(!cache.includes('private')||!cache.includes('immutable')||!cache.includes('max-age=31536000'))throw new Error(`Missing private immutable cache policy: ${path}`);
 }
 const page=await fetch(remote,{headers,redirect:'manual',signal:AbortSignal.timeout(30000)}),csp=page.headers.get('content-security-policy')??'',connect=csp.split(';').find(part=>part.trim().startsWith('connect-src '))??'';
 if(!page.ok||!local&&(!connect.includes("'self'")||!connect.includes('blob:')))throw new Error('Game page or GLB blob CSP check failed');
 console.log(JSON.stringify({httpResourcesVerified:paths.length,gameCSP:local?'not applicable: local server':'self + blob',build:catalog.build,version:catalog.version}));
}
