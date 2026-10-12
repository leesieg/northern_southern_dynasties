import {describe,it,expect} from 'vitest';
import {riverShape} from './riverShape';

const line=Array.from({length:161},(_,i)=>({x:i*.5-40,z:Math.sin(i*.04)*7}));
describe('natural river cross-sections',()=>{
 it('varies width continuously and makes bend banks asymmetric',()=>{
  const river=riverShape([line],()=>.3),p=river.profiles[0],widths=p.map(s=>s.left+s.right);
  expect(Math.max(...widths)-Math.min(...widths)).toBeGreaterThan(.15);
  expect(p.some(s=>Math.abs(s.leftBank-s.rightBank)>.15)).toBe(true);
  for(let i=1;i<p.length;i++)expect(Math.abs(widths[i]-widths[i-1])).toBeLessThan(.12);
 });
 it('limits water gradients despite noisy source elevations',()=>{
  const river=riverShape([line],x=>Math.max(0,Math.sin(x*.5)*5+5)),p=river.profiles[0];
  for(let i=1;i<p.length;i++)expect(Math.abs(p[i].level-p[i-1].level)/(p[i].distance-p[i-1].distance)).toBeLessThanOrEqual(.008001);
 });
 it('places the wider shallow bank on the inside of a bend',()=>{
  const curve=Array.from({length:61},(_,i)=>({x:15*Math.cos(i*.02),z:15*Math.sin(i*.02)})),river=riverShape([curve],()=>.3),p=river.profiles[0][30];
  expect(p.bend).toBeGreaterThan(0);expect(p.rightBank).toBeGreaterThan(p.leftBank);expect(p.right).toBeLessThan(p.left);
  const inner=river.sample(p.x+p.nx*(p.right+.1),p.z+p.nz*(p.right+.1))!;
  const outer=river.sample(p.x-p.nx*(p.left+.1),p.z-p.nz*(p.left+.1))!;
  expect(inner.inner).toBeGreaterThan(outer.inner);
 });
 it('carves a bed below water and joins banks to untouched terrain continuously',()=>{
  const river=riverShape([[{x:-20,z:0},{x:0,z:0},{x:20,z:0}]],()=>1),p=river.sample(0,0)!;
  expect(river.carve(1,p)).toBeLessThan(p.level);
  const section=river.profiles[0][1],edge=section.right+section.rightBank;
  expect(river.carve(1,river.sample(0,edge-.0001))).toBeCloseTo(1,6);
  expect(river.carve(1,river.sample(0,edge+.0001))).toBe(1);
  expect(river.carve(12,undefined)).toBe(12);
 });
 it('does not join disconnected source corridors or mutate source coordinates',()=>{
  const before=JSON.stringify(line),river=riverShape([line,[{x:100,z:100},{x:110,z:100}]],()=>0);
  expect(river.sample(70,70)).toBeUndefined();expect(JSON.stringify(line)).toBe(before);
 });
});
