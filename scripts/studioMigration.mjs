import {assertRelease} from './studioRelease.mjs';
import {isDeepStrictEqual as equal} from 'node:util';
import {assertJSON,exact,sealed,verifySeal} from './studioSafety.mjs';
export function makeBackup(s){return sealed({format:'fynbc-studio-backup-v2',revision:s.revision,base:s.base,document:s.document,history:s.history,proposals:s.proposals.map(({migration,...p})=>({...p,...(migration?{migration:{to:migration.base.digest}}:{})})),debugRuns:(s.debugRuns??[]).map(({content,initialState,...report})=>report),migrations:s.migrations??[]});}
/** Only author data is merged. Packages and save locks are never relabelled. */
export function mergeDraft(ancestor,incoming,current,resolutions={}){
 const conflicts=[],used=new Set();
 function visit(a,b,c,path){
  if(equal(b,a))return structuredClone(c);if(equal(c,a)||equal(b,c))return structuredClone(b);
  if(a&&b&&c&&[a,b,c].every(v=>typeof v==='object'&&!Array.isArray(v))){const result={};for(const k of new Set([...Object.keys(a),...Object.keys(b),...Object.keys(c)])){const v=visit(a[k],b[k],c[k],[...path,k]);if(v!==undefined)result[k]=v;}return result;}
  const id=JSON.stringify(path),choice=resolutions[id];if(choice!==undefined){if(!['incoming','current'].includes(choice))throw new Error('迁移冲突仅可选择 incoming 或 current');used.add(id);return structuredClone(choice==='incoming'?b:c);}
  conflicts.push({id,path,ancestor:a??null,incoming:b??null,current:c??null});return structuredClone(c);
 }
 const document=visit(ancestor,incoming,current,[]);if(Object.keys(resolutions).some(k=>!used.has(k)))throw new Error('冲突清单已变化或选择了未知字段，请重新预览');return {document,conflicts};
}
export async function migrationSource(value,{model,compiler,environment,fallbackBase}){
 assertJSON(value);let base,document;
 if(value.format==='fynbc-studio-backup-v2'){
  exact(value,['format','revision','base','document','history','proposals','debugRuns','migrations','digest'],'备份');verifySeal(value);({base,document}=value);
 }else if(value.format==='fynbc-studio-backup-v1'){
  exact(value,['format','revision','base','document','history','debugRuns','migrations'],'旧备份');({base,document}=value);
 }else if(['fynbc-studio-release-v1','fynbc-studio-release-v2'].includes(value.format)){
  assertRelease(value);
  exact(value.authoring,value.format.endsWith('v2')?['baseDigest','base','document']:['baseDigest','document'],'作者数据');
  base=value.authoring.base??(value.authoring.baseDigest===fallbackBase.digest?fallbackBase:null);document=value.authoring.document;
  if(!base)throw new Error('旧发行包没有原始基础包；请从原版本导出作者备份后迁移');
  if(base.digest!==value.authoring.baseDigest)throw new Error('发行包原始基础摘要不匹配');
  await compiler.loadContentPackage(value.content,{...environment,...value.content.dependencies});
 }else throw new Error('不支持的作者文件版本');
 // Validate against the declared old dependencies without installing/executing them.
 await compiler.loadContentPackage(base,{...environment,...base.dependencies});
 document=structuredClone(document);const ancestor=model.projectDraft(base);
 // Supported legacy author schemas: pre-event and pre-map documents only.
 document.events??={};document.eventTests??={};if(!document.sites)Object.assign(document,model.projectGeography(base));
 for(const sc of Object.values(document.scenarios??{}))if(!Object.hasOwn(sc,'strategy'))sc.strategy=null;
 model.assertDraft(document,base);
 if(value.content){const compiled=await compiler.compileContentPackage(model.compileDraftTables(document,base,value.scenarioId),value.content.packageId,{...environment,...base.dependencies});if(compiled.digest!==value.content.digest)throw new Error('发行包作者数据与运行内容不一致');}
 return {base,document,ancestor};
}
