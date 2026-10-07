import {migrateCaptureLosses} from './warOccupation';
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
import {activeClaim,dynasticKin,rulerEligibility} from './claims';
import {governmentOf,governingExecutives} from './government';
import {allegianceRealm} from './officeEligibility';
import {isAlive} from './lifeState';
import {getPerson} from './personRegistry';
import {powerCandidates} from './powerPolitics';
import {ageAt} from './lifeState';
import {detained} from './custodyState';

/** Declaration-time identity; military commanders and the patron remain separate people. */
export interface ClaimantWarGoal {person:string;realm:RealmId;dynasty:string;source:string;patron:string}
export function claimantWarReason(w:World,r:RealmId,patron:string,person?:string,snapshot?:ClaimantWarGoal){
 if(!governmentOf(w,r)||w.realm?.annexed?.[r])return '拥立目标政权已终止';
 if(!person)return '须指定实际拥立对象';
 const reason=rulerEligibility(w,r,person,{allowForeign:true});if(reason)return reason;
 if(governmentOf(w,r)?.ruler===person)return '拥立对象已经在位';
 if(!isAlive(w,patron)||!governingExecutives(w,allegianceRealm(w,patron)!).includes(patron))return '支持者须为实际执政者';
 const claim=(w.claims?.records??[]).find(c=>c.realm===r&&c.person===person&&c.patron===patron&&c.until===null);
 if(!claim||!activeClaim(w,r,person))return '须先明确支持该人物的君位宣称';
 if(snapshot&&(snapshot.realm!==r||snapshot.person!==person||snapshot.patron!==patron||snapshot.dynasty!==claim.dynasty||snapshot.source!==claim.royal||!dynasticKin(w,person,snapshot.source)))return '开战时的王国、王朝或承统来源已经失效';
 return '';
}
export function validClaimantWar(w:World,war:War){const c=war.claimant;if(war.goal!=='claimant')return c===undefined;if(!c||war.civil||war.territory||c.realm!==war.defender||!getPerson(w,c.person)||!getPerson(w,c.patron)||!getPerson(w,c.source)||allegianceRealm(w,c.patron)!==war.attacker||typeof c.dynasty!=='string'||!dynasticKin(w,c.person,c.source))return false;return (w.claims?.records??[]).some(q=>q.realm===c.realm&&q.person===c.person&&q.patron===c.patron&&q.dynasty===c.dynasty&&q.royal===c.source&&q.since<=war.started);}
/** The quote and execution choose the same local executive, never the foreign patron by default. */
export function claimantWarExecutive(w:World,war:War){const g=governmentOf(w,war.defender);if(!g)return undefined;return governingExecutives(w,war.defender).find(id=>id!==g.ruler&&isAlive(w,id)&&!detained(w,id)&&(ageAt(w,id)??0)>=16&&allegianceRealm(w,id)===war.defender)??powerCandidates(w,war.defender,'executive').filter(p=>p.id!==g.ruler).sort((a,b)=>(g.merit[b.id]??0)-(g.merit[a.id]??0)||a.id.localeCompare(b.id))[0]?.id??((ageAt(w,war.claimant?.person??'')??0)>=16?war.claimant?.person:undefined);}

export interface War {claimant?:ClaimantWarGoal;captureLosses?:import('./warOccupation').CaptureLoss[];territory?:{id:string;sites:string[]};peaceReviewed?:number;peaceOffer?:{from:RealmId;to:RealmId;terms:PeaceTerms;created:number;until:number;signature?:string};objective?:{side:'attack'|'defend'|null;since:number};civil?:import('./civilWars').CivilWar;goal?:'territory'|'reparations'|'tributary'|'annexation'|'defection'|'claimant';demand?:number;battles?:number;casualties?:{attack:number;defend:number};allies?:Partial<Record<RealmId,'attack'|'defend'>>;values?:Record<string,number>;disputes?:string[];id?:number;attacker:RealmId;defender:RealmId;target:string;started:number;score:number}
export function warRealmSide(war:War,r:RealmId):'attack'|'defend'|null{return r===war.attacker?'attack':r===war.defender?'defend':war.allies?.[r]??null;}
/** Old saves expose a single war until their first authoritative mutation. */
export function activeWars(w:World):War[]{return w.realm?.wars??(w.realm?.war?[w.realm.war]:[]);}
export function realmAtWar(w:World,r:RealmId){return activeWars(w).some(v=>!!warRealmSide(v,r));}
export function bilateralWar(w:World,a:RealmId,b:RealmId){return activeWars(w).find(v=>a!==b&&!v.civil&&!!warRealmSide(v,a)&&!!warRealmSide(v,b)&&warRealmSide(v,a)!==warRealmSide(v,b));}
export function ensureWars(w:World){const s=w.realm;if(!s)return;s.wars??=s.war?[s.war]:[];s.nextWarId=Math.max(s.nextWarId??1,...s.wars.map(v=>(v.id??0)+1));for(const war of s.wars){war.id??=s.nextWarId++;war.disputes??=[];if(!war.civil&&!war.values)snapshotWarValues(w,war);}s.war=s.wars[0]??null;migrateCaptureLosses(w);}
export function selectedWar(w:World,r:RealmId,id?:number){const relevant=activeWars(w).filter(v=>[v.attacker,v.defender].includes(r));return id===undefined?(relevant.length===1?relevant[0]:undefined):relevant.find(v=>v.id===id);}

