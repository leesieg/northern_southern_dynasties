import {describe,it,expect} from 'vitest';
import {newCampaignWorld,act,advance} from './world';
import {payArmy,consumeArmyFood,reconcileRegiments,armyCombatFactor} from './armyOrganization';
import {realmReason} from './realm';
import {parseWorld,serializeWorld,validateWorld} from './save';
function setup(){const w=newCampaignWorld('xiao-yan',undefined,'sandbox');w.realm!.cities.jiankang.grain=1000;return w;}
describe('army organization and conservation',()=>{
 it('raises distinct armies from actual population and stores their six-class composition',()=>{
  const w=setup(),s=w.realm!,population=s.cities.jiankang.population,coins=s.treasuries.liang.coins;
  act(w,{type:'army',action:'raise',site:'jiankang',kind:'shield',service:'levy'});
  act(w,{type:'army',action:'raise',site:'jiankang',kind:'archer',service:'standing'});
  expect(s.cities.jiankang.population).toBe(population-400);expect(s.treasuries.liang.coins).toBe(coins-110);expect(s.armies.length).toBe(2);expect(s.armies[0].id).not.toBe(s.armies[1].id);expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('merges and splits without losing soldiers, supply, arrears or regiment IDs',()=>{
  const w=setup(),s=w.realm!;for(const kind of ['shield','spear'] as const)act(w,{type:'army',action:'raise',site:'jiankang',kind,service:'levy'});
  const [a,b]=s.armies;a.arrears=17;b.arrears=23;const ids=s.armies.flatMap(a=>a.regiments!.map(u=>u.id));
  act(w,{type:'army',action:'merge',army:a.id!,target:b.id!});expect(a.troops).toBe(400);expect(a.arrears).toBe(40);
  act(w,{type:'army',action:'split',army:a.id!,regiment:ids[1]});
  expect(s.armies.reduce((n,a)=>n+a.troops,0)).toBe(400);expect(s.armies.reduce((n,a)=>n+a.supply,0)).toBe(120);expect(s.armies.reduce((n,a)=>n+a.arrears!,0)).toBe(40);expect(s.armies.flatMap(a=>a.regiments!.map(u=>u.id)).sort()).toEqual(ids.sort());validateWorld(w);
 });
 it('records unpaid wages, pays them only from real funds, and blocks unpaid disbanding',()=>{
  const w=setup();act(w,{type:'army',action:'raise',site:'jiankang',kind:'shield',service:'levy'});const a=w.realm!.armies[0],t=w.realm!.treasuries.liang;
  t.coins=3;payArmy(w,a,20);expect(t.coins).toBe(0);expect(a.arrears).toBe(17);expect(realmReason(w,{type:'realm',action:'disband',army:a.id})).toContain('军饷');
  t.coins=25;payArmy(w,a,5);expect(a.arrears).toBe(0);expect(t.coins).toBe(3);
 });
 it('carries fractional daily rations rather than rounding every army every day',()=>{
  const w=setup();act(w,{type:'army',action:'raise',site:'jiankang',kind:'shield',service:'levy'});const a=w.realm!.armies[0];
  let used=0;for(let i=0;i<30;i++)used+=consumeArmyFood(w,a,100);expect(used).toBe(100);expect(a.foodRemainder).toBe(0);
 });
 it('applies terrain to cavalry and reconciles casualties to remaining regiments',()=>{
  const w=setup();act(w,{type:'army',action:'raise',site:'jiankang',kind:'heavyHorse',service:'levy'});const a=w.realm!.armies[0];
  expect(armyCombatFactor(a,'attack','山地')).toBeLessThan(armyCombatFactor(a,'attack','平原'));a.troops=123;reconcileRegiments(a);expect(a.regiments!.reduce((n,u)=>n+u.troops,0)).toBe(123);validateWorld(w);
 });
 it('keeps short training, wage and ration progression saveable',()=>{
  const w=setup();act(w,{type:'army',action:'raise',site:'jiankang',kind:'spear',service:'standing'});
  for(let i=0;i<12;i++){advance(w);validateWorld(w);}
  expect(w.realm!.armies[0].regiments![0].experience).toBeGreaterThan(0);expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('disbands only the selected army',()=>{
  const w=setup();for(const kind of ['shield','spear'] as const)act(w,{type:'army',action:'raise',site:'jiankang',kind,service:'levy'});const [a,b]=w.realm!.armies;
  act(w,{type:'realm',action:'disband',army:b.id});expect(w.realm!.armies.map(x=>x.id)).toEqual([a.id]);validateWorld(w);
 });
});
