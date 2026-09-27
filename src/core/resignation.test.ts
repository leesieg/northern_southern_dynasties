import {describe,it,expect} from 'vitest';
import {newGovernedCampaignWorld} from './governedTestWorld';
import {act,advance} from './world';
import {setLocalHolder,countyTerritory} from './localAdministration';
import {resignablePosts,isAdventurer,resignationReason} from './resignation';
import {officeHierarchy} from './offices';
import {personalRoute,canEnter} from './diplomacy';
import {serializeWorld,parseWorld} from './save';
import {governmentOf} from './government';
const start=(id='dugu-xin')=>newGovernedCampaignWorld(id,undefined,'sandbox');
describe('辞官与自由行旅',()=>{
 it('逐项卸任，财产守恒，全部卸任才开放个人跨境，并可读档',()=>{
  const w=start(),money=w.people[0].coins,treasuries=structuredClone(w.realm!.treasuries);
  expect(personalRoute(w,'ye')).toBeNull();
  const posts=resignablePosts(w);expect(posts.length).toBeGreaterThan(0);
  for(const p of posts){act(w,{type:'resign',office:p.id});expect(officeHierarchy(w,w.characterId).some(o=>o.id===p.id&&o.holder===w.characterId)).toBe(false);}
  expect(isAdventurer(w,w.characterId!)).toBe(true);expect(personalRoute(w,'ye')).not.toBeNull();
  expect(canEnter(w,'west','east',w.characterId,true)).toBe(false);
  expect(w.people[0].coins).toBe(money);expect(w.realm!.treasuries).toEqual(treasuries);
  const restored=parseWorld(serializeWorld(w));expect(isAdventurer(restored,w.characterId!)).toBe(true);
  expect(()=>act(w,{type:'resign',office:posts[0].id})).toThrow('已不在');
 });
 it('君主不能空置君位，执行公务前必须交接',()=>{
  const w=start('xiao-yan');expect(resignationReason(w,'office:liang:sovereign')).toContain('继承');
  const d=start();d.mobility!.appointments[d.characterId!]={} as never;
  const before=structuredClone(d);expect(()=>act(d,{type:'resign',office:resignablePosts(d)[0].id})).toThrow('在途任命');expect(d).toEqual(before);
 });
 it('执政卸任后交权给仍在位者，旧控制权不残留',()=>{
  const w=start('yuwen-tai');act(w,{type:'resign',office:'office:west:executive:0'});
  expect(governmentOf(w,'west')!.executives).toEqual(['yuan-baoju']);expect(w.relationships!.regencies.west).toBeUndefined();expect(parseWorld(serializeWorld(w)).realm!.governments!.realms.west.executives).toEqual(['yuan-baoju']);
 });
 it('重新任官恢复国境约束，旅途中仍正常推进',()=>{
  const w=start();for(const p of resignablePosts(w))act(w,{type:'resign',office:p.id});
  act(w,{type:'travel',destination:'ye'});advance(w,1);expect(w.people[0].journey).not.toBeNull();
  w.people[0].journey=null;setLocalHolder(w,countyTerritory('tianshui'),'west',w.characterId!);
  expect(isAdventurer(w,w.characterId!)).toBe(false);expect(personalRoute(w,'ye')).toBeNull();
 });
 it('拒绝伪造辞官记录',()=>{const w=start();w.resignations={titles:['not-an-office'],persons:[w.characterId!]};expect(()=>serializeWorld(w)).toThrow();});
});
