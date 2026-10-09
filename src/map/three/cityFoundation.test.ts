import {expect,it} from 'vitest';
import {Box3,Vector3} from 'three';
import {cityFoundationGeometry} from './cityFoundation';

it('connects a level city platform down to sloping terrain within the existing footprint',()=>{
 const bounds=new Box3(new Vector3(-8,-.2,-6),new Vector3(8,3,6)),scale=2,peak=12,at={x:100,y:peak-bounds.min.y*scale+.08,z:200};
 const terrain=(x:number,z:number)=>6+(x-100)*.2+(z-200)*.1,geometry=cityFoundationGeometry(bounds,at,scale,terrain),p=geometry.getAttribute('position');
 for(let i=1;i<p.count;i+=2){
  expect(p.getY(i)*scale+at.y).toBeCloseTo(peak+.065,5);
  const x=p.getX(i)*scale+at.x,z=p.getZ(i)*scale+at.z;
  expect(p.getY(i+1)*scale+at.y).toBeLessThan(terrain(x,z));
  expect(p.getX(i)).toBeGreaterThanOrEqual(bounds.min.x);expect(p.getX(i)).toBeLessThanOrEqual(bounds.max.x);expect(p.getZ(i)).toBeGreaterThanOrEqual(bounds.min.z);expect(p.getZ(i)).toBeLessThanOrEqual(bounds.max.z);
 }
 const normals=geometry.getAttribute('normal');expect(normals.getY(0)).toBeGreaterThan(.99);geometry.dispose();
});
