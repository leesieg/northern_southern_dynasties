import {describe,it,expect} from 'vitest';
import {act,newCampaignWorld,planRoute} from './world';
import {declareRealmWar,declareRealmWarReason,realmReason,settleWar,type Army} from './realm';
import {ensureWars,peaceQuote,peaceLandCost} from './wars';
import {awardInfluence,personInfluence} from './personalInfluence';
import {warObjectiveControl,warScoreBreakdown,updateWarScore,peaceCostForCity} from './warScoring';
import {warTerritorySites,warObjectiveSites,warDeclarationCost,warTargetName} from './warTerritories';
import {advanceMilitaryAI} from './militaryAI';
import {ensureArmyOrganization} from './armyOrganization';
import {parseWorld,serializeWorld,validateWorld} from './save';
import {descendantSites} from '../data/territorialHierarchy';
import type {World} from './types';

function setup(person='xiao-yan'){const w=newCampaignWorld(person,undefined,'sandbox');w.realm!.armies=[];awardInfluence(w,person,500);return w;}
function regional(w=setup(),territory='province:east:并州',site='jinyang'){return {w,war:declareRealmWar(w,w.characterId!,'liang',site,'territory',territory)};}
function victory(w:World,defender='east'){for(const c of Object.values(w.realm!.cities))if(c.owner===defender){c.controller='liang';c.occupiedSince=w.day;}w.realm!.armies=w.realm!.armies.filter(a=>a.realm!==defender);}
function objective(w:World,war:ReturnType<typeof declareRealmWar>){return warScoreBreakdown(w,war).parts.find(p=>p.key==='objective')!.value;}

