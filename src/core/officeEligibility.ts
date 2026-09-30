import {worldRealms} from './polityRuntime';
import {detained} from './custodyState';
import {survivingRealm} from './polityLifecycle';
import {clearLocalPerson} from './localAdministration';
import {acceptance} from './social';
import {relationshipPeople,relationshipPersonById} from '../data/relationships';
import {characterById} from '../data/characters';
import {ageAt,isAlive} from './lifeState';
import {governmentOf,governingExecutives} from './government';
import {presentAt} from './residence';
import type {RealmId} from './realm';
import type {World} from './types';
export function allegianceRealm(w:World,id:string,seen=new Set<string>()):RealmId|undefined {if(seen.has(id))return w.relationships?.allegiances?.[id]?.realm??relationshipPersonById[id]?.realm;seen.add(id);const lord=w.relationships?.oaths[id]?.lord??w.retinue?.members[id]?.host;const original=lord?allegianceRealm(w,lord,seen):w.relationships?.allegiances?.[id]?.realm??relationshipPersonById[id]?.realm;return original?survivingRealm(w,original):undefined;}
export const officeName=(id:string)=>relationshipPersonById[id]?.name??characterById[id]?.name??id;
export const officeCandidates=(w:World,r:RealmId)=>relationshipPeople.filter(p=>allegianceRealm(w,p.id)===r);
export function publicOfficeReason(w:World,id:string){
 if(!relationshipPersonById[id])return '尚未登场的人物';if(!isAlive(w,id))return '不能任命已故人物';if((ageAt(w,id)??(relationshipPersonById[id].adult?18:0))<16)return '须成年后任官';
 if(w.diplomacy?.missions.some(m=>m.envoy===id))return '须先完成使团使命与返程';
 if(detained(w,id))return '被拘禁期间不能赴任';
 if(w.militaryCampaigns?.items.some(q=>q.status==='active'&&q.commander===id))return '须先交接战役委任';
 if(w.retinue?.members[id])return '须先解除幕府职务';
 if(w.realm?.offices.some(o=>o.candidate===id))return '已有任命在途';
 if((Object.values(w.mobility?.commanders??{}).includes(id)||Object.values(w.mobility?.armyCommanders??{}).includes(id)||Object.values(w.mobility?.pendingCommanders??{}).some(v=>v.person===id))||w.service?.tasks.some(t=>t.phase!=='closed'&&(t.officer===id||t.helper===id))||w.mobility?.activities.some(a=>!['done','cancelled'].includes(a.phase)&&(a.actor===id||a.delegate===id)))return '须先交接正在执行的军务或差事';
 return '';
}
export function appointmentAuthorityReason(w:World,r:RealmId){const g=governmentOf(w,r)!;if(governingExecutives(w,r).includes(w.characterId!))return '';if(g.ruler===w.characterId){const executive=governingExecutives(w,r)[0];return executive&&acceptance(w,executive).reduce((n,p)=>n+p.value,0)>=60?'':'任命权受实际执政者制约：需执政者接受度 60，或先争取亲政';}return '任命权掌握在本政权实际执政者手中';}
export function officerPresent(w:World,id:string,site:string){return presentAt(w,id,site);}

export function reconcileOfficeAllegiance(w:World){if(!w.realm)return;if(w.social?.advisor&&allegianceRealm(w,w.social.advisor)!==allegianceRealm(w,w.characterId!))w.social.advisor=null;for(const [key,seat] of Object.entries(w.realm.local?.seats??{}))if(seat.holder&&allegianceRealm(w,seat.holder)!==key.split('|')[0])clearLocalPerson(w,seat.holder);for(const c of Object.values(w.realm.cities))if(c.governor&&allegianceRealm(w,c.governor)!==c.owner)c.governor=null;for(const r of worldRealms(w)){const g=governmentOf(w,r);if(g?.court)for(const m of Object.keys(g.court.ministries) as (keyof typeof g.court.ministries)[]){const id=g.court.ministries[m];if(id&&allegianceRealm(w,id)!==r)g.court.ministries[m]=null;}}w.holdings.governedCities=Object.entries(w.realm.cities).filter(([,c])=>c.governor===w.characterId&&c.controller===allegianceRealm(w,w.characterId!)).map(([id])=>id);}
