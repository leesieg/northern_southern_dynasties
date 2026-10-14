import type {SaveInfo,World} from './types';

/** Persistence is supplied by the host. The simulation must not choose a database or account. */
export interface SimulationStorage {
 prepareStorage():Promise<void>;
 listSaves():Promise<SaveInfo[]>;
 loadWorld(slot?:string):Promise<World|null>;
 saveWorld(world:World,auto?:boolean,backup?:'previous-run'):Promise<number>;
 deleteSave(slot:string):Promise<void>;
}

export function latestSaveInfo(slots:SaveInfo[]):SaveInfo|undefined{
 const ordered=[...slots].sort((a,b)=>b.savedAt-a.savedAt);
 return ordered.find(s=>s.id!=='previous-run')??ordered[0];
}
