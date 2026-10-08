import {readFile} from 'node:fs/promises';
import {expect,it} from 'vitest';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Mesh} from 'three';
import {sampleCampaignAssets} from '../../src/map/CampaignSampleAssets';
it('reduces real Blender city geometry while preserving footprint and construction modules',async()=>{
 const names=['city','tree-0',...['market','granary','hostel'].flatMap(n=>[1,2,3].map(i=>`${n}-${i}`)),...['worksite-0','worksite-1','worksite-2']];
 const loader=new GLTFLoader(),models=await Promise.all(names.map(async name=>{const b=await readFile(`public/art/campaign/${name}.glb`);return [name,(await loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene];}));
 const assets=sampleCampaignAssets(new Map(models));
 const a={capital:true,south:false,style:'northern',county:false,fort:2,levels:[2,1,1],project:-1,progress:0,besieged:false,color:'#ffffff'};
 const close=(assets.city(a,'close').children[0]).geometry,regional=(assets.city(a,'regional').children[0]).geometry;
 expect(regional.getAttribute('position').count).toBeLessThan(close.getAttribute('position').count);
 close.computeBoundingBox();regional.computeBoundingBox();expect(regional.boundingBox.max.x-regional.boundingBox.min.x).toBeCloseTo(close.boundingBox.max.x-close.boundingBox.min.x,3);
 const bare=(assets.city({...a,levels:[0,0,0]},'regional').children[0]).geometry;
 expect(regional.getAttribute('position').count).toBeGreaterThan(bare.getAttribute('position').count);
 console.info('City vertices: close=%d regional=%d',close.getAttribute('position').count,regional.getAttribute('position').count);
 assets.dispose();
});
