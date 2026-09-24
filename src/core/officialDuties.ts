import {localHasJurisdiction,localHolder,countyTerritory} from './localAdministration';
import {allegianceRealm} from './officeEligibility';
import {governmentOf} from './government';
import {courtEnabled} from './court';
import type {MinistryId} from '../data/court';
import type {AssignmentKind} from '../data/assignments';
import type {World} from './types';
export const civicBuildings={marketworks:'market',granaryworks:'granary',hostelworks:'hostel'} as const;
export const dutyMinistries:Partial<Record<AssignmentKind,MinistryId[]>>={marketworks:['secretariat','finance'],granaryworks:['secretariat','finance'],hostelworks:['secretariat','finance'],greatworks:['secretariat'],recruitment:['military','personnel'],taxation:['finance','censorate']};
export function isSovereign(w:World,id=w.characterId!){const r=allegianceRealm(w,id);return !!r&&governmentOf(w,r)?.ruler===id;}
export function centralMinistry(w:World,id:string){const r=allegianceRealm(w,id);if(!r||!courtEnabled(w,r))return null;const ministries=governmentOf(w,r)?.court?.ministries;return (Object.entries(ministries??{}).find(([,holder])=>holder===id)?.[0] as MinistryId|undefined)??null;}
export function officialDutyReason(w:World,id:string,kind:AssignmentKind,site?:string){const r=allegianceRealm(w,id);if(site&&r&&w.realm?.cities[site]?.owner===r&&w.realm.cities[site].controller===r&&(localHasJurisdiction(w,id,countyTerritory(site),r)||kind!=='greatworks'&&localHolder(w,countyTerritory(site),r)===id))return '';const required=dutyMinistries[kind];if(!required)return '';const ministry=centralMinistry(w,id);return ministry&&required.includes(ministry)?'':'须由具备对应中央职掌的官员承办';}
