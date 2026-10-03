import {characterById,type HistoricalCharacter} from '../data/characters';
import {relationshipPeople,relationshipPersonById,type RelationshipPerson} from '../data/relationships';
import {familyPeople,familyPersonById,parentLinks,type FamilyPerson,type ParentLink} from '../data/families';
import type {World} from './types';
/** Per-save simulated births; birthDay is relative to this world's scenario start. */
export interface GeneratedPerson {person:RelationshipPerson;character:HistoricalCharacter;birthDay:number;father:string;mother:string}
const generatedPerson=(w:World|null|undefined,id:string)=>w?.generatedPeople&&Object.hasOwn(w.generatedPeople,id)?w.generatedPeople[id]:undefined;
export const getPerson=(w:World|null|undefined,id:string):RelationshipPerson|undefined=>generatedPerson(w,id)?.person??(Object.hasOwn(relationshipPersonById,id)?relationshipPersonById[id]:undefined);
export const allPeople=(w:World|null|undefined):RelationshipPerson[]=>[...relationshipPeople,...Object.values(w?.generatedPeople??{}).map(p=>p.person)];
export function getCharacter(w:World|null|undefined,id:string):HistoricalCharacter|undefined {
 const character=generatedPerson(w,id)?.character??(Object.hasOwn(characterById,id)?characterById[id]:undefined);if(character)return character;
 const p=getPerson(undefined,id);if(!p)return;
 // Existing family-only people become playable with neutral game defaults, not invented historical offices.
 return {id:p.id,name:p.name,family:p.family,polity:p.realm,title:'家族成员',role:'scholar',home:p.home??({liang:'jiankang',east:'ye',west:'changan'} as Record<string,string>)[p.realm]??'jiankang',biography:p.note,sources:p.source?[p.source]:[]};
}
export const allCharacters=(w:World|null|undefined):HistoricalCharacter[]=>Array.from(new Set([...Object.keys(characterById),...allPeople(w).map(p=>p.id)])).map(id=>getCharacter(w,id)!);
export function familyPersonOf(w:World|null|undefined,id:string):FamilyPerson|undefined{const p=generatedPerson(w,id)?.person;return p?{id:p.id,name:p.name,family:p.family,status:'fictional',description:p.note,sources:[]}:Object.hasOwn(familyPersonById,id)?familyPersonById[id]:undefined;}
export function familyMembersOf(w:World|null|undefined,family:string):FamilyPerson[]{return [...familyPeople.filter(p=>p.family===family),...Object.values(w?.generatedPeople??{}).filter(p=>p.person.family===family).map(p=>familyPersonOf(w,p.person.id)!)];}
export function parentLinksOf(w:World|null|undefined):ParentLink[]{return [...parentLinks,...Object.values(w?.generatedPeople??{}).flatMap(p=>[{parent:p.father,child:p.person.id,kind:'父亲' as const,source:{title:'本局出生记录',url:''}},{parent:p.mother,child:p.person.id,kind:'母亲' as const,source:{title:'本局出生记录',url:''}}])];}
export function relativesOf(w:World|null|undefined,id:string,direction:'ancestors'|'descendants'):FamilyPerson[]{const seen=new Set([id]),queue=[id],result:FamilyPerson[]=[],links=parentLinksOf(w);for(let i=0;i<queue.length;i++)for(const link of links){const next=direction==='ancestors'?(link.child===queue[i]?link.parent:null):(link.parent===queue[i]?link.child:null);if(next&&!seen.has(next)){seen.add(next);queue.push(next);const person=familyPersonOf(w,next);if(person)result.push(person);}}return result;}
