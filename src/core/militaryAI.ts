import {isMonthStart} from './calendar';
import {civilianFood} from './population';
import type {World} from './types';
import {activeWars,warRealmSide} from './wars';
import {realms,playerRealm,armyDailyFood,canMarchThrough} from './realm';
import {armyControls} from './civilWars';
import {armyCampaign} from './militaryCampaigns';
import {ensureArmyOrganization,readyTroops} from './armyOrganization';
import {governmentMusterReason,spendGovernmentMuster} from './government';
import {planRoute} from './world';
/** All non-player armies choose once per day using their own readiness and known objectives. */
export function advanceMilitaryAI(w:World){const s=w.realm;if(!s)return;for(const r of realms){if(r===playerRealm(w)||s.annexed?.[r])continue;const wars=activeWars(w).filter(v=>!v.civil&&!!warRealmSide(v,r));if(!wars.length)continue;const treasury=s.treasuries[r];
 const own=s.armies.filter(a=>a.realm===r),opponents=new Set(realms.filter(other=>wars.some(v=>warRealmSide(v,other)&&warRealmSide(v,other)!==warRealmSide(v,r)))),enemy=s.armies.filter(a=>opponents.has(a.realm)),underpowered=own.reduce((n,a)=>n+readyTroops(a,w.day),0)<enemy.reduce((n,a)=>n+readyTroops(a,w.day),0)*.8;
 if((!own.length&&wars.some(v=>w.day-v.started>=5)||underpowered&&isMonthStart(w.day,w.scriptId))&&own.length<16&&treasury.coins>=120&&treasury.grain>=120&&s.armies.length<48&&!governmentMusterReason(w,r)){const site=Object.keys(s.cities).filter(id=>s.cities[id].controller===r&&s.cities[id].owner===r&&s.cities[id].population>=700).sort((a,b)=>s.cities[b].population-s.cities[a].population)[0];if(site){treasury.coins-=120;treasury.grain-=120;s.cities[site].population-=600;spendGovernmentMuster(w,r);s.armies.push({realm:r,location:site,troops:600,morale:70,supply:120,journey:null,siege:0,trainingStarted:w.day,trainingUntil:w.day+30});ensureArmyOrganization(w);}}
 for(const a of s.armies.filter(a=>a.realm===r)){if(a.journey||a.withdrawalUntil||armyCampaign(w,a)||readyTroops(a,w.day)<100)continue;
 const retreat=a.supply<armyDailyFood(w,a)*2||a.morale<25||(a.arrears??0)>100,threats=Object.keys(s.cities).filter(id=>s.cities[id].owner===r&&s.cities[id].controller!==r||s.sieges?.some(v=>v.site===id&&s.cities[id].owner===r&&wars.some(war=>war.id===v.war&&((v.side==='attack'&&war.attacker!==r)||(v.side==='defend'&&war.defender!==r))))) ,targets=retreat?Object.keys(s.cities).filter(id=>armyControls(w,a,id)&&s.cities[id].grain>civilianFood(w,id)*2+30):[...threats,...wars.slice().sort((x,y)=>Number(s.cities[y.target].owner===r)-Number(s.cities[x.target].owner===r)).map(v=>v.target)];
 if(targets.includes(a.location)&&(!retreat||s.cities[a.location].grain>civilianFood(w,a.location)*2+30))continue;
 const routes=targets.map(target=>planRoute(a.location,target,id=>retreat?armyControls(w,a,id):canMarchThrough(w,r,id,target))).filter(p=>!!p).sort((a,b)=>a.days-b.days);let route=routes[0];if(!route)continue;
 if(!retreat){const target=route.route.at(-1)!,hostile=enemy.filter(e=>e.location===target&&!e.journey).reduce((n,e)=>n+readyTroops(e,w.day),0),staging=Object.keys(s.cities).filter(id=>id!==target&&s.cities[id].controller===r&&!enemy.some(e=>e.location===id&&!e.journey)&&s.cities[id].grain>civilianFood(w,id)*2+30).map(id=>({id,path:planRoute(id,target,x=>canMarchThrough(w,r,x,target))})).filter(v=>v.path).sort((x,y)=>x.path!.days-y.path!.days)[0];if(hostile>a.troops*1.25&&staging){const assembled=s.armies.filter(b=>b.realm===r&&b.location===staging.id&&!b.journey).reduce((n,b)=>n+readyTroops(b,w.day),0);if(assembled<hostile*1.1){if(a.location===staging.id)continue;route=planRoute(a.location,staging.id,id=>armyControls(w,a,id))??route;}}if(s.cities[a.location].controller===r&&a.supply<armyDailyFood(w,a)*(Math.min(30,route.days)+5)&&s.cities[a.location].grain>civilianFood(w,a.location)*2+30)continue;}
 a.journey={route:route.route,durations:route.durations,leg:0,elapsed:0,started:w.day};if(retreat){a.withdrawalUntil=w.day+route.days+1;a.morale=Math.max(0,a.morale-8);}
 }
}}
