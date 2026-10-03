import {getCharacter,getPerson,allPeople} from './personRegistry';
import {detained} from './custodyState';


import {isAlive} from './lifeState';
import type {World,Person} from './types';
export function personResidence(w:World,id:string){
 if(id===w.characterId||id==='player'||id==='fictional'&&!w.characterId)return {site:w.people[0].location,traveling:!!w.people[0].journey};
 const simulated=w.people.find(p=>p.id===id);if(simulated)return {site:simulated.location,traveling:!!simulated.journey};
 const saved=w.mobility?.residences[id];if(saved)return {site:saved.site,traveling:!!saved.journey};
 const c= getCharacter(w,id)!;return {site:c?.home?? getPerson(w,id)?.home??({liang:'jiankang',east:'ye',west:'changan'})[ getPerson(w,id)?.realm as 'liang'|'east'|'west']??w.people[0].home,traveling:false};
}
export function presentAt(w:World,id:string,site:string){const p=personResidence(w,id);return isAlive(w,id)&&!detained(w,id)&&!p.traveling&&p.site===site;}
export function together(w:World,a:string,b:string){const p=personResidence(w,a);return !p.traveling&&presentAt(w,b,p.site);}

export function mapTravelers(w:World):Person[]{return [...w.people,... allPeople(w).filter(p=>p.id!==w.characterId).map(p=>{const at=personResidence(w,p.id);return {id:p.id,name:p.name,location:at.site,home:at.site,coins:0,food:0,journey:isAlive(w,p.id)?w.mobility?.residences[p.id]?.journey??null:null,itinerary:[],itineraryIndex:0};})];}
