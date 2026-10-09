import type {PortraitContext} from './composition';
import type {PaintedRecipe,PaintedRect} from './paintedLayers';
import {validatePaintedRecipe} from './paintedLayers';
import {paintedRig,type PaintedRigId} from '../data/paintedRoster';
import courtAssetSizes from '../data/courtAssetSizes.json';
import {courtFaceRegistration} from '../data/courtFaceRegistration';

/** Complete paintings, two equal panels: sovereign, official.
 * Only body/head sample the new blank-face painting. Original facial layers,
 * genetic adjustments are retained, then registered to each panel's actual face. */
export function courtCostume(recipe:PaintedRecipe,context:PortraitContext):PaintedRecipe {
 if(context.office!=='ruler'&&context.office!=='governor')return recipe;
 if((context.life?.age??18)<16&&context.office!=='ruler')return recipe;
 const rig=recipe.rig==='c-young-adult-v1'?recipe.rig:recipe.rig.replace(/^c-roster-/,'').replace(/-v1$/,'');
 const original=recipe.parts.find(p=>p.slot==='body')!;
 const panel=context.office==='ruler'?0:1;
 const [atlasWidth,height]=courtAssetSizes[rig as keyof typeof courtAssetSizes],width=atlasWidth/2;
 const palette=recipe.palette+':court-v2:face-v1';
 const [scale,dx,dy]=courtFaceRegistration[rig as keyof typeof courtFaceRegistration][panel];
 const register=(r:PaintedRect):PaintedRect=>({x:r.x*scale+dx,y:r.y*scale+dy,width:r.width*scale,height:r.height*scale});
 const source=import.meta.env.BASE_URL+`art/portraits/painted-c/court/${rig}-court-v2.png`;
 const baseX=rig==='c-young-adult-v1'?0:paintedRig(rig as PaintedRigId).baseX;
 const parts=recipe.parts.map(part=>{
  const common={...part,palette,id:part.id+':court-v2:face-v1:'+context.office};
  if(part.slot!=='body'&&part.slot!=='head')return {...common,place:register(part.place)};
  return {...common,source,crop:{
   x:panel*width+(part.crop.x-baseX)/original.crop.width*width,
   y:part.crop.y/original.crop.height*height,
   width:part.crop.width/original.crop.width*width,
   height:part.crop.height/original.crop.height*height,
  }};
 });
 // The study rig formerly used the cache's fixed default thumbnail rectangle.
 const thumbnail=register(recipe.thumbnail??{x:310/1024,y:180/1536,width:360/1024,height:360/1536});
 const result={...recipe,palette,parts,thumbnail};validatePaintedRecipe(result);return result;
}
