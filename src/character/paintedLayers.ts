/** Raster artwork contract. Art must be authored for the same rig, view and palette. */
export type PaintedSlot='body'|'head'|'brow-left'|'brow-right'|'eye-left'|'eye-right'|'nose'|'mouth';
export interface PaintedRect {x:number;y:number;width:number;height:number}
/** Mask coordinates are local to the crop; feathers are fractions of its dimensions. */
export type PaintedMask={kind:'bottom-fade';start:number}|{kind:'polygon';points:[number,number][];softness:number};
export interface PaintedPart {
 id:string;slot:PaintedSlot;source:string;crop:PaintedRect;place:PaintedRect;
 rig:string;view:string;palette:string;
 mask?:PaintedMask;
}
export interface PaintedRecipe {version:1;rig:string;view:string;palette:string;parts:PaintedPart[];thumbnail?:PaintedRect}
export const paintedOrder:PaintedSlot[]=['body','head','brow-left','brow-right','eye-left','eye-right','nose','mouth'];
export function validatePaintedRecipe(recipe:PaintedRecipe){
 if(recipe.version!==1)throw new Error('未知立绘版本');
 if(!recipe.rig||!recipe.view||!recipe.palette)throw new Error('立绘规格缺失');
 const t=recipe.thumbnail;
 if(t&&(![t.x,t.y,t.width,t.height].every(Number.isFinite)||t.x<0||t.y<0||t.width<=0||t.height<=0||t.x+t.width>1||t.y+t.height>1))throw new Error('头像裁切范围无效');
 const seen=new Set<PaintedSlot>();
 for(const part of recipe.parts){
  if(!paintedOrder.includes(part.slot)||seen.has(part.slot))throw new Error('部件层级重复或无效');
  if(part.rig!==recipe.rig||part.view!==recipe.view||part.palette!==recipe.palette)throw new Error('立绘部件不兼容');
  if(!part.source||!part.id)throw new Error('立绘素材缺失');
  for(const box of [part.crop,part.place])if(![box.x,box.y,box.width,box.height].every(Number.isFinite)||box.width<=0||box.height<=0||box.x<0||box.y<0)throw new Error('立绘部件坐标无效');
  if(part.place.x+part.place.width>1+1e-9||part.place.y+part.place.height>1+1e-9)throw new Error('立绘部件超出画布');
  const mask=part.mask;
  if(mask?.kind==='bottom-fade'&&(!Number.isFinite(mask.start)||mask.start<0||mask.start>=1))throw new Error('立绘融合范围无效');
  if(mask?.kind==='polygon'&&(!Number.isFinite(mask.softness)||mask.softness<0||mask.softness>.2||mask.points.length<3||mask.points.some(p=>p.length!==2||p.some(n=>!Number.isFinite(n)||n<0||n>1))))throw new Error('立绘融合范围无效');
  seen.add(part.slot);
 }
 if(paintedOrder.some(slot=>!seen.has(slot)))throw new Error('立绘部件不完整');
 return [...recipe.parts].sort((a,b)=>paintedOrder.indexOf(a.slot)-paintedOrder.indexOf(b.slot));
}

/** Bounded changes preserve the authored anatomy; no unbounded genetic stretching. */
export function adjustPaintedFeature(part:PaintedPart,width:number,height:number):PaintedPart {
 if(part.slot==='body'||part.slot==='head')return part;
 const bounded=(value:number)=>{if(!Number.isFinite(value))throw new Error('五官参数无效');return 1+(Math.max(0,Math.min(1,value))-.5)*.12;};
 const w=part.place.width*bounded(width),h=part.place.height*bounded(height);
 return {...part,place:{x:part.place.x+(part.place.width-w)/2,y:part.place.y+(part.place.height-h)/2,width:w,height:h}};
}
