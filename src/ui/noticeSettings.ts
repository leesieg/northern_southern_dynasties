import {useSyncExternalStore} from 'react';
import {defaultNoticeSettings,normalizeNoticeSettings,type NoticeCategory,type NoticeSettings} from '../core/noticePolicy';
const KEY='fynbc.noticeSettings';
export function parseNoticeSettings(value:string|null):NoticeSettings{try{return normalizeNoticeSettings(JSON.parse(value??'null'));}catch{return {...defaultNoticeSettings};}}
let settings=typeof localStorage==='undefined'?{...defaultNoticeSettings}:(()=>{try{return parseNoticeSettings(localStorage.getItem(KEY));}catch{return {...defaultNoticeSettings};}})();
const subscribers=new Set<()=>void>();
export const subscribeNoticeSettings=(fn:()=>void)=>{subscribers.add(fn);return()=>{subscribers.delete(fn);};};
export const noticeSettings=()=>settings;
export const useNoticeSettings=()=>useSyncExternalStore(subscribeNoticeSettings,noticeSettings,noticeSettings);
export function changeNoticeSettings(category:NoticeCategory,tier:'notice'|'pause'){settings={...settings,[category]:tier};try{localStorage.setItem(KEY,JSON.stringify(settings));}catch{}subscribers.forEach(fn=>fn());}
