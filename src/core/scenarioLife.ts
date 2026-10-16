import {presenceAtStart} from './scenarioLifeDefinition';
import {campaignSetup} from '../data/campaignSetup';
import {birthRecords} from '../data/lifespans';
import {getScript} from '../data/scripts';
/** Absence is fixed for this authored start; passing a birth year does not fabricate a birth. */
export function initialPresence(id:string){return presenceAtStart(campaignSetup.life??null,birthRecords,getScript().year,id);}
