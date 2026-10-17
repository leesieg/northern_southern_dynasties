import {expect,it} from 'vitest';
import {historicalPortraitRegistration,historicalPaintedRecipe,type HistoricalPortraitId} from './historicalPortrait';
import {approvedPaintedRecipe} from './paintedSelection';
import {portraitContext} from './composition';
import {validatePaintedRecipe} from './paintedLayers';
import {newCampaignWorld} from '../core/world';
import {parseWorld,serializeWorld} from '../core/save';

const ids=Object.keys(historicalPortraitRegistration) as HistoricalPortraitId[];
const offices=['civilian','governor','commander','ruler'] as const;
it('only registered adult male identities use the new art; other relatives, women and children keep their own rigs',()=>{
 const context=portraitContext('gao-huan');
 expect(historicalPaintedRecipe('__proto__',context)).toBeUndefined();expect(historicalPaintedRecipe('dugu-xin',context)).toBeUndefined();
 expect(historicalPaintedRecipe('gao-huan',{...context,identity:{...context.identity,sex:'female'}})).toBeUndefined();
 expect(historicalPaintedRecipe('gao-huan',{...context,life:{age:12,baselineAge:12,sickness:0,deceased:false}})).toBeUndefined();
 expect(approvedPaintedRecipe('yuwen-hu',portraitContext('yuwen-hu')).rig).not.toContain('c-historical-');
 for(const id of ids){
  expect(historicalPaintedRecipe(id,{...portraitContext(id),identity:{...context.identity,sex:'female'}})).toBeUndefined();
  expect(historicalPaintedRecipe(id,{...portraitContext(id),life:{age:12,baselineAge:12,sickness:0,deceased:false}})).toBeUndefined();
 }
});
it('new portraits follow actual offices and beard registration, including Gao Yang accession and Yuan Shanjian retirement',()=>{
 const world=newCampaignWorld('xiao-gang',undefined,'sandbox'),before=serializeWorld(world);
 for(const [id,office,beard] of [['gao-cheng','governor',false],['xiao-gang','civilian',true],['gao-yang','governor',false],['yuan-shanjian','ruler',false]] as const){
  const context=portraitContext(id,world),recipe=approvedPaintedRecipe(id,context);
  expect(context.office).toBe(office);expect(recipe.parts[0].source).toContain('/historical-four-v1/'+id+'-canonical-faces.png');
  expect(recipe.facialHair).toBe(beard);
 }
 expect(serializeWorld(world)).toBe(before);
 world.realm!.governments!.realms.east.ruler='gao-yang';
 expect(portraitContext('gao-yang',world).office).toBe('ruler');
 expect(approvedPaintedRecipe('gao-yang',portraitContext('gao-yang',world)).parts[0].source).toContain('/gao-yang-faces.png');
 expect(portraitContext('yuan-shanjian',world).office).not.toBe('ruler');
 expect(approvedPaintedRecipe('yuan-shanjian',portraitContext('yuan-shanjian',world)).parts[0].source).toContain('/yuan-shanjian-faces.png');
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