describe('州郡战争目标与割地',()=>{
 it('declares a real province with a fixed county list and higher personal influence cost',()=>{
  const w=setup(),before=personInfluence(w,w.characterId!),treasuries=structuredClone(w.realm!.treasuries);
  act(w,{type:'realm',action:'war',site:'jinyang',goal:'territory',territory:'province:east:并州'});const war=w.realm!.wars![0];
  expect(war.territory).toEqual({id:'province:east:并州',sites:descendantSites('province:east:并州')});expect(warTargetName(war)).toBe('并州');
  expect(personInfluence(w,w.characterId!)).toBe(before-120);expect(w.realm!.treasuries).toEqual(treasuries);expect(w.realm!.cities.jinyang.owner).toBe('east');
  expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('keeps a city at 40, charges a prefecture 80 and rejects insufficient influence atomically',()=>{
  expect(warDeclarationCost()).toBe(40);const w=setup(),before=personInfluence(w,w.characterId!);
  declareRealmWar(w,w.characterId!,'liang','jinyang','territory','prefecture:taiyuan');expect(personInfluence(w,w.characterId!)).toBe(before-80);
  const poor=setup();awardInfluence(poor,poor.characterId!,-personInfluence(poor,poor.characterId!)+119);const snapshot=serializeWorld(poor);
  expect(()=>act(poor,{type:'realm',action:'war',site:'jinyang',territory:'province:east:并州'})).toThrow('影响力');expect(serializeWorld(poor)).toBe(snapshot);
 });
 it('rejects mismatched, non-regional and non-territorial targets without changing the world',()=>{
  const w=setup();for(const territory of ['province:liang:扬州','county:jinyang','province:missing'])expect(declareRealmWarReason(w,w.characterId!,'liang','jinyang','territory',true,territory)).toContain('州郡目标');
  expect(declareRealmWarReason(w,w.characterId!,'liang','jinyang','reparations',true,'province:east:并州')).toContain('仅用于割地');
  awardInfluence(w,'yuwen-tai',200);declareRealmWar(w,'yuwen-tai','west','yuci');w.realm!.cities.yuci.controller='west';const before=serializeWorld(w);expect(()=>declareRealmWar(w,w.characterId!,'liang','jinyang','territory','province:east:并州')).toThrow('占领');expect(serializeWorld(w)).toBe(before);
 });
 it('freezes only the defender-owned portion and never cedes a third state’s county',()=>{
  const w=setup();w.realm!.cities.yuci.owner='west';w.realm!.cities.yuci.controller='west';w.realm!.cities.yuci.governor=null;const {war}=regional(w);
  expect(warObjectiveSites(war)).not.toContain('yuci');victory(w);expect(peaceQuote(w,war,'liang','demand').reason).toBe('');
  settleWar(w,war,'demand');expect(w.realm!.cities.yuci.owner).toBe('west');expect(w.realm!.cities.jinyang.owner).toBe('liang');validateWorld(w);
 });
 it('requires every county for objective scoring and resets sustained control after a loss',()=>{
  const {w,war}=regional();w.day=100;w.realm!.cities.jinyang.controller='liang';updateWarScore(w,war);
  expect(warObjectiveControl(w,war)).toBeNull();expect(objective(w,war)).toBe(0);expect(peaceQuote(w,war,'liang','demand').reason).toContain('全部');
  for(const id of warObjectiveSites(war)){w.realm!.cities[id].controller='liang';w.realm!.cities[id].occupiedSince=w.day;}updateWarScore(w,war);expect(objective(w,war)).toBe(5);
  w.day=150;updateWarScore(w,war);expect(objective(w,war)).toBe(10);w.realm!.cities.yuci.controller='east';updateWarScore(w,war);expect(objective(w,war)).toBe(0);
  w.day=151;w.realm!.cities.yuci.controller='liang';updateWarScore(w,war);expect(objective(w,war)).toBe(5);
 });
 it('settles a whole province once, preserving resources and private property and starting county integration',()=>{
  const {w,war}=regional();victory(w);const lands=warObjectiveSites(war),untouched=w.realm!.cities.ye.owner;
  w.realm!.cities.yuci.fortification={level:1,due:90};const resources=lands.map(id=>({population:w.realm!.cities[id].population,grain:w.realm!.cities[id].grain})),wallets=structuredClone(w.realm!.treasuries),privateCoins=w.people[0].coins;
  const quote=peaceQuote(w,war,'liang','demand');expect(quote.reason).toBe('');expect(quote.cost).toBeGreaterThan(peaceCostForCity(w,war,'jinyang'));settleWar(w,war,'demand');
  for(const [i,id] of lands.entries()){expect(w.realm!.cities[id]).toMatchObject({owner:'liang',controller:'liang',governor:null,...resources[i],integration:{progress:0,funded:false}});}
  expect(w.realm!.cities.yuci.fortification?.due).toBeNull();expect(w.realm!.cities.ye.owner).toBe(untouched);expect(w.realm!.cities.ye.controller).toBe('east');expect(w.realm!.treasuries).toEqual(wallets);expect(w.people[0].coins).toBe(privateCoins);
  const settled=serializeWorld(w);settleWar(w,war,'demand');expect(serializeWorld(w)).toBe(settled);expect(parseWorld(settled)).toEqual(w);
 });
 it('rejects a changed owner or reclaimed county before any partial cession',()=>{
  for(const change of ['owner','controller'] as const){const {w,war}=regional();victory(w);const city=w.realm!.cities.yuci;if(change==='owner'){city.owner='west';city.controller='west';city.governor=null;}else city.controller='east';delete city.occupiedSince;const before=serializeWorld(w);expect(()=>settleWar(w,war,'demand')).toThrow('全部');expect(serializeWorld(w)).toBe(before);}
 });
 it('adds a whole prefecture or province as a peace clause with increased cost and conserved reparations',()=>{
  for(const id of ['prefecture:nanjun','province:liang:荆州']){
   const w=setup('gao-huan'),war=declareRealmWar(w,w.characterId!,'east','xiangyang');for(const c of Object.values(w.realm!.cities))if(c.owner==='liang')c.controller='east';w.realm!.treasuries.liang.coins=80;
   const q=peaceQuote(w,war,'east','demand',[id],100);expect(q.reason).toBe('');expect(q.lands).toEqual(['xiangyang',...warTerritorySites(w,id,'liang')]);expect(q.landCosts[1].cost).toBeGreaterThan(peaceCostForCity(w,war,'jiangling'));
   const coins=w.realm!.treasuries.east.coins;settleWar(w,war,'demand','east',[id],100);expect(w.realm!.cities.jiangling.owner).toBe('east');expect(w.realm!.cities.jiankang.owner).toBe('liang');expect(w.realm!.treasuries.east.coins).toBe(coins+80);expect(w.realm!.reparations!.at(-1)!.remaining).toBe(20);validateWorld(w);
  }
 });
 it('rejects overlapping regional and city clauses, partially held regions and too many clauses',()=>{
  const {w,war}=regional();victory(w);
  for(const claims of [['prefecture:taiyuan'],['province:east:并州'],['ye','ye'],['province:missing'],['province:east:司州','prefecture:weiyin'],['ye','luoyang','yuci','jinyang']])expect(peaceQuote(w,war,'liang','demand',claims).reason).toContain('附加割地');
  w.realm!.cities.linzhang.controller='east';expect(peaceQuote(w,war,'liang','demand',['prefecture:weiyin']).reason).toContain('全部已占领');
 });
 it('upgrades an existing city goal to its whole prefecture or province without duplicate land or pricing',()=>{
  for(const id of ['prefecture:taiyuan','province:east:并州']){
   const w=setup(),war=declareRealmWar(w,w.characterId!,'liang','jinyang');victory(w);
   // The additional corridor must be actually owned by the beneficiary, not just occupied elsewhere.
   for(const site of planRoute('xiangyang','jinyang')!.route.filter(id=>!warTerritorySites(w,'province:east:并州','east').includes(id))){const c=w.realm!.cities[site];c.owner='liang';c.controller='liang';c.governor=null;delete c.occupiedSince;}
   const q=peaceQuote(w,war,'liang','demand',[id]);expect(q.reason).toBe('');expect(q.lands).toEqual(warTerritorySites(w,id,'east'));expect(new Set(q.lands).size).toBe(q.lands.length);
   expect(q.landCosts).toHaveLength(1);expect(q.cost).toBe(peaceLandCost(w,war,id,q.lands));expect(q.cost).toBeGreaterThan(peaceCostForCity(w,war,'jinyang'));
   settleWar(w,war,'demand','liang',[id]);expect(w.realm!.cities.yuci.owner).toBe('liang');expect(parseWorld(serializeWorld(w))).toEqual(w);
  }
 });
 it('keeps the largest regional term reachable after decisive victory with unchanged fixed city values',()=>{
  const {w,war}=regional(setup(),'province:east:司州','ye');victory(w);const costs=warObjectiveSites(war).map(id=>peaceCostForCity(w,war,id));
  expect(peaceLandCost(w,war,war.territory!.id,warObjectiveSites(war))).toBe(90);expect(peaceQuote(w,war,'liang','demand').reason).toBe('');expect(peaceQuote(w,war,'liang','demand').cost).toBeGreaterThan(Math.max(...costs));
  const before=peaceQuote(w,war,'liang','demand').cost;for(const id of warObjectiveSites(war))w.realm!.cities[id].population=100;expect(peaceQuote(w,war,'liang','demand').cost).toBe(before);
 });
 it('keeps white peace and defender yielding consistent with the full target and allied land recipient',()=>{
  const {w,war}=regional();victory(w);war.allies={west:'attack'};expect(peaceQuote(w,war,'liang','white').lands).toEqual([]);expect(peaceQuote(w,war,'east','yield').lands).toEqual(warObjectiveSites(war));
  settleWar(w,war,'demand','liang',[],0,'west');for(const id of warObjectiveSites(war))expect(w.realm!.cities[id].owner).toBe('west');expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('sends a delegated army to remaining counties instead of stopping at the captured anchor',()=>{
  const {w,war}=regional();w.realm!.cities.jinyang.controller='liang';w.realm!.cities.jinyang.grain=0;w.day=5;
  const a:Army={realm:'liang',location:'jinyang',troops:1600,morale:80,supply:2000,journey:null,siege:0,automation:'delegated'};w.realm!.armies.push(a);ensureArmyOrganization(w);
  advanceMilitaryAI(w);expect(a.journey).not.toBeNull();expect(warObjectiveSites(war)).toContain(a.journey!.route.at(-1));expect(a.journey!.route.at(-1)).not.toBe('jinyang');
 });
 it('reads legacy city wars and rejects forged regional IDs, member lists and incompatible goals',()=>{
  const legacy=setup();declareRealmWar(legacy,legacy.characterId!,'liang','luoyang');ensureWars(legacy);expect(parseWorld(serializeWorld(legacy))).toEqual(legacy);
  const {w}=regional();for(const mutate of [(v:typeof w.realm)=>{v!.wars![0].territory!.id='county:jinyang';},(v:typeof w.realm)=>{v!.wars![0].territory!.sites.push('jiankang');},(v:typeof w.realm)=>{v!.wars![0].territory!.sites.push('jinyang');},(v:typeof w.realm)=>{v!.wars![0].territory!.sites=[];},(v:typeof w.realm)=>{v!.wars![0].goal='reparations';}]){const bad=structuredClone(w);mutate(bad.realm);expect(()=>parseWorld(serializeWorld(bad))).toThrow();}
  expect(realmReason(w,{type:'realm',action:'peace',war:w.realm!.wars![0].id,terms:'demand'})).not.toBe('');
 });
});
