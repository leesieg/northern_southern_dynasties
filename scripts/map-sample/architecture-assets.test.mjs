import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Box3} from 'three';
import {sampleCampaignAssets} from '../../src/map/CampaignSampleAssets';

it('bakes the actual Blender assets with material identity, stable footprints and bounded variants',async()=>{
 const names=['city','tree-0','tree-1','tree-2','tree-close-0','tree-close-1','tree-close-2','rocks',...['market','granary','hostel'].flatMap(b=>[1,2,3].map(n=>b+'-'+n)),...['worksite-0','worksite-1','worksite-2']];
 const loader=new GLTFLoader(),models=await Promise.all(names.map(async name=>{
  const data=readFileSync(new URL('../../public/art/campaign/'+name+'.glb',import.meta.url));
  return [name,(await loader.parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'')).scene];
 }));
 // Blender must export the baked albedo/contact shading, not silently turn assets white.
 for(const [name,root] of models){
  if(name==='rocks')continue;
  root.traverse(o=>{
   if(!o.isMesh)return;
   const colors=o.geometry.getAttribute('color');expect(colors,`${name}: baked color`).toBeDefined();
   const red=Array.from({length:colors.count},(_,i)=>colors.getX(i));
   expect(Math.max(...red),name).toBeLessThan(.9);expect(Math.min(...red),name).toBeGreaterThan(0);
   if(o.material.name.startsWith('Slate tile'))expect(Math.max(...red)).toBeLessThan(.12);
   if(name.startsWith('tree-')&&o.material.name.startsWith('Leaf ')){
    // A closed crown must face outward; inward winding exposes dark hollow backs in the browser.
    const g=o.geometry,p=g.getAttribute('position'),idx=g.index;let volume=0;
    const at=i=>idx?idx.getX(i):i;
    for(let i=0;i<(idx?.count??p.count);i+=3){const a=at(i),b=at(i+1),c=at(i+2);
     volume+=p.getX(a)*(p.getY(b)*p.getZ(c)-p.getZ(b)*p.getY(c))+p.getY(a)*(p.getZ(b)*p.getX(c)-p.getX(b)*p.getZ(c))+p.getZ(a)*(p.getX(b)*p.getY(c)-p.getY(b)*p.getX(c));
    }
    expect(volume,`${name}: outward closed crowns`).toBeGreaterThan(0);
   }
  });
 }
 const assets=sampleCampaignAssets(new Map(models));
 expect(assets.trees).toHaveLength(3);
 for(const tree of assets.trees){expect(tree.getAttribute('position').count/3).toBeLessThan(1000);expect(tree.getAttribute('color').count).toBe(tree.getAttribute('position').count);}
 for(const tree of assets.closeTrees)expect(tree.getAttribute('position').count/3).toBeLessThan(4500);
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
