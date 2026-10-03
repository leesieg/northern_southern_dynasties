import type {World} from '../core/types';
import type {RealmId} from '../core/realm';
import {getPerson} from '../core/personRegistry';
import {ageOf,isAlive} from '../core/lifeState';
import {allegianceRealm} from '../core/officeEligibility';
import {personResidence} from '../core/residence';
import {officeHierarchy} from '../core/offices';
import {governmentOf,politicalName,regimeName} from '../core/government';
import {attributes,traitsFor,traitDefinitions,type Ability} from '../core/social';
import {familyStanding} from '../core/family';
import {personInfluence} from '../core/personalInfluence';
import {retinuePosts} from '../core/retinue';
import {detained} from '../core/custodyState';
import {familyById} from '../data/families';
import {siteById} from '../data/scenario';
import {personCulture} from '../core/culture';
import {cultureNames} from '../data/cultures';
export type PersonOption={id:string;score?:number;metric?:string;detail?:string;reason?:string|null};
export type PersonSelectionContext={realm?:RealmId;site?:string};
export type PersonFilters={available:boolean;sameRealm:boolean;sameSite:boolean;sex:'all'|'male'|'female';office:'all'|'vacant'|'held';minAge:string;maxAge:string;minMerit:string;ability:Ability;minAbility:string};
export type PersonSort='recommended'|'score'|'merit'|'prestige'|'influence'|'diplomacy'|'martial'|'stewardship'|'intrigue'|'ageAsc'|'ageDesc'|'name';
export const personSortNames:Record<PersonSort,string>={recommended:'可用与岗位评价优先',score:'岗位指标从高到低',merit:'功绩从高到低',prestige:'家族威望从高到低',influence:'影响力从高到低',diplomacy:'外交从高到低',martial:'军事从高到低',stewardship:'管理从高到低',intrigue:'谋略从高到低',ageAsc:'年龄从小到大',ageDesc:'年龄从大到小',name:'姓名'};
export function personFilterPreset(name:'all'|'available'|'local'):PersonFilters{return {available:name!=='all',sameRealm:false,sameSite:name==='local',sex:'all',office:'all',minAge:'',maxAge:'',minMerit:'',ability:'stewardship',minAbility:''};}
/** The calling action owns eligibility and its metric; these filters never invent qualifications. */
export function personCandidates(w:World,options:PersonOption[],context:PersonSelectionContext={}){
 const realm=context.realm??(w.characterId?allegianceRealm(w,w.characterId):undefined),site=context.site??w.people[0].location,offices=w.realm?officeHierarchy(w):[],heldByPerson=new Map<string,string[]>();
 for(const office of offices)if(office.active&&office.holder){const held=heldByPerson.get(office.holder)??[];held.push(office.name);heldByPerson.set(office.holder,held);}
 return options.map(option=>{
  const p=getPerson(w,option.id),r=allegianceRealm(w,option.id),g=r?governmentOf(w,r):null,residence=personResidence(w,option.id),held=heldByPerson.get(option.id)??[],post=w.retinue?.members[option.id]?.post,title=[...new Set([...held,...(post?[retinuePosts[post].name]:[])])].join('、')||'未任职';
  const familyName=p?familyById[p.family]?.name??'家支未详':'家支未详',location=siteById[residence.site]?.name??'驻地未详',name=politicalName(option.id,w),culture=cultureNames[personCulture(w,option.id)],traits=traitsFor(w,option.id).map(t=>traitDefinitions[t].name);
  let stats:ReturnType<typeof attributes>|undefined;
  return {...option,name,sex:p?.sex,age:ageOf(w,option.id),alive:isAlive(w,option.id),detained:detained(w,option.id),fictional:p?.status==='fictional',family:p?.family,familyName,title,hasOffice:!!held.length||!!post,realm:r,realmName:r?regimeName(w,r):'未效忠政权',sameRealm:!!r&&r===realm,residence,location,sameSite:!residence.traveling&&residence.site===site,culture,traits,merit:g?g.merit[option.id]??0:null,prestige:familyStanding(w,option.id).total,influence:personInfluence(w,option.id),get stats(){return stats??=attributes(w,option.id);},search:[name,familyName,title,location,culture,...traits,option.detail,option.metric,r?regimeName(w,r):''].filter(Boolean).join(' ').toLocaleLowerCase()};
 });
}
export type PersonCandidate=ReturnType<typeof personCandidates>[number];
export function filterPersonCandidates(candidates:PersonCandidate[],filters:PersonFilters,query:string,sort:PersonSort){
 const words=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean),number=(s:string)=>s.trim()?Number(s):null,min=number(filters.minAge),max=number(filters.maxAge),merit=number(filters.minMerit),ability=number(filters.minAbility);
 const visible=candidates.filter(p=>words.every(word=>p.search.includes(word))&&(!filters.available||!p.reason)&&(!filters.sameRealm||p.sameRealm)&&(!filters.sameSite||p.sameSite)&&(filters.sex==='all'||p.sex===filters.sex)&&(filters.office==='all'||filters.office==='held'&&p.hasOffice||filters.office==='vacant'&&!p.hasOffice)&&(min===null||p.age!==null&&p.age>=min)&&(max===null||p.age!==null&&p.age<=max)&&(merit===null||p.merit!==null&&p.merit>=merit)&&(ability===null||p.stats[filters.ability]>=ability));
 const nullable=(a:number|null|undefined,b:number|null|undefined,descending=false)=>a==null?(b==null?0:1):b==null?-1:descending?b-a:a-b;
 return visible.sort((a,b)=>{
  const order=sort==='recommended'?Number(!!a.reason)-Number(!!b.reason)||nullable(a.score,b.score,true):sort==='score'?nullable(a.score,b.score,true):sort==='merit'?nullable(a.merit,b.merit,true):sort==='ageAsc'||sort==='ageDesc'?nullable(a.age,b.age,sort==='ageDesc'):sort==='prestige'?b.prestige-a.prestige:sort==='influence'?b.influence-a.influence:sort==='name'?0:b.stats[sort]-a.stats[sort];
  return order||a.name.localeCompare(b.name,'zh')||a.id.localeCompare(b.id);
 });
}
