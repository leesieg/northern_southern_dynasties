import {randomUUID} from 'node:crypto';
import {createStudioService} from './studioService.mjs';
import {generateStudioBoundaries} from './studioGeometry.mjs';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,realpath} from 'node:fs/promises';
import {compileOfficialPackage,createContentRealm} from './contentPackageCompiler.mjs';
const b=await compileOfficialPackage(),compiler=await createContentRealm();
const json=x=>JSON.parse(JSON.stringify(x));
try{
 const m=await compiler.ssrLoadModule('/src/studio/model.ts'),api=await compiler.ssrLoadModule('/src/core/contentPackage.ts'),d=m.projectDraft(b.content),id='three-realms-546';
 d.people['era-unborn']={id:'era-unborn',name:'未来人物',family:d.people['xiao-gang'].family,birth:560,sex:'male',culture:'han',biography:'未出生技术样本',father:null,mother:null};
 const baseline=JSON.stringify(m.compileDraftTables(d,b.content,id));
 d.scenarios.alternative={...structuredClone(d.scenarios[id]),id:'alternative',name:'年代隔离技术样本'};
 const s=d.scenarios.alternative,county=Object.keys(d.people).find(id=>id.startsWith('county-official-'));
 const marriage=b.content.tables.relationships.historicalMarriages.find(p=>d.people[p.a]&&d.people[p.b]&&![p.a,p.b].some(id=>['xiao-yan','xiao-gang','gao-huan','gao-cheng','yuan-shanjian','yuan-baoju','yuwen-tai'].includes(id)));
 assert.ok(marriage,'fixture has a non-chief historical marriage');
 const dead=marriage.a,excluded=county;
 s.life={[dead]:{presence:'dead',health:0,deathYear:545,source:'架空测试'},[excluded]:{presence:'excluded',health:0,deathYear:null,source:'架空测试'},'xiao-gang':{presence:'active',health:68,deathYear:null,source:'架空测试'}};
 for(const who of [dead,excluded])s.states[who]={...m.effectiveState(d,b.content,'alternative',who),playable:false,office:'none'};
 s.map=m.mapTemplate({sites:d.sites,roads:d.roads,geography:d.geography},b.content);s.map.sites.jingkou.name='隔离县治';s.map.roads['road-0'].factor=1.75;
 assert.equal(JSON.stringify(m.compileDraftTables(d,b.content,id)),baseline,'alternative must not mutate original');
 const issues=m.diagnose(d,b.content,'alternative');assert.deepEqual(issues,[]);
 const pack=await api.compileContentPackage(m.compileDraftTables(d,b.content,'alternative'),'era-isolation',b.environment),r=await createContentRealm();
 try{
  await(await r.ssrLoadModule('/src/core/contentPackage.ts')).installContentPackage(pack,b.environment);
  const w=(await r.ssrLoadModule('/src/core/campaignStart.ts')).createCampaign('xiao-gang','alternative','sandbox'),life=await r.ssrLoadModule('/src/core/lifeState.ts'),save=await r.ssrLoadModule('/src/core/save.ts');
  assert.equal(life.isAlive(w,dead),false);assert.equal(life.isDeceased(w,dead),true);assert.equal(life.isAlive(w,excluded),false);assert.equal(life.isDeceased(w,excluded),false);assert.equal(w.life.people['xiao-gang'].health,68);assert.equal(life.isAlive(w,'era-unborn'),false);assert.equal(life.isDeceased(w,'era-unborn'),false);assert.equal(life.ageLabel(w,'era-unborn'),'未出生');assert.equal(w.life.people['era-unborn'].health,0);assert.ok(!(await r.ssrLoadModule('/src/core/personRegistry.ts')).allPeople(w).some(p=>p.id===dead||p.id===excluded||p.id==='era-unborn'));
  assert.ok(Object.values(w.realm.cities).every(c=>c.governor!==excluded));assert.ok(w.relationships.marriages.filter(x=>x.a===dead||x.b===dead).every(x=>x.until===0));
  w.life.people['xiao-gang'].health=67;const invalid=structuredClone(w);invalid.life.people[excluded].health=1;assert.throws(()=>save.serializeWorld(invalid));
  assert.deepEqual(save.parseWorld(save.serializeWorld(w)),json(w));
  (await r.ssrLoadModule('/src/core/world.ts')).advance(w,1);assert.deepEqual(save.parseWorld(save.serializeWorld(w)),json(w));
  assert.equal((await r.ssrLoadModule('/src/data/scenario.ts')).siteById.jingkou.name,'隔离县治');
  console.log('Scenario life, historical marriage, appointments, map isolation and one-day save roundtrip passed');
 }finally{await r.close();}

 const service=await createStudioService({root:await realpath(await mkdtemp('/private/tmp/fynbc-era-b-')),bundle:b});
 try{s.strategy=await service.request('strategyTemplate',{scenarioId:id},'human');const template=await service.request('mapTemplate',{scenarioId:id},'human');assert.equal(template.sites.jingkou.name,d.sites.jingkou.name);}finally{await service.close();}
 const newId='era-new-county';s.map.sites[newId]={id:newId,name:'架空新县',lon:118.5,lat:32.5,source:'测试锚点，不是史实'};s.map.templates[newId]='jingkou';
 s.map.roads['era-road']={id:'era-road',from:'jingkou',to:newId,factor:1,days:null,legacyOnly:false,source:'技术测试道路'};
 const source='架空技术样本',node=(id,name,level,parent)=>({id,name,level,parent,basis:'scenario',from:546,until:547,source});
 s.map.nodes['province:era']=node('province:era','测试州','province','realm:liang');s.map.nodes['prefecture:era']=node('prefecture:era','测试郡','prefecture','province:era');s.map.nodes['county:'+newId]=node('county:'+newId,'测试县','county','prefecture:era');s.map.nodes['city:'+newId]={...node('city:'+newId,'测试县治','city','county:'+newId),site:newId};
 s.strategy.cities[newId]={...s.strategy.cities.jingkou,population:12000,grain:400,localCoins:0,source};
 const sm=await compiler.ssrLoadModule('/src/studio/scenarioMap.ts'),mapped=sm.mapBase(s.map,b.content);
 s.map.geography.map.boundaries=generateStudioBoundaries(mapped.tables.scenario.sites,mapped.tables.administration.administration,mapped.tables.scenario.polities,JSON.parse(await readFile('public/data/land.geojson','utf8')));
 assert.deepEqual(m.diagnose(d,b.content,'alternative'),[]);
 const extended=await api.compileContentPackage(m.compileDraftTables(d,b.content,'alternative'),'era-extended-map',b.environment),host=await createContentRealm();
 try{await(await host.ssrLoadModule('/src/core/contentPackage.ts')).installContentPackage(extended,b.environment);const world=(await host.ssrLoadModule('/src/core/campaignStart.ts')).createCampaign('xiao-gang','alternative','sandbox'),save=await host.ssrLoadModule('/src/core/save.ts');assert.equal(world.realm.cities[newId].population,12000);assert.equal(world.realm.cities[newId].grain,400);(await host.ssrLoadModule('/src/core/world.ts')).advance(world,1);assert.deepEqual(save.parseWorld(save.serializeWorld(world)),json(world));assert.ok((await host.ssrLoadModule('/src/data/officialMap.ts')).officialMap.planRoute('jiankang',newId));assert.ok((await host.ssrLoadModule('/src/data/territorialHierarchy.ts')).descendantSites('province:era').includes(newId));console.log('New county, province/prefecture hierarchy, explicit resources, roads, boundaries and reload passed');}finally{await host.close();}
 const removed=structuredClone(d),retired=removed.scenarios.alternative;delete retired.map.sites[newId];delete retired.map.templates[newId];delete retired.map.roads['era-road'];delete retired.map.nodes['city:'+newId];delete retired.map.nodes['county:'+newId];delete retired.strategy.cities[newId];const retiredBase=sm.mapBase(retired.map,b.content);retired.map.geography.map.boundaries=generateStudioBoundaries(retiredBase.tables.scenario.sites,retiredBase.tables.administration.administration,retiredBase.tables.scenario.polities,JSON.parse(await readFile('public/data/land.geojson','utf8')));
 const retiredPack=await api.compileContentPackage(m.compileDraftTables(removed,b.content,'alternative'),'era-retired-map',b.environment),retiredHost=await createContentRealm();try{await(await retiredHost.ssrLoadModule('/src/core/contentPackage.ts')).installContentPackage(retiredPack,b.environment);const w=(await retiredHost.ssrLoadModule('/src/core/campaignStart.ts')).createCampaign('xiao-gang','alternative','sandbox'),save=await retiredHost.ssrLoadModule('/src/core/save.ts');assert.equal(w.realm.cities[newId],undefined);assert.equal((await retiredHost.ssrLoadModule('/src/data/officialMap.ts')).officialMap.getSite(newId),undefined);assert.deepEqual(save.parseWorld(save.serializeWorld(w)),json(w));console.log('Retired site removed from world, navigation and reloaded save');}finally{await retiredHost.close();}
 const missingPopulation=structuredClone(extended.tables);delete missingPopulation.populationEstimates.populationEstimates[newId];await assert.rejects(api.compileContentPackage(missingPopulation,'bad-population',b.environment),/人口初态/);
 assert.equal(JSON.stringify(m.compileDraftTables(d,b.content,id)),baseline);
 const transaction=await createStudioService({root:await realpath(await mkdtemp('/private/tmp/fynbc-era-b-review-')),bundle:b});
 try{
  const snap=await transaction.request('snapshot',{},'human'),copy=await transaction.request('copyScenario',{scenarioId:id,id:'review-scenario',name:'隔离事务'},'ai');
  assert.ok(copy.operations[0].after.map);const cp=await transaction.request('propose',{key:randomUUID(),baseRevision:snap.revision,title:'复制年代剧本',operations:copy.operations},'ai');await transaction.request('apply',{key:randomUUID(),proposalId:cp.id},'human');
  const state=await transaction.request('snapshot',{},'human'),doc=state.document??state.draft;assert.ok(doc,'snapshot author document');
  const p=await transaction.request('propose',{key:randomUUID(),baseRevision:state.revision,title:'人物和地图年代隔离',operations:[{target:'scenarios',id:'review-scenario',field:'life',before:{},after:s.life},{target:'scenarios',id:'review-scenario',field:'map',before:doc.scenarios['review-scenario'].map,after:s.map},{target:'scenarios',id:'review-scenario',field:'strategy',before:null,after:s.strategy},...Object.entries(s.states).map(([who,v])=>({target:'states',id:who,scenarioId:'review-scenario',before:state.states['review-scenario'][who],after:v}))]},'ai');
  await assert.rejects(transaction.request('apply',{key:randomUUID(),proposalId:p.id},'ai'),/审阅|授权/);await transaction.request('apply',{key:randomUUID(),proposalId:p.id},'human');assert.equal((await transaction.request('preview',{scenarioId:'review-scenario',characterId:'xiao-gang',days:1},'human')).saveRoundtrip,true);assert.ok((await transaction.request('generateBoundaries',{scenarioId:'review-scenario'},'human')).after.value.features.some(f=>f.properties.id===newId));console.log('Shared copy, AI proposal, human review, map/life edits and isolated preview passed');
 }finally{await transaction.close();}
 const bad=structuredClone(d);bad.scenarios.alternative.map.nodes['province:era'].from=545;bad.scenarios.alternative.map.nodes['province:era'].until=546;assert.ok(m.diagnose(bad,b.content,'alternative').length);
 if(process.argv[2]){const r=await createContentRealm();try{await(await r.ssrLoadModule('/src/core/contentPackage.ts')).installContentPackage(b.content,b.environment);const source=await readFile(process.argv[2],'utf8'),old=JSON.parse(JSON.parse(source).payload),save=await r.ssrLoadModule('/src/core/save.ts');assert.deepEqual(save.parseWorld(source),old);const fresh=(await r.ssrLoadModule('/src/core/campaignStart.ts')).createCampaign('xiao-gang',id,'sandbox');assert.deepEqual(JSON.parse(JSON.parse(save.serializeWorld(fresh)).payload),old);console.log('Stage A official save and complete initial state unchanged');}finally{await r.close();}}
}finally{await compiler.close();}
