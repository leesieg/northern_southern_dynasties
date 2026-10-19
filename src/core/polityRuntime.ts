import {campaignSetup} from '../data/campaignSetup';
import type {World,Polity} from './types';
import type {RealmId} from './realm';
import {polities} from '../data/scenario';
export const initialRealms=['liang','east','west'] as const;
export interface RealmIdentity {origin:typeof initialRealms[number];capital:string;created:number;predecessor:RealmId|null;color?:string;civilWar?:number}
export function worldRealms(w?:World):RealmId[]{const state=w?.realm?.governments?.realms;return state&&typeof state==='object'&&!Array.isArray(state)?Object.keys(state) as RealmId[]:(campaignSetup.politics?.realms.map(r=>r.id)??[...initialRealms]);}
export function realmOrigin(w:World|undefined,r:Polity):typeof initialRealms[number]|'frontier'{return r==='frontier'?'frontier':w?.realm?.identities?.[r]?.origin??campaignSetup.politics?.realms.find(p=>p.id===r)?.template??(initialRealms.includes(r as never)?r as typeof initialRealms[number]:'liang');}
export function polityStyle(w:World|undefined,r:Polity){const style=polities[r]??polities[realmOrigin(w,r)];const color=r==='frontier'?undefined:w?.realm?.identities?.[r]?.color;return color?{...style,color}:w&&provisionalRealm(w,r)?{...style,color:'#ad604d'}:style;}
/** Flag color follows the current government, while historical origin stays unchanged. */
export function realmBanner(w:World|undefined,r:Polity){return w&&provisionalRealm(w,r)?'rebel':realmOrigin(w,r);}
export function isRealmId(r:unknown):r is RealmId{return typeof r==='string'&&(initialRealms.includes(r as never)||/^realm-[1-6]$/.test(r)||/^rebel-[1-9][0-9]{0,8}$/.test(r));}

export function provisionalRealm(w:World,r:Polity){return r!=='frontier'&&w.realm?.identities?.[r]?.civilWar!==undefined&&!w.realm?.annexed?.[r];}
/** Legal title stays with the old court; the military government administers only its own occupied counties. */
export function administrativeRealm(w:World,site:string):Polity {const c=w.realm!.cities[site];return provisionalRealm(w,c.controller)&&w.realm!.identities![c.controller as RealmId]!.predecessor===c.owner?c.controller:c.owner;}
export function permanentRealmCount(w:World){return worldRealms(w).filter(r=>w.realm?.identities?.[r]?.civilWar===undefined).length;}

export function initialPoliticalRealm(r:RealmId){return campaignSetup.politics?.realms.find(p=>p.id===r);}

/** Display metadata only; reserve colors across surviving governments so flags remain stable after peace. */
export function nextCivilColor(w:World,except?:RealmId){
 const palette=['#ad604d','#638878','#866fa3','#aa7c43','#477e93','#9d6176','#9b9447','#598c81','#7e6e50','#6f7fa8','#bd7c65','#7f9b92','#937b9a','#a89470','#578a63','#9e5f55','#8f854f','#617f9b','#b18c94','#729349','#906b7e'];
 const used=new Set(worldRealms(w).filter(r=>r!==except&&!w.realm?.annexed?.[r]).map(r=>(w.realm?.identities?.[r]?.color??(provisionalRealm(w,r)?'#ad604d':polities[r]?.color??polities[realmOrigin(w,r)].color)).toLowerCase()));
 return palette.find(c=>!used.has(c))??palette[0];
}
