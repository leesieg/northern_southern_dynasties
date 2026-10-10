import {describe,it,expect} from 'vitest';
import {newCampaignWorld} from './world';
import {actIntrigue,advanceIntrigue,intrigueQuote,visibleSchemes,validIntrigue,schemeSupportBonus,consumeSchemeSupport,type IntrigueStart} from './intrigue';
import {actLifestyle,ensureLifestyle,advanceLifestyle,migrateLifestyles,validLifestyles,lifestyleBonuses} from './lifestyle';
import {governmentOf} from './government';
import {pair} from './social';
import {relationHooks,relationOpinion} from './relationships';
import {lifeOf,isAlive} from './lifeState';
import {accountWallet} from './obligations';
import {parseWorld,serializeWorld} from './save';
import type {World} from './types';
function world(actor='xiao-gang'){const w=newCampaignWorld(actor,undefined,'sandbox');w.people[0].coins=2000;for(const id of ['xiao-gang','xiao-yan','xiao-yi'])w.relationships!.reserves[id]=2000;for(const id of ['xiao-gang','xiao-yan','xiao-yi'])if(w.mobility?.residences[id])w.mobility.residences[id]={site:'jiankang',journey:null};w.people[0].location='jiankang';return w;}
function start(w:World,kind:IntrigueStart['kind']='befriend',extra:Partial<IntrigueStart>={},actor=w.characterId!){actIntrigue(w,{type:'intrigue',action:'start',kind,target:actor==='xiao-yan'?'xiao-gang':'xiao-yan',...extra},actor);return w.intrigue!.schemes.at(-1)!;}
function settle(w:World,s= w.intrigue!.schemes.at(-1)!){s.successRoll=0;w.day=s.due;advanceIntrigue(w);return s;}
describe('统一计谋',()=>{
 it('私财支付与保存独立抽签，重复同日推进不会增加进度或奖励',()=>{
  const w=world(),coins=w.people[0].coins,s=start(w);expect(w.people[0].coins).toBe(coins-s.cost);expect(s.spent).toBe(s.cost);expect(s.successRoll).not.toBe(s.exposureRoll);
  w.day+=5;advanceIntrigue(w);const snapshot=structuredClone(w);advanceIntrigue(w);expect(w).toEqual(snapshot);
  const restored=parseWorld(serializeWorld(w));expect(restored.intrigue).toEqual(w.intrigue);settle(restored);const done=structuredClone(restored);advanceIntrigue(restored);expect(restored).toEqual(done);
 });
 it('个人与敌对各一项，重复开始或缺私财完全不写状态',()=>{
  const w=world();start(w);start(w,'murder');for(const kind of ['woo','abduct'] as const){const before=structuredClone(w);expect(()=>start(w,kind)).toThrow('最多一项');expect(w).toEqual(before);}
  const poor=world();poor.people[0].coins=0;const old=structuredClone(poor);expect(()=>start(poor)).toThrow('私财不足');expect(poor).toEqual(old);
 });
 it('取消、目标死亡或内应离场终止并保留已付成本，不重复结算',()=>{
  const w=world(),s=start(w);actIntrigue(w,{type:'intrigue',action:'cancel',scheme:s.id});expect(s.status).toBe('cancelled');const coins=w.people[0].coins;w.day=s.due;advanceIntrigue(w);expect(w.people[0].coins).toBe(coins);
  const dead=world(),d=start(dead);lifeOf(dead,d.target)!.death={day:dead.day,cause:'age'};dead.day++;advanceIntrigue(dead);expect(d.status).toBe('invalid');expect(dead.relationships!.bonds[pair(d.actor,d.target)]).toBeUndefined();
 });
 it('不能凭能力跨城遥控，需要实际自由的内应，驻留改变失效',()=>{
  const w=world();w.people[0].location='jingkou';const c:IntrigueStart={type:'intrigue',action:'start',kind:'murder',target:'xiao-yan'};expect(intrigueQuote(w,c).reason).toContain('同城');
  w.relationships!.oaths['xiao-yi']={lord:w.characterId!,since:0,loyalty:80};expect(intrigueQuote(w,{...c,agent:'xiao-yi'}).reason).toBe('');const s=start(w,'murder',{agent:'xiao-yi'});w.mobility!.residences['xiao-yi'].site='jiangling';w.day++;advanceIntrigue(w);expect(s.status).toBe('invalid');
 });
 it('未察觉的外人计谋完全隐藏，察觉后仍不泄露发起者和进度',()=>{
  const w=world('xiao-yan');const s=start(w,'murder',{target:'xiao-yan'},'xiao-gang');expect(visibleSchemes(w)).toEqual([]);expect(w.chronicle.some(c=>c.text.includes('开始谋害'))).toBe(false);s.exposureRoll=0;w.day=s.started+Math.ceil((s.due-s.started)/2);advanceIntrigue(w);const v=visibleSchemes(w)[0];expect(v.actor).toBeNull();expect(v.agent).toBeNull();expect(v.progress).toBeNull();expect(v.due).toBeNull();expect('successRoll' in v).toBe(false);s.successRoll=.999;w.day=s.due;advanceIntrigue(w);expect(visibleSchemes(w)[0].actor).toBe('xiao-gang');
 });
 it('暴露与成功独立：失败可以隐蔽，成功也可以暴露',()=>{
  const hidden=world(),a=start(hidden,'alienate',{secondary:'xiao-yi'});a.successRoll=.999;a.exposureRoll=.999;hidden.day=a.due;advanceIntrigue(hidden);expect([a.status,a.exposed]).toEqual(['failed',false]);
  const exposed=world(),b=start(exposed,'favor');b.successRoll=0;b.exposureRoll=0;exposed.day=b.due;advanceIntrigue(exposed);expect([b.status,b.exposed]).toEqual(['succeeded',true]);expect(relationHooks(exposed,b.actor,b.target)).toBe(1);
 });
 it('交好、倾慕、离间和人情消费权威关系，没有自动结婚或假忠诚',()=>{
  for(const kind of ['befriend','woo','alienate','favor'] as const){const w=world(),before=relationOpinion(w,'xiao-gang','xiao-yan'),marriages=structuredClone(w.relationships!.marriages),oaths=structuredClone(w.relationships!.oaths),s=start(w,kind,kind==='alienate'?{secondary:'xiao-yi'}:{});settle(w,s);expect(s.status).toBe('succeeded');if(kind==='woo')expect(relationOpinion(w,s.actor,s.target)).toBeGreaterThan(before);expect(w.relationships!.marriages).toEqual(marriages);expect(w.relationships!.oaths).toEqual(oaths);}
 });
 it('挟制须实际基础和人情，沿用摄政权限并只扣一次人情',()=>{
  const w=world('xiao-gang');w.social!.hooks[pair('xiao-gang','xiao-yan')]=2;governmentOf(w,'liang')!.merit['xiao-gang']=100;const s=start(w,'control');expect(relationHooks(w,s.actor,s.target)).toBe(0);settle(w,s);expect(w.relationships!.regencies.liang?.controller).toBe('xiao-gang');expect(s.exposed).toBe(true);expect(governmentOf(w,'liang')!.ruler).toBe('xiao-yan');
 });
 it('劫持沿用真实拘押；谋杀调用死亡继承和官职清理',()=>{
  const captive=world(),a=start(captive,'abduct');settle(captive,a);expect(captive.custody!.records[a.target].source).toBe('scheme:'+a.id);expect(isAlive(captive,a.target)).toBe(true);
  const killed=world(),b=start(killed,'murder');settle(killed,b);expect(lifeOf(killed,b.target)!.death?.cause).toBe('murder');expect(governmentOf(killed,'liang')!.ruler).not.toBe(b.target);expect(killed.life!.successions.some(v=>v.deceased===b.target)).toBe(true);
 });
 it('政治招揽必须明确安排，礼金是真实转移且取消不再重复支付',()=>{
  const w=world(),p={realm:'liang' as const,beneficiary:'xiao-yan',executive:'xiao-gang',powerGoal:'executive' as const,promise:'gift' as const};expect(intrigueQuote(w,{type:'intrigue',action:'start',kind:'recruit',target:'xiao-yi'}).reason).toContain('同一政权');const receiver=accountWallet(w,'person:xiao-yi')!.read(),before=w.people[0].coins,s=start(w,'recruit',{target:'xiao-yi',...p});expect(w.people[0].coins).toBe(before-120);expect(accountWallet(w,'person:xiao-yi')!.read()).toBe(receiver+40);expect(s.spent+s.gift).toBe(s.cost);actIntrigue(w,{type:'intrigue',action:'cancel',scheme:s.id});expect(accountWallet(w,'person:xiao-yi')!.read()).toBe(receiver+40);
 });
 it('政治支持只作用于指定安排、期限和实际职位，不能转走军队',()=>{
  const w=world(),r='liang' as const;w.realm!.cities.jingkou.governor='xiao-yi';const p={goal:'executive' as const,sponsor:'xiao-gang',beneficiary:'xiao-yan',executive:'xiao-gang',name:''},armies=structuredClone(w.realm!.armies),s=start(w,'recruit',{target:'xiao-yi',realm:r,beneficiary:p.beneficiary,executive:p.executive,powerGoal:p.goal,promise:'office'});settle(w,s);expect(schemeSupportBonus(w,r,p,'xiao-yi')).toBe(25);expect(schemeSupportBonus(w,r,{...p,executive:'xiao-yi'},'xiao-yi')).toBe(0);expect(w.realm!.armies).toEqual(armies);consumeSchemeSupport(w,r,p);expect(w.intrigue!.supports[0].status).toBe('pledged');governmentOf(w,r)!.executives=[p.executive];consumeSchemeSupport(w,r,p);expect(w.intrigue!.supports[0].status).toBe('honored');expect(schemeSupportBonus(w,r,p,'xiao-yi')).toBe(0);w.realm!.cities.jingkou.governor=null;w.day++;advanceIntrigue(w);expect(w.intrigue!.supports[0].status).toBe('broken');const opinion=relationOpinion(w,p.sponsor,'xiao-yi');advanceIntrigue(w);expect(relationOpinion(w,p.sponsor,'xiao-yi')).toBe(opinion);
 });
 it('持久化校验拒绝重复槽位、伪造成本、抽签和支持',()=>{
  const w=world();start(w);expect(validIntrigue(w)).toBe(true);for(const mutate of [(x:World)=>x.intrigue!.schemes[0].successRoll=1,(x:World)=>x.intrigue!.schemes[0].spent++,(x:World)=>{const a=structuredClone(x.intrigue!.schemes[0]);a.id=x.intrigue!.nextId++;x.intrigue!.schemes.push(a);},(x:World)=>x.intrigue!.schemes[0].exposed=true]){const copy=structuredClone(w);mutate(copy);expect(validIntrigue(copy)).toBe(false);}
 });
});
describe('NPC 计谋自主推进',()=>{
 it('安定时按月经营，审查按周去重，不动用玩家钱包和身份',()=>{
  const w=world();advanceIntrigue(w);w.day=7;advanceIntrigue(w);expect(w.intrigue!.schemes).toHaveLength(0);const coins=w.people[0].coins;w.day=35;advanceIntrigue(w);expect(w.intrigue!.schemes.length).toBeGreaterThan(0);expect(w.intrigue!.schemes.length).toBeLessThanOrEqual(3);expect(w.intrigue!.schemes.every(s=>s.actor!==w.characterId&&s.slot==='personal')).toBe(true);expect(w.people[0].coins).toBe(coins);const copy=structuredClone(w);advanceIntrigue(w);expect(w).toEqual(copy);expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('承压时优先真实议案密约，约定实际职位，不替玩家选择支持',()=>{
  const w=world('gao-huan');governmentOf(w,'liang')!.court!.phase='strained';w.politics={version:1,proposals:{liang:{goal:'executive',sponsor:'xiao-gang',beneficiary:'xiao-yan',executive:'xiao-gang',name:'',started:0,stage:'support',due:90,promises:{},approached:{}}},cooldowns:{},chiefs:{},assurances:[],history:[]};advanceIntrigue(w);w.day=7;const coins=w.people[0].coins;advanceIntrigue(w);const s=w.intrigue!.schemes.find(s=>s.kind==='recruit');expect(s?.actor).toBe('xiao-gang');expect(s?.promise).toBe('office');expect(s?.offices.length).toBeGreaterThan(0);expect(s?.target).not.toBe(w.characterId);expect(w.people[0].coins).toBe(coins);expect(validIntrigue(w)).toBe(true);
 });
 it('混乱时具备真实基础的敌对 NPC 会挟制，没有旧怨不任意谋害',()=>{
  const w=world('xiao-yan');governmentOf(w,'liang')!.court!.phase='chaos';governmentOf(w,'liang')!.merit['xiao-gang']=100;w.social!.opinions[pair('xiao-gang','xiao-yan')]=-100;w.social!.hooks[pair('xiao-gang','xiao-yan')]=2;advanceIntrigue(w);w.day=7;const coins=w.people[0].coins;advanceIntrigue(w);expect(w.intrigue!.schemes.some(s=>s.actor==='xiao-gang'&&s.kind==='control'&&s.target===w.characterId)).toBe(true);expect(w.intrigue!.schemes.some(s=>s.kind==='murder')).toBe(false);expect(w.people[0].coins).toBe(coins);expect(visibleSchemes(w)).toHaveLength(0);expect(validIntrigue(w)).toBe(true);
 });
});
describe('第四条谋略生活路线',()=>{
 it('旧 v2 三路经验和节点完整保留，迁移不会重复增发成长',()=>{
  const w=world();actLifestyle(w,{type:'lifestyle',action:'focus',focus:'architecture'});actLifestyle(w,{type:'lifestyle',action:'unlock',perk:'surveying'});ensureLifestyle(w).focus='architecture';w.lifestyles!.version=2;delete (w.lifestyles!.people[w.characterId!].xp as Partial<Record<string,number>>).intrigue;expect(validLifestyles(w)).toBe(true);const previous=w.lifestyles!.people[w.characterId!].xp.stewardship;migrateLifestyles(w);expect(w.lifestyles!.version).toBe(4);expect(ensureLifestyle(w).xp.stewardship).toBe(previous);expect(ensureLifestyle(w).perks).toEqual(['surveying']);expect(ensureLifestyle(w).xp.intrigue).toBe(0);const copy=structuredClone(w);migrateLifestyles(w);expect(w).toEqual(copy);
 });
 it('保留的五个节点成功与隐秘加成进入真实计谋预估',()=>{
  const w=world(),command:IntrigueStart={type:'intrigue',action:'start',kind:'murder',target:'xiao-yan'},base=intrigueQuote(w,command);actLifestyle(w,{type:'lifestyle',action:'focus',focus:'subterfuge'});const p=ensureLifestyle(w);p.xp.intrigue=1800;for(const perk of ['observers','cover','persuasion','leverage','schemer'])actLifestyle(w,{type:'lifestyle',action:'unlock',perk});const q=intrigueQuote(w,command);expect(q.chance).toBeGreaterThan(base.chance);expect(q.exposure).toBeLessThan(base.exposure);expect(lifestyleBonuses(w).personalSuccess).toBe(3);
 });
 it('NPC 可选择谋略、学习和解锁，同日不重复经验',()=>{
  const w=world();actLifestyle(w,{type:'lifestyle',action:'focus',focus:'intelligence'},'xiao-yi');w.day++;advanceLifestyle(w);const before=structuredClone(ensureLifestyle(w,'xiao-yi'));expect(before.xp.intrigue).toBe(360);advanceLifestyle(w);expect(ensureLifestyle(w,'xiao-yi')).toEqual(before);
 });
});
