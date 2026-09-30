import type {World} from './types';
import type {RealmId} from './realm';
export type CustodyTreatment='guarded'|'honored'|'house';
export interface Detention {war?:number;side?:'attack'|'defend';person:string;captor:RealmId;captorPerson:string|null;army:number|null;site:string;since:number;origin:RealmId;cause:'battle'|'city'|'arrest';source:string;treatment:CustodyTreatment;talked:number|null;terms:string;escapeAfter:number;ransom:number;offer:'stipend'|'office'|null}
export interface ArrestWarrant {id:number;person:string;issuer:string;realm:RealmId;site:string;issued:number;due:number;evidence:string;status:'pending'|'detained'|'refused'|'cancelled'}
export interface CustodyEvent {day:number;person:string;captor:RealmId;source:string;result:string}
export interface CustodyState {version:1;nextId:number;records:Record<string,Detention>;history:CustodyEvent[];warrants:ArrestWarrant[];promises:{person:string;lord:string;realm:RealmId;due:number;kind:'office';status:'pending'|'honored'|'broken'}[];guarantees:{person:string;payer:string;realm:RealmId;coins:number;due:number;status:'held'|'refunded'|'forfeited'}[];lastDay:number;lastMonth:number}
export type CustodyCommand={type:'custody';person:string;action:'release'|'execute'|'ransom'|'request-family'|'request-lord'|'escape'|'accept'|'acquit'|'fine'}|{type:'custody';person:string;action:'treatment';treatment:CustodyTreatment}|{type:'custody';person:string;action:'recruit';offer:'stipend'|'office';mediator?:string}|{type:'custody';person:string;action:'exchange';other:string}|{type:'custody';person:string;action:'arrest'}|{type:'custody';person:string;action:'guarantee';guarantor:string};
export const detained=(w:World,id:string)=>!!w.custody?.records[id]||id===w.characterId&&!!w.mobility?.captivity;
export const custodyTreatmentNames:Record<CustodyTreatment,string>={guarded:'严加看管',honored:'优待礼遇',house:'居所软禁'};
