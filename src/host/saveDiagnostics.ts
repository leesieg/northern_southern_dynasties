import {listSaves,readSaveFile} from '../persistence/saveFiles';
import {getContentContext} from './contentContext';
export async function saveDiagnostics(){const records=[];for(const slot of await listSaves()){const text=await readSaveFile(slot.id);try{const e=text?JSON.parse(text):{};records.push({slot:slot.id,day:slot.day,savedAt:slot.savedAt,scriptId:slot.scriptId,content:e.content??null});}catch{records.push({slot:slot.id,error:'存档头无法读取'});}}return {origin:location.origin,expected:getContentContext().content.digest,records};}
export async function copySaveDiagnostics(){await navigator.clipboard.writeText(JSON.stringify(await saveDiagnostics(),null,2));}
