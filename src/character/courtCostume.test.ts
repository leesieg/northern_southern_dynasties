import {it,expect} from 'vitest';
import {paintedBounds,paintedFemaleRigs,type PaintedRigId} from '../data/paintedRoster';
import {portraitContext} from './composition';
import {composePaintedRoster} from './paintedRoster';
import {composePaintedStudy} from './paintedStudy';
import {courtCostume} from './courtCostume';
import {approvedPaintedRecipe} from './paintedSelection';
import {validatePaintedRecipe,type PaintedRecipe} from './paintedLayers';
import {newCampaignWorld} from '../core/world';
import {serializeWorld,parseWorld} from '../core/save';
import {setLocalHolder,countyTerritory} from '../core/localAdministration';
import {syncLocalHistory} from '../core/rulerHistory';
import courtAssetSizes from '../data/courtAssetSizes.json';

const facial=(r:PaintedRecipe)=>r.parts.filter(p=>!['body','head','headwear'].includes(p.slot)).map(({source,crop,place,mask})=>({source,crop,place,mask}));
it('每个成人模板与幼主都有完整朝服，五官、比例与基因不因身份改变',()=>{
 for(const rig of [...Object.keys(paintedBounds),'c-young-adult-v1'])for(const value of [0,100]){
  const c=portraitContext(rig==='c-young-adult-v1'?'yuan-shanjian':rig);
  c.identity.sex=paintedFemaleRigs.has(rig as PaintedRigId)?'female':'male';
  if(rig==='female')c.identity.culture='southern';
  c.life={age:rig==='child'?12:30,baselineAge:30,sickness:0,deceased:false,beard:false};
  for(const pair of Object.values(c.identity.genome.facial!))pair.fill(value);
  const raw=rig==='c-young-adult-v1'?composePaintedStudy(c.identity.genome):composePaintedRoster(rig,c),before=structuredClone(c);
  for(const office of ['ruler','governor'] as const){
   const result=courtCostume(raw,{...c,office});
   expect(()=>validatePaintedRecipe(result)).not.toThrow();
   expect(facial(result)).toEqual(facial(raw));
   expect(result.parts.map(p=>p.place)).toEqual(raw.parts.map(p=>p.place));
   expect(result.thumbnail).toEqual(raw.thumbnail);
   if(rig==='child'&&office==='governor'){expect(result).toBe(raw);continue;}
   const torso=result.parts[0],head=result.parts[1];
   expect(torso.source).toContain(`/court/${rig}-court-v2.png`);
   expect(head.source).toBe(torso.source);expect(result.parts.some(p=>p.slot==='headwear'||p.removePaper)).toBe(false);
   const [width,height]=courtAssetSizes[rig as keyof typeof courtAssetSizes];
   expect(torso.crop).toEqual({x:office==='ruler'?0:width/2,y:0,width:width/2,height});
   for(const p of [torso,head]){expect(p.crop.x+p.crop.width).toBeLessThanOrEqual(width);expect(p.crop.y+p.crop.height).toBeLessThanOrEqual(height);}
  }
  expect(c).toEqual(before);
 }
});
it('继位、中央任官、地方任官与卸任读取当前职务，重载不变脸也不写存档',()=>{
 const w=newCampaignWorld('gao-huan',undefined,'sandbox');
 expect(portraitContext('gao-huan',w).office).toBe('governor');
 expect(portraitContext('gao-yang',w).office).toBe('governor');
 expect(portraitContext('dugu-xin',w).office).toBe('commander');
 expect(portraitContext('yuan-shanjian',w).office).toBe('ruler');
 const succession=structuredClone(w);
 succession.realm!.governments!.realms.east.ruler='gao-yang';
 expect(portraitContext('gao-yang',succession).office).toBe('ruler');
 expect(portraitContext('yuan-shanjian',succession).office).not.toBe('ruler');
 const id='guest-east',civilian=approvedPaintedRecipe(id,portraitContext(id,w));
 setLocalHolder(w,countyTerritory('ye'),'east',id);
 syncLocalHistory(w);
 expect(portraitContext(id,w).office).toBe('governor');
 const official=approvedPaintedRecipe(id,portraitContext(id,w));expect(official.parts[0].source).toContain('court/');
 const saved=serializeWorld(w);expect(approvedPaintedRecipe(id,portraitContext(id,parseWorld(saved)))).toEqual(official);expect(serializeWorld(w)).toBe(saved);
 w.realm!.cities.ye.controller='west';
 expect(portraitContext(id,w).office).toBe('civilian');
 w.realm!.cities.ye.controller='east';
 setLocalHolder(w,countyTerritory('ye'),'east',null);
 expect(approvedPaintedRecipe(id,portraitContext(id,w))).toEqual(civilian);
});
