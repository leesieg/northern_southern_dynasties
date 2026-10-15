import assert from 'node:assert/strict';
import {readFile,mkdtemp,realpath} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {compileOfficialPackage,createContentRealm} from './contentPackageCompiler.mjs';
import {createStudioService} from './studioService.mjs';
const bundle=await compileOfficialPackage(),compiler=await createContentRealm();
const json=v=>JSON.parse(JSON.stringify(v));
try{
 const api=await compiler.ssrLoadModule('/src/core/contentPackage.ts');
 let politicalExample;
 for(const variant of ['three','two','new-ids']){
  const t=structuredClone(bundle.content.tables),ids=variant==='two'?['liang','east']:['liang','east','west'];
  // Explicit synthetic fixture, not a researched historical scenario.
  const remap=(v,mapping)=>{if(!v||typeof v!=='object')return;for(const [k,x] of Object.entries(v)){if(['realm','polity','owner','controller'].includes(k)&&typeof x==='string'&&mapping[x])v[k]=mapping[x];else remap(x,mapping);}};
  if(variant==='two')for(const name of ['scenario','characters','additionalStarts','relationships','expandedPeople','localOfficials'])remap(t[name],{west:'east'});
  const leaders={liang:'xiao-gang',east:'gao-cheng',west:'yuwen-tai'},capitals={liang:'jiankang',east:'ye',west:'changan'};
  t.campaignSetup.campaignSetup.politics={realms:ids.map(id=>({id,name:'验收'+id,short:id,color:'#668b7b',template:id,capital:capitals[id],ruler:leaders[id],executives:[leaders[id]],source:'架空技术验收'})),nativeEvents:[]};
  t.campaignSetup.campaignSetup.armies=t.campaignSetup.campaignSetup.armies.filter(a=>ids.includes(a.realm));
  if(variant==='three')politicalExample=structuredClone(t.campaignSetup.campaignSetup.politics);
  if(variant==='new-ids'){
   const mapping={liang:'realm-1',east:'realm-2',west:'realm-3'};
   for(const name of ['scenario','characters','additionalStarts','relationships','expandedPeople','localOfficials','campaignSetup'])remap(t[name],mapping);
   for(const p of t.campaignSetup.campaignSetup.politics.realms)p.id=mapping[p.id];
   ids.splice(0,ids.length,...Object.values(mapping));
   for(const [old,id] of Object.entries(mapping)){leaders[id]=leaders[old];t.scenario.polities[id]=t.scenario.polities[old];}
  }
  for(const p of t.campaignSetup.campaignSetup.politics.realms)t.scenario.polities[p.id]={name:p.name,short:p.short,color:p.color};
  const pack=await api.compileContentPackage(t,'era-fixture-'+variant,bundle.environment),r=await createContentRealm();
  try{
   await(await r.ssrLoadModule('/src/core/contentPackage.ts')).installContentPackage(pack,bundle.environment);
   const w=(await r.ssrLoadModule('/src/core/campaignStart.ts')).createCampaign('xiao-gang','three-realms-546','sandbox');
   for(const collection of [w.realm.governments.realms,w.realm.treasuries,w.diplomacy.credit,w.service.councils,w.realm.fiscal.net])assert.deepEqual(Object.keys(collection),ids);
   for(const id of ids)assert.equal(w.realm.governments.realms[id].ruler,leaders[id]);
   assert.equal(w.historical.items.length,0);
   const save=await r.ssrLoadModule('/src/core/save.ts');assert.deepEqual(save.parseWorld(save.serializeWorld(w)),json(w));
   const bad=structuredClone(w);delete bad.realm.governments.realms[ids[0]];assert.throws(()=>save.serializeWorld(bad));
   (await r.ssrLoadModule('/src/core/world.ts')).advance(w,1);assert.equal(w.day,1);
   assert.deepEqual(save.parseWorld(save.serializeWorld(w)),json(w));
   console.log(variant+': political identity, accounts, one day, save roundtrip and missing realm rejection passed');
  }finally{await r.close();}
  const invalid=structuredClone(t);invalid.campaignSetup.campaignSetup.politics.realms[0].ruler='missing';
  await assert.rejects(api.compileContentPackage(invalid,'invalid',bundle.environment),/成年人物/);
 }
 const root=await realpath(await mkdtemp('/private/tmp/fynbc-era-studio-')),service=await createStudioService({root,bundle});
 try{
  const snapshot=await service.request('snapshot',{},'human'),scenarioId='three-realms-546';
  const proposal=await service.request('propose',{key:randomUUID(),baseRevision:snapshot.revision,title:'架空政治开局验收',operations:[{target:'scenarios',id:scenarioId,field:'politics',before:null,after:politicalExample}]},'ai');
  await assert.rejects(service.request('apply',{key:randomUUID(),proposalId:proposal.id},'ai'),/审阅|授权/);
  await service.request('apply',{key:randomUUID(),proposalId:proposal.id},'human');
  const model=await compiler.ssrLoadModule('/src/studio/model.ts'),draft=model.projectDraft(bundle.content);draft.scenarios[scenarioId].politics=politicalExample;
  assert.ok(model.references(draft,bundle.content,'people','gao-cheng').some(ref=>ref.fieldPath.endsWith('.ruler')));
  assert.ok(model.references(draft,bundle.content,'people','gao-cheng').some(ref=>ref.fieldPath.endsWith('.executives')));
  const check=await service.request('check',{scenarioId},'human');assert.deepEqual(check.diagnostics,[]);assert.ok(check.digest);
  const preview=await service.request('preview',{scenarioId,characterId:'xiao-gang',days:1},'human');assert.equal(preview.saveRoundtrip,true);
  console.log('Shared studio: AI proposal, authorization rejection, human application, compile and one-day preview passed');
  const before=await service.request('snapshot',{},'human'),strategy=await service.request('strategyTemplate',{scenarioId},'human'),two=structuredClone(politicalExample);two.realms=two.realms.filter(r=>r.id!=='west');
  for(const c of Object.values(strategy.cities)){if(c.owner==='west')c.owner='east';if(c.controller==='west')c.controller='east';}
  delete strategy.treasuries.west;strategy.armies=strategy.armies.filter(a=>a.realm!=='west');strategy.diplomacy=strategy.diplomacy.filter(d=>d.a!=='west'&&d.b!=='west');
  const ops=[{target:'scenarios',id:scenarioId,field:'politics',before:politicalExample,after:two},{target:'scenarios',id:scenarioId,field:'strategy',before:null,after:strategy},...Object.entries(before.states[scenarioId]).filter(([,s])=>s.polity==='west').map(([id])=>({target:'states',id,scenarioId,field:'polity',before:'west',after:'east'}))];
  for(let offset=0;offset<ops.length;offset+=100){const s=await service.request('snapshot',{},'human'),p=await service.request('propose',{key:randomUUID(),baseRevision:s.revision,title:'两国架空配置',operations:ops.slice(offset,offset+100)},'human');await service.request('apply',{key:randomUUID(),proposalId:p.id},'human');}
  const twoPreview=await service.request('preview',{scenarioId,characterId:'xiao-gang',days:1},'human');assert.equal(twoPreview.saveRoundtrip,true);assert.deepEqual(Object.keys(twoPreview.strategy.treasuries),['liang','east']);
  console.log('Shared studio: two-realm political, allegiance, army and resource edits compile and reload');

 }finally{await service.close();}
 if(process.argv[2]){
  const source=await readFile(process.argv[2],'utf8'),baseline=JSON.parse(JSON.parse(source).payload),r=await createContentRealm();
  try{
   await(await r.ssrLoadModule('/src/core/contentPackage.ts')).installContentPackage(bundle.content,bundle.environment);
   const save=await r.ssrLoadModule('/src/core/save.ts');assert.deepEqual(save.parseWorld(source),baseline);
   const fresh=(await r.ssrLoadModule('/src/core/campaignStart.ts')).createCampaign('xiao-gang','three-realms-546','sandbox');
   assert.deepEqual(JSON.parse(JSON.parse(save.serializeWorld(fresh)).payload),baseline);
   console.log('Captured official baseline: full initial world and old save unchanged');
  }finally{await r.close();}
 }else console.log('No captured baseline supplied; previous-build comparison not run.');
}finally{await compiler.close();}
