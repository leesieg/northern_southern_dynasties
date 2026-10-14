import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {request as httpRequest} from 'node:http';
import {createContentRealm} from './contentPackageCompiler.mjs';
const server=await createServer({server:{host:'127.0.0.1',port:0,strictPort:false,open:false},logLevel:'error'});
try{
 const realm=await createContentRealm();try{assert.notEqual(server.config.cacheDir,realm.config.cacheDir,'Browser and content SSR prebundles must use separate cache directories');}finally{await realm.close();}
 await server.listen();const port=server.httpServer.address().port,origin='http://127.0.0.1:'+port;
 const html=await(await fetch(origin+'/studio.html')).text(),token=html.match(/name="studio-token" content="([a-f0-9]+)"/)?.[1];assert.ok(token);
 const request=(headers={},body={method:'schema',input:{}})=>fetch(origin+'/__studio/api',{method:'POST',headers:{'content-type':'application/json',origin,'x-studio-token':token,...headers},body:JSON.stringify(body)});
 assert.equal((await fetch(origin+'/__studio/api')).status,403);
 assert.equal((await request({'x-studio-token':'wrong'})).status,403);
 assert.equal((await request({origin:'https://untrusted.example'})).status,403);
 const wrongHost=await new Promise((resolve,reject)=>{const req=httpRequest(origin+'/__studio/api',{method:'POST',headers:{host:'untrusted.example',origin,'x-studio-token':token,'content-type':'application/json'}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.end('{"method":"schema","input":{}}');});assert.equal(wrongHost,403);
 assert.equal((await request({}, {method:'snapshot',input:{path:'../trusted'}})).status,400);
 assert.equal((await request({}, {method:'snapshot',input:{padding:'x'.repeat(1024*1024)}})).status,413);
 assert.equal((await request({}, {method:'migrationPreview',input:JSON.parse('{"source":{"__proto__":{"polluted":true}}}')})).status,400);
 assert.equal((await request({}, {method:'recoveryPreview',input:{slot:'../state.json'}})).status,400);
 const invalidUTF8=await fetch(origin+'/__studio/api',{method:'POST',headers:{'content-type':'application/json',origin,'x-studio-token':token},body:Buffer.from([0x7b,0x22,0x78,0x22,0x3a,0x22,0xff,0x22,0x7d])});assert.equal(invalidUTF8.status,400);
 // Split a multibyte character across transport chunks: large imports must not corrupt Chinese content.
 const streamed=await new Promise((resolve,reject)=>{const data=Buffer.from(JSON.stringify({method:'search',input:{target:'people',query:'萧'}})),at=data.indexOf(Buffer.from('萧'))+1;const req=httpRequest(origin+'/__studio/api',{method:'POST',headers:{'content-type':'application/json',origin,'x-studio-token':token}},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))));});req.on('error',reject);req.write(data.subarray(0,at));setTimeout(()=>req.end(data.subarray(at)),20);});assert.equal(streamed.ok,true);assert.ok(streamed.result.length);
 const valid=await request();assert.equal(valid.status,200);assert.equal((await valid.json()).result.version,1);
 for(const path of ['/.studio/state.json','/@fs'+process.cwd()+'/.studio/state.json']){const response=await fetch(origin+path);assert.notEqual(response.status,200);}
 console.log('HTTP checks passed: loopback host, Origin, token, method, strict payload, schema, split UTF-8 input and workspace file denial. No browser/UI automation.');
}finally{await server.close();}
