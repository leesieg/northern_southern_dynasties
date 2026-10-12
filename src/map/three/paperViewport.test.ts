import meta from '../../../public/art/campaign/national-terrain.json';
import {expect,it} from 'vitest';
import {paperViewport} from './paperViewport';
import {paperGeometry} from '../artSample/paperGeometry';
import {TABLE_CENTER} from './tableRoom';
import {zoomDistance,WORLD_KM} from './geography';

const extent=[meta.west,meta.north,meta.width,meta.height];
it('keeps the outermost live sheet inside the physical desktop at wide and narrow aspect ratios',()=>{
 for(const aspect of [.73,1.78,3]){
  const range=zoomDistance(1.1)*2*Math.tan(39*Math.PI/360)*Math.max(1,aspect);
  const frame=paperViewport(TABLE_CENTER,range,extent),g=paperGeometry(frame.center,frame.span,frame.bounds);
  g.rotateX(-Math.PI/2);g.translate(frame.center.x,0,frame.center.z);g.computeBoundingBox();
  const box=g.boundingBox!;
  expect(frame.center.x).toBeCloseTo(TABLE_CENTER.x);expect(frame.center.z).toBeCloseTo(TABLE_CENTER.z);
  expect(box.max.x-box.min.x).toBeCloseTo(meta.width*WORLD_KM,2);
  expect(box.max.z-box.min.z).toBeCloseTo(meta.height*WORLD_KM,2);
  // Builder's unobstructed table boards span 12.4 × 9.4 model units (1000 km/unit).
  expect(box.min.x).toBeGreaterThan(TABLE_CENTER.x-6200);expect(box.max.x).toBeLessThan(TABLE_CENTER.x+6200);
  expect(box.min.z).toBeGreaterThan(TABLE_CENTER.z-4700);expect(box.max.z).toBeLessThan(TABLE_CENTER.z+4700);g.dispose();
 }
});
it('crops geometry without stretching geographic UVs or moving map content',()=>{
 const center={x:120,z:80},span=400,bounds={minX:0,maxX:270,minZ:-30,maxZ:160};
 const g=paperGeometry(center,span,bounds),p=g.getAttribute('position'),uv=g.getAttribute('uv');
 for(let i=0;i<p.count;i++){
  const x=p.getX(i)+center.x,z=center.z-p.getY(i);
  expect(x).toBeGreaterThanOrEqual(bounds.minX);expect(x).toBeLessThanOrEqual(bounds.maxX);
  expect(z).toBeGreaterThanOrEqual(bounds.minZ);expect(z).toBeLessThanOrEqual(bounds.maxZ);
  expect(center.x+(uv.getX(i)-.5)*span).toBeCloseTo(x,4);
  expect(center.z+(.5-uv.getY(i))*span).toBeCloseTo(z,4);
 }g.dispose();
});
it('retains a local viewport on zoom-in and bounds panning at the sheet edge',()=>{
 const national=paperViewport(TABLE_CENTER,20000,extent),local=paperViewport(TABLE_CENTER,180,extent);
 expect(local.span).toBe(840);expect(local.span).toBeLessThan(national.span);
 const edge=paperViewport({x:national.bounds.maxX+100,z:national.bounds.minZ-100},180,extent);
 expect(edge.center.x+edge.span/2).toBeCloseTo(national.bounds.maxX);
 expect(edge.center.z-edge.span/2).toBeCloseTo(national.bounds.minZ);
 const g=paperGeometry({x:120,z:80},840);g.computeBoundingBox();
 expect(g.boundingBox!.min.x).toBe(-420);expect(g.boundingBox!.max.y).toBe(420);g.dispose();
});
