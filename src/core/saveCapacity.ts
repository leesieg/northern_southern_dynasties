/** File, local and account saves share a decimal MB limit (UTF-8 bytes). */
export const SAVE_MAX_BYTES=32_000_000;
export function saveSizeError(operation:'读取'|'导入'|'保存'){
 const limit=SAVE_MAX_BYTES/1_000_000;
 return operation==='保存'?`存档超过 ${limit} MB，本次未保存。请导出备份。`:`存档超过 ${limit} MB，无法${operation}。`;
}
/** Count without allocating another copy of a large save; match File.size / TextEncoder. */
export function assertSaveSize(source:string,operation:'读取'|'导入'|'保存'='读取'){
 if(source.length>SAVE_MAX_BYTES)throw new Error(saveSizeError(operation));
 // UTF-8 uses at most three bytes per UTF-16 code unit, including unpaired surrogates.
 if(source.length<=Math.floor(SAVE_MAX_BYTES/3))return;
 let bytes=0;
 for(let i=0;i<source.length;i++){
  const code=source.charCodeAt(i);
  if(code<0x80)bytes++;else if(code<0x800)bytes+=2;
  else if(code>=0xd800&&code<=0xdbff&&i+1<source.length&&source.charCodeAt(i+1)>=0xdc00&&source.charCodeAt(i+1)<=0xdfff){bytes+=4;i++;}
  else bytes+=3;
  if(bytes>SAVE_MAX_BYTES)throw new Error(saveSizeError(operation));
 }
}
