import {pauseHasActions,type PauseEvent} from './pauseEvents';
import type {World} from './types';
export type NoticeCategory='travel'|'family'|'personnel'|'military'|'economy'|'report';
export const noticeCategories:NoticeCategory[]=['travel','family','personnel','military','economy','report'];
export const noticeCategoryNames:Record<NoticeCategory,string>={travel:'行旅',family:'家事',personnel:'人事',military:'军情',economy:'经营',report:'述职'};
export type NoticeSettings=Record<NoticeCategory,'notice'|'pause'>;
export const defaultNoticeSettings:NoticeSettings={travel:'notice',family:'notice',personnel:'notice',military:'notice',economy:'notice',report:'notice'};
/** Missing categories fall back to the default so older persisted settings keep working; only wrong-shaped values are rejected. */
export function validNoticeSettings(value:unknown):value is NoticeSettings{return !!value&&typeof value==='object'&&noticeCategories.every(k=>(value as NoticeSettings)[k]===undefined||['notice','pause'].includes((value as NoticeSettings)[k]));}
export const normalizeNoticeSettings=(value:unknown):NoticeSettings=>validNoticeSettings(value)?{...defaultNoticeSettings,...(value as NoticeSettings)}:defaultNoticeSettings;
export function noticeTier(w:World,event:PauseEvent,settings:NoticeSettings):'pause'|'notice'{return !event.notice||pauseHasActions(w,event)||settings[event.notice]==='pause'?'pause':'notice';}
