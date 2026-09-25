import {newGovernedCampaignWorld as newCampaignWorld} from './governedTestWorld';
import {routeGrant} from './treasury';
import {describe,it,expect} from 'vitest';
import {act,advance} from './world';
import {actRetinue,advanceRetinue,retinueQuote,postStatus,retinueMembers,recommendationBonus,isOfficial} from './retinue';
import {parseWorld,serializeWorld,validateWorld} from './save';
import {buildQuote} from './construction';
import {presentAt,personResidence} from './residence';
import {serviceBusy} from './assignments';
import {pauseSnapshot,pauseEvents} from './pauseEvents';
import {lifeOf} from './lifeState';
import {syncGovernance} from './realm';
import type {World} from './types';
const start=(id='xiao-gang')=>newCampaignWorld(id,undefined,'sandbox');
const hire=(w:World,id='guest-liang')=>act(w,{type:'retinue',action:'recruit',person:id});
const save=(w:World)=>expect(parseWorld(serializeWorld(w))).toEqual(w);
const tick=(w:World)=>{if(w.realm?.event)act(w,{type:'realm',action:'event',choice:'decline'});advance(w);validateWorld(w);};
describe('幕僚的招募、履职与生命周期',()=>{
 it.each([['xiao-gang','liang','jiankang'],['gao-huan','east','jinyang'],['yuwen-tai','west','changan']])('本国延聘并派驻营造：%s',(id,realm,site)=>{
  const w=start(id),person='guest-'+realm,command={type:'build' as const,scope:'city' as const,site,building:'market' as const};
  expect(buildQuote(w,command).reason).toContain('营造参军');const money=w.people[0].coins;hire(w,person);expect(w.people[0].coins).toBe(money-30);
  act(w,{type:'retinue',action:'assign',person,post:'engineer',site});
  for(let i=0;i<150&&postStatus(w,'engineer',site).reason;i++)tick(w);
  routeGrant(w,site,100,'营建预算');expect(postStatus(w,'engineer',site).reason).toBe('');const q=buildQuote(w,command);expect(q.reason).toBe('');act(w,command);
  const project=w.holdings.cities[site].project!;expect(project.engineerBonus).toBeGreaterThan(0);expect(project.supervisor).toBe(person);save(w);
  act(w,{type:'retinue',action:'dismiss',person});expect(w.holdings.cities[site].project).toEqual(project);save(w);
 });
 it('拒绝异国、公职、幼年、重复归属和资金不足，拒绝不扣钱',()=>{
  const w=start();for(const person of ['guest-east','xiao-yi','yuan-kuo','xiao-yan','missing']){const before=structuredClone(w);expect(()=>hire(w,person),person).toThrow();expect(w).toEqual(before);}
  w.people[0].coins=29;expect(()=>hire(w)).toThrow('钱');w.people[0].coins=100;hire(w);const before=structuredClone(w);expect(()=>hire(w)).toThrow('归属');expect(w).toEqual(before);expect(serviceBusy(w,'guest-liang')).toBe(true);save(w);
 });
 it('同一职位不可重复任命，免职仍留幕，解聘有冷却',()=>{
  const w=start();hire(w);hire(w,'wang-lingbin');act(w,{type:'retinue',action:'assign',person:'guest-liang',post:'secretary'});
  expect(()=>act(w,{type:'retinue',action:'assign',person:'wang-lingbin',post:'secretary'})).toThrow('已有');
  act(w,{type:'retinue',action:'unassign',person:'guest-liang'});expect(retinueMembers(w)).toHaveLength(2);act(w,{type:'retinue',action:'assign',person:'wang-lingbin',post:'secretary'});
  act(w,{type:'retinue',action:'dismiss',person:'guest-liang'});expect(()=>hire(w)).toThrow('九十');save(w);
 });
 it('远处幕僚走道路赴任，抵达前无工程权限，途中可存读',()=>{
  const w=start();w.mobility!.residences['guest-liang']={site:'jingkou',journey:null};hire(w);act(w,{type:'retinue',action:'assign',person:'guest-liang',post:'engineer',site:'jiankang'});
  expect(postStatus(w,'engineer','jiankang').reason).toContain('尚未');tick(w);expect(personResidence(w,'guest-liang').traveling).toBe(true);
  const loaded=parseWorld(serializeWorld(w));tick(w);tick(loaded);expect(loaded).toEqual(w);const before=pauseSnapshot(w);
  for(let i=0;i<50&&!presentAt(w,'guest-liang','jiankang');i++)tick(w);
  expect(postStatus(w,'engineer','jiankang').reason).toBe('');expect(pauseEvents(before,w).some(e=>e.kind==='retinue')).toBe(true);save(w);
 });
 it('随行仓曹随主公出行，必须同城才补粮；仓赋归公库',()=>{
  const w=start();hire(w);act(w,{type:'retinue',action:'assign',person:'guest-liang',post:'steward'});
  const food=w.people[0].food,coins=w.people[0].coins,treasury=w.realm!.treasuries.liang.coins;
  act(w,{type:'retinue',action:'work',post:'steward',task:'resupply'});expect(w.people[0].food).toBeGreaterThan(food);expect(w.people[0].coins).toBe(coins-10);
  expect(()=>act(w,{type:'retinue',action:'work',post:'steward',task:'resupply'})).toThrow('尚需');act(w,{type:'retinue',action:'work',post:'steward',task:'audit'});expect(w.realm!.treasuries.liang.coins).toBeGreaterThan(treasury);
  act(w,{type:'travel',destination:'jingkou'});tick(w);expect(retinueQuote(w,{type:'retinue',action:'work',post:'steward',task:'resupply'}).reason).not.toBe('');
  for(let i=0;i<50&&(!presentAt(w,'guest-liang','jingkou')||w.people[0].journey);i++)tick(w);expect(presentAt(w,'guest-liang','jingkou')).toBe(true);save(w);
 });
 it('军司马遵守授权，整训实际增加士气且冷却',()=>{
  const w=start();w.realm!.mandate=true;hire(w);routeGrant(w,w.people[0].home,120,'军需预算');act(w,{type:'realm',action:'muster'});act(w,{type:'retinue',action:'assign',person:'guest-liang',post:'marshal',site:'jiankang'});
  const army=w.realm!.armies[0];army.morale=30;act(w,{type:'retinue',action:'work',post:'marshal',task:'drill'});expect(army.morale).toBeGreaterThan(30);
  expect(()=>act(w,{type:'retinue',action:'work',post:'secretary',task:'drill'})).toThrow();w.realm!.mandate=false;w.retinue!.cooldowns={};expect(()=>act(w,{type:'retinue',action:'work',post:'marshal',task:'drill'})).toThrow('授权');
 });
 it('无官职人物也能蓄养随行幕僚、获得有期限荐举，但不能设官属',()=>{
  const w=start('yuan-qin');for(const c of Object.values(w.realm!.cities))if(c.governor==='yuan-qin')c.governor='yuwen-tai';syncGovernance(w);
  // The crown prince has no active public office in the hierarchy; status is checked, not the historical name.
  expect(isOfficial(w,'yuan-qin')).toBe(false);hire(w,'guest-west');act(w,{type:'retinue',action:'assign',person:'guest-west',post:'secretary'});
  expect(()=>act(w,{type:'retinue',action:'assign',person:'guest-west',post:'engineer',site:'changan'})).toThrow('官员');
  act(w,{type:'retinue',action:'work',post:'secretary',task:'recommend'});expect(recommendationBonus(w,'yuan-qin')).toBeGreaterThan(0);w.day=90;expect(recommendationBonus(w,'yuan-qin')).toBe(0);
 });
 it('月俸仅扣一次，欠俸停职、补足恢复，连续欠俸离幕并提示',()=>{
  const w=start();hire(w);act(w,{type:'retinue',action:'assign',person:'guest-liang',post:'engineer',site:'jiankang'});w.day=30;w.people[0].coins=0;const before=pauseSnapshot(w);advanceRetinue(w);
  expect(postStatus(w,'engineer','jiankang').reason).toContain('欠俸');expect(pauseEvents(before,w).some(e=>e.title==='幕府欠俸')).toBe(true);advanceRetinue(w);expect(w.retinue!.members['guest-liang'].arrears).toBe(1);
  w.day=60;w.people[0].coins=8;advanceRetinue(w);expect(w.people[0].coins).toBe(0);expect(w.retinue!.members['guest-liang'].arrears).toBe(0);
  w.day=90;advanceRetinue(w);w.day=120;const leaving=pauseSnapshot(w);advanceRetinue(w);expect(w.retinue!.members['guest-liang']).toBeUndefined();expect(pauseEvents(leaving,w).some(e=>e.kind==='retinue')).toBe(true);save(w);
 });
 it('主公去世后清理幕职，重病者不能履职',()=>{
  const w=start();hire(w);act(w,{type:'retinue',action:'assign',person:'guest-liang',post:'engineer',site:'jiankang'});
  lifeOf(w,'guest-liang')!.illness={kind:'fever',severity:3,since:0};expect(postStatus(w,'engineer','jiankang').reason).toContain('重病');
  lifeOf(w,'xiao-gang')!.death={day:0,cause:'age'};advanceRetinue(w);expect(retinueMembers(w)).toHaveLength(0);
 });
 it('NPC 延聘使用自身储备，不自动把玩家招入幕府',()=>{
  const w=start('xiao-yan'),money=w.people[0].coins,other=w.relationships!.reserves['xiao-gang'];actRetinue(w,{type:'retinue',action:'recruit',person:'guest-liang'},'xiao-gang');expect(w.relationships!.reserves['xiao-gang']).toBe(other-30);expect(w.people[0].coins).toBe(money);expect(retinueQuote(w,{type:'retinue',action:'recruit',person:'xiao-yan'},'xiao-gang').reason).not.toBe('');save(w);
 });
 it('旧档补空幕府，不凭空分配人员；拒绝环形归属、重复职位和无效驻地',()=>{
  const w=start();delete w.retinue;expect(parseWorld(serializeWorld(w)).retinue?.members).toEqual({});
  const valid=start();hire(valid);hire(valid,'wang-lingbin');act(valid,{type:'retinue',action:'assign',person:'guest-liang',post:'secretary'});
  for(const edit of [(v:World)=>{v.retinue!.members['guest-liang'].host='wang-lingbin';},(v:World)=>{v.retinue!.members['wang-lingbin'].post='secretary';},(v:World)=>{v.retinue!.members['guest-liang'].site='missing';},(v:World)=>{v.retinue!.members['guest-liang'].arrears=2;},(v:World)=>{v.retinue!.members['guest-liang'].joined=-1;}]){const v=structuredClone(valid);edit(v);expect(()=>serializeWorld(v)).toThrow('存档');}save(valid);
 });
 it('旧档已开工项目不追加幕僚要求，新工程保存的工期修正不能篡改',()=>{
  const old=start();routeGrant(old,'jiankang',100,'营建预算');delete old.retinue;act(old,{type:'build',scope:'city',site:'jiankang',building:'market'});const project=structuredClone(old.holdings.cities.jiankang.project),migrated=parseWorld(serializeWorld(old));expect(migrated.holdings.cities.jiankang.project).toEqual(project);expect(retinueMembers(migrated)).toHaveLength(0);
  for(let i=0;i<30&&migrated.holdings.cities.jiankang.project;i++)tick(migrated);expect(migrated.holdings.cities.jiankang.levels.market).toBe(1);
  const w=start();hire(w);act(w,{type:'retinue',action:'assign',person:'guest-liang',post:'engineer',site:'jiankang'});routeGrant(w,'jiankang',100,'营建预算');act(w,{type:'build',scope:'city',site:'jiankang',building:'market'});w.holdings.cities.jiankang.project!.engineerBonus=100;expect(()=>serializeWorld(w)).toThrow('存档');
 });
 it('NPC 每季延聘、授职与工资也参与同一世界规则',()=>{
  const w=start('yuan-qin');w.day=90;advanceRetinue(w);const members=Object.values(w.retinue!.members);expect(members.length).toBeGreaterThan(0);expect(members.some(m=>m.post!==null)).toBe(true);expect(members.every(m=>m.host!=='yuan-qin')).toBe(true);save(w);
 });
});
