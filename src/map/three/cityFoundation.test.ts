import {expect,it} from 'vitest';
import {Box3,Vector3} from 'three';
import {cityFoundationGeometry} from './cityFoundation';
const bounds=new Box3(new Vector3(-8,-.2,-6),new Vector3(8,3,6));
it('supports the whole city and grades its apron into sloping ground without vertical skirts',()=>{
 const scale=2,at={x:100,y:12.48,z:200},terrain=(x:number,z:number)=>6+(x-100)*.2+(z-200)*.1;
 const geometry=cityFoundationGeometry(bounds,at,scale,terrain),p=geometry.getAttribute('position'),index=geometry.getIndex()!;
 expect(p.getY(0)*scale+at.y).toBeCloseTo(12.065,5);
 let buried=0,extended=0;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i)*scale+at.x,z=p.getZ(i)*scale+at.z,y=p.getY(i)*scale+at.y;
  expect(Number.isFinite(y)).toBe(true);if(y<terrain(x,z))buried++;
  if(Math.abs(p.getX(i))>8||Math.abs(p.getZ(i))>6)extended++;
 }
 expect(buried).toBeGreaterThan(30);expect(extended).toBeGreaterThan(100);
 for(let i=0;i<index.count;i+=3){const a=new Vector3().fromBufferAttribute(p,index.getX(i)),b=new Vector3().fromBufferAttribute(p,index.getX(i+1)),c=new Vector3().fromBufferAttribute(p,index.getX(i+2));expect(b.sub(a).cross(c.sub(a)).y).toBeGreaterThanOrEqual(-1e-7);}
 geometry.dispose();
});
it('does not extend the apron into a protected river corridor',()=>{
 const g=cityFoundationGeometry(bounds,{x:0,y:8,z:0},1,()=>0,(x)=>x<8.1),p=g.getAttribute('position');
 for(let i=0;i<p.count;i++)expect(p.getX(i)).toBeLessThanOrEqual(8.1);g.dispose();
});
