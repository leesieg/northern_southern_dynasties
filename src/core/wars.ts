import {captiveCapitulation} from './warCaptives';
import {isMonthStart,nextMonthStart} from './calendar';
import {incurObligation,advanceObligations} from './obligations';
import {civilPeaceReason} from './civilWars';
import {annexationReason} from './polityLifecycle';
import {roads} from '../data/scenario';
import type {World} from './types';
import type {RealmId} from './realm';
import {peaceCostForCity,snapshotWarValues,warScoreFor,warWillToContinue} from './warScoring';
import {regionalWarTerritory,warTerritorySites,warObjectiveSites,supersedesWarTarget} from './warTerritories';

export interface War {territory?:{id:string;sites:string[]};peaceReviewed?:number;peaceOffer?:{from:RealmId;to:RealmId;terms:PeaceTerms;created:number;until:number};objective?:{side:'attack'|'defend'|null;since:number};civil?:import('./civilWars').CivilWar;goal?:'territory'|'reparations'|'tributary'|'annexation'|'defection';demand?:number;battles?:number;casualties?:{attack:number;defend:number};allies?:Partial<Record<RealmId,'attack'|'defend'>>;values?:Record<string,number>;disputes?:string[];id?:number;attacker:RealmId;defender:RealmId;target:string;started:number;score:number}
export function warRealmSide(war:War,r:RealmId):'attack'|'defend'|null{return r===war.attacker?'attack':r===war.defender?'defend':war.allies?.[r]??null;}
/** Old saves expose a single war until their first authoritative mutation. */
export function activeWars(w:World):War[]{return w.realm?.wars??(w.realm?.war?[w.realm.war]:[]);}
export function realmAtWar(w:World,r:RealmId){return activeWars(w).some(v=>!!warRealmSide(v,r));}
export function bilateralWar(w:World,a:RealmId,b:RealmId){return activeWars(w).find(v=>a!==b&&!v.civil&&!!warRealmSide(v,a)&&!!warRealmSide(v,b)&&warRealmSide(v,a)!==warRealmSide(v,b));}
export function ensureWars(w:World){const s=w.realm;if(!s)return;s.wars??=s.war?[s.war]:[];s.nextWarId=Math.max(s.nextWarId??1,...s.wars.map(v=>(v.id??0)+1));for(const war of s.wars){war.id??=s.nextWarId++;war.disputes??=[];if(!war.civil&&!war.values)snapshotWarValues(w,war);}s.war=s.wars[0]??null;}
export function selectedWar(w:World,r:RealmId,id?:number){const relevant=activeWars(w).filter(v=>[v.attacker,v.defender].includes(r));return id===undefined?(relevant.length===1?relevant[0]:undefined):relevant.find(v=>v.id===id);}

