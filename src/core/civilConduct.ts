import type {World} from './types';
import type {War} from './wars';
import type {CombatArmySnapshot} from './combatSnapshots';
import {getPerson} from './personRegistry';

export interface CivilFact {source:string;kind:'battle'|'capture'|'supply'|'switch'|'wait';side:'attack'|'defend';day:number;amount:number;army?:number;unspent?:number;returned?:number}

function conductRows(w:World){
 const wars=w.realm?.wars??[],live=new Set(wars.map(war=>war.id));
 return [...wars.flatMap(war=>Object.values(war.civil?.conduct??{})),...(w.politics?.civilSettlements??[]).filter(s=>!live.has(s.war)).flatMap(s=>s.members.map(p=>p.facts))];
}
function supplyFacts(w:World,army:number){return conductRows(w).flat().filter(f=>f.kind==='supply'&&f.army===army&&f.unspent!==undefined);}
export function recordCivilSupply(w:World,war:War,person:string,army:number,amount:number){
 const side=war.attacker===war.defender?(war.civil!.armies.includes(army)?'attack':'defend'):war.attacker===w.realm!.armies.find(a=>a.id===army)?.realm?'attack':'defend';
 const rows=(war.civil!.conduct??={})[person]??=[],prior=rows.find(f=>f.kind==='supply'&&f.army===army&&f.side===side);
 if(prior){prior.amount+=amount;prior.unspent=(prior.unspent??0)+amount;return;}
 recordCivilFact(w,war,person,{source:'supply:'+person+':'+army,kind:'supply',side,day:w.day,amount,army,unspent:amount,returned:0});
}
/** Ordinary stores are consumed first; only the unspent earmarked portion can later be returned. */
export function spendCivilSupply(w:World,army:number,supplyBefore:number,amount:number){
 const rows=supplyFacts(w,army);let remaining=Math.max(0,Math.min(amount,supplyBefore)-Math.max(0,supplyBefore-rows.reduce((n,f)=>n+f.unspent!,0)));
 for(const f of rows){const n=Math.min(f.unspent!,remaining);f.unspent!-=n;remaining-=n;}
}
export function returnCivilSupply(w:World,army:number,returned:number){
 for(const f of supplyFacts(w,army)){const n=Math.min(f.unspent!,returned);f.unspent!-=n;f.returned=(f.returned??0)+n;returned-=n;}
}
export function mergeCivilSupply(w:World,from:number,to:number){for(const f of supplyFacts(w,from))f.army=to;}
export function splitCivilSupply(w:World,army:number,newArmy:number,share:number){
 for(const rows of conductRows(w)){
  for(const f of [...rows])if(f.kind==='supply'&&f.army===army&&f.unspent!==undefined){
   const unspent=Math.floor(f.unspent*share),returned=Math.floor((f.returned??0)*share),amount=unspent+returned+Math.floor((f.amount-f.unspent-(f.returned??0))*share);if(!amount)continue;
   rows.push({...f,source:'supply-split:'+newArmy+':'+rows.length,army:newArmy,amount,unspent,returned});f.amount-=amount;f.unspent-=unspent;f.returned=(f.returned??0)-returned;
  }
 }
}

/** Receipts describe settled actions. They are neither merit nor a spendable contribution balance. */
export function recordCivilFact(w:World,war:War,person:string,fact:CivilFact){
 if(!war.civil||!getPerson(w,person))return;
 const entries=(war.civil.conduct??={})[person]??=[];
 if(entries.some(e=>e.source===fact.source&&e.kind===fact.kind&&e.side===fact.side))return;
 entries.push(fact);war.civil.conduct[person]=entries;
}
export function recordCivilBattle(w:World,warId:number|undefined,battleId:number|undefined,rows:CombatArmySnapshot[],day=w.day){
 const war=w.realm?.wars?.find(v=>v.id===warId&&v.civil);if(!war||battleId===undefined)return;
 for(const row of rows)if(row.commander&&row.troops>0&&!row.withdrawn)recordCivilFact(w,war,row.commander,{source:'battle:'+battleId,kind:'battle',side:row.side,day,amount:1});
}
export function validCivilConduct(w:World,conduct:Record<string,CivilFact[]>|undefined){
 if(conduct===undefined)return true;
 return !!conduct&&typeof conduct==='object'&&!Array.isArray(conduct)&&Object.entries(conduct).every(([id,rows])=>!!getPerson(w,id)&&Array.isArray(rows)&&rows.length<=10000&&new Set(rows.map(q=>q.source+'|'+q.kind+'|'+q.side)).size===rows.length&&rows.every(q=>q&&typeof q.source==='string'&&q.source.length<=160&&['battle','capture','supply','switch','wait'].includes(q.kind)&&['attack','defend'].includes(q.side)&&Number.isSafeInteger(q.day)&&q.day>=0&&q.day<=w.day&&Number.isSafeInteger(q.amount)&&q.amount>0&&q.amount<=1000000000&&(q.army===undefined||q.kind==='supply'&&Number.isSafeInteger(q.army)&&q.army>0&&q.army<(w.realm?.nextArmyId??1))&&(q.unspent===undefined||q.kind==='supply'&&q.army!==undefined&&Number.isSafeInteger(q.unspent)&&q.unspent>=0&&q.unspent<=q.amount)&&(q.returned===undefined||q.kind==='supply'&&q.unspent!==undefined&&Number.isSafeInteger(q.returned)&&q.returned>=0&&q.returned+q.unspent<=q.amount)));
}
