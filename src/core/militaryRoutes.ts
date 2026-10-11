import type {World} from './types';
import {canMarchThrough,type Army} from './realm';
import {activeWars} from './wars';
import {warArmySide,warCitySide} from './civilWars';
import {planRoute} from './world';

/** The current hostile city must fall before an autonomous army advances again. */
export function armyAtEnemyCity(w:World,a:Army){return activeWars(w).some(war=>{const side=warArmySide(w,war,a),city=warCitySide(w,war,a.location);return !!side&&!!city&&side!==city;});}
/** Keep the strategic objective; march only as far as the first blocking enemy fort.
 * Diplomatic access is never relaxed, including for third parties and civil wars. */
export function armyAdvanceRoute(w:World,a:Army,target:string){
 if(a.location===target||armyAtEnemyCity(w,a))return null;
 const direct=planRoute(a.location,target,id=>canMarchThrough(w,a.realm,id,target,a));if(direct)return direct;
 const approach=planRoute(a.location,target,id=>canMarchThrough(w,a.realm,id,id,a));if(!approach)return null;
 const fort=approach.route.slice(1).find(id=>!canMarchThrough(w,a.realm,id,target,a));
 return fort?planRoute(a.location,fort,id=>canMarchThrough(w,a.realm,id,fort,a)):null;
}
