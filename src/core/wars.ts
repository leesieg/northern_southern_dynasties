import {civilPeaceReason} from './civilWars';
import {annexationReason} from './polityLifecycle';
import type {World} from './types';
import type {RealmId} from './realm';

export interface War {civil?:import('./civilWars').CivilWar;goal?:'territory'|'reparations'|'tributary'|'annexation';demand?:number;battles?:number;id?:number;attacker:RealmId;defender:RealmId;target:string;started:number;score:number}
/** Old saves expose a single war until their first authoritative mutation. */
export function activeWars(w:World):War[]{return w.realm?.wars??(w.realm?.war?[w.realm.war]:[]);}
export function realmAtWar(w:World,r:RealmId){return activeWars(w).some(v=>v.attacker===r||v.defender===r);}
export function bilateralWar(w:World,a:RealmId,b:RealmId){return activeWars(w).find(v=>a!==b&&[v.attacker,v.defender].includes(a)&&[v.attacker,v.defender].includes(b));}
export function ensureWars(w:World){const s=w.realm;if(!s)return;s.wars??=s.war?[s.war]:[];s.nextWarId??=1;for(const war of s.wars)war.id??=s.nextWarId++;s.war=s.wars[0]??null;}
export function selectedWar(w:World,r:RealmId,id?:number){const relevant=activeWars(w).filter(v=>[v.attacker,v.defender].includes(r));return id===undefined?(relevant.length===1?relevant[0]:undefined):relevant.find(v=>v.id===id);}

export type PeaceTerms='white'|'demand'|'yield';
export interface Reparation {war:number;from:RealmId;to:RealmId;remaining:number;instalment:number;next:number}
export function peaceQuote(w:World,war:War,actor:RealmId,terms:PeaceTerms){
 const attacker=actor===war.attacker,enemy=attacker?war.defender:war.attacker;
 const beneficiary=terms==='yield'?enemy:actor,loser=beneficiary===war.attacker?war.defender:war.attacker;
 const pressure=war.score*(attacker?1:-1),days=w.day-war.started;
 const controlled=Object.values(w.realm!.cities).filter(c=>c.owner===enemy),occupied=controlled.filter(c=>c.controller!==enemy).length;
 const parts=[{label:'军事压力',value:pressure},{label:'战争持续',value:Math.min(25,Math.floor(days/12))},{label:'失地压力',value:Math.min(25,occupied*5)},{label:'停战代价',value:terms==='demand'?-40:terms==='white'?-10:100}];
 let reason=!['white','demand','yield'].includes(terms)?'无效议和条款':!([war.attacker,war.defender] as RealmId[]).includes(actor)?'不是本场战争参与方':'';
 const takesLand=terms!=='white'&&beneficiary===war.attacker&&(war.goal??'territory')==='territory';
 if(!reason&&takesLand&&(w.realm!.cities[war.target].owner!==war.defender||w.realm!.cities[war.target].controller!==war.attacker))reason='目标地未由攻方实际控制，不能要求割让';
 if(!reason&&terms!=='white'&&war.goal==='tributary'&&beneficiary===war.attacker){let next:RealmId|undefined=beneficiary;const seen=new Set<RealmId>();while(next){if(next===loser||seen.has(next)){reason='宗属关系会形成循环，须先重议外交关系';break;}seen.add(next);next=w.diplomacy?.subjects[next];}}
 if(!reason&&terms==='demand'&&parts.reduce((n,p)=>n+p.value,0)<0)reason='对方尚不接受这些条件';
 if(!reason&&terms==='white'&&(days<30||Math.abs(pressure)>20&&parts.reduce((n,p)=>n+p.value,0)<0))reason='对方仍希望继续交战';
 const annexes=terms!=='white'&&war.goal==='annexation'&&beneficiary===war.attacker;
 if(!reason&&annexes)reason=annexationReason(w,beneficiary,loser);
 if(war.civil)reason=civilPeaceReason(w,war,terms);
 return {annexes,reason,parts,beneficiary,loser,takesLand,coins:terms==='white'||(war.goal??'territory')!=='reparations'?0:war.demand??300,tributary:terms!=='white'&&war.goal==='tributary'&&beneficiary===war.attacker};
}
export function advanceReparations(w:World){const s=w.realm;if(!s)return;for(const d of s.reparations??[]){if(d.remaining<=0||d.next>w.day)continue;const from=s.treasuries[d.from],to=s.treasuries[d.to],paid=Math.min(d.remaining,d.instalment,from.coins,1_000_000-to.coins);from.coins-=paid;to.coins+=paid;d.remaining-=paid;d.next=w.day+30;}s.reparations=s.reparations?.filter(d=>d.remaining>0);}
