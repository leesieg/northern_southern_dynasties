import {newGovernedCampaignWorld as newCampaignWorld} from './governedTestWorld';
import {personResidence} from './residence';
import { describe,it,expect } from 'vitest';
import {act,advance} from './world';
import { relationshipQuote,activeMarriage,spouseOf,friendship,relationOpinion,relationHooks,closeKin,setFriendship,advanceRelationships,syncRelationships,allegianceBonus } from './relationships';
import { governmentOf,governmentExecutive,governingExecutives,governingAuthority,governmentReason,politicalTitle } from './government';
import { realmReason } from './realm';
import { courtOf } from './court';
import { officeHierarchy } from './offices';
import { parseWorld,serializeWorld } from './save';
import { pair } from './social';
import type { World } from './types';
const start=(id='xiao-yan')=>newCampaignWorld(id,undefined,'sandbox');
function pass(w:World,days:number){for(let i=0;i<days;i++){if(w.realm!.event)act(w,{type:'realm',action:'event',choice:'decline'});advance(w,1);}if(w.realm!.event)act(w,{type:'realm',action:'event',choice:'decline'});}
function ready(w:World){w.people[0].coins=10000;w.social!.renown=500;w.realm!.influence=500;for(const t of Object.values(w.realm!.treasuries)){t.coins=10000;t.grain=10000;}}
const relation=(w:World,action:string,target:string)=>act(w,{type:'relationship',action,target} as never);
const save=(w:World)=>expect(parseWorld(serializeWorld(w))).toEqual(w);
describe('婚姻、友敌、效忠与傀儡控制',()=>{
 it('新旧赠礼入口共用特质效果与冷却，所有请援从私人储备扣除',()=>{
  const w=start();ready(w);const b='xiao-gang',before=w.people[0].coins+w.relationships!.reserves[b];
  relation(w,'gift',b);expect(w.people[0].coins+w.relationships!.reserves[b]).toBe(before);
  expect(()=>act(w,{type:'interact',action:'gift',target:b})).toThrow('冷却');
  act(w,{type:'interact',action:'aid',target:b});expect(w.people[0].coins+w.relationships!.reserves[b]).toBe(before);
  w.relationships!.reserves[b]=0;w.social!.hooks[pair(w.characterId!,b)]=1;
  expect(()=>act(w,{type:'interact',action:'favor',target:b})).toThrow('储备不足');save(w);
 });
 it('初始化已录婚姻和权臣格局；旧档迁移不发明历史单身',()=>{
  const w=start('xiao-gang');expect(spouseOf(w,'xiao-gang')).toBe('wang-lingbin');expect(spouseOf(w,'gao-huan')).toBe('lou-zhaojun');expect(w.relationships!.maritalBasis['yuan-qin']).toBe('unknown');expect(governingExecutives(w,'east')).toEqual(['gao-huan','gao-cheng']);
  const old=structuredClone(w);delete old.relationships;const migrated=parseWorld(serializeWorld(old));expect(spouseOf(migrated,'xiao-gang')).toBe('wang-lingbin');expect(migrated.people).toEqual(w.people);save(w);
 });
 it('赠礼、结亲、亲友援助与离婚形成有成本的完整婚姻生命周期',()=>{
  const w=start(),b='guest-liang';ready(w);relation(w,'gift',b);pass(w,10);relation(w,'gift',b);const money=w.people[0].coins;relation(w,'marry',b);expect(w.people[0].coins).toBe(money-100);expect(spouseOf(w,b)).toBe('xiao-yan');expect(activeMarriage(w,b)?.origin).toBe('simulation');
  const sum=w.people[0].coins+w.relationships!.reserves[b];relation(w,'aid',b);expect(w.people[0].coins+w.relationships!.reserves[b]).toBe(sum);expect(()=>relation(w,'aid',b)).toThrow('冷却');
  relation(w,'divorce',b);expect(spouseOf(w,b)).toBeNull();expect(friendship(w,'xiao-yan',b)).toBe('rival');expect(w.relationships!.marriages.at(-1)!.until).toBe(w.day);expect(()=>relation(w,'marry',b)).toThrow('冷却');save(w);
 });
 it('婚姻未知需明确建立架空起点，不覆盖已婚、不允许未成年、近亲或重婚',()=>{
  const w=start('yuan-qin');ready(w);expect(relationshipQuote(w,{type:'relationship',action:'marry',target:'guest-west'}).reason).toContain('资料未录');act(w,{type:'relationship',action:'marital-branch'});expect(w.relationships!.maritalBasis['yuan-qin']).toBe('simulation');expect(()=>act(w,{type:'relationship',action:'marital-branch'})).toThrow('已有');
  const married=start('xiao-gang');expect(relationshipQuote(married,{type:'relationship',action:'marry',target:'guest-liang'}).reason).toContain('已有');expect(closeKin('gao-yang','lou-zhaojun')).toBe(true);expect(closeKin('yuan-baoju','yuan-shanjian')).toBe(true);
  expect(relationshipQuote(w,{type:'relationship',action:'marry',target:'yuan-kuo'}).reason).toContain('成年');save(w);
 });
 it('培养友谊、至交、决裂、死敌和调解彼此互斥，并影响接受度',()=>{
  const w=start('xiao-gang'),b='xiao-yi';ready(w);w.people[0].location=personResidence(w,b).site;w.social!.opinions[pair(w.characterId!,b)]=80;relation(w,'befriend',b);const clone=parseWorld(serializeWorld(w));pass(w,14);pass(clone,14);expect(w).toEqual(clone);expect(friendship(w,'xiao-gang',b)).toBe('friend');
  w.people[0].location=personResidence(w,b).site;w.mobility!.residences[b].journey=null;expect(()=>relation(w,'confidant',b)).toThrow('30');pass(w,30);w.people[0].location=personResidence(w,b).site;relation(w,'confidant',b);expect(friendship(w,b,'xiao-gang')).toBe('confidant');relation(w,'rival',b);expect(friendship(w,b,'xiao-gang')).toBe('rival');pass(w,30);relation(w,'rival',b);expect(friendship(w,b,'xiao-gang')).toBe('nemesis');
  w.social!.opinions[pair(w.characterId!,b)]=100;w.people[0].location=personResidence(w,b).site;relation(w,'reconcile',b);expect(friendship(w,b,'xiao-gang')).toBeUndefined();save(w);
 });
 it('旧交好成功也生成朋友；施压背叛朋友；已决裂计谋不能覆写仇怨',()=>{
  const w=start('xiao-gang');ready(w);w.people[0].location=personResidence(w,'xiao-yi').site;w.social!.opinions[pair('xiao-gang','xiao-yi')]=90;act(w,{type:'interact',target:'xiao-yi',action:'befriend'});pass(w,14);expect(friendship(w,'xiao-gang','xiao-yi')).toBe('friend');act(w,{type:'interact',target:'xiao-yi',action:'pressure'});expect(friendship(w,'xiao-gang','xiao-yi')).toBe('rival');
  w.people[0].location=personResidence(w,'guest-liang').site;relation(w,'befriend','guest-liang');relation(w,'rival','guest-liang');pass(w,14);expect(friendship(w,'xiao-gang','guest-liang')).toBe('rival');save(w);
 });
 it('效忠影响真实军政协作，背誓留下敌对记录；不转移城市',()=>{
  const w=start('xiao-gang');ready(w);const owner=w.realm!.cities.jiankang.owner;relation(w,'pledge','xiao-yan');expect(w.relationships!.oaths['xiao-gang'].loyalty).toBe(70);expect(allegianceBonus(w,'liang')).toBe(3);relation(w,'renounce','xiao-yan');expect(w.relationships!.oaths['xiao-gang']).toBeUndefined();expect(friendship(w,'xiao-gang','xiao-yan')).toBe('rival');expect(w.realm!.cities.jiankang.owner).toBe(owner);expect(()=>relation(w,'pledge','xiao-yan')).toThrow('冷却');save(w);
 });
 it('招纳与解除效忠、忠诚崩溃解约，循环和跨国誓约被拒绝',()=>{
  const w=start();ready(w);w.social!.opinions[pair('xiao-yan','xiao-gang')]=90;relation(w,'recruit','xiao-gang');relation(w,'release','xiao-gang');expect(w.relationships!.oaths['xiao-gang']).toBeUndefined();relation(w,'recruit','xiao-gang');setFriendship(w,'xiao-yan','xiao-gang','nemesis');w.relationships!.oaths['xiao-gang'].loyalty=10;pass(w,30);expect(w.relationships!.oaths['xiao-gang']).toBeUndefined();expect(relationshipQuote(w,{type:'relationship',action:'recruit',target:'gao-yang'}).reason).toContain('同一政权');save(w);
  w.relationships!.oaths['xiao-gang']={lord:'xiao-yi',since:w.day,loyalty:70};w.relationships!.oaths['xiao-yi']={lord:'xiao-gang',since:w.day,loyalty:70};expect(()=>serializeWorld(w)).toThrow('存档');
 });
 it('挟制计划成功切换实际权限与科层，但保留君主、政权、城市归属',()=>{
  const w=start('gao-yang');ready(w);governmentOf(w)!.merit['gao-yang']=60;relation(w,'pressure','yuan-shanjian');pass(w,30);relation(w,'pressure','yuan-shanjian');expect(relationHooks(w,'gao-yang','yuan-shanjian')).toBe(2);
  expect(governmentExecutive(w)).toBe(false);const before=Object.values(w.realm!.cities).map(c=>c.owner);relation(w,'control','yuan-shanjian');expect(relationHooks(w,'gao-yang','yuan-shanjian')).toBe(0);pass(w,12);const clone=parseWorld(serializeWorld(w));pass(w,18);pass(clone,18);expect(w).toEqual(clone);
  expect(governmentExecutive(w)).toBe(true);expect(governingAuthority(w,'east')).toBe('gao-yang');expect(governmentOf(w)!.ruler).toBe('yuan-shanjian');expect(governmentOf(w)!.executives).toEqual(['gao-huan','gao-cheng']);expect(w.realm!.mandate).toBe(true);expect(realmReason(w,{type:'realm',action:'appoint',site:'ye',candidate:'gao-cheng'})).toBe('');expect(governmentReason(w,{type:'government',action:'adopt',government:'feudal'})).toBe('');
  expect(officeHierarchy(w).find(n=>n.id==='office:east:executive:0')!.holder).toBe('gao-yang');expect(politicalTitle(w,'gao-yang')).toContain('实际执政');expect(courtOf(w)!.tenure).toBe('yuan-shanjian|gao-yang');expect(Object.values(w.realm!.cities).map(c=>c.owner)).toEqual(before);save(w);
  relation(w,'tighten','yuan-shanjian');expect(w.relationships!.regencies.east!.grip).toBeGreaterThan(65);relation(w,'liberate','yuan-shanjian');expect(governmentExecutive(w)).toBe(false);expect(governingExecutives(w,'east')).toEqual(['yuan-shanjian']);save(w);
 });
 it('名义君主可逐步亲政，原权臣失去执政权；变化持久化',()=>{
  const w=start('yuan-shanjian');ready(w);expect(governmentExecutive(w)).toBe(false);for(let i=0;i<3;i++){relation(w,'emancipate','gao-huan');if(i<2)pass(w,30);}expect(governmentExecutive(w)).toBe(true);expect(w.relationships!.regencies.east!.origin).toBe('restored');expect(w.realm!.mandate).toBe(true);expect(realmReason(w,{type:'realm',action:'appoint',site:'ye',candidate:'gao-yang'})).toBe('');save(w);
 });
 it('控制失败真实扣除成本，产生仇怨；低控制度自然终结',()=>{
  const w=start('gao-yang');ready(w);governmentOf(w)!.merit['gao-yang']=60;w.social!.hooks[pair('gao-yang','yuan-shanjian')]=2;relation(w,'control','yuan-shanjian');w.relationships!.scheme!.chance=5;pass(w,30);expect(governmentExecutive(w)).toBe(false);expect(friendship(w,'gao-yang','yuan-shanjian')).toBe('rival');w.relationships!.regencies.east!.grip=1;pass(w,30);expect(governingExecutives(w,'east')).toEqual(['yuan-shanjian']);save(w);
 });
 it('家业交接保留旧人物婚姻与关系，不转移计谋；历史更替清理过期控制',()=>{
  const w=start('xiao-yan');ready(w);w.people[0].location=personResidence(w,'guest-liang').site;relation(w,'befriend','guest-liang');act(w,{type:'heir',target:'xiao-gang'});act(w,{type:'handover'});expect(w.relationships!.scheme).toBeNull();expect(spouseOf(w,w.characterId!)).toBe('wang-lingbin');save(w);
  const east=start('gao-huan');ready(east);east.day=Math.round((Date.UTC(549,0,1)-Date.UTC(546,0,1))/86400000);governmentOf(east)!.support=90;act(east,{type:'government',action:'succession',stage:'east-regency'});pass(east,90);expect(east.relationships!.regencies.east!.controller).toBe('gao-yang');expect(governmentExecutive(east)).toBe(false);save(east);
 });
 it('所有拒绝均不扣资源；无在途计谋时取消无效；资料分支不能绕过待决事件',()=>{
  const w=start('yuan-qin');ready(w);for(const cmd of [{type:'relationship',action:'marry',target:'guest-west'},{type:'relationship',action:'control',target:'yuan-baoju'},{type:'relationship',action:'gift',target:'__proto__'},{type:'relationship',action:'cancel'}]){const before=structuredClone(w);expect(()=>act(w,cmd as never)).toThrow();expect(w).toEqual(before);}
  w.realm!.event={kind:'flood',site:'changan',day:0} as never;expect(()=>act(w,{type:'relationship',action:'marital-branch'})).toThrow('待决');expect(w.relationships!.maritalBasis['yuan-qin']).toBe('unknown');
 });
 it('拒绝伪造婚姻、重复配偶、非法人物、循环关系、失配控制和计谋',()=>{
  const edits:((w:World)=>void)[]=[w=>{w.relationships!.marriages.push({...w.relationships!.marriages[0],id:'forged'});},w=>{w.relationships!.reserves.ghost=100;},w=>{w.relationships!.maritalBasis['guest-liang']='bad' as never;},w=>{w.relationships!.regencies.east!.ruler='xiao-yan';},w=>{w.relationships!.regencies.east!.grip=-1;},w=>{w.relationships!.bonds['xiao-yan|xiao-yan']={a:'xiao-yan',b:'xiao-yan',kind:'friend',since:0};},w=>{w.relationships!.scheme={kind:'control',actor:'xiao-yan',target:'gao-huan',started:0,due:30,chance:80,basis:'bad'};}];for(const edit of edits){const w=start();edit(w);expect(()=>serializeWorld(w)).toThrow('存档');}
 });
 it('月度结算幂等，关系记忆和储备跨存档稳定',()=>{const w=start('xiao-gang');ready(w);setFriendship(w,'xiao-gang','xiao-yi','confidant');w.social!.stress=80;w.day=30;advanceRelationships(w);const after=structuredClone(w);advanceRelationships(w);expect(w).toEqual(after);expect(w.social!.stress).toBeLessThan(80);syncRelationships(w);expect(w.social!.opinions[pair('xiao-gang','xiao-yi')]).toBe(25);expect(relationOpinion(w,'xiao-gang','xiao-yi')).toBe(66);save(w);});
});
