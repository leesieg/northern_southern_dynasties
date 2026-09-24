import { describe,it,expect } from 'vitest';
import { newCampaignWorld,act,advance } from './world';
import { prestigeMembers,advanceFamilies,awardPrestige,familyPrestige,familyStanding,familyRanks } from './family';
import { families,familyPeople,familyPersonById,parentLinks,relatives } from '../data/families';
import { historicalCharacters } from '../data/characters';
import { acceptance,attributes,advanceSocial } from './social';
import { serializeWorld,parseWorld } from './save';
import type { World } from './types';
describe('家族与威望',()=>{
 it('稳定身份、史料、亲子关系无环，全部可玩人物均有家族',()=>{
  expect(new Set(families.map(f=>f.id)).size).toBe(families.length);expect(new Set(familyPeople.map(p=>p.id)).size).toBe(familyPeople.length);
  for(const c of historicalCharacters)expect(familyPersonById[c.id].family).toBe(c.family);
  for(const p of familyPeople){expect(families.some(f=>f.id===p.family)).toBe(true);if(p.status!=='fictional')expect(p.sources.length).toBeGreaterThan(0);}
  for(const r of parentLinks){expect(familyPersonById[r.parent]).toBeDefined();expect(familyPersonById[r.child]).toBeDefined();if(familyPersonById[r.child].status!=='fictional')expect(r.source.url).toMatch(/^https:/);else expect(r.source.title).toBe('架空家系');expect(relatives(r.child,'descendants').some(p=>p.id===r.parent)).toBe(false);}
  expect(relatives('xiao-gang','ancestors').map(p=>p.name)).toEqual(['萧衍','萧顺之','萧道赐']);
  expect(relatives('xiao-daoci','descendants').map(p=>p.id)).toContain('xiao-yi');
  expect(relatives('yuan-hong','descendants').map(p=>p.id)).toEqual(expect.arrayContaining(['yuan-shanjian','yuan-baoju','yuan-qin']));
  expect(relatives('cui-xiu','descendants').map(p=>p.name)).toEqual(['崔㥄','崔瞻']);
 });
 it('跨政权族人共同贡献，先人及资料人物不生成贡献，同月不重复',()=>{
  const w=newCampaignWorld('yuan-baoju');advance(w,30);expect(familyPrestige(w,'yuan')).toBe(prestigeMembers.filter(p=>p.family==='yuan').length*2);expect(familyPrestige(w,'xiao')).toBe(prestigeMembers.filter(p=>p.family==='xiao').length*2);expect(familyPrestige(w,'cui-qinghe')).toBe(4);expect(w.families!.prestige['xiao-shunzhi']).toBeUndefined();
  const before=structuredClone(w);advanceFamilies(w);advance(w,0);expect(w).toEqual(before);expect(w.families!.prestige.fictional).toBe(0);
 });
 it('竣工才计分，存取后不重复竣工奖励',()=>{
  const w=newCampaignWorld('xiao-yan');act(w,{type:'build',scope:'estate',site:'jiankang',building:'fields'});expect(familyPrestige(w,'xiao')).toBe(0);
  const due=w.holdings.estate.project!.due;advance(w,due);expect(w.families!.prestige['xiao-yan']).toBe(10);expect(w.families!.ledger[0].reason).toBe('construction');
  const loaded=parseWorld(serializeWorld(w));advance(loaded,1);expect(loaded.families!.prestige['xiao-yan']).toBe(10);
 });
 it('交好成功计入贡献，取消和失败不计分',()=>{
  const w=newCampaignWorld('xiao-gang');act(w,{type:'interact',target:'xiao-yan',action:'befriend'});act(w,{type:'cancel-scheme'});expect(familyPrestige(w,'xiao')).toBe(0);
  w.social!.scheme={target:'xiao-yan',started:0,due:14,chance:95};w.day=14;advanceSocial(w);expect(w.families!.prestige['xiao-gang']).toBe(5);
  const f=newCampaignWorld('xiao-gang');f.social!.scheme={target:'xiao-yan',started:0,due:14,chance:5};f.day=14;advanceSocial(f);expect(f.families!.prestige['xiao-gang']).toBe(0);
 });
 it('家族等级实际作用于同族外交、接受度、每月压力恢复，不影响别族',()=>{
  const w=newCampaignWorld('xiao-gang'),base=attributes(w).diplomacy,other=attributes(w,'gao-yang').diplomacy,score=acceptance(w,'xiao-yan').reduce((n,p)=>n+p.value,0);
  for(const [tier,r] of familyRanks.entries()){w.families!.prestige['xiao-yan']=r.threshold;expect(familyStanding(w).tier).toBe(tier);expect(attributes(w).diplomacy).toBe(base+tier);expect(attributes(w,'gao-yang').diplomacy).toBe(other);expect(acceptance(w,'xiao-yan').reduce((n,p)=>n+p.value,0)).toBe(score+2*tier);}
  w.day=30;w.social!.stress=80;advanceSocial(w);expect(w.social!.stress).toBe(67);
 });
 it('家业消费与交接不扣永久威望，退居成员不继续月度计分',()=>{
  const w=newCampaignWorld('xiao-yan');awardPrestige(w,'xiao-yan','construction');act(w,{type:'legacy',branch:'learning'});expect(familyPrestige(w,'xiao')).toBe(10);
  act(w,{type:'heir',target:'xiao-gang'});act(w,{type:'handover'});advance(w,30);expect(w.families!.prestige['xiao-yan']).toBe(10);expect(w.families!.prestige['xiao-gang']).toBe(2);expect(familyPrestige(w,'xiao')).toBe(10+(prestigeMembers.filter(p=>p.family==='xiao').length-1)*2);expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('旧档从迁移时刻开始，不倒算旧名望；存读后月结一致',()=>{
  const old=newCampaignWorld('gao-huan');advance(old,35);delete old.families;const migrated=parseWorld(serializeWorld(old));expect(migrated.families!.since).toBe(35);expect(familyPrestige(migrated,'gao')).toBe(0);expect(migrated.social!.renown).toBe(old.social!.renown);
  const loaded=parseWorld(serializeWorld(migrated));advance(migrated,25);advance(loaded,25);expect(loaded).toEqual(migrated);expect(familyPrestige(loaded,'gao')).toBe(prestigeMembers.filter(p=>p.family==='gao').length*2);
 });
 it('虚构人物可积累自己的家族威望，不挂接历史谱系',()=>{const w=newCampaignWorld();advance(w,30);expect(familyPrestige(w,'shen')).toBe(2);expect(relatives('fictional','ancestors')).toEqual([]);});
 it('拒绝非法成员、负数、未来日期与不一致账本',()=>{
  const edits:((w:World)=>void)[]=[w=>{w.families!.prestige.ghost=1;},w=>{w.families!.prestige['xiao-yan']=-1;},w=>{w.families!.since=1;},w=>{w.families!.lastMonthly=30;},w=>{w.families!.ledger=[{day:0,member:'xiao-yan',amount:10,reason:'construction'}];},w=>{w.families!.prestige['xiao-yan']=Infinity;}];
  for(const edit of edits){const w=newCampaignWorld('xiao-yan');edit(w);expect(()=>serializeWorld(w)).toThrow('存档');}
 });
});
