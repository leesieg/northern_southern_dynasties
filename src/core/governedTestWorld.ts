// Explicit fixture for existing tests of an already-appointed local governor.
// New-game appointment coverage uses newCampaignWorld directly.
import {newCampaignWorld} from './world';
import {setLocalHolder,countyTerritory} from './localAdministration';
import {syncLocalHistory} from './rulerHistory';
import {playerRealm} from './realm';
export function newGovernedCampaignWorld(...args:Parameters<typeof newCampaignWorld>){const w=newCampaignWorld(...args);if(w.realm)setLocalHolder(w,countyTerritory(w.people[0].home),playerRealm(w),w.characterId!);syncLocalHistory(w);return w;}
