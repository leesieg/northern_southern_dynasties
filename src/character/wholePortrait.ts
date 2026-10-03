import type {PortraitContext} from './composition';
import {type PaintedRecipe,validatePaintedRecipe} from './paintedLayers';
import {wholePortraitBounds} from '../data/wholePortraitBounds';

/** Complete, identity-preserving paintings. Armor and royal ceremonial portraits retain their originals. */
export const xianbeiWholeRigs=new Set(Object.keys(wholePortraitBounds));

export function wholeCulturalPortrait(recipe:PaintedRecipe,context:PortraitContext):PaintedRecipe {
 if(context.identity.cultureId!=='xianbei'||context.office==='ruler')return recipe;
 const rig=recipe.rig.replace(/^c-roster-/,'').replace(/-v1$/,'');
 if(!xianbeiWholeRigs.has(rig))return recipe;
 const base=recipe.parts.find(p=>p.slot==='body')!.crop;
 const source=import.meta.env.BASE_URL+`art/portraits/painted-c/cultures/${rig}-xianbei-v1.png`;
 const palette=recipe.palette+':xianbei-whole-v1';
 const featureSlots=['brow-left','brow-right','eye-left','eye-right','nose','mouth'];
 const parts=recipe.parts.map(part=>{
  // Base/head came from the right (blank-face) panel; features from the left panel.
  // Both map to the SAME complete new portrait, with no head/body transform or neckline mask.
  const origin=part.slot==='body'||part.slot==='head'?base.x:0;
  const feature=featureSlots.indexOf(part.slot);
  if(feature>=0){
   const [x,y,width,height]=wholePortraitBounds[rig][feature];
   // Preserve genetic size factors, re-anchor them to the new painting's own facial landmarks.
   const w=width/1024*part.place.width/(part.crop.width/base.width),h=height/1536*part.place.height/(part.crop.height/base.height);
   return {...part,id:part.id+':xianbei-whole-v1',source,palette,crop:{x,y,width,height},place:{x:(x+width/2)/1024-w/2,y:(y+height/2)/1536-h/2,width:w,height:h}};
  }
  return {...part,id:part.id+':xianbei-whole-v1',source,palette,crop:{
   x:(part.crop.x-origin)/base.width*1024,y:part.crop.y/base.height*1536,
   width:part.crop.width/base.width*1024,height:part.crop.height/base.height*1536,
  }};
 });
 const bounds=wholePortraitBounds[rig],minX=Math.min(...bounds.map(b=>b[0])),maxX=Math.max(...bounds.map(b=>b[0]+b[2]));
 const minY=Math.min(...bounds.map(b=>b[1])),maxY=Math.max(...bounds.map(b=>b[1]+b[3])),side=Math.max(maxX-minX,maxY-minY)*1.7;
 const thumbnail={x:Math.max(0,(minX+maxX-side)/2)/1024,y:Math.max(0,(minY+maxY-side)/2)/1536,width:side/1024,height:side/1536};
 const result={...recipe,palette,parts,thumbnail};validatePaintedRecipe(result);return result;
}
