import {recruitmentSources,consumeManpower,recruitmentRegiments} from './manpower';
import {warObjectiveSites} from './warTerritories';
import {localBalance,spendLocal,fiscalPath} from './treasury';
import {governingAuthority} from './government';
import {worldRealms} from './polityRuntime';
import {mobilizedTransportLabor} from './armyLogistics';
import {isMonthStart} from './calendar';
import {civilianFood} from './population';
import type {World} from './types';
import {activeWars,warRealmSide} from './wars';
import {capital,playerRealm,armyDailyFood,canMarchThrough} from './realm';
import {armyControls,warArmySide,armiesHostile,civilWar} from './civilWars';
import {armyCampaign} from './militaryCampaigns';
import {ensureArmyOrganization,readyTroops} from './armyOrganization';
import {governmentMusterReason,spendGovernmentMuster} from './government';
import {planRoute} from './world';
import {appointAICommanders} from './realmStrategy';
import {governingExecutives} from './government';
/** All non-player armies choose once per day using their own readiness and known objectives. */
export function advanceMilitaryAI(w:World){const s=w.realm;if(!s)return;for(const r of worldRealms(w)){if(s.annexed?.[r])continue;const playerExecutive=r===playerRealm(w)&&governingExecutives(w,r).includes(w.characterId!);const wars=activeWars(w).filter(v=>!!warRealmSide(v,r));if(!wars.length)continue;const treasury=s.treasuries[r];
 const internal=civilWar(w,r);if(internal&&internal.civil!.loyalist!==w.characterId&&!s.armies.some(a=>a.realm===r&&warArmySide(w,internal,a)==='defend')){const localOnly=internal.civil!.supporters.includes(governingAuthority(w,r)),site=Object.keys(s.cities).filter(id=>s.cities[id].owner===r&&s.cities[id].controller===r&&!internal.civil!.cities.includes(id)&&s.cities[id].population-mobilizedTransportLabor(w,id)>=700&&s.cities[id].grain>=120&&(!localOnly||localBalance(w,id)>=120)).sort((a,b)=>s.cities[b].population-s.cities[a].population)[0];if(site)mobilizeRealm(w,r,site,localOnly);}
 const own=s.armies.filter(a=>a.realm===r),opponents=new Set(worldRealms(w).filter(other=>wars.some(v=>warRealmSide(v,other)&&warRealmSide(v,other)!==warRealmSide(v,r)))),enemy=s.armies.filter(a=>opponents.has(a.realm)),reserve=defensiveReserve(w,r),offensive=wars.filter(v=>v.attacker===r&&warObjectiveSites(v,w).some(id=>warRealmSide(v,s.cities[id].controller as typeof r)!=='attack')),required=Math.max(0,...offensive.map(v=>enemy.filter(a=>warObjectiveSites(v,w).includes(a.location)&&!a.journey).reduce((n,a)=>n+readyTroops(a,w.day),0)*1.1)),field=own.filter(a=>a!==reserve&&a.automation!=='direct'&&!a.withdrawalUntil&&!armyCampaign(w,a)),underpowered=field.reduce((n,a)=>n+a.troops,0)<required||own.reduce((n,a)=>n+a.troops,0)<enemy.reduce((n,a)=>n+readyTroops(a,w.day),0)*.8;
 if(!civilWar(w,r)&&!playerExecutive&&(!own.length&&wars.some(v=>w.day-v.started>=5)||underpowered&&isMonthStart(w.day,w.scriptId))&&own.length<16&&treasury.coins>=120&&governingExecutives(w,r).length>0&&s.armies.length<48&&!governmentMusterReason(w,r)){const site=Object.keys(s.cities).filter(id=>s.cities[id].controller===r&&s.cities[id].owner===r&&s.cities[id].population-mobilizedTransportLabor(w,id)>=700&&(id===capital(r,w)?treasury.grain:s.cities[id].grain)>=120).sort((a,b)=>s.cities[b].population-s.cities[a].population)[0];if(site)mobilizeRealm(w,r,site);}
 if(!playerExecutive)appointAICommanders(w,r);
 for(const a of s.armies.filter(a=>a.realm===r)){if(a.automation==='direct'||w.mobility?.pendingCommanders?.[a.id!]||a.journey||a.withdrawalUntil||armyCampaign(w,a)||readyTroops(a,w.day)<100)continue;
 const armyWars=wars.filter(v=>!!warArmySide(w,v,a)),armyEnemy=s.armies.filter(b=>b!==a&&armiesHostile(w,a,b));const retreat=a.supply<armyDailyFood(w,a)*2||a.morale<25||(a.arrears??0)>100,threats=Object.keys(s.cities).filter(id=>s.cities[id].owner===r&&!armyControls(w,a,id)||s.sieges?.some(v=>v.site===id&&armyWars.some(war=>war.id===v.war&&warArmySide(w,war,a)!==v.side))) ,targets=retreat?Object.keys(s.cities).filter(id=>armyControls(w,a,id)&&s.cities[id].grain>civilianFood(w,id)*2+30):[...threats,...armyWars.slice().sort((x,y)=>Number(s.cities[y.target].owner===r)-Number(s.cities[x.target].owner===r)).flatMap(v=>v.civil?[warArmySide(w,v,a)==='attack'?v.target:v.civil.base]:v.territory||v.goal==='annexation'?warObjectiveSites(v,w).filter(id=>!armyControls(w,a,id)):[v.target])];
 if(!playerExecutive&&!retreat&&!threats.length&&own.length>=2&&a===reserve&&s.cities[a.location].controller===r&&wars.some(v=>v.attacker===r))continue;
 if(targets.includes(a.location)&&(!retreat||s.cities[a.location].grain>civilianFood(w,a.location)*2+30))continue;
 const routes=targets.map(target=>planRoute(a.location,target,id=>retreat?armyControls(w,a,id):canMarchThrough(w,r,id,target,a))).filter(p=>!!p).sort((a,b)=>a.days-b.days);let route=routes[0];if(!route)continue;
 if(!retreat){const target=route.route.at(-1)!,hostile=armyEnemy.filter(e=>e.location===target&&!e.journey).reduce((n,e)=>n+readyTroops(e,w.day),0),staging=Object.keys(s.cities).filter(id=>id!==target&&armyControls(w,a,id)&&!armyEnemy.some(e=>e.location===id&&!e.journey)&&s.cities[id].grain>civilianFood(w,id)*2+30).map(id=>({id,path:planRoute(id,target,x=>canMarchThrough(w,r,x,target,a))})).filter(v=>v.path).sort((x,y)=>x.path!.days-y.path!.days)[0];if(hostile>a.troops*1.25&&staging){const assembled=s.armies.filter(b=>b.realm===r&&!armiesHostile(w,a,b)&&b.automation!=='direct'&&!b.withdrawalUntil&&!armyCampaign(w,b)&&!w.mobility?.pendingCommanders?.[b.id!]&&(playerExecutive||threats.length>0||!wars.some(v=>v.attacker===r)||b!==reserve)&&((b.location===staging.id&&!b.journey)||b.journey?.route.at(-1)===target)).reduce((n,b)=>n+readyTroops(b,w.day),0);if(assembled<hostile*1.1){if(a.location===staging.id)continue;route=planRoute(a.location,staging.id,id=>armyControls(w,a,id))??route;}}if(armyControls(w,a,a.location)&&a.supply<armyDailyFood(w,a)*(Math.min(30,route.days)+5)&&s.cities[a.location].grain>civilianFood(w,a.location)*2+30)continue;}
 a.journey={route:route.route,durations:route.durations,leg:0,elapsed:0,started:w.day};if(retreat){a.withdrawalUntil=w.day+route.days+1;a.morale=Math.max(0,a.morale-8);}
 }
}}