export type PeaceTerms='white'|'demand'|'yield'|'annex';
export const annexationPeaceCost=120;
export interface Reparation {obligation?:number;war:number;from:RealmId;to:RealmId;remaining:number;instalment:number;next:number}
/** Regional terms cost more than any single contained city while one whole region remains attainable. */
export function peaceLandCost(w:World,war:War,id:string,sites:string[]){const value=sites.reduce((n,site)=>n+peaceCostForCity(w,war,site),0),level=regionalWarTerritory(id)?.level;return level?Math.min(60,value)+(level==='province'?30:15):value;}
export function peaceQuote(w:World,war:War,actor:RealmId,terms:PeaceTerms,claims:string[]=[],extraCoins=0,landRecipient?:RealmId){
 const invalidClaims=!Array.isArray(claims)||claims.some(id=>typeof id!=='string');if(invalidClaims)claims=[];
 const invalidExtra=![0,100,300].includes(extraCoins);
 const attacker=actor===war.attacker,enemy=attacker?war.defender:war.attacker;
 const beneficiary=terms==='yield'?enemy:actor,loser=beneficiary===war.attacker?war.defender:war.attacker;
 const beneficiarySide=warRealmSide(war,beneficiary),days=w.day-war.started;
 const legacyScore=war.civil?war.score:warScoreFor(w,war,actor),enemyWill=warWillToContinue(w,war,enemy);
 let reason=invalidClaims?'无效附加割地':invalidExtra?'无效附加赔款':!['white','demand','yield','annex'].includes(terms)?'无效议和条款':!([war.attacker,war.defender] as RealmId[]).includes(actor)?'不是本场战争参与方':'';
 const annexes=!war.civil&&terms!=='white'&&(terms==='annex'||war.goal==='annexation'&&beneficiary===war.attacker);
 const capitulation=annexes&&captiveCapitulation(w,beneficiary,loser);
 const annexedSites=annexes?Object.keys(w.realm!.cities).filter(id=>w.realm!.cities[id].owner===loser):[];
 const targetLand=!annexes&&!war.civil&&terms!=='white'&&beneficiary===war.attacker&&['territory','defection'].includes(war.goal??'territory')?warObjectiveSites(war,w):[];
 const claimGroups=claims.map(id=>({id,sites:w.realm!.cities[id]?[id]:warTerritorySites(w,id,loser)})),claimSites=claimGroups.flatMap(c=>c.sites);
 const upgrade=claimGroups.find(c=>supersedesWarTarget(war,c.id,c.sites,targetLand)),baseLand=upgrade?[]:targetLand;
 const lands=[...baseLand,...claimSites],takesLand=lands.length>0,landBeneficiary=landRecipient??beneficiary;if(!reason&&landRecipient!==undefined&&(warRealmSide(war,landRecipient)!==beneficiarySide||war.civil||terms!=='demand'||landRecipient!==beneficiary&&!takesLand))reason='割地受益者须为胜方实际参战国，且仅用于提出割地要求';
 if(!reason&&extraCoins&&(terms!=='demand'||war.civil))reason='赔款须由提出要求的一方列入组合和约';
 if(!reason&&claims.length){if(war.civil||terms!=='demand'||claims.length>3||new Set(claims).size!==claims.length||claimGroups.some(c=>!c.sites.length)||new Set(lands).size!==lands.length||claimSites.some(id=>w.realm!.cities[id].owner!==loser||warRealmSide(war,w.realm!.cities[id].controller as RealmId)!==beneficiarySide))reason='附加割地须为至多三项互不重叠、受益方阵营全部已占领的敌方城市或州郡';else {const allowed=new Set(Object.entries(w.realm!.cities).filter(([id,c])=>warRealmSide(war,c.controller as RealmId)===beneficiarySide&&(c.owner===landBeneficiary||lands.includes(id))).map(([id])=>id)),reached=new Set(Object.entries(w.realm!.cities).filter(([,c])=>c.owner===landBeneficiary&&c.controller===landBeneficiary).map(([id])=>id)),queue=[...reached];for(const id of queue)for(const edge of roads)if(!edge.legacyOnly&&(edge.from===id||edge.to===id)){const next=edge.from===id?edge.to:edge.from;if(allowed.has(next)&&!reached.has(next)){reached.add(next);queue.push(next);}}if(lands.some(id=>!reached.has(id)))reason='割让县域须沿受益方控制道路形成连续廊道';}}
 if(!reason&&targetLand.some(id=>w.realm!.cities[id].owner!==loser||warRealmSide(war,w.realm!.cities[id].controller as RealmId)!==beneficiarySide))reason='目标地须仍属败方且全部由受益方阵营实际控制，不能要求割让';
 if(!reason&&!annexes&&terms!=='white'&&war.goal==='tributary'&&beneficiary===war.attacker){let next:RealmId|undefined=beneficiary;const seen=new Set<RealmId>();while(next){if(next===loser||seen.has(next)){reason='宗属关系会形成循环，须先重议外交关系';break;}seen.add(next);next=w.diplomacy?.subjects[next];}}
 if(!reason&&annexes&&(claims.length>0||extraCoins>0||landRecipient!==undefined&&landRecipient!==beneficiary))reason='吞并接管全部领土与余额，不能另加割地赔款或指定其他受益国';
 if(!reason&&annexes)reason=annexationReason(w,beneficiary,loser);
 const landCosts=[...(baseLand.length?[{id:war.territory?.id??war.target,sites:baseLand}]:[]),...claimGroups].map(c=>({...c,cost:peaceLandCost(w,war,c.id,c.sites)}));
 const territorialCost=landCosts.reduce((sum,c)=>sum+c.cost,0),clauseCost=annexes?annexationPeaceCost:territorialCost+extraCoins/10+(terms!=='white'&&war.goal==='tributary'&&beneficiary===war.attacker?50:0)+(terms!=='white'&&war.goal==='reparations'?Math.ceil((war.demand??300)/10):0);
 const acceptance=legacyScore-clauseCost-enemyWill.total;
 const parts=[{label:'战争优势',value:legacyScore},{label:'对方续战意愿',value:-enemyWill.total},{label:'条款代价',value:-clauseCost}];
 if(!reason&&!war.civil&&(terms==='demand'||terms==='annex')&&acceptance<0)reason='对方尚不接受这些条件';
 if(!reason&&!war.civil&&terms==='white'&&(days<30||Math.abs(legacyScore)>20&&enemyWill.total>0))reason='对方仍希望继续交战';
 if(war.civil&&!reason)reason=civilPeaceReason(w,war,terms);
 return {annexes,annexedSites,capitulation,reason,parts,score:legacyScore,cost:clauseCost,acceptance,enemyWill,beneficiary,landBeneficiary,loser,takesLand,lands,landCosts,coins:annexes?0:extraCoins+(terms!=='white'&&war.goal==='reparations'?war.demand??300:0),tributary:!annexes&&terms!=='white'&&war.goal==='tributary'&&beneficiary===war.attacker};
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
