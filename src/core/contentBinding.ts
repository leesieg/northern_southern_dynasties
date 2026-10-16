/** One immutable content binding per module realm. A host must create a fresh
 * Worker/module graph before binding another package; never switch a running world. */
export interface ContentLock {packageId:string;digest:string;engine:string;assets:string}
export type ContentTables=Record<string,Record<string,unknown>>;
let binding:{lock:ContentLock;tables:ContentTables;legacy:boolean}|undefined;
const builtins:ContentTables={};

export function freezeContent<T>(value:T):T {
 if(value&&typeof value==='object'){
  for(const child of Object.values(value))freezeContent(child);
  Object.freeze(value);
 }
 return value;
}
export function bindContent(lock:ContentLock,tables:ContentTables,legacy=false){
 if(binding||Object.keys(builtins).length)throw new Error('内容只能在规则加载前绑定一次；请创建新的模拟实例。');
 binding=freezeContent({lock:structuredClone(lock),tables:structuredClone(tables),legacy});
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
export function assertSaveContent(value:unknown){
 if(value===undefined){if(!allowsLegacyContent())throw new Error('无内容锁的旧档只能由官方内容包恢复。');return;}
 const expected=contentLock();
 if(!expected||!value||typeof value!=='object'||Array.isArray(value))throw new Error('请先加载存档绑定的完整内容包。');
 const actual=value as Record<string,unknown>;
 if(binding?.legacy&&expected.packageId==='official-nsd'&&Object.keys(actual).length===4&&[phaseOneOfficialSave,phaseTwoOfficialSave,phaseThreeOfficialSave,phaseFourDevelopmentSave,phaseFourOfficialSave,preEraOfficialSave,phaseAOfficialSave,phaseBOfficialSave].some(lock=>Object.entries(lock).every(([key,value])=>actual[key]===value)))return;
 if(Object.keys(expected).some(key=>actual[key]!==expected[key as keyof ContentLock])||Object.keys(actual).length!==4)throw new Error('存档内容包、规则或资产版本不匹配，当前进度未改变。');
}
