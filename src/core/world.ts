import {actLocal,ensureLocalAdministration} from './localAdministration';
import {reconcileOfficeAllegiance} from './officeEligibility';
import {ensurePopulation,actPopulation,advancePopulation} from './population';
import {ensureFiscal,actFiscal,advanceFiscal,fiscalSnapshot,reconcileFiscal} from './treasury';
import {ensurePersonalInfluence,snapshotInfluence,restoreInfluence,advancePersonalInfluence} from './personalInfluence';
import {ensureRetinue,actRetinue,advanceRetinue} from './retinue';
import {ensureMobility,actMobility,departureReason,advanceMobility,syncArmyTravel} from './mobility';
import {ensureService,actService,advanceService,reconcileServiceAllegiance} from './assignments';
import {ensureDuties,actDuty,advanceDuties} from './duties';
import {ensureLife,advanceLife,actLife} from './life';
import {isAlive,lifeOf,newLifeState} from './lifeState';
import { ensureDiplomacy,atWar,arriveDiplomacy,syncDiplomacy,actDiplomacy,advanceDiplomacy,personalRoute,travelDiplomacyReason,canEnter } from './diplomacy';
import { playerRealm } from './realm';
import { ensureRelationships,actRelationship,advanceRelationships,syncRelationships } from './relationships';
import { ensureCourts,actCourt,advanceCourts } from './court';
import { newGovernments,actGovernment,advanceGovernments } from './government';
import { newFamilyState,advanceFamilies } from './family';
import { ensureLifestyle,actLifestyle,advanceLifestyle } from './lifestyle';
import { initialIdentities } from '../data/characterIdentities';
import { newRealm,actRealm,advanceRealm } from './realm';
import { DEFAULT_SCRIPT,getScript } from '../data/scripts';
import { newSocial, applySocial, advanceSocial } from './social';
import { characterById,startRules } from '../data/characters';
import { commission,evaluateCampaign } from './campaign';
import { newHoldings, beginConstruction, advanceConstruction, provisionCost } from './construction';
import { CONTENT_VERSION, roads, siteById, sites } from '../data/scenario';
import type { GameCommand, Person, RoutePlan, World } from './types';

