import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp,readFile,writeFile,symlink,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createStudioService} from './studioService.mjs';
import {compileOfficialPackage,createContentRealm,openPackagePreview} from './contentPackageCompiler.mjs';
const bundle=await compileOfficialPackage(),root=await realpath(await mkdtemp(join(tmpdir(),'fynbc-studio-')));
let fault=false;const a=await createStudioService({root,bundle,beforeRename:()=>{if(fault)throw new Error('injected crash before rename');}}),b=await createStudioService({root,bundle});
const key=()=>randomUUID(),human=(method,input)=>a.request(method,input,'human'),ai=(method,input)=>b.request(method,input,'ai');
const snap=()=>human('snapshot');
async function propose(operations,actor='human',extra={}){return(actor==='human'?human:ai)('propose',{key:key(),baseRevision:(await snap()).revision,title:'局部验证',operations,...extra});}
async function apply(p){return human('apply',{key:key(),proposalId:p.id});}
async function set(target,id,field,after,scenarioId){const before=await human('read',{target,id,...(scenarioId?{scenarioId}:{})});return apply(await propose([{target,id,field,before:before[field],after,...(scenarioId?{scenarioId}:{})}]));}
try{
 await test('schema/read/search share authoritative snapshots; strict requests reject arbitrary scope/path/field/type',async()=>{
  assert.equal((await ai('schema')).version,1);assert.ok((await ai('search',{target:'people',query:'萧'})).length);
  await assert.rejects(ai('snapshot',{path:'../trusted'}),/未知/);await assert.rejects(propose([{target:'shared',id:'x',before:null,after:{}}]),/作用域/);
  await assert.rejects(propose([{target:'people',id:'xiao-gang',field:'unknown',before:null,after:1}]),/字段/);
  await assert.rejects(propose([{target:'people',id:'xiao-gang',field:'birth',before:(await snap()).document.people['xiao-gang'].birth,after:'503'}]),/类型/);
  await assert.rejects(propose([{target:'people',id:'../escape',before:null,after:{}}]),/ID/);
  for(const id of ['player','fictional','born-1','xiao-shunzhi'])await assert.rejects(propose([{target:'people',id,before:null,after:{...(await snap()).document.people['xiao-gang'],id}}]),/保留/);
 });
 await test('human and AI use identical preflight; AI requires exact human grant; idempotent receipts survive reopen',async()=>{
  const old=(await snap()).document.people['xiao-gang'].biography,op={target:'people',id:'xiao-gang',field:'biography',before:old,after:old+'【工作区验证】'};
  const input={key:key(),baseRevision:0,title:'AI 史料草稿',operations:[op]},p=await ai('propose',input);assert.deepEqual(await ai('propose',input),p);
  await assert.rejects(ai('apply',{key:key(),proposalId:p.id}),/审阅/);await assert.rejects(ai('grant',{key:key(),proposalId:p.id}),/人工/);
  assert.equal((await ai('preflight',{proposalId:p.id})).canApply,false);await human('grant',{key:key(),proposalId:p.id});
  const request={key:key(),proposalId:p.id},result=await ai('apply',request);assert.equal(result.revision,1);assert.deepEqual(await ai('apply',request),result);
  const reopened=await createStudioService({root,bundle});try{assert.deepEqual(await reopened.request('apply',request,'ai'),result);}finally{await reopened.close();}
  await assert.rejects(ai('apply',{...request,proposalId:'other'}),/幂等/);
 });
 await test('two clients on same base cannot overwrite; before-value conflict is atomic',async()=>{
  const p=(await snap()).document.people['xiao-gang'];const one=await propose([{target:'people',id:p.id,field:'name',before:p.name,after:'萧纲 · 草稿'}]);const two=await propose([{target:'people',id:p.id,field:'birth',before:p.birth,after:504}],'ai');
  await human('grant',{key:key(),proposalId:two.id});await apply(one);await assert.rejects(ai('apply',{key:key(),proposalId:two.id}),/版本/);
  await assert.rejects(propose([{target:'people',id:p.id,field:'name',before:p.name,after:'overwrite'}]),/原值/);assert.equal((await snap()).document.people[p.id].name,'萧纲 · 草稿');
 });
 await test('later modifications block undo; unrelated changes allow a guarded inverse',async()=>{
  const first=await set('people','xiao-gang','name','萧纲甲');await set('people','xiao-gang','name','萧纲乙');
  await assert.rejects(human('undo',{key:key(),baseRevision:(await snap()).revision,revision:first.revision}),/原值/);
  const h=await set('people','xiao-gang','birth',505);await set('people','xiao-yan','biography','测试草稿');
  await human('undo',{key:key(),baseRevision:(await snap()).revision,revision:h.revision});assert.notEqual((await snap()).document.people['xiao-gang'].birth,505);assert.equal((await snap()).document.people['xiao-yan'].biography,'测试草稿');
 });
 await test('failed atomic write leaves complete prior revision and receipt; retry once applies',async()=>{
  const p=await propose([{target:'people',id:'xiao-gang',field:'name',before:(await snap()).document.people['xiao-gang'].name,after:'原子写入验证'}]),before=await readFile(join(root,'state.json'),'utf8'),request={key:key(),proposalId:p.id};
  fault=true;await assert.rejects(human('apply',request),/injected/);fault=false;assert.equal(await readFile(join(root,'state.json'),'utf8'),before);const result=await human('apply',request);assert.equal(result.revision,JSON.parse(before).revision+1);assert.deepEqual(await human('apply',request),result);
 });
 await test('concurrent service writers serialize and return exactly one applied revision',async()=>{
  const s=await snap(),p=s.document.people['xiao-gang'];const proposals=await Promise.all(['A','B'].map(n=>propose([{target:'people',id:p.id,field:'name',before:p.name,after:n}])));const results=await Promise.allSettled(proposals.map(p=>human('apply',{key:key(),proposalId:p.id})));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await snap()).revision,s.revision+1);
 });
 await test('actual writer process interruption recovers the previous complete revision',async()=>{
  const before=await readFile(join(root,'state.json'),'utf8'),s=await snap(),p=s.document.people['xiao-gang'];
  const input={key:key(),baseRevision:s.revision,title:'interrupted proposal',operations:[{target:'people',id:p.id,field:'name',before:p.name,after:'must not commit'}]};
  const code=`import {createStudioService} from './scripts/studioService.mjs';const service=await createStudioService({root:${JSON.stringify(root)},beforeRename:()=>process.exit(73)});await service.request('propose',${JSON.stringify(input)},'human');`;
  assert.throws(()=>execFileSync(process.execPath,['--input-type=module','-e',code],{stdio:'pipe'}),e=>e.status===73);
  assert.equal(await readFile(join(root,'state.json'),'utf8'),before);assert.equal((await snap()).revision,s.revision);
 });
 let scenarioId='test-copy',newPerson='studio-author',creationRevision;
 await test('create family/person and copy scenario through same AI transaction contract',async()=>{
  const s=await snap(),scenario=structuredClone(Object.values(s.document.scenarios)[0]);scenario.id=scenarioId;scenario.name='作者局部验证';scenario.defaultCharacter=newPerson;
  const operations=[{target:'families',id:'studio-family',before:null,after:{id:'studio-family',name:'测试沈氏',surname:'沈',origin:'作者设定'}},{target:'people',id:newPerson,before:null,after:{id:newPerson,name:'沈测试',family:'studio-family',birth:520,sex:'female',culture:'han',biography:'作者设定',father:null,mother:null}},{target:'scenarios',id:scenarioId,before:null,after:scenario},{target:'states',id:newPerson,scenarioId,field:'playable',before:false,after:true},{target:'states',id:newPerson,scenarioId,field:'coins',before:260,after:345},{target:'states',id:newPerson,scenarioId,field:'food',before:90,after:87},{target:'states',id:newPerson,scenarioId,field:'npcCoins',before:120,after:222},{target:'states',id:newPerson,scenarioId,field:'office',before:'inherit',after:'county:jiankang'}];
  const p=await propose(operations,'ai');assert.deepEqual((await human('preflight',{proposalId:p.id})).diagnostics,[]);creationRevision=(await apply(p)).revision;
  assert.equal((await ai('read',{target:'states',id:newPerson,scenarioId})).coins,345);assert.equal((await snap()).states['three-realms-546'][newPerson].playable,false);
  const check=await ai('check',{scenarioId});assert.deepEqual(check.diagnostics,[]);
 });
 await test('referenced deletes and undo cannot destroy later dependencies',async()=>{
  const s=await snap();await assert.rejects(propose([{target:'families',id:'studio-family',before:s.document.families['studio-family'],after:null}]),/引用/);
  await set('people','xiao-gang','mother',newPerson);
  await assert.rejects(human('undo',{key:key(),baseRevision:(await snap()).revision,revision:creationRevision}),/引用/);
 });
 await test('invalid semantic draft is saved but blocks compilation; repairs restore preview',async()=>{
  await set('scenarios',scenarioId,'month',2);await set('scenarios',scenarioId,'day',31);assert.ok((await ai('check',{scenarioId})).diagnostics.length);await assert.rejects(ai('export',{scenarioId}),/修复/);await set('scenarios',scenarioId,'day',1);
 });
 await test('authored person, office, date, stocks and sex reach real isolated world and save roundtrip',async()=>{
  // Mother edge above intentionally exercises references; remove it before rule run.
  await set('people','xiao-gang','mother',null);
  const pack=await ai('export',{scenarioId}),replies=[];let world,receipt;const host=await openPackagePreview(pack,bundle.environment,v=>{replies.push(v);if(v.type==='world')world=v.world;if(v.type==='receipt')receipt=v;});
  try{
   for(const req of [{type:'init'},{type:'new',characterId:newPerson,scriptId:scenarioId,mode:'sandbox'}]){await host.dispatch({...req,requestId:key()});assert.equal(receipt.ok,true,receipt.text);}
   assert.equal(world.people[0].coins,345);assert.equal(world.people[0].food,87);assert.equal(world.identities.people[newPerson].sex,'female');assert.equal(world.realm.cities.jiankang.governor,newPerson);
   const saves=await host.inspect('/src/core/save.ts');assert.deepEqual(JSON.parse(JSON.stringify(saves.parseWorld(saves.serializeWorld(world)))),JSON.parse(JSON.stringify(world)));
   await host.dispatch({type:'new',characterId:'xiao-gang',scriptId:scenarioId,mode:'sandbox',requestId:key()});assert.equal(receipt.ok,true,receipt.text);assert.equal(world.relationships.reserves[newPerson],222);
   await host.dispatch({type:'step',requestId:key()});assert.equal(receipt.ok,true,receipt.text);assert.equal(world.day,1);
  }finally{await host.close();}
  const preview=await ai('preview',{scenarioId,characterId:newPerson,days:0});assert.equal(preview.actualOffices.jiankang,newPerson);assert.equal(preview.storage,'isolated-memory');
 });
 await test('biography-only edit preserves official initial resource behavior and separate package stays untouched',async()=>{
  const realm=await createContentRealm();try{const m=await realm.ssrLoadModule('/src/studio/model.ts'),d=m.projectDraft(bundle.content);d.people['xiao-gang'].biography+='作者注';const tables=m.compileDraftTables(d,bundle.content,'three-realms-546');assert.deepEqual(tables.campaignSetup.campaignSetup.personStarts,{});assert.equal(bundle.content.tables.campaignSetup.campaignSetup.personStarts['studio-author'],undefined);}finally{await realm.close();}
 });
 await test('undo materialized scenario state restores inheritance instead of leaving a stale override',async()=>{
  const s=await snap(),id='xiao-yi',scenarioId='three-realms-546';assert.equal(s.document.scenarios[scenarioId].states[id],undefined);
  const receipt=await set('states',id,'food',98,scenarioId);await human('undo',{key:key(),baseRevision:(await snap()).revision,revision:receipt.revision});assert.equal((await snap()).document.scenarios[scenarioId].states[id],undefined);
 });
 await test('workspace rejects symlink state and backup retains exact document',async()=>{
  const backup=await ai('backup');assert.deepEqual(backup.document,(await snap()).document);
  const unsafe=await realpath(await mkdtemp(join(tmpdir(),'fynbc-studio-link-')));await symlink(join(root,'state.json'),join(unsafe,'state.json'));const service=await createStudioService({root:unsafe,bundle});try{await assert.rejects(service.request('snapshot'),/安全/);}finally{await service.close();}
  await writeFile(join(root,'pending-orphan'),'incomplete staging');assert.deepEqual((await snap()).document,backup.document);
 });
}finally{await a.close();await b.close();}
