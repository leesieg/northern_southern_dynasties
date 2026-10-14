import {DEFAULT_SCRIPT} from '../data/scripts';
import {parseWorld,serializeWorld} from './save';
import {assertSaveSize} from './saveCapacity';
import {latestSaveInfo,type SimulationStorage} from './simulationStorage';
import type {SaveInfo} from './types';

/** A fresh, bounded store per preview. No IndexedDB, account request, or network fallback. */
export function createPreviewStorage():SimulationStorage{
 const records=new Map<string,{info:SaveInfo;data:string}>();
 let clock=0;
 return {
  async prepareStorage(){},
  async listSaves(){return [...records.values()].map(r=>({...r.info})).sort((a,b)=>b.savedAt-a.savedAt);},
  async loadWorld(slot){
   const id=slot??latestSaveInfo([...records.values()].map(r=>r.info))?.id;
   const record=id===undefined?undefined:records.get(id);
   return record?parseWorld(record.data):null;
  },
  async saveWorld(world,auto=false,backup){
   // Serialization can perform legacy migration. Never mutate the caller if validation fails.
   const data=serializeWorld(structuredClone(world));assertSaveSize(data,'保存');
   let id:string=backup??'manual';
   if(auto){
    const slots=['auto-1','auto-2','auto-3'];
    id=slots.find(s=>!records.has(s))??slots.reduce((a,b)=>records.get(a)!.info.savedAt<records.get(b)!.info.savedAt?a:b);
   }
   const savedAt=Math.max(Date.now(),clock+1);clock=savedAt;
   records.set(id,{data,info:{id,savedAt,day:world.day,mode:world.mode,scriptId:world.scriptId??DEFAULT_SCRIPT,characterName:world.people[0].name}});
   return savedAt;
  },
  async deleteSave(slot){
   if(!['manual','previous-run','auto-1','auto-2','auto-3'].includes(slot))throw new Error('无效存档槽位。');
   records.delete(slot);
  },
 };
}
