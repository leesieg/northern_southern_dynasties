import {it,expect} from 'vitest';
import {founderGenome,inheritGenome,facialGenes,type Genome} from '../core/genetics';
import {composePaintedStudy,paintedFeatureVariants,type PaintedFeature,type PaintedVariant} from './paintedStudy';
import {validatePaintedRecipe} from './paintedLayers';

const parent=(a:number,b:number):Genome=>{
 const g=founderGenome(`${a}:${b}`);for(const key of facialGenes)g.facial![key]=[a,b];return g;
};
it('全部五官、袍服及极端遗传参数组合均符合相同规格',()=>{
 const variants:PaintedVariant[]=['a','b'];
 for(const value of [0,100])for(const robe of variants)for(const brows of variants)for(const eyes of variants)for(const nose of variants)for(const mouth of variants){
  const recipe=composePaintedStudy(parent(value,value),{robe,features:{brows,eyes,nose,mouth}});
  expect(validatePaintedRecipe(recipe)).toHaveLength(8);
  for(const p of recipe.parts){
   expect(p.crop.x+p.crop.width).toBeLessThanOrEqual(1024);
   expect(p.crop.y+p.crop.height).toBeLessThanOrEqual(1536);
  }
 }
});
it('换装不改头部和五官；独立换五官不改变其他部件或基因',()=>{
 const g=parent(20,30),before=JSON.stringify(g),base=composePaintedStudy(g),outfit=composePaintedStudy(g,{robe:'b'});
 expect(outfit.parts.slice(1)).toEqual(base.parts.slice(1));expect(outfit.parts[0].source).not.toBe(base.parts[0].source);
 for(const feature of ['brows','eyes','nose','mouth'] as PaintedFeature[]){
  const changed=composePaintedStudy(g,{robe:'a',features:{[feature]:'b'}});
  const expected=feature==='brows'?['brow-left','brow-right']:feature==='eyes'?['eye-left','eye-right']:[feature];
  expect(changed.parts.filter((p,i)=>p.source!==base.parts[i].source).map(p=>p.slot)).toEqual(expected);
  for(let i=0;i<base.parts.length;i++)if(!expected.includes(base.parts[i].slot))expect(changed.parts[i]).toEqual(base.parts[i]);
 }
 expect(JSON.stringify(g)).toBe(before);
});
it('子代部件由双亲各一份五官参数决定；保存再读不重抽，衣服不参加遗传',()=>{
 const a=parent(20,35),b=parent(65,80),before=JSON.stringify([a,b]);let seed=546;
 const appearances=new Set<string>();
 for(let i=0;i<24;i++){
  const {genome,nextSeed}=inheritGenome(a,b,seed);seed=nextSeed;
  for(const key of facialGenes){expect(a.facial![key]).toContain(genome.facial![key][0]);expect(b.facial![key]).toContain(genome.facial![key][1]);}
  const restored=JSON.parse(JSON.stringify(genome));expect(composePaintedStudy(restored)).toEqual(composePaintedStudy(genome));
  const features=paintedFeatureVariants(genome);appearances.add(JSON.stringify(features));
  for(const [feature,gene] of [['brows','brow'],['eyes','eyeWidth'],['nose','noseWidth'],['mouth','mouth']] as const){
   const mean=(genome.facial![gene][0]+genome.facial![gene][1])/200;
   expect(features[feature]).toBe(mean<.5?'a':'b');
  }
 }
 expect(appearances.size).toBeGreaterThan(1);expect(JSON.stringify([a,b])).toBe(before);
});
it('旧基因仍可稳定组合，损坏输入及未知素材选择显式失败',()=>{
 const old=parent(20,35);delete old.facial;expect(composePaintedStudy(old)).toEqual(composePaintedStudy(structuredClone(old)));
 const bad=parent(20,35);bad.facial!.noseWidth[0]=101;expect(()=>composePaintedStudy(bad)).toThrow();
 expect(()=>composePaintedStudy(old,{robe:'missing' as PaintedVariant})).toThrow('未知');
});
