import assert from 'node:assert/strict';
import {readFile,mkdtemp,realpath} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {compileOfficialPackage,createContentRealm} from './contentPackageCompiler.mjs';
import {createStudioService} from './studioService.mjs';
const bundle=await compileOfficialPackage(),service=await createStudioService({root:await realpath(await mkdtemp('/private/tmp/fynbc-era-c-')),bundle}),compiler=await createContentRealm();
const json=v=>JSON.parse(JSON.stringify(v));
try{
 const schema=await service.request('schema',{},'ai');assert.ok(schema.authoringCommands.addSite);assert.ok(schema.personCapabilities.traits.honest);assert.ok(schema.eventCapabilities.actions.relocateCourt);
 async function snapshot(){return service.request('snapshot',{},'human');}
 async function apply(operations,title='阶段 C 架空技术样本'){
  const before=await snapshot(),p=await service.request('propose',{key:randomUUID(),baseRevision:before.revision,title,operations},'ai');await assert.rejects(service.request('apply',{key:randomUUID(),proposalId:p.id},'ai'),/审阅|授权/);await service.request('apply',{key:randomUUID(),proposalId:p.id},'human');return snapshot();
 }
 const scenarioId='era-three';const copy=await service.request('copyScenario',{scenarioId:'three-realms-546',id:scenarioId,name:'三国制作技术样本'},'ai');await apply(copy.operations);
 async function plan(command,sid=scenarioId){const s=await snapshot(),p=await service.request('authoringPlan',{scenarioId:sid,baseRevision:s.revision,command},'ai');assert.ok(p.operations.length<=100);return apply(p.operations,'制作提案 '+command.kind);}
 const initial=await service.request('authoringTemplate',{scenarioId},'ai');await plan({kind:'initialize',politics:initial.politics,strategy:initial.strategy});
 let s=await snapshot(),sc=s.document.scenarios[scenarioId],politics=structuredClone(sc.politics);politics.nativeEvents=[];politics.realms.forEach((r,i)=>{r.name=['甲','乙','丙'][i];r.short=r.name;r.source='技术假设，非史实开局';});
 await apply([{target:'scenarios',id:scenarioId,field:'year',before:sc.year,after:558},{target:'scenarios',id:scenarioId,field:'politics',before:sc.politics,after:politics},{target:'scenarios',id:scenarioId,field:'personSetup',before:sc.personSetup,after:{'xiao-gang':{abilities:{diplomacy:12,martial:9,stewardship:15,intrigue:7},traits:['honest','gregarious'],source:'技术测试初值'}}},{target:'scenarios',id:scenarioId,field:'succession',before:sc.succession,after:{liang:{ruler:'xiao-gang',executive:'xiao-yi',dynasty:null}}}]);
 await plan({kind:'mapDates',from:558,until:559});
 s=await snapshot();const county=Object.keys(s.document.people).find(id=>id.startsWith('county-official-'));await plan({kind:'setPresence',personId:county,life:{presence:'dead',health:0,deathYear:557,source:'架空技术样本'}});
 await plan({kind:'addNode',node:{id:'province:author',name:'作者州',level:'province',parent:'realm:liang',basis:'scenario',from:558,until:559,source:'架空技术样本'}});
 await plan({kind:'addNode',node:{id:'prefecture:author',name:'作者郡',level:'prefecture',parent:'province:author',basis:'scenario',from:558,until:559,source:'架空技术样本'}});
 await plan({kind:'addSite',site:{id:'author-county',name:'作者县治',lon:118.5,lat:32.5,source:'架空技术样本'},template:'jingkou',polity:'liang',prefecture:'prefecture:author',population:12000,grain:400});
 assert.deepEqual((await service.request('check',{scenarioId},'human')).diagnostics,[]);assert.equal((await service.request('preview',{scenarioId,characterId:'xiao-gang',days:1},'human')).saveRoundtrip,true);
 console.log('Shared authoring: three realms, dates, life, ability/traits, heirs, nodes, new site, resources, review and preview passed');
 await plan({kind:'addRealm',realm:{id:'realm-1',name:'丁',short:'丁',color:'#578077',template:'liang',capital:'guangzhou',ruler:'chen-baxian',executives:['chen-baxian'],source:'架空新增国家测试'}});
 assert.deepEqual((await service.request('check',{scenarioId},'human')).diagnostics,[]);await plan({kind:'removeRealm',realmId:'realm-1',to:'liang'});
 const twin=await service.request('copyScenario',{scenarioId,id:'era-two',name:'两国制作技术样本'},'ai');await apply(twin.operations);s=await snapshot();const donor=s.document.scenarios['era-two'].strategy.treasuries.west.coins,receiver=s.document.scenarios['era-two'].strategy.treasuries.east.coins;
 await plan({kind:'removeRealm',realmId:'west',to:'east'},'era-two');s=await snapshot();assert.equal(s.document.scenarios['era-two'].strategy.treasuries.east.coins,donor+receiver);assert.deepEqual(s.document.scenarios['era-two'].politics.realms.map(r=>r.id),['liang','east']);assert.equal(s.document.scenarios[scenarioId].politics.realms.length,3);
 assert.deepEqual((await service.request('check',{scenarioId:'era-two'},'human')).diagnostics,[]);const release=await service.request('exportBundle',{scenarioId:'era-two'},'human');assert.equal((await service.request('importPreview',{release,days:1},'human')).saveRoundtrip,true);
 console.log('New realm, atomic resource merge, independent two/three realm scenarios, full export and isolated reload passed');
 s=await snapshot();await assert.rejects(service.request('authoringPlan',{scenarioId,baseRevision:s.revision-1,command:{kind:'mapDates',from:558,until:559}},'ai'),/版本/);
 // Real event: the executive is already at the target; no travel or resource bypass.
 sc=s.document.scenarios[scenarioId];const states=structuredClone(sc.states);states['xiao-yan']={...s.states[scenarioId]['xiao-yan'],home:'jingkou'};const strategy=structuredClone(sc.strategy);strategy.cities.jingkou.localCoins=40;
 const defs=await compiler.ssrLoadModule('/src/core/eventDefinitions.ts'),event=defs.newEventDefinition('author-court','朝廷迁驻技术样本',scenarioId,'jingkou');event.enabled=true;event.conditions=[{kind:'alive'},{kind:'yearAtLeast',value:558}];event.stages[0].options[0].actions=[{kind:'relocateCourt'},{kind:'fiscalRelief'}];event.stages[0].options[0].title='迁驻并赈济';
 await apply([{target:'scenarios',id:scenarioId,field:'states',before:sc.states,after:states},{target:'scenarios',id:scenarioId,field:'strategy',before:sc.strategy,after:strategy},{target:'events',id:event.id,before:null,after:event}]);
 const content=await service.request('export',{scenarioId},'human'),r=await createContentRealm();try{
  await(await r.ssrLoadModule('/src/core/contentPackage.ts')).installContentPackage(content,bundle.environment);const w=(await r.ssrLoadModule('/src/core/campaignStart.ts')).createCampaign('xiao-yan',scenarioId,'sandbox'),social=await r.ssrLoadModule('/src/core/social.ts'),save=await r.ssrLoadModule('/src/core/save.ts');assert.equal(social.abilityBreakdown(w,'xiao-gang').stewardship.parts.find(p=>p.label==='基础能力').value,15);assert.ok(social.traitsFor(w,'xiao-gang').includes('honest'));assert.equal(w.realm.governments.realms.liang.heirs.ruler,'xiao-gang');
  const events=await r.ssrLoadModule('/src/core/authoredEvents.ts'),i=w.authoredEvents.instances.find(i=>i.definitionId===event.id),coins=w.realm.treasuries.liang.coins,local=(await r.ssrLoadModule('/src/core/treasury.ts')).localBalance(w,'jingkou');assert.ok(i);const command={type:'authoredEvent',instanceId:i.id,revision:i.revision,optionId:'relief'};
  const invalid=structuredClone(w);invalid.realm.treasuries.liang.coins=99;const unchanged=JSON.stringify(invalid);assert.throws(()=>events.actAuthoredEvent(invalid,command));assert.equal(JSON.stringify(invalid),unchanged,'failed composite action is atomic');
  events.actAuthoredEvent(w,command);assert.equal(w.realm.treasuries.liang.coins,coins-100);assert.equal((await r.ssrLoadModule('/src/core/realm.ts')).capital('liang',w),'jingkou');assert.equal((await r.ssrLoadModule('/src/core/treasury.ts')).localBalance(w,'jingkou'),local-20);assert.deepEqual(save.parseWorld(save.serializeWorld(w)),json(w));const once=JSON.stringify(w);events.actAuthoredEvent(w,command);assert.equal(JSON.stringify(w),once);
  console.log('Real abilities/traits and succession consumers; court relocation plus relief, budget refusal, receipt, idempotency and save passed');
 }finally{await r.close();}
 if(process.argv[2]){const r=await createContentRealm();try{await(await r.ssrLoadModule('/src/core/contentPackage.ts')).installContentPackage(bundle.content,bundle.environment);const source=await readFile(process.argv[2],'utf8'),old=JSON.parse(JSON.parse(source).payload),save=await r.ssrLoadModule('/src/core/save.ts');assert.deepEqual(save.parseWorld(source),old);const w=(await r.ssrLoadModule('/src/core/campaignStart.ts')).createCampaign('xiao-gang','three-realms-546','sandbox');assert.deepEqual(JSON.parse(JSON.parse(save.serializeWorld(w)).payload),old);console.log('Stage B official full initial state and locked save unchanged');}finally{await r.close();}}
}finally{await service.close();await compiler.close();}
