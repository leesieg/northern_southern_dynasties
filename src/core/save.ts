import {isMonthStart} from './calendar';
import {validResignations} from './resignation';
import {validCoordinated} from './coordinatedService';
import {validCommerce} from './commerce';
import {validHousehold} from './householdPlans';
import {validObligations} from './obligations';
import {validMilitaryNominations} from './militaryNominations';
import {validDefections} from './defections';
import {validMilitaryCareer} from './militaryCareer';
import {validAftermath} from './militaryAftermath';
import {validRequestReceipts} from './requestReceipts';
import {validEnterprises} from './enterprises';
import {validMilitaryCampaigns} from './militaryCampaigns';
import {validDeeds} from './deeds';
import {familyById} from '../data/families';
import {migrateCountyAccounts} from './treasury';
import {ensureLocalAdministration} from './localAdministration';
import {validLocalAdministration} from './localAdministrationSave';
import {upgradeContent} from './contentMigration';
import {ensurePopulation} from './population';
import {ensureFiscal} from './treasury';
import {validFiscal} from './treasurySave';
import {ensurePersonalInfluence} from './personalInfluence';
import {relationshipPersonById} from '../data/relationships';
import {ensureRetinue} from './retinue';
import {validRetinue} from './retinueSave';
import {ensureMobility} from './mobility';
import {validMobility} from './mobilitySave';
import {ensureService} from './assignments';
import {validService} from './assignmentSave';
import {ensureDuties} from './duties';
import {validDuties} from './dutiesSave';
import {ensureLife} from './life';
import {validLife} from './lifeSave';
import {lifeOf} from './lifeState';
import { ensureDiplomacy } from './diplomacy';
import { validDiplomacy } from './diplomacySave';
import { ensureRelationships,syncRelationships } from './relationships';
import { validRelationships } from './relationshipSave';
import { ensureCourts } from './court';
import { newGovernments } from './government';
import { newFamilyState,validFamilies } from './family';
import { ensureLifestyle,validLifestyles } from './lifestyle';
import { initialIdentities,validIdentities } from '../data/characterIdentities';
import { validRealm } from './realmSave';
import { DEFAULT_SCRIPT,getScript } from '../data/scripts';
import { validSocial } from './socialSave';
import { newSocial } from './social';
import { characterById } from '../data/characters';
import { campaignGoals } from './campaign';
import { cityBuildings, estateBuildings, newHoldings } from './construction';
import { CONTENT_VERSION, siteById } from '../data/scenario';
import { legDays } from './world';
import type { World } from './types';
import {validEconomyWorld} from './personalEconomySave';

