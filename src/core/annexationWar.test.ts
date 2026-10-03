import {describe,it,expect} from 'vitest';
import {act,newCampaignWorld} from './world';
import {declareRealmWar,declareRealmWarReason,settleWar,type Army} from './realm';
import {peaceQuote,annexationPeaceCost} from './wars';
import {warObjectiveSites,warTargetName,warDeclarationCost} from './warTerritories';
import {warObjectiveControl,updateWarScore} from './warScoring';
import {advanceMilitaryAI} from './militaryAI';
import {ensureArmyOrganization} from './armyOrganization';
import {awardInfluence,personInfluence} from './personalInfluence';
import {incurObligation} from './obligations';
import {fiscalPath} from './treasury';
import {actPeaceOffer} from './realmStrategy';
import {parseWorld,serializeWorld} from './save';
import type {World} from './types';

function setup(){const w=newCampaignWorld('xiao-yan',undefined,'sandbox');awardInfluence(w,w.characterId!,500);w.realm!.armies=[];return w;}
function victory(w:World){for(const c of Object.values(w.realm!.cities))if(c.owner==='east')c.controller='liang';w.realm!.armies=[];w.day=90;}

describe('吞并政权战争与议和',()=>{
 it('charges 180 personal influence, above province cost, and rejects a poor declaration without changes',()=>{
  const w=setup(),before=personInfluence(w,w.characterId!),treasuries=structuredClone(w.realm!.treasuries);
  act(w,{type:'realm',action:'war',site:'luoyang',goal:'annexation'});expect(personInfluence(w,w.characterId!)).toBe(before-180);expect(w.realm!.treasuries).toEqual(treasuries);
  const war=w.realm!.wars![0];expect(warTargetName(war,w)).toBe('东魏');expect(warObjectiveSites(war,w)).toEqual(Object.keys(w.realm!.cities).filter(id=>w.realm!.cities[id].owner==='east'));
  expect(warDeclarationCost('annexation')).toBeGreaterThan(warDeclarationCost('territory','province:east:并州'));expect(parseWorld(serializeWorld(w))).toEqual(w);
  const poor=setup();awardInfluence(poor,poor.characterId!,-personInfluence(poor,poor.characterId!)+179);const snapshot=serializeWorld(poor);
  expect(declareRealmWarReason(poor,poor.characterId!,'liang','luoyang','annexation')).toContain('影响力');expect(()=>act(poor,{type:'realm',action:'war',site:'luoyang',goal:'annexation'})).toThrow('影响力');expect(serializeWorld(poor)).toBe(snapshot);
 });
 it('uses the entire polity for military objectives and does not count one captured city as complete',()=>{
  const w=setup(),war=declareRealmWar(w,w.characterId!,'liang','luoyang','annexation');w.realm!.cities.luoyang.controller='liang';w.realm!.cities.luoyang.grain=0;w.day=5;updateWarScore(w,war);
  expect(warObjectiveControl(w,war)).toBeNull();expect(peaceQuote(w,war,'liang','annex').reason).toContain('全部');
  const a:Army={realm:'liang',location:'luoyang',troops:1600,morale:80,supply:2000,journey:null,siege:0,automation:'delegated'};w.realm!.armies.push(a);ensureArmyOrganization(w);advanceMilitaryAI(w);
  expect(a.journey).not.toBeNull();expect(warObjectiveSites(war,w)).toContain(a.journey!.route.at(-1));expect(a.journey!.route.at(-1)).not.toBe('luoyang');
 });
 it('allows an existing city war to explicitly demand annexation at 120 clause cost without extra land or cash',()=>{
  const w=setup(),war=declareRealmWar(w,w.characterId!,'liang','luoyang');victory(w);
  const q=peaceQuote(w,war,'liang','annex');expect(q).toMatchObject({annexes:true,cost:120,coins:0,reason:''});expect(q.annexedSites.length).toBeGreaterThan(1);expect(q.lands).toEqual([]);expect(q.cost).toBeGreaterThan(90);
  expect(peaceQuote(w,war,'liang','white').annexes).toBe(false);expect(peaceQuote(w,war,'liang','demand').annexes).toBe(false);
  for(const [claims,cash] of [[['ye'],0],[[],100]] as [string[],number][]){const before=serializeWorld(w);expect(()=>settleWar(w,war,'annex','liang',claims,cash)).toThrow();expect(serializeWorld(w)).toBe(before);}
  expect(annexationPeaceCost).toBe(120);
 });
 it('takes over real central and local balances and debts once while preserving private wallets',()=>{
  const w=setup(),war=declareRealmWar(w,w.characterId!,'liang','luoyang');victory(w);const s=w.realm!,key=fiscalPath(w,'ye','east')[0],to=key.replace('east|','liang|');s.fiscal!.balances[key]=123;
  s.armyDebts=[{realm:'east',account:'central:east',coins:37}];incurObligation(w,'annex-test','central:east','central:west',30,'真实待付债务');
  const coins=s.treasuries.liang.coins+s.treasuries.east.coins,grain=s.treasuries.liang.grain+s.treasuries.east.grain,local=s.fiscal!.balances[to]??0,privateCoins=w.people[0].coins,reserves=structuredClone(w.relationships!.reserves);
  settleWar(w,war,'annex');expect(s.annexed?.east?.into).toBe('liang');expect(s.treasuries.liang.coins+s.treasuries.east.coins).toBe(coins);expect(s.treasuries.liang.grain+s.treasuries.east.grain).toBe(grain);
  expect(s.fiscal!.balances[key]).toBe(0);expect(s.fiscal!.balances[to]).toBe(local+123);expect(s.armyDebts[0]).toMatchObject({realm:'liang',coins:37});expect(w.obligations!.items.find(q=>q.source==='annex-test')).toMatchObject({from:'central:liang',to:'central:west',remaining:30});
  expect(w.people[0].coins).toBe(privateCoins);expect(w.relationships!.reserves).toEqual(reserves);expect(s.wars).toEqual([]);const settled=serializeWorld(w);settleWar(w,war,'annex');expect(serializeWorld(w)).toBe(settled);expect(parseWorld(settled)).toEqual(w);
 });
 it('refuses surviving resistance and third-state control before any annexation',()=>{
  const w=setup(),war=declareRealmWar(w,w.characterId!,'liang','luoyang','annexation');victory(w);
  const enemy:Army={realm:'east',location:'ye',troops:600,morale:80,supply:100,journey:null,siege:0};w.realm!.armies.push(enemy);ensureArmyOrganization(w);expect(peaceQuote(w,war,'liang','annex').reason).toContain('有效抵抗');
  const before=serializeWorld(w);expect(()=>settleWar(w,war,'annex')).toThrow('有效抵抗');expect(serializeWorld(w)).toBe(before);
  w.realm!.armies=[];w.realm!.cities.ye.controller='west';expect(peaceQuote(w,war,'liang','annex').reason).toContain('第三国');expect(w.realm!.annexed?.east).toBeUndefined();
 });
 it('requires acceptance even for explicit annexation and keeps the negotiated cost above regional terms',()=>{
  const w=setup(),war=declareRealmWar(w,w.characterId!,'liang','luoyang');victory(w);w.day=0;w.realm!.treasuries.east.coins=10000;
  const refused=peaceQuote(w,war,'liang','annex');expect(refused.cost).toBe(120);expect(refused.acceptance).toBeLessThan(0);expect(refused.reason).toContain('尚不接受');const before=serializeWorld(w);expect(()=>settleWar(w,war,'annex')).toThrow('尚不接受');expect(serializeWorld(w)).toBe(before);
  w.day=90;expect(peaceQuote(w,war,'liang','annex').reason).toBe('');
 });
 it('saves an explicit annexation peace offer and preserves the player’s final approval',()=>{
  const w=setup(),war=declareRealmWar(w,w.characterId!,'liang','luoyang');w.day=90;for(const c of Object.values(w.realm!.cities))if(c.owner==='liang')c.controller='east';
  war.peaceOffer={from:'east',to:'liang',terms:'annex',created:w.day,until:w.day+15};const loaded=parseWorld(serializeWorld(w));expect(loaded.realm!.wars![0].peaceOffer?.terms).toBe('annex');expect(loaded.realm!.annexed?.liang).toBeUndefined();
  actPeaceOffer(loaded,{type:'peaceOffer',war:war.id!,accept:false});expect(loaded.realm!.wars).toHaveLength(1);expect(loaded.realm!.annexed?.liang).toBeUndefined();
  actPeaceOffer(w,{type:'peaceOffer',war:war.id!,accept:true});expect(w.realm!.annexed?.liang?.into).toBe('east');expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
});
