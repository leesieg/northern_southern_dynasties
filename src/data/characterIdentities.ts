import { applyPortraitProfile } from './portraitProfiles';
import { historicalCharacters } from './characters';
import { founderGenome,validGenome,type Genome } from '../core/genetics';
import {defaultPersonCulture,validCulture,type CultureId} from './cultures';
export type PortraitSex='male'|'female';
export type PortraitCulture='southern'|'northern';
export interface CharacterIdentity {sex:PortraitSex;culture:PortraitCulture;cultureId?:CultureId;genome:Genome}
export interface IdentityState {version:1;people:Record<string,CharacterIdentity>}
export const cultureNames:Record<PortraitCulture,string>={southern:'江南衣冠',northern:'北地衣冠'};
/** Costume direction only: polity is not ethnicity; seeded genomes are invented art parameters. */
export function initialIdentities():IdentityState {
 const people:IdentityState['people']={};
 for(const c of historicalCharacters)people[c.id]={sex:'male',culture:c.polity==='liang'?'southern':'northern',genome:applyPortraitProfile(founderGenome(c.id),c.id)};
 people.fictional={sex:'male',culture:'southern',genome:founderGenome('fictional')};
 for(const [id,p] of Object.entries(people))p.cultureId=defaultPersonCulture(id);
 return {version:1,people};
}
const initial=initialIdentities();
export function initialIdentity(id:string):CharacterIdentity {
 if(!Object.hasOwn(initial.people,id))throw new Error('没有此人物的形象配置');
 return structuredClone(initial.people[id]);
}
export function validIdentities(value:unknown):value is IdentityState {
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const s=value as IdentityState;
 if(s.version!==1||!s.people||typeof s.people!=='object'||Array.isArray(s.people))return false;
 const required=[...historicalCharacters.map(p=>p.id),'fictional'];
 if(!required.every(id=>Object.hasOwn(s.people,id)))return false;
 return Object.entries(s.people).every(([id,p])=>Object.hasOwn(initial.people,id)&&!!p&&!Array.isArray(p)&&['male','female'].includes(p.sex)&&Object.hasOwn(cultureNames,p.culture)&&(p.cultureId===undefined||validCulture(p.cultureId))&&validGenome(p.genome));
}
