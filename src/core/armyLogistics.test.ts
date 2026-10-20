import {describe,it,expect} from 'vitest';
import {newCampaignWorld} from './world';
import {ensureArmyOrganization} from './armyOrganization';
import {advanceArmyLogistics,armySupplyTarget,supplyReserve} from './armyLogistics';
import {ensureWars,type War} from './wars';
import type {Army} from './realm';
import {accountWallet} from './obligations';
import {validFiscal} from './treasurySave';
import {parseWorld,serializeWorld} from './save';

describe('grain purchases in occupied counties',()=>{
 it.each([
  {balance:0,payer:'central:liang'},
  {balance:1_000_000,payer:'central:liang'},
  {balance:0,payer:'person:xiao-yan'},
  {balance:1_000_000,payer:'person:xiao-yan'},
 ])('pays the actual source treasury with $payer and recipient balance $balance',({balance,payer})=>{
  const w=newCampaignWorld('xiao-yan',undefined,'sandbox'),s=w.realm!;
  const war:War={attacker:'liang',defender:'east',target:'luoyang',started:0,score:0};s.war=war;ensureWars(w);
  const a:Army={realm:'liang',location:'luoyang',troops:600,morale:80,supply:0,journey:null,siege:0,owner:'xiao-yan',payer};
  s.armies.push(a);ensureArmyOrganization(w);
  const city=s.cities.luoyang;city.controller='liang';city.occupiedByWar=war.id;city.grain=supplyReserve(w,'luoyang','liang')+1000;
  const key='liang|city:luoyang';s.fiscal!.balances[key]=balance;
  const wallet=accountWallet(w,payer)!,coins=wallet.read(),grain=city.grain;
  advanceArmyLogistics(w,a);
  const bought=balance?0:armySupplyTarget(w,a);
  expect(city.owner).toBe('east');expect(city.grain).toBe(grain-bought);expect(a.supply).toBe(bought);
  expect(wallet.read()).toBe(coins-bought);expect(s.fiscal!.balances[key]).toBe(balance+bought);
  expect(Object.keys(s.fiscal!.balances).some(k=>k.includes('undefined'))).toBe(false);
  expect(s.fiscal!.entries.filter(e=>e.reason==='部曲购买军粮')).toEqual(bought?[expect.objectContaining({from:payer,to:key,coins:bought})]:[]);
  if(!bought)expect(a.logisticsReason).toBe('粮源公库无法收款');
  expect(validFiscal(w)).toBe(true);expect(parseWorld(serializeWorld(w)).realm!.fiscal).toEqual(s.fiscal);
 });
});
