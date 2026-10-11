import {describe,it,expect} from 'vitest';
import {detailWeights,forestCover,plantable,riverDistance,travelPose,views} from './layout';

describe('isolated landscape presentation',()=>{
 it('keeps vegetation out of the city footprint and river corridor',()=>{
  for(let x=-9;x<=9;x+=.5)for(let z=-7;z<=7;z+=.5){if(Math.hypot(x/1.25,z)<=7)expect(plantable(x,z,8,99,[{x:0,z:0}])).toBe(false);expect(plantable(x,z,8,1.5,[])).toBe(false);}
 });
 it('uses segment distance, including bends and endpoints',()=>{
  const lines=[[{x:0,z:0},{x:10,z:0},{x:10,z:10}]];
  expect(riverDistance(5,2,lines)).toBe(2);expect(riverDistance(12,12,lines)).toBeCloseTo(Math.sqrt(8));expect(riverDistance(0,0,[])).toBe(Infinity);
 });
 it('keeps woodland stable and spatially continuous under camera movement',()=>{
  for(let x=-80;x<80;x+=2){const cover=forestCover(x,15,3);expect(cover).toBe(forestCover(x,15,3));expect(cover).toBeGreaterThanOrEqual(0);expect(cover).toBeLessThanOrEqual(1);expect(Math.abs(cover-forestCover(x+.001,15,3))).toBeLessThan(.01);}
 });
 it('fades figure visibility continuously across the entire zoom range',()=>{
  let previous=1;for(let d=20;d<=260;d+=.1){const w=detailWeights(d);expect(w.units).toBeLessThanOrEqual(previous+1e-9);expect(previous-w.units).toBeLessThan(.004);previous=w.units;}
  expect(detailWeights(60).units).toBe(1);expect(detailWeights(140).units).toBe(0);
 });
 it('turns around without a path wrap or end-point teleport',()=>{
  for(let t=0;t<130;t+=1/60){const a=travelPose(t,.5),b=travelPose(t+1/60,.5);expect(a.u).toBeGreaterThanOrEqual(.019);expect(a.u).toBeLessThanOrEqual(.981);expect(Math.abs(a.u-b.u)).toBeLessThan(.00081);}
  expect(travelPose(0,0).speed).toBe(0);expect(travelPose(Math.PI/.10,0).speed).toBeCloseTo(0);
 });
 it('keeps the three landscape presets ordered and the paper camera overhead',()=>{
  const distance=(key:keyof typeof views)=>Math.hypot(...views[key].eye.map((v,i)=>v-views[key].target[i]));
  expect(distance('near')).toBeLessThan(distance('middle'));expect(distance('middle')).toBeLessThan(distance('far'));expect(views.paper.eye[0]).toBe(views.paper.target[0]);
 });
});
