import type {World} from './types';
import type {RealmId} from './realm';
import {governanceRules} from './governanceRules';
import {defaultPersonCulture,defaultCountyCulture,type CultureId} from '../data/cultures';
import {armyCommander} from './mobility';
export const personCulture=(w:World|undefined,id:string):CultureId=>w?.identities?.people[id]?.cultureId??defaultPersonCulture(id);
export const countyCulture=(w:World,site:string):CultureId=>w.realm?.cities[site]?.cultureId??defaultCountyCulture(w.realm?.cities[site]?.owner==='frontier');
/** Limited procedural preference. No inherited ability, skin or combat bonus. */
export function culturalAppointment(w:World,r:RealmId,id:string,approver?:string,site?:string){
 const a=personCulture(w,id),b=approver?personCulture(w,approver):'unknown',local=site?countyCulture(w,site):'unknown';
 const difference=a!=='unknown'&&(b!=='unknown'&&a!==b||local!=='unknown'&&a!==local);
 // Approver and local civic environment share one bounded correction, never two penalties.
 return governanceRules(w,r).cultural==='inclusive'||!difference?0:-4;
}
export function organizedCommander(w:World,r:RealmId,id:string){return w.realm?.armies.some(a=>a.realm===r&&a.troops>=100&&(a.owner===id||armyCommander(w,a)===id))??false;}
export function culturalMilitarySupport(w:World,r:RealmId,id:string){
 if(!organizedCommander(w,r,id))return 0;
 const rule=governanceRules(w,r).cultural;
 if(rule==='customs'||Object.values(w.realm!.cities).some(c=>c.owner===r&&c.controller===r&&c.culturalExemption?.leader===id))return 6;
 return w.unrest?.items.some(q=>q.realm===r&&q.demand==='customs'&&q.organizer===id&&q.stage!=='closed')?-6:0;
}
export function culturalPolicyInterest(w:World,r:RealmId,id:string,rule:string){
 const previous=governanceRules(w,r).cultural,military=organizedCommander(w,r,id);
 if(rule===previous)return 0;
 // Benefits follow actual military organization and administrative interests, across cultures.
 if(military)return rule==='customs'?1:previous==='customs'?-1:0;
 const administrator=Object.values(w.realm?.cities??{}).some(c=>c.owner===r&&c.governor===id)||Object.values(w.realm?.governments?.realms[r]?.court?.ministries??{}).includes(id);
 return administrator&&rule==='integration'?.5:0;
}
