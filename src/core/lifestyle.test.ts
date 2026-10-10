import {newGovernedCampaignWorld as newCampaignWorld} from './governedTestWorld';
import {describe,it,expect} from 'vitest';
import {act} from './world';
import {ensureLifestyle,lifestyleProgress,lifestylePoints,lifestyleLearning,lifestyleMasteries,lifestyleEffects,lifestyleQueue,advanceLifestyle,recordLifestylePractice,actLifestyle,validLifestyles} from './lifestyle';
import {lifestylePerks,branchPerks,branchFocuses,LIFESTYLE_XP_PER_POINT,type LifestyleBranch} from '../data/lifestyles';
import {nextMonthStart,monthStart} from './calendar';
import {armyDailyFood,armyMonthlyPay,cityYield,type Army} from './realm';
import {estateQuote,estateForecast,advanceEstateTenants} from './estates';
import {envoyEstimate} from './envoyTravel';
import {intrigueQuote,intrigueDefense} from './intrigue';
import {buildQuote} from './construction';
import {governmentOf} from './government';
import {routeGrant,localBalance} from './treasury';
import {parseWorld,serializeWorld} from './save';
import type {World} from './types';
const focus=(w:World,id:string)=>actLifestyle(w,{type:'lifestyle',action:'focus',focus:id});
const unlock=(w:World,id:string)=>actLifestyle(w,{type:'lifestyle',action:'unlock',perk:id});
function trained(branch:LifestyleBranch,id='xiao-yan',scope='public'){
 const w=newCampaignWorld(id,undefined,'sandbox');focus(w,scope+'_'+branch);w.day=12000;const p=ensureLifestyle(w);p.auto=false;p.xp[branch]=20*LIFESTYLE_XP_PER_POINT;
 for(const key of lifestyleQueue(w,branch))unlock(w,key);return w;
}
const army=(id:number,realm:'liang'|'east'='liang'):Army=>({id,realm,location:realm==='liang'?'jiankang':'ye',troops:600,morale:100,supply:120,journey:null,siege:0});
describe('生活重心',()=>{
 it('四类各有20节点，公私共用经验且可以直接学习特色起点',()=>{
  for(const branch of ['stewardship','diplomacy','martial','intrigue'] as const){const perks=branchPerks(branch);expect(perks).toHaveLength(20);expect(branchFocuses(branch)).toHaveLength(2);
   for(const scope of ['common','public','private'])expect(perks.filter(([,p])=>p.scope===scope)).toHaveLength(scope==='common'?2:9);
   for(const scope of ['public','private']){const w=newCampaignWorld('xiao-gang');focus(w,scope+'_'+branch);const root=perks.find(([,p])=>p.scope===scope&&!p.requires.length)!;unlock(w,root[0]);expect(lifestylePoints(ensureLifestyle(w),branch)).toBe(0);}
  }
 });
 it('错误前置、重复和未知指令不改动成长记录',()=>{
  const w=newCampaignWorld('xiao-gang');focus(w,'public_stewardship');for(const key of ['crews','drill','__proto__']){const before=structuredClone(w);expect(()=>unlock(w,key)).toThrow();expect(w).toEqual(before);}unlock(w,'ledgers');const before=structuredClone(w);expect(()=>unlock(w,'ledgers')).toThrow('已经');expect(w).toEqual(before);
 });
 it('月度成长按投入天数结算，实践全来源共享上限并在存读后保持幂等',()=>{
  const w=newCampaignWorld('gao-huan');focus(w,'public_martial');ensureLifestyle(w).auto=false;expect(lifestyleLearning(w).total).toBe(20);w.social!.stress=90;expect(lifestyleLearning(w).total).toBe(18);w.social!.stress=0;
  const end=nextMonthStart(0,w.scriptId);for(let day=1;day<end;day++){w.day=day;advanceLifestyle(w);}expect(ensureLifestyle(w).xp.martial).toBe(360);
  recordLifestylePractice(w,w.characterId!,'martial');recordLifestylePractice(w,w.characterId!,'martial');expect(lifestyleLearning(w).practice).toBe(2);
  w.day=end;advanceLifestyle(w);expect(ensureLifestyle(w).xp.martial).toBe(360+Math.floor(20*(end-1)/end+2));expect(ensureLifestyle(w).study).toBeNull();
  const restored=parseWorld(serializeWorld(w)),snapshot=serializeWorld(restored);advanceLifestyle(restored);expect(serializeWorld(restored)).toBe(snapshot);expect(()=>actLifestyle(restored,{type:'lifestyle',action:'study',choice:'practice'})).toThrow('月度');
 });
 it('最高月速连续300个月仍未学完整类，重复月底推进不能多领经验',()=>{
  // Isolated monthly ledger test, no long game simulation or full-world advance.
  const w=newCampaignWorld('gao-huan');focus(w,'public_martial');const p=ensureLifestyle(w);p.auto=false;
  for(let month=0;month<300;month++){p.month={start:monthStart(w.day,w.scriptId),credit:{martial:20,stewardship:0,diplomacy:0,intrigue:0},practice:{martial:2,stewardship:0,diplomacy:0,intrigue:0}};w.day=nextMonthStart(w.day,w.scriptId);advanceLifestyle(w);const xp=p.xp.martial;advanceLifestyle(w);expect(p.xp.martial).toBe(xp);}
  expect(p.xp.martial).toBe(360+300*22);expect(Math.floor(p.xp.martial/360)).toBe(19);expect(p.xp.martial).toBeLessThan(20*360);expect(validLifestyles(w)).toBe(true);
 });
 it('90日冷却、跨类保留和初选点数不重复',()=>{
  const w=newCampaignWorld('xiao-gang');focus(w,'private_stewardship');unlock(w,'household_accounts');expect(()=>focus(w,'private_diplomacy')).toThrow('90');w.day=90;const old=ensureLifestyle(w).xp.stewardship;focus(w,'private_diplomacy');expect(ensureLifestyle(w).xp.stewardship).toBe(old);expect(ensureLifestyle(w).xp.diplomacy).toBe(0);expect(lifestyleEffects(w,{kind:'estate'}).estateBuildCost).toBe(3);
 });
 it('优先学习自动补前置，暂停自动学习后余点保留',()=>{
  const w=newCampaignWorld('xiao-gang');focus(w,'public_stewardship');actLifestyle(w,{type:'lifestyle',action:'plan',perk:'administrator'});expect(lifestyleQueue(w,'stewardship').slice(0,3)).toEqual(['husbandry','ledgers','administrator']);w.day=1;advanceLifestyle(w);expect(ensureLifestyle(w).perks).toEqual(['husbandry']);
  actLifestyle(w,{type:'lifestyle',action:'plan',auto:false});ensureLifestyle(w).xp.stewardship=720;w.day=1000;advanceLifestyle(w);expect(ensureLifestyle(w).perks).toEqual(['husbandry']);expect(lifestylePoints(ensureLifestyle(w),'stewardship')).toBe(1);expect(validLifestyles(w)).toBe(true);
 });
 it('公私方向草稿同步预览队列，但不改变实际重心、资源或学习记录',()=>{
  const w=newCampaignWorld('xiao-gang');focus(w,'public_stewardship');const before=structuredClone(w);expect(lifestyleQueue(w,'stewardship')[0]).toBe('ledgers');expect(lifestyleQueue(w,'stewardship',undefined,undefined,'private')[0]).toBe('household_accounts');expect(w).toEqual(before);
 });
 it('完整技能树可合法兼修并保留两个独立专长',()=>{
  for(const branch of ['martial','stewardship','diplomacy','intrigue'] as const){const w=trained(branch);expect(lifestylePoints(ensureLifestyle(w),branch)).toBe(0);expect(lifestyleMasteries(w)).toHaveLength(2);expect(parseWorld(serializeWorld(w))).toEqual(w);for(const [id,p] of branchPerks(branch))expect(p.requires.every(req=>lifestylePerks[req].branch===p.branch&&req!==id)).toBe(true);}
 });
 it('私产技能不增加公库收入，公款技能不增加庄园钱租',()=>{
  const w=newCampaignWorld('xiao-yan',undefined,'sandbox'),before=cityYield(w,'jiankang');focus(w,'private_stewardship');unlock(w,'household_accounts');const privateYield=cityYield(w,'jiankang');expect(privateYield.coins).toBe(before.coins);expect(privateYield.estates).toEqual(before.estates);
  w.day=90;focus(w,'public_stewardship');const publicYield=cityYield(w,'jiankang');expect(publicYield.coins).toBeGreaterThan(before.coins);expect(publicYield.estates.map(e=>e.coins)).toEqual(before.estates.map(e=>e.coins));
  const other=cityYield(w,'jingkou');w.realm!.cities.jiankang.governor='xiao-gang';expect(lifestyleEffects(w,{kind:'governance',site:'jiankang'}).tax).toBe(0);expect(cityYield(w,'jingkou')).toEqual(other);
 });
 it('庄园收益读取真实主人，安置仍受县域人口与承载限制',()=>{
  const w=trained('stewardship','xiao-gang','private'),e=w.holdings.estate;e.population=1000;e.levels.fields=1;e.grain=80;e.levels.storehouse=1;const c={type:'estate',action:'tenants',estate:e.id,amount:100} as const,q=estateQuote(w,c),population=w.realm!.cities[e.location].population;expect(q.coins).toBeLessThan(10);
  act(w,c);expect(e.population).toBe(1100);expect(w.realm!.cities[e.location].population).toBe(population);expect(estateQuote(w,{...c,amount:2000}).reason).toContain('承载');const loss=estateForecast(w,e).loss;e.owner='xiao-yi';expect(estateForecast(w,e).loss).toBeGreaterThan(loss);expect(estateQuote(w,c).reason).toContain('庄主');
  e.rent='lenient';w.realm!.cities[e.location].order=20;const before=e.population;advanceEstateTenants(w);expect(e.population).toBeLessThanOrEqual(before);
 });
 it('新工程真实扣费与报价一致，切换后不追改在建工程',()=>{
  const w=trained('stewardship','xiao-gang');act(w,{type:'retinue',action:'recruit',person:'guest-liang'});act(w,{type:'retinue',action:'assign',person:'guest-liang',post:'engineer',site:'jiankang'});routeGrant(w,'jiankang',100,'营建预算');const c={type:'build',scope:'city',site:'jiankang',building:'market'} as const,q=buildQuote(w,c),money=localBalance(w,'jiankang');act(w,c);expect(localBalance(w,'jiankang')).toBe(money-q.cost);expect(w.holdings.cities.jiankang.project?.due).toBe(w.day+q.days);expect(parseWorld(serializeWorld(w))).toEqual(w);const project=structuredClone(w.holdings.cities.jiankang.project);w.day+=90;focus(w,'private_diplomacy');expect(w.holdings.cities.jiankang.project).toEqual(project);
 });
 it('军事加成随实际统帅变化，不覆盖所有可操作公军',()=>{
  const w=trained('martial'),a=army(1),b=army(2),enemy=army(3,'east');w.realm!.armies=[a,b,enemy];w.mobility!.armyCommanders={1:w.characterId!,2:'guest-liang'};expect(armyDailyFood(w,a)).toBeLessThan(armyDailyFood(w,b));expect(armyMonthlyPay(w,a)).toBeLessThan(armyMonthlyPay(w,b));const hostile=armyDailyFood(w,enemy);
  w.mobility!.armyCommanders[1]='guest-liang';expect(armyDailyFood(w,a)).toBe(armyDailyFood(w,b));expect(armyDailyFood(w,enemy)).toBe(hostile);
 });
 it('私军供养只作用于所有者实际出资，公库代付不取得私人折扣',()=>{
  const w=trained('martial','xiao-yan','private'),a=army(1);a.owner=w.characterId;a.payer='person:'+w.characterId;w.realm!.armies=[a];w.mobility!.armyCommanders={1:'guest-liang'};const privatePay=armyMonthlyPay(w,a);a.payer='central:liang';expect(armyMonthlyPay(w,a)).toBeGreaterThan(privatePay);a.payer='person:guest-liang';expect(armyMonthlyPay(w,a)).toBeGreaterThan(privatePay);
 });
 it('外交评分读取实际使者，国家负责人自己的私交技能不会共享',()=>{
  const w=newCampaignWorld('xiao-yan',undefined,'sandbox'),id='guest-liang',before=envoyEstimate(w,id,'liang','east','alliance',80);focus(w,'private_diplomacy');expect(envoyEstimate(w,id,'liang','east','alliance',80)).toEqual(before);actLifestyle(w,{type:'lifestyle',action:'focus',focus:'public_diplomacy'},id);const after=envoyEstimate(w,id,'liang','east','alliance',80);expect(after.lifestyle).toBe(3);expect(after.score).toBeGreaterThan(before.score);expect(after.travel).toBe(before.travel);expect(after.parts.find(p=>p.label==='实际使者生活专长')?.value).toBe(3);
 });
 it('目标私向护卫与实际官员反制进入计谋，私人计谋不冒用公向效果',()=>{
  const w=newCampaignWorld('yuwen-tai',undefined,'sandbox'),target='xiao-yan',c={type:'intrigue',action:'start',kind:'murder',target} as const,base=intrigueQuote(w,c);actLifestyle(w,{type:'lifestyle',action:'focus',focus:'private_martial'},target);expect(intrigueDefense(w,w.characterId!,target,'murder')).toBe(3);expect(intrigueQuote(w,c).parts.at(-1)?.value).toBe(-3);expect(intrigueQuote(w,c).exposure).toBeGreaterThanOrEqual(base.exposure);
  focus(w,'public_intrigue');expect(lifestyleEffects(w,{kind:'scheme',public:false}).intrigueSuccess).toBe(0);expect(lifestyleEffects(w,{kind:'scheme',public:false}).publicIntrigue).toBe(0);
 });
 it('合法辅政按在位安排判断，私人槽位不决定公私，筹办仍由本人付钱',()=>{
  const w=newCampaignWorld('xiao-yan',undefined,'sandbox'),c={type:'intrigue',action:'start',kind:'recruit',target:'xiao-gang',realm:'liang',beneficiary:'xiao-yan',executive:'xiao-yan',powerGoal:'executive',promise:'gift'} as const;focus(w,'public_intrigue');const q=intrigueQuote(w,c);expect(q.reason).toBe('');expect(q.slot).toBe('personal');expect(q.parts.find(p=>p.label==='生活重心与技能')?.value).toBe(3);
  expect(intrigueQuote(w,{...c,beneficiary:'xiao-yi'}).parts.find(p=>p.label==='生活重心与技能')?.value).toBe(0);const publicFunds=structuredClone(w.realm!.treasuries),money=w.people[0].coins;act(w,c);expect(w.people[0].coins).toBe(money-q.cost);expect(w.realm!.treasuries).toEqual(publicFunds);expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('公向反制只读取同地有效保护者，离开后立即停止提供防护',()=>{
  const w=newCampaignWorld('yuwen-tai',undefined,'sandbox'),id='guest-liang';governmentOf(w,'liang')!.court!.ministries.censorate=id;w.mobility!.residences[id].site='jiankang';actLifestyle(w,{type:'lifestyle',action:'focus',focus:'public_intrigue'},id);expect(intrigueDefense(w,w.characterId!,'xiao-yan','murder')).toBe(3);w.mobility!.residences[id].site='xunyang';expect(intrigueDefense(w,w.characterId!,'xiao-yan','murder')).toBe(0);
 });
 it('旧档保留技能、经验与前置，允许一次重选但不再赠点',()=>{
  const w=newCampaignWorld('gao-huan',undefined,'sandbox');w.day=200;const p=ensureLifestyle(w);p.focus='strategy';p.changed=190;p.xp.martial=810;p.perks=['drill','logistics'];w.lifestyles!.version=3;const loaded=parseWorld(serializeWorld(w)),q=ensureLifestyle(loaded);expect(loaded.lifestyles!.version).toBe(4);expect(q.focus).toBe('public_martial');expect(q.perks).toEqual(['drill','logistics']);expect(q.xp.martial).toBe(810);focus(loaded,'private_martial');expect(q.xp.martial).toBe(810);expect(()=>focus(loaded,'public_martial')).toThrow('90');expect(parseWorld(serializeWorld(loaded))).toEqual(loaded);
 });
 it('旧档补齐零成长记录，拒绝未知重心、伪造经验、非法队列与月预算',()=>{
  const old=newCampaignWorld('xiao-yi');delete old.lifestyles;expect(lifestyleProgress(parseWorld(serializeWorld(old)))?.xp).toEqual({martial:0,stewardship:0,diplomacy:0,intrigue:0});
  for(const mutate of [(w:World)=>{ensureLifestyle(w).focus='__proto__';},(w:World)=>{ensureLifestyle(w).xp.martial=721;},(w:World)=>{ensureLifestyle(w).priority={martial:'administrator'};},(w:World)=>{ensureLifestyle(w).perks=['strategist'];},(w:World)=>{ensureLifestyle(w).month={start:0,credit:{martial:21,stewardship:0,diplomacy:0,intrigue:0},practice:{martial:0,stewardship:0,diplomacy:0,intrigue:0}};}]){const w=newCampaignWorld('gao-huan');focus(w,'public_martial');mutate(w);expect(()=>serializeWorld(w)).toThrow('存档');}
 });
 it('继任者不遗传前任技能，虚构人物也能学习并保存庄园工程',()=>{
  const w=trained('stewardship'),before=structuredClone(lifestyleProgress(w));act(w,{type:'heir',target:'xiao-yi'});act(w,{type:'handover'});expect(lifestyleProgress(w)?.focus).toBeNull();expect(lifestyleMasteries(w)).toHaveLength(0);expect(w.lifestyles!.people['xiao-yan']).toEqual(before);expect(parseWorld(serializeWorld(w))).toEqual(w);
  const f=newCampaignWorld();focus(f,'private_stewardship');unlock(f,'surveying');act(f,{type:'build',scope:'estate',site:'jiankang',building:'fields'});expect(parseWorld(serializeWorld(f))).toEqual(f);
 });
});
