import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {historicalPortraitRegistration} from './historicalPortrait';
import {approvedPaintedRecipe} from './paintedSelection';
import {portraitContext} from './composition';
import {validatePaintedRecipe} from './paintedLayers';

const dimensions=new Map();
function sourceSize(source){
 if(!dimensions.has(source)){const bytes=readFileSync('public'+source);dimensions.set(source,{width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)});}
 return dimensions.get(source);
}

it.each(Object.keys(historicalPortraitRegistration))('%s preserves the approved original and registers every outfit against real sources',id=>{
 const context=portraitContext(id);
 const native=approvedPaintedRecipe(id,{...context,office:historicalPortraitRegistration[id].native});
 const body=native.parts.find(p=>p.slot==='body');
 const registration=historicalPortraitRegistration[id],collection=registration.collection??'historical-five-v1';
 const study=collection==='historical-west-seven-v1'?'historical-west-seven-546-v1':collection==='historical-third-v1'?'historical-third-546-v1':collection==='historical-four-v1'?'historical-four-546-v1':'historical-five-546-v1';
 expect(readFileSync('public'+body.source)).toEqual(readFileSync('docs/art-direction/portrait-studies/'+study+'/'+id+'.png'));
 const ages=registration.ageStages?(id==='yuwen-jue'?[4,9,10,15,16,70]:[12,15,16,70]):[context.life.age];
 for(const age of ages)for(const office of ['civilian','governor','commander','ruler']){
  const recipe=approvedPaintedRecipe(id,{...context,office,life:{...context.life,age}});
  expect(validatePaintedRecipe(recipe)).toHaveLength(8);expect(recipe.facialHair).toBe(registration.facialHair??true);
  const full=recipe.parts.find(p=>p.slot==='body');expect(full.crop.width/full.crop.height).toBeCloseTo(2/3);
  for(const part of recipe.parts){
   const {width,height}=sourceSize(part.source);
   expect(part.crop.x).toBeGreaterThanOrEqual(full.crop.x);expect(part.crop.y).toBeGreaterThanOrEqual(full.crop.y);
   expect(part.crop.x+part.crop.width).toBeLessThanOrEqual(full.crop.x+full.crop.width);
   expect(part.crop.y+part.crop.height).toBeLessThanOrEqual(full.crop.y+full.crop.height);
   expect(part.crop.x+part.crop.width).toBeLessThanOrEqual(width);expect(part.crop.y+part.crop.height).toBeLessThanOrEqual(height);
  }
  const t=recipe.thumbnail;expect(t.width*full.crop.width).toBeCloseTo(t.height*full.crop.height);
 }
});
