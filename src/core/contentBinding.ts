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
/** Explicit bridges for verified official checkpoints b5824cf and f903c2c.
 * Custom package locks and unknown official revisions stay exact. */
const phaseOneOfficialSave={packageId:'official-nsd',digest:'91103302f26eadcebffb7a130caed62f3d033a092a51761c896db24e3be57ed0',engine:'7c1c015f206ad03ed4f6f0423a96c995db30423d938105a08970ded8e17bbf06',assets:'164152f982d7f60a5ff95e9af445f8c0f296b398cdaa00df71707dd3392a2c0d'};
export const phaseTwoOfficialSave={packageId:'official-nsd',digest:'b3544f6a6fc91104ffc8f017c1f1188db92ca35c41d6441618edac7d84f32e73',engine:'bafe57dff1b989055c8eaab727b5f333ec9670c9036cbe01628221ab2feb928b',assets:'164152f982d7f60a5ff95e9af445f8c0f296b398cdaa00df71707dd3392a2c0d'};
export const phaseThreeOfficialSave={packageId:'official-nsd',digest:'ffed10191b16f837f0fbd14cbe594f83b90b6e7e721af17f5340cc5a980445d1',engine:'4bcf58a3af5856a5e5feb950940cc56960e4d891d0a706d0b3daf03b80e76f24',assets:'164152f982d7f60a5ff95e9af445f8c0f296b398cdaa00df71707dd3392a2c0d'};
export function assertSaveContent(value:unknown){
 if(value===undefined){if(!allowsLegacyContent())throw new Error('无内容锁的旧档只能由官方内容包恢复。');return;}
 const expected=contentLock();
 if(!expected||!value||typeof value!=='object'||Array.isArray(value))throw new Error('请先加载存档绑定的完整内容包。');
 const actual=value as Record<string,unknown>;
 if(binding?.legacy&&expected.packageId==='official-nsd'&&Object.keys(actual).length===4&&[phaseOneOfficialSave,phaseTwoOfficialSave,phaseThreeOfficialSave].some(lock=>Object.entries(lock).every(([key,value])=>actual[key]===value)))return;
 if(Object.keys(expected).some(key=>actual[key]!==expected[key as keyof ContentLock])||Object.keys(actual).length!==4)throw new Error('存档内容包、规则或资产版本不匹配，当前进度未改变。');
}
