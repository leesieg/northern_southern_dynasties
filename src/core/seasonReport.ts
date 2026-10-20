import type {World} from './types';
import {isMonthStart,calendarDate} from './calendar';
import {personInfluence} from './personalInfluence';
import {governmentOf,governingExecutives} from './government';
import {playerRealm} from './realm';
import {ambitionView} from './ambitions';

export interface SeasonSnap{coins:number;influence:number;merit:number;prestige:number;treasuryCoins:number|null;treasuryGrain:number|null;cities:number|null;ambition:number|null}
export interface SeasonReport{from:number;to:number;rows:{label:string;before:number|null;after:number|null}[];entries:string[]}
export interface SeasonReportState{version:1;start:number;snap:SeasonSnap;last?:SeasonReport;person?:string}
const labels:[keyof SeasonSnap,string][]=[['coins','私财'],['influence','影响力'],['merit','功绩'],['prestige','威望'],['treasuryCoins','公库钱'],['treasuryGrain','公库粮'],['cities','实控城数'],['ambition','志向进度']];
const seasonStart=(day:number,scriptId?:string)=>isMonthStart(day,scriptId)&&[0,3,6,9].includes(calendarDate(day,scriptId).getUTCMonth());
function snapshot(w:World,id:string):SeasonSnap{
 const r=playerRealm(w),g=governmentOf(w,r),chief=!!g&&(g.ruler===id||governingExecutives(w,r).includes(id)),t=chief?w.realm!.treasuries[r]:null;
 return {coins:w.people[0].coins,influence:personInfluence(w,id),merit:g?.merit[id]??0,prestige:w.families?.prestige[id]??0,treasuryCoins:t?.coins??null,treasuryGrain:t?.grain??null,cities:chief?Object.values(w.realm!.cities).filter(c=>c.controller===r).length:null,ambition:ambitionView(w,id)?Math.round(ambitionView(w,id)!.progress*100):null};
}
export function advanceSeasonReport(w:World){
 if(w.mode!=='sandbox'||!w.characterId||w.campaign?.status!=='active')return;
 const id=w.characterId,s=w.seasonReport;
 if(!s||s.person&&s.person!==id){w.seasonReport={version:1,start:w.day,snap:snapshot(w,id),person:id};return;}
 if(!seasonStart(w.day,w.scriptId)||s.start>=w.day)return;
 const after=snapshot(w,id);
 s.last={from:s.start,to:w.day,rows:labels.map(([key,label])=>({label,before:s.snap[key],after:after[key]})),entries:w.chronicle.filter(c=>c.day>s.start&&c.day<=w.day&&c.person==='player').slice(-5).map(c=>c.text)};
 s.start=w.day;s.snap=after;
}
export function validSeasonReport(value:unknown,w:World):boolean{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;const s=value as SeasonReportState;
 const int=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0&&v<=w.day,num=(v:unknown)=>typeof v==='number'&&Number.isFinite(v),numOrNull=(v:unknown)=>v===null||num(v);
 const okSnap=(v:unknown)=>!!v&&typeof v==='object'&&!Array.isArray(v)&&num((v as SeasonSnap).coins)&&num((v as SeasonSnap).influence)&&num((v as SeasonSnap).merit)&&num((v as SeasonSnap).prestige)&&numOrNull((v as SeasonSnap).treasuryCoins)&&numOrNull((v as SeasonSnap).treasuryGrain)&&numOrNull((v as SeasonSnap).cities)&&numOrNull((v as SeasonSnap).ambition);
 if(s.version!==1||!int(s.start)||!okSnap(s.snap)||(s.person!==undefined&&typeof s.person!=='string'))return false;
 return s.last===undefined||!!s.last&&int(s.last.from)&&int(s.last.to)&&s.last.from<=s.last.to&&Array.isArray(s.last.rows)&&s.last.rows.length<=8&&s.last.rows.every(r=>!!r&&typeof r.label==='string'&&r.label.length<=12&&numOrNull(r.before)&&numOrNull(r.after))&&Array.isArray(s.last.entries)&&s.last.entries.length<=5&&s.last.entries.every(e=>typeof e==='string'&&e.length<=400);
}
