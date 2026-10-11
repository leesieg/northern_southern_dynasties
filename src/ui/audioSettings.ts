import {useSyncExternalStore} from 'react';
export interface SoundPreferences {muted:boolean;music:number;effects:number;ambience:number}
export const defaultSound:SoundPreferences={muted:false,music:.32,effects:.45,ambience:.18};
export function parseSound(value:string|null):SoundPreferences{try{const v=JSON.parse(value??'null');const level=(key:'music'|'effects'|'ambience')=>typeof v?.[key]==='number'&&Number.isFinite(v[key])?Math.max(0,Math.min(1,v[key])):defaultSound[key];return {muted:typeof v?.muted==='boolean'?v.muted:false,music:level('music'),effects:level('effects'),ambience:level('ambience')};}catch{return {...defaultSound};}}
let settings=typeof localStorage==='undefined'?{...defaultSound}:(()=>{try{return parseSound(localStorage.getItem('fynbc.sound.v1'));}catch{return {...defaultSound};}})();
let error='';const subscribers=new Set<()=>void>();
const subscribe=(fn:()=>void)=>{subscribers.add(fn);return()=>{subscribers.delete(fn);};};
export const soundSettings=()=>settings;
export const useSound=()=>useSyncExternalStore(subscribe,soundSettings,soundSettings);
export const useSoundError=()=>useSyncExternalStore(subscribe,()=>error,()=>error);
export function setSoundError(value:string){if(error===value)return;error=value;subscribers.forEach(fn=>fn());}
export function changeSound(next:Partial<SoundPreferences>){settings=parseSound(JSON.stringify({...settings,...next}));try{localStorage.setItem('fynbc.sound.v1',JSON.stringify(settings));}catch{setSoundError('浏览器未允许保存声音偏好；本次设置仍生效。');}subscribers.forEach(fn=>fn());}
