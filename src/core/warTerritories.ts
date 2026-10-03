import {descendantSites,nodesAtLevel,territoryNodes} from '../data/territorialHierarchy';
import {siteById} from '../data/scenario';
import type {World} from './types';
import type {RealmId} from './realm';
import type {War} from './wars';

export type RegionalWarLevel='prefecture'|'province';
export function regionalWarTerritory(id:string){const n=territoryNodes[id];return n&&(n.level==='prefecture'||n.level==='province')?n:undefined;}
/** A shared administrative node never includes the other states' holdings in a demand. */
export function warTerritorySites(w:World,id:string,owner:RealmId){return regionalWarTerritory(id)?descendantSites(id).filter(site=>w.realm?.cities[site]?.owner===owner):[];}
export function warTerritoryOptions(w:World,owner:RealmId,level:RegionalWarLevel){return nodesAtLevel(level).map(n=>({...n,sites:warTerritorySites(w,n.id,owner)})).filter(n=>n.sites.length);}
export function warObjectiveSites(war:War){return war.territory?.sites??[war.target];}
export function warTargetName(war:War){return war.territory?territoryNodes[war.territory.id]?.name??siteById[war.target].name:siteById[war.target].name;}
export function warDeclarationCost(goal:War['goal']='territory',territory?:string){return goal==='annexation'?120:territory?regionalWarTerritory(territory)?.level==='province'?120:80:40;}
/** A broader region replaces a fully contained goal instead of pricing the same counties twice. */
export function supersedesWarTarget(war:War,id:string,sites:string[],targetSites:string[]){const rank=(t?:string)=>t?regionalWarTerritory(t)?.level==='province'?2:1:0;return !!regionalWarTerritory(id)&&rank(id)>rank(war.territory?.id)&&targetSites.length>0&&targetSites.every(site=>sites.includes(site));}
export function validWarTerritory(war:War){
 if(war.territory===undefined)return true;
 const t=war.territory,n=t&&regionalWarTerritory(t.id);
 return !!n&&!war.civil&&war.goal==='territory'&&Array.isArray(t.sites)&&t.sites.length>0&&new Set(t.sites).size===t.sites.length&&t.sites.includes(war.target)&&t.sites.every(id=>typeof id==='string'&&descendantSites(t.id).includes(id));
}