export type PeaceTerms='statusQuo'|'white'|'demand'|'yield'|'annex'|'enthrone';
export interface LandCession {site:string;from:RealmId;to:RealmId}
/** Provenance is authoritative; legacy occupation is attributable only to one matching war. */
export function warOccupationSites(w:World,war:War){return Object.entries(w.realm?.cities??{}).filter(([,c])=>{
 if(war.civil||c.owner==='frontier'||c.controller==='frontier'||c.owner===c.controller)return false;
 const matches=(v:War)=>!!warRealmSide(v,c.owner as RealmId)&&!!warRealmSide(v,c.controller as RealmId)&&warRealmSide(v,c.owner as RealmId)!==warRealmSide(v,c.controller as RealmId);
 return matches(war)&&(c.occupiedByWar!==undefined?c.occupiedByWar===war.id:activeWars(w).filter(matches).length===1);
}).map(([id])=>id);}
export const territorialPeaceCostCap=100;
export const annexationPeaceCost=120;
export interface Reparation {obligation?:number;war:number;from:RealmId;to:RealmId;remaining:number;instalment:number;next:number}
/** Regional terms cost more than any single contained city while one whole region remains attainable. */
export function peaceLandCost(w:World,war:War,id:string,sites:string[]){const value=sites.reduce((n,site)=>n+peaceCostForCity(w,war,site),0),level=regionalWarTerritory(id)?.level;return level?Math.min(60,value)+(level==='province'?30:15):value;}
export function peaceQuote(w:World,war:War,actor:RealmId,terms:PeaceTerms,claims:string[]=[],extraCoins=0,landRecipient?:RealmId,returns:string[]=[]){
 const invalidClaims=!Array.isArray(claims)||claims.some(id=>typeof id!=='string');if(invalidClaims)claims=[];
 const invalidExtra=![0,100,300].includes(extraCoins),occupied=warOccupationSites(w,war);
 const invalidReturns=!Array.isArray(returns)||returns.some(id=>typeof id!=='string'||!occupied.includes(id))||new Set(returns).size!==returns.length;if(invalidReturns)returns=[];
 const abandonedClaim=war.goal==='claimant'&&!!claimantWarReason(w,war.defender,war.claimant?.patron??'',war.claimant?.person,war.claimant);
 const attacker=actor===war.attacker,enemy=attacker?war.defender:war.attacker;
 const beneficiary=terms==='yield'?enemy:actor,loser=beneficiary===war.attacker?war.defender:war.attacker;
 const beneficiarySide=warRealmSide(war,beneficiary),days=w.day-war.started;
 const legacyScore=war.civil?war.score:warScoreFor(w,war,actor),enemyWill=warWillToContinue(w,war,enemy);
 let reason=invalidClaims?'无效附加割地':invalidExtra?'无效附加赔款':invalidReturns?'归还县域须仍由本场战争占领且不能重复':!['statusQuo','white','demand','yield','annex','enthrone'].includes(terms)?'无效议和条款':!([war.attacker,war.defender] as RealmId[]).includes(actor)?'不是本场战争参与方':'';
 const enthrones=war.goal==='claimant'&&terms==='enthrone'&&beneficiary===war.attacker,enthroneExecutive=enthrones?claimantWarExecutive(w,war):undefined;
 if(!reason&&war.goal==='claimant'&&(claims.length||extraCoins||landRecipient!==undefined||!['white','yield','enthrone'].includes(terms)))reason='拥立战争只能归还占领地或明确扶立宣称者，不能吞并、割地或索取赔款';
 if(!reason&&terms==='enthrone')reason=!enthrones?'仅进攻方可提出本场拥立条件':claimantWarReason(w,war.defender,war.claimant?.patron??'',war.claimant?.person,war.claimant);
 if(!reason&&enthrones&&!enthroneExecutive)reason='目标国没有可接掌实务的自由成年人物，须先安排本国执政者';
 const annexes=!war.civil&&(terms==='annex'||war.goal==='annexation'&&['demand','yield'].includes(terms)&&beneficiary===war.attacker);
 const capitulation=annexes&&captiveCapitulation(w,beneficiary,loser);
 const annexedSites=annexes?Object.keys(w.realm!.cities).filter(id=>w.realm!.cities[id].owner===loser):[];
 const targetLand=!annexes&&!war.civil&&['demand','yield'].includes(terms)&&beneficiary===war.attacker&&['territory','defection'].includes(war.goal??'territory')?warObjectiveSites(war,w):[];
 const claimGroups=claims.map(id=>({id,sites:w.realm!.cities[id]?[id]:warTerritorySites(w,id,loser)})),claimSites=claimGroups.flatMap(c=>c.sites);
 const upgrade=claimGroups.find(c=>supersedesWarTarget(war,c.id,c.sites,targetLand)),baseLand=(upgrade?[]:targetLand).filter(id=>!returns.includes(id));
 const explicitLands=[...baseLand,...claimSites],landBeneficiary=landRecipient??beneficiary;
 const cessions:LandCession[]=!annexes&&!war.civil&&war.goal!=='claimant'&&terms!=='white'?occupied.filter(id=>!returns.includes(id)).map(site=>{const c=w.realm!.cities[site];return {site,from:c.owner as RealmId,to:warRealmSide(war,c.controller as RealmId)===beneficiarySide&&(landRecipient!==undefined||explicitLands.includes(site))?landBeneficiary:c.controller as RealmId};}):[];
 const lands=[...new Set([...explicitLands,...cessions.filter(c=>c.to===landBeneficiary).map(c=>c.site)])],takesLand=lands.length>0;if(!reason&&landRecipient!==undefined&&(warRealmSide(war,landRecipient)!==beneficiarySide||war.civil||terms!=='demand'||landRecipient!==beneficiary&&!takesLand))reason='割地受益者须为胜方实际参战国，且仅用于提出割地要求';
 if(!reason&&extraCoins&&(terms!=='demand'||war.civil))reason='赔款须由提出要求的一方列入组合和约';
 if(!reason&&claims.length){if(war.civil||terms!=='demand'||claims.length>3||new Set(claims).size!==claims.length||claimGroups.some(c=>!c.sites.length)||new Set(explicitLands).size!==explicitLands.length||claimSites.some(id=>returns.includes(id))||claimSites.some(id=>!occupied.includes(id)||w.realm!.cities[id].owner!==loser||warRealmSide(war,w.realm!.cities[id].controller as RealmId)!==beneficiarySide))reason='附加割地须为至多三项互不重叠、受益方阵营全部已占领的敌方城市或州郡';else {const allowed=new Set(Object.entries(w.realm!.cities).filter(([id,c])=>warRealmSide(war,c.controller as RealmId)===beneficiarySide&&(c.owner===landBeneficiary||lands.includes(id))).map(([id])=>id)),reached=new Set(Object.entries(w.realm!.cities).filter(([,c])=>c.owner===landBeneficiary&&c.controller===landBeneficiary).map(([id])=>id)),queue=[...reached];for(const id of queue)for(const edge of roads)if(!edge.legacyOnly&&(edge.from===id||edge.to===id)){const next=edge.from===id?edge.to:edge.from;if(allowed.has(next)&&!reached.has(next)){reached.add(next);queue.push(next);}}if(lands.some(id=>!reached.has(id)))reason='割让县域须沿受益方控制道路形成连续廊道';}}
 if(!reason&&targetLand.filter(id=>!returns.includes(id)).some(id=>w.realm!.cities[id].owner!==loser||warRealmSide(war,w.realm!.cities[id].controller as RealmId)!==beneficiarySide||!occupied.includes(id)))reason='目标地须仍属败方且全部由受益方阵营实际控制，不能要求割让';
 if(!reason&&!annexes&&['demand','yield'].includes(terms)&&war.goal==='tributary'&&beneficiary===war.attacker){let next:RealmId|undefined=beneficiary;const seen=new Set<RealmId>();while(next){if(next===loser||seen.has(next)){reason='宗属关系会形成循环，须先重议外交关系';break;}seen.add(next);next=w.diplomacy?.subjects[next];}}
 if(!reason&&annexes&&(claims.length>0||extraCoins>0||returns.length>0||landRecipient!==undefined&&landRecipient!==beneficiary))reason='吞并接管全部领土与余额，不能另加割地赔款或指定其他受益国';
 if(!reason&&(terms==='white'||terms==='statusQuo')&&(claims.length||extraCoins||landRecipient!==undefined))reason='停战仅处理占领交割，不能附加赔款、区域要求或改派受益国';
 if(!reason&&war.civil&&(returns.length||terms==='statusQuo'))reason='内战沿用交权或赦免停战';
 if(!reason&&!annexes)for(const from of new Set(cessions.map(c=>c.from))){const owned=Object.keys(w.realm!.cities).filter(id=>w.realm!.cities[id].owner===from);if(owned.length&&owned.every(id=>cessions.some(c=>c.site===id))){reason='割让全部县域须明确选择吞并政权，或归还部分县域';break;}}
 if(!reason&&annexes)reason=annexationReason(w,beneficiary,loser);
 const explicitCosts=[...(baseLand.length?[{id:war.territory?.id??war.target,sites:baseLand}]:[]),...claimGroups].map(c=>({...c,cost:peaceLandCost(w,war,c.id,c.sites)}));
 const priced=new Set(explicitCosts.flatMap(c=>c.sites));
 const landCosts=[...explicitCosts,...cessions.filter(c=>warRealmSide(war,c.to)===beneficiarySide&&!priced.has(c.site)).map(c=>({id:c.site,sites:[c.site],cost:peaceCostForCity(w,war,c.site)}))];
 const counterLandCosts=cessions.filter(c=>warRealmSide(war,c.to)!==beneficiarySide).map(c=>({id:c.site,sites:[c.site],cost:peaceCostForCity(w,war,c.site)}));
 const territoryGained=Math.min(territorialPeaceCostCap,landCosts.reduce((sum,c)=>sum+c.cost,0)),territoryLost=Math.min(territorialPeaceCostCap,counterLandCosts.reduce((sum,c)=>sum+c.cost,0));
 const goalTerms=['demand','yield'].includes(terms);
 const clauseCost=enthrones?80:annexes?annexationPeaceCost:territoryGained-territoryLost+extraCoins/10+(goalTerms&&war.goal==='tributary'&&beneficiary===war.attacker?50:0)+(goalTerms&&war.goal==='reparations'?Math.ceil((war.demand??300)/10):0);
 const acceptance=legacyScore-clauseCost-enemyWill.total;
 const parts=[{label:'战争优势',value:legacyScore},{label:'对方续战意愿',value:-enemyWill.total},{label:'条款代价',value:-clauseCost}];
 if(!reason&&!war.civil&&(terms==='demand'||terms==='annex'||terms==='enthrone'||terms==='statusQuo')&&acceptance<0)reason='对方尚不接受这些条件';
 if(!reason&&!war.civil&&(terms==='white'||terms==='statusQuo')&&!abandonedClaim&&(days<30||Math.abs(legacyScore)>20&&enemyWill.total>0))reason='对方仍希望继续交战';
 if(war.civil&&!reason)reason=civilPeaceReason(w,war,terms);
 return {enthrones,enthroneExecutive,claimant:enthrones?war.claimant?.person:null,annexes,annexedSites,capitulation,reason,parts,score:legacyScore,cost:clauseCost,acceptance,enemyWill,beneficiary,landBeneficiary,loser,takesLand,lands,landCosts,counterLandCosts,cessions,returning:occupied.filter(id=>!cessions.some(c=>c.site===id)),territoryGained,territoryLost,coins:annexes?0:extraCoins+(goalTerms&&war.goal==='reparations'?war.demand??300:0),tributary:!annexes&&goalTerms&&war.goal==='tributary'&&beneficiary===war.attacker};
}
export function peaceSignature(q:ReturnType<typeof peaceQuote>){return JSON.stringify({cessions:q.cessions,returning:q.returning,annexes:q.annexes,annexedSites:q.annexedSites,coins:q.coins,tributary:q.tributary,beneficiary:q.beneficiary,loser:q.loser,cost:q.cost,...(q.enthrones?{claimant:q.claimant,enthrones:true,enthroneExecutive:q.enthroneExecutive}:{})});}
export function advanceReparations(w:World){
 const s=w.realm;if(!s)return;
 for(const d of s.reparations??[]){if(d.obligation!==undefined)continue;
  const source='reparation:'+d.war+':'+d.from+':'+d.to;
  incurObligation(w,source,'central:'+d.from,'central:'+d.to,d.remaining,'议和分期赔款');
  const claim=w.obligations!.items.find(q=>q.source===source)!;claim.next=isMonthStart(d.next,w.scriptId)?d.next:nextMonthStart(w.day,w.scriptId);claim.instalment=d.instalment;d.obligation=claim.id;
 }
 advanceObligations(w);
}
