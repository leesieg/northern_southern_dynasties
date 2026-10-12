import {describe,it,expect} from 'vitest';
import {softenRelief,RELIEF_SCALE} from './relief';

describe('measured relief at campaign scale',()=>{
 it('preserves flat terrain and does not mutate measured source samples',()=>{
  const source=new Float32Array(25*25).fill(87),copy=source.slice(),result=softenRelief(source,25,25);
  expect(source).toEqual(copy);for(const h of result)expect(h).toBeCloseTo(87,5);
 });
 it('suppresses isolated spikes while retaining a broad measured ridge',()=>{
  const size=41,source=new Float32Array(size*size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++)source[y*size+x]=300*Math.exp(-((x-20)**2)/80);
  source[20*size+20]+=500;
  const result=softenRelief(source,size,size);
  expect(result[20*size+20]).toBeLessThan(320);expect(result[20*size+20]).toBeGreaterThan(240);
  expect(result[20*size+20]).toBeGreaterThan(result[20*size+5]*2);
  expect(result[20*size+20]*RELIEF_SCALE).toBeLessThan(3.2);
 });
 it('preserves an interior continuous slope without tile seams or negative overshoot',()=>{
  const size=31,source=Float32Array.from({length:size*size},(_,i)=>20+(i%size)*3+Math.floor(i/size)*2),result=softenRelief(source,size,size);
  for(let y=7;y<24;y++)for(let x=7;x<24;x++)expect(result[y*size+x]).toBeCloseTo(source[y*size+x],4);
  for(const h of result){expect(h).toBeGreaterThanOrEqual(20);expect(h).toBeLessThanOrEqual(170);}
 });
});
