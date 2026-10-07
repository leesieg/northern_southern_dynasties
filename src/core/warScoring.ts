import {warObjectiveSites} from './warTerritories';
import {warCaptives} from './warCaptives';
import {armyDailyFood,fortificationLevel} from './realm';
import {isCapitalSite} from './fortifications';
import type {World} from './types';
import type {RealmId} from './realm';
import {claimantWarReason,warOccupationSites,type War} from './wars';

export interface WarScorePart {key:'occupation'|'battles'|'objective'|'captives';label:string;value:number}
export interface WarWillPart {label:string;value:number}

const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const side=(war:War,realm:RealmId)=>realm===war.attacker?'attack':realm===war.defender?'defend':war.allies?.[realm]??null;

/** Values are fixed for a war so recruitment, famine or temporary prosperity cannot change its score denominator. */
export function snapshotWarValues(w:World,war:War,commit=true){
 const values:Record<string,number>={};
 for(const [id,city] of Object.entries(w.realm!.cities)){
  if(city.owner==='frontier'||!side(war,city.owner))continue;
  const fort=fortificationLevel(w,id);
  values[id]=clamp(3+Math.floor(city.population/20_000)+Math.floor(city.prosperity/25)+fort*2+(isCapitalSite(w,id)?3:0),3,15);
 }
 if(commit)war.values=values;
 return values;
}

export function includeParticipantValues(w:World,war:War){const current=snapshotWarValues(w,war,false);war.values??={};for(const [id,value] of Object.entries(current))war.values[id]??=value;}

function values(w:World,war:War){return war.values&&Object.keys(war.values).length?war.values:snapshotWarValues(w,war,false);}

export function warObjectiveControl(w:World,war:War){if(war.goal==='claimant'&&claimantWarReason(w,war.defender,war.claimant?.patron??'',war.claimant?.person,war.claimant))return null;const occupied=new Set(warOccupationSites(w,war)),sides=warObjectiveSites(war,w).map(id=>{const city=w.realm!.cities[id],owner=side(war,city.owner as RealmId),controller=side(war,city.controller as RealmId);return !owner||!controller||war.goal==='claimant'&&city.owner!==war.defender||owner!==controller&&!occupied.has(id)?null:controller;});return !sides.length?null:sides.every(s=>s==='attack')?'attack':sides.every(s=>s==='defend')?'defend':null;}
function objectiveSince(w:World,war:War){return Math.max(...warObjectiveSites(war,w).map(id=>w.realm!.cities[id].occupiedSince??w.day));}

export function warScoreBreakdown(w:World,war:War){
 const fixed=values(w,war),cities=w.realm!.cities,occupied=new Set(warOccupationSites(w,war));
 let attackTaken=0,defendTaken=0,attackTotal=0,defendTotal=0;
 for(const [id,value] of Object.entries(fixed)){
  const owner=side(war,cities[id].owner as RealmId),controller=side(war,cities[id].controller as RealmId);
  if(owner==='attack'){attackTotal+=value;if(controller==='defend'&&occupied.has(id))defendTaken+=value;}
  if(owner==='defend'){defendTotal+=value;if(controller==='attack'&&occupied.has(id))attackTaken+=value;}
 }
 const occupation=clamp(Math.round(attackTaken/Math.max(1,defendTotal)*60-defendTaken/Math.max(1,attackTotal)*60),-60,60);
 const battles=clamp(war.battles??0,-25,25),elapsed=Math.max(0,w.day-war.started);
 const targetSide=warObjectiveControl(w,war),attackHolds=targetSide==='attack';
 const objective=targetSide===null?0:attackHolds?Math.min(25,5+Math.floor(Math.max(0,w.day-(war.objective?.side==='attack'?war.objective.since:objectiveSince(w,war)))/10)):Math.max(-25,-Math.floor(Math.max(0,(war.objective?.side==='defend'?w.day-war.objective.since:elapsed)-30)/10));
 const parts:WarScorePart[]=[
  {key:'occupation',label:'领土占领',value:occupation},
  {key:'battles',label:'野战成果',value:battles},
  {key:'captives',label:'关键人物被俘',value:clamp(warCaptives(w,war).reduce((n,p)=>n+p.score,0),-60,60)},
  {key:'objective',label:attackHolds?'战争目标持续控制':targetSide===null?'目标未完整控制':'守方阻止战争目标',value:objective},
 ];
 const attackAlive=w.realm!.armies.some(a=>side(war,a.realm)==='attack'&&a.troops>=100);
 const defendAlive=w.realm!.armies.some(a=>side(war,a.realm)==='defend'&&a.troops>=100);
 const allAttackLost=Object.entries(cities).filter(([,c])=>side(war,c.owner as RealmId)==='attack').every(([id,c])=>side(war,c.controller as RealmId)==='defend'&&occupied.has(id));
 const allDefendLost=Object.entries(cities).filter(([,c])=>side(war,c.owner as RealmId)==='defend').every(([id,c])=>side(war,c.controller as RealmId)==='attack'&&occupied.has(id));
 const decisive=defendTotal>0&&allDefendLost&&!defendAlive?100:attackTotal>0&&allAttackLost&&!attackAlive?-100:null;
 return {parts,total:decisive??clamp(parts.reduce((sum,part)=>sum+part.value,0),-99,99),decisive:decisive!==null};
}

