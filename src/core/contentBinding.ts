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
function officialSaveCheckpoints(expected:ContentLock,additional:ContentLock[]){
 return expected.packageId==='official-nsd'?[expected,phaseOneOfficialSave,phaseTwoOfficialSave,phaseThreeOfficialSave,phaseFourDevelopmentSave,phaseFourOfficialSave,preEraOfficialSave,phaseAOfficialSave,phaseBOfficialSave,phaseCOfficialSave,reportedOfficialDevelopmentSave,phaseDOfficialSave,preHistoricalPortraitSave,preHistoricalHealthSave,preHealthCalibrationSave,preUnarmedHandoverSave,preFourHistoricalPortraitSave,preHonorVisibilitySave,preThirdHistoricalPortraitSave,...additional.filter(l=>l.packageId==='official-nsd'&&l.assets===expected.assets)]:[];
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
