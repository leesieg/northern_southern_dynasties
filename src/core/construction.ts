import {civicBuildings,isSovereign,centralMinistry} from './officialDuties';
import {postStatus} from './retinue';
import { awardPrestige,memberId } from './family';
import {localBalance,spendLocal} from './treasury';
import { buildingModifiers, traitsFor } from './social';
import { familyName } from '../data/characters';
import { siteById } from '../data/scenario';
import type { World } from './types';
export type CityBuilding='market'|'granary'|'hostel';
export type EstateBuilding='hall'|'fields'|'workshop'|'storehouse';
export type Building=CityBuilding|EstateBuilding;
export interface Project {engineerBonus?:number;supervisor?:string;building:Building;level:number;started:number;due:number;cost:number;modifiers?:{costRate:number;timeRate:number}}
export interface CityHolding {levels:Record<CityBuilding,number>;project:Project|null}
export interface Holdings {
  governedCities:string[];cities:Record<string,CityHolding>;
  estate:{family:string;location:string;levels:Record<EstateBuilding,number>;project:Project|null};
}
export const cityBuildings:Record<CityBuilding,{name:string;cost:number;days:number;effect:string}>={
  market:{name:'市肆',cost:80,days:15,effect:'每级每 30 日营建收益 +8 钱'},
  granary:{name:'城仓',cost:60,days:12,effect:'每级每 30 日可用行粮 +10 日份'},
  hostel:{name:'驿舍',cost:70,days:14,effect:'每级使本城整备行粮少花 2 钱'},
};
export const estateBuildings:Record<EstateBuilding,{name:string;cost:number;days:number;effect:string}>={
  hall:{name:'主宅',cost:80,days:15,effect:'主宅等级决定可用附属建筑种类，最多 3 种'},
  fields:{name:'田庄',cost:40,days:10,effect:'每级每 30 日行粮 +6 日份'},
  workshop:{name:'作坊',cost:50,days:12,effect:'每级每 30 日收入 +6 钱'},
  storehouse:{name:'庄仓',cost:35,days:8,effect:'每级每 30 日庄园粮食结余 +3 日份'},
};
export const emptyCity=():CityHolding=>({levels:{market:0,granary:0,hostel:0},project:null});
export const newHoldings=():Holdings=>({governedCities:[],cities:{},estate:{family:'shen',location:'jiankang',levels:{hall:1,fields:0,workshop:0,storehouse:0},project:null}});
export type BuildCommand={type:'build';scope:'city'|'estate';site:string;building:Building};
export function constructionModifiers(world:World,scope:'city'|'estate',site:string){
 const m=buildingModifiers(world);
 if(scope==='city'&&world.retinue){const staff=postStatus(world,'engineer',site);if(!staff.reason)m.timeRate=Math.max(40,m.timeRate-Math.floor(staff.aptitude/10));}
 return m;
}
export function buildQuote(world:World,command:BuildCommand):{cost:number;days:number;level:number;reason:string}{
  const {scope,site,building}=command,holdings=world.holdings;
  if(scope!=='city'&&scope!=='estate')return {cost:0,days:0,level:0,reason:'只能营建城市或家族庄园。'};
  const definitions=scope==='city'?cityBuildings:estateBuildings;
  if(!Object.hasOwn(siteById,site)||!Object.hasOwn(definitions,building))return {cost:0,days:0,level:0,reason:'无效的城市或建筑类型。'};
  const holding=scope==='city'?(holdings.cities[site]??emptyCity()):holdings.estate;
  const current=(holding.levels as Record<string,number>)[building],level=current+1;
  const definition=(definitions as Record<string,{cost:number;days:number}>)[building];
  const m=constructionModifiers(world,scope,site),cost=Math.ceil(definition.cost*level*m.costRate/100),days=Math.ceil(definition.days*level*m.timeRate/100);
  let reason='';
  if(scope==='city'&&!holdings.governedCities.includes(site))reason='需要这座城市的治理权';
  else if(scope==='city'&&world.service?.tasks.some(t=>t.site===site&&t.phase!=='closed'&&Object.hasOwn(civicBuildings,t.kind)))reason='已有中央营建差事进行中';
  else if(scope==='city'&&isSovereign(world))reason='请通过中央官职委派营建公务';
  else if(scope==='city'&&world.retinue&&!['secretariat','finance'].includes(centralMinistry(world,world.characterId!)??'')&&postStatus(world,'engineer',site).reason)reason=postStatus(world,'engineer',site).reason;
  else if(scope==='estate'&&site!==holdings.estate.location)reason='家族庄园位于'+siteById[holdings.estate.location].name;
  else if(holding.project)reason='已有工程进行中';
  else if(level>3)reason='已达最高等级';
  else if(scope==='estate'&&building!=='hall'&&current===0&&Object.entries(holding.levels).filter(([id,n])=>id!=='hall'&&n>0).length>=holdings.estate.levels.hall)reason='附属建筑位已满，请先扩建主宅';
  else if((world.realm&&scope==='city'?localBalance(world,site):world.people[0].coins)<cost)reason=world.realm&&scope==='city'?'本城公库不足，请在治理页申请拨款':'盘缠不足';
  return {cost,days,level,reason};
}
export function beginConstruction(world:World,command:BuildCommand){
  const quote=buildQuote(world,command);if(quote.reason)throw new Error(quote.reason);
  const holding=command.scope==='city'?(world.holdings.cities[command.site]??=emptyCity()):world.holdings.estate;
  if(world.realm&&command.scope==='city')spendLocal(world,command.site,quote.cost,'城市营建');else world.people[0].coins-=quote.cost;
  holding.project={building:command.building,level:quote.level,started:world.day,due:world.day+quote.days,cost:quote.cost};
  if(world.social||world.lifestyles?.people.fictional?.focus){holding.project.modifiers=buildingModifiers(world);if(command.scope==='city'&&world.retinue){const engineer=postStatus(world,'engineer',command.site);if(!engineer.reason&&engineer.member){holding.project.engineerBonus=Math.floor(engineer.aptitude/10);holding.project.supervisor=engineer.member.id;}}if(world.social&&traitsFor(world).includes('diligent'))world.social.stress=Math.min(100,world.social.stress+6);}
  const name=command.scope==='city'?cityBuildings[command.building as CityBuilding].name:estateBuildings[command.building as EstateBuilding].name;
  log(world,`${command.scope==='estate'?familyName(world.holdings.estate.family)+'氏庄园':siteById[command.site].name}开建${name}，支出 ${quote.cost} 钱，需 ${quote.days} 日。`);
}
function log(world:World,text:string){world.chronicle.push({day:world.day,person:'player',text});world.chronicle=world.chronicle.slice(-100);}
export function advanceConstruction(world:World){
  const h=world.holdings;
  const entries:[string,CityHolding|Holdings['estate']][]=[[familyName(h.estate.family)+'氏庄园',h.estate],...Object.entries(h.cities).map(([id,c])=>[siteById[id].name,c] as [string,CityHolding])];
  for(const [name,holding] of entries){
    const p=holding.project;if(p&&world.realm&&name!==familyName(h.estate.family)+'氏庄园'){const id=Object.keys(h.cities).find(id=>h.cities[id]===holding);if(id&&world.realm.cities[id].owner!==world.realm.cities[id].controller){p.due++;p.started++;continue;}}if(p&&p.due<=world.day){
      (holding.levels as Record<string,number>)[p.building]=p.level;holding.project=null;awardPrestige(world,memberId(world),'construction');if(world.social)world.social.renown=Math.min(999,world.social.renown+5);
      const definition={...cityBuildings,...estateBuildings}[p.building];
      log(world,`${name}的${definition.name}竣工，现为 ${p.level} 级。`);
    }
  }
  if(world.day%30===0){
    const e=h.estate.levels;
    let coins=4+e.workshop*6,food=e.fields*6+e.storehouse*3;
    if(!world.realm)for(const id of h.governedCities){const c=h.cities[id];if(c){coins+=c.levels.market*8;food+=c.levels.granary*10;}}
    world.people[0].coins=Math.min(1_000_000,world.people[0].coins+coins);world.people[0].food=Math.min(1_000_000,world.people[0].food+food);
    log(world,`家产收入结算：收入 ${coins} 钱，行粮 ${food} 日份。`);
  }
}
export function provisionCost(world:World){const id=world.people[0].location;return 12-(world.holdings.governedCities.includes(id)?(world.holdings.cities[id]?.levels.hostel??0)*2:0);}
