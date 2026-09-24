import { describe,it,expect } from 'vitest';
import { founderGenome,inheritGenome,expressGenome,validGenome,geneLimits,facialGenes,type Gene } from './genetics';
import { initialIdentities } from '../data/characterIdentities';
import { newCampaignWorld } from './world';
import { parseWorld,serializeWorld } from './save';
import { portraitContext,composePortrait } from '../character/composition';

describe('可组合人物与遗传规则',()=>{
 it('每个位点分别从双亲取得一份，输入保持不变，随机状态可继续',()=>{
  const a=founderGenome('a'),b=founderGenome('b');
  for(const key of Object.keys(geneLimits) as Gene[]){a.alleles[key]=[0,0];b.alleles[key]=[geneLimits[key],geneLimits[key]];}
  const before=JSON.stringify([a,b]),child=inheritGenome(a,b,546);
  for(const key of Object.keys(geneLimits) as Gene[])expect(child.genome.alleles[key]).toEqual([0,geneLimits[key]]);
  expect(JSON.stringify([a,b])).toBe(before);expect(child.nextSeed).not.toBe(546);
  expect(inheritGenome(a,b,546)).toEqual(child);expect(validGenome(child.genome)).toBe(true);
 });
 it('双亲两份等位参数均有机会传递，兄弟姊妹不会因复用种子变成固定克隆',()=>{
  const a=founderGenome('a'),b=founderGenome('b');a.alleles.width=[0,25];b.alleles.width=[75,100];
  let seed=7;const children=new Set<string>(),fromA=new Set<number>(),fromB=new Set<number>();
  for(let i=0;i<80;i++){const child=inheritGenome(a,b,seed);seed=child.nextSeed;children.add(JSON.stringify(child.genome));fromA.add(child.genome.alleles.width[0]);fromB.add(child.genome.alleles.width[1]);}
  expect([...fromA].sort()).toEqual([0,25]);expect([...fromB].sort()).toEqual([100,75]);expect(children.size).toBeGreaterThan(10);
 });
 it('先天特质支持携带而不表达，双亲携带者可生出表达子代',()=>{
  const a=founderGenome('a'),b=founderGenome('b');a.alleles.vitality=[0,1];b.alleles.vitality=[0,1];
  expect(expressGenome(a).congenital).not.toContain('vitality');
  let seed=100,expressed=0;for(let i=0;i<100;i++){const c=inheritGenome(a,b,seed);seed=c.nextSeed;if(expressGenome(c.genome).congenital.includes('vitality'))expressed++;}
  expect(expressed).toBeGreaterThan(10);expect(expressed).toBeLessThan(40);
 });
 it('拒绝越界、缺失、未知版本及损坏随机状态',()=>{
  const a=founderGenome('a');expect(()=>inheritGenome(a,a,-1)).toThrow();expect(()=>inheritGenome(a,a,NaN)).toThrow();
  a.alleles.face[0]=4;expect(validGenome(a)).toBe(false);expect(()=>inheritGenome(a,a,1)).toThrow();
  expect(validGenome({version:99,alleles:{}})).toBe(false);expect(validGenome(null)).toBe(false);
 });
 it('新局持久保存完整形象，旧档确定性补齐且保留进度',()=>{
  const w=newCampaignWorld('xiao-yi');w.people[0].coins=321;
  expect(Object.keys(w.identities!.people)).toHaveLength(12);expect(parseWorld(serializeWorld(w))).toEqual(w);
  delete w.identities;const old=serializeWorld(w),restored=parseWorld(old);
  expect(restored.identities).toEqual(initialIdentities());expect(restored.people[0].coins).toBe(321);expect(parseWorld(old)).toEqual(restored);
 });
 it('形象存档拒绝非法枚举、丢失人物及损坏基因',()=>{
  for(const mutate of [(w:ReturnType<typeof newCampaignWorld>)=>{w.identities!.people['xiao-yi'].genome.alleles.pigment[1]=101;},
   (w:ReturnType<typeof newCampaignWorld>)=>{delete w.identities!.people['xiao-yi'];},
   (w:ReturnType<typeof newCampaignWorld>)=>{Object.assign(w.identities!.people['xiao-yi'],{culture:'__proto__'});}]){
   const w=newCampaignWorld('xiao-yi');mutate(w);expect(()=>serializeWorld(w)).toThrow('存档');
  }
 });
 it('性别、文化、职位和性格改变对应图层，不重算基因',()=>{
  const c=portraitContext('xiao-yi'),before=JSON.stringify(c.identity.genome),base=composePortrait(c);
  const changed=composePortrait({...c,identity:{...c.identity,sex:'female',culture:'northern'},office:'commander',traits:['diligent']});
  expect(changed.sex).toBe('female');expect(changed.northern).toBe(true);expect(changed.office).toBe('commander');expect(changed.beard).toBe('none');expect(changed.ornament).toBe('scroll');
  expect(changed.phenotype).toEqual(base.phenotype);expect(JSON.stringify(c.identity.genome)).toBe(before);
 });
 it('实际任命、退居和军务动员影响服饰；压力不改基因',()=>{
  const w=newCampaignWorld('xiao-yi',undefined,'sandbox');for(const c of Object.values(w.realm!.cities))c.governor=null;for(const s of Object.values(w.realm!.local!.seats))s.holder=null;
  expect(portraitContext('xiao-yi',w).office).toBe('civilian');w.realm!.cities.jiangling.governor='xiao-yi';
  expect(portraitContext('xiao-yi',w).office).toBe('governor');w.realm!.mandate=true;
  w.realm!.armies.push({realm:'liang',location:'jiangling',troops:100,morale:50,supply:100,journey:null,siege:0});
  expect(portraitContext('xiao-yi',w).office).toBe('commander');w.social!.stress=90;
  expect(composePortrait(portraitContext('xiao-yi',w)).mood).toBe('tense');
  w.social!.lineage=[{id:'xiao-yi',day:0},{id:'xiao-gang',day:1}];expect(portraitContext('xiao-yi',w).office).toBe('civilian');
 });
});

