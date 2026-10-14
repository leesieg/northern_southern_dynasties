import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp,readFile,writeFile,unlink,symlink,realpath} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createStudioService} from './studioService.mjs';
import {compileOfficialPackage,createContentRealm} from './contentPackageCompiler.mjs';
import {sealed,assertJSON} from './studioSafety.mjs';
import {mergeDraft} from './studioMigration.mjs';
const bundle=await compileOfficialPackage(),realm=await createContentRealm(),m=await realm.ssrLoadModule('/src/studio/model.ts'),compiler=await realm.ssrLoadModule('/src/core/contentPackage.ts');
const services=[],key=()=>randomUUID(),scenarioId='three-realms-546';
async function workspace(initial,options={}){const root=await realpath(await mkdtemp('/private/tmp/studio-recovery-'));if(initial)await writeFile(root+'/state.json',JSON.stringify(initial));const service=await createStudioService({root,bundle,...options});services.push(service);return {root,service,request:(method,input={},actor='human')=>service.request(method,input,actor)};}
const initial=(base=bundle.content,document=m.projectDraft(base))=>({format:'fynbc-studio-v1',base,environment:{...bundle.environment,...base.dependencies},document,revision:3,sequence:4,proposals:[],history:[],receipts:{}});
async function edit(w,field,value){const s=await w.request('snapshot'),p=await w.request('propose',{key:key(),baseRevision:s.revision,title:'恢复验证',operations:[{target:'people',id:'xiao-gang',field,before:s.document.people['xiao-gang'][field],after:value}]});await w.request('apply',{key:key(),proposalId:p.id});return p;}
try{
 await test('bounded JSON rejects poison keys, non-finite data, accessors, deep and oversized payloads',async()=>{
  for(const v of [JSON.parse('{"__proto__":{"polluted":true}}'),JSON.parse('{"x":{"constructor":{}}}'),{a:Infinity},{get a(){throw new Error('must not run');}}])assert.throws(()=>assertJSON(v));
  let deep={};for(let i=0;i<70;i++)deep={a:deep};assert.throws(()=>assertJSON(deep),/深度/);assert.throws(()=>assertJSON({a:'x'.repeat(1024)},100),/过大/);assert.equal({}.polluted,undefined);
  const w=await workspace();await assert.rejects(w.request('snapshot',{a:'x'.repeat(1024*1024)}),/大小/);
 });
 await test('three-way merge preserves independent edits and explicitly resolves same-field and deletion conflicts',()=>{
  const a={p:{name:'A',bio:'A'},q:{id:1}},b={p:{name:'B',bio:'A'}},c={p:{name:'A',bio:'C'},q:{id:2}};const plan=mergeDraft(a,b,c);assert.deepEqual(plan.document.p,{name:'B',bio:'C'});assert.equal(plan.conflicts.length,1);const resolved=mergeDraft(a,b,c,{[plan.conflicts[0].id]:'incoming'});assert.equal(resolved.conflicts.length,0);assert.equal(resolved.document.q,undefined);assert.throws(()=>mergeDraft(a,b,c,{unknown:'current'}),/未知/);
 });
 await test('existing official Unicode IDs remain editable and recoverable without accepting arbitrary new IDs',async()=>{
  const w=await workspace(),s=await w.request('snapshot'),id=Object.keys(s.document.people).find(id=>/[\u4e00-\u9fff]/.test(id));assert.ok(id);const person=await w.request('read',{target:'people',id});const p=await w.request('propose',{key:key(),baseRevision:s.revision,title:'既有区划官员',operations:[{target:'people',id,field:'biography',before:person.biography,after:'保留既有稳定 ID'}]});await w.request('apply',{key:key(),proposalId:p.id});m.assertDraft((await w.request('snapshot')).document,bundle.content);await assert.rejects(w.request('read',{target:'people',id:'任意新名字'}),/ID/);
 });
 await test('backup v2 integrity, unknown author collections and nested fields are checked before diffing',async()=>{
  const w=await workspace(),backup=await w.request('backup');assert.equal(backup.format,'fynbc-studio-backup-v2');const bad=structuredClone(backup);bad.document.people['xiao-gang'].name='tampered';await assert.rejects(w.request('migrationPreview',{source:bad}),/完整性/);
  for(const mutate of [v=>v.document.hidden={},v=>v.document.people['xiao-gang'].unknown='ignored',v=>v.document.scenarios[scenarioId].states.x={home:'x'}]){const v=structuredClone(backup);mutate(v);delete v.digest;await assert.rejects(w.request('migrationPreview',{source:sealed(v)}),/未知|字段|完整/);}
  const v=structuredClone(backup);v.format='fynbc-studio-backup-v99';delete v.digest;await assert.rejects(w.request('migrationPreview',{source:sealed(v)}),/版本/);
 });
 await test('backup restoration merges with current draft, requires review, invalidates old grants, and keeps source bytes unchanged',async()=>{
  const a=await workspace();await edit(a,'biography','来自备份的作者文本');const backup=await a.request('backup'),bytes=JSON.stringify(backup),b=await workspace();await edit(b,'name','本地姓名');
  const plan=await b.request('migrationPreview',{source:backup});assert.equal(plan.conflicts.length,0);assert.equal(plan.operations.length,1);
  const s=await b.request('snapshot'),other=await b.request('propose',{key:key(),baseRevision:s.revision,title:'旧授权',operations:[{target:'people',id:'xiao-gang',field:'birth',before:s.document.people['xiao-gang'].birth,after:505}]},'ai');await b.request('grant',{key:key(),proposalId:other.id});
  const p=await b.request('proposeMigration',{key:key(),baseRevision:s.revision,source:backup},'ai');await assert.rejects(b.request('apply',{key:key(),proposalId:p.id},'ai'),/审阅/);await b.request('grant',{key:key(),proposalId:p.id});await b.request('apply',{key:key(),proposalId:p.id},'ai');
  const next=await b.request('snapshot');assert.equal(next.document.people['xiao-gang'].biography,'来自备份的作者文本');assert.equal(next.document.people['xiao-gang'].name,'本地姓名');assert.equal(next.proposals.find(p=>p.id===other.id).granted,false);assert.equal(JSON.stringify(backup),bytes);assert.equal((await b.request('preview',{scenarioId})).saveRoundtrip,true);
 });
 await test('cross-engine author rebase exposes conflicts and recompiles against current engine without relabelling old package',async()=>{
  const tables=structuredClone(bundle.content.tables);tables.characters.characterById['xiao-gang'].biography='旧基础文本';tables.characters.historicalCharacters.find(p=>p.id==='xiao-gang').biography='旧基础文本';const old=await compiler.compileContentPackage(tables,'official',{...bundle.environment,engine:'a'.repeat(64)}),doc=m.projectDraft(old);doc.people['xiao-gang'].biography='作者修改';const w=await workspace(initial(old,doc));
  const plan=await w.request('migrationPreview');assert.equal(plan.conflicts.length,1);assert.equal(plan.conflicts[0].scope,'local');const resolutions={local:{[plan.conflicts[0].id]:'incoming'}};await assert.rejects(w.request('proposeMigration',{key:key(),baseRevision:3}),/冲突/);
  const p=await w.request('proposeMigration',{key:key(),baseRevision:3,resolutions});await w.request('apply',{key:key(),proposalId:p.id});const s=await w.request('snapshot');assert.equal(s.baseDigest,bundle.content.digest);assert.equal(s.document.people['xiao-gang'].biography,'作者修改');const exported=await w.request('export',{scenarioId});assert.equal(exported.dependencies.engine,bundle.environment.engine);assert.equal(old.dependencies.engine,'a'.repeat(64));await assert.rejects(w.request('undo',{key:key(),baseRevision:s.revision,revision:s.revision}),/跨基础/);
 });
 await test('backup v1 remains readable, unknown old package schemas fail explicitly, and stale migration proposals cannot overwrite',async()=>{
  const w=await workspace(),v=structuredClone(await w.request('backup'));v.format='fynbc-studio-backup-v1';delete v.digest;delete v.proposals;v.document.people['xiao-gang'].biography='v1 草稿';assert.equal((await w.request('migrationPreview',{source:v})).conflicts.length,0);const p=await w.request('proposeMigration',{key:key(),baseRevision:0,source:v});await edit(w,'name','后来更新');await assert.rejects(w.request('apply',{key:key(),proposalId:p.id}),/版本/);v.base.schemaVersion=99;await assert.rejects(w.request('migrationPreview',{source:v}),/版本/);
 });
 await test('corrupt main file can be inspected and restored only by human, with original bytes retained and retry idempotent',async()=>{
  const w=await workspace();await edit(w,'biography','恢复目标');const state=await w.request('snapshot'),p=await w.request('propose',{key:key(),baseRevision:state.revision,title:'恢复后需重审',operations:[{target:'people',id:'xiao-gang',field:'name',before:'萧纲',after:'旧提案'}]},'ai');await w.request('grant',{key:key(),proposalId:p.id});await w.request('propose',{key:key(),baseRevision:state.revision,title:'触发检查点',operations:[{target:'people',id:'xiao-gang',field:'name',before:'萧纲',after:'另一提案'}]});
  const status=await w.request('recoveryStatus'),point=status.checkpoints.filter(p=>!p.error).sort((a,b)=>b.sequence-a.sequence)[0];await writeFile(w.root+'/state.json','{ damaged main');await assert.rejects(w.request('snapshot'));
  const preview=await w.request('recoveryPreview',{slot:point.slot},'ai'),input={key:key(),slot:point.slot,expectedState:preview.expectedState,checkpointDigest:preview.checkpointDigest};await assert.rejects(w.request('recover',input,'ai'),/人工/);
  const recovered=await w.request('recover',input);assert.deepEqual(await w.request('recover',input),recovered);assert.equal(await readFile(w.root+'/'+recovered.archive,'utf8'),'{ damaged main');const next=await w.request('snapshot');assert.equal(next.document.people['xiao-gang'].biography,'恢复目标');assert.ok(next.revision>preview.revision);assert.equal(next.proposals.find(v=>v.id===p.id).granted,false);await assert.rejects(w.request('apply',{key:key(),proposalId:p.id},'ai'),/审阅/);
 });
 await test('restore compare-and-swap rejects stale preview; atomic interruption retains prior file; missing main never silently resets',async()=>{
  let fault=false;const w=await workspace(undefined,{beforeRename:()=>{if(fault)throw new Error('restore fault');}});await edit(w,'name','恢复测试');const point=(await w.request('recoveryStatus')).checkpoints[0],preview=await w.request('recoveryPreview',{slot:point.slot}),input={key:key(),slot:point.slot,expectedState:preview.expectedState,checkpointDigest:preview.checkpointDigest};
  await edit(w,'biography','更新');await assert.rejects(w.request('recover',input),/变化/);const points=(await w.request('recoveryStatus')).checkpoints,latest=points.sort((a,b)=>b.sequence-a.sequence)[0],fresh=await w.request('recoveryPreview',{slot:latest.slot}),before=await readFile(w.root+'/state.json','utf8');fault=true;await assert.rejects(w.request('recover',{...input,slot:latest.slot,expectedState:fresh.expectedState,checkpointDigest:fresh.checkpointDigest}),/restore fault/);fault=false;assert.equal(await readFile(w.root+'/state.json','utf8'),before);await unlink(w.root+'/state.json');await assert.rejects(w.request('snapshot'),/缺失/);
 });
 await test('tampered state checksums and checkpoint symlinks are rejected without reading outside workspace',async()=>{
  const w=await workspace();await edit(w,'name','完整性');const raw=JSON.parse(await readFile(w.root+'/state.json','utf8'));raw.document.people['xiao-gang'].name='篡改';await writeFile(w.root+'/state.json',JSON.stringify(raw));await assert.rejects(w.request('snapshot'),/完整性/);const point=(await w.request('recoveryStatus')).checkpoints[0];await unlink(w.root+'/checkpoint-'+point.slot+'.json');await symlink('/etc/hosts',w.root+'/checkpoint-'+point.slot+'.json');await assert.rejects(w.request('recoveryPreview',{slot:point.slot}),/安全/);await assert.rejects(w.request('recoveryPreview',{slot:'../state'}),/槽位/);
 });
 await test('release v2 reload verifies author/runtime correspondence and rejects hostile manifests before running a world',async()=>{
  const w=await workspace(),release=await w.request('exportBundle',{scenarioId});assert.equal(release.format,'fynbc-studio-release-v2');assert.equal((await w.request('importPreview',{release})).saveRoundtrip,true);
  for(const path of ['../private','/absolute','https://host/file','a\\b']){const v=structuredClone(release);v.manifest.files[0].path=path;delete v.digest;await assert.rejects(w.request('importPreview',{release:sealed(v)}),/路径/);await assert.rejects(w.request('migrationPreview',{source:sealed(v)}),/路径/);}
  const v=structuredClone(release);v.authoring.document.people['xiao-gang'].biography='与运行包不一致';delete v.digest;await assert.rejects(w.request('importPreview',{release:sealed(v)}),/不一致/);
  const legacy=structuredClone(release);legacy.format='fynbc-studio-release-v1';delete legacy.authoring.base;delete legacy.digest;assert.equal((await w.request('importPreview',{release:sealed(legacy)})).saveRoundtrip,true);
  await writeFile('.cache/content-studio/stage5-release-size.json',JSON.stringify({bytes:Buffer.byteLength(JSON.stringify(release)),people:Object.keys(release.authoring.document.people).length,assets:release.manifest.files.length}));
 });
 await test('unsent form envelope preserves revision and operations and rejects invalid or oversized recovery data',async()=>{
  const f=await realm.ssrLoadModule('/src/studio/formRecovery.ts'),form={format:f.formKey,revision:7,baseDigest:bundle.content.digest,scenarioId,operations:[{target:'people',id:'xiao-gang',field:'name',before:'萧纲',after:'暂存文本'}]};assert.deepEqual(f.decodeForm(f.encodeForm(form)),form);assert.throws(()=>f.decodeForm('{"format":"unknown"}'),/无效/);assert.throws(()=>f.encodeForm({...form,operations:[{after:'x'.repeat(1024*1024)}]}),/超过/);
 });
}finally{for(const service of services)await service.close();await realm.close();}
