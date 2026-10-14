import {createHash} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {projectRoot} from './contentPackageCompiler.mjs';
const sha=data=>createHash('sha256').update(data).digest('hex');
export async function assetManifest(){const rows=[];async function walk(dir){for(const f of(await readdir(join(projectRoot,dir),{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const path=dir+'/'+f.name;if(f.isDirectory())await walk(path);else if(!/\.DS_Store/.test(path)){const bytes=await readFile(join(projectRoot,path));rows.push({path:path.slice(7),bytes:bytes.length,sha256:sha(bytes)});}}}await walk('public');return rows;}
export async function makeRelease(s,content,scenarioId){
 const payload={format:'fynbc-studio-release-v1',scenarioId,content,authoring:{baseDigest:s.base.digest,document:s.document},manifest:{engine:content.dependencies.engine,assets:content.dependencies.assets,files:await assetManifest(),sources:{geography:s.document.geography.map.boundaries.source,scenario:s.document.scenarios[scenarioId].strategy?.source??'沿用基础剧本开局'}}};
 return {...payload,digest:sha(JSON.stringify(payload))};
}
export async function verifyRelease(value,environment){
 if(!value||Object.keys(value).sort().join(',')!=='authoring,content,digest,format,manifest,scenarioId'||value.format!=='fynbc-studio-release-v1')throw new Error('不是可重载的创作台发行包');
 const {digest,...payload}=value;if(sha(JSON.stringify(payload))!==digest)throw new Error('发行包完整性校验失败');
 if(value.manifest?.engine!==environment.engine||value.manifest.assets!==environment.assets)throw new Error('发行包依赖与当前规则或资产版本不匹配');
 const expected=await assetManifest();if(JSON.stringify(value.manifest.files)!==JSON.stringify(expected))throw new Error('发行包所需资产缺失、路径或内容哈希不匹配');
 if(!value.content?.tables?.scripts?.gameScripts?.some(s=>s.id===value.scenarioId))throw new Error('发行包剧本引用无效');
 return value;
}
