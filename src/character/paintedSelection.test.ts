import {it,expect} from 'vitest';
import {approvedPaintedRecipe} from './paintedSelection';
import {portraitContext} from './composition';
import {newCampaignWorld} from '../core/world';
import {serializeWorld,parseWorld} from '../core/save';
import {historicalCharacters} from '../data/characters';
import {relationshipPeople} from '../data/relationships';
import {validatePaintedRecipe} from './paintedLayers';

it('全部开局、关系与架空人物接入绘制肖像，独立身份保留独立组合',()=>{
 const ids=[...new Set([...historicalCharacters.map(p=>p.id),...relationshipPeople.map(p=>p.id),'fictional'])];
 expect(ids).toHaveLength(23);const recipes=new Set<string>();
 for(const id of ids){const r=approvedPaintedRecipe(id,portraitContext(id));expect(validatePaintedRecipe(r)).toHaveLength(8);recipes.add(JSON.stringify(r));}
 expect(recipes.size).toBe(ids.length);
});
it('女性、幼年和老年素材不错误套用青年男性底稿；陌生行旅也有绘制肖像',()=>{
 expect(approvedPaintedRecipe('xiao-yan',portraitContext('xiao-yan')).rig).toContain('xiao-yan');
 for(const id of ['xiao-fangzhi','yuwen-jue'])expect(approvedPaintedRecipe(id,portraitContext(id)).rig).toContain('child');
 for(const p of relationshipPeople.filter(p=>p.sex==='female'))expect(approvedPaintedRecipe(p.id,portraitContext(p.id)).rig).not.toContain('young-adult');
 const context=portraitContext('gao-huan');context.identity.sex='female';expect(approvedPaintedRecipe('gao-huan',context).rig).toContain('female');
 expect(validatePaintedRecipe(approvedPaintedRecipe('traveller-99',portraitContext('traveller-99')))).toHaveLength(8);
});
it('军旅和不同职位不会回退旧 SVG；遗传极值的五官和头像裁切不越界',()=>{
 for(const p of relationshipPeople)for(const value of [0,100]){
  const context=portraitContext(p.id);for(const pair of Object.values(context.identity.genome.facial!))pair.fill(value);
  for(const office of ['civilian','governor','commander','ruler'] as const){const recipe=approvedPaintedRecipe(p.id,{...context,office});expect(validatePaintedRecipe(recipe)).toHaveLength(8);}
 }
});
it('正式入口读取存档五官，重载不重抽；换职务服饰不改五官与存档',()=>{
 const world=newCampaignWorld('yuan-shanjian');world.identities!.people['yuan-shanjian'].genome.facial!.noseWidth=[95,100];
 const before=serializeWorld(world),context=portraitContext('yuan-shanjian',world),recipe=approvedPaintedRecipe('yuan-shanjian',context)!;
 expect(recipe.parts.find(p=>p.slot==='nose')!.source).toContain('features-b');
 expect(approvedPaintedRecipe('yuan-shanjian',portraitContext('yuan-shanjian',parseWorld(before)))).toEqual(recipe);
 const retired=approvedPaintedRecipe('yuan-shanjian',{...context,office:'civilian'})!;
 expect(retired.parts[0].source).not.toBe(recipe.parts[0].source);expect(retired.parts.slice(1)).toEqual(recipe.parts.slice(1));
 expect(serializeWorld(world)).toBe(before);
});
