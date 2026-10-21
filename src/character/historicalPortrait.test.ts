import {expect,it} from 'vitest';
import {historicalPortraitRegistration,historicalPaintedRecipe,type HistoricalPortraitId} from './historicalPortrait';
import {approvedPaintedRecipe} from './paintedSelection';
import {portraitContext} from './composition';
import {validatePaintedRecipe} from './paintedLayers';
import {newCampaignWorld} from '../core/world';
import {parseWorld,serializeWorld} from '../core/save';

const ids=Object.keys(historicalPortraitRegistration) as HistoricalPortraitId[];
const offices=['civilian','governor','commander','ruler'] as const;
it('only registered identities of matching sex and supported age use the new art',()=>{
 const context=portraitContext('gao-huan');
 expect(historicalPaintedRecipe('__proto__',context)).toBeUndefined();expect(historicalPaintedRecipe('su-wei',context)).toBeUndefined();
 expect(historicalPaintedRecipe('gao-huan',{...context,identity:{...context.identity,sex:'female'}})).toBeUndefined();
 expect(historicalPaintedRecipe('gao-huan',{...context,life:{age:12,baselineAge:12,sickness:0,deceased:false}})).toBeUndefined();
 expect(approvedPaintedRecipe('guest-east',portraitContext('guest-east')).rig).not.toContain('c-historical-');
 for(const id of ids){
  const registered=historicalPortraitRegistration[id],sex='sex' in registered?registered.sex:'male';
  expect(historicalPaintedRecipe(id,{...portraitContext(id),identity:{...context.identity,sex:sex==='female'?'male':'female'}})).toBeUndefined();
  const young=historicalPaintedRecipe(id,{...portraitContext(id),life:{age:12,baselineAge:12,sickness:0,deceased:false}});
  if('ageStages' in registered)expect(young?.parts[0].source).toContain(id+'-');else expect(young).toBeUndefined();
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
 for(const id of ids)for(const age of id==='yuwen-jue'?[4,12,16]:id==='yuwen-yu'?[12,16]:[portraitContext(id).life!.age])for(const office of offices){
  const original=portraitContext(id),context={...original,office,life:{...original.life!,age}},neutral=approvedPaintedRecipe(id,context);
  for(const value of [0,100]){
   const altered=structuredClone(context),before=structuredClone(altered);
   for(const pair of Object.values(altered.identity.genome.facial!))pair.fill(value);
   const input=structuredClone(altered),recipe=approvedPaintedRecipe(id,altered);
   expect(validatePaintedRecipe(recipe)).toHaveLength(8);expect(altered).toEqual(input);
   expect(recipe.parts[1].source).toContain('-base.png');expect(recipe.parts[1].place).toEqual(neutral.parts[1].place);
   expect(recipe.parts[0]).toEqual(neutral.parts[0]);expect(recipe.thumbnail).toEqual(neutral.thumbnail);
   const visible=recipe.coveredEye==='left'?'eye-right':'eye-left';
   expect(recipe.parts.find(p=>p.slot===visible)!.place).not.toEqual(neutral.parts.find(p=>p.slot===visible)!.place);
   if(recipe.coveredEye)for(const slot of ['eye-'+recipe.coveredEye,'brow-'+recipe.coveredEye])expect(recipe.parts.find(p=>p.slot===slot)).toEqual(neutral.parts.find(p=>p.slot===slot));
   expect(before.identity.genome).toEqual(context.identity.genome);
  }
 }
});
it('third batch keeps the woman female and the eye patch fixed without inventing offices, illness or mutations',()=>{
 const world=newCampaignWorld('xiao-yi',undefined,'sandbox'),before=serializeWorld(world);
 for(const [id,sex,office] of [['murong-shaozong','male','civilian'],['wei-xiaokuan','male','civilian'],['yuwen-hu','male','civilian'],['lou-zhaojun','female','civilian'],['xiao-yi','male','governor']] as const){
  const context=portraitContext(id,world),recipe=approvedPaintedRecipe(id,context);
  expect(context.identity.sex).toBe(sex);expect(context.office).toBe(office);
  expect(recipe.parts[0].source).toContain('/historical-third-v1/'+id);
  expect(recipe.facialHair).toBe(sex==='male');expect(recipe.coveredEye).toBe(id==='xiao-yi'?'left':undefined);
  const native=approvedPaintedRecipe(id,{...context,office:historicalPortraitRegistration[id].native});
  expect(native.parts[0].source).toContain('-canonical-faces.png');
 }
 expect(serializeWorld(world)).toBe(before);
});
it('all shared portrait entry points can render restored people without changing their world, health, genes or date',()=>{
 const world=newCampaignWorld('gao-huan',undefined,'sandbox');
 world.identities!.people['gao-huan'].genome.facial!.eyeWidth=[2,98];
 const before=serializeWorld(world),restored=parseWorld(before);
 for(const id of ids){
  const context=portraitContext(id,world),recipe=approvedPaintedRecipe(id,context);
  expect(recipe.rig).toBe('c-historical-'+id+'-v1');
  expect(approvedPaintedRecipe(id,portraitContext(id,restored))).toEqual(recipe);
  const aged=approvedPaintedRecipe(id,{...context,life:{...context.life!,age:85,sickness:3,deceased:true}});
  if('ageStages' in historicalPortraitRegistration[id]){expect(aged.parts[0].source).toContain('/'+id+'-faces.png');expect(aged.parts[0].source).not.toBe(recipe.parts[0].source);}else expect(aged).toEqual(recipe);
 }
 expect(serializeWorld(world)).toBe(before);expect(restored).toEqual(world);
});
it('Western Wei opening portraits follow actual offices without changing the world',()=>{
 const world=newCampaignWorld('yuan-baoju',undefined,'sandbox'),before=serializeWorld(world);
 for(const [id,office] of [['li-bi','civilian'],['dugu-xin','commander'],['yang-zhong','civilian'],['yuan-baoju','ruler'],['su-chuo','civilian'],['yuwen-yu','civilian'],['yuwen-jue','civilian']] as const){
  const context=portraitContext(id,world),recipe=approvedPaintedRecipe(id,context);
  expect(context.office).toBe(office);expect(recipe.rig).toBe('c-historical-'+id+'-v1');
  expect(recipe.parts[0].source).toContain('/historical-west-seven-v1/');
  expect(recipe.facialHair).toBe(!id.startsWith('yuwen-'));
 }
 expect(serializeWorld(world)).toBe(before);
});
it('the two young relatives grow through authored age stages and only adult outfits follow offices',()=>{
 const world=newCampaignWorld('yuan-baoju',undefined,'sandbox');
 const source=(id:string)=>approvedPaintedRecipe(id,portraitContext(id,world)).parts[0].source;
 expect(source('yuwen-yu')).toContain('yuwen-yu-canonical-faces.png');expect(source('yuwen-jue')).toContain('yuwen-jue-canonical-faces.png');
 for(const [year,suffix] of [[551,'canonical'],[552,'adolescent'],[557,'adolescent'],[558,'adult']] as const){
  world.day=(Date.UTC(year,0,1)-Date.UTC(546,0,1))/86400000;
  expect(source('yuwen-jue')).toContain('yuwen-jue-'+(suffix==='adult'?'faces':suffix+'-faces')+'.png');
  if(year>=552)expect(source('yuwen-yu')).toContain('yuwen-yu-faces.png');
 }
 const juvenile=portraitContext('yuwen-jue');
 expect(approvedPaintedRecipe('yuwen-jue',{...juvenile,office:'ruler'})).toEqual(approvedPaintedRecipe('yuwen-jue',juvenile));
 for(const id of ['yuwen-yu','yuwen-jue']){
  const context=portraitContext(id,world),before=structuredClone(context),crops=new Set();
  for(const office of offices){const r=approvedPaintedRecipe(id,{...context,office});expect(validatePaintedRecipe(r)).toHaveLength(8);crops.add(JSON.stringify(r.parts[0].crop));expect(r.facialHair).toBe(false);}
  expect(crops.size).toBe(4);expect(context).toEqual(before);
 }
 const noInfant=historicalPaintedRecipe('yuwen-yu',{...portraitContext('yuwen-yu'),life:{age:4,baselineAge:12,sickness:0,deceased:false}});expect(noInfant).toBeUndefined();
 world.life!.people['yuwen-jue'].death={day:0,cause:'illness'};
 const deceased=portraitContext('yuwen-jue',world);expect(deceased.life?.age).toBe(4);expect(source('yuwen-jue')).toContain('yuwen-jue-canonical-faces.png');
});

it('eleven portraits follow actual offices and preserve the approved native originals',()=>{
 const world=newCampaignWorld('xiao-gang',undefined,'sandbox'),before=serializeWorld(world);
 for(const id of ['zhu-yi','cui-jishu','hulu-guang','yu-jin','peng-le','xiao-lun','wang-sengbian','yang-kun','wang-lin','xiao-ji','xiao-cha'] as const){
  const context=portraitContext(id,world),recipe=approvedPaintedRecipe(id,context),registration=historicalPortraitRegistration[id];
  expect(context.office).toBe(id==='xiao-ji'?'governor':'civilian');
  expect(recipe.rig).toBe('c-historical-'+id+'-v1');expect(recipe.parts[0].source).toContain('/historical-eleven-v1/');
  expect(recipe.facialHair).toBe(id!=='yang-kun');expect(recipe.coveredEye).toBeUndefined();
  const native=approvedPaintedRecipe(id,{...context,office:registration.native});expect(native.parts[0].source).toContain(id+'-canonical-faces.png');
  if(context.office===registration.native)expect(recipe).toEqual(native);else expect(recipe.parts[0].source).toContain(id+'-faces.png');
  const young=historicalPaintedRecipe(id,{...context,life:{...context.life!,age:12}});expect(young).toBeUndefined();
 }
 expect(serializeWorld(world)).toBe(before);
 const cha=approvedPaintedRecipe('xiao-cha',portraitContext('xiao-cha',world));expect(cha.coveredEye).toBeUndefined();
 expect(approvedPaintedRecipe('xiao-yi',portraitContext('xiao-yi',world)).coveredEye).toBe('left');
});


it('new historical portraits share the common rules while the deceased elder keeps his own identity',()=>{
 const w=newCampaignWorld('xiao-yan',undefined,'sandbox'),before=structuredClone(w);
 for(const id of ['wei-shou','li-hu','yuan-qin','yuan-kuo','xiao-yuanming','xiao-yi-elder','chen-qian']){
  const context=portraitContext(id,w),recipe=approvedPaintedRecipe(id,context);
  expect(recipe.rig).toBe('c-historical-'+id+'-v1');expect(recipe.parts[0].source).toContain('/historical-seven-v1/');
 }
 const elder=portraitContext('xiao-yi-elder',w);expect(elder.life!.age).toBe(50);expect(elder.life!.deceased).toBe(true);expect(elder.identity.cultureId).toBe('han');
 expect(historicalPortraitRegistration['yuan-qin'].facialHair).toBe(false);expect(historicalPortraitRegistration['yuan-kuo'].facialHair).toBe(false);expect(w).toEqual(before);
});

it('Chen Qian uses the separate supplied official and emperor paintings without changing age or genes',()=>{
 const w=newCampaignWorld('xiao-yan',undefined,'sandbox'),context=portraitContext('chen-qian',w),identity=structuredClone(context.identity);
 const official=approvedPaintedRecipe('chen-qian',{...context,office:'governor'}),sovereign=approvedPaintedRecipe('chen-qian',{...context,office:'ruler'});
 expect(official.parts[0].source).toContain('chen-qian-canonical-faces.png');expect(sovereign.parts[0].source).toContain('chen-qian-sovereign-faces.png');expect(sovereign.parts[0].crop).toEqual({x:0,y:0,width:1024,height:1536});
 w.realm!.governments!.realms.liang.ruler='chen-qian';const crowned=portraitContext('chen-qian',w);expect(crowned.office).toBe('ruler');expect(crowned.life!.age).toBe(context.life!.age);expect(crowned.identity).toEqual(identity);expect(approvedPaintedRecipe('chen-qian',crowned).parts[0].source).toContain('chen-qian-sovereign-faces.png');
});
