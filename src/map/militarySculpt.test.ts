import {describe,it,expect} from 'vitest';
import {Vector3} from 'three';
import {militaryGarmentGeometry,militaryLamellaGeometry} from './militarySculpt';

describe('military sculpt geometry (CPU only)',()=>{
 it('keeps tailored surfaces finite, indexed and outward-facing around the silhouette',()=>{
  const g=militaryGarmentGeometry([[0,.2,.13],[.3,.18,.12],[.5,.22,.14]],.05),p=g.getAttribute('position'),n=g.getAttribute('normal'),uv=g.getAttribute('uv');
  expect(g.getIndex()!.count%3).toBe(0);expect(uv.count).toBe(p.count);
  for(let i=0;i<p.count;i++){expect([p.getX(i),p.getY(i),p.getZ(i),n.getX(i),n.getY(i),n.getZ(i)].every(Number.isFinite)).toBe(true);expect(new Vector3().fromBufferAttribute(n,i).length()).toBeCloseTo(1,5);}
  for(let i=41;i<82;i++)expect(n.getX(i)*p.getX(i)+n.getZ(i)*p.getZ(i)).toBeGreaterThan(0);
  g.dispose();
 });
 it('uses shallow beveled lamellae within a bounded reusable mesh budget',()=>{
  const g=militaryLamellaGeometry();g.computeBoundingBox();const size=g.boundingBox!.getSize(new Vector3());expect(size.z).toBeLessThan(.015);expect(size.y).toBeGreaterThan(.07);expect(g.getAttribute('position').count).toBeLessThan(1000);g.dispose();
 });
});
