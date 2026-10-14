import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {request as httpRequest} from 'node:http';
const server=await createServer({server:{host:'127.0.0.1',port:0,strictPort:false,open:false},logLevel:'error'});
try{
 await server.listen();const port=server.httpServer.address().port,origin='http://127.0.0.1:'+port;
 const html=await(await fetch(origin+'/studio.html')).text(),token=html.match(/name="studio-token" content="([a-f0-9]+)"/)?.[1];assert.ok(token);
 const request=(headers={},body={method:'schema',input:{}})=>fetch(origin+'/__studio/api',{method:'POST',headers:{'content-type':'application/json',origin,'x-studio-token':token,...headers},body:JSON.stringify(body)});
 assert.equal((await fetch(origin+'/__studio/api')).status,403);
 assert.equal((await request({'x-studio-token':'wrong'})).status,403);
 assert.equal((await request({origin:'https://untrusted.example'})).status,403);
 const wrongHost=await new Promise((resolve,reject)=>{const req=httpRequest(origin+'/__studio/api',{method:'POST',headers:{host:'untrusted.example',origin,'x-studio-token':token,'content-type':'application/json'}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.end('{"method":"schema","input":{}}');});assert.equal(wrongHost,403);
 assert.equal((await request({}, {method:'snapshot',input:{path:'../trusted'}})).status,400);
 const valid=await request();assert.equal(valid.status,200);assert.equal((await valid.json()).result.version,1);
 for(const path of ['/.studio/state.json','/@fs'+process.cwd()+'/.studio/state.json']){const response=await fetch(origin+path);assert.notEqual(response.status,200);}
 console.log('HTTP checks passed: loopback host, Origin, token, method, strict payload, schema and workspace file denial. No browser/UI automation.');
}finally{await server.close();}
