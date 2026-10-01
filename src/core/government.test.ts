import {awardDeed} from './deeds';
import {syncRelationships} from './relationships';
import {applyPowerArrangement,actPower} from './powerPolitics';
import {governingAuthority} from './government';
import {awardInfluence} from './personalInfluence';
import {successionDefinitions,dynastyNames,type SuccessionId} from '../data/governments';
import {newGovernedCampaignWorld as newCampaignWorld} from './governedTestWorld';
import { describe,it,expect } from 'vitest';
import {act,advance} from './world';
import { governmentOf,governmentYear,governmentBonus,governmentTaskPause,regimeName,advanceGovernments } from './government';
import { executive,cityYield,armyMonthlyPay,realmReason,playerRealm } from './realm';
import { governmentTypes,type GovernmentType } from '../data/governments';
import { siteById } from '../data/scenario';
import { parseWorld,serializeWorld } from './save';
import type { World } from './types';
const start=(id='xiao-yan')=>newCampaignWorld(id,undefined,'sandbox');
function pass(w:World,days:number){for(let i=0;i<days;i++){if(w.realm!.event)act(w,{type:'realm',action:'event',choice:'decline'});advance(w,1);}}
function atYear(w:World,year:number){w.day=Math.round((Date.UTC(year,0,1)-Date.UTC(546,0,1))/86400000);if(w.economy)w.economy.lastDay=w.day;}
function capitalReady(w:World){w.realm!.influence=300;w.realm!.treasuries[playerRealm(w)].coins=10000;governmentOf(w)!.support=80;governmentOf(w)!.legitimacy=90;}
function finish(w:World){const required=governmentOf(w)!.task!.required;pass(w,required);expect(governmentOf(w)!.task).toBeNull();expect(parseWorld(serializeWorld(w))).toEqual(w);}
function history(w:World,stage:SuccessionId){const r=playerRealm(w),g=governmentOf(w)!,d=successionDefinitions[stage],sponsor=governingAuthority(w,r);awardInfluence(w,sponsor,100);if(d.nextDynasty){for(let i=0;i<3;i++)awardDeed(w,r,sponsor!,'battle:'+i,15,'战胜');syncRelationships(w);const regency=w.relationships!.regencies[r];if(regency){regency.since=w.day-360;regency.grip=80;}}actPower(w,{type:'power',action:'propose',goal:d.nextDynasty?'dynasty':d.ruler!==g.ruler?'ruler':'executive',beneficiary:d.ruler,executive:d.executives[0],name:d.nextDynasty?dynastyNames[d.nextDynasty]:undefined,sourceStage:stage},sponsor);applyPowerArrangement(w,r,w.politics!.proposals[r]!);expect(parseWorld(serializeWorld(w))).toEqual(w);}
describe('政体、改革与政权实体沿革',()=>{
 it('546 开局已有东西魏前期制度，不可重复改革或提前受禅',()=>{
  const west=start('yuwen-tai');expect(governmentOf(west)!.laws).toEqual(['west-register','west-six']);expect(()=>act(west,{type:'government',action:'law',law:'west-six'})).toThrow('已施行');expect(()=>act(west,{type:'government',action:'law',law:'west-militia'})).toThrow('550');
  const east=start('gao-huan');expect(governmentOf(east)!.laws).toContain('east-censorate');expect(()=>act(east,{type:'government',action:'succession',stage:'qi-accession'})).toThrow('550');
  const emperor=start('yuan-shanjian'),before=structuredClone(emperor);expect(()=>act(emperor,{type:'government',action:'adopt',government:'feudal'})).toThrow('执政权');expect(emperor).toEqual(before);
 });
 it('历史开放年份使用与游戏日历一致的闰年边界',()=>{const w=start();atYear(w,550);expect(governmentYear(w)).toBe(550);w.day--;expect(governmentYear(w)).toBe(549);});
 it('改革付费一次，低支持暂停，议政恢复，读档后实施日一致',()=>{
  const w=start();act(w,{type:'government',action:'adopt',government:'feudal'});expect(w.realm!.treasuries.liang.coins).toBe(440);expect(w.realm!.influence).toBe(10);pass(w,20);governmentOf(w)!.support=20;pass(w,15);expect(governmentOf(w)!.task!.progress).toBe(20);expect(governmentTaskPause(w,'liang')).toContain('支持');
  capitalReady(w);const clone=parseWorld(serializeWorld(w));pass(w,160);pass(clone,160);expect(clone).toEqual(w);expect(governmentOf(w)!.type).toBe('feudal');expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('未决事件、非法命令、资源不足和并行议程不改变世界',()=>{
  for(const command of [{type:'government',action:'adopt',government:'invalid'},{type:'government',action:'succession',stage:'chen-accession'},{type:'government',action:'law',law:'east-assessment'}]){const w=start(),before=structuredClone(w);expect(()=>act(w,command as never)).toThrow();expect(w).toEqual(before);}
  const w=start();act(w,{type:'government',action:'adopt',government:'feudal'});const before=structuredClone(w);expect(()=>act(w,{type:'government',action:'adopt',government:'tribal'})).toThrow('已有');expect(w).toEqual(before);act(w,{type:'government',action:'cancel'});expect(w.realm!.treasuries.liang.coins).toBe(440);expect(governmentOf(w)!.task).toBeNull();
 });
 it.each(governmentTypes.filter(t=>t!=='meritocratic'))('可完成 %s 改制并保存其真实结算规则',(type:GovernmentType)=>{
  const w=start('gao-huan');capitalReady(w);const g=governmentOf(w)!;
  if(type==='celestial'){for(const c of Object.values(w.realm!.cities)){if(c.owner!=='frontier'){c.owner='east';c.controller='east';c.governor=null;}}w.holdings.governedCities=[];}
  if(type==='nomadic'||type==='khanate'){g.camp=Object.keys(w.realm!.cities).find(id=>w.realm!.cities[id].owner==='east'&&siteById[id].lat>=38)!;g.herd=400;}
  act(w,{type:'government',action:'adopt',government:type});finish(w);expect(governmentOf(w)!.type).toBe(type);expect(governmentBonus(w,'east')).toBeDefined();
 });
 it('天朝低天命损害税收并发生政体退化，不伪造领土分裂',()=>{
  const w=start(),g=governmentOf(w)!;g.type='celestial';g.legitimacy=20;expect(governmentBonus(w,'liang').tax).toBe(-20);const owners=Object.values(w.realm!.cities).map(c=>c.owner);g.legitimacy=10;w.day=31;advanceGovernments(w);expect(g.type).toBe('meritocratic');expect(Object.values(w.realm!.cities).map(c=>c.owner)).toEqual(owners);expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('游牧畜群约束动员，迁营付费且有冷却；部落支持约束军务',()=>{
  const w=start('gao-huan'),g=governmentOf(w)!;capitalReady(w);const camp=Object.keys(w.realm!.cities).find(id=>w.realm!.cities[id].owner==='east'&&siteById[id].lat>=38)!;
  act(w,{type:'government',action:'camp',site:camp});expect(g.camp).toBe(camp);act(w,{type:'government',action:'herd'});expect(g.herd).toBe(100);g.type='nomadic';act(w,{type:'realm',action:'muster'});expect(g.herd).toBe(0);expect(armyMonthlyPay(w,w.realm!.armies[0])).toBe(45);act(w,{type:'realm',action:'disband'});expect(realmReason(w,{type:'realm',action:'muster'})).toContain('畜群');
  g.type='tribal';g.support=49;expect(realmReason(w,{type:'realm',action:'muster'})).toContain('支持');g.support=70;act(w,{type:'realm',action:'muster'});expect(g.support).toBe(60);expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('封建税赋和军役契约改变收益，且领有可随合格家业交接',()=>{
  const w=start(),g=governmentOf(w)!;g.type='feudal';const base=cityYield(w,'jiankang').coins;
  act(w,{type:'government',action:'contract',site:'jiankang',contract:'tax'});expect(cityYield(w,'jiankang').coins).toBeGreaterThan(base);expect(()=>act(w,{type:'government',action:'contract',site:'jiankang',contract:'levy'})).toThrow('90');
  act(w,{type:'heir',target:'xiao-gang'});act(w,{type:'handover'});expect(w.realm!.cities.jiankang.governor).toBe('xiao-gang');expect(w.holdings.governedCities).toContain('jiankang');expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('东魏考课深化提高税收与月度功绩，任命门槛实际执行',()=>{
  const w=start('gao-huan');capitalReady(w);const before=cityYield(w,'ye').coins;act(w,{type:'government',action:'law',law:'east-assessment'});finish(w);expect(cityYield(w,'ye').coins).toBeGreaterThan(before);expect(governmentBonus(w,'east').tax).toBe(10);
  governmentOf(w)!.merit['gao-yang']=0;const cmd={type:'realm',action:'appoint',site:'ye',candidate:'gao-yang'} as const;expect(realmReason(w,cmd)).toContain('功绩至少 20');const beforeWorld=structuredClone(w);expect(()=>act(w,cmd)).toThrow('功绩至少 20');expect(w).toEqual(beforeWorld);
 });
 it('封建请任也不能绕过异族领有保护',()=>{
  const w=start('dugu-xin');governmentOf(w)!.type='feudal';w.realm!.cities.changan.governor='yuwen-tai';w.realm!.influence=200;
  expect(realmReason(w,{type:'realm',action:'petition',site:'changan'})).toContain('异族');
  const before=structuredClone(w);expect(()=>act(w,{type:'realm',action:'petition',site:'changan'})).toThrow('异族');expect(w).toEqual(before);
 });
 it('历史西魏议案允许宇文觉居君位、宇文护执政，不依靠自动换朝',()=>{const w=start('yuwen-tai');atYear(w,556);capitalReady(w);history(w,'west-regency');expect(governmentOf(w)!.ruler).toBe('yuan-kuo');expect(executive(w)).toBe(false);atYear(w,557);history(w,'zhou-accession');expect(regimeName(w,'west')).toBe('北周');expect(governmentOf(w)!.ruler).toBe('yuwen-jue');expect(governmentOf(w)!.executives).toEqual(['yuwen-hu']);expect(governmentOf(w)!.stages).toEqual(['west-regency','zhou-accession']);});
 it('历史北齐议案保留玩家、家业与真实前朝记录',()=>{const w=start('gao-huan');atYear(w,549);capitalReady(w);history(w,'east-regency');expect(executive(w)).toBe(false);atYear(w,550);const estate=structuredClone(w.holdings.estate);history(w,'qi-accession');expect(regimeName(w,'east')).toBe('北齐');expect(w.characterId).toBe('gao-huan');expect(w.holdings.estate).toEqual(estate);expect(w.realm!.mandate).toBe(false);expect(governmentOf(w)!.regimeId).toContain('east-political-');expect(w.realm!.governments!.regimes.at(-1)!.source).toBe(successionDefinitions['qi-accession'].source.url);});
 it('梁陈议案保存已失辖地、响应公职及真实受益人，不转移全国边界',()=>{const w=start();atYear(w,555);capitalReady(w);w.realm!.cities.jiangling.owner='west';w.realm!.cities.jiangling.controller='west';w.realm!.cities.jiangling.governor=null;history(w,'chen-regency');expect(governmentOf(w)!.ruler).toBe('xiao-fangzhi');expect(governmentOf(w)!.executives).toEqual(['chen-baxian']);expect(executive(w)).toBe(false);atYear(w,557);const before=w.realm!.governments!.regimes.find(v=>v.id==='liang-0')!;history(w,'chen-accession');const current=w.realm!.governments!.regimes.find(v=>v.id===governmentOf(w)!.regimeId)!;expect(current.predecessor).toBe(before.id);expect(before.until).toBe(current.from);expect(current.cities).not.toContain('jiangling');expect(w.realm!.cities.jiangling.owner).toBe('west');expect(regimeName(w,'liang')).toBe('陈');expect(governmentOf(w)!.ruler).toBe('chen-baxian');});
 it('旧沙盒迁移不改资产、军队、治理权；教学局不强制添加政体',()=>{
  const w=start();pass(w,35);delete w.realm!.governments;const migrated=parseWorld(serializeWorld(w));expect(migrated.realm!.governments!.since).toBe(35);expect(migrated.holdings).toEqual(w.holdings);expect(migrated.realm!.treasuries).toEqual(w.realm!.treasuries);expect(migrated.realm!.armies).toEqual(w.realm!.armies);
  const old=newCampaignWorld();expect(parseWorld(serializeWorld(old)).realm).toBeUndefined();
 });
 it('拒绝伪造的政体、功绩、日期、阶段、继承链及进度',()=>{
  const edits:((w:World)=>void)[]=[w=>{governmentOf(w)!.type='bad' as never;},w=>{governmentOf(w)!.merit.ghost=1;},w=>{governmentOf(w)!.support=101;},w=>{governmentOf(w)!.stages=['chen-accession'];},w=>{w.realm!.governments!.regimes[0].predecessor='liang-0';},w=>{governmentOf(w)!.executives=['xiao-gang'];},w=>{w.realm!.governments!.lastMonthly=30;},w=>{governmentOf(w)!.task={kind:'government',target:'feudal',started:0,required:180,progress:100,sponsor:'xiao-yan'};}];
  for(const edit of edits){const w=start();edit(w);expect(()=>serializeWorld(w)).toThrow('存档');}
 });
});
