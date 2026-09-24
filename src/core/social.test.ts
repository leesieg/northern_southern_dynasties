import { describe,it,expect } from 'vitest';
import { act,advance,newCampaignWorld } from './world';
import { acceptance,buildingModifiers,heirs,interactionQuote,pair } from './social';
import { buildQuote } from './construction';
import { parseWorld,serializeWorld,validateWorld } from './save';
import { campaignGoals } from './campaign';
describe('人物、家族与交往闭环',()=>{
 it('特质与世业影响实付工程，开工后快照不重算',()=>{
  const w=newCampaignWorld('xiao-yan'),command={type:'build',scope:'city',site:'jiankang',building:'market'} as const;
  expect(buildQuote(w,command).cost).toBe(72);act(w,{type:'legacy',branch:'stewardship'});expect(buildQuote(w,command).cost).toBe(68);
  act(w,command);const project=structuredClone(w.holdings.cities.jiankang.project);w.social!.stress=90;expect(buildingModifiers(w).timeRate).toBe(120);
  const loaded=parseWorld(serializeWorld(w));expect(loaded.holdings.cities.jiankang.project).toEqual(project);advance(loaded,project!.due);expect(loaded.holdings.cities.jiankang.levels.market).toBe(1);expect(loaded.social!.renown).toBe(15);
 });
 it('拒绝请求不扣资源；礼物产生压力和冷却；请援真正结算',()=>{
  const w=newCampaignWorld('xiao-yan'),before=structuredClone(w);
  expect(()=>act(w,{type:'interact',target:'yuwen-tai',action:'aid'})).toThrow();expect(w).toEqual(before);
  act(w,{type:'interact',target:'xiao-gang',action:'gift'});expect(w.social!.stress).toBe(8);expect(w.social!.opinions[pair('xiao-yan','xiao-gang')]).toBe(40);
  const after=structuredClone(w);expect(()=>act(w,{type:'interact',target:'xiao-gang',action:'gift'})).toThrow();expect(w).toEqual(after);
  act(w,{type:'interact',target:'xiao-gang',action:'aid'});expect(w.people[0].coins).toBe(560);expect(interactionQuote(w,'xiao-gang','aid').reason).toContain('冷却');
 });
 it('交好进度与随机结果读档一致，不提前结算',()=>{
  const w=newCampaignWorld('gao-huan');act(w,{type:'interact',target:'gao-cheng',action:'befriend'});expect(w.social!.scheme!.due).toBe(18);
  advance(w,8);const loaded=parseWorld(serializeWorld(w));advance(w,9);expect(w.social!.scheme).not.toBeNull();advance(w,1);advance(loaded,10);expect(loaded).toEqual(w);expect(w.social!.scheme).toBeNull();expect(w.social!.seed).not.toBe(546);
 });
 it('协理、施压、人情、休整及世业均有资源约束',()=>{
  const w=newCampaignWorld('xiao-gang');expect(acceptance(w,'xiao-yan').reduce((n,v)=>n+v.value,0)).toBeGreaterThanOrEqual(60);
  act(w,{type:'interact',target:'xiao-yan',action:'advisor'});expect(buildingModifiers(w).timeRate).toBe(90);
  act(w,{type:'interact',target:'xiao-yi',action:'pressure'});expect(w.social!.renown).toBe(30);expect(w.social!.stress).toBe(15);
  act(w,{type:'interact',target:'xiao-yi',action:'favor'});expect(w.social!.hooks[pair('xiao-gang','xiao-yi')]).toBe(0);expect(()=>act(w,{type:'interact',target:'xiao-yi',action:'favor'})).toThrow();
  act(w,{type:'rest'});expect(w.social!.stress).toBe(0);expect(()=>act(w,{type:'rest'})).toThrow();act(w,{type:'legacy',branch:'kinship'});expect(w.social!.legacies.kinship).toBe(1);expect(()=>act(w,{type:'legacy',branch:'kinship'})).toThrow();validateWorld(w);
 });
 it('家业交接保留资产与起始任务，换居所后仍能保存并完成原局',()=>{
  const w=newCampaignWorld('xiao-yan');act(w,{type:'build',scope:'estate',site:'jiankang',building:'fields'});
  const goals=campaignGoals(w),holdings=structuredClone(w.holdings),coins=w.people[0].coins;
  act(w,{type:'heir',target:'xiao-yi'});act(w,{type:'handover'});expect(w.characterId).toBe('xiao-yi');expect(w.people[0].home).toBe('xunyang');expect(w.holdings).toEqual(holdings);expect(w.people[0].coins).toBe(coins);expect(campaignGoals(w)).toEqual(goals);expect(heirs(w).some(c=>c.id==='xiao-yan')).toBe(false);
  const loaded=parseWorld(serializeWorld(w));
  for(const building of ['market','market','granary'] as const){act(loaded,{type:'build',scope:'city',site:'jiankang',building});advance(loaded,loaded.holdings.cities.jiankang.project!.due-loaded.day);}
  expect(loaded.campaign!.status).toBe('won');expect(parseWorld(serializeWorld(loaded))).toEqual(loaded);
 });
 it('跨家支继任拒绝，旧历史档补齐社交，旧工程保持原工期',()=>{
  const w=newCampaignWorld('yuan-baoju');expect(()=>act(w,{type:'heir',target:'yuan-shanjian'})).toThrow();delete w.social;delete w.relationships;
  act(w,{type:'build',scope:'city',site:'changan',building:'market'});const project=structuredClone(w.holdings.cities.changan.project);const loaded=parseWorld(serializeWorld(w));expect(loaded.social!.founder).toBe('yuan-baoju');expect(loaded.holdings.cities.changan.project).toEqual(project);
 });
 it.each(['stress','lineage','scheme','traits','hooks','heir','modifiers'])('拒绝损坏的 %s 数据',field=>{
  const w=newCampaignWorld('xiao-yan');act(w,{type:'build',scope:'city',site:'jiankang',building:'market'});
  if(field==='stress')w.social!.stress=101;
  if(field==='lineage')w.social!.lineage.push({id:'yuan-qin',day:0});
  if(field==='scheme')w.social!.scheme={target:'xiao-gang',started:0,due:14,chance:100};
  if(field==='traits')w.social!.traits['xiao-yan']=['generous','generous'];
  if(field==='hooks')w.social!.hooks[pair('xiao-yan','xiao-gang')]=-1;
  if(field==='heir')w.social!.heir='yuan-qin';
  if(field==='modifiers')w.holdings.cities.jiankang.project!.modifiers!.costRate=1;
  expect(()=>serializeWorld(w)).toThrow();
 });
});
