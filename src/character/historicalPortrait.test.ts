import {expect,it} from 'vitest';
import {historicalPortraitRegistration,historicalPaintedRecipe,type HistoricalPortraitId} from './historicalPortrait';
import {approvedPaintedRecipe} from './paintedSelection';
import {portraitContext} from './composition';
import {validatePaintedRecipe} from './paintedLayers';
import {newCampaignWorld} from '../core/world';
import {parseWorld,serializeWorld} from '../core/save';

const ids=Object.keys(historicalPortraitRegistration) as HistoricalPortraitId[];
const offices=['civilian','governor','commander','ruler'] as const;
it('only the five adult male identities use the new art; other relatives, women and children keep their own rigs',()=>{
 const context=portraitContext('gao-huan');
 expect(historicalPaintedRecipe('__proto__',context)).toBeUndefined();expect(historicalPaintedRecipe('dugu-xin',context)).toBeUndefined();
 expect(historicalPaintedRecipe('gao-huan',{...context,identity:{...context.identity,sex:'female'}})).toBeUndefined();
 expect(historicalPaintedRecipe('gao-huan',{...context,life:{age:12,baselineAge:12,sickness:0,deceased:false}})).toBeUndefined();
 expect(approvedPaintedRecipe('yuwen-hu',portraitContext('yuwen-hu')).rig).not.toContain('c-historical-');
});
it('stored genetic changes use the blank face and bounded features without moving the head, clothing or thumbnail',()=>{
 for(const id of ids)for(const office of offices){
  const context={...portraitContext(id),office},neutral=approvedPaintedRecipe(id,context);
  for(const value of [0,100]){
   const altered=structuredClone(context),before=structuredClone(altered);
   for(const pair of Object.values(altered.identity.genome.facial!))pair.fill(value);
   const input=structuredClone(altered),recipe=approvedPaintedRecipe(id,altered);
   expect(validatePaintedRecipe(recipe)).toHaveLength(8);expect(altered).toEqual(input);
   expect(recipe.parts[1].source).toContain('-base.png');expect(recipe.parts[1].place).toEqual(neutral.parts[1].place);
   expect(recipe.parts[0]).toEqual(neutral.parts[0]);expect(recipe.thumbnail).toEqual(neutral.thumbnail);
   expect(recipe.parts.find(p=>p.slot==='eye-left')!.place).not.toEqual(neutral.parts.find(p=>p.slot==='eye-left')!.place);
   expect(before.identity.genome).toEqual(context.identity.genome);
  }
 }
});
it('all shared portrait entry points can render restored people without changing their world, health, genes or date',()=>{
 const world=newCampaignWorld('gao-huan',undefined,'sandbox');
 world.identities!.people['gao-huan'].genome.facial!.eyeWidth=[2,98];
 const before=serializeWorld(world),restored=parseWorld(before);
 for(const id of ids){
  const context=portraitContext(id,world),recipe=approvedPaintedRecipe(id,context);
  expect(recipe.rig).toBe('c-historical-'+id+'-v1');
  expect(approvedPaintedRecipe(id,portraitContext(id,restored))).toEqual(recipe);
  expect(approvedPaintedRecipe(id,{...context,life:{...context.life!,age:85,sickness:3,deceased:true}})).toEqual(recipe);
 }
 expect(serializeWorld(world)).toBe(before);expect(restored).toEqual(world);
});