it('每个五官位点从双亲分别取得一份，独立表达并拒绝损坏数据',()=>{
 const a=founderGenome('a'),b=founderGenome('b');
 for(const key of facialGenes){a.facial![key]=[0,0];b.facial![key]=[100,100];}
 const child=inheritGenome(a,b,123).genome;
 for(const key of facialGenes){expect(child.facial![key]).toEqual([0,100]);expect(expressGenome(child).features[key]).toBe(.5);}
 const original=expressGenome(child);child.facial!.eyeWidth=[100,100];
 expect(expressGenome(child).features.eyeWidth).toBe(1);expect(expressGenome(child).features.noseWidth).toBe(original.features.noseWidth);
 child.facial!.jaw=[-1,50];expect(validGenome(child)).toBe(false);
 const broken=founderGenome('a');delete (broken.facial as Partial<typeof broken.facial>)!.ears;expect(validGenome(broken)).toBe(false);
});
it('旧五位点存档补齐五官但不改资金、旧基因和进度，之后读取不重置五官',()=>{
 const w=newCampaignWorld('gao-huan');w.people[0].coins=321;
 const oldAlleles=structuredClone(w.identities!.people['gao-huan'].genome.alleles);
 for(const p of Object.values(w.identities!.people))delete p.genome.facial;
 const restored=parseWorld(serializeWorld(w));expect(restored.people[0].coins).toBe(321);
 expect(restored.identities!.people['gao-huan'].genome.alleles).toEqual(oldAlleles);
 expect(restored.identities!.people['gao-huan'].genome.facial).toBeDefined();
 restored.identities!.people['gao-huan'].genome.facial!.noseWidth=[3,6];
 expect(parseWorld(serializeWorld(restored))).toEqual(restored);
});
