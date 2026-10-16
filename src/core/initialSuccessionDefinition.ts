import {politicalId} from './politicalDefinition';
export interface InitialHeirs {ruler:string|null;executive:string|null;dynasty:string|null}
export type InitialSuccession=Record<string,InitialHeirs>;
export function assertInitialSuccession(value:unknown):asserts value is InitialSuccession|null {
 if(value===null)return;if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>9)throw new Error('继承初态无效');
 for(const [r,h] of Object.entries(value as InitialSuccession))if(!politicalId(r)||!h||Object.keys(h).sort().join(',')!=='dynasty,executive,ruler'||['ruler','executive','dynasty'].some(k=>{const v=h[k as keyof InitialHeirs];return v!==null&&(typeof v!=='string'||!v.trim()||v.length>(k==='dynasty'?20:100));})||h.ruler===null&&h.dynasty!==null)throw new Error('继承初态字段无效：'+r);
}
