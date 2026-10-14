import assert from 'node:assert/strict';
import {test} from 'node:test';
import {compileOfficialPackage,createContentRealm,openPackagePreview} from './contentPackageCompiler.mjs';
const {content,environment}=await compileOfficialPackage();
const compiler=await createContentRealm();
try{
 const api=await compiler.ssrLoadModule('/src/core/contentPackage.ts');
 const original=await compiler.ssrLoadModule('/src/core/campaignStart.ts');
 const oldSave=await compiler.ssrLoadModule('/src/core/save.ts');
 const originalWorld=await compiler.ssrLoadModule('/src/core/world.ts');
 const json=value=>JSON.parse(JSON.stringify(value));
 const sessions=[];
 const create=async pack=>{
  const replies=[];let world,receipt,exported;
  const host=await openPackagePreview(pack,environment,message=>{replies.push(message);if(message.type==='world')world=message.world;if(message.type==='receipt')receipt=message;if(message.type==='export')exported=message.text;});sessions.push(host);
  return {host,replies,get world(){return world;},get exported(){return exported;},async request(request){receipt=undefined;await host.dispatch({...request,requestId:'verify'});assert.ok(receipt,'must return receipt');return receipt;}};
 };
 try{
  await test('full package digest is deterministic and rejects missing tables, tampering and mismatched dependencies',async()=>{
   assert.equal((await api.compileContentPackage(content.tables,content.packageId,environment)).digest,content.digest);
   const damaged=json(content);damaged.tables.scenario.sites[0].name='changed';await assert.rejects(api.loadContentPackage(damaged,environment));
   const missing=json(content);delete missing.tables.cultures;await assert.rejects(api.loadContentPackage(missing,environment),/数据表/);
   for(const kind of ['engine','assets']){const wrong=json(content);wrong.dependencies[kind]='missing';await assert.rejects(api.loadContentPackage(wrong,environment),/依赖/);}
   await assert.rejects(api.loadContentPackage({...content,schemaVersion:999},environment),/版本/);
   await assert.rejects(api.loadContentPackage(undefined,environment));
   const reordered=json(content.tables);reordered.cultures.personCultures=Object.fromEntries(Object.entries(reordered.cultures.personCultures).reverse());assert.notEqual((await api.compileContentPackage(reordered,content.packageId,environment)).digest,content.digest);
   const cycle=json(content.tables);cycle.territorialHierarchy.territoryNodes['city:jiankang'].parent='city:jiankang';await assert.rejects(api.compileContentPackage(cycle,'cycle',environment),/区划/);
  });
  const a=await create(content);
  await test('official package matches builtin full initial world and one-day command sequence',async()=>{
   assert.equal((await a.request({type:'init'})).ok,true);assert.equal((await a.request({type:'new',mode:'sandbox',characterId:'xiao-gang'})).ok,true);
   const baseline=original.createCampaign('xiao-gang',undefined,'sandbox');assert.deepEqual(json(a.world),json(baseline));
   await a.request({type:'step'});originalWorld.advance(baseline,1);assert.deepEqual(json(a.world),json(baseline));
  });
  const variant=json(content.tables);
  variant.scenario.sites[0].name='同名地点';variant.scenario.siteById[variant.scenario.sites[0].id].name='同名地点';
  const road=variant.scenario.roads.find(r=>!r.legacyOnly);road.days=(road.days??3)+17;
  const person='xiao-gang';variant.characters.characterById[person].name='同名人物';variant.characters.historicalCharacters.find(p=>p.id===person).name='同名人物';
  for(const table of [variant.families.familyPeople,variant.relationships.relationshipPeople])table.find(p=>p.id===person).name='同名人物';
  variant.families.familyPersonById[person].name='同名人物';variant.relationships.relationshipPersonById[person].name='同名人物';
  variant.territorialHierarchy.territoryNodes['city:jiankang'].name='同名地点';
  variant.campaignSetup.campaignSetup.roleResources.other.coins+=37;
  variant.campaignSetup.campaignSetup.seed+=1;
  variant.lifestyles.LIFESTYLE_SWITCH_DAYS=45;
  variant.scripts.gameScripts[0].month=4;variant.scripts.gameScripts[0].day=15;
  const custom=await api.compileContentPackage(variant,'test-variant',environment),b=await create(custom);
  await test('two complete worlds use independent people, family, hierarchy, calendar, rules, map and save caches',async()=>{
   assert.equal((await b.request({type:'init'})).ok,true);const result=await b.request({type:'new',mode:'sandbox',characterId:person});assert.equal(result.ok,true,result.text);
   assert.equal(b.world.people[0].coins,original.createCampaign(person,undefined,'sandbox').people[0].coins+37);
   assert.equal(b.world.people[0].name,'同名人物');assert.equal(a.world.people[0].name,'萧纲');assert.equal(b.world.life.seed,546104);
   const mapA=await a.host.inspect('/src/data/officialMap.ts'),mapB=await b.host.inspect('/src/data/officialMap.ts');
   assert.notEqual(mapA.officialMap.legDays(road.from,road.to),mapB.officialMap.legDays(road.from,road.to));
   assert.notEqual(mapA.officialMap.getSite(variant.scenario.sites[0].id).name,mapB.officialMap.getSite(variant.scenario.sites[0].id).name);
   assert.equal((await b.host.inspect('/src/data/families.ts')).familyMembers('xiao').find(p=>p.id===person).name,'同名人物');
   assert.equal((await b.host.inspect('/src/data/territorialHierarchy.ts')).nodeForSite('jiankang','city').name,'同名地点');
   assert.equal((await b.host.inspect('/src/core/calendar.ts')).calendarDate(0).getUTCMonth(),3);
   assert.equal((await a.host.inspect('/src/data/lifestyles.ts')).LIFESTYLE_SWITCH_DAYS,90);assert.equal((await b.host.inspect('/src/data/lifestyles.ts')).LIFESTYLE_SWITCH_DAYS,45);
   assert.equal(a.world.day,1);assert.equal(b.world.day,0);
   const binding=await b.host.inspect('/src/core/contentBinding.ts');assert.throws(()=>binding.bindContent({},{},true),/一次/);
  });
  await test('partial first month keeps a zero anchor without inventing a settlement, then settles once at the real boundary',async()=>{
   const calendar=await b.host.inspect('/src/core/calendar.ts');assert.equal(calendar.monthStart(0),0);assert.equal(calendar.isMonthStart(0),false);assert.equal(calendar.isMonthAnchor(0),true);assert.equal(calendar.nextMonthStart(0),16);
   const {createCampaign}=await b.host.inspect('/src/core/campaignStart.ts');const {advanceFamilies,validFamilies}=await b.host.inspect('/src/core/family.ts');
   const world=createCampaign(person,undefined,'sandbox'),initial=json(world.families);advanceFamilies(world);assert.deepEqual(json(world.families),initial);
   world.day=16;advanceFamilies(world);assert.equal(world.families.lastMonthly,16);assert.ok(validFamilies(world.families,16,world.scriptId,world));const settled=json(world.families);advanceFamilies(world);assert.deepEqual(json(world.families),settled);
  });
  await test('locked saves round trip only into matching content; rejected imports preserve the world',async()=>{
   const before=json(b.world);await b.request({type:'export'});assert.equal(JSON.parse(b.exported).content.digest,custom.digest);assert.equal(JSON.parse(b.exported).scriptId,b.world.scriptId);
   await b.request({type:'step'});assert.equal((await b.request({type:'import',text:b.exported})).ok,true);assert.deepEqual(json(b.world),before);
   const wrongHeader=JSON.parse(b.exported);wrongHeader.scriptId='missing';assert.equal((await b.request({type:'import',text:JSON.stringify(wrongHeader)})).ok,false);assert.deepEqual(json(b.world),before);
   const aBefore=json(a.world);assert.equal((await a.request({type:'import',text:b.exported})).ok,false);assert.deepEqual(json(a.world),aBefore);
   const c=await create(custom);await c.request({type:'init'});assert.equal((await c.request({type:'import',text:b.exported})).ok,true);assert.deepEqual(json(c.world),before);
  });
  await test('official adapter restores unbound legacy saves; custom packages never receive official migration data',async()=>{
   const baseline=original.createCampaign('xiao-gang',undefined,'sandbox');const legacy=oldSave.serializeWorld(baseline);
   assert.equal(JSON.parse(legacy).content,undefined);const before=json(b.world);
   assert.equal((await a.request({type:'import',text:legacy})).ok,true);assert.deepEqual(json(a.world),json(oldSave.parseWorld(legacy)));
   assert.equal((await b.request({type:'import',text:legacy})).ok,false);assert.deepEqual(json(b.world),before);
   const envelope=JSON.parse(legacy),world=JSON.parse(envelope.payload);world.contentVersion='546-map-0.5';envelope.payload=JSON.stringify(world);let hash=2166136261;for(let i=0;i<envelope.payload.length;i++)hash=Math.imul(hash^envelope.payload.charCodeAt(i),16777619);envelope.checksum=(hash>>>0).toString(16);
   assert.equal((await a.request({type:'import',text:JSON.stringify(envelope)})).ok,true);assert.equal(a.world.contentVersion,'546-map-0.6');assert.equal(a.world.people[0].coins,baseline.people[0].coins);
  });
  await test('invalid date and inconsistent compiled indexes fail compilation',async()=>{
   const duplicates=json(content.tables);duplicates.characters.historicalCharacters.push(duplicates.characters.historicalCharacters[0]);await assert.rejects(api.compileContentPackage(duplicates,'test-broken',environment),/重复/);
   const broken=json(content.tables);broken.scripts.gameScripts[0].month=2;broken.scripts.gameScripts[0].day=30;await assert.rejects(api.compileContentPackage(broken,'test-broken',environment),/日期/);
   const inconsistent=json(content.tables);inconsistent.families.familyPersonById['xiao-gang'].name='other';await assert.rejects(api.compileContentPackage(inconsistent,'test-broken',environment),/索引/);
  });
  await test('preview exit rejects later commands and discards the instance',async()=>{await b.host.close();await assert.rejects(b.host.dispatch({type:'step'}),/关闭/);});
 }finally{for(const session of sessions)await session.close();}
}finally{await compiler.close();}
