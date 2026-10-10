import {readFile,copyFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';

// Keep the preceding client's fingerprinted resources available across an atomic release switch.
const [targetArg,previousArg]=process.argv.slice(2);
if(!targetArg||!previousArg)throw new Error('Usage: node scripts/prepare-map-release.mjs <new-release-dir> <previous-release-dir>');
const target=resolve(targetArg),previous=resolve(previousArg);if(target===previous)throw new Error('New and previous releases must differ');
const current=JSON.parse(await readFile(join(target,'map-resources.json'),'utf8')),old=JSON.parse(await readFile(join(previous,'map-resources.json'),'utf8')),existing=new Set(Object.values(current.entries).map(entry=>entry.url));
await mkdir(join(target,'map-assets'),{recursive:true});let retained=0;
for(const entry of Object.values(old.entries)){
 if(existing.has(entry.url))continue;if(!/^map-assets\/[a-f0-9]{20}-[^/]+$/.test(entry.url)||!entry.url.startsWith('map-assets/'+entry.sha256.slice(0,20)+'-'))throw new Error('Invalid previous asset path');
 const bytes=await readFile(join(previous,entry.url)),decoded=entry.packed&&bytes[0]===31&&bytes[1]===139?gunzipSync(bytes):bytes;
 if(decoded.length!==entry.bytes||createHash('sha256').update(decoded).digest('hex')!==entry.sha256)throw new Error('Previous asset integrity mismatch');
 await copyFile(join(previous,entry.url),join(target,entry.url));existing.add(entry.url);retained++;
}
console.log(JSON.stringify({version:current.version,previousVersion:old.version,retained}));
