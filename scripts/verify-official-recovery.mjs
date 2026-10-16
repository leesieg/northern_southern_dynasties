import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {IDBFactory} from 'fake-indexeddb';
import {compileOfficialPackage,createContentRealm} from './contentPackageCompiler.mjs';
// Independent exact lock from the user's version-only diagnostic. No private payload.
const reported={packageId:'official-nsd',digest:'a57eb8168d647065963d0ab9198554e65cb0ac16147c76df66e4e173cf5d8e7f',engine:'99bc51e78e4404a7f20fcbe97943e09e3d161b55cddeb10302ab25a6e1945654',assets:'164152f982d7f60a5ff95e9af445f8c0f296b398cdaa00df71707dd3392a2c0d'};
const bundle=await compileOfficialPackage(),realm=await createContentRealm(),oldIDB=globalThis.indexedDB;globalThis.indexedDB=new IDBFactory();
try{
 assert.equal(bundle.environment.officialSaves,undefined,'must work without development history');
 const packages=await realm.ssrLoadModule('/src/core/contentPackage.ts'),{digest,...body}=bundle.content;
 assert.equal(await packages.contentDigest({...body,dependencies:{engine:reported.engine,assets:reported.assets}}),reported.digest,'reported package has exactly the trusted official tables');
 await packages.installContentPackage(bundle.content,bundle.environment);
 const world=await realm.ssrLoadModule('/src/core/world.ts'),start=await realm.ssrLoadModule('/src/core/campaignStart.ts'),save=await realm.ssrLoadModule('/src/core/save.ts'),files=await realm.ssrLoadModule('/src/persistence/saveFiles.ts'),api=await realm.ssrLoadModule('/src/persistence/contentLibrary.ts');
 const library=api.createContentLibrary(bundle.content,bundle.environment),initial=start.createCampaign('xiao-gang','three-realms-546','sandbox');
 const manual=save.serializeWorld(initial);await files.writeSaveFile(manual,{day:0,scriptId:initial.scriptId,characterName:initial.people[0].name});
 // One real day only. Do not simulate the user's 3957 days or invent their state.
 world.advance(initial,1);const current=JSON.parse(save.serializeWorld(initial)),source=JSON.stringify({...current,content:reported});
 await files.writeSaveFile(source,{day:initial.day,scriptId:initial.scriptId,characterName:initial.people[0].name},true);
 const before=await files.listSaves();assert.equal(await files.readSaveFile(),source,'newest automatic save is selected instead of the day-zero manual save');
 const selected=await library.resolve(source);assert.equal(selected.digest,bundle.content.digest);
 const launch={id:crypto.randomUUID(),digest:reported.digest,request:{type:'import',text:source}};await library.stage(launch);const pending=await library.launch(launch.id);assert.equal((await library.get(pending.digest)).digest,bundle.content.digest,'persisted official launch resolves the same registered checkpoint');await library.clearLaunch(launch.id);
 const loaded=save.parseWorld(source);assert.deepEqual(loaded,JSON.parse(current.payload));
 const reSaved=save.serializeWorld(loaded);assert.deepEqual(save.parseWorld(reSaved),loaded);assert.deepEqual(JSON.parse(reSaved).content,api.packageLock(bundle.content));
 assert.equal(await files.readSaveFile(),source,'resolution and parsing never rewrite the source');assert.equal(await files.readSaveFile('manual'),manual);assert.deepEqual(await files.listSaves(),before);
 for(const field of ['digest','engine','assets']){const bad=JSON.stringify({...current,content:{...reported,[field]:'0'.repeat(64)}});await assert.rejects(library.resolve(bad),field==='digest'?/官方行记的版本尚未登记/:/版本不匹配/);assert.throws(()=>save.parseWorld(bad),/版本不匹配/);}
 await assert.rejects(library.resolve(JSON.stringify({...current,content:{...reported,packageId:'custom'}})),/版本不匹配/);
 await assert.rejects(library.resolve(JSON.stringify({...current,content:reported,checksum:'invalid'})),/校验/);
 assert.equal(await files.readSaveFile(),source);assert.deepEqual(await files.listSaves(),before);
 await writeFile('.cache/content-studio/reported-official.save.json',source);
 console.log('Reported a57eb8168d64 lock: exact official tables proven; newest auto save resolves without history or installed packages.');
 console.log('Real one-day fixture: parse/re-save preserves full state and original records; no fallback to day-zero manual save.');
 console.log('Unregistered official, custom, altered dependencies and invalid checksum stay rejected.');
}finally{globalThis.indexedDB=oldIDB;await realm.close();}
