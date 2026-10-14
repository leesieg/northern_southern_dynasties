import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp,readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {createStudioService} from './studioService.mjs';
import {compileOfficialPackage,createContentRealm,openPackagePreview} from './contentPackageCompiler.mjs';
const bundle=await compileOfficialPackage(),root=await mkdtemp('/private/tmp/strategy-studio-'),service=await createStudioService({root,bundle}),realm=await createContentRealm(),m=await realm.ssrLoadModule('/src/studio/model.ts');
const key=()=>randomUUID(),human=(method,input={})=>service.request(method,input,'human'),ai=(method,input={})=>service.request(method,input,'ai');
async function apply(operations,title='战略创作验证'){const s=await human('snapshot'),p=await ai('propose',{key:key(),baseRevision:s.revision,title,operations});await assert.rejects(ai('apply',{key:key(),proposalId:p.id}),/审阅/);await human('grant',{key:key(),proposalId:p.id});return ai('apply',{key:key(),proposalId:p.id});}
async function edit(target,id,field,after){const before=await human('read',{target,id});return apply([{target,id,field,before:before[field],after}]);}
const scenarioId='river-watch-546',characterId='studio-shen-ning';let strategy,release,originalRoute;
const live=[];
let checkpoint;try{checkpoint={bundle:JSON.parse(await readFile('.cache/content-studio/stage3-official.json','utf8')),world:JSON.parse(await readFile('.cache/content-studio/stage3-world.json','utf8')),save:await readFile('.cache/content-studio/stage3-save.json','utf8')};}catch(e){if(e.code!=='ENOENT')throw e;}

