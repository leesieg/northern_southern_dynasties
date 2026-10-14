import {beforeEach,describe,expect,it,vi} from 'vitest';
const assets='164152f982d7f60a5ff95e9af445f8c0f296b398cdaa00df71707dd3392a2c0d';
// Independent fixtures: checkpoint exports and the user's read-only save diagnostic.
const checkpoints=[
 {packageId:'official-nsd',digest:'91103302f26eadcebffb7a130caed62f3d033a092a51761c896db24e3be57ed0',engine:'7c1c015f206ad03ed4f6f0423a96c995db30423d938105a08970ded8e17bbf06',assets},
 {packageId:'official-nsd',digest:'b3544f6a6fc91104ffc8f017c1f1188db92ca35c41d6441618edac7d84f32e73',engine:'bafe57dff1b989055c8eaab727b5f333ec9670c9036cbe01628221ab2feb928b',assets},
 {packageId:'official-nsd',digest:'ffed10191b16f837f0fbd14cbe594f83b90b6e7e721af17f5340cc5a980445d1',engine:'4bcf58a3af5856a5e5feb950940cc56960e4d891d0a706d0b3daf03b80e76f24',assets},
 {packageId:'official-nsd',digest:'fbfdeede4f409e2baed0949b4c769232910551d55c9fae88a24ad3f2afd3af08',engine:'c0a9dd56700ff051970be7713d0fffa9438521e283e5054a50ab50c5279fb136',assets},
 {packageId:'official-nsd',digest:'3ad2f52800b83d0b596ce18b6ac3665dd383a94f9b15f959b2e75489da7d5f7a',engine:'92f2e7b25584fcab5ff32f0e447b0d694974a7d465d2f7b631d65e407a98e9d4',assets},
];
const current={...checkpoints[0],digest:'current',engine:'current'};
describe('official save compatibility',()=>{
 beforeEach(()=>vi.resetModules());
 it.each(checkpoints)('accepts only the exact registered lock $digest',async previous=>{
  const b=await import('./contentBinding');b.bindContent(current,{},true);
  expect(()=>b.assertSaveContent(previous)).not.toThrow();
  for(const field of ['packageId','digest','engine','assets'] as const)expect(()=>b.assertSaveContent({...previous,[field]:'unknown'})).toThrow();
  expect(()=>b.assertSaveContent({...previous,extra:true})).toThrow();
 });
 it.each(['custom','official-nsd'])('keeps nonofficial bindings exact even with package ID %s',async packageId=>{
  const b=await import('./contentBinding'),lock={...current,packageId,digest:'custom'};b.bindContent(lock,{},false);
  for(const previous of checkpoints)expect(()=>b.assertSaveContent(previous)).toThrow();
  expect(()=>b.assertSaveContent(undefined)).toThrow();expect(()=>b.assertSaveContent(lock)).not.toThrow();
 });
 it('restores a representative world under the reported lock without bypassing payload validation',async()=>{
  const {createCampaign}=await import('./campaignStart');
  const {serializeWorld}=await import('./save');
  const source=JSON.parse(serializeWorld(createCampaign('xiao-gang','three-realms-546','sandbox')));
  const tables=(await import('../data/contentTables')).captureContentTables();
  vi.resetModules();const b=await import('./contentBinding');b.bindContent(current,tables,true);
  const save=await import('./save');
  const original=JSON.stringify(source);source.content=checkpoints[3];const encoded=JSON.stringify(source);
  const restored=save.parseWorld(encoded);expect(restored).toEqual(JSON.parse(source.payload));
  expect(save.parseWorld(save.serializeWorld(restored))).toEqual(restored);
  expect(JSON.parse(save.serializeWorld(restored)).content).toEqual(current);
  expect(JSON.stringify(source)).toBe(encoded);expect(original).not.toBe(encoded);
  expect(()=>save.parseWorld(JSON.stringify({...source,payload:source.payload+' '}))).toThrow('校验');
  expect(()=>save.parseWorld(JSON.stringify({...source,scriptId:'unknown'}))).toThrow('剧本');
  const invalid={...JSON.parse(source.payload),day:-1},payload=JSON.stringify(invalid);let hash=2166136261;
  for(let i=0;i<payload.length;i++)hash=Math.imul(hash^payload.charCodeAt(i),16777619);
  expect(()=>save.parseWorld(JSON.stringify({...source,payload,checksum:(hash>>>0).toString(16)}))).toThrow('不合法');
 });
});
