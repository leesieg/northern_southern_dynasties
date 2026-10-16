import {DEFAULT_SCRIPT,getScript} from '../data/scripts';
import {dateLabel} from './world';
import {parseWorld,serializeWorld} from './save';
import {contentLock} from './contentBinding';
import {readSaveFile,writeSaveFile} from '../persistence/saveFiles';
import type {World} from './types';
export {prepareStorage,listSaves,deleteSave,latestSaveInfo,storageScope} from '../persistence/saveFiles';
export async function saveWorld(world:World,auto=false,backup?:'previous-run'){
 const scriptId=world.scriptId??DEFAULT_SCRIPT;
 return writeSaveFile(serializeWorld(world),{day:world.day,mode:world.mode,scriptId,scriptName:getScript(scriptId).name,date:dateLabel(world.day,scriptId),characterName:world.people[0].name,content:contentLock()},auto,backup);
}
export async function loadWorld(slot?:string):Promise<World|null>{const text=await readSaveFile(slot);return text===null?null:parseWorld(text);}
