import {expect,it,vi} from 'vitest';
import {BoxGeometry,Group,Mesh,MeshStandardMaterial,Texture,type CubeTexture,type DataTexture} from 'three';
import {applyInfantryLighting} from './infantryLighting';
import {disposeInfantryAsset} from './RiggedInfantry';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';

it('fills metal reflections with shared daylight while preserving texture detail and physical shadows',()=>{
 const root=new Group(),map=new Texture(),normalMap=new Texture(),metalnessMap=new Texture(),material=new MeshStandardMaterial({map,normalMap,metalnessMap,metalness:1,roughness:.7});
 root.add(new Mesh(new BoxGeometry(),material),new Mesh(new BoxGeometry(),material));applyInfantryLighting(root);
 expect(material.map).toBe(map);expect(material.normalMap).toBe(normalMap);expect(material.metalnessMap).toBe(metalnessMap);
 expect(material.metalness).toBe(.7);expect(material.normalScale.toArray()).toEqual([.75,.75]);expect(material.roughness).toBe(.7);expect(material.emissive.getHex()).toBe(0);
 const env=material.envMap as CubeTexture,faces=env.image as DataTexture[];expect(faces).toHaveLength(6);expect(material.envMapIntensity).toBe(1.55);
 const brightness=(face:DataTexture)=>{const data=face.image.data as Uint8Array;let sum=0;for(let i=0;i<data.length;i+=4){sum+=data[i]+data[i+1]+data[i+2];expect(data[i+3]).toBe(255);}return sum/(data.length/4);};
 expect(brightness(faces[2])).toBeGreaterThan(brightness(faces[3]));
 // Check the complete lower hemisphere, including downward-facing normals.
 // At 1.55 intensity every direction retains a neutral reflected-light floor.
 for(const face of faces)for(let i=0;i<face.image.data.length;i+=4){
  const data=face.image.data as Uint8Array;
  expect((data[i]+data[i+1]+data[i+2])/3*material.envMapIntensity).toBeGreaterThan(160);
  expect(Math.max(data[i],data[i+1],data[i+2])-Math.min(data[i],data[i+1],data[i+2])).toBeLessThan(42);
 }
 const dispose=vi.spyOn(env,'dispose');disposeInfantryAsset({scene:root} as GLTF);expect(dispose).toHaveBeenCalledOnce();
});
