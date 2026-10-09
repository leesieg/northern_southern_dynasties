import {estateForecast} from './estates';
import {describe,it,expect} from 'vitest';
import {newCampaignWorld,advance} from './world';
import {advanceConstruction,estateYield} from './construction';
import {advanceRealm,realmForecast,actRealm,armyMonthlyPay} from './realm';
import {advanceSocial} from './social';
import {advanceFamilies} from './family';
import {advanceRelationships} from './relationships';
import {advanceGovernments} from './government';
import {advanceCourts} from './court';
import {advanceLife} from './life';
import {advancePersonalInfluence,personInfluence} from './personalInfluence';
import {advanceDiplomacy} from './diplomacy';
import {actRetinue,advanceRetinue} from './retinue';
import {advanceNPCOfficeRecruitment} from './npcOfficeRecruitment';
import {advanceEconomy,budgetFor} from './personalEconomyRules';
import {ensureEconomy,economyHost} from './personalEconomyAdapter';
import {incurObligation,advanceObligations} from './obligations';
import {actHousehold,advanceHousehold} from './householdPlans';
import {personResidence} from './residence';
import {parseWorld,serializeWorld,validateWorld} from './save';
import {upgradeContent} from './contentMigration';
import {monthStart,nextMonthStart} from './calendar';
import {officeReserves} from '../data/localOfficials';
import {newGovernedCampaignWorld} from './governedTestWorld';
const start=()=>newCampaignWorld('xiao-gang',undefined,'sandbox');
type World=ReturnType<typeof start>;
const periodic=[advanceConstruction,advanceSocial,advanceFamilies,advanceGovernments,advanceRelationships,advanceCourts,advanceLife,advancePersonalInfluence];
function resourceBalances(w:World){return {coins:w.people[0].coins,food:w.people[0].food,influence:personInfluence(w,w.characterId!),renown:w.social!.renown,stress:w.social!.stress,prestige:w.families!.prestige,reserves:w.relationships!.reserves,governments:Object.values(w.realm!.governments!.realms).map(g=>[g.legitimacy,g.support,g.herd,g.merit])};}

