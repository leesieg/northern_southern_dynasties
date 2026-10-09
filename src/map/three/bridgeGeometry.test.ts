import {expect,it} from 'vitest';
import {Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {bridgeGeometry} from './bridgeGeometry';

it('builds a solid planked deck in either heading with dry-bank ramps and grounded supports',()=>{
 for(const heading of [0,Math.PI/2,Math.PI*.37]){
  const point=(d:number)=>({x:Math.cos(heading)*d,z:Math.sin(heading)*d});
  const geometry=bridgeGeometry([0,.4,1,2,2.6,3].map(d=>({...point(d),distance:d,y:d===0||d===3?1.05:1.45})),()=>1),mesh=new Mesh(geometry,new MeshBasicMaterial());
  mesh.updateMatrixWorld();const p=geometry.getAttribute('position');
  expect(Array.from(p.array).every(Number.isFinite)).toBe(true);expect(p.count/3).toBeLessThan(2500);
  // Ray through a plank (not its joint) must hit the deck before the supporting beams.
  const d=3/Math.ceil(3/.11)*14.5,mid=point(d),ray=new Raycaster(new Vector3(mid.x,5,mid.z),new Vector3(0,-1,0));
  const hits=ray.intersectObject(mesh);expect(hits[0].point.y).toBeCloseTo(1.45,4);
  const ys=Array.from({length:p.count},(_,i)=>p.getY(i));expect(Math.min(...ys)).toBeLessThan(1);expect(Math.max(...ys)).toBeCloseTo(1.73,3);
  geometry.dispose();mesh.material.dispose();
 }
});
