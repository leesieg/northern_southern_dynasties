import type {BattleRecord} from './militaryAftermath';
import type {World} from './types';
import {playerRealm} from './realm';
import {warRealmSide} from './wars';

export function battleKey(b:{id?:number;key:string;day:number}){return b.id!==undefined?'id:'+b.id:b.key+':'+b.day;}
/** Only transitions in this simulation session notify; loading historical reports does not replay them. */
export function completedBattleReports(before:ReadonlySet<string>,w:World){
 if(!w.realm||!w.characterId)return [];
 const realm=playerRealm(w);
 return (w.militaryAftermath?.battles??[]).filter(b=>b.ended!==undefined&&!before.has(battleKey(b))&&!before.has(b.key+':'+b.day)&&(
  b.participants?.some(p=>p.realm===realm||!!p.commander&&p.commander===w.characterId)
  ||w.realm?.wars?.some(war=>war.id===b.war&&!!warRealmSide(war,realm))
 )).sort((a,b)=>a.ended!-b.ended!||(a.id??0)-(b.id??0));
}
export function battleReportSide(b:BattleRecord,side:'attack'|'defend'){
 const ids=side==='attack'?b.attackers??[b.a]:b.defenders??[b.b];
 const participants=(b.participants??[]).filter(p=>p.side?p.side===side:ids.includes(p.army));
 const armies=[...new Set([...ids,...participants.map(p=>p.army)])];
 return {loss:side==='attack'?b.lossA:b.lossB,participants,armies};
}
