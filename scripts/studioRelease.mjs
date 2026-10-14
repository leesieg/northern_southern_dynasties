import {createHash} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {projectRoot} from './contentPackageCompiler.mjs';
import {assertJSON,exact,verifySeal} from './studioSafety.mjs';
const sha=data=>createHash('sha256').update(data).digest('hex');
export async function assetManifest(){const rows=[];async function walk(dir){for(const f of(await readdir(join(projectRoot,dir),{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const path=dir+'/'+f.name;if(f.isSymbolicLink()||!f.isDirectory()&&!f.isFile())throw new Error('资产目录不接受符号链接或特殊文件');if(f.isDirectory())await walk(path);else if(!/\.DS_Store/.test(path)){const bytes=await readFile(join(projectRoot,path));rows.push({path:path.slice(7),bytes:bytes.length,sha256:sha(bytes)});}}}await walk('public');return rows;}
export async function makeRelease(s,content,scenarioId){
 const payload={format:'fynbc-studio-release-v2',scenarioId,content,authoring:{baseDigest:s.base.digest,base:s.base,document:s.document},manifest:{engine:content.dependencies.engine,assets:content.dependencies.assets,files:await assetManifest(),sources:{geography:s.document.geography.map.boundaries.source,scenario:s.document.scenarios[scenarioId].strategy?.source??'沿用基础剧本开局'}}};
 return {...payload,digest:sha(JSON.stringify(payload))};
}
export function assertRelease(value){
 assertJSON(value);exact(value,['format','scenarioId','content','authoring','manifest','digest'],'发行包');if(!['fynbc-studio-release-v1','fynbc-studio-release-v2'].includes(value.format))throw new Error('不是可重载的创作台发行包');
 verifySeal(value);exact(value.authoring,value.format.endsWith('v2')?['baseDigest','base','document']:['baseDigest','document'],'作者数据');exact(value.manifest,['engine','assets','files','sources'],'资产清单');exact(value.manifest.sources,['geography','scenario'],'来源');
 if(!/^[a-f0-9]{64}$/.test(value.authoring.baseDigest)||![value.manifest.engine,value.manifest.assets].every(v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v))||Object.values(value.manifest.sources).some(v=>typeof v!=='string'||v.length>2000))throw new Error('发行包依赖摘要或来源说明无效');
 if(!Array.isArray(value.manifest.files)||value.manifest.files.length>10000)throw new Error('资产清单过大或无效');
 const paths=new Set();for(const f of value.manifest.files){exact(f,['path','bytes','sha256'],'资产');if(typeof f.path!=='string'||!f.path||f.path.includes('\\')||f.path.includes(':')||f.path.split('/').some(p=>!p||p==='.'||p==='..')||paths.has(f.path)||!Number.isSafeInteger(f.bytes)||f.bytes<0||!/^[a-f0-9]{64}$/.test(f.sha256))throw new Error('资产路径、长度或摘要无效');paths.add(f.path);}
 if(value.content){const {digest,...payload}=value.content;if(sha(JSON.stringify(payload))!==digest)throw new Error('运行内容包摘要错误');}
 if(!value.content?.dependencies||value.manifest.engine!==value.content.dependencies.engine||value.manifest.assets!==value.content.dependencies.assets)throw new Error('发行包依赖声明不一致');
 if(!value.content?.tables?.scripts?.gameScripts?.some(s=>s.id===value.scenarioId))throw new Error('发行包剧本引用无效');
}
export async function verifyRelease(value,environment){
 assertRelease(value);
 if(value.manifest?.engine!==environment.engine||value.manifest.assets!==environment.assets)throw new Error('发行包依赖与当前规则或资产版本不匹配');
 const expected=await assetManifest();if(JSON.stringify(value.manifest.files)!==JSON.stringify(expected))throw new Error('发行包所需资产缺失、路径或内容哈希不匹配');
 if(!value.content?.tables?.scripts?.gameScripts?.some(s=>s.id===value.scenarioId))throw new Error('发行包剧本引用无效');
 return value;
}
