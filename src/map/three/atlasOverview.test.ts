import {expect,it} from 'vitest';
import {PerspectiveCamera,Vector3} from 'three';
import type {FeatureCollection} from 'geojson';
import {atlasOverview,atlasOverviewFov} from './atlasOverview';
import {projectGround,zoomDistance} from './geography';
const coords=[[92,22],[124,22],[124,43],[92,43],[92,22]];
const realms:FeatureCollection={type:'FeatureCollection',features:[{type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[coords]}}]};
it('frames modeled boundaries with margin at narrow, desktop and ultrawide aspects',()=>{
 for(const aspect of [.73,1.78,3]){const {center,fov}=atlasOverview(realms,aspect),camera=new PerspectiveCamera(fov,aspect,1,40000),d=zoomDistance(1.1),pitch=40*Math.PI/180;
  camera.position.set(center.x,d*Math.cos(pitch),center.z+d*Math.sin(pitch));camera.lookAt(center.x,0,center.z);camera.updateMatrixWorld();
  for(const [lon,lat] of coords){const p=projectGround(lon,lat),screen=new Vector3(p.x,0,p.z).project(camera);expect(Math.abs(screen.x)).toBeLessThanOrEqual(.781);expect(Math.abs(screen.y)).toBeLessThanOrEqual(.721);}
  expect(fov).toBeLessThan(39);expect(atlasOverviewFov(1.1,fov)).toBeCloseTo(fov);expect(atlasOverviewFov(4.8,fov)).toBe(39);expect(atlasOverviewFov(6,fov)).toBe(39);
 }
});
it('keeps a finite empty-world fallback and smooth, monotonic overview transition',()=>{
 expect(atlasOverview(undefined,1).fov).toBe(39);let previous=Infinity;for(let z=1.1;z<=6;z+=.025){const span=zoomDistance(z)*Math.tan(atlasOverviewFov(z,15)*Math.PI/360);expect(span).toBeLessThanOrEqual(previous);previous=span;}
});
