import type {PortraitContext} from './composition';
import type {PaintedRecipe} from './paintedLayers';
import {validatePaintedRecipe} from './paintedLayers';
import {paintedRig,type PaintedRigId} from '../data/paintedRoster';
import courtAssetSizes from '../data/courtAssetSizes.json';

/** Complete paintings, two equal panels: sovereign, official.
 * Only body/head sample the new blank-face painting. Original facial layers,
 * genetic adjustments and their registration remain authoritative. */
export function courtCostume(recipe:PaintedRecipe,context:PortraitContext):PaintedRecipe {
 if(context.office!=='ruler'&&context.office!=='governor')return recipe;
 if((context.life?.age??18)<16&&context.office!=='ruler')return recipe;
 const rig=recipe.rig==='c-young-adult-v1'?recipe.rig:recipe.rig.replace(/^c-roster-/,'').replace(/-v1$/,'');
 const original=recipe.parts.find(p=>p.slot==='body')!;
 const panel=context.office==='ruler'?0:1;
 const [atlasWidth,height]=courtAssetSizes[rig as keyof typeof courtAssetSizes],width=atlasWidth/2;
 const palette=recipe.palette+':court-v2';
 const source=import.meta.env.BASE_URL+`art/portraits/painted-c/court/${rig}-court-v2.png`;
 const baseX=rig==='c-young-adult-v1'?0:paintedRig(rig as PaintedRigId).baseX;
 const parts=recipe.parts.map(part=>{
  const common={...part,palette,id:part.id+':court-v2:'+context.office};
  if(part.slot!=='body'&&part.slot!=='head')return common;
  return {...common,source,crop:{
   x:panel*width+(part.crop.x-baseX)/original.crop.width*width,
   y:part.crop.y/original.crop.height*height,
   width:part.crop.width/original.crop.width*width,
   height:part.crop.height/original.crop.height*height,
  }};
 });
 const result={...recipe,palette,parts};validatePaintedRecipe(result);return result;
}
