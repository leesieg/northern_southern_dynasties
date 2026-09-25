import { characterById,historicalCharacters,characterRelations } from '../data/characters';
import { defaultTraits,heirs,houseMembers,kin,newSocial,traitsFor } from './social';
import type { World } from './types';
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const int=(v:unknown,a:number,b:number)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=a&&v<=b;
export function validSocial(w:World):boolean {
 const s=w.social;if(s===undefined)return true;
 if(!obj(s)||!w.characterId||s.version!==1||typeof s.founder!=='string'||!Object.hasOwn(characterById,s.founder))return false;
 if(!int(s.stress,0,100)||!int(s.renown,0,999)||!int(s.seed,0,4294967295))return false;
 const base=newSocial(s.founder);
 if(!obj(s.traits)||Object.entries(s.traits).some(([id,traits])=>!characterById[id]||JSON.stringify(traits)!==JSON.stringify(defaultTraits(id)))||historicalCharacters.some(c=>JSON.stringify(s.traits[c.id])!==JSON.stringify(defaultTraits(c.id))))return false;
 for(const field of ['opinions','hooks'] as const){if(!obj(s[field])||Object.entries(s[field]).some(([key,n])=>{const ids=key.split('|');return ids.length!==2||ids[0]===ids[1]||ids.some(id=>!characterById[id])||!int(n,field==='opinions'?-100:0,field==='opinions'?100:3);}))return false;for(const key of Object.keys(base[field]))if(!int(s[field][key],field==='opinions'?-100:0,field==='opinions'?100:3))return false;}
 if(!obj(s.legacies)||Object.keys(s.legacies).length!==3||Object.keys(base.legacies).some(k=>!int(s.legacies[k as keyof typeof s.legacies],0,2)))return false;
 const members=new Set(houseMembers(s.founder).map(c=>c.id));
 if(!Array.isArray(s.lineage)||!s.lineage.length||s.lineage.length>members.size)return false;
 const seen=new Set<string>();let previous:string|undefined,lastDay=0;
 for(const p of s.lineage){if(!obj(p)||typeof p.id!=='string'||!members.has(p.id)||seen.has(p.id)||!int(p.day,lastDay,w.day))return false;if(previous&&(!kin(previous,p.id)||characterRelations.some(r=>r.kind==='父子'&&r.from===p.id&&r.to===previous)))return false;seen.add(p.id);previous=p.id;lastDay=p.day;}
 if(s.lineage[0].id!==s.founder||s.lineage[0].day!==0||previous!==w.characterId)return false;
 const target=(id:unknown):id is string=>typeof id==='string'&&Object.hasOwn(characterById,id)&&id!==w.characterId&&!s.lineage.slice(0,-1).some(p=>p.id===id);
 if(s.heir!==null&&!heirs(w).some(c=>c.id===s.heir))return false;
 if(s.advisor!==null&&(!target(s.advisor)||characterById[s.advisor].polity!==characterById[w.characterId].polity))return false;
 if(!obj(s.cooldowns))return false;
 for(const [key,value] of Object.entries(s.cooldowns)){const parts=key.split('|');if(!Object.hasOwn(characterById,parts[0])||!int(value,0,w.day+30))return false;if(parts.length===2){if(parts[1]!=='rest')return false;}else if(parts.length!==3||!Object.hasOwn(characterById,parts[1])||parts[0]===parts[1]||!['gift','aid','pressure'].includes(parts[2]))return false;}
 if(s.scheme!==null){const p=s.scheme;if(!obj(p)||!target(p.target)||!int(p.started,0,w.day)||!int(p.due,w.day+1,w.day+18)||p.due!==p.started+(traitsFor(w).includes('wary')?18:14)||!int(p.chance,5,95))return false;}
 return true;
}