describe('资源统一月初结算',()=>{
 it('第 30、60 日不发放周期资源，2 月与 3 月 1 日各结算一次',()=>{
  const w=start();w.social!.stress=50;const initial=structuredClone(resourceBalances(w));
  w.day=30;for(const f of periodic)f(w);expect(resourceBalances(w)).toEqual(initial);
  w.day=31;for(const f of periodic)f(w);expect(w.people[0].coins).toBe(initial.coins+estateYield(w).coins);expect(w.social!.renown).toBe(initial.renown+10);expect(personInfluence(w,w.characterId!)).toBeGreaterThan(initial.influence);
  const once=structuredClone(resourceBalances(w));for(const f of periodic)f(w);expect(resourceBalances(w)).toEqual(once);
  expect(w.life!.lastMonthly).toBe(31);expect(w.realm!.governments!.lastMonthly).toBe(31);expect(w.relationships!.lastMonthly).toBe(31);
  w.day=59;for(const f of periodic)f(w);expect(w.people[0].coins).toBe(initial.coins+estateYield(w).coins*2);
  const march=structuredClone(resourceBalances(w));w.day=60;for(const f of periodic)f(w);expect(resourceBalances(w)).toEqual(march);
 });
 it('税收、地方粮食与官俸在月初产生真实流水，重复调用不再支付',()=>{
  const w=start(),before=w.realm!.treasuries.liang.coins;w.day=30;advanceRealm(w);expect(w.realm!.ledger).toHaveLength(0);expect(w.realm!.treasuries.liang.coins).toBe(before);
  w.day=31;const forecast=realmForecast(w,'liang');advanceRealm(w);expect(w.realm!.ledger.find(l=>l.realm==='liang')).toMatchObject({day:31,...forecast});
  expect(w.realm!.fiscal!.entries.some(e=>e.day===31&&e.reason.includes('俸'))).toBe(true);
  const coins=w.realm!.treasuries.liang.coins,records=w.realm!.ledger.length;advanceRealm(w);expect(w.realm!.treasuries.liang.coins).toBe(coins);expect(w.realm!.ledger).toHaveLength(records);
 });
 it('军饷与旧欠在月初支付，日常耗粮不改为月结',()=>{
  const w=newCampaignWorld('xiao-yan',undefined,'sandbox');actRealm(w,{type:'realm',action:'muster'});const a=w.realm!.armies[0];a.arrears=10;
  const food=()=>w.realm!.armies.reduce((n,a)=>n+a.supply,0)+Object.values(w.realm!.cities).reduce((n,c)=>n+c.grain,0)+Object.values(w.realm!.treasuries).reduce((n,t)=>n+t.grain,0),supply=food();w.day=30;advanceRealm(w);expect(food()).toBeLessThanOrEqual(supply);expect(a.foodRemainder).toBeGreaterThan(0);expect(a.arrears).toBe(10);expect(w.realm!.fiscal!.entries.some(e=>e.reason==='军饷与补发欠饷')).toBe(false);
  w.day=31;const pay=armyMonthlyPay(w,a);advanceRealm(w);expect(a.arrears).toBe(0);const entry=w.realm!.fiscal!.entries.find(e=>e.reason==='军饷与补发欠饷');expect(entry).toMatchObject({day:31,coins:pay+10});
  advanceRealm(w);expect(w.realm!.fiscal!.entries.filter(e=>e.reason==='军饷与补发欠饷')).toHaveLength(1);
 });
 it('闰年二月底和跨年仍用同一月初发放家产收入',()=>{
  for(const [year,month,day] of [[548,2,29],[548,12,31]]){
   const w=start();w.day=(Date.UTC(year,month-1,day)-Date.UTC(546,0,1))/86_400_000;const before=w.people[0].coins;
   advanceConstruction(w);expect(w.people[0].coins).toBe(before);w.day++;const income=estateForecast(w,w.holdings.estate).coins;advanceRealm(w);expect(w.people[0].coins).toBeGreaterThanOrEqual(before+income);expect(w.holdings.lastMonthly).toBe(w.day);expect(parseWorld(serializeWorld(w))).toEqual(w);
  }
 });
 it('NPC 私财、幕僚工资和朝贡按月初转移，月底不提前支付',()=>{
  const w=newGovernedCampaignWorld('xiao-gang',undefined,'sandbox');actRetinue(w,{type:'retinue',action:'recruit',person:'guest-liang'});w.diplomacy!.subjects.east='liang';
  const reserve=officeReserves.find(p=>p.realm==='liang')!.id,money=w.relationships!.reserves[reserve],cash=w.people[0].coins,guest=w.relationships!.reserves['guest-liang'],east=w.realm!.treasuries.east.coins;
  w.day=30;advanceRetinue(w);advanceDiplomacy(w);expect(w.people[0].coins).toBe(cash);expect(w.realm!.treasuries.east.coins).toBe(east);
  w.day=31;advanceRelationships(w);advanceRetinue(w);advanceDiplomacy(w);expect(w.relationships!.reserves[reserve]).toBe(money+5);expect(w.people[0].coins).toBe(cash-2);expect(w.relationships!.reserves['guest-liang']).toBe(guest+7);expect(w.realm!.treasuries.east.coins).toBe(east-20);
  const once=structuredClone(w);advanceRetinue(w);advanceDiplomacy(w);expect(w).toEqual(once);
 });
 it('生活账单在真实月初扣费，月中启动不追扣，当日重放不重复结算',()=>{
  const w=start();ensureEconomy(w);budgetFor(w.economy!,w.characterId!,0,w.scriptId).standard='comfortable';
  const before=w.people[0].coins;for(let day=1;day<=30;day++){w.day=day;advanceEconomy(w.economy!,economyHost(w));}expect(w.people[0].coins).toBe(before);
  w.day=31;advanceEconomy(w.economy!,economyHost(w));expect(w.people[0].coins).toBe(before-8);const once=structuredClone(w);advanceEconomy(w.economy!,economyHost(w));expect(w).toEqual(once);
  const activated=start();activated.day=40;ensureEconomy(activated);const current=activated.people[0].coins;activated.day=41;advanceEconomy(activated.economy!,economyHost(activated));expect(activated.people[0].coins).toBe(current);
 });
 it('债务下期落在下个月 1 日，缺款顺延且守恒，31 日月份不被校验拒绝',()=>{
  const w=start();w.day=31;incurObligation(w,'monthly-test','central:liang','person:xiao-gang',100,'借款');const d=w.obligations!.items[0];expect(d.next).toBe(59);
  w.realm!.treasuries.liang.coins=0;w.day=59;advanceObligations(w);expect(d.remaining).toBe(100);expect(d.next).toBe(90);
  w.realm!.treasuries.liang.coins=80;const before=w.people[0].coins;w.day=60;advanceObligations(w);expect(w.people[0].coins).toBe(before);
  w.day=90;advanceObligations(w);expect(w.people[0].coins).toBe(before+50);expect(w.realm!.treasuries.liang.coins).toBe(30);expect(d.next).toBe(120);advanceObligations(w);expect(d.paid).toBe(50);
  w.day=120;advanceObligations(w);expect(d.next).toBe(151);expect(d.remaining).toBe(20);expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('续期学资只在月初实付，课程按有效受教日增长，整期停课不收费',()=>{
  const w=newCampaignWorld('xiao-yan',undefined,'sandbox'),student='xiao-gang',teacher='chen-baxian';w.people[0].coins=1000;w.mobility!.residences[teacher]={site:personResidence(w,student).site,journey:null};
  actHousehold(w,{type:'household',action:'educate',target:student,teacher,skill:'martial'});const t=w.householdPlans!.tuition[0];expect(t.paid).toBe(30);expect(t.next).toBe(31);
  for(let day=1;day<=30;day++){w.day=day;advanceHousehold(w);}expect(t.paid).toBe(30);expect(t.completed).toBe(1);
  w.day=31;advanceHousehold(w);expect(t.paid).toBe(60);const once=structuredClone(t);advanceHousehold(w);expect(t).toEqual(once);
  w.mobility!.residences[teacher].site='ye';for(let day=32;day<=59;day++){w.day=day;advanceHousehold(w);}expect(t.paid).toBe(60);expect(t.progress).toBe(1);expect(t.next).toBe(90);expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('NPC 月度补缺与影响力使用同一个月初边界',()=>{
  const w=start();w.day=30;advanceNPCOfficeRecruitment(w);expect(w.realm!.local!.lastNPCRecruitment).toBeUndefined();w.day=31;advanceNPCOfficeRecruitment(w);expect(w.realm!.local!.lastNPCRecruitment).toBe(31);const once=structuredClone(w);advanceNPCOfficeRecruitment(w);expect(w).toEqual(once);
 });
 it.each([30,31,60])('旧档在第 %i 日迁移仅调整日程，不追补收入、不改历史流水，迁移幂等',day=>{
  const w=start();w.day=day;w.contentVersion='546-map-0.5';w.realm!.lastInfluenceIncome=30;w.realm!.ledger.push({day:30,realm:'liang',income:10,expense:2,food:3});ensureEconomy(w);budgetFor(w.economy!,w.characterId!,0).lastMonth=30;
  incurObligation(w,'old-calendar','central:liang','person:xiao-gang',100,'借款');w.obligations!.items[0].next=day+30;
  const resources=structuredClone(resourceBalances(w)),ledger=structuredClone(w.realm!.ledger);upgradeContent(w);
  expect(resourceBalances(w)).toEqual(resources);expect(w.realm!.ledger).toEqual(ledger);expect(w.realm!.lastInfluenceIncome).toBe(monthStart(day));expect(w.obligations!.items[0].next).toBe(nextMonthStart(day));expect(w.economy!.budgets[w.characterId!].lastMonth).toBe(monthStart(day));
  const once=structuredClone(w);upgradeContent(w);expect(w).toEqual(once);const loaded=parseWorld(serializeWorld(w));expect(loaded).toEqual(w);advancePersonalInfluence(loaded);expect(resourceBalances(loaded)).toEqual(resources);
 });
 it('新版非法月结日期、未来日期及旧档非法日期不能被迁移洗掉',()=>{
  const w=start();w.day=31;w.realm!.lastInfluenceIncome=30;expect(()=>validateWorld(w)).toThrow('存档');w.realm!.lastInfluenceIncome=59;expect(()=>validateWorld(w)).toThrow('存档');
  w.contentVersion='546-map-0.5';w.realm!.lastInfluenceIncome=29;expect(()=>upgradeContent(w)).toThrow('存档');
 });
 it('旧周期历史流水保留，切换后写入非月初流水仍会被拒绝',()=>{
  const w=start();w.day=30;w.contentVersion='546-map-0.5';w.realm!.ledger.push({day:30,realm:'liang',income:10,expense:2,food:3});upgradeContent(w);expect(()=>validateWorld(w)).not.toThrow();
  w.day=60;w.realm!.ledger.push({day:60,realm:'liang',income:10,expense:2,food:3});expect(()=>validateWorld(w)).toThrow('存档');
 });
 it('月底存读后跨到月初，与原世界一日推进得到相同结果',()=>{
  const w=start();w.day=30;const loaded=parseWorld(serializeWorld(w));advance(w);advance(loaded);expect(w.day).toBe(31);expect(w).toEqual(loaded);expect(w.realm!.lastMonthly).toBe(31);expect(w.realm!.lastInfluenceIncome).toBe(31);expect(w.economy!.budgets[w.characterId!].lastMonth).toBe(31);
 });
});
