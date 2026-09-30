import type {Army} from '../core/realm';
import {siteById} from '../data/scenario';

// Visual scale only; marker targets and the shared model layer use the same anchors.
export const ARMY_MODEL_ZOOM=6.5;
export const ARMY_MODEL_PIXELS=56;
export const armyShowsModel=(zoom:number,enabled:boolean)=>enabled&&zoom>=ARMY_MODEL_ZOOM;
export function armyMapPosition(a:Army){
 let {lon,lat}=siteById[a.location];
 if(a.journey){const j=a.journey,from=siteById[j.route[j.leg]],to=siteById[j.route[j.leg+1]],t=j.elapsed/j.durations[j.leg];lon=from.lon+(to.lon-from.lon)*t;lat=from.lat+(to.lat-from.lat)*t;}
 return {lon,lat};
}
export function armyMapPeers(armies:Army[],a:Army){
 const at=armyMapPosition(a);let peer=0;
 for(const b of armies){if(b===a)break;const other=armyMapPosition(b);if(Math.abs(at.lon-other.lon)<.00001&&Math.abs(at.lat-other.lat)<.00001)peer++;}
 return peer;
}
export const armyModelOffset=(peer:number)=>({x:(peer%3)*104,y:Math.floor(peer/3)*128});
