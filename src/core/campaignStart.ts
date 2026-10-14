import {advanceAuthoredEvents} from './authoredEvents';
import {newCampaignWorld} from './world';
import {initializeHistoricalStart} from './historicalStart';
import {campaignSetup} from '../data/campaignSetup';
import {characterById} from '../data/characters';
import {candidateReason,clearLocalPerson,countyTerritory,localHolder,setLocalHolder} from './localAdministration';
import {syncRulerHistory} from './rulerHistory';

/** The official new-game path, shared by normal play and isolated previews.
 * Loading a save never calls this; historical armies must not be initialized twice. */
export function createCampaign(characterId?:string,scriptId?:string,mode?:'sandbox'|'tutorial'){
 const world=newCampaignWorld(characterId,scriptId,mode);
 for(const [id,start] of Object.entries(campaignSetup.personStarts)){
  const identity=world.identities?.people[id];if(identity)identity.sex=start.sex;
  if(id===world.characterId){if(start.coins!==undefined)world.people[0].coins=start.coins;if(start.food!==undefined)world.people[0].food=start.food;}
  else if(start.npcCoins!==undefined&&world.relationships)world.relationships.reserves[id]=start.npcCoins;
  if(world.realm&&start.office){
   if(start.office==='none'){clearLocalPerson(world,id);continue;}
   const site=start.office.slice('county:'.length),territory=countyTerritory(site),realm=characterById[id].polity;
   if(localHolder(world,territory,realm)===id)continue;
   const reason=candidateReason(world,territory,id,realm);if(reason)throw new Error(characterById[id].name+'开局任职无效：'+reason);
   clearLocalPerson(world,id);setLocalHolder(world,territory,realm,id);
  }
 }
 if(world.realm&&Object.values(campaignSetup.personStarts).some(s=>s.office))syncRulerHistory(world);
 initializeHistoricalStart(world);
 advanceAuthoredEvents(world);
 return world;
}
