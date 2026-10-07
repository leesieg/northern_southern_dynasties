import {syncRulerHistory} from './rulerHistory';
import {describe,it,expect} from 'vitest';
import {newCampaignWorld,act} from './world';
import {cityYield,realmForecast,armyDailyFood,declareRealmWarReason} from './realm';
import {collectFiscal,payFiscalOperations,fiscalPath} from './treasury';
import {settleLocalGrain,civilianFood} from './population';
import {consumeArmyFood,ensureArmyOrganization} from './armyOrganization';
import {advanceRealmStrategy,strategicTargets,validRealmStrategy} from './realmStrategy';
import {governingAuthority} from './government';
import {nextMonthStart} from './calendar';
import {actSiegeDecision,siegeBreakoutQuote,siegeDecisionReason} from './siegePhases';
import {detained} from './custodyState';
import {courtOf,courtCatalysts} from './court';
import {serializeWorld,parseWorld} from './save';
import {activeWars,ensureWars} from './wars';
import {validateWorld} from './save';
const start=()=>newCampaignWorld('xiao-yan',undefined,'sandbox');
describe('国家基础运转与战略',()=>{
 it('地方开支先用留用公款，预测与真实中央支出一致',()=>{
  const w=start(),r='liang',s=w.realm!;s.treasuries[r].coins=100000;for(const [id,c] of Object.entries(s.cities))if(c.controller===r)s.fiscal!.balances[fiscalPath(w,id)[0]]=10000;const rows=new Map(Object.entries(s.cities).filter(([,c])=>c.controller===r).map(([id])=>[id,cityYield(w,id)])),f=realmForecast(w,r,rows);collectFiscal(w,r,rows);const before=s.treasuries[r].coins;payFiscalOperations(w,r);expect(before-s.treasuries[r].coins).toBe(f.expense);expect(s.cities.jiankang.administration!.paid).toBe(s.cities.jiankang.administration!.need);expect(s.fiscal!.entries.some(e=>e.reason==='地方行政缺口补助')).toBe(false);validateWorld(w);
 });
 it('都城预测可用的中央粮仓在民食结算中真实补缺',()=>{
  const w=start(),c=w.realm!.cities.jiankang;c.population=600;c.grain=0;w.realm!.treasuries.liang.grain=10;const before=c.order;settleLocalGrain(w,'liang',id=>id==='jiankang'?0:civilianFood(w,id));expect(c.order).toBe(before);expect(w.realm!.treasuries.liang.grain).toBe(6);expect(c.population).toBe(600);
 });
 it('军粮与民食共用人日口径，每日累计零头而非向上取整',()=>{
  const w=start(),a={realm:'liang' as const,location:'jiankang',troops:600,morale:80,supply:120,journey:null,siege:0,foodRemainder:0};let food=0;for(let day=0;day<30;day++)food+=consumeArmyFood(w,a,100);expect(food).toBe(6);expect(armyDailyFood(w,a)*30).toBeCloseTo(food);expect(a.foodRemainder).toBe(0);
 });
 it('有动机和两月预算的 NPC 可以和平备战、共用宣战入口，并正常议和',()=>{
  const w=start(),s=w.realm!,actor=governingAuthority(w,'west')!;courtOf(w,'west')!.policy='expansion';s.treasuries.west={coins:100000,grain:10000,lastIncome:0,lastExpense:0,lastFood:0};s.personalInfluence![actor]=500;const target=strategicTargets(w,'west')[0];expect(target).toBeDefined();const home=Object.keys(s.cities).find(id=>s.cities[id].controller==='west')!;
  for(const id of ['dugu-xin','yuwen-hu']){s.armies.push({realm:'west',location:home,troops:600,morale:100,supply:120,journey:null,siege:0,automation:'delegated'});ensureArmyOrganization(w);const a=s.armies.at(-1)!;w.mobility!.armyCommanders??={};w.mobility!.armyCommanders[a.id!]=id;w.mobility!.residences[id]={site:home,journey:null};}
  s.strategy={west:{phase:'prepare',target:target.id,since:0,reviewed:0,reason:'边境敌对关系'}};w.day=31;advanceRealmStrategy(w);expect(activeWars(w)).toHaveLength(1);expect(activeWars(w)[0].attacker).toBe('west');expect(w.characterId).toBe('xiao-yan');expect(s.personalInfluence![actor]).toBe(460);validateWorld(w);const war=activeWars(w)[0];expect(declareRealmWarReason(w,actor,'west',target.id)).toContain('交战');w.day=nextMonthStart(w.day+450);advanceRealmStrategy(w);expect(activeWars(w)).toHaveLength(0);expect(s.strategy.west?.phase).toBe('recover');expect(s.truces[['west',war.defender].sort().join('|')]).toBeGreaterThan(w.day);expect(validRealmStrategy(w)).toBe(true);
 });
 it('拥立筹备对象已经即位后，改为割地须重新筹备，不能沿用旧目标的备战时日',()=>{
  const w=start(),s=w.realm!,actor=governingAuthority(w,'west')!;courtOf(w,'west')!.policy='expansion';s.treasuries.west={coins:100000,grain:10000,lastIncome:0,lastExpense:0,lastFood:0};s.personalInfluence![actor]=500;const target=strategicTargets(w,'west')[0],home=Object.keys(s.cities).find(id=>s.cities[id].controller==='west')!;
  for(const id of ['dugu-xin','yuwen-hu']){s.armies.push({realm:'west',location:home,troops:600,morale:100,supply:120,journey:null,siege:0,automation:'delegated'});ensureArmyOrganization(w);const a=s.armies.at(-1)!;w.mobility!.armyCommanders??={};w.mobility!.armyCommanders[a.id!]=id;w.mobility!.residences[id]={site:home,journey:null};}
  s.strategy={west:{phase:'prepare',target:target.id,goal:'claimant',claimant:'yuan-shanjian',since:0,reviewed:0,reason:'此前筹备拥立，现在受益人已经在位'}};w.day=31;advanceRealmStrategy(w);expect(activeWars(w)).toHaveLength(0);expect(s.strategy.west).toMatchObject({phase:'prepare',goal:'territory',since:31});expect(s.personalInfluence![actor]).toBe(500);expect(validRealmStrategy(w)).toBe(true);
 });
});

