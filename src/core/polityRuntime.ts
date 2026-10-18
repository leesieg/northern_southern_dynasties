import {campaignSetup} from '../data/campaignSetup';
import type {World,Polity} from './types';
import type {RealmId} from './realm';
import {polities} from '../data/scenario';
export const initialRealms=['liang','east','west'] as const;
export interface RealmIdentity {origin:typeof initialRealms[number];capital:string;created:number;predecessor:RealmId|null;civilWar?:number}
export function worldRealms(w?:World):RealmId[]{const state=w?.realm?.governments?.realms;return state&&typeof state==='object'&&!Array.isArray(state)?Object.keys(state) as RealmId[]:(campaignSetup.politics?.realms.map(r=>r.id)??[...initialRealms]);}
export function realmOrigin(w:World|undefined,r:Polity):typeof initialRealms[number]|'frontier'{return r==='frontier'?'frontier':w?.realm?.identities?.[r]?.origin??campaignSetup.politics?.realms.find(p=>p.id===r)?.template??(initialRealms.includes(r as never)?r as typeof initialRealms[number]:'liang');}
export function polityStyle(w:World|undefined,r:Polity){return polities[r]??polities[realmOrigin(w,r)];}
export function isRealmId(r:unknown):r is RealmId{return typeof r==='string'&&(initialRealms.includes(r as never)||/^realm-[1-6]$/.test(r)||/^rebel-[1-9][0-9]{0,8}$/.test(r));}

export function provisionalRealm(w:World,r:Polity){return r!=='frontier'&&w.realm?.identities?.[r]?.civilWar!==undefined&&!w.realm?.annexed?.[r];}
/** Legal title stays with the old court; the military government administers only its own occupied counties. */
export function administrativeRealm(w:World,site:string):Polity {const c=w.realm!.cities[site];return provisionalRealm(w,c.controller)&&w.realm!.identities![c.controller as RealmId]!.predecessor===c.owner?c.controller:c.owner;}
export function permanentRealmCount(w:World){return worldRealms(w).filter(r=>w.realm?.identities?.[r]?.civilWar===undefined).length;}

export function initialPoliticalRealm(r:RealmId){return campaignSetup.politics?.realms.find(p=>p.id===r);}
