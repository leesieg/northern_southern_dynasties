import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {Mesh,PerspectiveCamera,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {atlasOverview,atlasOverviewFov} from '../../src/map/three/atlasOverview';
import {zoomDistance} from '../../src/map/three/geography';
import {TABLE_CENTER} from '../../src/map/three/tableRoom';

it('keeps actual desktop props, screen and window lattice inside the final camera',async()=>{
 const bytes=readFileSync('public/art/campaign/atlas-study-v2.glb');
 const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 scene.scale.setScalar(1000);scene.position.set(TABLE_CENTER.x,0,TABLE_CENTER.z);scene.updateMatrixWorld(true);
 const materials=new Set(['Study paper','Study ink','Study celadon','Study screen silk','Study window silk']);
 const points=[];
 scene.traverse(o=>{if(o instanceof Mesh&&materials.has(o.material.name)){
  const p=o.geometry.getAttribute('position');for(let i=0;i<p.count;i++)points.push(new Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld));
 }});
 expect(points.length).toBeGreaterThan(100);
 for(const aspect of [.73,1.78,3]){
  const {center,fov}=atlasOverview(aspect),camera=new PerspectiveCamera(fov,aspect,1,50000),d=zoomDistance(1.1),pitch=40*Math.PI/180;
  expect(center).toEqual(TABLE_CENTER);
  camera.position.set(center.x,d*Math.cos(pitch),center.z+d*Math.sin(pitch));camera.lookAt(center.x,0,center.z);camera.updateMatrixWorld();
  for(const point of points){const p=point.clone().project(camera);expect(Math.abs(p.x)).toBeLessThan(.90);expect(Math.abs(p.y)).toBeLessThan(.80);expect(p.z).toBeLessThan(1);}
  expect(atlasOverviewFov(1.1,fov)).toBeCloseTo(fov);expect(atlasOverviewFov(4.8,fov)).toBe(39);expect(atlasOverviewFov(6,fov)).toBe(39);
 }
 scene.traverse(o=>{if(o instanceof Mesh){o.geometry.dispose();o.material.dispose();}});
});
