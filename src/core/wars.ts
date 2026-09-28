import {isMonthStart,nextMonthStart} from './calendar';
import {incurObligation,advanceObligations} from './obligations';
import {civilPeaceReason} from './civilWars';
import {annexationReason} from './polityLifecycle';
import {roads} from '../data/scenario';
import type {World} from './types';
import type {RealmId} from './realm';

export interface War {civil?:import('./civilWars').CivilWar;goal?:'territory'|'reparations'|'tributary'|'annexation';demand?:number;battles?:number;casualties?:{attack:number;defend:number};allies?:Partial<Record<RealmId,'attack'|'defend'>>;id?:number;attacker:RealmId;defender:RealmId;target:string;started:number;score:number}
export function warRealmSide(war:War,r:RealmId):'attack'|'defend'|null{return r===war.attacker?'attack':r===war.defender?'defend':war.allies?.[r]??null;}
/** Old saves expose a single war until their first authoritative mutation. */
export function activeWars(w:World):War[]{return w.realm?.wars??(w.realm?.war?[w.realm.war]:[]);}
export function realmAtWar(w:World,r:RealmId){return activeWars(w).some(v=>!!warRealmSide(v,r));}
export function bilateralWar(w:World,a:RealmId,b:RealmId){return activeWars(w).find(v=>a!==b&&!v.civil&&!!warRealmSide(v,a)&&!!warRealmSide(v,b)&&warRealmSide(v,a)!==warRealmSide(v,b));}
export function ensureWars(w:World){const s=w.realm;if(!s)return;s.wars??=s.war?[s.war]:[];s.nextWarId??=1;for(const war of s.wars)war.id??=s.nextWarId++;s.war=s.wars[0]??null;}
export function selectedWar(w:World,r:RealmId,id?:number){const relevant=activeWars(w).filter(v=>[v.attacker,v.defender].includes(r));return id===undefined?(relevant.length===1?relevant[0]:undefined):relevant.find(v=>v.id===id);}

