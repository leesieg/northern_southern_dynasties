/** One immutable content binding per module realm. A host must create a fresh
 * Worker/module graph before binding another package; never switch a running world. */
export interface ContentLock {packageId:string;digest:string;engine:string;assets:string}
export type ContentTables=Record<string,Record<string,unknown>>;
let binding:{lock:ContentLock;tables:ContentTables;legacy:boolean;officialSaves:ContentLock[]}|undefined;
const builtins:ContentTables={};

export function freezeContent<T>(value:T):T {
 if(value&&typeof value==='object'){
  for(const child of Object.values(value))freezeContent(child);
  Object.freeze(value);
 }
 return value;
}
export function bindContent(lock:ContentLock,tables:ContentTables,legacy=false,officialSaves:ContentLock[]=[]){
 if(binding||Object.keys(builtins).length)throw new Error('内容只能在规则加载前绑定一次；请创建新的模拟实例。');
 binding=freezeContent({lock:structuredClone(lock),tables:structuredClone(tables),legacy,officialSaves:structuredClone(officialSaves)});
}
export function selectContent<T extends Record<string,unknown>>(id:string,defaults:T):T {
 builtins[id]=defaults;
 if(!binding)return defaults;
 const table=binding.tables[id];
 if(!table||Object.keys(defaults).some(key=>!Object.hasOwn(table,key))||Object.keys(table).some(key=>!Object.hasOwn(defaults,key)))throw new Error('内容包缺少或含未知数据表字段：'+id);
 return table as T;
}
export function captureContentTables():ContentTables {
 if(binding)throw new Error('只能从未绑定的官方编译环境采集内容。');
 return structuredClone(builtins);
}
export function contentLock(){return binding?.lock;}
export function allowsLegacyContent(){return !binding||binding.legacy;}
/** Exact bridges for official checkpoints and the reported phase-4 development
 * save lock. Payload checksum, validation and migrations still run in save.ts;
 * custom packages and unknown official revisions stay exact. */
