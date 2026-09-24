import {readFileSync} from 'node:fs';
import {it,expect} from 'vitest';
import {relationshipPeople} from '../src/data/relationships';
import {portraitContext} from '../src/character/composition';
import {approvedPaintedRecipe} from '../src/character/paintedSelection';
import {paintedRig} from '../src/data/paintedRoster';
import metadata from '../src/data/paintedAssetMetadata.json';

it('全量人物的分层图存在，PNG 实际尺寸和源裁切均匹配配置',()=>{
 const data=new Map();
 for(const id of [...relationshipPeople.map(p=>p.id),'fictional','traveller-99']){
  for(const p of approvedPaintedRecipe(id,portraitContext(id)).parts){
   let image=data.get(p.source);if(!image){image=readFileSync(new URL('../public'+p.source,import.meta.url));data.set(p.source,image);}
   expect(image.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))).toBe(true);
   expect(p.crop.x+p.crop.width).toBeLessThanOrEqual(image.readUInt32BE(16));expect(p.crop.y+p.crop.height).toBeLessThanOrEqual(image.readUInt32BE(20));
  }
 }
 for(const id of Object.keys(metadata)){
  const r=paintedRig(id),image=readFileSync(new URL('../public'+r.source,import.meta.url));
  expect(image.readUInt32BE(16)).toBe(metadata[id].width);expect(image.readUInt32BE(20)).toBe(metadata[id].height);
  if(r.paired)expect(r.baseX).toBe(image.readUInt32BE(16)/2);
 }
 expect(data.size).toBeGreaterThan(20);
});
