import {readFileSync} from 'node:fs';
import {it,expect} from 'vitest';
import {composePaintedStudy} from '../src/character/paintedStudy';
import {founderGenome} from '../src/core/genetics';

it('组合配置指向真实本地 PNG，源图尺寸与裁切约定一致',()=>{
 const files=new Map();
 for(const variant of ['a','b']){
  const recipe=composePaintedStudy(founderGenome('asset-check'),{robe:variant,features:{brows:variant,eyes:variant,nose:variant,mouth:variant}});
  for(const p of recipe.parts){
   let data=files.get(p.source);if(!data){data=readFileSync(new URL(`../public${p.source}`,import.meta.url));files.set(p.source,data);}
   expect(data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))).toBe(true);
   expect(data.readUInt32BE(16)).toBe(1024);expect(data.readUInt32BE(20)).toBe(1536);
   expect(p.crop.x+p.crop.width).toBeLessThanOrEqual(data.readUInt32BE(16));
   expect(p.crop.y+p.crop.height).toBeLessThanOrEqual(data.readUInt32BE(20));
  }
 }
 expect(files.size).toBe(4);
});
