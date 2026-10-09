import {personCulture} from '../core/culture';
import {armyCommander} from '../core/mobility';
import {portraitRank} from './portraitRank';
import {expandedPersonById} from '../data/expandedPeople';
import {ageOf,ageAt,lifeOf} from '../core/lifeState';
import type {PortraitLife} from './portraitLife';
import { portraitProfiles,applyPortraitProfile } from '../data/portraitProfiles';
import { characterById,historicalCharacters } from '../data/characters';
import { initialIdentity,type CharacterIdentity } from '../data/characterIdentities';
import { defaultTraits,type Trait } from '../core/social';
import { expressGenome } from '../core/genetics';
import { founderGenome } from '../core/genetics';
import { relationshipPersonById } from '../data/relationships';
import type { World } from '../core/types';
export type PortraitOffice='civilian'|'governor'|'commander'|'ruler';
export const officeNames:Record<PortraitOffice,string>={civilian:'常服',governor:'治事官服',commander:'军旅甲胄',ruler:'君主礼服'};
export interface PortraitContext {life?:PortraitLife;identity:CharacterIdentity;office:PortraitOffice;traits:Trait[];stress:number;maturity?:number;beard?:'none'|'short'|'long';headwear?:'tall-cap'}
export function portraitContext(id:string,world?:World):PortraitContext {
 const c=characterById[id],extra=relationshipPersonById[id];
 const fallback=():CharacterIdentity=>historicalCharacters.some(p=>p.id===id)||id==='fictional'?initialIdentity(id):{sex:extra?.sex??'male',culture:extra?.realm==='liang'?'southern':'northern',genome:founderGenome(id)};
 const stored=world?.identities?.people[id]??fallback(),identity=stored.genome.facial?stored:{...stored,genome:applyPortraitProfile({...stored.genome,facial:fallback().genome.facial},id)};
 let office:PortraitOffice=c?.role==='ruler'?'ruler':(c?.role??expandedPersonById[id]?.role)==='commander'?'commander':c?.role==='regent'?'governor':'civilian';
 const retired=world?.social?.lineage.slice(0,-1).some(p=>p.id===id);
 // Reuse active offices (including historical central seats) and the frame's
 // precedence: a regent's army ownership must not replace their court dress.
 if(world?.realm?.governments){
  const rank=portraitRank(id,world),executive=Object.values(world.realm.governments.realms).some(g=>g.executives.includes(id));
  office=rank==='sovereign'?'ruler':rank==='official'&&executive?'governor':rank==='commander'||world.realm.armies.some(a=>armyCommander(world,a)===id)?'commander':rank==='official'?'governor':'civilian';
 }
 if(retired)office='civilian';
 else if(office==='civilian'&&world?.realm&&!world.realm.governments&&(Object.values(world.realm.cities).some(city=>city.governor===id)||Object.values(world.realm.local?.seats??{}).some(seat=>seat.holder===id)))office='governor';
 const age=ageOf(world,id),life=lifeOf(world,id);
 return {life:age===null?undefined:{age,baselineAge:ageAt(undefined,id)??0,sickness:life?.illness?.severity??0,deceased:!!life?.death,beard:identity.sex==='male'&&!!portraitProfiles[id]?.beard&&portraitProfiles[id].beard!=='none'},identity:{...identity,cultureId:personCulture(world,id)},office,headwear:portraitProfiles[id]?.headwear,maturity:age===null?portraitProfiles[id]?.maturity??.35:Math.max(0,Math.min(1,(age-12)/75)),beard:portraitProfiles[id]?.beard??'none',traits:world?.social?.traits[id]??defaultTraits(id),stress:world?.characterId===id?world.social?.stress??0:0};
}
export function composePortrait(context:PortraitContext){
 const phenotype=expressGenome(context.identity.genome),northern=context.identity.culture==='northern';
 return {phenotype,headwear:context.office==='ruler'?context.headwear:undefined,sex:context.identity.sex,northern,office:context.office,maturity:context.maturity??.35,beard:context.identity.sex==='female'?'none':context.beard??'none',
  insignia:context.office==='ruler'?'seal':context.office==='governor'?'jade':null,
  ornament:context.traits.includes('diligent')?'scroll':context.traits.includes('generous')?'pouch':context.traits.includes('steadfast')?'knot':null,
  mood:context.stress>=80?'tense':context.traits.includes('wary')?'reserved':'calm'} as const;
}
