import {newCampaignWorld} from './world';
import {initializeHistoricalStart} from './historicalStart';

/** The official new-game path, shared by normal play and isolated previews.
 * Loading a save never calls this; historical armies must not be initialized twice. */
export function createCampaign(characterId?:string,scriptId?:string,mode?:'sandbox'|'tutorial'){
 const world=newCampaignWorld(characterId,scriptId,mode);
 initializeHistoricalStart(world);
 return world;
}
