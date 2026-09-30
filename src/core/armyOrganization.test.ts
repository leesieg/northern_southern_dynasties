import {describe,it,expect} from 'vitest';
import {newCampaignWorld,act,advance} from './world';
import {payArmy,consumeArmyFood,reconcileRegiments,armyCombatFactor,armyMatchupFactor,readyTroops} from './armyOrganization';
import {realmReason,advanceRealm} from './realm';
import {parseWorld,serializeWorld,validateWorld} from './save';
function setup(){const w=newCampaignWorld('xiao-yan',undefined,'sandbox');w.realm!.cities.jiankang.grain=1000;return w;}
describe('army organization and conservation',()=>{
 it('raises distinct armies from actual population and stores their six-class composition',()=>{
  const w=setup(),s=w.realm!,population=s.cities.jiankang.population,coins=s.treasuries.liang.coins;
  act(w,{type:'army',action:'raise',site:'jiankang',kind:'shield',service:'levy'});
  act(w,{type:'army',action:'raise',site:'jiankang',kind:'archer',service:'standing'});
  expect(s.cities.jiankang.population).toBe(population-400);expect(s.treasuries.liang.coins).toBe(coins-110);expect(s.armies.length).toBe(2);expect(s.armies[0].id).not.toBe(s.armies[1].id);expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('recruits directly into a selected army with conserved population, grain and unique regiments',()=>{
  const w=setup();act(w,{type:'army',action:'raise',site:'jiankang',kind:'shield',service:'levy'});
  const s=w.realm!,a=s.armies[0],population=s.cities.jiankang.population,grain=s.cities.jiankang.grain,coins=s.treasuries.liang.coins;
  act(w,{type:'army',action:'raise',site:'jiankang',kind:'archer',service:'standing',target:a.id});
  expect(s.armies).toHaveLength(1);expect(a.troops).toBe(400);expect(a.supply).toBe(120);expect(s.cities.jiankang.population).toBe(population-200);expect(s.cities.jiankang.grain).toBe(grain-60);expect(s.treasuries.liang.coins).toBe(coins-80);
  expect(new Set(a.regiments!.map(u=>u.id)).size).toBe(2);expect(a.trainingUntil).toBe(w.day+30);expect(a.regiments![1].readyDay).toBe(w.day+60);expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('keeps trained soldiers ready when fresh recruits join their army',()=>{const w=setup();act(w,{type:'army',action:'raise',site:'jiankang',kind:'shield',service:'levy'});const a=w.realm!.armies[0];a.trainingUntil=w.day;act(w,{type:'army',action:'raise',site:'jiankang',kind:'archer',service:'standing',target:a.id});expect(readyTroops(a,w.day)).toBe(200);expect(realmReason(w,{type:'realm',action:'march',army:a.id,site:'jingkou'})).toBe('');expect(armyCombatFactor(a,'attack','平原',w.day)).toBeLessThan(armyCombatFactor(a,'attack','平原',Infinity));validateWorld(w);});
 it('rejects an invalid reinforcement target before any resource changes',()=>{
  const w=setup(),before=serializeWorld(w);
  expect(()=>act(w,{type:'army',action:'raise',site:'jiankang',kind:'shield',service:'levy',target:9999})).toThrow();expect(serializeWorld(w)).toBe(before);
 });
 it('reports real starvation losses and stops losing soldiers when food is restored',()=>{
  const w=setup();act(w,{type:'army',action:'raise',site:'jiankang',kind:'shield',service:'levy'});const a=w.realm!.armies[0];
  for(const city of Object.values(w.realm!.cities))city.grain=0;w.realm!.treasuries.liang.grain=0;a.supply=0;w.day=1;
  advanceRealm(w);expect(a.troops).toBe(200);w.day=2;advanceRealm(w);expect(a.troops).toBe(200);w.day=3;advanceRealm(w);expect(a.troops).toBe(199);expect(w.chronicle.some(e=>e.text.includes(`第 ${a.id} 军断粮`)&&e.text.includes('减员 1 人'))).toBe(true);
  a.supply=100;w.day=4;advanceRealm(w);expect(a.troops).toBe(199);expect(parseWorld(serializeWorld(w))).toEqual(w);
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
  let used=0;for(let i=0;i<30;i++)used+=consumeArmyFood(w,a,100);expect(used).toBe(2);expect(a.foodRemainder).toBe(0);
 });
 it('applies terrain to cavalry and reconciles casualties to remaining regiments',()=>{
  const w=setup();act(w,{type:'army',action:'raise',site:'jiankang',kind:'heavyHorse',service:'levy'});const a=w.realm!.armies[0];
  expect(armyCombatFactor(a,'attack','山地')).toBeLessThan(armyCombatFactor(a,'attack','平原'));a.troops=123;reconcileRegiments(a);expect(a.regiments!.reduce((n,u)=>n+u.troops,0)).toBe(123);validateWorld(w);
 });
 it('uses surviving troop composition for a bounded field matchup',()=>{const w=setup();act(w,{type:'army',action:'raise',site:'jiankang',kind:'spear',service:'levy'});act(w,{type:'army',action:'raise',site:'jiankang',kind:'heavyHorse',service:'levy'});const [spear,horse]=w.realm!.armies;expect(armyMatchupFactor([spear],[horse],w.day)).toBeGreaterThan(armyMatchupFactor([horse],[spear],w.day));expect(armyMatchupFactor([spear],[horse],w.day)).toBeLessThanOrEqual(1.2);});
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