try{
 await test('official world is unchanged and exact stage 3 save loads only in official binding',{skip:checkpoint?false:'阶段 3 本地检查点未提供'},async()=>{
  const old=checkpoint.world,save=checkpoint.save;
  const host=await openPackagePreview(bundle.content,bundle.environment);try{const world=(await host.inspect('/src/core/campaignStart.ts')).createCampaign('xiao-gang','three-realms-546','sandbox');const saves=await host.inspect('/src/core/save.ts');assert.ok(saves.parseWorld(save));const normalize=w=>{const n=JSON.parse(JSON.stringify(w));delete n.content;return n;};assert.deepEqual(normalize(world),normalize(old));}finally{await host.close();}
 });
 await test('copy official scenario, add family/person and actual county office through shared guarded transactions',async()=>{
  const snap=await human('snapshot');assert.deepEqual(snap.diagnostics,[]);const copied={...structuredClone(snap.document.scenarios['three-realms-546']),id:scenarioId,name:'江淮守望 · 架空验收剧本',description:'546 年架空验收副本，仅用于验证内容创作流程，不是史实重建。',defaultCharacter:characterId};
  await apply([{target:'families',id:'studio-shen',before:null,after:{id:'studio-shen',name:'验收沈氏',surname:'沈',origin:'作者虚构'}},{target:'people',id:characterId,before:null,after:{id:characterId,name:'沈宁',family:'studio-shen',birth:518,sex:'female',culture:'han',biography:'架空验收人物，用于地方治理和驻军配置验证。',father:null,mother:null}},{target:'scenarios',id:scenarioId,before:null,after:copied},{target:'states',id:characterId,scenarioId,before:{home:'jiankang',polity:'liang',role:'scholar',title:'士人',coins:260,food:90,npcCoins:120,playable:false,office:'inherit'},after:{home:'jiankang',polity:'liang',role:'scholar',title:'建康县令',coins:333,food:88,npcCoins:234,playable:true,office:'county:jiankang'}}],'复制剧本与新增作者人物');
  assert.equal((await human('snapshot')).states['three-realms-546'][characterId].playable,false);
 });
 await test('scenario-specific military, treasury, occupation, diplomacy and administration configuration validates',async()=>{
  strategy=await ai('strategyTemplate',{scenarioId});strategy.source='江淮守望：作者架空验收配置，资源为游戏初值';strategy.treasuries.liang.coins=2000;strategy.cities.jiankang.localCoins=120;strategy.cities.jiankang.population+=2000;
  strategy.wars=[{attacker:'east',defender:'liang',target:'shouchun',source:'架空验收：开局前既已交战，人口粮草为当前快照，不追扣历史攻城损失'}];strategy.cities.shouchun.controller='east';strategy.cities.shouchun.source='验收假设：寿春由东魏控制，法理仍属梁，非史实声明';
  strategy.armies.push({id:'watch-guard',realm:'liang',site:'jiankang',commander:characterId,troops:200,grain:60,morale:72,experience:25,institution:65});
  strategy.administration['county:moling']={parent:'prefecture:nandonghai',from:546,until:547,source:'架空行政试验：只调整秣陵县的上级，不改变控制权'};
  const pair=strategy.diplomacy.find(d=>[d.a,d.b].includes('liang')&&[d.a,d.b].includes('west'));pair.opinion=10;pair.recognized=true;pair.treaties=[{kind:'transit',from:'liang',to:'west',days:720}];
  await edit('scenarios',scenarioId,'strategy',strategy);assert.deepEqual((await ai('check',{scenarioId})).diagnostics,[]);
 });
 await test('shared position/road edits rebuild routing while a previously bound instance retains its route',async()=>{
  const original=await openPackagePreview(bundle.content,bundle.environment);live.push(original);const map=(await original.inspect('/src/data/officialMap.ts')).officialMap;originalRoute=map.planRoute('jiankang','jingkou');
  const oldRules=await original.inspect('/src/core/world.ts'),oldSaves=await original.inspect('/src/core/save.ts'),oldWorld=(await original.inspect('/src/core/campaignStart.ts')).createCampaign('xiao-gang','three-realms-546','sandbox');oldRules.act(oldWorld,{type:'travel',destination:'jingkou'});const booked=oldSaves.serializeWorld(oldWorld);
  const snap=await human('snapshot'),road=Object.values(snap.document.roads).find(r=>!r.legacyOnly&&[r.from,r.to].includes('jiankang')&&[r.from,r.to].includes('jingkou'));assert.ok(road);
  await apply([{target:'sites',id:'jingkou',field:'lon',before:snap.document.sites.jingkou.lon,after:snap.document.sites.jingkou.lon+.02},{target:'sites',id:'jingkou',field:'source',before:snap.document.sites.jingkou.source,after:'架空验收锚点东移约两公里，非考据坐标'},{target:'roads',id:road.id,field:'days',before:road.days,after:5}],'共享锚点与道路行程修改');
  const preview=await ai('mapPreview',{scenarioId,from:'jiankang',to:'jingkou'});assert.notDeepEqual(preview.route,originalRoute);assert.deepEqual(map.planRoute('jiankang','jingkou'),originalRoute);assert.equal(preview.territoryNodes['county:moling'].parent,'prefecture:nandonghai');assert.ok(preview.neighbors.length);assert.equal(oldSaves.serializeWorld(oldWorld),booked);assert.deepEqual(oldSaves.parseWorld(booked).people[0].journey,oldWorld.people[0].journey);
  const compiled=await ai('export',{scenarioId}),fresh=await openPackagePreview(compiled,bundle.environment);try{const rules=await fresh.inspect('/src/core/world.ts'),w=(await fresh.inspect('/src/core/campaignStart.ts')).createCampaign('xiao-gang',scenarioId,'sandbox');rules.act(w,{type:'travel',destination:'jingkou'});const saves=await fresh.inspect('/src/core/save.ts');assert.deepEqual(saves.parseWorld(saves.serializeWorld(w)).people[0].journey,w.people[0].journey);assert.notDeepEqual(w.people[0].journey,oldWorld.people[0].journey);}finally{await fresh.close();}
 });
 await test('boundary generation is preview-only, explicit review applies it, anchors invalidate stale output',async()=>{
  const before=await human('snapshot'),g=await ai('generateBoundaries');assert.equal((await human('snapshot')).revision,before.revision);assert.ok(g.changedSites.length>0);assert.equal(g.after.value.features.length,113);
  await edit('geography','map','boundaries',g.after);const saved=await human('snapshot');const changed=m.applyOperations(saved.document,bundle.content,[{target:'sites',id:'jingkou',field:'lon',before:saved.document.sites.jingkou.lon,after:120}]);assert.ok(m.diagnose(changed,bundle.content).some(d=>d.fieldPath==='geography.boundaries'));
 });
 await test('bounded branching event has both resolution and cancellation paths in the real command host',async()=>{
  const event=m.newEventDefinition('watch-relief','守望与赈济',scenarioId);event.enabled=true;event.stages[0].options[0].next='followup';event.stages.push({id:'followup',title:'赈务结案',body:'地方支出已按实际公库结算，记入结案簿。',delayDays:1,timeoutDays:7,options:[{id:'finish',title:'结案',description:'结束本次跟进。',conditions:[],actions:[],next:null,cancel:false,npcWeight:100}]});
  const test={id:'watch-relief-test',name:'赈济后次日结案',eventId:event.id,scenarioId,characterId,seed:546103,dayBudget:1,stepBudget:8,choices:[{stage:'decision',option:'relief'},{stage:'followup',option:'finish'}],expectedStatus:'resolved'};
  await apply([{target:'events',id:event.id,before:null,after:event},{target:'eventTests',id:test.id,before:null,after:test}],'添加短事件及可重放用例');
  let snap=await human('snapshot');const report=await ai('debugEvent',{key:key(),baseRevision:snap.revision,testId:test.id});assert.equal(report.status,'passed',report.reason);
  test.id='watch-cancel-test';test.name='暂缓分支收尾';test.choices=[{stage:'decision',option:'decline'}];test.expectedStatus='cancelled';await apply([{target:'eventTests',id:test.id,before:null,after:test}]);snap=await human('snapshot');assert.equal((await ai('debugEvent',{key:key(),baseRevision:snap.revision,testId:test.id})).status,'passed');
 });
 await test('real opening conserves population, grain and central/local money; saved world does not reissue allocations',async()=>{
  const pack=await ai('export',{scenarioId}),host=await openPackagePreview(pack,bundle.environment);try{const w=(await host.inspect('/src/core/campaignStart.ts')).createCampaign(characterId,scenarioId,'sandbox'),saves=await host.inspect('/src/core/save.ts'),treasury=await host.inspect('/src/core/treasury.ts'),military=await host.inspect('/src/core/armyOrganization.ts');
   assert.equal(w.people[0].coins,333);assert.equal(w.realm.cities.jiankang.governor,characterId);assert.equal(treasury.localBalance(w,'jiankang'),120);
   assert.equal(w.realm.cities.shouchun.owner,'liang');assert.equal(w.realm.cities.shouchun.controller,'east');assert.equal(w.realm.cities.hefei.controller,'liang');
   for(const [id,c] of Object.entries(strategy.cities)){const assigned=strategy.armies.filter(a=>a.site===id);assert.equal(w.realm.cities[id].population+assigned.reduce((n,a)=>n+a.troops,0),c.population);assert.equal(w.realm.cities[id].grain+assigned.reduce((n,a)=>n+a.grain,0),c.grain);}
   for(const r of ['liang','east','west']){const allocations=Object.values(strategy.cities).filter(c=>c.controller===r).reduce((n,c)=>n+c.localCoins,0),equipment=strategy.armies.filter(a=>a.realm===r).reduce((n,a)=>n+military.troopKinds.shield.cost*a.troops/200*2,0);assert.equal(w.realm.treasuries[r].coins+allocations+equipment,strategy.treasuries[r].coins);}
   const guard=w.realm.armies.find(a=>w.mobility.armyCommanders[a.id]===characterId);assert.equal(guard.troops,200);assert.ok(guard.regiments.every(r=>r.origin==='jiankang'));
   assert.deepEqual(JSON.parse(JSON.stringify(saves.parseWorld(saves.serializeWorld(w)))),JSON.parse(JSON.stringify(w)));
   const official=await openPackagePreview(bundle.content,bundle.environment);try{const baseline=(await official.inspect('/src/core/campaignStart.ts')).createCampaign('xiao-gang','three-realms-546','sandbox'),encoded=(await official.inspect('/src/core/save.ts')).serializeWorld(baseline);assert.throws(()=>saves.parseWorld(encoded),/不匹配/);}finally{await official.close();}
  }finally{await host.close();}
 });
 await test('invalid scope, duplicate commanders, disconnected road and impossible resource allocations fail without partial writes',async()=>{
  const s=await human('snapshot');assert.ok(m.references(s.document,bundle.content,'people',characterId).some(r=>r.fieldPath.includes('commander')));assert.throws(()=>m.applyOperations(s.document,bundle.content,[{target:'sites',id:'new-place',before:null,after:{}}]),/地点/);
  const bad=structuredClone(strategy);bad.armies[1].commander=characterId;assert.throws(()=>m.applyOperations(s.document,bundle.content,[{target:'scenarios',id:scenarioId,field:'strategy',before:s.document.scenarios[scenarioId].strategy,after:bad}]),/统帅/);
  const noRoads=structuredClone(s.document);noRoads.roads={};assert.ok(m.diagnose(noRoads,bundle.content).some(i=>i.message.includes('不连通')));
  const broke=structuredClone(strategy);broke.treasuries.liang.coins=0;await edit('scenarios',scenarioId,'strategy',broke);await assert.rejects(ai('check',{scenarioId}),/余额不足/);await edit('scenarios',scenarioId,'strategy',strategy);
 });
 await test('release manifests and fresh authoring environment roundtrip, with explicit review and independent runtime',async()=>{
  release=await ai('exportBundle',{scenarioId});assert.ok(release.manifest.files.length>800);assert.equal((await ai('importPreview',{release,days:0})).saveRoundtrip,true);
  const other=await createStudioService({root:await mkdtemp('/private/tmp/strategy-import-'),bundle});try{const p=await other.request('proposeImport',{key:key(),baseRevision:0,release},'ai');await assert.rejects(other.request('apply',{key:key(),proposalId:p.id},'ai'),/审阅/);await other.request('apply',{key:key(),proposalId:p.id},'human');const pack=await other.request('export',{scenarioId});assert.equal(pack.digest,release.content.digest);const preview=await other.request('preview',{scenarioId,days:0});assert.equal(preview.strategy.cities.shouchun.controller,'east');assert.equal(preview.person.coins,333);}finally{await other.close();}
  const snap=await human('snapshot');await mkdir('.cache/content-studio',{recursive:true});await writeFile('.cache/content-studio/river-watch-546.release.json',JSON.stringify(release,null,2));await writeFile('.cache/content-studio/stage4-example-operations.json',JSON.stringify(m.inverseOperations(snap.document,m.projectDraft(bundle.content),bundle.content),null,2));
 });
 await test('copying an authored scenario carries event membership and replay cases through review',async()=>{
  const snap=await human('snapshot'),copy=await ai('copyScenario',{scenarioId,id:'watch-copy',name:'副本验证'}),next=m.applyOperations(snap.document,bundle.content,copy.operations);assert.equal(next.scenarios['watch-copy'].strategy.wars.length,1);assert.ok(next.events['watch-relief'].scenarioIds.includes('watch-copy'));assert.ok(Object.values(next.eventTests).some(t=>t.scenarioId==='watch-copy'));assert.deepEqual(m.diagnose(next,bundle.content),[]);
 });
 await test('known phase 3 workspace upgrades preserve drafts and debug evidence and invalidate old grants',{skip:checkpoint?false:'阶段 3 本地检查点未提供'},async()=>{
  const old=checkpoint.bundle.content,document=m.projectDraft(old);delete document.sites;delete document.roads;delete document.geography;for(const s of Object.values(document.scenarios))delete s.strategy;document.people['xiao-gang'].biography='迁移前保留的草稿';
  const path=await mkdtemp('/private/tmp/strategy-migration-');await writeFile(path+'/state.json',JSON.stringify({format:'fynbc-studio-v1',base:old,environment:checkpoint.bundle.environment,document,revision:7,sequence:9,proposals:[{id:'pending',status:'pending',baseRevision:7,granted:true,operations:[]}],history:[],receipts:{},debugRuns:[{id:'prior-evidence'}]}));const migrated=await createStudioService({root:path,bundle});try{const snap=await migrated.request('snapshot');assert.equal(snap.revision,8);assert.equal(snap.document.people['xiao-gang'].biography,'迁移前保留的草稿');assert.equal(snap.proposals[0].granted,false);assert.equal(snap.debugRuns[0].id,'prior-evidence');assert.equal(snap.document.scenarios['three-realms-546'].strategy,null);assert.deepEqual(snap.diagnostics,[]);}finally{await migrated.close();}
 });
 await test('empty workspace refresh ignores object key order while preserving revision and user history',{skip:checkpoint?false:'阶段 3 本地检查点未提供'},async()=>{
  const old=checkpoint.bundle.content,path=await mkdtemp('/private/tmp/strategy-empty-'),document=Object.fromEntries(Object.entries(m.projectDraft(old)).reverse());await writeFile(path+'/state.json',JSON.stringify({format:'fynbc-studio-v1',base:old,environment:checkpoint.bundle.environment,document,revision:2,sequence:2,proposals:[],history:[],receipts:{}}));const empty=await createStudioService({root:path,bundle});try{const snapshot=await empty.request('snapshot');assert.equal(snapshot.baseDigest,bundle.content.digest);assert.equal(snapshot.revision,2);assert.deepEqual(snapshot.history,[]);assert.deepEqual((await empty.request('check',{scenarioId:'three-realms-546'})).diagnostics,[]);}finally{await empty.close();}
 });
 await test('corrupted package, missing asset entry and dependency mismatch are rejected',async()=>{
  const bad=structuredClone(release);bad.content.tables.scenario.sites[0].name='corrupt';await assert.rejects(ai('importPreview',{release:bad}),/完整性/);
  const missing=structuredClone(release);missing.manifest.files.pop();const{digest,...payload}=missing;missing.digest=createHash('sha256').update(JSON.stringify(payload)).digest('hex');await assert.rejects(ai('importPreview',{release:missing}),/资产/);
  const dependency=structuredClone(release);dependency.manifest.engine='mismatch';const{digest:ignored,...payload2}=dependency;dependency.digest=createHash('sha256').update(JSON.stringify(payload2)).digest('hex');await assert.rejects(ai('importPreview',{release:dependency}),/依赖/);
 });
}finally{for(const host of live)await host.close();await service.close();await realm.close();}
