import {mobilizedTransportLabor} from './armyLogistics';
import {isMonthStart} from './calendar';
import {civilianFood} from './population';
import type {World} from './types';
import {activeWars,warRealmSide} from './wars';
import {realms,capital,playerRealm,armyDailyFood,canMarchThrough} from './realm';
import {armyControls} from './civilWars';
import {armyCampaign} from './militaryCampaigns';
import {ensureArmyOrganization,readyTroops} from './armyOrganization';
import {governmentMusterReason,spendGovernmentMuster} from './government';
import {planRoute} from './world';
import {appointAICommanders} from './realmStrategy';
import {governingExecutives} from './government';
/** All non-player armies choose once per day using their own readiness and known objectives. */
export function advanceMilitaryAI(w:World){const s=w.realm;if(!s)return;for(const r of realms){if(s.annexed?.[r])continue;const playerExecutive=r===playerRealm(w)&&governingExecutives(w,r).includes(w.characterId!);const wars=activeWars(w).filter(v=>!v.civil&&!!warRealmSide(v,r));if(!wars.length)continue;const treasury=s.treasuries[r];
 const own=s.armies.filter(a=>a.realm===r),opponents=new Set(realms.filter(other=>wars.some(v=>warRealmSide(v,other)&&warRealmSide(v,other)!==warRealmSide(v,r)))),enemy=s.armies.filter(a=>opponents.has(a.realm)),underpowered=own.reduce((n,a)=>n+readyTroops(a,w.day),0)<enemy.reduce((n,a)=>n+readyTroops(a,w.day),0)*.8;
 if(!playerExecutive&&(!own.length&&wars.some(v=>w.day-v.started>=5)||underpowered&&isMonthStart(w.day,w.scriptId))&&own.length<16&&treasury.coins>=120&&governingExecutives(w,r).length>0&&s.armies.length<48&&!governmentMusterReason(w,r)){const site=Object.keys(s.cities).filter(id=>s.cities[id].controller===r&&s.cities[id].owner===r&&s.cities[id].population-mobilizedTransportLabor(w,id)>=700&&(id===capital(r)?treasury.grain:s.cities[id].grain)>=120).sort((a,b)=>s.cities[b].population-s.cities[a].population)[0];if(site){treasury.coins-=120;if(site===capital(r))treasury.grain-=120;else s.cities[site].grain-=120;s.cities[site].population-=600;spendGovernmentMuster(w,r);s.armies.push({realm:r,location:site,troops:600,morale:70,supply:120,journey:null,siege:0,trainingStarted:w.day,trainingUntil:w.day+30});ensureArmyOrganization(w);}}
 if(!playerExecutive)appointAICommanders(w,r);
 for(const a of s.armies.filter(a=>a.realm===r)){if(a.automation==='direct'||w.mobility?.pendingCommanders?.[a.id!]||a.journey||a.withdrawalUntil||armyCampaign(w,a)||readyTroops(a,w.day)<100)continue;
 const retreat=a.supply<armyDailyFood(w,a)*2||a.morale<25||(a.arrears??0)>100,threats=Object.keys(s.cities).filter(id=>s.cities[id].owner===r&&s.cities[id].controller!==r||s.sieges?.some(v=>v.site===id&&s.cities[id].owner===r&&wars.some(war=>war.id===v.war&&((v.side==='attack'&&war.attacker!==r)||(v.side==='defend'&&war.defender!==r))))) ,targets=retreat?Object.keys(s.cities).filter(id=>armyControls(w,a,id)&&s.cities[id].grain>civilianFood(w,id)*2+30):[...threats,...wars.slice().sort((x,y)=>Number(s.cities[y.target].owner===r)-Number(s.cities[x.target].owner===r)).map(v=>v.target)];
 const reserve=defensiveReserve(w,r);if(!playerExecutive&&!retreat&&!threats.length&&own.length>=2&&a===reserve&&s.cities[a.location].controller===r&&wars.some(v=>v.attacker===r))continue;
 if(targets.includes(a.location)&&(!retreat||s.cities[a.location].grain>civilianFood(w,a.location)*2+30))continue;
 const routes=targets.map(target=>planRoute(a.location,target,id=>retreat?armyControls(w,a,id):canMarchThrough(w,r,id,target))).filter(p=>!!p).sort((a,b)=>a.days-b.days);let route=routes[0];if(!route)continue;
 if(!retreat){const target=route.route.at(-1)!,hostile=enemy.filter(e=>e.location===target&&!e.journey).reduce((n,e)=>n+readyTroops(e,w.day),0),staging=Object.keys(s.cities).filter(id=>id!==target&&s.cities[id].controller===r&&!enemy.some(e=>e.location===id&&!e.journey)&&s.cities[id].grain>civilianFood(w,id)*2+30).map(id=>({id,path:planRoute(id,target,x=>canMarchThrough(w,r,x,target))})).filter(v=>v.path).sort((x,y)=>x.path!.days-y.path!.days)[0];if(hostile>a.troops*1.25&&staging){const assembled=s.armies.filter(b=>b.realm===r&&b.location===staging.id&&!b.journey).reduce((n,b)=>n+readyTroops(b,w.day),0);if(assembled<hostile*1.1){if(a.location===staging.id)continue;route=planRoute(a.location,staging.id,id=>armyControls(w,a,id))??route;}}if(s.cities[a.location].controller===r&&a.supply<armyDailyFood(w,a)*(Math.min(30,route.days)+5)&&s.cities[a.location].grain>civilianFood(w,a.location)*2+30)continue;}
 a.journey={route:route.route,durations:route.durations,leg:0,elapsed:0,started:w.day};if(retreat){a.withdrawalUntil=w.day+route.days+1;a.morale=Math.max(0,a.morale-8);}
 }
}}

/** Paid peacetime preparation uses the same population, grain and muster constraints. */
export function mobilizeRealm(w:World,r:typeof realms[number],site:string){
 const s=w.realm!,c=s.cities[site],t=s.treasuries[r];if(!c||c.owner!==r||c.controller!==r||s.armies.length>=48||s.armies.filter(a=>a.realm===r).length>=16||c.population-mobilizedTransportLabor(w,site)<700||t.coins<120||(site===capital(r)?t.grain:c.grain)<120||governmentMusterReason(w,r))return false;
 t.coins-=120;if(site===capital(r))t.grain-=120;else c.grain-=120;c.population-=600;spendGovernmentMuster(w,r);s.armies.push({realm:r,location:site,troops:600,morale:70,supply:120,journey:null,siege:0,automation:'delegated',trainingStarted:w.day,trainingUntil:w.day+30});ensureArmyOrganization(w);return true;
}

export function defensiveReserve(w:World,r:typeof realms[number]){return w.realm!.armies.filter(a=>a.realm===r&&!a.owner&&!a.journey&&!(a.arrears??0)&&readyTroops(a,w.day)>=100).sort((a,b)=>Number(b.location===capital(r))-Number(a.location===capital(r))||a.id!-b.id!)[0];}
