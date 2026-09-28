import {getScript} from '../data/scripts';
const DAY_MS=86_400_000;
/** The same UTC calendar used by the date displayed in the game. */
export function calendarDate(day:number,scriptId?:string){return new Date(Date.UTC(getScript(scriptId).year,0,1+day));}
export function monthStart(day:number,scriptId?:string){const d=calendarDate(day,scriptId);return day-d.getUTCDate()+1;}
export function nextMonthStart(day:number,scriptId?:string){const d=calendarDate(day,scriptId);return day+(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,1)-d.getTime())/DAY_MS;}
export function isMonthStart(day:number,scriptId?:string){return Number.isSafeInteger(day)&&day>=0&&calendarDate(day,scriptId).getUTCDate()===1;}
export function monthIndex(day:number,scriptId?:string){const d=calendarDate(day,scriptId);return (d.getUTCFullYear()-getScript(scriptId).year)*12+d.getUTCMonth();}
