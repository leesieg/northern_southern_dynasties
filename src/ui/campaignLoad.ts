import {useSyncExternalStore} from 'react';
import type {Request} from '../core/types';
export type CampaignLoadKind='new'|'resume'|'load'|'import';
export interface CampaignLoad {id:string;entry:number;kind:CampaignLoadKind;phase:'world'|'scene'|'revealing';sceneReady:boolean;sceneError:boolean;completed?:number;total?:number}
let current:CampaignLoad|null=null;
const listeners=new Set<()=>void>();
const publish=(next:CampaignLoad|null)=>{current=next;listeners.forEach(fn=>fn());};
const subscribe=(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};};
export const getCampaignLoad=()=>current;
export const useCampaignLoad=()=>useSyncExternalStore(subscribe,getCampaignLoad,()=>null);
export function isCampaignLoad(type:Request['type']):type is CampaignLoadKind{return ['new','resume','load','import'].includes(type);}
export function beginCampaignLoad(id:string,entry:number,kind:CampaignLoadKind){publish({id,entry,kind,phase:'world',sceneReady:false,sceneError:false});}
export function finishCampaignLoad(id:string,ok:boolean){if(current?.id!==id)return;if(!ok||current.sceneError){publish(null);return;}publish({...current,phase:current.sceneReady?'revealing':'scene'});}
export function reportCampaignScene(entry:number,ready:boolean,error:boolean,progress?:{completed:number;total:number}){if(!current||entry!==current.entry)return;const next={...current,sceneReady:ready,sceneError:error,completed:progress?.completed,total:progress?.total};if(current.phase!=='world'){if(error){publish(null);return;}if(ready)next.phase='revealing';}publish(next);}
export function dismissCampaignLoad(id:string){if(current?.id===id)publish(null);}