it('军粮旧档零头只换算一次，钱粮人口存量不变',()=>{
 const w=start();w.realm!.armies.push({realm:'liang',location:'jiankang',troops:600,morale:80,supply:10,journey:null,siege:0});ensureArmyOrganization(w);delete w.realm!.foodVersion;w.realm!.armies[0].foodRemainder=3000;const stocks=structuredClone(w.realm!.treasuries),cities=structuredClone(w.realm!.cities),loaded=parseWorld(serializeWorld(w));expect(loaded.realm!.foodVersion).toBe(2);expect(loaded.realm!.armies[0].foodRemainder).toBe(450000);expect(loaded.realm!.treasuries).toEqual(stocks);expect(loaded.realm!.cities).toEqual(cities);expect(parseWorld(serializeWorld(loaded))).toEqual(loaded);
});
it('集团静态分歧不会无限推高紧张，部分恢复不要求完美官署',()=>{
 const w=start(),c=courtOf(w)!;for(const id of Object.keys(c.members))c.members[id]='reform';c.corruption=60;c.tension=35;const causes=courtCatalysts(w,'liang');expect(causes.find(v=>v.label==='集团分歧')).toBeUndefined();expect(causes.some(v=>v.label==='收支与军饷平稳'&&v.value<0)).toBe(true);w.realm!.cities.jiankang.controller='east';expect(courtCatalysts(w,'liang').find(v=>v.label==='都城失守冲击')!.value).toBe(8);c.capitalLost=true;expect(courtCatalysts(w,'liang').find(v=>v.label==='都城失守冲击')!.value).toBe(0);
});
it('玩家朝廷收到议和提议后保有最终裁定权，拒绝不偷偷停战',()=>{
 const w=start();w.day=31;w.realm!.war={attacker:'east',defender:'liang',target:'jiankang',started:0,score:0};ensureWars(w);const war=w.realm!.wars![0];war.peaceOffer={from:'east',to:'liang',terms:'white',created:31,until:46};war.peaceReviewed=31;const before=structuredClone(w.realm!.treasuries);act(w,{type:'peaceOffer',war:war.id!,accept:false});expect(activeWars(w)).toHaveLength(1);expect(war.peaceOffer).toBeUndefined();expect(w.realm!.treasuries).toEqual(before);war.peaceOffer={from:'east',to:'liang',terms:'white',created:31,until:46};act(w,{type:'peaceOffer',war:war.id!,accept:true});expect(activeWars(w)).toHaveLength(0);validateWorld(w);
});

it('守城主官突围依实际道路、一次战果与真实俘获军队结算',()=>{
 for(const success of [true,false]){const w=start();w.realm!.cities.jiankang.governor='xiao-yan';w.realm!.war={attacker:'west',defender:'liang',target:'jiankang',started:0,score:0};ensureWars(w);const war=w.realm!.wars![0];w.realm!.armies.push({realm:'west',location:'jiankang',troops:600,morale:80,supply:120,journey:null,siege:0});ensureArmyOrganization(w);w.realm!.sieges=[{war:war.id!,site:'jiankang',side:'attack',progress:30,last:0,playerDecision:true,blockade:100}];const command={type:'siegeDecision',war:war.id!,site:'jiankang',choice:'breakout'} as const;expect(siegeBreakoutQuote(w,command).route).toBeDefined();expect(siegeDecisionReason(w,command)).toBe('');w.life!.seed=success?0:1000;actSiegeDecision(w,command);expect(w.realm!.cities.jiankang.controller).toBe('west');expect(w.realm!.cities.jiankang.owner).toBe('liang');expect(detained(w,'xiao-yan')).toBe(!success);if(success)expect(w.people[0].journey).not.toBeNull();else expect(w.custody!.records['xiao-yan'].army).toBe(w.realm!.armies[0].id);expect(()=>actSiegeDecision(w,command)).toThrow();syncRulerHistory(w);validateWorld(w);}
});
it('新局无战争时的日常收支能够覆盖地方补差，而不是靠初始中央余额延缓破产',()=>{
 const w=start();for(const r of ['liang','east','west'] as const){const f=realmForecast(w,r);expect(f.income-f.expense,JSON.stringify({realm:r,income:f.income,expense:f.expense})).toBeGreaterThanOrEqual(0);}
});
