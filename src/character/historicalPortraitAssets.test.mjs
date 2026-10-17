import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {historicalPortraitRegistration} from './historicalPortrait';
import {approvedPaintedRecipe} from './paintedSelection';
import {portraitContext} from './composition';
import {validatePaintedRecipe} from './paintedLayers';

it.each(Object.keys(historicalPortraitRegistration))('%s preserves the approved original and registers every outfit against real sources',id=>{
 const context=portraitContext(id);
 const native=approvedPaintedRecipe(id,{...context,office:historicalPortraitRegistration[id].native});
 const body=native.parts.find(p=>p.slot==='body');
 const registration=historicalPortraitRegistration[id],collection=registration.collection??'historical-five-v1';
 const study=collection==='historical-four-v1'?'historical-four-546-v1':'historical-five-546-v1';
 expect(readFileSync('public'+body.source)).toEqual(readFileSync('docs/art-direction/portrait-studies/'+study+'/'+id+'.png'));
 for(const office of ['civilian','governor','commander','ruler']){
  const recipe=approvedPaintedRecipe(id,{...context,office});
  expect(validatePaintedRecipe(recipe)).toHaveLength(8);expect(recipe.facialHair).toBe(registration.facialHair??true);
  const full=recipe.parts.find(p=>p.slot==='body');expect(full.crop.width/full.crop.height).toBeCloseTo(2/3);
  for(const part of recipe.parts){
   const bytes=readFileSync('public'+part.source),width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
   expect(part.crop.x).toBeGreaterThanOrEqual(full.crop.x);expect(part.crop.y).toBeGreaterThanOrEqual(full.crop.y);
   expect(part.crop.x+part.crop.width).toBeLessThanOrEqual(full.crop.x+full.crop.width);
   expect(part.crop.y+part.crop.height).toBeLessThanOrEqual(full.crop.y+full.crop.height);
   expect(part.crop.x+part.crop.width).toBeLessThanOrEqual(width);expect(part.crop.y+part.crop.height).toBeLessThanOrEqual(height);
  }
  const t=recipe.thumbnail;expect(t.width*full.crop.width).toBeCloseTo(t.height*full.crop.height);
 }
});