/** Paid peacetime preparation uses the same population, grain and muster constraints. */
export function mobilizeRealm(w:World,r:import('./realm').RealmId,site:string,localOnly=false){
 const s=w.realm!,c=s.cities[site],t=s.treasuries[r],sources=recruitmentSources(w,site,600);if(sources.reason||!c||c.owner!==r||c.controller!==r||s.armies.length>=48||s.armies.filter(a=>a.realm===r).length>=16||c.population-mobilizedTransportLabor(w,site)<700||(localOnly?localBalance(w,site):t.coins)<120||(!localOnly&&site===capital(r,w)?t.grain:c.grain)<120||governmentMusterReason(w,r))return false;
 if(localOnly)spendLocal(w,site,120,'地方守军实际征募');else t.coins-=120;if(!localOnly&&site===capital(r,w))t.grain-=120;else c.grain-=120;consumeManpower(w,site,sources.parts);spendGovernmentMuster(w,r);ensureArmyOrganization(w);const id=s.nextArmyId!++;s.armies.push({id,regiments:recruitmentRegiments(sources.parts,id,site),realm:r,location:site,troops:600,morale:70,supply:120,journey:null,siege:0,...(localOnly?{payer:fiscalPath(w,site)[0]}:{}),automation:'delegated',trainingStarted:w.day,trainingUntil:w.day+30});ensureArmyOrganization(w);return true;
}

export function defensiveReserve(w:World,r:import('./realm').RealmId){return w.realm!.armies.filter(a=>a.realm===r&&!a.owner&&!a.journey&&!(a.arrears??0)&&readyTroops(a,w.day)>=100).sort((a,b)=>Number(b.location===capital(r,w))-Number(a.location===capital(r,w))||a.id!-b.id!)[0];}
