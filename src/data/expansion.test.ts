import {describe,it,expect} from 'vitest';
import {sites,roads,siteById,CONTENT_VERSION} from './scenario';
import {expandedSeats} from './expandedGeography';
import {expandedPeople} from './expandedPeople';
import {administration} from './administration';
import {populationEstimates} from './populationEstimates';
import {relationshipPeople} from './relationships';
import {historicalCharacters} from './characters';
import {familyPersonById,relatives} from './families';
import {territoryNodes,ancestorsOf} from './territorialHierarchy';
import {newCampaignWorld,act,advance,planRoute} from '../core/world';
import {validateWorld,parseWorld,serializeWorld} from '../core/save';
import {upgradeContent} from '../core/contentMigration';
import {realmReason,cityYield} from '../core/realm';
import {publicOfficeReason} from '../core/officeEligibility';
import {publicSuccessor} from '../core/publicSuccession';
import {movementSummary,courtOf} from '../core/court';
import {personResidence} from '../core/residence';
import {healthLabel} from '../core/lifeState';
import {die} from '../core/life';
import type {World} from '../core/types';
const start=()=>newCampaignWorld('xiao-yan',undefined,'sandbox');
function legacy(){const w=start();w.contentVersion='546-map-0.1';for(const [id] of expandedSeats)delete w.realm!.cities[id];for(const p of expandedPeople){delete w.life!.people[p.id];delete w.mobility!.residences[p.id];delete w.relationships!.reserves[p.id];delete w.relationships!.maritalBasis[p.id];delete w.realm!.personalInfluence![p.id];for(const g of Object.values(w.realm!.governments!.realms))delete g.court!.members[p.id];}for(const id of Object.keys(w.families!.prestige))if(id!=='fictional'&&!historicalCharacters.some(p=>p.id===id))delete w.families!.prestige[id];return w;}
describe('546 content enrichment',()=>{
 it('has connected, unique seats and five-level administrative entities, with matching groups',()=>{
  expect(sites.length).toBeGreaterThan(100);expect(new Set(sites.map(s=>s.id)).size).toBe(sites.length);
  for(const [id,,,,connection] of expandedSeats){expect(siteById[connection]).toBeDefined();expect(planRoute('jiankang',id)).not.toBeNull();expect(ancestorsOf('city:'+id)).toHaveLength(5);expect(administration[id].sources.length).toBeGreaterThan(0);}
  for(const road of roads){expect(siteById[road.from]).toBeDefined();expect(siteById[road.to]).toBeDefined();}
  for(const [id,a] of Object.entries(administration))expect(territoryNodes['prefecture:'+a.group].parent).toBe(id==='liangxian'?'province:east:广州':'province:'+siteById[id].polity+':'+a.province);
  expect(territoryNodes['province:east:广州'].name).toBe('北荆州');expect(administration.luoyang.prefecture).toBe('洛阳郡');
 });
 it('allocates recorded Wei Yin total once; estimated county values and capacity remain explicit',()=>{
  const ids=sites.filter(s=>administration[s.id]?.group==='weiyin').map(s=>s.id);expect(ids).toHaveLength(13);expect(ids.reduce((n,id)=>n+populationEstimates[id].people,0)).toBe(438024);
  const w=start();for(const s of sites){const p=populationEstimates[s.id];expect(p.low).toBeLessThanOrEqual(p.people);expect(p.high).toBeGreaterThanOrEqual(p.people);expect(p.note).toBeTruthy();expect(cityYield(w,s.id).capacity).toBeGreaterThanOrEqual(p.people);}
  expect(cityYield(w,'jiankang').coins).toBeGreaterThan(cityYield(w,'hushu').coins);expect(w.realm!.cities.luoyang.population).toBeLessThan(w.realm!.cities.ye.population);
 });
 it('registers living historical and separate fictional families, with minors excluded from office and faction leadership',()=>{
  const w=start();expect(new Set(relationshipPeople.map(p=>p.id)).size).toBe(relationshipPeople.length);
  for(const p of expandedPeople){expect(familyPersonById[p.id].family).toBe(p.family);expect(personResidence(w,p.id).site).toBe(p.home);expect(w.life!.people[p.id]).toBeDefined();expect(w.families!.prestige[p.id]).toBe(0);if(p.fictional)expect(relatives(p.id,'ancestors').every(a=>a.status==='fictional')).toBe(true);}
  expect(healthLabel(w,'xiao-tong')).toBe('已故');expect(publicOfficeReason(w,'yang-jian')).toContain('成年');expect(movementSummary(w,'west','dynastic').members).not.toContain('yang-jian');expect(relatives('su-wei','ancestors').map(p=>p.id)).toContain('su-chuo');
  validateWorld(w);
 });
 it('new NPCs can be appointed, travel to office and persist without losing their identity',()=>{
  const w=start(),cmd={type:'realm',action:'appoint',site:'wucheng',candidate:'xu-ling'} as const;expect(realmReason(w,cmd)).toBe('');act(w,cmd);
  for(let i=0;i<100&&w.realm!.cities.wucheng.governor!=='xu-ling';i++){if(w.realm!.event)act(w,{type:'realm',action:'event',choice:'decline'});advance(w);}
  expect(w.realm!.cities.wucheng.governor).toBe('xu-ling');expect(personResidence(w,'xu-ling').site).toBe('wucheng');expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('expanded heirs participate in designation, death resolution and validated saves',()=>{
  const w=start();act(w,{type:'government',action:'nominate',office:'ruler',candidate:'xiao-lun'});expect(publicSuccessor(w,'liang','ruler')).toBe('xiao-lun');die(w,'xiao-yan','age');expect(w.realm!.governments!.realms.liang.ruler).toBe('xiao-lun');expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('factions include adult additions',()=>{
  const w=start();expect(courtOf(w)!.members['yang-kan']).toBe('expansion');expect(movementSummary(w,'liang','expansion').members).toContain('yang-kan');
 });
 it('additive old-content upgrade preserves old resources, genealogy prestige and journeys exactly once',()=>{
  const w=legacy();w.realm!.cities.jiankang.population=7100;w.realm!.cities.jiankang.grain=75;w.families!.prestige['xiao-yan']=90;
  const treasury=structuredClone(w.realm!.treasuries),oldCity=structuredClone(w.realm!.cities.jiankang);upgradeContent(w);expect(w.contentVersion).toBe(CONTENT_VERSION);expect(w.realm!.cities.jiankang).toEqual(oldCity);expect(w.realm!.treasuries).toEqual(treasury);expect(w.families!.prestige['xiao-yan']).toBe(90);expect(w.relationships!.reserves['xu-ling']).toBe(0);validateWorld(w);
  const once=structuredClone(w);upgradeContent(w);expect(w).toEqual(once);expect(parseWorld(serializeWorld(w)).realm!.cities.jiankang.population).toBe(7100);
 });
 it('migration never repairs missing old records or invalid new-version content',()=>{
  for(const corrupt of [(w:World)=>{delete w.realm!.cities.jiankang;},(w:World)=>{delete w.life!.people['xiao-yan'];},(w:World)=>{delete w.families!.prestige['xiao-yan'];}]){const w=legacy();corrupt(w);upgradeContent(w);expect(()=>validateWorld(w)).toThrow();}
  const fresh=start();delete fresh.realm!.cities.wucheng;upgradeContent(fresh);expect(()=>validateWorld(fresh)).toThrow();
 });
});
