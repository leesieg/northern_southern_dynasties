import {armyDailyFood} from './realm';
import {siteById} from '../data/scenario';
import type {World} from './types';
import type {RealmId} from './realm';
import type {War} from './wars';

export interface WarScorePart {key:'occupation'|'battles'|'objective';label:string;value:number}
export interface WarWillPart {label:string;value:number}

const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const side=(war:War,realm:RealmId)=>realm===war.attacker?'attack':realm===war.defender?'defend':war.allies?.[realm]??null;

/** Values are fixed for a war so recruitment, famine or temporary prosperity cannot change its score denominator. */
export function snapshotWarValues(w:World,war:War,commit=true){
 const values:Record<string,number>={};
 for(const [id,city] of Object.entries(w.realm!.cities)){
  if(city.owner==='frontier'||!side(war,city.owner))continue;
  const fort=city.fortification?.level??(siteById[id].capital||id==='luoyang'?1:0);
  values[id]=clamp(3+Math.floor(city.population/20_000)+Math.floor(city.prosperity/25)+fort*2+(siteById[id].capital?3:0),3,15);
 }
 if(commit)war.values=values;
 return values;
}

export function includeParticipantValues(w:World,war:War){const current=snapshotWarValues(w,war,false);war.values??={};for(const [id,value] of Object.entries(current))war.values[id]??=value;}

function values(w:World,war:War){return war.values&&Object.keys(war.values).length?war.values:snapshotWarValues(w,war,false);}

export function warScoreBreakdown(w:World,war:War){
 const fixed=values(w,war),cities=w.realm!.cities;
 let attackTaken=0,defendTaken=0,attackTotal=0,defendTotal=0;
 for(const [id,value] of Object.entries(fixed)){
  const owner=side(war,cities[id].owner as RealmId),controller=side(war,cities[id].controller as RealmId);
  if(owner==='attack'){attackTotal+=value;if(controller==='defend')defendTaken+=value;}
  if(owner==='defend'){defendTotal+=value;if(controller==='attack')attackTaken+=value;}
 }
 const occupation=clamp(Math.round(attackTaken/Math.max(1,defendTotal)*60-defendTaken/Math.max(1,attackTotal)*60),-60,60);
 const battles=clamp(war.battles??0,-25,25),target=cities[war.target],elapsed=Math.max(0,w.day-war.started);
 const targetSide=side(war,target.controller as RealmId),attackHolds=targetSide==='attack';
 const objective=targetSide===null?0:attackHolds?Math.min(25,5+Math.floor(Math.max(0,w.day-(war.objective?.side==='attack'?war.objective.since:target.occupiedSince??w.day))/10)):Math.max(-25,-Math.floor(Math.max(0,(war.objective?.side==='defend'?w.day-war.objective.since:elapsed)-30)/10));
 const parts:WarScorePart[]=[
  {key:'occupation',label:'领土占领',value:occupation},
  {key:'battles',label:'野战成果',value:battles},
  {key:'objective',label:attackHolds?'战争目标持续控制':'守方阻止战争目标',value:objective},
 ];
 const attackAlive=w.realm!.armies.some(a=>side(war,a.realm)==='attack'&&a.troops>=100);
 const defendAlive=w.realm!.armies.some(a=>side(war,a.realm)==='defend'&&a.troops>=100);
 const allAttackLost=Object.entries(cities).filter(([,c])=>side(war,c.owner as RealmId)==='attack').every(([,c])=>side(war,c.controller as RealmId)==='defend');
 const allDefendLost=Object.entries(cities).filter(([,c])=>side(war,c.owner as RealmId)==='defend').every(([,c])=>side(war,c.controller as RealmId)==='attack');
 const decisive=defendTotal>0&&allDefendLost&&!defendAlive?100:attackTotal>0&&allAttackLost&&!attackAlive?-100:null;
 return {parts,total:decisive??clamp(parts.reduce((sum,part)=>sum+part.value,0),-99,99),decisive:decisive!==null};
}

export function updateWarScore(w:World,war:War){const current=side(war,w.realm!.cities[war.target].controller as RealmId);if(!war.objective||war.objective.side!==current)war.objective={side:current,since:war.objective?w.day:current==='attack'?(w.realm!.cities[war.target].occupiedSince??w.day):war.started};war.score=warScoreBreakdown(w,war).total;return war.score;}

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
 const parts:WarWillPart[]=[
  {label:'当前军事形势',value:clamp(Math.round(score/4),-25,25)},
  {label:'尚可投入军力',value:clamp(Math.round((ownStrength-enemyStrength)/250),-15,15)},
  {label:'公库续战能力',value:clamp(Math.floor((treasury.coins-200)/100),-12,10)},
  {label:'欠饷压力',value:-Math.min(15,Math.ceil(arrears/100)*3)},
  {label:'前线缺粮',value:-Math.min(15,lowSupply*5)},
  {label:'战争延续',value:-Math.min(20,Math.floor((w.day-war.started)/30)*2)},
  {label:'其他战线',value:-Math.min(15,otherFronts*5)},
 ];
 return {parts,total:parts.reduce((sum,part)=>sum+part.value,0)};
}

export function peaceCostForCity(w:World,war:War,site:string){return clamp(Math.round((values(w,war)[site]??8)*2.5),10,35);}
