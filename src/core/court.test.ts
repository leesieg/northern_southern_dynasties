import {applyPowerArrangement,actPower,powerReason} from './powerPolitics';
import {nextMonthStart} from './calendar';
import {newGovernedCampaignWorld as newCampaignWorld} from './governedTestWorld';
import {historicalCharacters} from '../data/characters';
import { describe,it,expect } from 'vitest';
import {act,advance} from './world';
import { courtOf,courtReason,movementSummary,movementPower,courtBonus,advanceCourts,controlledShare,courtSalary } from './court';
import { governmentOf,regimeName,governmentReason,governmentTaskPause } from './government';
import { officeHierarchy,superiorOffice } from './offices';
import {validCourt} from './courtSave';
import {validGovernments} from './governmentSave';
import { cityYield,realmForecast,armyMonthlyPay } from './realm';
import { parseWorld,serializeWorld } from './save';
import type { World } from './types';
// Isolate these court-mechanism fixtures from demographic roster size; expanded politics has dedicated coverage.
const start=(id='xiao-yan')=>{const w=newCampaignWorld(id,undefined,'sandbox');for(const city of Object.values(w.realm!.cities))if(city.governor?.startsWith('county-official-'))city.governor=null;for(const g of Object.values(w.realm!.governments!.realms))for(const id of Object.keys(g.court!.members))if(!historicalCharacters.some(p=>p.id===id))delete g.court!.members[id];return w;};
function pass(w:World,days:number){for(let i=0;i<days;i++){if(w.realm!.event)act(w,{type:'realm',action:'event',choice:'decline'});advance(w,1);}if(w.realm!.event)act(w,{type:'realm',action:'event',choice:'decline'});}
function resources(w:World){w.realm!.influence=600;for(const t of Object.values(w.realm!.treasuries)){t.coins=10000;t.grain=10000;}}
function claimant(){const w=start('xiao-yi');resources(w);const g=governmentOf(w)!,c=courtOf(w)!;g.merit['xiao-yi']=80;g.legitimacy=35;g.support=90;c.members['xiao-gang']='conservative';act(w,{type:'court',action:'debate'});return w;}
function prepareUnification(){const w=start();resources(w);const g=governmentOf(w)!;g.legitimacy=95;g.support=90;g.merit['xiao-yan']=80;for(const city of Object.values(w.realm!.cities))if(city.owner!=='frontier'){city.owner='liang';city.controller='liang';city.governor=null;}w.holdings.governedCities=[];return w;}
describe('天朝朝廷、利益集团与王朝循环',()=>{
 it('旧档迁移空缺中央席位，不发明历史任官，教学局不加朝廷',()=>{const w=start();delete governmentOf(w)!.court;const loaded=parseWorld(serializeWorld(w));expect(Object.values(courtOf(loaded)!.ministries).every(v=>v===null)).toBe(true);expect(loaded.people).toEqual(w.people);expect(loaded.holdings).toEqual(w.holdings);expect(parseWorld(serializeWorld(newCampaignWorld())).realm).toBeUndefined();});
 it('功绩、官职、家族威望与特质参与集团势力，任免刷新科层与财政',()=>{
  const w=start();resources(w);const c=courtOf(w)!,g=governmentOf(w)!;g.merit['xiao-gang']=60;const before=movementPower(w,'liang','xiao-gang'),tax=cityYield(w,'jiankang').coins;
  act(w,{type:'court',action:'appoint',ministry:'finance',candidate:'xiao-gang'});expect(movementPower(w,'liang','xiao-gang')).toBe(before+20);expect(cityYield(w,'jiankang').coins).toBeGreaterThan(tax);expect(courtSalary(w,'liang')).toBe(4);
  const nodes=officeHierarchy(w),office=nodes.find(n=>n.id==='office:liang:ministry:finance')!;expect(office.holder).toBe('xiao-gang');expect(superiorOffice(nodes,office)?.holder).toBe('xiao-yan');
  expect(courtReason(w,{type:'court',action:'appoint',ministry:'military',candidate:'xiao-gang'})).toContain('一人');
  const saved=parseWorld(serializeWorld(w));expect(courtOf(saved)).toEqual(c);pass(w,30);act(w,{type:'court',action:'appoint',ministry:'finance',candidate:null});expect(courtBonus(w,'liang').tax).toBe(0);expect(courtSalary(w,'liang')).toBe(0);
 });
 it('非执政人物可凭功绩请任，中央俸给计入预算而不会重复扣款',()=>{
  const w=start('xiao-gang');resources(w);governmentOf(w)!.merit['xiao-gang']=60;const base=realmForecast(w,'liang').expense;
  expect(courtReason(w,{type:'court',action:'appoint',ministry:'finance',candidate:'xiao-gang'})).toContain('执政');act(w,{type:'court',action:'seek-office',ministry:'secretariat'});expect(realmForecast(w,'liang').expense).toBe(base);expect(w.realm!.cities.jiankang.governor).toBeNull();
  const clone=structuredClone(w);courtOf(clone)!.ministries.secretariat=null;pass(w,30);pass(clone,30);expect(w.people[0].coins-clone.people[0].coins).toBe(4);expect(clone.realm!.treasuries.liang.coins-w.realm!.treasuries.liang.coins).toBe(4);
  expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('低功绩不自动指控腐败；职掌效果依对口能力、到任与实际监察结算',()=>{
  const w=start();resources(w);act(w,{type:'court',action:'appoint',ministry:'finance',candidate:'xiao-gang'});expect(courtOf(w)!.corruption).toBe(0);expect(courtBonus(w,'liang').tax).toBe(0);
  courtOf(w)!.corruption=8;governmentOf(w)!.merit['xiao-yi']=60;act(w,{type:'court',action:'appoint',ministry:'censorate',candidate:'xiao-yi'});w.mobility!.residences['xiao-yi']={site:'jiankang',journey:null};w.day=nextMonthStart(w.day,w.scriptId);advanceCourts(w);expect(courtOf(w)!.corruption).toBeLessThan(8);
  act(w,{type:'court',action:'appoint',ministry:'censorate',candidate:null});act(w,{type:'court',action:'appoint',ministry:'military',candidate:'xiao-yi'});act(w,{type:'realm',action:'muster'});const army=w.realm!.armies[0];expect(armyMonthlyPay(w,army)).toBe(56);expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('加入、游说、清议、集团领袖奏议均有成本和冷却，非玩家执政会裁决',()=>{
  const w=start('xiao-gang');resources(w);governmentOf(w)!.merit['xiao-gang']=70;act(w,{type:'court',action:'join',group:'reform'});act(w,{type:'court',action:'debate'});expect(movementSummary(w,'liang','reform').leader).toBe('xiao-gang');
  const before=structuredClone(w);expect(()=>act(w,{type:'court',action:'debate'})).toThrow('冷却');expect(w).toEqual(before);
  w.realm!.personalInfluence!['xiao-yan']=20;act(w,{type:'court',action:'petition'});pass(w,15);expect(courtOf(w)!.petition).toBeNull();expect(courtOf(w)!.policy).toBe('reform');expect(courtOf(w)!.favored).toBe('reform');expect(courtBonus(w,'liang').tax).toBe(8);
  const target='xiao-yi';w.social!.opinions[['xiao-gang',target].sort().join('|')]=90;act(w,{type:'court',action:'convince',target});expect(courtOf(w)!.members[target]).toBe('reform');expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('玩家执政奏议可明确批准，逾期否决；政体停用时也清理到期奏议',()=>{
  const w=start();resources(w);courtOf(w)!.petition={group:'dynastic',sponsor:'xiao-gang',due:w.day+15};act(w,{type:'court',action:'resolve',accept:true});expect(courtOf(w)!.petition).toBeNull();expect(governmentOf(w)!.legitimacy).toBe(73);pass(w,90);
  courtOf(w)!.petition={group:'dynastic',sponsor:'xiao-gang',due:w.day+15};const support=governmentOf(w)!.support;pass(w,15);expect(governmentOf(w)!.support).toBe(support-5);expect(courtOf(w)!.petition).toBeNull();
  pass(w,75);courtOf(w)!.petition={group:'dynastic',sponsor:'xiao-gang',due:w.day+15};governmentOf(w)!.type='feudal';pass(w,15);expect(courtOf(w)!.petition).toBeNull();expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('财政枯竭与天命受疑推动危局，影响真实收益并暂停改革；整饬可恢复',()=>{
  const w=start();resources(w);act(w,{type:'government',action:'adopt',government:'feudal'});const c=courtOf(w)!,g=governmentOf(w)!;c.tension=70;g.legitimacy=20;w.realm!.treasuries.liang.coins=0;w.realm!.treasuries.liang.grain=0;for(const city of Object.values(w.realm!.cities))if(city.owner==='liang'){city.grain=0;city.order=10;}w.day=31;advanceCourts(w);expect(c.phase).toBe('chaos');expect(courtBonus(w,'liang').tax).toBe(-25);expect(governmentTaskPause(w,'liang')).toContain('危局');const tension=c.tension;advanceCourts(w);expect(c.tension).toBe(tension);resources(w);for(const city of Object.values(w.realm!.cities))if(city.owner==='liang'){city.grain=10000;city.order=70;}g.legitimacy=90;g.support=90;act(w,{type:'court',action:'audit'});for(let i=0;i<15;i++){w.day=nextMonthStart(w.day,w.scriptId);advanceCourts(w);}expect(c.phase).toBe('stable');expect(courtBonus(w,'liang').tax).toBe(0);
 });
 it('月中议案交接保留最近月结事实，新阶段不伪造已结快照',()=>{const w=prepareUnification(),g=governmentOf(w)!,c=courtOf(w)!;c.tension=85;w.day=nextMonthStart(w.day,w.scriptId);advanceCourts(w);const settled=structuredClone(c.settlement);g.support=90;g.legitimacy=95;act(w,{type:'court',action:'found',mode:'unify',name:'华'});w.day++;applyPowerArrangement(w,'liang',w.politics!.proposals.liang!);expect(c.settlement).toEqual(settled);expect(validCourt(w,'liang')).toBe(true);expect(validGovernments(w)).toBe(true);});
 it('建朝议案产生新国统并保留接受者公职、真实军队及家业',()=>{const w=claimant(),g=governmentOf(w)!,estate=structuredClone(w.holdings.estate),cities=structuredClone(w.realm!.cities),bank=structuredClone(w.realm!.treasuries);act(w,{type:'court',action:'found',mode:'usurp',name:'燕'});expect(courtOf(w)!.founding).toBeNull();expect(w.politics!.proposals.liang!.stage).toBe('support');expect(parseWorld(serializeWorld(w)).politics).toEqual(w.politics);applyPowerArrangement(w,'liang',w.politics!.proposals.liang!);expect(regimeName(w,'liang')).toBe('燕');expect(g.ruler).toBe('xiao-yi');expect(g.executives).toEqual(['xiao-yi']);expect(w.holdings.estate).toEqual(estate);expect(w.realm!.treasuries).toEqual(bank);expect(w.realm!.cities).toEqual(cities);expect(w.realm!.governments!.regimes.find(v=>v.id===g.regimeId)).toMatchObject({kind:'political',name:'燕',predecessor:'liang-0'});expect(parseWorld(serializeWorld(w))).toEqual(w);});
 it('政治议案须交涉和实际支持，撤回保留已付成本并阻止并行改革',()=>{const w=claimant(),before=w.realm!.influence;act(w,{type:'court',action:'found',mode:'usurp',name:'燕'});expect(powerReason(w,{type:'power',action:'present'})).toContain('30');expect(governmentReason(w,{type:'government',action:'adopt',government:'feudal'})).not.toBe('');actPower(w,{type:'power',action:'cancel'});expect(w.realm!.influence).toBe(before-40);expect(w.politics!.proposals.liang).toBeUndefined();expect(parseWorld(serializeWorld(w))).toEqual(w);});
 it('建朝与政体改制分别办理，不凭国号自动改制或生成他国资产',()=>{const w=prepareUnification(),type=governmentOf(w)!.type,other=structuredClone(w.realm!.governments!.realms.east);expect(controlledShare(w,'liang')).toBe(100);act(w,{type:'court',action:'found',mode:'unify',name:'华'});applyPowerArrangement(w,'liang',w.politics!.proposals.liang!);expect(governmentOf(w)!.type).toBe(type);expect(regimeName(w,'liang')).toBe('华');expect(w.realm!.governments!.realms.east).toEqual(other);expect(parseWorld(serializeWorld(w))).toEqual(w);});
 it('政治交接保留接受者中央官职并撤回旧集团眷顾',()=>{const w=start();resources(w);act(w,{type:'court',action:'appoint',ministry:'finance',candidate:'xiao-gang'});act(w,{type:'court',action:'favor',group:'dynastic'});applyPowerArrangement(w,'liang',{goal:'ruler',sponsor:'xiao-yan',beneficiary:'xiao-gang',executive:'chen-baxian',name:''});expect(courtOf(w)!.ministries.finance).toBe('xiao-gang');expect(courtOf(w)!.favored).toBeNull();expect(courtOf(w)!.tenure).toBe('xiao-gang|chen-baxian');expect(parseWorld(serializeWorld(w))).toEqual(w);});
 it('恶意字段、跨国任官、重复占职、损坏局势和伪造国号拒绝且不变更世界',()=>{
  const mutations:((w:World)=>void)[]=[w=>{courtOf(w)!.ministries.finance='gao-huan';},w=>{courtOf(w)!.ministries.finance='xiao-gang';courtOf(w)!.ministries.personnel='xiao-gang';},w=>{courtOf(w)!.members.ghost='reform';},w=>{courtOf(w)!.phase='bad' as never;},w=>{courtOf(w)!.tension=NaN;},w=>{courtOf(w)!.tenure='stale';},w=>{courtOf(w)!.cooldowns.bad=100;},w=>{courtOf(w)!.petition={group:'unaligned',sponsor:'xiao-yan',due:2};}];for(const mutate of mutations){const w=start();mutate(w);expect(()=>serializeWorld(w)).toThrow('存档');}
  const w=claimant();for(const name of ['<script>','A',' ', '一二三四五六七']){const before=structuredClone(w);expect(()=>act(w,{type:'court',action:'found',name,mode:'usurp'})).toThrow();expect(w).toEqual(before);}
  for(const cmd of [{type:'court',action:'appoint',ministry:'__proto__',candidate:'xiao-gang'},{type:'court',action:'join',group:'__proto__'},{type:'court',action:'convince',target:'__proto__'}]){const before=structuredClone(w);expect(()=>act(w,cmd as never)).toThrow();expect(w).toEqual(before);}
 });
});
