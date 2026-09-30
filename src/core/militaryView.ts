import type {World} from './types';
import type {Army} from './realm';
import {authorityGrant} from './authority';
import {playerRealm} from './realm';
/** Commands and confidential figures share the same current authority, never the legacy mandate. */
export function militaryArmyView(w:World,a:Army){
 const id=w.characterId,scope={realm:a.realm,site:a.location,army:a},grant=id?authorityGrant(w,id,'command',scope):null,inspect=!!id&&authorityGrant(w,id,'inspect',scope).allowed,exact=!!grant?.allowed||inspect;
 const intel=w.realm?w.militaryAftermath?.intel[playerRealm(w)+'|'+a.location]:undefined,estimate=intel&&w.day-intel.day<30?`区域情报 ${intel.min}–${intel.max}`:'兵力未详';
 return {command:!!grant?.allowed,exact,source:grant?.allowed?grant.source:inspect?'军事监察':'公开军旗',strength:exact?String(a.troops):estimate};
}
