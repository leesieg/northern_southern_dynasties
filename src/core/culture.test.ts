import {describe,it,expect} from 'vitest';
import {newGovernedCampaignWorld} from './governedTestWorld';
import {personCulture,culturalAppointment,culturalMilitarySupport} from './culture';
import {advanceUnrest,recordCulturalChange,actUnrest,validUnrest,demandSatisfied,unrestReason} from './unrest';
import {governmentOf,advanceGovernments,actGovernment} from './government';
import {governanceRules} from './governanceRules';
import {policyExecution} from './policyExecution';
import {fiscalPath,localBalance} from './treasury';
import {serializeWorld,parseWorld} from './save';
import {civilWar,settleCivilWar,advanceCivilPolitics} from './civilWars';
import {ensureArmyOrganization} from './armyOrganization';
import {ongoingItems} from './ongoing';
import {mapActivities} from './mapActivities';
import {pauseSnapshot,pauseEvents} from './pauseEvents';
import type {World} from './types';
const start=()=>newGovernedCampaignWorld('xiao-yan',undefined,'sandbox');
function conditions(w:World){const c=w.realm!.cities.jingkou;c.order=20;c.tax='heavy';c.grain=1000;w.realm!.fiscal!.balances[fiscalPath(w,'jingkou')[0]]=300;return c;}
function days(w:World,n:number){for(let i=0;i<n;i++){w.day++;advanceUnrest(w);}}
describe('文化身份、待遇与地方诉求',()=>{
 it('文化独立于效忠、旧外观和姓氏，保留敕勒与未详',()=>{const w=start();expect(personCulture(w,'gao-huan')).toBe('xianbei');expect(personCulture(w,'hulu-jin')).toBe('gaoche');expect(personCulture(w,'hou-jing')).toBe('unknown');expect(personCulture(w,'su-chuo')).toBe('han');expect(personCulture(w,'unrecorded')).toBe('unknown');expect(personCulture(w,'constructor')).toBe('unknown');w.identities!.people['gao-huan'].culture='southern';expect(personCulture(w,'gao-huan')).toBe('xianbei');});
 it('旧档不将北地衣冠迁成鲜卑，不追补压力，不改钱粮或基因',()=>{const w=start();w.day=180;delete w.unrest;for(const p of Object.values(w.identities!.people))delete p.cultureId;for(const c of Object.values(w.realm!.cities))delete c.cultureId;for(const g of Object.values(w.realm!.governments!.realms))delete g.rules!.cultural;const before=structuredClone({people:w.people,treasuries:w.realm!.treasuries,genome:w.identities!.people['xiao-yan'].genome});const loaded=parseWorld(serializeWorld(w));expect(loaded.unrest).toMatchObject({since:180,lastDay:180,items:[]});expect(personCulture(loaded,'xiao-yan')).toBe('han');expect({people:loaded.people,treasuries:loaded.realm!.treasuries,genome:loaded.identities!.people['xiao-yan'].genome}).toEqual(before);expect(governanceRules(loaded,'east').cultural).toBe('inclusive');expect(parseWorld(serializeWorld(loaded))).toEqual(loaded);});
 it('正常粮税不因异文化产生压力；同文化困境先预警，粮援在途不算抵达',()=>{const w=start();days(w,31);expect(w.unrest!.items).toEqual([]);const c=conditions(w),before=pauseSnapshot(w);days(w,31);const q=w.unrest!.items.find(q=>q.site==='jingkou')!;expect(q.stage).toBe('warning');expect(q.demand).toBe('tax');const fake=structuredClone(w);fake.unrest!.items[0].distressedDays=1;expect(validUnrest(fake)).toBe(false);for(const key of ['realm','site','organizer'] as const){const bad=structuredClone(w);(bad.unrest!.items[0] as unknown as Record<string,unknown>)[key]='__proto__';expect(validUnrest(bad)).toBe(false);}expect(pauseEvents(before,w).some(e=>e.id.startsWith('unrest:'))).toBe(true);expect(ongoingItems(w).some(q=>q.id.startsWith('unrest:'))).toBe(true);expect(mapActivities(w).some(g=>g.site==='jingkou')).toBe(true);c.tax='light';days(w,1);expect(q.stage).toBe('closed');expect(c.grain).toBe(1000);});
 it('起事真实扣人口钱粮，保存合法，不复制原将领部队，不自动更换君位',()=>{const w=start(),c=conditions(w),population=c.population,grain=c.grain,money=localBalance(w,'jingkou'),ruler=governmentOf(w)!.ruler,regime=governmentOf(w)!.regimeId;days(w,61);const war=civilWar(w,'liang')!,q=w.unrest!.items.find(q=>q.stage==='armed')!;expect(war?.civil?.grievance).toBe(q.id);expect(c.population).toBe(population-200);expect(c.grain+w.realm!.armies.at(-1)!.supply).toBe(grain);expect(localBalance(w,'jingkou')).toBe(money-50);expect(validUnrest(w)).toBe(true);expect(parseWorld(serializeWorld(w))).toEqual(w);const settled=structuredClone(w);advanceUnrest(w);expect(w).toEqual(settled);settleCivilWar(w,war,'yield','rebel');expect(c.tax).toBe('light');expect(governmentOf(w)).toMatchObject({ruler,regimeId:regime});expect(q.stage).toBe('closed');expect(parseWorld(serializeWorld(w))).toEqual(w);});
 it('有守军时不得凭事件夺库；镇压不抹掉原困境',()=>{const w=start(),c=conditions(w);w.realm!.armies.push({realm:'liang',location:'jingkou',troops:200,morale:60,supply:40,journey:null,siege:0});ensureArmyOrganization(w);const population=c.population,money=localBalance(w,'jingkou');days(w,65);expect(civilWar(w,'liang')).toBeUndefined();expect(c.population).toBe(population);expect(localBalance(w,'jingkou')).toBe(money);const q=w.unrest!.items[0];expect(q.stage).toBe('warning');w.realm!.armies=[];days(w,1);const war=civilWar(w,'liang')!;settleCivilWar(w,war,'demand','loyal');expect(c.tax).toBe('heavy');expect(c.order).toBe(20);expect(q.stage).toBe('closed');});
 it('文化压力只来自撤销真实待遇，权限与重复处理不留半次写入',()=>{const w=start(),g=governmentOf(w)!;g.rules!.cultural='customs';w.realm!.armies.push({realm:'liang',location:'jiangling',troops:200,morale:60,supply:40,journey:null,siege:0});ensureArmyOrganization(w);const a=w.realm!.armies.at(-1)!;(w.mobility!.armyCommanders??={})[a.id!]='xiao-yi';expect(culturalMilitarySupport(w,'liang','xiao-yi')).toBe(6);g.rules!.cultural='integration';g.rules!.revision++;recordCulturalChange(w,'liang','customs');recordCulturalChange(w,'liang','customs');expect(w.unrest!.items).toHaveLength(1);days(w,30);const q=w.unrest!.items[0];expect(q.stage).toBe('warning');expect(culturalMilitarySupport(w,'liang','xiao-yi')).toBe(-6);const before=structuredClone(w);expect(()=>actUnrest(w,{type:'unrest',action:'accommodate',id:q.id},'xiao-yi')).toThrow('执政者');expect(w).toEqual(before);actUnrest(w,{type:'unrest',action:'accommodate',id:q.id});expect(q.stage).toBe('closed');expect(w.realm!.cities.jiangling.culturalExemption).toMatchObject({leader:'xiao-yi'});expect(culturalMilitarySupport(w,'liang','xiao-yi')).toBe(6);const done=structuredClone(w);expect(()=>actUnrest(w,{type:'unrest',action:'accommodate',id:q.id})).toThrow();expect(w).toEqual(done);expect(parseWorld(serializeWorld(w))).toEqual(w);});
 it('政策有实施时间，报价由实际清税兑现，文化不修改能力或原基因',()=>{const w=start(),g=governmentOf(w)!;g.support=90;w.realm!.treasuries.liang.coins=10000;w.realm!.influence=200;const t={realm:'liang' as const,kind:'taxation' as const,site:'jingkou'},genome=structuredClone(w.identities);g.rules!.cultural='inclusive';expect(culturalAppointment(w,'liang','yuan-shanjian','xiao-yan')).toBe(0);const base=policyExecution(w,t,'thorough');actGovernment(w,{type:'government',action:'policy',dimension:'cultural',policy:'integration'});expect(governanceRules(w,'liang').cultural).toBe('inclusive');g.task!.progress=59;w.day=1;advanceGovernments(w);expect(governanceRules(w,'liang').cultural).toBe('integration');expect(culturalAppointment(w,'liang','yuan-shanjian','xiao-yan')).toBe(-4);expect(policyExecution(w,t,'thorough').recovered).toBeGreaterThan(base.recovered);expect(policyExecution(w,t,'thorough').work).toBe(base.work+15);expect(w.identities).toEqual(genome);});
 it('缺粮诉求军事获胜仍待真实粮援；损坏档与伪造冲突目标被拒绝',()=>{const w=start(),c=conditions(w);c.tax='normal';c.grain=0;days(w,61);const q=w.unrest!.items.find(q=>q.stage==='armed')!,war=civilWar(w,'liang')!;expect(q.demand).toBe('food');settleCivilWar(w,war,'yield','rebel');expect(q.stage).toBe('warning');expect(q.war).toBeNull();expect(demandSatisfied(w,q)).toBe(false);expect(c.grain).toBe(0);expect(parseWorld(serializeWorld(w))).toEqual(w);const broken=structuredClone(w);broken.unrest!.items[0].distressedDays=NaN;expect(()=>serializeWorld(broken)).toThrow('存档');const bad=structuredClone(w);bad.realm!.cities.jingkou.cultureId='fake' as never;expect(()=>serializeWorld(bad)).toThrow('存档');});
 it('撤销待遇后的原驻军只转阵营与付款端；起事提示与和解结算各一次',()=>{
  const w=start(),g=governmentOf(w)!;g.rules!.cultural='customs';w.realm!.armies.push({realm:'liang',location:'jiangling',payer:'central:liang',troops:200,morale:60,supply:40,journey:null,siege:0});ensureArmyOrganization(w);const a=w.realm!.armies.at(-1)!;(w.mobility!.armyCommanders??={})[a.id!]='xiao-yi';g.rules!.cultural='integration';recordCulturalChange(w,'liang','customs');days(w,30);w.realm!.fiscal!.balances[fiscalPath(w,'jiangling')[0]]=300;w.mobility!.residences['xiao-yi']={site:'jiangling',journey:null};const before=pauseSnapshot(w),troops=w.realm!.armies.reduce((n,a)=>n+a.troops,0),money=localBalance(w,'jiangling');days(w,30);
  const war=civilWar(w,'liang')!,q=w.unrest!.items[0];expect(q.stage).toBe('armed');expect(war.civil!.armies).toContain(a.id);expect(a.payer).toBe(fiscalPath(w,'jiangling')[0]);expect(w.realm!.armies.reduce((n,a)=>n+a.troops,0)).toBe(troops+200);expect(localBalance(w,'jiangling')).toBe(money-50);expect(pauseEvents(before,w).filter(e=>e.id.startsWith('unrest:'))).toHaveLength(1);expect(pauseEvents(before,w).some(e=>e.title==='地方民变起事')).toBe(false);
  const ruler=g.ruler;settleCivilWar(w,war,'yield','rebel');expect(g.ruler).toBe(ruler);const saved=structuredClone(w);settleCivilWar(w,war,'yield','rebel');expect(w).toEqual(saved);expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('原军镇组织者死亡后不换成任意居民，也不写入空待遇持有者',()=>{
  const w=start(),g=governmentOf(w)!;g.rules!.cultural='customs';w.realm!.armies.push({realm:'liang',location:'jiangling',troops:200,morale:60,supply:40,journey:null,siege:0});ensureArmyOrganization(w);(w.mobility!.armyCommanders??={})[w.realm!.armies.at(-1)!.id!]='xiao-yi';g.rules!.cultural='integration';recordCulturalChange(w,'liang','customs');days(w,30);const q=w.unrest!.items[0];w.life!.people['xiao-yi'].death={day:w.day,cause:'battle'};
  expect(unrestReason(w,{type:'unrest',action:'accommodate',id:q.id})).toContain('已失效');days(w,1);expect(q.stage).toBe('closed');expect(w.realm!.cities.jiangling.culturalExemption).toBeUndefined();expect(validUnrest(w)).toBe(true);
 });
 it('武装诉求的组织者死亡或治所易手时结束战事，保留真实损失',()=>{
  for(const ending of ['death','capture']){const w=start(),c=conditions(w);days(w,61);const q=w.unrest!.items.find(q=>q.stage==='armed')!,population=c.population,grain=c.grain,account=fiscalPath(w,'jingkou')[0],money=w.realm!.fiscal!.balances[account];if(ending==='death'){w.life!.people[q.organizer!].death={day:w.day,cause:'battle'};advanceCivilPolitics(w);}else {c.controller='east';days(w,1);}
   expect(q.stage).toBe('closed');expect(civilWar(w,'liang')).toBeUndefined();expect(c.population).toBe(population);expect(c.grain).toBe(grain);expect(w.realm!.fiscal!.balances[account]).toBe(money);expect(validUnrest(w)).toBe(true);
  }
 });
 it('赈粮须真实入仓才消解；清税沿批准快照，文化任用最多一项修正',()=>{
  const w=start(),c=conditions(w);c.tax='normal';c.grain=0;days(w,31);const q=w.unrest!.items[0];expect(demandSatisfied(w,q)).toBe(false);c.grain=10000;days(w,1);expect(q.stage).toBe('closed');const g=governmentOf(w)!;g.rules!.cultural='integration';
  expect(culturalAppointment(w,'liang','yuan-shanjian','xiao-yan','jingkou')).toBe(-4);const t={realm:'liang' as const,kind:'taxation' as const,site:'jingkou',policy:{...governanceRules(w,'liang'),culturalExemption:false}},quote=policyExecution(w,t,'thorough');g.rules!.cultural='customs';c.culturalExemption={leader:'xiao-yi',since:w.day};expect(policyExecution(w,t,'thorough')).toEqual(quote);
 });

 it('新局东西魏采用不同政策，旧档保持兼容默认而不追补待遇',()=>{
  const w=start();expect(governanceRules(w,'east').cultural).toBe('customs');expect(governanceRules(w,'west').cultural).toBe('inclusive');
  expect(w.unrest!.items).toHaveLength(0);
 });
 it.each(['tax','food'] as const)('武装后的 %s 诉求实际兑现即和解，不换朝、不回填损失或重复结算',demand=>{
  const w=start(),c=conditions(w),g=governmentOf(w)!,ruler=g.ruler,regime=g.regimeId;
  if(demand==='food'){c.tax='normal';c.grain=0;}
  days(w,61);const q=w.unrest!.items.find(q=>q.stage==='armed')!;
  expect(q.demand).toBe(demand);const population=c.population,money=localBalance(w,'jingkou');
  if(demand==='food')c.grain=10000;else c.tax='light';
  days(w,1);expect(q.stage).toBe('closed');expect(civilWar(w,'liang')).toBeUndefined();
  expect(g).toMatchObject({ruler,regimeId:regime});expect(c.population).toBe(population);expect(localBalance(w,'jingkou')).toBe(money);
  expect(parseWorld(serializeWorld(w))).toEqual(w);const settled=structuredClone(w);advanceUnrest(w);expect(w).toEqual(settled);
 });

});