const integer = (n: unknown, min: number, max: number): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= min && n <= max;
const text = (value: unknown, max: number): value is string => typeof value === 'string' && value.length > 0 && value.length <= max;
const site = (id: unknown): id is string => typeof id === 'string' && Object.hasOwn(siteById,id);
const obj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export function validateWorld(value: unknown): asserts value is World {
  const fail = () => { throw new Error('存档损坏或含有不合法的世界数据，当前进度未改变。'); };
  if (!obj(value)) return fail();
  if (value.version !== 2 || value.contentVersion !== CONTENT_VERSION) throw new Error('存档版本与当前地图版本不兼容，当前进度未改变。');
  if (!integer(value.day,0,365000) || !Array.isArray(value.people) || value.people.length !== 4 || !Array.isArray(value.chronicle) || value.chronicle.length > 100) return fail();
  if(value.scriptId!==undefined&&typeof value.scriptId!=='string')return fail();
  const script=getScript(value.scriptId as string|undefined);
  if(value.calendarSince!==undefined&&!integer(value.calendarSince,0,value.day))return fail();
  if(value.characterId!==undefined&&!script.characterIds.includes(String(value.characterId)))return fail();
  if(value.resignations!==undefined&&!validResignations(value.resignations))return fail();
  if(value.identities!==undefined&&!validIdentities(value.identities))return fail();
  if(value.families!==undefined&&!validFamilies(value.families,Number(value.day),value.scriptId as string|undefined))return fail();
  if(value.duties!==undefined&&!validDuties(value.duties,Number(value.day),value.mode))return fail();
  if(value.service!==undefined&&!validService(value.service,Number(value.day),value.mode,value as unknown as World))return fail();
  if(value.mobility!==undefined&&(value.mode!=='sandbox'||!validMobility(value.mobility,Number(value.day))))return fail();
  if(value.retinue!==undefined&&(value.mode!=='sandbox'||!validRetinue(value.retinue,Number(value.day),value.scriptId as string|undefined)))return fail();
  const h=value.holdings;
  if(!obj(h)||!Array.isArray(h.governedCities)||!h.governedCities.every(site)||new Set(h.governedCities).size!==h.governedCities.length||!obj(h.cities)||!obj(h.estate))return fail();
  if(h.lastMonthly!==undefined&&(!integer(h.lastMonthly,0,value.day)||!isMonthStart(Number(h.lastMonthly),value.scriptId as string|undefined)))return fail();
  if(typeof h.estate.family!=='string'||!Object.hasOwn(familyById,h.estate.family)||!site(h.estate.location))return fail();
  const checkHolding=(holding:unknown,scope:'city'|'estate')=>{
    if(!obj(holding)||!obj(holding.levels))return false;
    const definitions=scope==='city'?cityBuildings:estateBuildings;
    if(Object.keys(holding.levels).length!==Object.keys(definitions).length)return false;
    for(const key of Object.keys(definitions))if(!integer(holding.levels[key],key==='hall'?1:0,3))return false;
    if(scope==='estate'&&Object.entries(holding.levels).filter(([id,n])=>id!=='hall'&&Number(n)>0).length>Number(holding.levels.hall))return false;
    if(holding.project!==null){
      const p=holding.project;
      if(!obj(p)||typeof p.building!=='string'||!Object.hasOwn(definitions,p.building)||!integer(p.level,1,3)||p.level!==Number(holding.levels[p.building])+1||!integer(p.started,0,Number(value.day))||!integer(p.due,Number(value.day)+1,365100))return false;
      const d=(definitions as Record<string,{cost:number;days:number}>)[p.building];
      let costRate=100,timeRate=100;
      if(p.modifiers!==undefined){if((!value.social&&!value.lifestyles)||!obj(p.modifiers)||!integer(p.modifiers.costRate,45,100)||!integer(p.modifiers.timeRate,60,120)||![60,70,80,90,100,110,120].includes(Number(p.modifiers.timeRate)))return false;costRate=Number(p.modifiers.costRate);timeRate=Number(p.modifiers.timeRate);}
      if(p.engineerBonus!==undefined){if(scope!=='city'||!integer(p.engineerBonus,0,10)||typeof p.supervisor!=='string'||!Object.hasOwn(relationshipPersonById,p.supervisor))return false;timeRate=Math.max(40,timeRate-Number(p.engineerBonus));}else if(p.supervisor!==undefined)return false;
      if(p.cost!==Math.ceil(d.cost*p.level*costRate/100)||p.due!==p.started+Math.ceil(d.days*p.level*timeRate/100))return false;
      if(scope==='estate'&&p.building!=='hall'&&holding.levels[p.building]===0&&Object.entries(holding.levels).filter(([id,n])=>id!=='hall'&&Number(n)>0).length>=Number(holding.levels.hall))return false;
    }
    return true;
  };
  if(!checkHolding(h.estate,'estate'))return fail();
  for(const [id,holding] of Object.entries(h.cities))if(!site(id)||!checkHolding(holding,'city'))return fail();
  const expected = ['player','merchant','messenger','traveler'];
  for (const [index, person] of value.people.entries()) {
    if (!obj(person) || person.id !== expected[index] || !text(person.name,40) || !site(person.location) || !site(person.home) || !integer(person.food,0,1000000) || !integer(person.coins,0,1000000)) return fail();
    if (!Array.isArray(person.itinerary) || person.itinerary.length > 20 || !person.itinerary.every(site) || !integer(person.itineraryIndex,0,Math.max(0,person.itinerary.length-1))) return fail();
    if (index === 0 && person.itinerary.length) return fail();
    if (person.journey !== null) {
      const j = person.journey;
      if (!obj(j) || !Array.isArray(j.route) || j.route.length < 2 || j.route.length > 50 || !j.route.every(site) || !Array.isArray(j.durations) || j.durations.length !== j.route.length-1) return fail();
      if (!integer(j.leg,0,j.durations.length-1) || !integer(j.elapsed,0,10000) || !integer(j.started,0,value.day) || person.location !== j.route[j.leg]) return fail();
      for (let i = 0; i < j.durations.length; i++) {
        if (!integer(j.durations[i],1,10000)) return fail();
        try { if (j.durations[i] !== legDays(j.route[i],j.route[i+1])) return fail(); } catch { return fail(); }
      }
      if (j.elapsed >= j.durations[j.leg]) return fail();
      const elapsedTotal = j.durations.slice(0,j.leg).reduce((a: number,b: number)=>a+b,0) + j.elapsed;
      if (elapsedTotal !== value.day - j.started) return fail();
    }
  }
  if(!validSocial(value as unknown as World)||!validLifestyles(value as unknown as World))return fail();
  if(value.calendarSince!==undefined&&!integer(value.calendarSince,0,value.day))return fail();
  if(value.characterId!==undefined){
    if(typeof value.characterId!=='string'||!Object.hasOwn(characterById,value.characterId))return fail();
    const c=characterById[value.characterId],p=value.people[0],founder=characterById[(value as unknown as World).social?.founder??value.characterId];
    if(p.name!==c.name||p.home!==c.home||h.estate.family!==c.family||h.estate.location!==founder.home||!value.realm&&!h.governedCities.includes(founder.home))return fail();
    if(!obj(value.campaign)||value.campaign.id!=='stewardship')return fail();
  }else if(h.estate.family!=='shen')return fail();
  if(value.campaign!==undefined){
    const c=value.campaign;
    if(!obj(c)||!['jiangzuo','stewardship'].includes(String(c.id))||c.deadline!==120||typeof c.appointed!=='boolean'||!['active','won','lost'].includes(String(c.status)))return fail();
    if(c.id==='stewardship'&&(!value.characterId||!c.appointed))return fail();
    if(c.id==='jiangzuo'&&value.characterId)return fail();
    if(c.id==='jiangzuo'&&c.appointed&&!h.governedCities.includes('jingkou'))return fail();
    if(c.status==='active'&&((value.mode!=='sandbox'&&value.day>=120)||c.finishedDay!==null))return fail();
    if(c.status!=='active'&&(!integer(c.finishedDay,0,365000)||c.finishedDay!==value.day))return fail();
    if(c.status==='lost'&&value.day!==120&&!lifeOf(value as unknown as World,String(value.characterId??'fictional'))?.death)return fail();
    if(c.status==='won'&&!campaignGoals(value as unknown as World).every(g=>g.done))return fail();
  }
  if(!validRelationships(value as unknown as World)||!validLife(value as unknown as World))return fail();
  if(!validLocalAdministration(value as unknown as World)||!validFiscal(value as unknown as World)||!validRealm(value as unknown as World)||!validDiplomacy(value as unknown as World))return fail();
  if(!validCoordinated(value as unknown as World)||!validCommerce(value as unknown as World)||!validHousehold(value as unknown as World)||!validMilitaryNominations(value as unknown as World)||!validDefections(value as unknown as World)||!validMilitaryCareer(value as unknown as World)||!validAftermath(value as unknown as World)||!validObligations(value as unknown as World)||!validRequestReceipts(value as unknown as World)||!validEnterprises(value as unknown as World)||!validMilitaryCampaigns(value as unknown as World))return fail();
  if(!validEconomyWorld(value as unknown as World)||!validDeeds(value as unknown as World))return fail();
  for (const event of value.chronicle) {
    if (!obj(event) || !integer(event.day,0,value.day) || !text(event.text,400) || !expected.includes(String(event.person))) return fail();
  }
}
function checksum(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16);
}
export function serializeWorld(world: World): string {
  upgradeContent(world);
  validateWorld(world);
  const payload = JSON.stringify(world);
  return JSON.stringify({ format:'fynbc-save', version:1, checksum:checksum(payload), payload });
}
export function parseWorld(source: string): World {
  if (source.length > 2_000_000) throw new Error('存档超过 2 MB，无法导入。');
  let envelope: unknown;
  try { envelope = JSON.parse(source); } catch { throw new Error('无法读取这个存档文件。'); }
  if (!obj(envelope) || envelope.format !== 'fynbc-save' || envelope.version !== 1 || typeof envelope.payload !== 'string' || checksum(envelope.payload) !== envelope.checksum) throw new Error('存档格式或校验值错误，当前进度未改变。');
  let world: unknown;
  try { world = JSON.parse(envelope.payload); } catch { throw new Error('存档数据不完整。'); }
  if(obj(world)&&world.version===1){
    if(Object.hasOwn(world,'holdings'))throw new Error('旧版存档含不合法的家产字段。');
    world={...world,version:2,holdings:newHoldings()};
  }
  upgradeContent(world);
  validateWorld(world);
  if(world.characterId&&!world.social)world.social=newSocial(world.characterId);
  world.scriptId??=DEFAULT_SCRIPT;
  world.identities??=initialIdentities();
  const identityDefaults=initialIdentities();
  for(const [id,identity] of Object.entries(world.identities.people))if(!identity.genome.facial)identity.genome.facial=identityDefaults.people[id].genome.facial;
  world.families??=newFamilyState(world.day,world.scriptId);
  if(world.realm)for(const c of Object.values(world.realm.cities)){const old=c as typeof c & {households?:number};if(c.population===undefined&&old.households!==undefined){c.population=old.households*5;delete old.households;}}
  ensurePopulation(world);
  ensureLife(world);ensureDuties(world);
  if(world.realm&&!world.realm.governments)world.realm.governments=newGovernments(world);
  ensureRelationships(world);syncRelationships(world);
  ensureCourts(world);
  ensureDiplomacy(world);
  if(!world.lifestyles)ensureLifestyle(world);
  ensureService(world);
  ensureMobility(world);ensureRetinue(world);ensurePersonalInfluence(world);ensureFiscal(world);migrateCountyAccounts(world);ensureLocalAdministration(world);
  return world;
}
