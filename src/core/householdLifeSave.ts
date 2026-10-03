import {worldRealms} from './polityRuntime';
import type {World} from './types';
import {getPerson} from './personRegistry';
import {relationshipPersonById} from '../data/relationships';
import {familyById} from '../data/families';
import {siteById} from '../data/scenario';
import {validGenome} from './genetics';
import {isMonthStart} from './calendar';
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const n=(v:unknown,max=1e9):v is number=>Number.isSafeInteger(v)&&Number(v)>=0&&Number(v)<=max;
const str=(v:unknown,max=200):v is string=>typeof v==='string'&&v.length>0&&v.length<=max;
export function validGeneratedPeople(w:World){
 const s=w.generatedPeople;if(s===undefined)return true;
 if(!obj(s)||Object.keys(s).length>2000)return false;
 for(const [id,p] of Object.entries(s)){
  if(!/^born-[1-9][0-9]*$/.test(id)||Object.hasOwn(relationshipPersonById,id)||!obj(p)||!obj(p.person)||!obj(p.character)||!n(p.birthDay,w.day)||!str(p.father)||!str(p.mother)||p.father===p.mother||[p.father,p.mother].includes(id))return false;
  const a=p.person,c=p.character;
  if(a.id!==id||c.id!==id||!str(a.name,40)||c.name!==a.name||!['male','female'].includes(String(a.sex))||a.adult!==false||a.status!=='fictional'||!str(a.note,300)||!str(a.family)||!Object.hasOwn(familyById,a.family)||!str(a.home)||!Object.hasOwn(siteById,a.home)||c.home!==a.home||c.polity!==a.realm||c.family!==a.family||c.role!=='scholar'||c.title!=='家族子弟'||c.biography!==a.note||!Array.isArray(c.sources)||c.sources.length)return false;
  const father=getPerson(w,p.father),mother=getPerson(w,p.mother);
  if(!father||!mother||father.sex!=='male'||mother.sex!=='female'||![father.family,mother.family].includes(a.family)||!worldRealms(w).includes(a.realm))return false;
  for(const parent of [p.father,p.mother])if(s[parent]&&(!n(s[parent].birthDay)||s[parent].birthDay>=p.birthDay))return false;
  if(!w.life?.people[id]||!w.identities?.people[id]||!validGenome(w.identities.people[id].genome)||w.identities.people[id].sex!==a.sex||!Object.hasOwn(w.relationships?.reserves??{},id)||!Object.hasOwn(w.relationships?.maritalBasis??{},id))return false;
 }
 return true;
}
export function validHouseholdLife(w:World){
 const s=w.householdLife;if(s===undefined)return !Object.keys(w.generatedPeople??{}).length;
 const person=(v:unknown)=>str(v)&&!!getPerson(w,v);
 if(!obj(s)||s.version!==1||!n(s.since,w.day)||!n(s.lastMonthly,w.day)||!isMonthStart(s.lastMonthly,w.scriptId)||!n(s.seed,0xffffffff)||!n(s.nextId)||s.nextId<1||!obj(s.plans)||!obj(s.rest)||!obj(s.bills)||!obj(s.milestones)||!Array.isArray(s.pregnancies)||s.pregnancies.length>2000||!Array.isArray(s.moments)||s.moments.length>10000)return false;
 const ids=new Set<number>(),keys=new Set<string>(),mothers=new Set<string>(),children=new Set<string>();
 for(const p of s.pregnancies){
  if(!obj(p)||!n(p.id,s.nextId-1)||!p.id||ids.has(p.id)||!person(p.father)||!person(p.mother)||getPerson(w,p.father)?.sex!=='male'||getPerson(w,p.mother)?.sex!=='female'||!str(p.family)||![getPerson(w,p.father)?.family,getPerson(w,p.mother)?.family].includes(p.family)||!n(p.since,w.day)||p.due!==p.since+270||!['expecting','born','ended'].includes(String(p.status)))return false;ids.add(p.id);
  if(p.status==='born'){const child=typeof p.child==='string'?w.generatedPeople?.[p.child]:null;if(!child||p.child!=='born-'+p.id||children.has(p.child!)||child.father!==p.father||child.mother!==p.mother||child.person.family!==p.family||child.birthDay<p.due)return false;children.add(p.child!);}
  else if(p.child!==null)return false;
  if(p.status==='expecting'){if(mothers.has(p.mother))return false;mothers.add(p.mother);}
 }
 if(Object.keys(w.generatedPeople??{}).some(id=>!children.has(id)))return false;
 for(const e of s.moments){if(!obj(e)||!n(e.id,s.nextId-1)||!e.id||ids.has(e.id)||!str(e.key)||keys.has(e.key)||!['childhood','aspiration','inlaw','bereavement'].includes(String(e.kind))||!person(e.person)||!person(e.actor)||!n(e.created,w.day)||!['pending','resolved'].includes(String(e.status))||(e.status==='pending'?e.choice!==null:!['encourage','discipline','decline'].includes(String(e.choice))))return false;ids.add(e.id);keys.add(e.key);}
 return Object.entries(s.plans).every(([id,p])=>!!w.relationships?.marriages.some(m=>m.id===id)&&obj(p)&&typeof p.trying==='boolean'&&str(p.family)&&Object.hasOwn(familyById,p.family))&&Object.entries(s.rest).every(([id,until])=>person(id)&&n(until,w.day+30))&&Object.entries(s.milestones).every(([id,stage])=>person(id)&&n(stage,2))&&Object.entries(s.bills).every(([id,b])=>person(id)&&obj(b)&&n(b.day,w.day)&&n(b.due,4000)&&n(b.paid,b.due));
}
