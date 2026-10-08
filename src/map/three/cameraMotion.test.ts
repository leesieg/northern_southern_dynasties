import {expect,it} from 'vitest';
import {CampaignZoomMotion,campaignZoomPose,wheelZoomDelta,terrainSafePitch} from './cameraMotion';
import {distanceZoom,zoomDistance} from './geography';

it.each([[1.1,12],[12,1.1]])('traverses the entire zoom range monotonically from %s to %s',(start,end)=>{
 const motion=new CampaignZoomMotion();motion.push(start,end-start);let zoom=start;
 for(let frame=0;frame<180&&motion.target!==undefined;frame++){
  const next=motion.step(zoom,1000/60);expect((next-zoom)*Math.sign(end-start)).toBeGreaterThanOrEqual(0);
  expect(next).toBeGreaterThanOrEqual(1.1);expect(next).toBeLessThanOrEqual(12);
  expect(distanceZoom(zoomDistance(next))).toBeCloseTo(next);zoom=next;
 }
 expect(zoom).toBe(end);expect(motion.target).toBeUndefined();
});
it('responds to the first reverse tick instead of consuming the previous queue',()=>{
 const motion=new CampaignZoomMotion();motion.push(6,3);const current=motion.step(6,16);
 motion.push(current,-.2);expect(motion.step(current,16)).toBeLessThan(current);
});
it('accumulates repeated inputs and clamps custom bounds',()=>{
 const motion=new CampaignZoomMotion(3,9);motion.push(6,.7);expect(motion.push(6,.7)).toBeCloseTo(7.4);
 expect(motion.push(6,100)).toBe(9);expect(motion.step(6,16,true)).toBe(9);
 motion.push(9,-100);expect(motion.step(9,16,true)).toBe(3);
});
it('has the same response across frame rates and normalizes wheel units',()=>{
 const advance=(fps:number)=>{const m=new CampaignZoomMotion();m.push(4,4);let z=4;for(let i=0;i<fps/5;i++)z=m.step(z,1000/fps);return z;};
 expect(advance(30)).toBeCloseTo(advance(60),10);expect(advance(120)).toBeCloseTo(advance(60),10);
 expect(wheelZoomDelta(3,1,900)).toBe(wheelZoomDelta(48,0,900));expect(wheelZoomDelta(1,2,900)).toBe(-.48);
});
it('keeps pitch and north-up transition continuous in both directions',()=>{
 for(let z=1.11;z<=12;z+=.01){const a=campaignZoomPose(z-.01,true,175),b=campaignZoomPose(z,true,175);
  expect(Math.abs(a.pitch-b.pitch)).toBeLessThan(.4);expect(Math.abs(a.bearing-b.bearing)).toBeLessThan(2);
 }
 expect(campaignZoomPose(4.8,true,175)).toEqual({pitch:.06,bearing:0});
 expect(campaignZoomPose(12,true,175)).toEqual({pitch:66,bearing:175});
 expect(campaignZoomPose(8,false,0).pitch).toBe(.06);
});
it('clears a mountain without changing zoom distance or blocking completion',()=>{
 const d=zoomDistance(12),requested=66*Math.PI/180,height=(r:number)=>r*.8;
 const angle=terrainSafePitch(d,requested,height);
 expect(angle).toBeLessThan(requested);expect(d*Math.cos(angle)).toBeGreaterThanOrEqual(height(d*Math.sin(angle))+7);
 expect(distanceZoom(Math.hypot(d*Math.sin(angle),d*Math.cos(angle)))).toBeCloseTo(12);
 expect(terrainSafePitch(d,requested,()=>0)).toBe(requested);
});
