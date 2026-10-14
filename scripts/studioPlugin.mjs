import {randomBytes} from 'node:crypto';
import {createStudioService} from './studioService.mjs';
export function studioPlugin(){
 const token=randomBytes(32).toString('hex');let service;
 return {name:'fynbc-local-studio',
  transformIndexHtml(html,ctx){return ctx.path==='/studio.html'?html.replace('</head>',`<meta name="studio-token" content="${token}"></head>`):html;},
  configureServer(server){
   server.httpServer?.once('close',()=>{service?.then(s=>s.close()).catch(console.error);});
   server.middlewares.use(async(req,res,next)=>{
    if(req.url?.split('?')[0]!=='/__studio/api')return next();
    res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');
    try{
     const host=req.headers.host??'',address=req.socket.remoteAddress;
     if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(address)||! /^(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/.test(host))throw Object.assign(new Error('创作台仅允许本机访问。'),{status:403});
     if(req.method!=='POST'||req.headers.origin!==`http://${host}`||req.headers['x-studio-token']!==token||!req.headers['content-type']?.startsWith('application/json'))throw Object.assign(new Error('无效的本机界面请求。'),{status:403});
     let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>1024*1024)throw Object.assign(new Error('请求超过 1 MiB。'),{status:413});}
     const data=JSON.parse(body);if(Object.keys(data).some(k=>!['method','input'].includes(k)))throw new Error('未知请求字段。');
     service??=createStudioService();const result=await(await service).request(data.method,data.input,'human');res.end(JSON.stringify({ok:true,result}));
    }catch(e){res.statusCode=e.status??400;res.end(JSON.stringify({ok:false,error:{code:e.code??'ERROR',message:e.message,details:e.details??null}}));}
   });
  },
 };
}
