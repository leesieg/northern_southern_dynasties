import type {GameCommand,World} from './types';
/** A session sequence is a persistent high-water mark: pruned payloads cannot replay. */
export interface RequestReceipts {sessions:Record<string,{sequence:number;command:string}>}
export interface CommandKey {session:string;sequence:number}
export function commandReceived(w:World,key:CommandKey|undefined,c:GameCommand){
 if(!key)return false;
 if(['__proto__','constructor','prototype'].includes(key.session)||!/^[\w-]{8,80}$/.test(key.session)||!Number.isSafeInteger(key.sequence)||key.sequence<1)throw new Error('无效操作编号');
 const previous=w.requestReceipts?.sessions[key.session];
 if(previous&&key.sequence===previous.sequence&&previous.command!==JSON.stringify(c))throw new Error('操作编号已用于另一项命令');
 if(previous&&key.sequence<=previous.sequence)return true;
 if(!previous&&Object.keys(w.requestReceipts?.sessions??{}).length>=4096)throw new Error('操作会话已达上限，请导出存档并联系维护');
 return false;
}
export function recordCommand(w:World,key:CommandKey|undefined,c:GameCommand){if(key)(w.requestReceipts??={sessions:{}}).sessions[key.session]={sequence:key.sequence,command:JSON.stringify(c)};}
export function validRequestReceipts(w:World){const s=w.requestReceipts;if(s===undefined)return true;return !!s&&!!s.sessions&&typeof s.sessions==='object'&&!Array.isArray(s.sessions)&&Object.keys(s.sessions).length<=4096&&Object.entries(s.sessions).every(([key,v])=>!['__proto__','constructor','prototype'].includes(key)&&/^[\w-]{8,80}$/.test(key)&&v&&Number.isSafeInteger(v.sequence)&&v.sequence>0&&typeof v.command==='string'&&v.command.length<=10000);}
