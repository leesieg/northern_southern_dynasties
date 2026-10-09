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
import {courtFaceRegistration} from '../data/courtFaceRegistration';

const facial=(r:PaintedRecipe)=>r.parts.filter(p=>!['body','head','headwear'].includes(p.slot)).map(({source,crop,mask})=>({source,crop,mask}));
it('所有朝服逐格登记脸部，保留五官采样与遗传比例并同步头像裁切',()=>{
 expect(Object.keys(courtFaceRegistration).sort()).toEqual([...Object.keys(paintedBounds),'c-young-adult-v1'].sort());
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
   expect(result.parts.slice(0,2).map(p=>p.place)).toEqual(raw.parts.slice(0,2).map(p=>p.place));
   if(rig==='child'&&office==='governor'){expect(result).toBe(raw);continue;}
   const [scale,dx,dy]=courtFaceRegistration[rig as keyof typeof courtFaceRegistration][office==='ruler'?0:1];
   for(let i=2;i<raw.parts.length;i++){
    const before=raw.parts[i].place,after=result.parts[i].place;
    expect(after.width/before.width).toBeCloseTo(scale);expect(after.height/before.height).toBeCloseTo(scale);
    expect(after.x+after.width/2).toBeCloseTo((before.x+before.width/2)*scale+dx);
    expect(after.y+after.height/2).toBeCloseTo((before.y+before.height/2)*scale+dy);
   }
   const thumb=raw.thumbnail??{x:310/1024,y:180/1536,width:360/1024,height:360/1536};
   expect(result.thumbnail!.x).toBeCloseTo(thumb.x*scale+dx);expect(result.thumbnail!.y).toBeCloseTo(thumb.y*scale+dy);
   expect(result.thumbnail!.width/thumb.width).toBeCloseTo(scale);expect(result.thumbnail!.height/thumb.height).toBeCloseTo(scale);
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
it('高欢两套朝服的鼻口落在新底图的脸部，不再停留在旧脸坐标',()=>{
 const c=portraitContext('gao-huan');
 // Canonical 724×1086 panel coordinates, checked against cheek/chin landmarks.
 // The old recipe put the nose near x=402 and mouth near x=385 in both panels.
 for(const [office,noseX,mouthX] of [['governor',419,402],['ruler',447,431]] as const){
  const r=approvedPaintedRecipe('gao-huan',{...c,office});
  const center=(slot:string)=>{const p=r.parts.find(p=>p.slot===slot)!.place;return (p.x+p.width/2)*724;};
  expect(Math.abs(center('nose')-noseX)).toBeLessThan(2);
  expect(Math.abs(center('mouth')-mouthX)).toBeLessThan(2);
  expect(r.palette).toContain('face-v1');
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
