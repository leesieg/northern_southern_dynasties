import {campaignSetup} from '../data/campaignSetup';
import {monthStart} from './calendar';
import {familyPersonById} from '../data/families';
import {birthRecords} from '../data/lifespans';
import {getScript} from '../data/scripts';
import type {World} from './types';
import type {RealmId} from './realm';
export type Illness='fever'|'wasting'|'cold'|'flux';
export const illnessNames:Record<Illness,string>={fever:'热病',wasting:'虚损',cold:'风寒',flux:'腹疾'};
/** Monthly game hazards; not historical epidemiological estimates. */
export const illnessCourse:Record<Illness,{recovery:number;worsening:number;damage:number}>={
 cold:{recovery:.78,worsening:.04,damage:2},
 fever:{recovery:.58,worsening:.10,damage:4},
 flux:{recovery:.65,worsening:.08,damage:3},
 wasting:{recovery:.38,worsening:.10,damage:3},
};
export function monthlyIllnessRisk(age:number,stress=0,vigorous=false){return Math.max(.002,Math.min(.05,.007+Math.max(0,age-55)*.00035+Math.max(0,Math.min(100,stress))*.00012-(vigorous?.003:0)));}
export function illnessKind(age:number,draw:number):Illness {return age>=60?(draw<.35?'wasting':draw<.65?'cold':draw<.85?'flux':'fever'):(draw<.55?'cold':draw<.8?'flux':'fever');}
/** Gameplay balance, not historical mortality estimates or a scheduled lifespan. */
export const annualAgeRisk=[[16,.003],[40,.01],[50,.03],[60,.08],[70,.18],[80,.35],[90,.55]] as const;
export function monthlyAgeRisk(age:number){
 if(!Number.isFinite(age)||age<0)throw new Error('人物年龄资料缺失');
 const annual=annualAgeRisk.filter(([from])=>age>=from).at(-1)?.[1]??0;
 return 1-(1-annual)**(1/12);
}
export function mortalityRisk(age:number,health:number,severity:number,care=false,vigorous=false){
 const aging=monthlyAgeRisk(age)*(vigorous?.9:1);
 const illness=Math.min(1,Math.max(severity===3?.04:0,Math.max(0,25-health)*.003)*(care?.6:1)*(vigorous?.8:1));
 return {aging,illness,total:1-(1-aging)*(1-illness)};
}
export function recoveryChance(kind:Illness,severity:1|2|3,elapsed:number,care=false,vigorous=false){
 return Math.min(.95,illnessCourse[kind].recovery*([1,.65,.35][severity-1])+(care?.25:0)+(vigorous?.08:0)+(severity===1?Math.min(.16,Math.floor(Math.max(0,elapsed)/60)*.08):0));
}
export interface PersonLife {
 health:number;illness:{kind:Illness;since:number;severity:1|2|3}|null;
 injuryUntil?:number;careUntil:number;death:{day:number;cause:'illness'|'age'|'battle'|'execution'|'murder'}|null;
}
export interface LifeSuccession {realm:RealmId;regimeId:string;stage:string|null;day:number;deceased:string;ruler:string;executives:string[]}
export interface LifeState {version:1;since:number;lastMonthly:number;seed:number;autoCare?:{payer:string;remaining:number};people:Record<string,PersonLife>;successions:LifeSuccession[]}
export type LifeCommand={type:'health';action:'care'|'auto-care'|'stop-auto-care';target:string};
export const lifeId=(id:string|undefined)=>!id||id==='player'?'fictional':id;
export function lifeOf(w:World|undefined,id:string|undefined){return w?.life?.people?.[lifeId(id)];}
export function isDeceased(w:World|undefined,id:string|undefined){return !!lifeOf(w,id)?.death||familyPersonById[lifeId(id)]?.status==='ancestor';}
export function isAlive(w:World,id:string|undefined){return !!id&&!isDeceased(w,id);}
export function ageAt(w:Pick<World,'day'|'scriptId'|'generatedPeople'>|undefined,id:string,day=w?.day??0){
 const generated=w?.generatedPeople?.[lifeId(id)];if(generated){const birth=new Date(Date.UTC(getScript(w?.scriptId).year,0,1+generated.birthDay)),now=new Date(Date.UTC(getScript(w?.scriptId).year,0,1+day));return Math.max(0,now.getUTCFullYear()-birth.getUTCFullYear()-(now.getUTCMonth()<birth.getUTCMonth()||now.getUTCMonth()===birth.getUTCMonth()&&now.getUTCDate()<birth.getUTCDate()?1:0));}
 const birth=birthRecords[lifeId(id)];if(!birth)return null;
 return Math.max(0,new Date(Date.UTC(getScript(w?.scriptId).year,0,1+day)).getUTCFullYear()-birth.year);
}
export function ageOf(w:World|undefined,id:string){return ageAt(w,id,lifeOf(w,id)?.death?.day??w?.day??0);}
export function ageLabel(w:World|undefined,id:string){const n=ageOf(w,id);return n===null?'年龄不详':(birthRecords[lifeId(id)]?.basis==='estimate'?'约 ':'')+n+' 岁';}
export function lifeStage(age:number){return age<16?'幼年':age<30?'青年':age<50?'壮年':age<65?'中年':'老年';}
export function healthLabel(w:World,id:string){const p=lifeOf(w,id);return isDeceased(w,id)?'已故':!p?'健康不详':p.illness?(p.illness.severity===3?'重症 · ':'')+illnessNames[p.illness.kind]:(p.injuryUntil??0)>w.day?'军中负伤':(p?.health??100)<40?'衰弱':(p?.health??100)<65?'欠安':'康健';}
export function healthCapacity(age:number){return Math.max(25,100-Math.max(0,age-40));}
export function newLifeState(w:Pick<World,'day'|'scriptId'|'generatedPeople'>):LifeState {
 return {version:1,since:w.day,lastMonthly:monthStart(w.day,w.scriptId),seed:campaignSetup.seed,people:Object.fromEntries([...Object.keys(birthRecords),...Object.keys(w.generatedPeople??{})].map(id=>[id,{health:healthCapacity(ageAt(w,id)!),illness:null,careUntil:0,death:null}])),successions:[]};
}
