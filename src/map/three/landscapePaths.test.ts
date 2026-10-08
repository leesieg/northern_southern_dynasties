import {expect,it} from 'vitest';
import {smoothGroundPath,pathSections,riverSafeCity,nearestOnSegment} from './landscapePaths';
it('keeps endpoints, removes duplicate nodes and rounds a right-angle inside the source corridor',()=>{
 const p=smoothGroundPath([{x:0,z:0},{x:0,z:0},{x:10,z:0},{x:10,z:10}],.3,3);
 expect(p[0]).toEqual({x:0,z:0});expect(p.at(-1)).toEqual({x:10,z:10});
 for(let i=1;i<p.length;i++){expect(Math.hypot(p[i].x-p[i-1].x,p[i].z-p[i-1].z)).toBeLessThanOrEqual(.301);expect(p[i].x).toBeGreaterThanOrEqual(0);expect(p[i].x).toBeLessThanOrEqual(10);}
 const sec=pathSections(p);for(let i=1;i<sec.length;i++)expect(sec[i].nx*sec[i-1].nx+sec[i].nz*sec[i-1].nz).toBeGreaterThan(.95);
 expect(sec.at(-1)!.distance).toBeGreaterThan(18);expect(sec.at(-1)!.distance).toBeLessThan(20);
});
it('handles reversed paths and preserves the same river bank constraint',()=>{
 const source=[{a:{x:-40,z:0},b:{x:40,z:0}}],p={x:0,z:-.5};
 for(const segments of [source,source.map(s=>({a:s.b,b:s.a}))]){const city=riverSafeCity(p,12,segments,true);expect(city.z).toBeGreaterThan(city.radius+1);expect(city.clearance-city.radius).toBeGreaterThanOrEqual(1.2);expect(city.scale).toBe(.55);}
 expect(p).toEqual({x:0,z:-.5});
});
it('checks all segments in a meander instead of only the closest bank',()=>{
 const segs=[{a:{x:-30,z:0},b:{x:30,z:0}},{a:{x:30,z:0},b:{x:30,z:30}},{a:{x:30,z:30},b:{x:-30,z:30}}];
 const c=riverSafeCity({x:20,z:2},10,segs);for(const s of segs)expect(nearestOnSegment(c,s.a,s.b).distance-c.radius).toBeGreaterThanOrEqual(1.2);
 expect(riverSafeCity({x:200,z:200},10,segs).scale).toBe(1);
});
