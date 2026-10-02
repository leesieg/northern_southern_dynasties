import { it,expect } from 'vitest';
import { validatePaintedRecipe,adjustPaintedFeature,paintedOrder,type PaintedRecipe } from './paintedLayers';
const recipe=():PaintedRecipe=>({version:1,rig:'adult-c',view:'three-quarter',palette:'warm-1',parts:paintedOrder.map(slot=>({id:slot,slot,source:'/test-art.png',rig:'adult-c',view:'three-quarter',palette:'warm-1',crop:{x:0,y:0,width:100,height:100},place:{x:.3,y:.3,width:.2,height:.2}}))});
it('拒绝跨视角、跨规格和跨肤色套用五官',()=>{
 for(const field of ['rig','view','palette'] as const){const r=recipe();r.parts[2][field]='incompatible';expect(()=>validatePaintedRecipe(r)).toThrow('不兼容');}
});
it('拒绝重复、缺失、越界和非有限部件，合法部件按绘制顺序排列',()=>{
 const r=recipe();r.parts.reverse();expect(validatePaintedRecipe(r).map(p=>p.slot)).toEqual(paintedOrder);
 const duplicate=recipe();duplicate.parts.push(duplicate.parts[0]);expect(()=>validatePaintedRecipe(duplicate)).toThrow('重复');
 const optional=recipe();optional.parts=optional.parts.filter(p=>p.slot!=='headwear');expect(()=>validatePaintedRecipe(optional)).not.toThrow();
 const missing=recipe();missing.parts=missing.parts.filter(p=>p.slot!=='mouth');expect(()=>validatePaintedRecipe(missing)).toThrow('不完整');
 for(const value of [NaN,Infinity,-1]){const r=recipe();r.parts[0].crop.width=value;expect(()=>validatePaintedRecipe(r)).toThrow('坐标');}
 const outside=recipe();outside.parts[3].place.x=.95;expect(()=>validatePaintedRecipe(outside)).toThrow('超出');
});
it('五官调节保持中心并限制形变幅度，不改动原素材配置',()=>{
 const part=recipe().parts[3],before=structuredClone(part),result=adjustPaintedFeature(part,1,0);
 expect(result.place.width).toBeCloseTo(.212);expect(result.place.height).toBeCloseTo(.188);
 expect(result.place.x+result.place.width/2).toBeCloseTo(.4);expect(part).toEqual(before);
 expect(adjustPaintedFeature(part,100,-100)).toEqual(result);
 expect(()=>adjustPaintedFeature(part,NaN,.5)).toThrow();
});
it('损坏遮罩和缺失坐标不能进入绘制流程',()=>{
 const r=recipe();r.parts[0].mask={kind:'bottom-fade',start:1};expect(()=>validatePaintedRecipe(r)).toThrow('融合');
 r.parts[0].mask={kind:'polygon',points:[[0,0],[1,0],[1,1]],softness:NaN};expect(()=>validatePaintedRecipe(r)).toThrow('融合');
 r.parts[0].mask={kind:'polygon',points:[[0,0],[1,0],[2,1]],softness:.02};expect(()=>validatePaintedRecipe(r)).toThrow('融合');
 delete r.parts[0].mask;delete (r.parts[0].crop as Partial<typeof r.parts[0]['crop']>).width;expect(()=>validatePaintedRecipe(r)).toThrow('坐标');
});
