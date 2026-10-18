import {beforeEach,describe,expect,it,vi} from 'vitest';
const assets='164152f982d7f60a5ff95e9af445f8c0f296b398cdaa00df71707dd3392a2c0d';
// Independent fixtures: checkpoint exports and the user's read-only save diagnostic.
const checkpoints=[
 {"packageId":"official-nsd","digest":"fa3434bcc393deabbd380c9427c911ba48362e36a07ad49266b6f0b4c20714ed","engine":"e0811d2617e93133112f116cd5bd1a6469de6424065d5551eb82d6d68d89c0a1","assets":"65c918a601cd76c8a42c937d90d9a3ffafe80aa7e1fe2aef09053c2a387944ba"},
 {"packageId":"official-nsd","digest":"061a16ba104c0fcfa37120b434a97bd26d782266a79291983e35193f28f4d559","engine":"e0811d2617e93133112f116cd5bd1a6469de6424065d5551eb82d6d68d89c0a1","assets":"e750511af4450e3e8b7a045236f2ce50880f3492a86ee9fc821892af98339119"},
 {"packageId":"official-nsd","digest":"e8275fcf3ac8a8bc325ec57b80f89ee2a6a81a2de60cc95086fdfe4b6e05a118","engine":"e0811d2617e93133112f116cd5bd1a6469de6424065d5551eb82d6d68d89c0a1","assets":"be5744c861e1e352c51a363be1ca159b0a1e3a646b930a41cb5fe319c723bc26"},
 {packageId:'official-nsd',digest:'7a1cd07569b41b7252f37548518970f678eb17d9b75e198b616a4939fe439d73',engine:'54e28088346c44d8d8da86eef75f9064c2a6ab3632c004802b6c3d855b173f43',assets:'66a1f59215430c104e079deaf91c39673bac53cb18c3e86d11d8ade11e72d98c'},
 {"packageId":"official-nsd","digest":"c445d936905a08a188dba370243f47413827d45fb1fd17d13138108e1b236c0b","engine":"c5448279ad5d01242d976cece1fd187a6f68ac5a237a737dcec6809e7083e7bb","assets":"ba42b668580d827e6c1005046908a87041f495dea1cbab9f41fb07b32db17439"},
 {"packageId":"official-nsd","digest":"a1d06e83b2d832e11b62a5a9b805a3aeddda566e35fec173a7f4fc373a1d640a","engine":"5c2dd68c60ae54cd3c77960b3179465a01e5e17dbf366d1f3d1d2d5bb55bb4b1","assets":"66a1f59215430c104e079deaf91c39673bac53cb18c3e86d11d8ade11e72d98c"},
 {packageId:'official-nsd',digest:'522048e8f9019d7d958e52def019f1686669e5ddbabf09c9732c805755525170',engine:'1bcd975ffee32a0298a78bc918672779562df6c1919e52b7fac1fdde439f01dd',assets:'ba42b668580d827e6c1005046908a87041f495dea1cbab9f41fb07b32db17439'},
 {packageId:'official-nsd',digest:'e2e1d0c4b71f0518590d46a170bb2ce2560ea188da5e47425acfe198f64238c9',engine:'a6f9823aaed196965d9b0b18d974b75366ad52e032677a63eb2d84699ccaea1e',assets},
 {packageId:'official-nsd',digest:'d7b6be04fc9f59ebc9647de4341550b4a739567288ba5f2afe9a8a3cc3c51421',engine:'827021ec2dc3d9183c623b799c157c4bcc3ac771c260dec1c56b516e8007fc18',assets:'74361bfbf572ba0c4928f662a47e563a9a16cdc96cb19c24c4c7702735e26a58'},
 {packageId:'official-nsd',digest:'a57eb8168d647065963d0ab9198554e65cb0ac16147c76df66e4e173cf5d8e7f',engine:'99bc51e78e4404a7f20fcbe97943e09e3d161b55cddeb10302ab25a6e1945654',assets},
 {packageId:'official-nsd',digest:'24e1afbf9c75dbb41396c68aec99328011aee8610aadfc1cdbf669b09a571bc8',engine:'3d38b16c1484f7d88c8398b5d3df100881b69142abfa4f65fa4311a08db3d4e2',assets:'f6c116b32013776fcef1c288b52e3a8459681bc8d1cd5c7f7c0d2261985951b3'},
 {packageId:'official-nsd',digest:'108aab003e1eef4410a8bb133e25f88125be5da86c6f603cdd05da17eedd8111',engine:'3d38b16c1484f7d88c8398b5d3df100881b69142abfa4f65fa4311a08db3d4e2',assets:'65c918a601cd76c8a42c937d90d9a3ffafe80aa7e1fe2aef09053c2a387944ba'},
 {packageId:'official-nsd',digest:'3288e381ba307a19420c2c9c02fac64a55ee5c6b61dee0a6c1f41191837d5fdd',engine:'ddd5ba828d83987db10031079a93d10f27cb9b01e39991f962ba9d406fe594eb',assets},
 {packageId:'official-nsd',digest:'5cd6adc35d88ba7990f3f4b342708bdec2e2614ee6843e51ba209e1952a177da',engine:'1531be96b5f86a8045da2eb2c2dc8d41441cc7089d7c9de44dff1b52a520b0cf',assets},
 {"packageId":"official-nsd","digest":"40583dadb95a7567466f3fcfe8b2d4d067916c5ee2c959c0c49dfe138d76e490","engine":"3a59592b7844fcb6c6a91c69fda77b4907b0cb005d2c2535db362113b20c9ff0",assets},
 {packageId:'official-nsd',digest:'37c03a9679643e0ed7db5aff435c7882a62ff2c2537b4b6f930a3bf8d1db4395',engine:'071a1232f3d1392ae06b9e1e49d3e516fca19d13057463e61fc37b61eef16aef',assets},
 {packageId:'official-nsd',digest:'af808ae5d3ddcea4d5d26368bd3b6b44c52cf11d1c0f84dec88b7b6c8fc0decc',engine:'a4a625d2fea6c4bf08a24e00a8409de8cf40139a2c3378dfc6dcb20092d628d7',assets},
 {packageId:'official-nsd',digest:'91103302f26eadcebffb7a130caed62f3d033a092a51761c896db24e3be57ed0',engine:'7c1c015f206ad03ed4f6f0423a96c995db30423d938105a08970ded8e17bbf06',assets},
 {packageId:'official-nsd',digest:'b3544f6a6fc91104ffc8f017c1f1188db92ca35c41d6441618edac7d84f32e73',engine:'bafe57dff1b989055c8eaab727b5f333ec9670c9036cbe01628221ab2feb928b',assets},
 {packageId:'official-nsd',digest:'ffed10191b16f837f0fbd14cbe594f83b90b6e7e721af17f5340cc5a980445d1',engine:'4bcf58a3af5856a5e5feb950940cc56960e4d891d0a706d0b3daf03b80e76f24',assets},
 {packageId:'official-nsd',digest:'fbfdeede4f409e2baed0949b4c769232910551d55c9fae88a24ad3f2afd3af08',engine:'c0a9dd56700ff051970be7713d0fffa9438521e283e5054a50ab50c5279fb136',assets},
 {packageId:'official-nsd',digest:'3ad2f52800b83d0b596ce18b6ac3665dd383a94f9b15f959b2e75489da7d5f7a',engine:'92f2e7b25584fcab5ff32f0e447b0d694974a7d465d2f7b631d65e407a98e9d4',assets},
];
const current={...checkpoints[0],digest:'current',engine:'current'};
describe('official save compatibility',()=>{
 beforeEach(()=>vi.resetModules());
 it('bridges the exact pre-portrait official checkpoint across the new artwork fingerprint only',async()=>{
  const b=await import('./contentBinding'),next={...current,assets:'new-portrait-assets'};b.bindContent(next,{},true);
  expect(()=>b.assertSaveContent(checkpoints[0])).not.toThrow();expect(b.officialSaveDigestCompatible(checkpoints[0].digest,next)).toBe(true);
  for(const field of ['packageId','digest','engine','assets'] as const)expect(()=>b.assertSaveContent({...checkpoints[0],[field]:'unknown'})).toThrow();
 });
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
 it('accepts an exact trusted development checkpoint only with its registered host bridge',async()=>{const b=await import('./contentBinding'),checkpoint={...current,digest:'d'.repeat(64),engine:'e'.repeat(64)};expect(b.officialSaveCompatible(checkpoint,current)).toBe(false);b.bindContent(current,{},true,[checkpoint]);expect(()=>b.assertSaveContent(checkpoint)).not.toThrow();expect(()=>b.assertSaveContent({...checkpoint,assets:'unknown'})).toThrow();expect(()=>b.assertSaveContent({...checkpoint,packageId:'custom'})).toThrow();});
 it('resolves only complete registered official digests for persisted launches',async()=>{const b=await import('./contentBinding');for(const previous of checkpoints)expect(b.officialSaveDigestCompatible(previous.digest,current)).toBe(true);expect(b.officialSaveDigestCompatible(checkpoints[0].digest.slice(0,12),current)).toBe(false);expect(b.officialSaveDigestCompatible('0'.repeat(64),current)).toBe(false);expect(b.officialSaveDigestCompatible(checkpoints[0].digest,{...current,packageId:'custom'})).toBe(false);});
 it('restores a representative world under the reported lock without bypassing payload validation',async()=>{
  const {createCampaign}=await import('./campaignStart');
  const {serializeWorld}=await import('./save');
  const source=JSON.parse(serializeWorld(createCampaign('xiao-gang','three-realms-546','sandbox')));
  const tables=(await import('../data/contentTables')).captureContentTables();
  vi.resetModules();const b=await import('./contentBinding');b.bindContent(current,tables,true);
  const save=await import('./save');
  const original=JSON.stringify(source);source.content=checkpoints[0];const encoded=JSON.stringify(source);
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
