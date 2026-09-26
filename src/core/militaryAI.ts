import {civilianFood} from './population';
import type {World} from './types';
import {activeWars} from './wars';
import {realms,playerRealm} from './realm';
import {armyControls} from './civilWars';
import {armyCampaign} from './militaryCampaigns';
import {ensureArmyOrganization} from './armyOrganization';
import {governmentMusterReason,spendGovernmentMuster} from './government';
import {canEnter} from './diplomacy';
import {planRoute} from './world';
/** All non-player armies choose once per day using their own readiness and known objectives. */
export function advanceMilitaryAI(w:World){const s=w.realm;if(!s)return;for(const r of realms){if(r===playerRealm(w)||s.annexed?.[r])continue;const wars=activeWars(w).filter(v=>!v.civil&&[v.attacker,v.defender].includes(r));if(!wars.length)continue;const treasury=s.treasuries[r];
 if(!s.armies.some(a=>a.realm===r)&&treasury.coins>=120&&treasury.grain>=120&&s.armies.length<48&&!governmentMusterReason(w,r)&&wars.some(v=>w.day-v.started>=5)){const site=Object.keys(s.cities).filter(id=>s.cities[id].controller===r&&s.cities[id].owner===r&&s.cities[id].population>=700).sort((a,b)=>s.cities[b].population-s.cities[a].population)[0];if(site){treasury.coins-=120;treasury.grain-=120;s.cities[site].population-=600;spendGovernmentMuster(w,r);s.armies.push({realm:r,location:site,troops:600,morale:70,supply:120,journey:null,siege:0,trainingStarted:w.day,trainingUntil:w.day+30});ensureArmyOrganization(w);}}
 for(const a of s.armies.filter(a=>a.realm===r)){if(a.journey||a.withdrawalUntil||armyCampaign(w,a)||(a.trainingUntil??0)>w.day)continue;
 const retreat=a.supply<5||a.morale<25||(a.arrears??0)>100,targets=retreat?Object.keys(s.cities).filter(id=>armyControls(w,a,id)&&s.cities[id].grain>civilianFood(w,id)*2+30):wars.slice().sort((x,y)=>Number(s.cities[y.target].owner===r)-Number(s.cities[x.target].owner===r)).map(v=>v.target);
 if(targets.includes(a.location)&&(!retreat||s.cities[a.location].grain>civilianFood(w,a.location)*2+30))continue;
 const routes=targets.map(target=>planRoute(a.location,target,id=>retreat?armyControls(w,a,id):canEnter(w,r,s.cities[id].controller,undefined,true))).filter(p=>!!p).sort((a,b)=>a.days-b.days),route=routes[0];if(!route)continue;a.journey={route:route.route,durations:route.durations,leg:0,elapsed:0,started:w.day};if(retreat){a.withdrawalUntil=w.day+route.days+1;a.morale=Math.max(0,a.morale-8);}
 }
}}
