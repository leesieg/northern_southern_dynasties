import { applyPortraitProfile } from './portraitProfiles';
import { historicalCharacters } from './characters';
import { founderGenome,validGenome,type Genome } from '../core/genetics';
export type PortraitSex='male'|'female';
export type PortraitCulture='southern'|'northern';
export interface CharacterIdentity {sex:PortraitSex;culture:PortraitCulture;genome:Genome}
export interface IdentityState {version:1;people:Record<string,CharacterIdentity>}
export const cultureNames:Record<PortraitCulture,string>={southern:'江南衣冠',northern:'北地衣冠'};
/** Costume direction only: polity is not ethnicity; seeded genomes are invented art parameters. */
export function initialIdentities():IdentityState {
 const people:IdentityState['people']={};
 for(const c of historicalCharacters)people[c.id]={sex:'male',culture:c.polity==='liang'?'southern':'northern',genome:applyPortraitProfile(founderGenome(c.id),c.id)};
 people.fictional={sex:'male',culture:'southern',genome:founderGenome('fictional')};
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
 const ids=Object.keys(initial.people);
 if(Object.keys(s.people).length!==ids.length)return false;
 return ids.every(id=>{if(!Object.hasOwn(s.people,id))return false;const p=s.people[id];return !!p&&!Array.isArray(p)&&['male','female'].includes(p.sex)&&Object.hasOwn(cultureNames,p.culture)&&validGenome(p.genome);});
}
