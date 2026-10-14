import type {Operation} from './model';
export const formKey='fynbc-studio-form-v1';
export type SavedForm={format:typeof formKey;revision:number;baseDigest:string;scenarioId:string;operations:Operation[]};
export function encodeForm(form:SavedForm){if(form.operations.length>100)throw new Error('未提交表单超过 100 项，请拆分提交；本页仍保留修改。');const text=JSON.stringify(form);if(new TextEncoder().encode(text).length>1024*1024)throw new Error('未提交表单超过 1 MiB，请拆分后提交；本页仍保留修改。');return text;}
export function decodeForm(text:string):SavedForm{if(new TextEncoder().encode(text).length>1024*1024)throw new Error('暂存表单过大，请导出后人工检查。');const v=JSON.parse(text);if(v?.format!==formKey||!Number.isSafeInteger(v.revision)||typeof v.baseDigest!=='string'||typeof v.scenarioId!=='string'||!Array.isArray(v.operations)||!v.operations.length||v.operations.length>100)throw new Error('暂存表单格式无效，请检查浏览器暂存数据。');return v;}