export function updateWarScore(w:World,war:War){const current=warObjectiveControl(w,war);if(!war.objective||war.objective.side!==current)war.objective={side:current,since:war.objective?w.day:current==='attack'?(objectiveSince(w,war)):war.started};war.score=warScoreBreakdown(w,war).total;return war.score;}

export function warScoreFor(w:World,war:War,realm:RealmId){const score=warScoreBreakdown(w,war).total;return side(war,realm)==='attack'?score:side(war,realm)==='defend'?-score:0;}

/** Positive means this participant still has practical reasons and means to continue. */
export function warWillToContinue(w:World,war:War,realm:RealmId){
 const ownSide=side(war,realm),enemySide=ownSide==='attack'?'defend':'attack';
 const own=w.realm!.armies.filter(a=>a.realm===realm&&side(war,a.realm)===ownSide&&!(w.militaryCampaigns?.items.some(q=>q.status==='active'&&q.army===a.id&&q.war!==war.id))),enemy=w.realm!.armies.filter(a=>side(war,a.realm)===enemySide);
 const strength=(armies:typeof own)=>armies.reduce((sum,a)=>sum+a.troops*Math.max(.2,a.morale/100),0);
 const ownStrength=strength(own),enemyStrength=strength(enemy),treasury=w.realm!.treasuries[realm];
 const lowSupply=own.filter(a=>a.supply<armyDailyFood(w,a)*5).length;
 const arrears=own.reduce((sum,a)=>sum+(a.arrears??0),0);
 const otherFronts=Math.max(0,w.realm!.wars?.filter(v=>v!==war&&side(v,realm)).length??0);
 const score=warScoreFor(w,war,realm);
 // Current operations provide a bounded opportunity to finish, never a permanent war lock.
 const recentWin=w.militaryAftermath?.battles.some(b=>b.war===war.id&&b.ended!==undefined&&w.day-b.ended<=30&&b.winner===ownSide);
 const siege=w.realm!.sieges?.some(v=>v.war===war.id&&v.side===ownSide&&(v.blockade??0)>=100&&v.progress>0&&w.day-(v.started??war.started)<=120&&own.some(a=>a.location===v.site&&!a.journey&&a.supply>0&&a.troops>=100));
 const advance=own.some(a=>a.journey&&warObjectiveSites(war,w).includes(a.journey.route.at(-1)??'')&&w.day-a.journey.started<=60&&a.supply>=armyDailyFood(w,a)*5&&a.morale>=40&&!a.withdrawalUntil);
 const parts:WarWillPart[]=[
  {label:'有力维持战争目标',value:ownStrength>=600&&treasury.coins>=200&&arrears===0&&lowSupply===0?10:0},
  {label:'近期战役胜利',value:recentWin?8:0},
  {label:'有效围城推进',value:siege?12:0},
  {label:'目标方向行军',value:advance?4:0},
  {label:'当前军事形势',value:clamp(Math.round(score/4),-25,25)},
  {label:'尚可投入军力',value:clamp(Math.round((ownStrength-enemyStrength)/250),-15,15)},
  {label:'公库续战能力',value:clamp(Math.floor((treasury.coins-200)/100),-12,10)},
  {label:'欠饷压力',value:-Math.min(15,Math.ceil(arrears/100)*3)},
  {label:'前线缺粮',value:-Math.min(15,lowSupply*5)},
  {label:'战争延续',value:-Math.min(30,Math.floor((w.day-war.started)/30)*2)},
  {label:'其他战线',value:-Math.min(15,otherFronts*5)},
 ];
 return {parts,total:parts.reduce((sum,part)=>sum+part.value,0)};
}

export function peaceCostForCity(w:World,war:War,site:string){return clamp(Math.round((values(w,war)[site]??8)*2.5),10,35);}
