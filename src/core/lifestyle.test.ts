import {newGovernedCampaignWorld as newCampaignWorld} from './governedTestWorld';
import {routeGrant,localBalance} from './treasury';
import { describe,it,expect } from 'vitest';
import {act,advance} from './world';
import { ensureLifestyle,lifestyleProgress,lifestylePoints,lifestyleLearning,lifestyleBonuses,lifestyleMasteries } from './lifestyle';
import { lifestylePerks,branchPerks,LIFESTYLE_XP_PER_POINT,type LifestyleBranch } from '../data/lifestyles';
import { buildingModifiers,interactionQuote,acceptance } from './social';
import { cityYield,armyDailyFood,armyMonthlyPay,advanceRealm,siegeRequirement,type Army } from './realm';
import { buildQuote } from './construction';
import { parseWorld,serializeWorld } from './save';
import type { World } from './types';
const focus=(w:World,id:string)=>act(w,{type:'lifestyle',action:'focus',focus:id});
const unlock=(w:World,id:string)=>act(w,{type:'lifestyle',action:'unlock',perk:id});
function trained(branch:LifestyleBranch,id='xiao-yan'){const w=newCampaignWorld(id,undefined,'sandbox');w.day=300;focus(w,branch==='martial'?'strategy':branch==='stewardship'?'architecture':branch==='intrigue'?'intelligence':'etiquette');const p=ensureLifestyle(w);p.xp[branch]=branchPerks(branch).length*LIFESTYLE_XP_PER_POINT;for(const [id] of branchPerks(branch))unlock(w,id);return w;}
const army=(realm:'liang'|'east',location='jiankang'):Army=>({realm,location,troops:600,morale:100,supply:120,journey:null,siege:0});
describe('生活重心',()=>{
 it('初选一技能点，前置／重复／错路线均拒绝且不改变状态',()=>{
  const w=newCampaignWorld('xiao-gang');expect(lifestyleLearning(w).total).toBe(0);focus(w,'architecture');expect(lifestylePoints(ensureLifestyle(w),'stewardship')).toBe(1);
  for(const id of ['crews','drill','__proto__']){const before=structuredClone(w);expect(()=>unlock(w,id)).toThrow();expect(w).toEqual(before);}
  unlock(w,'surveying');const before=structuredClone(w);expect(()=>unlock(w,'surveying')).toThrow('已经');expect(w).toEqual(before);
 });
 it('每日经验、性格契合、高压力和暂停日数正确累计',()=>{
  const w=newCampaignWorld('gao-huan');focus(w,'strategy');expect(lifestyleLearning(w).total).toBe(5);advance(w,10);expect(ensureLifestyle(w).xp.martial).toBe(LIFESTYLE_XP_PER_POINT+50);
  w.social!.stress=90;expect(lifestyleLearning(w).total).toBe(4);advance(w,1);expect(ensureLifestyle(w).xp.martial).toBe(LIFESTYLE_XP_PER_POINT+54);advance(w,0);expect(ensureLifestyle(w).xp.martial).toBe(LIFESTYLE_XP_PER_POINT+54);
 });
 it('切换有 90 日冷却，保留原技能且初始点数不能重复领取',()=>{
  const w=newCampaignWorld('xiao-gang');focus(w,'architecture');unlock(w,'surveying');expect(()=>focus(w,'etiquette')).toThrow('90');advance(w,90);
  const old=ensureLifestyle(w).xp.stewardship;focus(w,'etiquette');expect(ensureLifestyle(w).xp.stewardship).toBe(old);expect(ensureLifestyle(w).xp.diplomacy).toBe(0);expect(lifestyleBonuses(w).buildCost).toBe(5);expect(lifestyleBonuses(w).acceptance).toBe(5);
 });
 it('月度研习只结算一次、锁定原路线、保存后不重新生成',()=>{
  const w=newCampaignWorld('gao-huan');focus(w,'strategy');advance(w,31);expect(ensureLifestyle(w).study?.branch).toBe('martial');
  const restored=parseWorld(serializeWorld(w)),xp=ensureLifestyle(restored).xp.martial,stress=restored.social!.stress;
  act(restored,{type:'lifestyle',action:'study',choice:'practice'});expect(ensureLifestyle(restored).xp.martial).toBe(xp+45);expect(restored.social!.stress).toBe(stress+8);
  expect(()=>act(restored,{type:'lifestyle',action:'study',choice:'practice'})).toThrow('暂无');expect(ensureLifestyle(restored).study).toBeNull();
 });
 it('全部技能形成有效依赖树，并授予独立的后天专长',()=>{
  for(const branch of ['martial','stewardship','diplomacy','intrigue'] as const){const w=trained(branch);expect(lifestylePoints(ensureLifestyle(w),branch)).toBe(0);expect(lifestyleMasteries(w)).toHaveLength(1);expect(parseWorld(serializeWorld(w))).toEqual(w);for(const [id,p] of branchPerks(branch))expect(p.requires.every(req=>lifestylePerks[req].branch===p.branch&&req!==id)).toBe(true);}
 });
 it('营建效果真实扣费和锁定工期，换重心不追改在建项目',()=>{
  const w=trained('stewardship','xiao-gang');w.social!.legacies.stewardship=2;expect(buildingModifiers(w).costRate).toBe(67);
  act(w,{type:'retinue',action:'recruit',person:'guest-liang'});act(w,{type:'retinue',action:'assign',person:'guest-liang',post:'engineer',site:'jiankang'});routeGrant(w,'jiankang',100,'营建预算');const q=buildQuote(w,{type:'build',scope:'city',site:'jiankang',building:'market'}),money=localBalance(w,'jiankang');
  act(w,{type:'build',scope:'city',site:'jiankang',building:'market'});expect(localBalance(w,'jiankang')).toBe(money-q.cost);
  expect(parseWorld(serializeWorld(w))).toEqual(w);const project=structuredClone(w.holdings.cities.jiankang.project);w.day+=90;focus(w,'etiquette');expect(w.holdings.cities.jiankang.project).toEqual(project);
 });
 it('管理税粮仅影响亲治城市，交游改变实际费用与好感',()=>{
  const w=newCampaignWorld('xiao-yan',undefined,'sandbox'),base=cityYield(w,'jiankang'),other=cityYield(w,'jingkou');focus(w,'domain');
  expect(cityYield(w,'jiankang').coins).toBeGreaterThan(base.coins);expect(cityYield(w,'jingkou')).toEqual(other);
  const d=trained('diplomacy'),q=interactionQuote(d,'xiao-gang','gift'),coins=d.people[0].coins,opinion=d.social!.opinions['xiao-yan|xiao-gang'];
  expect(q.cost).toBe(24);expect(acceptance(d,'xiao-gang').find(x=>x.label==='生活重心与技能')?.value).toBe(20);
  act(d,{type:'interact',target:'xiao-gang',action:'gift'});expect(d.people[0].coins).toBe(coins-24);expect(d.social!.opinions['xiao-yan|xiao-gang']).toBe(opinion+20);
 });
 it('军事军粮和军饷实际降低，敌军不会获得玩家技能',()=>{
  const w=trained('martial'),a=army('liang'),b=army('east','ye');w.realm!.armies=[a,b];expect(armyDailyFood(w,a)).toBeCloseTo(.17);expect(armyMonthlyPay(w,a)).toBe(51);expect(armyDailyFood(w,b)).toBeCloseTo(.2);
  advanceRealm(w);expect(a.supply).toBe(120);expect(b.supply).toBe(120);expect(a.foodRemainder).toBeLessThan(b.foodRemainder!);
  w.realm!.mandate=false;expect(armyDailyFood(w,a)).toBeCloseTo(.2);
 });
 it('军事技能提高实际野战伤害并缩短围城',()=>{
  const w=trained('martial');w.realm!.war={attacker:'liang',defender:'east',target:'ye',started:w.day,score:0};w.realm!.armies=[army('liang','ye'),army('east','ye')];advanceRealm(w);
  expect(w.realm!.armies[1].troops).toBeLessThan(w.realm!.armies[0].troops);
  const siege=trained('martial');siege.realm!.war={attacker:'liang',defender:'east',target:'ye',started:siege.day,score:0};const a=army('liang','ye');a.troops=4000;a.siege=29;siege.realm!.armies=[a];siege.realm!.treasuries.east.coins=0;
  const improved=siegeRequirement(siege,a);siege.realm!.mandate=false;expect(siegeRequirement(siege,a)).toBeGreaterThan(improved);siege.realm!.mandate=true;advanceRealm(siege);expect(a.siege).toBeGreaterThan(29);
 });
 it('继任者拥有独立记录，前任专长和经验不遗传',()=>{
  const w=trained('stewardship'),before=structuredClone(lifestyleProgress(w));act(w,{type:'heir',target:'xiao-yi'});act(w,{type:'handover'});
  expect(lifestyleProgress(w)?.focus).toBeNull();expect(lifestyleMasteries(w)).toHaveLength(0);expect(w.lifestyles!.people['xiao-yan']).toEqual(before);expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('旧档补齐无经验记录，伪造点数／前置／未知重心被拒绝',()=>{
  const old=newCampaignWorld('xiao-yi');delete old.lifestyles;const migrated=parseWorld(serializeWorld(old));expect(lifestyleProgress(migrated)?.xp).toEqual({martial:0,stewardship:0,diplomacy:0,intrigue:0});
  for(const mutate of [(w:World)=>{ensureLifestyle(w).focus='__proto__';},(w:World)=>{ensureLifestyle(w).xp.martial=5*LIFESTYLE_XP_PER_POINT+1;},(w:World)=>{ensureLifestyle(w).perks=['strategist'];},(w:World)=>{ensureLifestyle(w).perks=['drill','drill'];}]){const w=newCampaignWorld('gao-huan');focus(w,'strategy');mutate(w);expect(()=>serializeWorld(w)).toThrow('存档');}
 });
 it('虚构人物也能学习管理，工程修正随存档保存',()=>{
  const w=newCampaignWorld();focus(w,'architecture');unlock(w,'surveying');expect(buildingModifiers(w).costRate).toBe(90);
  act(w,{type:'build',scope:'estate',site:'jiankang',building:'fields'});expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
});