export type PeaceTerms='white'|'demand'|'yield';
export interface Reparation {obligation?:number;war:number;from:RealmId;to:RealmId;remaining:number;instalment:number;next:number}
export function peaceQuote(w:World,war:War,actor:RealmId,terms:PeaceTerms,claims:string[]=[],extraCoins=0){
 const invalidClaims=!Array.isArray(claims)||claims.some(id=>typeof id!=='string');if(invalidClaims)claims=[];
 const invalidExtra=![0,100,300].includes(extraCoins);
 const attacker=actor===war.attacker,enemy=attacker?war.defender:war.attacker;
 const beneficiary=terms==='yield'?enemy:actor,loser=beneficiary===war.attacker?war.defender:war.attacker;
 const pressure=war.score*(attacker?1:-1),days=w.day-war.started;
 const actorSide=warRealmSide(war,actor),controlled=Object.values(w.realm!.cities).filter(c=>c.owner!=='frontier'&&warRealmSide(war,c.owner)!==actorSide&&!!warRealmSide(war,c.owner)),occupied=controlled.filter(c=>c.controller!=='frontier'&&warRealmSide(war,c.controller)===actorSide).length;
 const ownTroops=w.realm!.armies.filter(a=>warRealmSide(war,a.realm)===actorSide).reduce((n,a)=>n+a.troops,0),enemyTroops=w.realm!.armies.filter(a=>warRealmSide(war,a.realm)&&warRealmSide(war,a.realm)!==actorSide).reduce((n,a)=>n+a.troops,0);
 const clamp=(n:number,limit:number)=>Math.max(-limit,Math.min(limit,n)),casualties=war.casualties??{attack:0,defend:0},ownLosses=attacker?casualties.attack:casualties.defend,enemyLosses=attacker?casualties.defend:casualties.attack;
 const target=w.realm!.cities[war.target],held=target.controller===war.attacker&&target.occupiedSince!==undefined?Math.min(15,Math.floor((w.day-target.occupiedSince)/10)):0;
 const parts=[{label:'军事压力',value:pressure},{label:'战争持续',value:Math.min(25,Math.floor(days/12))},{label:'占据对方县域',value:Math.min(25,occupied*5)},{label:'双方现役军力',value:clamp(Math.floor((ownTroops-enemyTroops)/200),20)},{label:'公库续战能力',value:clamp(Math.floor((w.realm!.treasuries[actor].coins-w.realm!.treasuries[enemy].coins)/100),10)},{label:'野战伤亡差',value:clamp(Math.floor((enemyLosses-ownLosses)/100),15)},{label:'目标控制时长',value:attacker?held:-held},{label:'附加割地代价',value:-25*claims.length},{label:'附加赔款代价',value:-extraCoins/10},{label:'停战代价',value:terms==='demand'?-40:terms==='white'?-10:100}];
 let reason=invalidClaims?'无效附加割地':invalidExtra?'无效附加赔款':!['white','demand','yield'].includes(terms)?'无效议和条款':!([war.attacker,war.defender] as RealmId[]).includes(actor)?'不是本场战争参与方':'';
 const takesLand=terms!=='white'&&beneficiary===war.attacker&&(war.goal??'territory')==='territory';
 if(!reason&&extraCoins&&(!takesLand||terms!=='demand'||actor!==war.attacker||war.civil))reason='附加赔款仅能随攻方的领土要求提出';
 if(!reason&&claims.length){if(war.civil||terms!=='demand'||actor!==war.attacker||!takesLand||claims.length>3||new Set(claims).size!==claims.length||claims.some(id=>id===war.target||!w.realm!.cities[id]||w.realm!.cities[id].owner!==war.defender||w.realm!.cities[id].controller!==war.attacker))reason='附加割地须为至多三处已占领的敌方县域';else {const allowed=new Set(Object.entries(w.realm!.cities).filter(([id,c])=>c.controller===war.attacker&&(c.owner===war.attacker||id===war.target||claims.includes(id))).map(([id])=>id)),reached=new Set(Object.entries(w.realm!.cities).filter(([,c])=>c.owner===war.attacker&&c.controller===war.attacker).map(([id])=>id)),queue=[...reached];for(const id of queue)for(const edge of roads)if(!edge.legacyOnly&&(edge.from===id||edge.to===id)){const next=edge.from===id?edge.to:edge.from;if(allowed.has(next)&&!reached.has(next)){reached.add(next);queue.push(next);}}if(!reached.has(war.target)||claims.some(id=>!reached.has(id)))reason='附加县域须沿己方控制道路形成连接目标的连续廊道';}}
 if(!reason&&takesLand&&(w.realm!.cities[war.target].owner!==war.defender||w.realm!.cities[war.target].controller!==war.attacker))reason='目标地未由攻方实际控制，不能要求割让';
 if(!reason&&terms!=='white'&&war.goal==='tributary'&&beneficiary===war.attacker){let next:RealmId|undefined=beneficiary;const seen=new Set<RealmId>();while(next){if(next===loser||seen.has(next)){reason='宗属关系会形成循环，须先重议外交关系';break;}seen.add(next);next=w.diplomacy?.subjects[next];}}
 if(!reason&&terms==='demand'&&parts.reduce((n,p)=>n+p.value,0)<0)reason='对方尚不接受这些条件';
 if(!reason&&terms==='white'&&(days<30||Math.abs(pressure)>20&&parts.reduce((n,p)=>n+p.value,0)<0))reason='对方仍希望继续交战';
 const annexes=terms!=='white'&&war.goal==='annexation'&&beneficiary===war.attacker;
 if(!reason&&annexes)reason=annexationReason(w,beneficiary,loser);
 if(war.civil&&!reason)reason=civilPeaceReason(w,war,terms);
 return {annexes,reason,parts,beneficiary,loser,takesLand,lands:takesLand?[war.target,...claims]:[],coins:extraCoins||(terms!=='white'&&war.goal==='reparations'?war.demand??300:0),tributary:terms!=='white'&&war.goal==='tributary'&&beneficiary===war.attacker};
}
export function advanceReparations(w:World){
 const s=w.realm;if(!s)return;
 for(const d of s.reparations??[]){if(d.obligation!==undefined)continue;
  const source='reparation:'+d.war+':'+d.from+':'+d.to;
  incurObligation(w,source,'central:'+d.from,'central:'+d.to,d.remaining,'议和分期赔款');
  const claim=w.obligations!.items.find(q=>q.source===source)!;claim.next=isMonthStart(d.next,w.scriptId)?d.next:nextMonthStart(w.day,w.scriptId);claim.instalment=d.instalment;d.obligation=claim.id;
 }
 advanceObligations(w);
}
