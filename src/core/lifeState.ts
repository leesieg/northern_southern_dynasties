import {familyPersonById} from '../data/families';
import {birthRecords} from '../data/lifespans';
import {getScript} from '../data/scripts';
import type {World} from './types';
import type {RealmId} from './realm';
export type Illness='fever'|'wasting';
export const illnessNames:Record<Illness,string>={fever:'热病',wasting:'虚损'};
export interface PersonLife {
 health:number;illness:{kind:Illness;since:number;severity:1|2|3}|null;
 careUntil:number;death:{day:number;cause:'illness'|'age'}|null;
}
export interface LifeSuccession {realm:RealmId;regimeId:string;stage:string|null;day:number;deceased:string;ruler:string;executives:string[]}
export interface LifeState {version:1;since:number;lastMonthly:number;seed:number;people:Record<string,PersonLife>;successions:LifeSuccession[]}
export type LifeCommand={type:'health';action:'care';target:string};
export const lifeId=(id:string|undefined)=>!id||id==='player'?'fictional':id;
export function lifeOf(w:World|undefined,id:string|undefined){return w?.life?.people?.[lifeId(id)];}
export function isDeceased(w:World|undefined,id:string|undefined){return !!lifeOf(w,id)?.death||familyPersonById[lifeId(id)]?.status==='ancestor';}
export function isAlive(w:World,id:string|undefined){return !!id&&!isDeceased(w,id);}
export function ageAt(w:Pick<World,'day'|'scriptId'>|undefined,id:string,day=w?.day??0){
 const birth=birthRecords[lifeId(id)];if(!birth)return null;
 return Math.max(0,new Date(Date.UTC(getScript(w?.scriptId).year,0,1+day)).getUTCFullYear()-birth.year);
}
export function ageOf(w:World|undefined,id:string){return ageAt(w,id,lifeOf(w,id)?.death?.day??w?.day??0);}
export function ageLabel(w:World|undefined,id:string){const n=ageOf(w,id);return n===null?'年龄不详':(birthRecords[lifeId(id)].basis==='estimate'?'约 ':'')+n+' 岁';}
export function lifeStage(age:number){return age<16?'幼年':age<30?'青年':age<50?'壮年':age<65?'中年':'老年';}
export function healthLabel(w:World,id:string){const p=lifeOf(w,id);return isDeceased(w,id)?'已故':!p?'健康不详':p.illness?(p.illness.severity===3?'重症 · ':'')+illnessNames[p.illness.kind]:(p?.health??100)<40?'衰弱':(p?.health??100)<65?'欠安':'康健';}
export function healthCapacity(age:number){return Math.max(25,100-Math.max(0,age-40));}
export function newLifeState(w:Pick<World,'day'|'scriptId'>):LifeState {
 return {version:1,since:w.day,lastMonthly:Math.floor(w.day/30)*30,seed:546103,people:Object.fromEntries(Object.keys(birthRecords).map(id=>[id,{health:healthCapacity(ageAt(w,id)!),illness:null,careUntil:0,death:null}])),successions:[]};
}
