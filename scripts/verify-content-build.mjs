import {readdir} from 'node:fs/promises';
import {Worker} from 'node:worker_threads';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
// Exercise the emitted ES worker graph, not browser UI. IndexedDB is disposable.
const directory=resolve(process.argv[2]??'dist','assets');
const entries=(await readdir(directory)).filter(name=>/^simulation-[^.]+\.js$/.test(name));
assert.equal(entries.length,1,'exactly one production worker entry');
const url=pathToFileURL(resolve(directory,entries[0])).href;
const worker=new Worker(`(async()=>{
 const {parentPort}=await import('node:worker_threads');
 const {IDBFactory}=await import('fake-indexeddb');globalThis.indexedDB=new IDBFactory();
 globalThis.self={postMessage:message=>parentPort.postMessage(message)};
 parentPort.on('message',data=>globalThis.self.onmessage({data}));
 await import(${JSON.stringify(url)});parentPort.postMessage({type:'booted'});
})().catch(error=>{throw error;});`,{eval:true});
let world,exported;const pending=new Map();let resolveBoot,rejectBoot;
const boot=new Promise((resolve,reject)=>{resolveBoot=resolve;rejectBoot=reject;});
const timer=setTimeout(()=>{rejectBoot(new Error('built worker timed out'));for(const p of pending.values())p.reject(new Error('built worker timed out'));},20000);
worker.on('error',error=>{rejectBoot(error);for(const p of pending.values())p.reject(error);});
worker.on('message',message=>{
 if(message.type==='booted')resolveBoot();
 if(message.type==='world')world=message.world;
 if(message.type==='export')exported=message.text;
 if(message.type==='receipt'){const p=pending.get(message.requestId);pending.delete(message.requestId);message.ok?p.resolve():p.reject(new Error(message.text));}
});
let sequence=0;
async function request(value){const requestId=String(++sequence);const done=new Promise((resolve,reject)=>pending.set(requestId,{resolve,reject}));worker.postMessage({...value,requestId});await done;}
try{
 await boot;await request({type:'init'});await request({type:'new',characterId:'xiao-gang',mode:'sandbox'});
 assert.equal(world.people[0].name,'萧纲');assert.equal(world.realm.armies.length,4);const before=JSON.stringify(world);
 await request({type:'export'});assert.equal(JSON.parse(exported).content.packageId,'official-nsd');
 await request({type:'import',text:exported});assert.equal(JSON.stringify(world),before);
 console.log('Built ES Worker: package binds before rule imports; new game and locked save round trip passed.');
}finally{clearTimeout(timer);await worker.terminate();}
