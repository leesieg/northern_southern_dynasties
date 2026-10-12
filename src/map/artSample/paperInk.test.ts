import {paperRidgeLod} from './paperInk';
import {describe,it,expect} from 'vitest';
import {inkEdge} from './paperInk';
describe('decorative atlas boundaries',()=>{
 it('retains junctions and traces shared borders identically in either direction',()=>{const a={x:-31,z:12},b={x:42,z:-8};const p=inkEdge(a,b);expect(p[0]).toEqual(a);expect(p.at(-1)).toEqual(b);expect(inkEdge(b,a).reverse()).toEqual(p);expect(a).toEqual({x:-31,z:12});});
 it('keeps ink displacement bounded and progress monotonic',()=>{const a={x:-20,z:-8},b={x:54,z:23},dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);let previous=-1;for(const p of inkEdge(a,b)){const along=((p.x-a.x)*dx+(p.z-a.z)*dz)/len;expect(along).toBeGreaterThanOrEqual(previous-1e-8);previous=along;expect(Math.abs((p.x-a.x)*dz-(p.z-a.z)*dx)/len).toBeLessThanOrEqual(1.100001);}});
 it('handles coincident and very short edges without invalid geometry',()=>{for(const b of [{x:1,z:1},{x:1.00001,z:1}])for(const p of inkEdge({x:1,z:1},b)){expect(Number.isFinite(p.x)&&Number.isFinite(p.z)).toBe(true);}});
});

it('retains local ridge marks and reduces national stamp density and opacity',()=>{
 expect(paperRidgeLod(840)).toEqual({spacing:1,opacity:1});
 const regional=paperRidgeLod(3360),national=paperRidgeLod(12000);
 expect(regional.spacing).toBe(2);expect(national.spacing).toBe(3);
 expect(national.opacity).toBeLessThan(regional.opacity);expect(national.opacity).toBeGreaterThan(.5);
});
