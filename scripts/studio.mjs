import {createStudioService} from './studioService.mjs';
// stdin is data, never a path or executable code. Actor cannot be chosen by input.
const [method='schema']=process.argv.slice(2);let service;
try{const chunks=[];let bytes=0;if(!process.stdin.isTTY)for await(const chunk of process.stdin){chunks.push(Buffer.from(chunk));bytes+=chunk.length;if(bytes>(['importPreview','proposeImport'].includes(method)?16:1)*1024*1024)throw new Error('请求超过该方法大小限制。');}const text=Buffer.concat(chunks).toString('utf8'),input=JSON.parse(text.trim()||'{}');service=await createStudioService();console.log(JSON.stringify(await service.request(method,input,'ai'),null,2));}
catch(e){console.error(JSON.stringify({code:e.code??'ERROR',message:e.message,details:e.details??null}));process.exitCode=1;}
finally{await service?.close();}
