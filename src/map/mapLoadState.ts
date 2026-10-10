export type MapLoadStage='terrain'|'detail'|'art'|'models';
export interface MapLoadProgress{stage:MapLoadStage;completed:number;total:number;busy:boolean;}
export const mapLoadLabels:Record<MapLoadStage,string>={terrain:'铺展山河',detail:'细绘山川',art:'晕染山色',models:'安置城邑'};
export interface MapNotice{source:string;message:string;auth?:boolean;}
/** Recovery removes only its own failure, independent of translated wording. */
export function clearMapNotice(notices:MapNotice[],source:string){return notices.filter(notice=>notice.source!==source);}