const phaseOneOfficialSave={packageId:'official-nsd',digest:'91103302f26eadcebffb7a130caed62f3d033a092a51761c896db24e3be57ed0',engine:'7c1c015f206ad03ed4f6f0423a96c995db30423d938105a08970ded8e17bbf06',assets:'164152f982d7f60a5ff95e9af445f8c0f296b398cdaa00df71707dd3392a2c0d'};
export const phaseTwoOfficialSave={packageId:'official-nsd',digest:'b3544f6a6fc91104ffc8f017c1f1188db92ca35c41d6441618edac7d84f32e73',engine:'bafe57dff1b989055c8eaab727b5f333ec9670c9036cbe01628221ab2feb928b',assets:'164152f982d7f60a5ff95e9af445f8c0f296b398cdaa00df71707dd3392a2c0d'};
export const phaseThreeOfficialSave={packageId:'official-nsd',digest:'ffed10191b16f837f0fbd14cbe594f83b90b6e7e721af17f5340cc5a980445d1',engine:'4bcf58a3af5856a5e5feb950940cc56960e4d891d0a706d0b3daf03b80e76f24',assets:'164152f982d7f60a5ff95e9af445f8c0f296b398cdaa00df71707dd3392a2c0d'};
// Read-only diagnostics: auto-1/2/3, days 199/190/180, 2026-10-14.
const phaseFourDevelopmentSave={packageId:'official-nsd',digest:'fbfdeede4f409e2baed0949b4c769232910551d55c9fae88a24ad3f2afd3af08',engine:'c0a9dd56700ff051970be7713d0fffa9438521e283e5054a50ab50c5279fb136',assets:'164152f982d7f60a5ff95e9af445f8c0f296b398cdaa00df71707dd3392a2c0d'};
// Captured before this compatibility fix (a97ea00 through 2580b25).
const phaseFourOfficialSave={packageId:'official-nsd',digest:'3ad2f52800b83d0b596ce18b6ac3665dd383a94f9b15f959b2e75489da7d5f7a',engine:'92f2e7b25584fcab5ff32f0e447b0d694974a7d465d2f7b631d65e407a98e9d4',assets:'164152f982d7f60a5ff95e9af445f8c0f296b398cdaa00df71707dd3392a2c0d'};
const phaseBOfficialSave={"packageId":"official-nsd","digest":"40583dadb95a7567466f3fcfe8b2d4d067916c5ee2c959c0c49dfe138d76e490","engine":"3a59592b7844fcb6c6a91c69fda77b4907b0cb005d2c2535db362113b20c9ff0","assets":"164152f982d7f60a5ff95e9af445f8c0f296b398cdaa00df71707dd3392a2c0d"};
const phaseAOfficialSave={"packageId":"official-nsd","digest":"37c03a9679643e0ed7db5aff435c7882a62ff2c2537b4b6f930a3bf8d1db4395","engine":"071a1232f3d1392ae06b9e1e49d3e516fca19d13057463e61fc37b61eef16aef","assets":"164152f982d7f60a5ff95e9af445f8c0f296b398cdaa00df71707dd3392a2c0d"};
const preEraOfficialSave={packageId:'official-nsd',digest:'af808ae5d3ddcea4d5d26368bd3b6b44c52cf11d1c0f84dec88b7b6c8fc0decc',engine:'a4a625d2fea6c4bf08a24e00a8409de8cf40139a2c3378dfc6dcb20092d628d7',assets:'164152f982d7f60a5ff95e9af445f8c0f296b398cdaa00df71707dd3392a2c0d'};
// Captured from the completed stage C source before stage D changes.
const phaseCOfficialSave={packageId:'official-nsd',digest:'5cd6adc35d88ba7990f3f4b342708bdec2e2614ee6843e51ba209e1952a177da',engine:'1531be96b5f86a8045da2eb2c2dc8d41441cc7089d7c9de44dff1b52a520b0cf',assets:'164152f982d7f60a5ff95e9af445f8c0f296b398cdaa00df71707dd3392a2c0d'};
// Reported official auto saves at days 3944/3951/3957. Reconstructed digest
// matches the captured stage C tables exactly; only the rule fingerprint differs.
const reportedOfficialDevelopmentSave={packageId:'official-nsd',digest:'a57eb8168d647065963d0ab9198554e65cb0ac16147c76df66e4e173cf5d8e7f',engine:'99bc51e78e4404a7f20fcbe97943e09e3d161b55cddeb10302ab25a6e1945654',assets:'164152f982d7f60a5ff95e9af445f8c0f296b398cdaa00df71707dd3392a2c0d'};
export function sameContentLock(a:unknown,b:ContentLock):boolean {return !!a&&typeof a==='object'&&!Array.isArray(a)&&Object.keys(a).length===4&&Object.entries(b).every(([key,value])=>(a as Record<string,unknown>)[key]===value);}
// Captured from the completed stage D source before this recovery patch.
const phaseDOfficialSave={packageId:'official-nsd',digest:'3288e381ba307a19420c2c9c02fac64a55ee5c6b61dee0a6c1f41191837d5fdd',engine:'ddd5ba828d83987db10031079a93d10f27cb9b01e39991f962ba9d406fe594eb',assets:'164152f982d7f60a5ff95e9af445f8c0f296b398cdaa00df71707dd3392a2c0d'};
// Captured from the unchanged official tables before the five-portrait asset update.
// Artwork changes the asset fingerprint; only this exact prior lock may bridge it.
const preHistoricalPortraitSave={packageId:'official-nsd',digest:'e2e1d0c4b71f0518590d46a170bb2ce2560ea188da5e47425acfe198f64238c9',engine:'a6f9823aaed196965d9b0b18d974b75366ad52e032677a63eb2d84699ccaea1e',assets:'164152f982d7f60a5ff95e9af445f8c0f296b398cdaa00df71707dd3392a2c0d'};
// Exact official lock reconstructed from the local pre-health checkpoint; tables unchanged.
const preHistoricalHealthSave={"packageId":"official-nsd","digest":"7552d2d58e4581fbb45f022305332fc36200c273e614fbfd238ee6e79fdef8ac","engine":"503eab013dd173d6b1913cb31ecd5a0283d68eae4cf664ede971c43d45348afd","assets":"74361bfbf572ba0c4928f662a47e563a9a16cdc96cb19c24c4c7702735e26a58"};
// Captured before the second health calibration; persisted world shapes are unchanged.
const preHealthCalibrationSave={"packageId":"official-nsd","digest":"ab81d2e7d0cb16964e4440797d3ad0612758bccc2e68d6ec8cb3a88a4b626872","engine":"fac2284db40b285ae440f35747f2de5ea42d3276007a7ee5652e3ccf7060a702","assets":"74361bfbf572ba0c4928f662a47e563a9a16cdc96cb19c24c4c7702735e26a58"};
// Exact checkpoint before unarmed handover support; no persisted shape or table changes.
const preUnarmedHandoverSave={packageId:'official-nsd',digest:'cc15a79032922accfa233eb785150c004f639260644231694d47baeed9796371',engine:'c86f67a546fbaab22629b5fb2ce246a47574e4ff933a0d2976815d4e81312d99',assets:'74361bfbf572ba0c4928f662a47e563a9a16cdc96cb19c24c4c7702735e26a58'};
// Captured before the four-portrait asset update; official tables are unchanged.
const preFourHistoricalPortraitSave={packageId:'official-nsd',digest:'d7b6be04fc9f59ebc9647de4341550b4a739567288ba5f2afe9a8a3cc3c51421',engine:'827021ec2dc3d9183c623b799c157c4bcc3ac771c260dec1c56b516e8007fc18',assets:'74361bfbf572ba0c4928f662a47e563a9a16cdc96cb19c24c4c7702735e26a58'};
// Captured before posthumous-title visibility and NPC conferral; persisted shapes unchanged.
const preHonorVisibilitySave={packageId:'official-nsd',digest:'593eac87e4eeeb4edfd18f1900131005ebaa6f456a1be2b7072507fee61b293d',engine:'0d5be3208e4178dcd1634e7b14f07dc6cf27fc7356c0a6646ccb299b3dcab6bd',assets:'ba42b668580d827e6c1005046908a87041f495dea1cbab9f41fb07b32db17439'};
// Captured before the third portrait batch; official tables are unchanged.
const preThirdHistoricalPortraitSave={packageId:'official-nsd',digest:'522048e8f9019d7d958e52def019f1686669e5ddbabf09c9732c805755525170',engine:'1bcd975ffee32a0298a78bc918672779562df6c1919e52b7fac1fdde439f01dd',assets:'ba42b668580d827e6c1005046908a87041f495dea1cbab9f41fb07b32db17439'};
// Captured official checkpoints before the Hou Jing chain changes and reception recovery.
const preHouJingChainSave={"packageId":"official-nsd","digest":"c445d936905a08a188dba370243f47413827d45fb1fd17d13138108e1b236c0b","engine":"c5448279ad5d01242d976cece1fd187a6f68ac5a237a737dcec6809e7083e7bb","assets":"ba42b668580d827e6c1005046908a87041f495dea1cbab9f41fb07b32db17439"};
const preReceptionRecoverySave={"packageId":"official-nsd","digest":"a1d06e83b2d832e11b62a5a9b805a3aeddda566e35fec173a7f4fc373a1d640a","engine":"5c2dd68c60ae54cd3c77960b3179465a01e5e17dbf366d1f3d1d2d5bb55bb4b1","assets":"66a1f59215430c104e079deaf91c39673bac53cb18c3e86d11d8ade11e72d98c"};
// Captured before Western Wei portrait and age-stage assets; official tables unchanged.
const preWestSevenPortraitSave={packageId:'official-nsd',digest:'7a1cd07569b41b7252f37548518970f678eb17d9b75e198b616a4939fe439d73',engine:'54e28088346c44d8d8da86eef75f9064c2a6ab3632c004802b6c3d855b173f43',assets:'66a1f59215430c104e079deaf91c39673bac53cb18c3e86d11d8ade11e72d98c'};
// Reported official auto saves at days 161/175/176, taken while the Western Wei
// portraits were still landing in public/; that asset fingerprint is a transient
// subset of the committed set, so the tables and rule fingerprint are unchanged
// and the world still loads. Recomputed from the current official tables.
const portraitStagingOfficialSave={packageId:'official-nsd',digest:'24e1afbf9c75dbb41396c68aec99328011aee8610aadfc1cdbf669b09a571bc8',engine:'3d38b16c1484f7d88c8398b5d3df100881b69142abfa4f65fa4311a08db3d4e2',assets:'f6c116b32013776fcef1c288b52e3a8459681bc8d1cd5c7f7c0d2261985951b3'};
// Captured from HEAD before registering the staging lock above. The rule
// fingerprint covers this file, so that registration alone would orphan every
// save written by the preceding build; keep the exact prior lock readable.
const prePortraitStagingFixSave={packageId:'official-nsd',digest:'108aab003e1eef4410a8bb133e25f88125be5da86c6f603cdd05da17eedd8111',engine:'3d38b16c1484f7d88c8398b5d3df100881b69142abfa4f65fa4311a08db3d4e2',assets:'65c918a601cd76c8a42c937d90d9a3ffafe80aa7e1fe2aef09053c2a387944ba'};
// Exact pre-HUD lock and the two local asset staging locks; official tables unchanged.
const preReferenceHudSave={"packageId":"official-nsd","digest":"fa3434bcc393deabbd380c9427c911ba48362e36a07ad49266b6f0b4c20714ed","engine":"e0811d2617e93133112f116cd5bd1a6469de6424065d5551eb82d6d68d89c0a1","assets":"65c918a601cd76c8a42c937d90d9a3ffafe80aa7e1fe2aef09053c2a387944ba"};
const referenceHudStagingSaves=[{"packageId":"official-nsd","digest":"061a16ba104c0fcfa37120b434a97bd26d782266a79291983e35193f28f4d559","engine":"e0811d2617e93133112f116cd5bd1a6469de6424065d5551eb82d6d68d89c0a1","assets":"e750511af4450e3e8b7a045236f2ce50880f3492a86ee9fc821892af98339119"},{"packageId":"official-nsd","digest":"e8275fcf3ac8a8bc325ec57b80f89ee2a6a81a2de60cc95086fdfe4b6e05a118","engine":"e0811d2617e93133112f116cd5bd1a6469de6424065d5551eb82d6d68d89c0a1","assets":"be5744c861e1e352c51a363be1ca159b0a1e3a646b930a41cb5fe319c723bc26"}];
// Exact pre-cleanup lock and local transparent-art staging locks; official tables unchanged.
const preHudEdgeCleanupSave={"packageId":"official-nsd","digest":"ac96be44e033f825625cb15e35ad647c0ef357393e3e1ab572375b0fd1fc2d8d","engine":"c1353426afb0b85aef4f49f76ef6d3dd2287879ff2c2bbce1f0e51ddc68703d7","assets":"be5744c861e1e352c51a363be1ca159b0a1e3a646b930a41cb5fe319c723bc26"};
const hudEdgeStagingSaves=[{"packageId":"official-nsd","digest":"4d2412f4742f5fd7cdf86cf20bd6b04bc91fc4fda28a571986437ea6fa81924c","engine":"c1353426afb0b85aef4f49f76ef6d3dd2287879ff2c2bbce1f0e51ddc68703d7","assets":"ce0ddc2414f1d3a6cc0ed1abc7b553c4cee4bfd16dad09b79fd89a593d911e84"},{"packageId":"official-nsd","digest":"748727aafd9c783bca1fe504589bd354d658abd3b3aef43caff6dc0e4ae44bc1","engine":"c1353426afb0b85aef4f49f76ef6d3dd2287879ff2c2bbce1f0e51ddc68703d7","assets":"0ff28f6346c87e80bd0fd56604c6d8be03b833f8ee3837b3e87e010e2979152e"}];
// Exact lock of the inspected Lu Minghui day-2540 save; official tables unchanged.
const preCustodyRecoverySave={"packageId":"official-nsd","digest":"7937cfef2a25e502b561d7cde7e6bbcef53513d93c7b37343459860584ef9815","engine":"a74357e1edcefd3d2480e0ba30c5f75d4f2111f85a9c940bdcb3ade2b9cf4b82","assets":"0ff28f6346c87e80bd0fd56604c6d8be03b833f8ee3837b3e87e010e2979152e"};
// Exact official lock before postwar NPC return and lost-force settlement recovery.
const prePostwarReturnSave={"packageId":"official-nsd","digest":"a186d17d52e06bb7521095f96c7be4eb7d1e430d1f9eed72539905e72a27f122","engine":"13a8fe3500adb1e0fd47a52a3ab0fac88bc3a8f87bc32e48b7e1bf474661c51b","assets":"0ff28f6346c87e80bd0fd56604c6d8be03b833f8ee3837b3e87e010e2979152e"};
// Captured before the rebel banner and uprising-base handover fix; world shapes unchanged.
const preCivilBaseSave={"packageId":"official-nsd","digest":"7a2f62a997dfeb5bae169acd2ed973be0e4ba52740d1c273ad8332511d0cae23","engine":"7ff9c183a86c01bbc1d6e4e349fda484836e2b30b95d7d6cb0b2d7d2ba560143","assets":"0ff28f6346c87e80bd0fd56604c6d8be03b833f8ee3837b3e87e010e2979152e"};
// Exact official lock before independent wartime polities; scenario tables and assets unchanged.
const preCivilPolitiesSave={"packageId":"official-nsd","digest":"e52e8928ea81fa43cea10679475f3b04e9c6cce8742b6f0bdb55d32a0b64d14b","engine":"15f118da0abdc3b27b456ff9bfe60486187a51d7fe15d83e97c8dc0046e63f0b","assets":"0ff28f6346c87e80bd0fd56604c6d8be03b833f8ee3837b3e87e010e2979152e"};
// Exact official checkpoint before nationwide civil-war mobilization.
const preCivilMobilizationSave={  "packageId": "official-nsd",  "digest": "afb0dc2f888f4f71c24975e295454911292f0cbb6b5ce5de8ace2fec5e81e9b5",  "engine": "e3945f206f30f251567a6b65f93ddac05c53cab426c1b8db28d4026f7324a9fa",  "assets": "0ff28f6346c87e80bd0fd56604c6d8be03b833f8ee3837b3e87e010e2979152e"};
// Inspected Lu Minghui day-1819 save; matched the local official compilation record and unchanged tables.
const reportedOccupiedSupplySave={packageId:'official-nsd',digest:'e7c5d7fe801fa1c1228b11fc85c427e0d044e522bfa5b21a7102b0e21d463a3b',engine:'4131f533a2275188434a8dbf04c8821ca962cd2ecc5751822b0cd5576993b459',assets:'0ff28f6346c87e80bd0fd56604c6d8be03b833f8ee3837b3e87e010e2979152e'};
// Inspected official save reported 2026-10-20 (d27b620c…). Its tablesDigest
// equals current tables minus the picker-only scripts.recommendedCharacter
// field (verified by recomputing both table states); world shape unchanged.
const preRecommendedCharacterSave={packageId:'official-nsd',digest:'d27b620ca9d58e1933f244be67a6a9edd17422d463c7c775dbd712a1b041db5f',engine:'c04ad2f823660e4259a4043967ee7130b40a1ebda825754b414adc525e5476b0',assets:'0ff28f6346c87e80bd0fd56604c6d8be03b833f8ee3837b3e87e010e2979152e'};
// Captured before registering the lock above; the rule fingerprint covers this
// file, so the registration alone would orphan saves written by that build.
const preCoreFlowCheckpointSave={packageId:'official-nsd',digest:'a20793d810f7fe740f55c5717064171b04dc3b6cb63528b705946483c51faec0',engine:'c6af5a08cf8c70347b3e51d68d55fbf3fc66830bdc8e727c9d140135d821dc37',assets:'0ff28f6346c87e80bd0fd56604c6d8be03b833f8ee3837b3e87e010e2979152e'};
// Captured trusted official development locks before the eleven-portrait asset switch.
// Each digest was reconstructed with the captured identical tables; keep exact four-field matching.
const preElevenPortraitSaves:ContentLock[]=[
 {"packageId":"official-nsd","digest":"0f7cddd07171c753457f8b344dbdd7abbd611e6fec0b4bc69f9d72de8d3f2481","engine":"747f9dbc9364c76f5caeb4e85622653935aa2aab980b2d3a5f51405b1c1bbb35","assets":"0ff28f6346c87e80bd0fd56604c6d8be03b833f8ee3837b3e87e010e2979152e"},
 {"packageId":"official-nsd","digest":"2b3a303f5393fcddf4c4cd7fa12b153ab8686c55051cd4fdc097c48ca84f1b56","engine":"64cb2b0a20721928e4ddf6762be067084f6b8352b34a84b848495b51b95bfebe","assets":"0ff28f6346c87e80bd0fd56604c6d8be03b833f8ee3837b3e87e010e2979152e"},
 {"packageId":"official-nsd","digest":"3bb96189f0f2b1b376700ba88a5a5ad59f559db34fd8994fdce939cc93be736b","engine":"23d0e3fbe4ee1dc3522dee98880190f8e95effb041daf33f0aaaeccebd4eb9b3","assets":"0ff28f6346c87e80bd0fd56604c6d8be03b833f8ee3837b3e87e010e2979152e"},
 {"packageId":"official-nsd","digest":"492e3de4a7e995e17f14b16951a5ad975277138b8e4b77c163c91e842539b47b","engine":"04414afb72dec2e5b849bfa75bc64d157444afbbca47cdf951687f30f020ca46","assets":"0ff28f6346c87e80bd0fd56604c6d8be03b833f8ee3837b3e87e010e2979152e"},
 {"packageId":"official-nsd","digest":"4f0a6495fbb9b56df70d16a8b2fafc2d7660cb895b249c7bcb2bb97b91fb4aa8","engine":"117ba52764bfd879c753960c3958b195d79efe19c2934f25d7749ba25cc111c6","assets":"0ff28f6346c87e80bd0fd56604c6d8be03b833f8ee3837b3e87e010e2979152e"},
 {"packageId":"official-nsd","digest":"501dcfbfd06791b27ce29f1342b6dd4a369dd69f04930a0a73d079ebbfec6c54","engine":"dfed989942a172acb875a47861e11315dbfc84e5d520ed99eec7dfdd568e40d0","assets":"0ff28f6346c87e80bd0fd56604c6d8be03b833f8ee3837b3e87e010e2979152e"},
 {"packageId":"official-nsd","digest":"54856722441b4523ad631496ea91824348f357c5a556128214c06f932ff5304e","engine":"212af3349d9d21473a1e83e83c28845d27c52304c320de83df1d95fa7014e511","assets":"0ff28f6346c87e80bd0fd56604c6d8be03b833f8ee3837b3e87e010e2979152e"},
 {"packageId":"official-nsd","digest":"75be304b6ff6822d12d3efa4d8e931433f6e4758f7f8880b5959d31251be99f4","engine":"0f9bc1c3d4ac1237b6a046011589d4eb8f9eaab2e8d825acb04988584e51cf3a","assets":"0ff28f6346c87e80bd0fd56604c6d8be03b833f8ee3837b3e87e010e2979152e"},
 {"packageId":"official-nsd","digest":"764df23ea112da860bef8d7da49c3eb01d8deebeadaa1ee76de3c49f8f52e260","engine":"4dac45c52969add0493ce96c852bd1a9372462454fe7f60aa65be3934ad0103d","assets":"0ff28f6346c87e80bd0fd56604c6d8be03b833f8ee3837b3e87e010e2979152e"},
 {"packageId":"official-nsd","digest":"8ffed73f167264c031fc420ab6995a966d49f26d758a7d18c61dc0769c47bcbf","engine":"766cfa059b14cadf533a569921ee31191b9946e8e35f89aa15d70af8ea5b97bc","assets":"0ff28f6346c87e80bd0fd56604c6d8be03b833f8ee3837b3e87e010e2979152e"},
 {"packageId":"official-nsd","digest":"98abfd572c9fbfbb1dc9e13ea2eac28efb1b6a7a02ce07fc4a1453094f3fa8eb","engine":"b9e83a2d989ec131b79827258f2e7652b7e8ddfbc3a72b404475a2f5fc67f4c8","assets":"0ff28f6346c87e80bd0fd56604c6d8be03b833f8ee3837b3e87e010e2979152e"},
 {"packageId":"official-nsd","digest":"a20793d810f7fe740f55c5717064171b04dc3b6cb63528b705946483c51faec0","engine":"c6af5a08cf8c70347b3e51d68d55fbf3fc66830bdc8e727c9d140135d821dc37","assets":"0ff28f6346c87e80bd0fd56604c6d8be03b833f8ee3837b3e87e010e2979152e"},
 {"packageId":"official-nsd","digest":"a5933ff5ba5121cfb88169569ecb68afaa14c4afae3debe9ca98faad80f527b9","engine":"2ac6deea69b56e3cb90ae03008e529e1104823e50c08218c89eb8e172ea6d19e","assets":"0ff28f6346c87e80bd0fd56604c6d8be03b833f8ee3837b3e87e010e2979152e"},
 {"packageId":"official-nsd","digest":"b053edbb42653d58896623915922165b90e732d6fea909a46528cf040596939d","engine":"00b6a6be5124b694714e6c90c260712f01f3b906c70cc02921a13a46b8fe661f","assets":"0ff28f6346c87e80bd0fd56604c6d8be03b833f8ee3837b3e87e010e2979152e"},
 {"packageId":"official-nsd","digest":"ba0a77d81ccb26a336e5c04651d2ef22744a4b065e5717c11a626cfa43b3246e","engine":"5a7552eb2cb290d68045371becbeab305f69080021fe3ad9d4dfb39d7da86161","assets":"0ff28f6346c87e80bd0fd56604c6d8be03b833f8ee3837b3e87e010e2979152e"},
 {"packageId":"official-nsd","digest":"c0b164775a4c2ac9ca27dafd92eda12d44656b68f55f96fb0e1765f8ef72f599","engine":"3c7d6943939f665a6f1832434e184fd882b13d9c0b1981e40123d8c7d4a77563","assets":"0ff28f6346c87e80bd0fd56604c6d8be03b833f8ee3837b3e87e010e2979152e"},
 {"packageId":"official-nsd","digest":"c76035cbe19d7b35f5d2f17e1550eb267cf97edbaca060143851f3b1982b4f5b","engine":"4e62099bf0b4460dbd0a1c200341a35d6d950e53df259e6f30f9efa9fb60e7bf","assets":"0ff28f6346c87e80bd0fd56604c6d8be03b833f8ee3837b3e87e010e2979152e"},
 {"packageId":"official-nsd","digest":"d08bb291cb4f6e370a493d6472adbb7b5327a8e8d80699e3be2c857a492c78e4","engine":"3daa896536ce10270f2f77bc1036eaf8c30366b2f17dc3994b3dfa54413f8f4d","assets":"0ff28f6346c87e80bd0fd56604c6d8be03b833f8ee3837b3e87e010e2979152e"},
 {"packageId":"official-nsd","digest":"d91530f60e89f7e2532c1ecf289ec03c8174fd481bb8790d99a223ab7dbf6990","engine":"c88838a9cd1910fbb236175b817397bbdd3248ccaae41be52cc17698aa3a72a4","assets":"0ff28f6346c87e80bd0fd56604c6d8be03b833f8ee3837b3e87e010e2979152e"},
 {"packageId":"official-nsd","digest":"dbc91cf890f6e4b2738f263155627463873eaa96b4e6784369040540af36a3c1","engine":"a4f986d38f881cb63a0896d3bf15e7b4ea3ea65f0e5620a6095d2e9c4338bf59","assets":"0ff28f6346c87e80bd0fd56604c6d8be03b833f8ee3837b3e87e010e2979152e"},
 {"packageId":"official-nsd","digest":"dcad28b3f0d1681d14003156b5fda93f5e6a0cd59bdae2783d57130b2cad44ae","engine":"ac0a29779f5bb4be0b5902d19f5d8225f9efbaf738ebb4fd75eb8e6af236cbf4","assets":"0ff28f6346c87e80bd0fd56604c6d8be03b833f8ee3837b3e87e010e2979152e"},
 {"packageId":"official-nsd","digest":"e0db7ea8579b5272aa058c450b082469f23cf8fe4f3649b2d42c5d5272d7adac","engine":"d97c2554821fca095de3f3a9ea253d439f7018ae7a32042c9c59ecb2229c65e3","assets":"0ff28f6346c87e80bd0fd56604c6d8be03b833f8ee3837b3e87e010e2979152e"},
 {"packageId":"official-nsd","digest":"e5a4ad3944184381a6247be504a7feb176c0f847a4d323ed9b556223f31b98d1","engine":"eef087e377398bdbd2ba6e4c59f5054bfa667e00cd3fafcc54b5df4a77650bba","assets":"0ff28f6346c87e80bd0fd56604c6d8be03b833f8ee3837b3e87e010e2979152e"},
 {"packageId":"official-nsd","digest":"e7b65a5cdb3a56b35f040b7f6821f2c7fe6c84bc92885196306c1d780db42555","engine":"230ebd96d2ce0bf0f89eb6d4e086781f859675fcd7c090d8eb3d5c67e3ddc633","assets":"0ff28f6346c87e80bd0fd56604c6d8be03b833f8ee3837b3e87e010e2979152e"},
 {"packageId":"official-nsd","digest":"ee1480194ffe328ad98c65be805e4e276923d0b7bf259a0d7f2c47468c2bd1fe","engine":"c2a907dd1a3cec21ef0a6c374a138830a43c9e3715a8f5c702edfb0399b4d4bc","assets":"0ff28f6346c87e80bd0fd56604c6d8be03b833f8ee3837b3e87e010e2979152e"},
 {"packageId":"official-nsd","digest":"f91597f4e93e86ed376e9c85c096b59655744b3be842a360497f740dabbad390","engine":"702014290b0f36a9e64e72313f0ceac4b9d72a305625e14b122d02a82742a491","assets":"0ff28f6346c87e80bd0fd56604c6d8be03b833f8ee3837b3e87e010e2979152e"},
];
// Captured official package before adding Xiao Yi (elder) and Xiao Yuanming.
const preHistoricalRelativesSave:ContentLock={"packageId":"official-nsd","digest":"cf4db2af94ed091fe69f17d8ec6d3c742c6cc0947d130f95d5cd4439ff5214b9","engine":"08be3e1d6ae422276750a840673892a74ab7d1dcc397bee317a153afbe7cb300","assets":"3cbb521d22480f1dc61f611bf84eb7d007510edb302790279682d2261fbee4aa"};
function officialSaveCheckpoints(expected:ContentLock,additional:ContentLock[]){
 return expected.packageId==='official-nsd'?[expected,preHistoricalRelativesSave,...preElevenPortraitSaves,preCoreFlowCheckpointSave,preRecommendedCharacterSave,reportedOccupiedSupplySave,preCivilMobilizationSave,prePostwarReturnSave,preCivilBaseSave,preCivilPolitiesSave,preCustodyRecoverySave,phaseOneOfficialSave,phaseTwoOfficialSave,phaseThreeOfficialSave,phaseFourDevelopmentSave,phaseFourOfficialSave,preEraOfficialSave,phaseAOfficialSave,phaseBOfficialSave,phaseCOfficialSave,reportedOfficialDevelopmentSave,phaseDOfficialSave,preHistoricalPortraitSave,preHistoricalHealthSave,preHealthCalibrationSave,preUnarmedHandoverSave,preFourHistoricalPortraitSave,preHonorVisibilitySave,preThirdHistoricalPortraitSave,preHouJingChainSave,preReceptionRecoverySave,preWestSevenPortraitSave,portraitStagingOfficialSave,prePortraitStagingFixSave,preReferenceHudSave,...referenceHudStagingSaves,preHudEdgeCleanupSave,...hudEdgeStagingSaves,...additional.filter(l=>l.packageId==='official-nsd'&&l.assets===expected.assets)]:[];
}
export function officialSaveCompatible(value:unknown,expected:ContentLock,additional:ContentLock[]=[]):boolean {return officialSaveCheckpoints(expected,additional).some(lock=>sameContentLock(value,lock));}
/** Saved launch records contain a digest, not a save header. Only known exact
 * official checkpoints may resolve through this path; custom versions stay exact. */
export function officialSaveDigestCompatible(digest:string,expected:ContentLock,additional:ContentLock[]=[]):boolean {return officialSaveCheckpoints(expected,additional).some(lock=>lock.digest===digest);}
export function assertSaveContent(value:unknown){
 if(value===undefined){if(!allowsLegacyContent())throw new Error('无内容锁的旧档只能由官方内容包恢复。');return;}
 const expected=contentLock();
 if(!expected||!value||typeof value!=='object'||Array.isArray(value))throw new Error('请先加载存档绑定的完整内容包。');
 if(binding?.legacy&&officialSaveCompatible(value,expected,binding.officialSaves))return;
 if(!sameContentLock(value,expected))throw new Error('存档内容包、规则或资产版本不匹配，当前进度未改变。');
}
