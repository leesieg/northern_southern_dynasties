import {getPerson,allPeople,familyPersonOf} from './personRegistry';
import {families} from '../data/families';

import {familyPrestige} from './family';
import {isAlive,ageAt} from './lifeState';
import {allegianceRealm} from './officeEligibility';
import type {RealmId} from './realm';
import type {World} from './types';
/** Game standing, not a claim about historical gentry status. Ties share rank. */
export const CLAN_PRESTIGE_MIN=100;
/** Game headship: living adults first, then seniority; ties use contribution and stable ID. */
export function clanHead(w:World,family:string){
 const adult=(id:string)=>(ageAt(w,id)??( getPerson(w,id)!.adult?18:0))>=16;
 return allPeople(w).filter(p=>p.family===family&&isAlive(w,p.id)).sort((a,b)=>Number(adult(b.id))-Number(adult(a.id))||(ageAt(w,b.id)??-1)-(ageAt(w,a.id)??-1)||(w.families?.prestige[b.id]??0)-(w.families?.prestige[a.id]??0)||a.id.localeCompare(b.id))[0];
}
function realmFamilyMembers(w:World,realm:RealmId){const people= allPeople(w).filter(p=>allegianceRealm(w,p.id)===realm);return families.map(f=>({family:f,members:people.filter(p=>p.family===f.id)})).filter(row=>row.members.length);}
export function realmClans(w:World,realm:RealmId){
 const rows=realmFamilyMembers(w,realm).map(row=>({family:row.family,members:row.members.filter(p=>isAlive(w,p.id)),prestige:familyPrestige(w,row.family.id)})).filter(f=>f.members.length).sort((a,b)=>b.prestige-a.prestige||a.family.id.localeCompare(b.family.id));
 return rows.map(row=>{const rank=1+rows.filter(other=>other.prestige>row.prestige).length,elite=rank<=3&&row.prestige>=CLAN_PRESTIGE_MIN;return {...row,rank,elite,marriage:elite?(4-rank)*5:0,petition:elite?(4-rank)*4:0,merit:elite?(4-rank)*2:0};});
}
export function clanStanding(w:World,id:string){const p= getPerson(w,id)!,family=p?.family?? familyPersonOf(w,id)?.family;if(!p)return;const realm=allegianceRealm(w,id);if(!realm)return;const rows=realmFamilyMembers(w,realm),row=rows.find(row=>row.family.id===family);if(!row)return;const members=row.members.filter(m=>isAlive(w,m.id));if(!members.length)return;const prestige=familyPrestige(w,row.family.id),rank=1+rows.filter(other=>familyPrestige(w,other.family.id)>prestige&&other.members.some(m=>isAlive(w,m.id))).length,elite=rank<=3&&prestige>=CLAN_PRESTIGE_MIN;return {...row,members,prestige,rank,elite,marriage:elite?(4-rank)*5:0,petition:elite?(4-rank)*4:0,merit:elite?(4-rank)*2:0};}
export function marriageClanBonus(w:World,a:string,b:string){return Math.floor(((clanStanding(w,a)?.petition??0)+(clanStanding(w,b)?.petition??0))/2);}
