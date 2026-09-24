import {relationshipPeople,relationshipPersonById} from '../data/relationships';
import {isAlive} from './lifeState';
import type {World} from './types';
export function ensurePersonalInfluence(w:World){if(!w.realm||!w.characterId)return;w.realm.personalInfluence??=Object.fromEntries(relationshipPeople.map(p=>[p.id,p.id===w.characterId?w.realm!.influence:0]));for(const p of relationshipPeople)w.realm.personalInfluence[p.id]??=0;}
export function personInfluence(w:World,id:string){return id===w.characterId?w.realm?.influence??0:w.realm?.personalInfluence?.[id]??0;}
export function awardInfluence(w:World,id:string,amount:number){if(!w.realm||!relationshipPersonById[id])return;ensurePersonalInfluence(w);const value=Math.max(0,Math.min(999,personInfluence(w,id)+amount));w.realm.personalInfluence![id]=value;if(id===w.characterId)w.realm.influence=value;}
export function snapshotInfluence(w:World){ensurePersonalInfluence(w);if(w.realm&&w.characterId)w.realm.personalInfluence![w.characterId]=w.realm.influence;return w.characterId;}
export function restoreInfluence(w:World,previous?:string){if(!w.realm||!w.characterId)return;if(previous!==w.characterId)w.realm.influence=w.realm.personalInfluence?.[w.characterId]??0;else w.realm.personalInfluence![w.characterId]=w.realm.influence;}
export function advancePersonalInfluence(w:World){ensurePersonalInfluence(w);if(!w.realm||w.day%30)return;for(const p of relationshipPeople)if(p.id!==w.characterId&&isAlive(w,p.id))awardInfluence(w,p.id,5);}
