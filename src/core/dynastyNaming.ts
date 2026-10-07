import {getPerson,getCharacter} from './personRegistry';
import {administration} from '../data/administration';

import {canonicalDynastyName,dynastyNames,successionDefinitions} from '../data/governments';

import {siteById} from '../data/scenario';
import {validDynastyName} from './courtSave';
import {governmentOf,regimeName} from './government';
import {worldRealms} from './polityRuntime';
import {capital,type RealmId} from './realm';
import type {World} from './types';
import {nobleTitle} from './nobility';

export interface DynastyNameOption {name:string;reason:string}
// Display qualifiers distinguish historical regimes, but do not make a reused
// underlying name into a new dynasty (e.g. 魏 / 东魏 / 西魏).
const nameIdentity=(name:string)=>canonicalDynastyName(name).replace(/^[东西]魏$/u,'魏');

/** Read-only suggestions: recorded family precedent, recorded title, then held territory. */
export function dynastyNameOptions(w:World,r:RealmId,founder:string):DynastyNameOption[]{
 const person= getPerson(w,founder)!;
 if(!person||!w.realm?.governments?.realms[r])return [];
 const unavailable=new Set([
  ...worldRealms(w).filter(id=>!w.realm!.annexed?.[id]).map(id=>regimeName(w,id)),
  ...w.realm.governments.regimes.filter(v=>v.realm===r).map(v=>v.name??dynastyNames[v.dynasty as keyof typeof dynastyNames]??''),
 ].map(nameIdentity));
 const options:DynastyNameOption[]=[];
 const add=(name:string|undefined,reason:string)=>{
  if(!validDynastyName(name)||unavailable.has(nameIdentity(name)))return;
  unavailable.add(nameIdentity(name));options.push({name,reason});
 };
 // Resolve references at call time: data/core imports already contain cycles.
 const noble=nobleTitle(w,founder,r);if(noble&&['king','stateDuke','commanderyDuke'].includes(noble.rank))add(noble.name,'本局实际王公封号择取；爵位不代表领土。');
 for(const d of Object.values(successionDefinitions))if(d.nextDynasty&&person.family===getPerson(w,d.ruler)?.family){
  add(dynastyNames[d.nextDynasty],person.name+'家系的历史国号参照；仅择号，不触发历史更替。');
 }
 for(const title of ( getCharacter(w,founder)?.title??'').split(/[·，、]/u)){
  const seal=title.trim().match(/^(\p{Script=Han}{1,4}?)(?:国|郡|县)?(?:王|公|侯)$/u)?.[1];
  add(seal,'剧本已录封号「'+title.trim()+'」的名称参照，不代表新增封地。');
 }
 const held=Object.keys(w.realm.cities).filter(id=>w.realm!.cities[id].owner===r&&w.realm!.cities[id].controller===r).sort();
 const home= getCharacter(w,founder)?.home??person.home;
 const sites=[...new Set([capital(r,w),...(home?[home]:[]),...held])].filter(id=>held.includes(id));
 for(const id of sites){
  const a=administration[id],place=siteById[id]?.name??id;
  add(a?.province.replace(/州$/u,'').replace(/^[东西南北](?=\p{Script=Han})/u,''),'实际控制的'+place+'所属州名参照；沙盒择号。');
  add(a?.prefecture.replace(/(?:郡|尹)$/u,''),'实际控制的'+place+'所属郡名参照；沙盒择号。');
  add(siteById[id]?.name,'实际控制的'+place+'地名参照；沙盒择号。');
 }
 const single=options.filter(v=>[...v.name].length===1);
 return single.length?single:options;
}

/** Normalize only known country-name aliases, preserving prose and other custom names. */
export function normalizeLegacyDynastyNames(w:World):boolean{
 let changed=false;
 const normalize=(entry:{name?:string})=>{
  if(!entry.name)return;
  const name=canonicalDynastyName(entry.name);
  if(name!==entry.name){entry.name=name;changed=true;}
 };
 for(const v of w.realm?.governments?.regimes??[])normalize(v);
 for(const g of Object.values(w.realm?.governments?.realms??{}))if(g.arrangement)normalize(g.arrangement);
 for(const p of Object.values(w.politics?.proposals??{}))if(p)normalize(p);
 for(const war of [...w.realm?.wars??[],...(w.realm?.war?[w.realm.war]:[])])if(war.civil){
  normalize(war.civil);if(war.civil.arrangement)normalize(war.civil.arrangement);
  if(war.civil.partitionOffer)normalize(war.civil.partitionOffer);
 }
 return changed;
}

/** User-authorized correction of the confirmed legacy 西魏 -> 新西魏 case. */
export function repairLegacyWestDynastyName(w:World):boolean{
 const g=governmentOf(w,'west'),versions=w.realm?.governments?.regimes;
 if(!g||!versions||regimeName(w,'west')!=='新西魏')return false;
 const founding=versions.find(v=>v.realm==='west'&&v.id===g.dynasty&&v.kind==='political'&&v.name==='新西魏');
 if(!founding)return false;
 const name=dynastyNameOptions(w,'west',founding.ruler)[0]?.name;
 if(!name)return false;
 for(const v of versions)if(v.realm==='west'&&v.dynasty===g.dynasty&&v.name==='新西魏')v.name=name;
 if(g.arrangement?.name==='新西魏')g.arrangement.name=name;
 return true;
}
