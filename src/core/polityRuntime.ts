import {campaignSetup} from '../data/campaignSetup';
import type {World,Polity} from './types';
import type {RealmId} from './realm';
import {polities} from '../data/scenario';
export const initialRealms=['liang','east','west'] as const;
export interface RealmIdentity {origin:typeof initialRealms[number];capital:string;created:number;predecessor:RealmId|null}
export function worldRealms(w?:World):RealmId[]{const state=w?.realm?.governments?.realms;return state&&typeof state==='object'&&!Array.isArray(state)?Object.keys(state) as RealmId[]:(campaignSetup.politics?.realms.map(r=>r.id)??[...initialRealms]);}
export function realmOrigin(w:World|undefined,r:Polity):typeof initialRealms[number]|'frontier'{return r==='frontier'?'frontier':w?.realm?.identities?.[r]?.origin??campaignSetup.politics?.realms.find(p=>p.id===r)?.template??(initialRealms.includes(r as never)?r as typeof initialRealms[number]:'liang');}
export function polityStyle(w:World|undefined,r:Polity){return polities[r]??polities[realmOrigin(w,r)];}
export function isRealmId(r:unknown):r is RealmId{return typeof r==='string'&&(initialRealms.includes(r as never)||/^realm-[1-6]$/.test(r));}

export function initialPoliticalRealm(r:RealmId){return campaignSetup.politics?.realms.find(p=>p.id===r);}
