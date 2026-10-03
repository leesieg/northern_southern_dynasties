import {getPerson} from './personRegistry';
import {detained} from './custodyState';
import type {World,Journey} from './types';
import type {Envoy,DiplomacyAction} from './diplomacy';
import {civilCanAdmin,civilWar} from './civilWars';
import {atWar,canEnter,diplomaticScore} from './diplomacy';
import {capital,type RealmId} from './realm';
import {personResidence} from './residence';
import {officeCandidates,allegianceRealm} from './officeEligibility';
import {ageAt,isAlive,lifeOf} from './lifeState';
import {serviceBusy} from './assignments';

import {attributes} from './social';
import {planRoute} from './world';
export const needsEnvoy=(action:string)=>!['insult','revoke','independence'].includes(action);
export function envoyRoute(w:World,id:string,from:RealmId,to:RealmId,destination=capital(to,w)){
 const origin=personResidence(w,id).site;if(origin===destination)return {route:[origin],durations:[],days:0,food:0,distance:0};
 return planRoute(origin,destination,site=>{const owner=w.realm!.cities[site].controller;return owner===from?civilCanAdmin(w,id,site):owner===to&&!atWar(w,from,to)||owner!=='frontier'&&canEnter(w,from,owner,id);});
}
export function envoyReason(w:World,id:string,from:RealmId,to:RealmId,actor?:string){
 if(actor&&civilWar(w,from)&&civilWar(w,from)!.civil!.supporters.includes(id)!==civilWar(w,from)!.civil!.supporters.includes(actor))return '使者不属于请求方实际阵营';
 if(!id||!isAlive(w,id)||allegianceRealm(w,id)!==from||!w.mobility?.residences[id])return '须选择本国在世人物';
 if((ageAt(w,id)??( getPerson(w,id)?.adult?18:0))<16)return '使者须成年';
 if(lifeOf(w,id)?.illness?.severity===3)return '重病期间不能出使';
 if(personResidence(w,id).traveling||serviceBusy(w,id)||w.realm?.offices.some(o=>o.candidate===id))return '此人正在出行或办理事务';
 if(detained(w,id))return '被拘押期间不能出使';
 if(w.realm?.cities[capital(to,w)].controller!==to)return '对方首都失守，无法接见';
 if(!envoyRoute(w,id,from,to))return '没有可通行的使节路线';
 return '';
}
export function defaultEnvoy(w:World,from:RealmId,to:RealmId,actor?:string){return officeCandidates(w,from).find(p=>!envoyReason(w,p.id,from,to,actor))?.id;}
export function envoyCandidates(w:World,from:RealmId,to:RealmId,actor?:string){return officeCandidates(w,from).map(p=>({id:p.id,score:attributes(w,p.id).diplomacy,reason:envoyReason(w,p.id,from,to,actor)})).sort((a,b)=>Number(!!a.reason)-Number(!!b.reason)||b.score-a.score);}
export function envoyEstimate(w:World,id:string,from:RealmId,to:RealmId,action:DiplomacyAction,threshold:number){
 const skill=attributes(w,id).diplomacy,days=envoyRoute(w,id,from,to)?.days??0,negotiation=Math.max(2,14-Math.floor(skill/2)),score=diplomaticScore(w,from,to).filter(p=>p.label!=='外交能力').reduce((n,p)=>n+p.value,0)+skill;
 return {skill,score,travel:days,negotiation,days:days+negotiation,chance:action==='improve'?100:Math.max(5,Math.min(95,50+(score-threshold)*2))};
}
export function missionJourney(w:World,id:string):Journey|null{return id===w.characterId?w.people[0].journey:w.mobility?.residences[id]?.journey??null;}
function setJourney(w:World,id:string,j:Journey|null){if(id===w.characterId)w.people[0].journey=j;else if(w.mobility?.residences[id])w.mobility.residences[id].journey=j;}
export function startEnvoyJourney(w:World,m:Envoy,destination:string){const p=envoyRoute(w,m.envoy!,m.from,m.to,destination);if(!p)return false;setJourney(w,m.envoy!,p.durations.length?{route:p.route,durations:p.durations,leg:0,elapsed:0,started:w.day}:null);return true;}
export function advanceEnvoyJourney(w:World,m:Envoy){
 if(m.lastTravel===w.day)return true;m.lastTravel=w.day;
 const id=m.envoy!,j=missionJourney(w,id);if(!j)return true;
 const next=j.route[j.leg+1],owner=w.realm!.cities[next].controller;
 if(owner==='frontier'||owner===m.from&&!civilCanAdmin(w,id,next)||owner!==m.from&&(atWar(w,m.from,owner)||owner!==m.to&&!canEnter(w,m.from,owner,id))){setJourney(w,id,null);return false;}
 j.elapsed++;if(j.elapsed>=j.durations[j.leg]){const site=j.route[++j.leg];if(id===w.characterId)w.people[0].location=site;else w.mobility!.residences[id].site=site;j.elapsed=0;if(j.leg===j.durations.length)setJourney(w,id,null);}return true;
}
export function stopEnvoy(w:World,m:Envoy){if(m.envoy)setJourney(w,m.envoy,null);}
