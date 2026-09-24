import {clanStanding} from './clans';
import {isAlive} from './lifeState';
import { familyPeople,familyPersonById,familyMembers } from '../data/families';
import type { World } from './types';
export interface FamilyState {version:1;since:number;lastMonthly:number;prestige:Record<string,number>;ledger:{day:number;member:string;amount:number;reason:'monthly'|'construction'|'friendship'|'service'|'marriage'}[]}
export const prestigeReasons={monthly:'族人经营',construction:'主持竣工',friendship:'交好成功',service:'差事考绩',marriage:'世族联姻'};
export const familyRanks=[{name:'初立门户',threshold:0},{name:'乡里知名',threshold:100},{name:'一方名门',threshold:300},{name:'海内望族',threshold:700},{name:'累世冠冕',threshold:1500}];
export const prestigeMembers=familyPeople.filter(p=>p.status==='roster'||p.status==='fictional');
export function newFamilyState(day=0):FamilyState{return {version:1,since:day,lastMonthly:Math.floor(day/30)*30,prestige:Object.fromEntries(prestigeMembers.map(p=>[p.id,0])),ledger:[]};}
export const memberId=(w:World)=>w.characterId??'fictional';
export function familyPrestige(w:World,family:string){return familyMembers(family).reduce((sum,p)=>sum+(w.families?.prestige[p.id]??0),0);}
export function familyStanding(w:World,id=memberId(w)){
 const family=familyPersonById[id]?.family,total=family?familyPrestige(w,family):0;
 const tier=familyRanks.reduce((rank,r,i)=>total>=r.threshold?i:rank,0);
 return {total,tier,rank:familyRanks[tier],next:familyRanks[tier+1],diplomacy:tier,calm:tier*2};
}
export function awardPrestige(w:World,id:string,reason:keyof typeof prestigeReasons){
 const s=w.families??=newFamilyState(w.day);if(!Object.hasOwn(s.prestige,id)||!isAlive(w,id))return;
 const amount=Math.min(reason==='monthly'?2:reason==='construction'?10:5,1_000_000-s.prestige[id]);if(amount<=0)return;
 s.prestige[id]+=amount;s.ledger.push({day:w.day,member:id,amount,reason});s.ledger=s.ledger.slice(-80);
}
export function advanceFamilies(w:World){
 const s=w.families??=newFamilyState(w.day);if(w.day%30!==0||s.lastMonthly>=w.day)return;s.lastMonthly=w.day;
 // This is a transparent game rule, not an inferred historical assessment of fame.
 const retired=new Set(w.social?.lineage.slice(0,-1).map(p=>p.id));
 for(const p of prestigeMembers)if(!retired.has(p.id)&&(p.status!=='fictional'||!w.characterId))awardPrestige(w,p.id,'monthly');
}
export function validFamilies(value:unknown,day:number):boolean{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;const s=value as FamilyState;
 const integer=(v:unknown,max:number)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0&&v<=max;
 if(s.version!==1||!integer(s.since,day)||!integer(s.lastMonthly,day)||s.lastMonthly%30!==0||s.lastMonthly<Math.floor(s.since/30)*30||!s.prestige||typeof s.prestige!=='object'||Array.isArray(s.prestige))return false;
 if(Object.keys(s.prestige).length!==prestigeMembers.length||!prestigeMembers.every(p=>Object.hasOwn(s.prestige,p.id)&&integer(s.prestige[p.id],1_000_000)))return false;
 if(!Array.isArray(s.ledger)||s.ledger.length>80)return false;
 let last=s.since;const subtotals:Record<string,number>={};
 for(const e of s.ledger){if(!e||!integer(e.day,day)||e.day<last||!Object.hasOwn(s.prestige,e.member)||!Object.hasOwn(prestigeReasons,e.reason)||!integer(e.amount,15)||e.amount===0)return false;if(e.amount>(e.reason==='monthly'?2:e.reason==='construction'?10:e.reason==='marriage'?15:5))return false;last=e.day;subtotals[e.member]=(subtotals[e.member]??0)+e.amount;if(subtotals[e.member]>s.prestige[e.member])return false;}
 return true;
}

export function marriagePrestigePreview(w:World,a:string,b:string){
 const gain=Math.max(clanStanding(w,a)?.marriage??0,clanStanding(w,b)?.marriage??0);
 const married=w.relationships?.marriages.some(m=>m.a===a&&m.b===b||m.a===b&&m.b===a);
 return [a,b].map(id=>({id,amount:!married&&w.families&&Object.hasOwn(w.families.prestige,id)&&isAlive(w,id)?Math.min(gain,1_000_000-w.families.prestige[id]):0}));
}
export function marriagePrestige(w:World,a:string,b:string){for(const {id,amount} of marriagePrestigePreview(w,a,b)){const s=w.families;if(s&&amount>0){s.prestige[id]+=amount;s.ledger.push({day:w.day,member:id,amount,reason:'marriage'});s.ledger=s.ledger.slice(-80);}}}
