import {describe,it,expect} from 'vitest';
import {createPreviewStorage} from './previewStorage';
import {createCampaign} from './campaignStart';
import {parseWorld,serializeWorld} from './save';
describe('isolated preview persistence',()=>{
 it('keeps exactly three auto slots plus manual/backup and returns detached snapshots',async()=>{
  const a=createPreviewStorage(),b=createPreviewStorage(),w=createCampaign();
  await a.saveWorld(w);for(let i=0;i<5;i++)await a.saveWorld(w,true);await a.saveWorld(w,false,'previous-run');
  const slots=await a.listSaves();expect(slots).toHaveLength(5);expect(slots.filter(s=>s.id.startsWith('auto-'))).toHaveLength(3);
  expect(await b.listSaves()).toEqual([]);expect(await b.loadWorld()).toBeNull();
  slots[0].day=123;const loaded=(await a.loadWorld('manual'))!;loaded.people[0].coins=0;
  expect((await a.loadWorld('manual'))!.people[0].coins).toBe(w.people[0].coins);
  expect((await a.listSaves())[0].day).toBe(0);
  await a.deleteSave('manual');expect(await a.loadWorld('manual')).toBeNull();
  await expect(a.deleteSave('../../formal')).rejects.toThrow('槽位');
 });
 it('does not mutate the caller or replace an existing slot when serialization fails',async()=>{
  const store=createPreviewStorage(),w=createCampaign();await store.saveWorld(w);
  const slots=await store.listSaves(),saved=await store.loadWorld('manual');w.people[0].coins=-1;
  const invalid=structuredClone(w);await expect(store.saveWorld(w)).rejects.toThrow();
  expect(w).toEqual(invalid);expect(await store.listSaves()).toEqual(slots);expect(await store.loadWorld('manual')).toEqual(saved);
 });
 it('roundtrips the existing save envelope without reinitializing historical armies',async()=>{
  const original=createCampaign('xiao-yan',undefined,'sandbox'),source=serializeWorld(original),store=createPreviewStorage();
  const imported=parseWorld(source);await store.saveWorld(imported);
  const restored=(await store.loadWorld('manual'))!;
  expect(restored).toEqual(imported);expect(restored.realm!.armies).toEqual(original.realm!.armies);
  expect(JSON.parse(source)).toMatchObject({format:'fynbc-save',version:1});
 });
});