export function distanceBetween(a: string, b: string): number {
  const p = siteById[a], q = siteById[b];
  const lat = (p.lat + q.lat) * Math.PI / 360;
  return Math.hypot((p.lon - q.lon) * Math.cos(lat), p.lat - q.lat) * 111;
}
export function legDays(a: string, b: string): number {
  const edge = roads.find(r => r.from === a && r.to === b || r.to === a && r.from === b);
  if (!edge) throw new Error('这两处地点之间没有已开放的道路。');
  return Math.max(1, Math.ceil(distanceBetween(a, b) * edge.factor / 40));
}
export function planRoute(from: string, to: string,allowed:(id:string)=>boolean=()=>true): RoutePlan | null {
  if (!siteById[from] || !siteById[to] || from === to) return null;
  const cost: Record<string, number> = { [from]: 0 }, prev: Record<string, string> = {};
  const unvisited = new Set(sites.map(s => s.id));
  while (unvisited.size) {
    const current = [...unvisited].sort((a, b) => (cost[a] ?? Infinity) - (cost[b] ?? Infinity))[0];
    if (cost[current] === undefined) break;
    if (current === to) {
      const route = [to];
      while (route[0] !== from) route.unshift(prev[route[0]]);
      const durations = route.slice(1).map((id, i) => legDays(route[i], id));
      const days = durations.reduce((sum, n) => sum + n, 0);
      return {route, durations, days, food: days, distance: Math.round(route.slice(1).reduce((sum,id,i) => sum + distanceBetween(route[i],id),0))};
    }
    unvisited.delete(current);
    for (const edge of roads) {
      const next = edge.from === current ? edge.to : edge.to === current ? edge.from : null;
      if (!next || !unvisited.has(next)||!allowed(next)) continue;
      const nextCost = cost[current] + legDays(current,next);
      if (nextCost < (cost[next] ?? Infinity)) { cost[next] = nextCost; prev[next] = current; }
    }
  }
  return null;
}
export function newWorld(): World {
  return {
    version: 2, life:newLifeState({day:0,scriptId:DEFAULT_SCRIPT}), families:newFamilyState(), lifestyles:{version:1,people:{}}, identities:initialIdentities(), scriptId:DEFAULT_SCRIPT, holdings:newHoldings(), contentVersion: CONTENT_VERSION, day: 0,
    people: [
      {id:'player',name:'沈行舟',location:'jiankang',home:'jiankang',coins:180,food:90,journey:null,itinerary:[],itineraryIndex:0},
      {id:'merchant',name:'陆商',location:'changan',home:'changan',coins:0,food:0,journey:null,itinerary:['tianshui','jincheng','wuwei','changan'],itineraryIndex:0},
      {id:'messenger',name:'北地驿使',location:'ye',home:'ye',coins:0,food:0,journey:null,itinerary:['jinyang','pingcheng','jicheng','ye'],itineraryIndex:0},
      {id:'traveler',name:'江左行旅',location:'xunyang',home:'xunyang',coins:0,food:0,journey:null,itinerary:['jiangling','changsha','nanchang','xunyang'],itineraryIndex:0},
    ],
    chronicle:[{day:0,person:'player',text:'你在建康整备行装。一张舆图，一囊行粮，山河从此展开。'}],
  };
}
export function newCampaignWorld(characterId?:string,scriptId=DEFAULT_SCRIPT,mode:'sandbox'|'tutorial'='tutorial'):World {
  if(!['sandbox','tutorial'].includes(mode))throw new Error('无效玩法模式');
  if(mode==='sandbox'&&!characterId)throw new Error('沙盒需选择历史人物');
  const script=getScript(scriptId);
  if(characterId?!script.characterIds.includes(characterId):!script.allowFictional)throw new Error('请选择所选剧本中的可玩人物。');
  const w=newWorld();w.scriptId=script.id;
  if(characterId){
    if(!Object.hasOwn(characterById,characterId))throw new Error('请选择名录中的可玩人物。');
    const c=characterById[characterId],rules=startRules(c);w.characterId=c.id;w.social=newSocial(c.id);
    Object.assign(w.people[0],{name:c.name,home:c.home,location:c.home,coins:rules.coins,food:rules.food});
    w.holdings.estate.family=c.family;w.holdings.estate.location=c.home;w.holdings.governedCities=[c.home];
    w.campaign={id:'stewardship',deadline:120,appointed:true,status:'active',finishedDay:null};
    w.chronicle=[{day:0,person:'player',text:c.name+'以'+c.title+'身份启程，经营地方与家业。'}];
  }else w.campaign={id:'jiangzuo',deadline:120,appointed:false,status:'active',finishedDay:null};
  if(mode==='sandbox'){w.mode='sandbox';w.realm=newRealm(w);w.realm.governments=newGovernments(w);ensureCourts(w);ensureDuties(w);ensureService(w);}
  ensureRelationships(w);
  ensureDiplomacy(w);
  ensureLifestyle(w);
  ensureLife(w);
  ensureMobility(w);ensureRetinue(w);ensurePersonalInfluence(w);ensureFiscal(w);ensurePopulation(w);ensureLocalAdministration(w,true);
  return w;
}
function record(world: World, person: Person, text: string) {
  world.chronicle.push({ day: world.day, person: person.id, text });
  world.chronicle = world.chronicle.slice(-100);
}
export function act(world: World, command: GameCommand): void {
 const before=fiscalSnapshot(world);actCommand(world,command);reconcileOfficeAllegiance(world);reconcileServiceAllegiance(world);snapshotInfluence(world);reconcileFiscal(world,before,publicActionName(command));
}
function actCommand(world: World, command: GameCommand): void {
  const person = world.people[0];
  ensureLife(world);
  if(!isAlive(world,world.characterId??'fictional'))throw new Error('人物已经去世。');
  if(world.mobility?.captivity&&command.type!=='health'&&!(command.type==='mobility'&&command.action==='ransom'))throw new Error('被拘押期间须先筹赎返。');
  if(command.type==='health'){actLife(world,command);return;}
  if(command.type==='travel'&&lifeOf(world,world.characterId??'fictional')?.illness?.severity===3)throw new Error('重病期间无法远行，请先延医休养。');
  if(world.campaign&&world.campaign.status!=='active')throw new Error('本局已结束，请返回主菜单开始新的一局。');
  if(command.type==='local'){actLocal(world,command);return;}
  if(command.type==='fiscal'){actFiscal(world,command);return;}
  if(command.type==='retinue'){actRetinue(world,command);return;}
  if(command.type==='mobility'){actMobility(world,command);return;}
  if(command.type==='travel'&&departureReason(world))throw new Error(departureReason(world));
  if(command.type==='service'){actService(world,command);return;}
  if(command.type==='duty'){actDuty(world,command);return;}
  if(command.type==='diplomacy'){actDiplomacy(world,command);return;}
  if(command.type==='relationship'){actRelationship(world,command);return;}
  if(command.type==='lifestyle'){actLifestyle(world,command);return;}
  if(command.type==='court'){actCourt(world,command);syncDiplomacy(world);return;}
  if(command.type==='government'){actGovernment(world,command);syncDiplomacy(world);return;}
  if(command.type==='population'){actPopulation(world,command);return;}
  if(command.type==='realm'){actRealm(world,command);return;}
  if(world.realm?.event)throw new Error('请先在政务中处理待决事务。');
  if(command.type==='commission'){commission(world);evaluateCampaign(world);return;}
  if(command.type==='build'){beginConstruction(world,command);return;}
  if(command.type!=='travel'&&command.type!=='provision'){applySocial(world,command);return;}
  if (person.journey) throw new Error('正在途中。抵达目的地后才能安排新的行动。');
  if (command.type === 'provision') {
    const cost=provisionCost(world);
    if (person.coins < cost) throw new Error(`盘缠不足，需要 ${cost} 钱。`);
    person.coins -= cost; person.food += 30;
    record(world,person,'你在'+siteById[person.location].name+`补充了 30 日行粮，支出 ${cost} 钱。`);
    return;
  }
  const border=travelDiplomacyReason(world,command.destination);if(border)throw new Error(border);
  const plan = personalRoute(world,command.destination);
  if (!plan) throw new Error('请选择一处可以抵达的其他城邑。');
  if (person.food < plan.food) throw new Error(`行粮不足：本次需要 ${plan.food} 日，请先整备。`);
  person.food -= plan.food;
  person.journey = {route:plan.route, durations:plan.durations, leg:0,elapsed:0,started:world.day};
  record(world,person,`你从${siteById[person.location].name}启程前往${siteById[command.destination].name}，预计 ${plan.days} 日。行粮已备入旅囊。`);
}
export function advance(world: World, days = 1): void {
  if (!Number.isInteger(days) || days < 0 || days > 20000) throw new Error('无效的推进天数。');
  for (let d = 0; d < days; d++) {
    if(world.campaign&&world.campaign.status!=='active')break;
    if(world.realm?.event)break;
    ensureLife(world);
    const previous=snapshotInfluence(world);
    const fiscalBefore=fiscalSnapshot(world);
    world.day++;
    advanceDiplomacy(world);
    advanceConstruction(world);
    for (const p of world.people) {
      if(!isAlive(world,p.id==='player'?world.characterId??'fictional':p.id))continue;
      if(p.id==='player'&&Object.values(world.mobility?.commanders??{}).includes(world.characterId!))continue;
      if (p.journey) {
        const j = p.journey;
        if(p.id==='player'&&world.realm&&!world.diplomacy?.returning&&!canEnter(world,playerRealm(world),world.realm.cities[j.route[j.leg+1]].controller,world.characterId)){
          p.food=Math.min(1_000_000,p.food+remainingDays(p));p.journey=null;record(world,p,'边境局势变化，前方不再允许通行。行程中止，未用行粮退回。');continue;
        }
        if(p.id==='player'&&world.diplomacy?.returning&&world.realm){const controller=world.realm.cities[j.route[j.leg+1]].controller;const destination=world.realm.cities[j.route.at(-1)!].controller;if(controller==='frontier'||atWar(world,playerRealm(world),controller)||destination!==playerRealm(world)){p.food=Math.min(1_000_000,p.food+remainingDays(p));p.journey=null;world.diplomacy.returning=null;record(world,p,'返国路线因战事变化中断，请重新安排。');continue;}}
        j.elapsed++;
        if (j.elapsed >= j.durations[j.leg]) {
          p.location = j.route[++j.leg]; j.elapsed = 0;
          if (j.leg === j.durations.length) {
            p.journey = null;
            record(world,p,`${p.id === 'player' ? '你' : p.name}抵达${siteById[p.location].name}。`);
          }
        }
      } else if (p.itinerary.length && world.day % 5 === 0) {
        const target = p.itinerary[p.itineraryIndex];
        p.itineraryIndex = (p.itineraryIndex + 1) % p.itinerary.length;
        const plan = planRoute(p.location,target);
        if (plan) p.journey = { route:plan.route,durations:plan.durations,leg:0,elapsed:0,started:world.day };
      }
    }
    arriveDiplomacy(world);
    advanceLifestyle(world);
    advanceFamilies(world);
    advanceSocial(world);
    advanceGovernments(world);
    advancePopulation(world);
    advanceRealm(world);
    advanceFiscal(world);
    syncArmyTravel(world);
    syncRelationships(world);
    advanceRelationships(world);
    advanceCourts(world);
    syncDiplomacy(world);
    advanceLife(world);
    advanceRetinue(world);
    advanceMobility(world);
    advanceDuties(world);
    advanceService(world);
    restoreInfluence(world,previous);advancePersonalInfluence(world);
    evaluateCampaign(world);
    reconcileFiscal(world,fiscalBefore,'国政日结：俸禄、军需及公务');
  }
}
export function position(person: Person): { lon: number; lat: number } {
  const j = person.journey;
  if (!j) return siteById[person.location];
  const from = siteById[j.route[j.leg]], to = siteById[j.route[j.leg + 1]];
  const t = j.elapsed / j.durations[j.leg];
  return { lon:from.lon+(to.lon-from.lon)*t, lat:from.lat+(to.lat-from.lat)*t };
}
export function remainingDays(person: Person): number {
  const j = person.journey;
  return j ? j.durations.slice(j.leg).reduce((sum,n)=>sum+n,0)-j.elapsed : 0;
}
export function dateLabel(day: number,scriptId?:string): string {
  const date = new Date(Date.UTC(getScript(scriptId).year, 0, 1 + day));
  return `${date.getUTCFullYear()} 年 ${date.getUTCMonth()+1} 月 ${date.getUTCDate()} 日`;
}

function publicActionName(c:GameCommand){const type:Record<string,string>={realm:'政务',service:'差事',duty:'粮务',court:'朝廷',government:'制度',diplomacy:'外交',mobility:'出行',retinue:'幕府',build:'营建',fiscal:'拨款'};const actions:Record<string,string>={muster:'动员',relief:'赈济',fund:'拨付',event:'地方事件',approve:'批准预算',grant:'追加拨款',cancel:'撤回结余',close:'差事结案',war:'宣战',disband:'遣散',ransom:'赎返'};return (type[c.type]??'国政')+('action' in c?' · '+(actions[c.action]??'公务办理'):'');}
