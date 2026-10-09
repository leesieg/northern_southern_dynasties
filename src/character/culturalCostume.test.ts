import {describe,it,expect} from 'vitest';
import {portraitContext} from './composition';
import {approvedPaintedRecipe} from './paintedSelection';
import {validatePaintedRecipe} from './paintedLayers';
import {composePaintedRoster} from './paintedRoster';
import {culturalCostume} from './culturalCostume';
import {wholeCulturalPortrait,xianbeiWholeRigs} from './wholePortrait';
import {paintedRig,paintedBounds,type PaintedRigId} from '../data/paintedRoster';
import {wholePortraitBounds} from '../data/wholePortraitBounds';

describe('完整成人底图与保留的儿童组合',()=>{
 it.each(['xiao-fangzhi','yuwen-jue'])('%s 儿童配方保持原样，文化及任职不引入成人模板',id=>{
  for(const cultureId of ['han','xianbei'] as const)for(const office of ['civilian','governor','commander'] as const){
   const base=portraitContext(id),c={...base,office,identity:{...base.identity,cultureId}};
   const actual=approvedPaintedRecipe(id,c);
   expect(actual).toEqual(culturalCostume(composePaintedRoster(id,c),c));
   expect(actual.parts[0].source).toContain('child-v2.png');
   expect(actual.parts.some(p=>p.slot==='headwear')).toBe(false);
   const body=actual.parts[0],row=cultureId==='han'?0:1;
   const handY=body.place.y+(1040-body.crop.y)*body.place.height/body.crop.height;
   const handX=body.place.x+(row*724+330-body.crop.x)*body.place.width/body.crop.width;
   expect(handY).toBeLessThan(.99);expect(handY).toBeGreaterThan(.65);
   expect(handX).toBeGreaterThan(0);expect(handX).toBeLessThan(1);
  }
 });
 it.each(['gao-huan','su-chuo','dugu-xin','wang-lingbin','guest-west','lou-zhaojun'])('%s 常服与军旅保留原完整文化肖像',id=>{
  const c=portraitContext(id);
  for(const cultureId of ['han','xianbei'] as const){
   const civilian=approvedPaintedRecipe(id,{...c,office:'civilian',identity:{...c.identity,cultureId}});
   expect(approvedPaintedRecipe(id,{...c,office:'commander',identity:{...c.identity,cultureId}})).toEqual(civilian);
   expect(civilian.parts[0].place).toEqual({x:0,y:0,width:1,height:1});
   expect(civilian.parts.some(p=>p.slot==='headwear'||p.removePaper)).toBe(false);
   expect(civilian.parts.find(p=>p.slot==='head')!.mask).toBeUndefined();
   expect(()=>validatePaintedRecipe(civilian)).not.toThrow();
  }
 });
 it('汉式及其他文化常服保留原画，不以鲜卑图冒充；君主使用新礼服',()=>{
  for(const cultureId of ['han','gaoche','jie','unknown'] as const){
   const c=portraitContext('gao-huan'),context={...c,office:'civilian' as const,identity:{...c.identity,cultureId}},raw=composePaintedRoster('gao-huan',context);
   expect(approvedPaintedRecipe('gao-huan',context)).toEqual(raw);
  }
  const c=portraitContext('gao-huan'),context={...c,office:'ruler' as const};
  expect(approvedPaintedRecipe('gao-huan',context).parts[0].source).toContain('court/gao-huan-court-v2.png');
 });
 it('新增文化图的源坐标映射保持原五官位置，头身均取完整同源画面',()=>{
  for(const id of xianbeiWholeRigs){
   const c=portraitContext('gao-huan'),rig=paintedRig(id as PaintedRigId),raw=composePaintedRoster('gao-huan',c);
   const fixture={...raw,rig:`c-roster-${id}-v1`,parts:raw.parts.map((p,i)=>{
    const crop=i===0?{x:rig.baseX,y:0,width:rig.width,height:rig.height}:i===1?{x:rig.baseX,y:0,width:rig.width,height:rig.height/2}:(()=>{const [x,y,width,height]=paintedBounds[id as PaintedRigId][i-2];return {x,y,width,height};})();
    return {...p,rig:`c-roster-${id}-v1`,crop};
   })};
   const r=wholeCulturalPortrait(fixture,{...c,office:'civilian'});
   expect(new Set(r.parts.map(p=>p.source)).size).toBe(1);
   expect(r.parts[0].source).toContain(`${id}-xianbei-v1.png`);
   expect(r.parts[0].crop).toEqual({x:0,y:0,width:1024,height:1536});
   expect(r.parts.slice(0,2).map(p=>p.place)).toEqual(fixture.parts.slice(0,2).map(p=>p.place));
   const [x,y,width,height]=wholePortraitBounds[id][0];
   expect(r.parts[2].crop).toEqual({x,y,width,height});
   expect(r.parts[2].place.x+r.parts[2].place.width/2).toBeCloseTo((x+width/2)/1024);
  }
 });
 it('遗传仍改变局部五官，不改变头身、构图和存档身份',()=>{
  for(const id of ['gao-huan','wang-lingbin','lou-zhaojun','xiao-fangzhi']){
   const context=portraitContext(id),before=structuredClone(context);
   const recipes=[0,100].map(value=>{const c=structuredClone(context);for(const pair of Object.values(c.identity.genome.facial!))pair.fill(value);return approvedPaintedRecipe(id,c);});
   const frame=(r:typeof recipes[number])=>r.parts.filter(p=>['body','head','headwear'].includes(p.slot));
   expect(frame(recipes[0])).toEqual(frame(recipes[1]));expect(recipes[0].thumbnail).toEqual(recipes[1].thumbnail);
   expect(recipes[0].parts.find(p=>p.slot==='nose')!.place).not.toEqual(recipes[1].parts.find(p=>p.slot==='nose')!.place);
   expect(context).toEqual(before);
  }
 });
});
