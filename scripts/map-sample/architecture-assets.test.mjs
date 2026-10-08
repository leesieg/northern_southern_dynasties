import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Box3} from 'three';
import {sampleCampaignAssets} from '../../src/map/CampaignSampleAssets';

it('bakes the actual Blender assets with material identity, stable footprints and bounded variants',async()=>{
 const names=['city','tree-0',...['market','granary','hostel'].flatMap(b=>[1,2,3].map(n=>b+'-'+n)),...['worksite-0','worksite-1','worksite-2']];
 const loader=new GLTFLoader(),models=await Promise.all(names.map(async name=>{
  const data=readFileSync(new URL('../../public/art/campaign/'+name+'.glb',import.meta.url));
  return [name,(await loader.parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'')).scene];
 }));
 const assets=sampleCampaignAssets(new Map(models));
 const appearance={capital:false,county:false,south:false,style:'northern',fort:0,levels:[1,2,3],project:0,progress:2,besieged:false,color:'#fff'};
 const city=assets.city(appearance,'close'),fort=assets.city({...appearance,fort:3,capital:true},'close'),regional=assets.city(appearance,'regional');
 const mesh=city.children[0],geometry=mesh.geometry,position=geometry.getAttribute('position'),surface=geometry.getAttribute('architectureSurface');
 expect(surface.count).toBe(position.count);expect(new Set(Array.from({length:surface.count},(_,i)=>surface.getY(i)))).toEqual(new Set([0,1,2,3]));
 expect(position.count/3).toBeLessThan(60000);expect((regional.children[0]).geometry.getAttribute('position').count).toBeLessThan(position.count);
 const a=new Box3().setFromObject(city),b=new Box3().setFromObject(fort);
 expect(a.min.x).toBeCloseTo(b.min.x);expect(a.max.x).toBeCloseTo(b.max.x);expect(a.min.z).toBeCloseTo(b.min.z);expect(a.max.z).toBeCloseTo(b.max.z);
 expect(assets.city(appearance,'close').children[0]).not.toBe(mesh);
 expect((assets.city(appearance,'close').children[0]).geometry).toBe(geometry);
 assets.dispose();
});
