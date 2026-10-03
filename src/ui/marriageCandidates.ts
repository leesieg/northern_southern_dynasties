import type {World} from '../core/types';
import {allPeople,getPerson} from '../core/personRegistry';
import {ageAt,ageOf,isAlive} from '../core/lifeState';
import {activeMarriage,closeKin,relationOpinion,spouseOf} from '../core/relationships';
import {personResidence,together} from '../core/residence';
import {allegianceRealm} from '../core/officeEligibility';
import {attributes,traitsFor,traitDefinitions} from '../core/social';
import {familyStanding} from '../core/family';
import {quoteFamilyMarriage,type FamilyMarriageCommand} from '../core/familyMarriage';
import {officeHierarchy} from '../core/offices';
import {retinuePosts} from '../core/retinue';
import {familyById} from '../data/families';
import {siteById} from '../data/scenario';
import {regimeName} from '../core/government';
import {cultureNames} from '../data/cultures';
import {personCulture} from '../core/culture';
import {detained} from '../core/custodyState';

export type MarriageFilters={sex:'opposite'|'all'|'male'|'female';marital:'unmarried'|'all'|'married'|'widowed';adult:boolean;sameRealm:boolean;sameCity:boolean;ready:boolean;minAge:string;maxAge:string};
export type MarriageSort='recommended'|'acceptance'|'ageGap'|'ageAsc'|'ageDesc'|'diplomacy'|'martial'|'stewardship'|'intrigue'|'prestige'|'opinion'|'name';
export const marriageSortNames:Record<MarriageSort,string>={recommended:'可议婚优先',acceptance:'接受度从高到低',ageGap:'年龄相近优先',ageAsc:'年龄从小到大',ageDesc:'年龄从大到小',diplomacy:'外交从高到低',martial:'军事从高到低',stewardship:'管理从高到低',intrigue:'谋略从高到低',prestige:'家族威望从高到低',opinion:'对议婚者好感',name:'姓名'};
export function marriageFilterPreset(preset:'unmarried'|'ready'|'all'):MarriageFilters{return {sex:preset==='all'?'all':'opposite',marital:preset==='all'?'all':'unmarried',adult:preset!=='all',sameRealm:false,sameCity:preset==='ready',ready:preset==='ready',minAge:'',maxAge:''};}
/** Read-only presentation values: typing and sorting never change the world or recalculate every quote. */
export function marriageCandidates(w:World,command:FamilyMarriageCommand){
 const subject=getPerson(w,command.subject),subjectAge=ageAt(w,command.subject),subjectRealm=allegianceRealm(w,command.subject),offices=w.realm?officeHierarchy(w):[];
 const retired=new Set(w.social?.lineage.slice(0,-1).map(p=>p.id));
 return allPeople(w).filter(p=>p.id!==command.subject).map(p=>{
  const age=ageOf(w,p.id),marriage=activeMarriage(w,p.id),realm=allegianceRealm(w,p.id),residence=personResidence(w,p.id),alive=isAlive(w,p.id);
  const familyName=familyById[p.family]?.name??'家支未详',location=siteById[residence.site]?.name??'驻地未详',title=offices.filter(o=>o.active&&o.holder===p.id).map(o=>o.name).filter((name,i,names)=>names.indexOf(name)===i).join('、')||retinuePosts[w.retinue?.members[p.id]?.post as keyof typeof retinuePosts]?.name||'未任官';
  const culture=cultureNames[personCulture(w,p.id)],traits=traitsFor(w,p.id).map(t=>traitDefinitions[t].name);
  let quoteCache:ReturnType<typeof quoteFamilyMarriage>|undefined,statsCache:ReturnType<typeof attributes>|undefined;
  const quote=()=>quoteCache??=quoteFamilyMarriage(w,{...command,target:p.id,family:subject?.family??command.family});
  return {id:p.id,name:p.name,status:p.status,sex:p.sex,age,ageGap:age!==null&&subjectAge!==null?Math.abs(age-subjectAge):null,alive,marital:marriage?'married' as const:w.relationships?.maritalBasis[p.id]==='widowed'?'widowed' as const:'single' as const,spouse:spouseOf(w,p.id),realm,realmName:realm?regimeName(w,realm):'未效忠政权',sameRealm:!!realm&&realm===subjectRealm,residence,location,sameCity:together(w,command.subject,p.id),familyName,title,culture,traits,get stats(){return statsCache??=attributes(w,p.id);},prestige:familyStanding(w,p.id).total,opinion:relationOpinion(w,command.subject,p.id),get quote(){return quote();},get score(){const q=quote();return command.subject===w.characterId?q.right.score:Math.min(q.left.score,q.right.score);},get rank(){return !quote().reason?0:alive&&(age??0)>=18&&p.sex!==subject?.sex&&!marriage&&!closeKin(command.subject,p.id,w)&&!detained(w,p.id)&&!retired.has(p.id)?1:2;},search:[p.name,familyName,title,location,culture,...traits,realm?regimeName(w,realm):''].join(' ').toLocaleLowerCase()};
 });
}
export type MarriageCandidate=ReturnType<typeof marriageCandidates>[number];
export function filterMarriageCandidates(candidates:MarriageCandidate[],subjectSex:'male'|'female'|undefined,filters:MarriageFilters,query:string,sort:MarriageSort){
 const words=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean),min=filters.minAge.trim()?Number(filters.minAge):null,max=filters.maxAge.trim()?Number(filters.maxAge):null;
 const visible=candidates.filter(p=>words.every(word=>p.search.includes(word))&&(filters.sex==='all'||filters.sex==='opposite'&&!!subjectSex&&p.sex!==subjectSex||p.sex===filters.sex)&&(filters.marital==='all'||filters.marital==='unmarried'&&p.marital!=='married'||p.marital===filters.marital)&&(!filters.adult||p.alive&&(p.age??0)>=18)&&(!filters.sameRealm||p.sameRealm)&&(!filters.sameCity||p.sameCity)&&(!filters.ready||!p.quote.reason)&&(min===null||p.age!==null&&p.age>=min)&&(max===null||p.age!==null&&p.age<=max));
 const name=(a:MarriageCandidate,b:MarriageCandidate)=>a.name.localeCompare(b.name,'zh')||a.id.localeCompare(b.id);
 const nullable=(a:number|null,b:number|null,descending=false)=>a===null?(b===null?0:1):b===null?-1:descending?b-a:a-b;
 return visible.sort((a,b)=>{
  const order=sort==='recommended'?a.rank-b.rank||b.score-a.score||Number(b.sameCity)-Number(a.sameCity)||nullable(a.ageGap,b.ageGap):sort==='acceptance'?b.score-a.score:sort==='ageGap'?nullable(a.ageGap,b.ageGap):sort==='ageAsc'||sort==='ageDesc'?nullable(a.age,b.age,sort==='ageDesc'):sort==='prestige'?b.prestige-a.prestige:sort==='opinion'?b.opinion-a.opinion:sort==='name'?0:b.stats[sort]-a.stats[sort];
  return order||name(a,b);
 });
}
