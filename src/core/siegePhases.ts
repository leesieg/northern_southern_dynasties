import type {World} from './types';
import type {Army,Siege} from './realm';
import {fortificationLevel,occupyCity,syncGovernance} from './realm';
import {activeWars} from './wars';
import {warArmySide} from './civilWars';
import {armyCommander} from './mobility';
import {attributes,traitsFor} from './social';
import {civilianFood} from './population';
import {siteById} from '../data/scenario';
export type SiegeDecisionCommand={type:'siegeDecision';war:number;site:string;choice:'hold'|'surrender'};
export function siegeDecisionReason(w:World,c:SiegeDecisionCommand){const s=w.realm?.sieges?.find(s=>s.war===c.war&&s.site===c.site);return !s?.playerDecision?'没有待裁定的围城议降':w.realm?.cities[c.site].governor!==w.characterId?'须守城主官亲自裁定':!['hold','surrender'].includes(c.choice)?'无效裁定':'';}
export function actSiegeDecision(w:World,c:SiegeDecisionCommand){const why=siegeDecisionReason(w,c);if(why)throw new Error(why);const s=w.realm!.sieges!.find(s=>s.war===c.war&&s.site===c.site)!;delete s.playerDecision;if(c.choice==='hold'){s.event='主官决定继续坚守';s.nextPhase=w.day+14;w.realm!.cities[c.site].order=Math.max(0,w.realm!.cities[c.site].order-5);return;}const war=activeWars(w).find(v=>v.id===s.war)!;if(war.civil){if(s.side==='attack'&&!war.civil.cities.includes(s.site))war.civil.cities.push(s.site);else if(s.side==='defend')war.civil.cities=war.civil.cities.filter(id=>id!==s.site);}else occupyCity(w,war,s.site,s.side==='attack'?war.attacker:war.defender);w.realm!.sieges=w.realm!.sieges!.filter(v=>v!==s);for(const a of w.realm!.armies)if(a.location===s.site)a.siege=0;syncGovernance(w);}
/** Stage chances are gameplay parameters. No independent, invented garrison troop pool. */
export function siegePhaseQuote(w:World,s:Siege,armies:Army[]){const city=w.realm!.cities[s.site],fort=fortificationLevel(w,s.site),troops=armies.reduce((n,a)=>n+(a.supply>0&&a.morale>=20?a.troops:0),0),required=200+fort*200+Math.ceil(city.population/500),blockade=Math.min(100,Math.floor(troops/required*100));
 const leader=armies.map(a=>armyCommander(w,a)).filter((id):id is string=>!!id).sort((a,b)=>attributes(w,b).martial-attributes(w,a).martial)[0],martial=leader?attributes(w,leader).martial:8,siege=armies.some(a=>a.regiments?.some(u=>u.kind==='siege'&&u.troops>=50)),food=city.grain<Math.max(1,civilianFood(w,s.site)),governor=city.governor,traits=governor?traitsFor(w,governor):[],mercy=traits.includes('generous')&&food?8:0,steadfast=traits.includes('steadfast')?10:0,war=activeWars(w).find(v=>v.id===s.war),reinforcements=!!war&&w.realm!.armies.some(a=>warArmySide(w,war,a)!==s.side&&warArmySide(w,war,a)!==null&&a.journey?.route.at(-1)===s.site&&a.troops>=100&&a.morale>=20&&a.journey.durations.slice(a.journey.leg).reduce((n,d)=>n+d,0)-a.journey.elapsed<=14);
 const chance=blockade<100?0:Math.max(0,Math.min(80,Math.floor(s.progress/3)+(s.breach??0)*10+(siege?10:0)+Math.floor(martial/2)+(food?20:0)+Math.floor((100-city.order)/8)-fort*12-steadfast+mercy-(reinforcements?15:0)-15));return {required,blockade,chance,leader,food,fort,reinforcements};
}
export function advanceSiegePhase(w:World,s:Siege,armies:Army[]){s.started??=w.day;s.nextPhase??=w.day+14;s.breach??=0;s.round??=0;const q=siegePhaseQuote(w,s,armies);s.blockade=q.blockade;if(s.playerDecision||w.day<s.nextPhase)return false;s.nextPhase=w.day+14;s.round++;
 if(q.blockade<100||armies.every(a=>a.supply<=0)){s.event=q.blockade<100?'包围兵力不足，阶段停滞':'围城军缺粮，阶段停滞';return false;}
 const roll=((s.war*97+s.started*31+s.round*43+Object.keys(siteById).indexOf(s.site)*17)%100+100)%100;
 if(roll<q.chance){s.event='守城方请求议降';if(w.realm!.cities[s.site].governor===w.characterId){s.playerDecision=true;return false;}return true;}
 if(roll>80&&s.breach<3){s.breach++;s.event='工事推进，形成城墙缺口';}else if(q.food){w.realm!.cities[s.site].order=Math.max(0,w.realm!.cities[s.site].order-3);s.event='城内缺粮，守城支持下降';}else s.event='守城方继续抵抗';return false;
}
