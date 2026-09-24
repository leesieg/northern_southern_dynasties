import {routeGrant,localBalance} from './treasury';
import { describe,it,expect } from 'vitest';
import { newCampaignWorld,act,advance,planRoute } from './world';
import { serializeWorld,parseWorld } from './save';
import { actRealm,realmReason,realmForecast,playerRealm,syncGovernance,cityYield } from './realm';
import { roads,siteById } from '../data/scenario';
import type { World } from './types';
const sandbox=(id='xiao-yan')=>newCampaignWorld(id,undefined,'sandbox');
function passDays(w:World,days:number){for(let d=0;d<days;d++){if(w.realm?.event)act(w,{type:'realm',action:'event',choice:'decline'});advance(w,1);}}
describe('沙盒政治经济军事',()=>{
 it('沙盒越过 120 日，不结束也不把旧教学档改为沙盒',()=>{
  const w=sandbox();passDays(w,365);expect(w.day).toBe(365);expect(w.campaign!.status).toBe('active');expect(parseWorld(serializeWorld(w))).toEqual(w);
  const old=newCampaignWorld('xiao-yan');advance(old,120);expect(old.campaign!.status).toBe('lost');expect(parseWorld(serializeWorld(old)).mode).toBeUndefined();
 });
 it('城市用公款，家产用私产，动员不消耗个人钱粮',()=>{
  const w=sandbox('xiao-gang');w.realm!.mandate=true;act(w,{type:'retinue',action:'recruit',person:'guest-liang'});act(w,{type:'retinue',action:'assign',person:'guest-liang',post:'engineer',site:'jiankang'});const p=w.people[0],r=w.realm!,before=p.coins;
  routeGrant(w,'jiankang',200,'城市预算');act(w,{type:'build',scope:'city',site:'jiankang',building:'market'});expect(p.coins).toBe(before);expect(r.treasuries.liang.coins).toBe(400);expect(localBalance(w,'jiankang')).toBe(120);
  act(w,{type:'build',scope:'estate',site:'jiankang',building:'fields'});expect(p.coins).toBe(before-40);
  act(w,{type:'realm',action:'muster'});expect(r.treasuries.liang.coins).toBe(400);expect(r.treasuries.liang.grain).toBe(880);expect(localBalance(w,'jiankang')).toBe(0);expect(p.coins).toBe(before-40);validate(w);
 });
 it('税率取舍改变生产与秩序，公共建设不重复发放个人收入',()=>{
  const w=sandbox(),r=w.realm!,initial=cityYield(w,'jiankang').coins;
  act(w,{type:'realm',action:'tax',site:'jiankang',tax:'heavy'});expect(cityYield(w,'jiankang').coins).toBeGreaterThan(initial);
  const p=w.people[0].coins;advance(w,30);expect(r.cities.jiankang.order).toBe(64);expect(w.people[0].coins-p).toBe(8);expect(r.ledger).toHaveLength(3);expect(realmForecast(w,'liang').income).toBeGreaterThan(0);validate(w);
 });
 it('任命延迟生效，撤销前任权限；皇帝不自动取得权臣任命权',()=>{
  const w=sandbox();act(w,{type:'realm',action:'appoint',site:'jiankang',candidate:'xiao-gang'});
  advance(w,7);expect(w.holdings.governedCities).toContain('jiankang');advance(w);expect(w.holdings.governedCities).not.toContain('jiankang');
  expect(()=>act(w,{type:'build',scope:'city',site:'jiankang',building:'market'})).toThrow('治理权');validate(w);
  const emperor=sandbox('yuan-shanjian'),before=structuredClone(emperor);expect(()=>act(emperor,{type:'realm',action:'appoint',site:'ye',candidate:'gao-huan'})).toThrow('任命权');expect(emperor).toEqual(before);
 });
 it('交接只继承家业，公职及军务权限重新核定，存档合法',()=>{
  const w=sandbox();act(w,{type:'heir',target:'xiao-gang'});act(w,{type:'handover'});expect(w.holdings.governedCities).toEqual([]);expect(w.realm!.mandate).toBe(false);expect(w.realm!.cities.jiankang.governor).toBe('xiao-yan');validate(w);
 });
 it('事件暂停时间且拒绝其他命令，资源不足可以选择搁置',()=>{
  const w=sandbox();advance(w,100);expect(w.day).toBe(90);expect(w.realm!.event).not.toBeNull();const before=structuredClone(w);expect(()=>act(w,{type:'provision'})).toThrow('待决');expect(w).toEqual(before);advance(w,10);expect(w.day).toBe(90);
  w.realm!.treasuries.liang.grain=0;expect(()=>act(w,{type:'realm',action:'event',choice:'fund'})).toThrow('不足');act(w,{type:'realm',action:'event',choice:'decline'});advance(w);expect(w.day).toBe(91);validate(w);
 });
 it('断粮造成减员，遣散归还剩粮但不退款',()=>{
  const w=sandbox();act(w,{type:'realm',action:'muster'});const a=w.realm!.armies[0];w.realm!.treasuries.liang.grain=0;a.supply=0;advance(w);expect(a.troops).toBe(588);expect(a.morale).toBe(96);const coins=w.realm!.treasuries.liang.coins;act(w,{type:'realm',action:'disband'});expect(w.realm!.armies).toHaveLength(0);expect(w.realm!.treasuries.liang.coins).toBe(coins);validate(w);
 });
 it('军队通过道路逐日移动，保存中途行程可精确恢复',()=>{
  const w=sandbox();act(w,{type:'realm',action:'muster'});act(w,{type:'realm',action:'march',site:'jingkou'});const days=planRoute('jiankang','jingkou')!.days;advance(w,1);expect(w.realm!.armies[0].journey).not.toBeNull();const loaded=parseWorld(serializeWorld(w));advance(w,days-1);advance(loaded,days-1);expect(loaded).toEqual(w);expect(w.realm!.armies[0].location).toBe('jingkou');validate(w);
 });
 it('围城改变控制，议和仅割让争夺城市，停战阻止立即重开战',()=>{
  const w=sandbox(),s=w.realm!;const edge=roads.find(e=>siteById[e.from].polity==='liang'&&siteById[e.to].polity==='east'||siteById[e.to].polity==='liang'&&siteById[e.from].polity==='east')!;
  const target=siteById[edge.from].polity==='east'?edge.from:edge.to,origin=target===edge.from?edge.to:edge.from;
  w.people[0].home=origin; // Army starting position is configured below; restore identity home for valid saves.
  act(w,{type:'realm',action:'muster'});w.people[0].home='jiankang';act(w,{type:'realm',action:'war',site:target});
  // Isolate siege from field battle in this rule test.
  s.treasuries.east.coins=0;s.treasuries.east.grain=0;s.treasuries.liang.grain=10000;
  act(w,{type:'realm',action:'march',site:target});for(let d=0;d<100&&s.cities[target].controller!=='liang';d++){s.treasuries.east.coins=0;s.treasuries.east.grain=0;advance(w);if(s.event)act(w,{type:'realm',action:'event',choice:'decline'});}
  expect(s.cities[target].controller).toBe('liang');expect(s.cities[target].owner).toBe('east');validate(w);
  act(w,{type:'realm',action:'peace'});expect(s.cities[target].owner).toBe('liang');expect(s.war).toBeNull();expect(s.truces['east|liang']).toBe(w.day+360);validate(w);
  const next=roads.find(e=>s.cities[e.from].controller==='liang'&&s.cities[e.to].owner==='east');if(next)expect(realmReason(w,{type:'realm',action:'war',site:next.to})).toContain('停战');
 });
 it('NPC 应战与财政均运行，战争最迟 360 日结束',()=>{
  const w=sandbox(),r=playerRealm(w),edge=roads.find(e=>siteById[e.from].polity===r&&['east','west'].includes(siteById[e.to].polity))!;
  act(w,{type:'realm',action:'war',site:edge.to});advance(w,6);expect(w.realm!.armies.some(a=>a.realm!=='liang')).toBe(true);passDays(w,360);expect(w.realm!.war).toBeNull();validate(w);
 });
 it.each(['treasury','governance','army','city','war','event'])('拒绝损坏的 %s 数据',field=>{
  const w=sandbox(),s=w.realm!;
  if(field==='treasury')s.treasuries.liang.coins=-1;
  if(field==='governance')w.holdings.governedCities.push('changan');
  if(field==='army')s.armies.push({realm:'liang',location:'jiankang',troops:600,morale:100,supply:999,journey:null,siege:0});
  if(field==='city')s.cities.jiankang.households=0;
  if(field==='war')s.war={attacker:'liang',defender:'liang',target:'jiankang',started:0,score:0};
  if(field==='event')s.event={kind:'flood',site:'unknown',day:0};
  expect(()=>serializeWorld(w)).toThrow();
 });
 it.each(['xiao-yan','gao-huan','yuwen-tai'])('最多 50 年 %s 沙盒持续结算、家业终结与存档回放',id=>{const w=sandbox(id);passDays(w,9000);const restored=parseWorld(serializeWorld(w));passDays(w,9250);passDays(restored,9250);expect(w.day).toBeLessThanOrEqual(18250);if(w.day<18250)expect(w.campaign!.status).toBe('lost');expect(restored).toEqual(w);validate(w);});
 it('长期世界结算与分段读档一致',()=>{
  const w=sandbox('yuwen-tai');actRealm(w,{type:'realm',action:'tax',site:'changan',tax:'light'});passDays(w,180);const restored=parseWorld(serializeWorld(w));passDays(w,3650);passDays(restored,3650);expect(restored).toEqual(w);syncGovernance(w);validate(w);
 });
});
function validate(w:World){expect(parseWorld(serializeWorld(w))).toEqual(w);}
