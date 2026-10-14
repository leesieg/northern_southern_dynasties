import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile,mkdtemp,realpath,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {compileOfficialPackage,createContentRealm,openPackagePreview} from './contentPackageCompiler.mjs';
import {createStudioService} from './studioService.mjs';
const bundle=await compileOfficialPackage(),realm=await createContentRealm(),hosts=[];
const m=await realm.ssrLoadModule('/src/studio/model.ts'),api=await realm.ssrLoadModule('/src/core/contentPackage.ts'),schema=await realm.ssrLoadModule('/src/core/eventDefinitions.ts');
const scenario='three-realms-546',json=v=>JSON.parse(JSON.stringify(v));
async function hostFor(defs,character='xiao-yan'){
 const tables=structuredClone(bundle.content.tables);tables.authoredEvents.authoredEventDefinitions=defs;
 const content=await api.compileContentPackage(tables,'event-test',bundle.environment);let world,receipt;
 const host=await openPackagePreview(content,bundle.environment,v=>{if(v.type==='world')world=v.world;if(v.type==='receipt')receipt=v;});hosts.push(host);
 const send=async command=>{receipt=null;await host.dispatch({...command,requestId:randomUUID()});assert.ok(receipt);return receipt;};await send({type:'init'});const r=await send({type:'new',characterId:character,mode:'sandbox'});assert.equal(r.ok,true,r.text);
 return {host,content,send,get world(){return world;},events:await host.inspect('/src/core/authoredEvents.ts'),save:await host.inspect('/src/core/save.ts'),validation:await host.inspect('/src/core/authoredEventValidation.ts'),household:await host.inspect('/src/core/householdLife.ts'),treasury:await host.inspect('/src/core/treasury.ts')};
}
const event=schema.newEventDefinition('relief-chain','地方赈济短链',scenario);event.enabled=true;event.conditions.push({kind:'dayAtLeast',value:1});event.maxRuns=2;event.cooldownDays=2;event.stages[0].options[0].next='followup';event.stages[0].options.push({...structuredClone(event.stages[0].options[0]),id:'atomic-failure',actions:[{kind:'fiscalRelief'},{kind:'requestGrant',amount:40}]},{...structuredClone(event.stages[0].options[0]),id:'two-payments',actions:[{kind:'fiscalRelief'},{kind:'fiscalRelief'}]});event.stages.push({id:'followup',title:'结案',body:'审阅已执行结果后结案。',delayDays:0,timeoutDays:2,options:[{id:'finish',title:'结案',description:'保留实际结算。',conditions:[],actions:[],next:null,cancel:false,npcWeight:100}]});
let service;
try{
 await test('finite schemas reject unknown actions, executable fields, cycles and broken refs',async()=>{
  const bad=structuredClone(event);bad.stages[0].options[0].actions=[{kind:'eval',script:'return 1'}];assert.throws(()=>schema.assertEventShape(bad),/未注册/);
  const script=structuredClone(event);script.code='alert(1)';assert.throws(()=>schema.assertEventShape(script),/未知字段/);
  const d=m.projectDraft(bundle.content);d.events[event.id]=structuredClone(event);d.events[event.id].stages[1].options[0].next='decision';assert.ok(m.diagnose(d,bundle.content).some(i=>i.message.includes('循环')));
  d.events[event.id].stages[1].options[0].next='missing';assert.ok(m.diagnose(d,bundle.content).some(i=>i.fieldPath.includes('next')));
 });
 const a=await hostFor([event]);
 function fixture(amount=40){const w=structuredClone(a.world);a.treasury.actFiscal(w,{type:'fiscal',action:'allocate',site:'jiankang',amount});w.day=1;a.events.advanceAuthoredEvents(w);assert.equal(w.authoredEvents.instances.length,1);return w;}
 const command=(w,option)=>({type:'authoredEvent',instanceId:w.authoredEvents.instances[0].id,revision:w.authoredEvents.instances[0].revision,optionId:option});
 await test('composite failures roll back all money, order, ledger and receipts; previews do not mutate',()=>{
  const w=fixture(20),before=structuredClone(w),id=w.authoredEvents.instances[0].id,p=a.events.eventProjection(w,id);assert.match(p.options.find(o=>o.id==='atomic-failure').reason,/执政者|主官/);assert.match(p.options.find(o=>o.id==='two-payments').reason,/不足/);assert.deepEqual(w,before);
  for(const option of ['atomic-failure','two-payments']){assert.throws(()=>a.events.actAuthoredEvent(w,command(w,option)));assert.deepEqual(w,before);}
 });
 await test('actual relief commits once; branch, save reload, repeated choice and same-day advance are idempotent',()=>{
  let w=fixture(),c=command(w,'relief'),coins=a.treasury.localBalance(w,'jiankang');a.events.actAuthoredEvent(w,c);assert.equal(a.treasury.localBalance(w,'jiankang'),coins-20);assert.equal(w.realm.cities.jiankang.order,78);assert.equal(w.authoredEvents.instances[0].stage,'followup');assert.equal(a.validation.validAuthoredEvents(w),true);
  w=a.save.parseWorld(a.save.serializeWorld(w));const before=structuredClone(w);a.events.actAuthoredEvent(w,c);a.events.advanceAuthoredEvents(w);assert.deepEqual(w,before);
  assert.throws(()=>a.events.actAuthoredEvent(w,{...c,optionId:'decline'}),/版本/);a.events.actAuthoredEvent(w,command(w,'finish'));assert.equal(w.authoredEvents.instances[0].status,'resolved');assert.equal(a.validation.validAuthoredEvents(w),true);
  for(const corrupt of [s=>s.instances[0].receipts[0].effects[0].coins=-19,s=>s.runs[event.id]=0,s=>s.instances[0].stage='missing',s=>s.instances[0].receipts=[]]){const bad=structuredClone(w);corrupt(bad.authoredEvents);assert.equal(a.validation.validAuthoredEvents(bad),false);}
  w.day=2;a.events.advanceAuthoredEvents(w);assert.equal(w.authoredEvents.instances.length,1);w.day=3;a.events.advanceAuthoredEvents(w);assert.equal(w.authoredEvents.instances.length,2);
 });
 await test('cancel, timeout, death, lost authority, missing target and no legal choice finish without partial spending',()=>{
  for(const [kind,mutate,status] of [
   ['cancel',w=>a.events.actAuthoredEvent(w,command(w,'decline')),'cancelled'],
   ['timeout',w=>w.day=8,'expired'],
   ['death',w=>w.life.people[w.characterId].death={day:w.day,cause:'age'},'invalid'],
   ['authority',w=>w.realm.cities.jiankang.controller='east','invalid'],
   ['target',w=>delete w.realm.cities.jiankang,'invalid'],
   ['options',w=>a.household.ensureHouseholdLife(w).rest[w.characterId]=99,'invalid'],
  ]){const w=fixture(),entries=structuredClone(w.realm.fiscal.entries);mutate(w);a.events.advanceAuthoredEvents(w);assert.equal(w.authoredEvents.instances[0].status,status,kind);assert.deepEqual(w.realm.fiscal.entries,entries,kind);}
 });
 await test('runtime command host pauses and saves actual author decisions; invalid request cannot change world',async()=>{
  // A no-cost introduction is available at day zero; choosing still uses host receipts.
  const d=structuredClone(event);d.requiresAuthority=false;d.conditions=[{kind:'alive'}];d.stages[0].options[0].actions=[];
  const h=await hostFor([d],'xiao-gang');assert.equal(h.events.authoredPending(h.world).length,1);assert.equal(h.events.eventProjection(h.world,h.world.authoredEvents.instances[0].id).canDecide,true);const before=structuredClone(h.world);assert.equal((await h.send({type:'step'})).ok,false);assert.deepEqual(h.world,before);
  const c=command(h.world,'relief');assert.equal((await h.send({type:'command',command:c,key:{session:'event-test-command',sequence:1}})).ok,true);assert.equal(h.world.authoredEvents.instances[0].stage,'followup');assert.equal((await h.send({type:'command',command:c,key:{session:'event-test-command',sequence:1}})).ok,true);assert.equal(h.world.authoredEvents.instances[0].receipts.length,1);
 });
 await test('NPC uses its own authority and actual grant workflow; never spends player money or decides for player',async()=>{
  const d=structuredClone(event);d.actor={kind:'person',personId:'county-official-jiankang'};d.stages[0].options=[{...d.stages[0].options[0],actions:[{kind:'requestGrant',amount:40}]}];
  const h=await hostFor([d],'xiao-gang'),w=structuredClone(h.world),coins=w.people[0].coins;w.day=1;h.events.advanceAuthoredEvents(w);const i=w.authoredEvents.instances[0];assert.equal(i.stage,'followup');assert.equal(h.events.eventProjection(w,i.id).canDecide,false);assert.equal(i.receipts.length,1);assert.equal(w.realm.fiscal.requests.at(-1).actor,'county-official-jiankang');assert.equal(w.realm.fiscal.requests.at(-1).status,'pending');assert.equal(w.people[0].coins,coins);h.events.advanceAuthoredEvents(w);assert.equal(w.authoredEvents.instances[0].receipts.length,1);w.day=2;h.events.advanceAuthoredEvents(w);assert.equal(w.authoredEvents.instances[0].status,'resolved');
 });
 await test('official content has no author state or seeded changes; verified phase-2 official save loads unchanged',async()=>{
  const host=await openPackagePreview(bundle.content,bundle.environment,()=>{});hosts.push(host);const start=await host.inspect('/src/core/campaignStart.ts'),save=await host.inspect('/src/core/save.ts');const w=start.createCampaign('xiao-gang',undefined,'sandbox');assert.equal(w.authoredEvents,undefined);
  // Captured pre-change baseline is optional for other developers; compatibility lock is always exercised below.
  try{const baseline=JSON.parse(await readFile('.cache/content-studio/stage2-world.json','utf8'));assert.deepEqual(json(w),baseline);const text=await readFile('.cache/content-studio/stage2-official.save.json','utf8');assert.deepEqual(json(save.parseWorld(text)),baseline);}catch(e){if(e.code!=='ENOENT')throw e;}
  const lock=(await host.inspect('/src/core/contentBinding.ts')).phaseTwoOfficialSave,envelope=JSON.parse(save.serializeWorld(w));envelope.content=lock;assert.deepEqual(json(save.parseWorld(JSON.stringify(envelope))),json(w));assert.throws(()=>a.save.parseWorld(JSON.stringify(envelope)),/不匹配/);
 });
 const root=await realpath(await mkdtemp(join(tmpdir(),'fynbc-event-studio-')));service=await createStudioService({root,bundle});
 const request=(method,input={},actor='human')=>service.request(method,input,actor),snapshot=()=>request('snapshot');
 async function apply(operations,actor='human'){const p=await request('propose',{key:randomUUID(),baseRevision:(await snapshot()).revision,title:'事件闭环验证',operations},actor);if(actor==='ai'){await assert.rejects(request('apply',{key:randomUUID(),proposalId:p.id},actor),/审阅/);await request('grant',{key:randomUUID(),proposalId:p.id});}return request('apply',{key:randomUUID(),proposalId:p.id},actor);}
 const d=structuredClone(event);d.id='author-chain';d.enabled=true;d.requiresAuthority=false;d.conditions=[{kind:'alive'}];d.stages[0].options=[{...d.stages[0].options[0],actions:[]}];
 const t={id:'author-test',name:'短链回放',eventId:d.id,scenarioId:scenario,characterId:'xiao-gang',seed:546103,dayBudget:1,stepBudget:8,choices:[{stage:'decision',option:'relief'},{stage:'followup',option:'finish'}],expectedStatus:'resolved'};
 await test('human and AI share event transaction, schema, references and reviewed test cases',async()=>{
  const capabilities=await request('schema');assert.equal(capabilities.eventCapabilities.version,1);schema.assertEventShape(capabilities.examples.event);schema.assertEventTest(capabilities.examples.eventTest);await apply([{target:'events',id:d.id,before:null,after:d},{target:'eventTests',id:t.id,before:null,after:t}],'ai');assert.equal((await request('read',{target:'events',id:d.id},'ai')).stages.length,2);assert.ok((await request('references',{target:'events',id:d.id})).some(r=>r.entityId===t.id));
  await assert.rejects(apply([{target:'events',id:d.id,before:d,after:null}]),/引用/);await assert.rejects(apply([{target:'events',id:d.id,field:'conditions',before:d.conditions,after:[{kind:'javascript'}]}]),/未知条件/);
 });
 await test('bounded debug stores exact package, initial world, conditions and command receipts; can resume preview by deterministic replay',async()=>{
  const revision=(await snapshot()).revision,input={key:randomUUID(),baseRevision:revision,testId:t.id};const run=await request('debugEvent',input,'ai');assert.equal(run.status,'passed',run.reason);assert.equal(run.commands.length,2);assert.deepEqual(await request('debugEvent',input,'ai'),run);
  const report=await request('debugReport',{id:run.id});assert.equal(report.content.digest,run.digest);assert.equal(report.initialState.authoredEvents.instances[0].revision,0);assert.ok(report.trace[0].diagnostic.conditions[0].fieldPath.startsWith('events.author-chain'));
  await assert.rejects(request('debugEvent',{...input,key:randomUUID(),choices:[{stage:'missing-stage',option:'missing-choice'}]}),/草稿问题/);
  const waiting=await request('debugEvent',{...input,key:randomUUID(),choices:[]});assert.equal(waiting.status,'awaiting-decision');assert.equal(waiting.projection.stage,'decision');
  const replay=await request('debugEvent',{...input,key:randomUUID(),choices:[t.choices[0]]});assert.equal(replay.status,'awaiting-decision');assert.equal(replay.projection.stage,'followup');assert.equal(replay.digest,run.digest);
 });
 await test('human-created county official and AI-authored grant chain use actual NPC requests and finish in isolated replay',async()=>{
  const snap=await snapshot(),id='event-author-official',sc=structuredClone(snap.document.scenarios[scenario]);sc.id='event-sample';sc.name='作者事件样例';
  const person={id,name:'沈测试',family:'xiao',birth:520,sex:'male',culture:'han',biography:'作者设定，非历史记载',father:null,mother:null};
  const state={home:'jiankang',polity:'liang',role:'scholar',title:'作者县令',coins:260,food:90,npcCoins:120,playable:true,office:'county:jiankang'};sc.states[id]=state;
  await apply([{target:'people',id,before:null,after:person},{target:'scenarios',id:sc.id,before:null,after:sc}]);
  const grant=structuredClone(event);grant.id='grant-chain';grant.scenarioIds=[sc.id];grant.actor={kind:'person',personId:id};grant.maxRuns=1;grant.stages[0].options=[{...grant.stages[0].options[0],actions:[{kind:'requestGrant',amount:40}]}];
  const test={...t,id:'grant-chain-test',eventId:grant.id,scenarioId:sc.id,dayBudget:2,choices:[]};await apply([{target:'events',id:grant.id,before:null,after:grant},{target:'eventTests',id:test.id,before:null,after:test}],'ai');
  const run=await request('debugEvent',{key:randomUUID(),baseRevision:(await snapshot()).revision,testId:test.id},'ai');assert.equal(run.status,'passed',run.reason);assert.equal(run.projection.receipts[0].effects[0].requests.length,1);assert.equal(run.projection.actor,id);assert.equal(run.projection.receipts.length,2);assert.equal(run.commands.filter(c=>c.command.type==='command').length,0);assert.equal(run.trace.at(-1).day,2);
  const exported=await request('export',{scenarioId:sc.id});assert.equal(exported.tables.authoredEvents.authoredEventDefinitions.length,1);const other=await request('export',{scenarioId:scenario});assert.equal(other.tables.authoredEvents.authoredEventDefinitions.some(e=>e.id===grant.id),false);
 });
 await test('budget exhaustion, wrong stage and structure errors never report behavior passed',async()=>{
  await apply([{target:'events',id:d.id,field:'conditions',before:d.conditions,after:[{kind:'dayAtLeast',value:30}]}]);const run=await request('debugEvent',{key:randomUUID(),baseRevision:(await snapshot()).revision,testId:t.id});assert.equal(run.status,'budget-exhausted');assert.equal(run.projection,null);
  await apply([{target:'events',id:d.id,field:'conditions',before:[{kind:'dayAtLeast',value:30}],after:d.conditions}]);const bad=await request('debugEvent',{key:randomUUID(),baseRevision:(await snapshot()).revision,testId:t.id,choices:[{stage:'followup',option:'finish'}]});assert.equal(bad.status,'failed');
  const broken=structuredClone(d.stages);broken[0].options[0].next='gone';await apply([{target:'events',id:d.id,field:'stages',before:d.stages,after:broken}]);await assert.rejects(request('debugEvent',{key:randomUUID(),baseRevision:(await snapshot()).revision,testId:t.id}),/草稿问题/);
 });
 await test('known phase-2 workspace migration preserves edited people and invalidates old proposal authority',async()=>{
  let old;try{old=JSON.parse(await readFile('.cache/content-studio/stage2-official.json','utf8'));}catch(e){if(e.code==='ENOENT')return;throw e;}
  const dir=await realpath(await mkdtemp(join(tmpdir(),'fynbc-event-migrate-'))),doc=m.projectDraft(old);delete doc.events;delete doc.eventTests;doc.people['xiao-gang'].biography='迁移前编辑';await writeFile(join(dir,'state.json'),JSON.stringify({format:'fynbc-studio-v1',base:old,environment:{},document:doc,revision:4,sequence:6,proposals:[{id:'old',granted:true,baseRevision:4,status:'pending',operations:[]}],history:[],receipts:{}}));const migrated=await createStudioService({root:dir,bundle});try{const s=await migrated.request('snapshot');assert.equal(s.document.people['xiao-gang'].biography,'迁移前编辑');assert.equal(s.revision,5);assert.equal(s.proposals[0].granted,false);assert.deepEqual(s.document.events,{});}finally{await migrated.close();}
 });
}finally{await service?.close();for(const host of hosts)await host.close();await realm.close();}
