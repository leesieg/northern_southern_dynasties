import {createHash} from 'node:crypto';
export const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const bytesDigest=value=>createHash('sha256').update(value).digest('hex');
export const largeMethods=['importPreview','proposeImport','migrationPreview','proposeMigration'];
export function assertJSON(value,maxBytes=16*1024*1024){
 let nodes=0;const stack=[[value,0]];
 while(stack.length){const [v,depth]=stack.pop();if(++nodes>500000||depth>64)throw new Error('JSON 超过结构深度或节点限制');
  if(v===null||typeof v==='boolean')continue;
  if(typeof v==='string'){if(v.length>maxBytes||v.includes('\0'))throw new Error('JSON 文本无效或过大');continue;}
  if(typeof v==='number'){if(!Number.isFinite(v))throw new Error('JSON 数字必须有限');continue;}
  if(typeof v!=='object'||(!Array.isArray(v)&&Object.getPrototypeOf(v)!==Object.prototype&&Object.getPrototypeOf(v)!==null))throw new Error('只接受无循环的普通 JSON 数据');
  for(const k of Object.keys(v)){if(['__proto__','constructor','prototype'].includes(k)||!Object.hasOwn(Object.getOwnPropertyDescriptor(v,k),'value'))throw new Error('JSON 包含不安全键或访问器');stack.push([v[k],depth+1]);}
 }
 if(Buffer.byteLength(JSON.stringify(value))>maxBytes)throw new Error('JSON 超过大小限制');
}
export function exact(value,keys,label){if(!value||Array.isArray(value)||typeof value!=='object'||Object.keys(value).sort().join(',')!==keys.slice().sort().join(','))throw new Error(label+' 字段不完整或包含未知字段');}
export function sealed(payload){return {...payload,digest:digest(payload)};}
export function verifySeal(value){const {digest:expected,...payload}=value;if(digest(payload)!==expected)throw new Error('文件完整性校验失败');return payload;}
