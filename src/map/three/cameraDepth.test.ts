import {expect,it} from 'vitest';
import {cameraNearPlane} from './cameraDepth';
import {zoomDistance} from './geography';
import {CampaignOverlays} from './overlays';
import {Mesh,MeshBasicMaterial} from 'three';
it('keeps minimum overlay spacing distinguishable in a 24-bit depth buffer at national zoom',()=>{
 for(const zoom of [2.2,3,3.7,4.8]){
  const d=zoomDistance(zoom),near=cameraNearPlane(d),far=40000;
  const depth=(z:number)=>far/(far-near)-far*near/((far-near)*z);
  expect((depth(d)-depth(d-.15))*2**24).toBeGreaterThan(3);
  expect(near).toBeLessThan(d*.1);
 }
 expect(cameraNearPlane(7)).toBe(1);
});
it('composites flat distant overlays in explicit order and retains depth occlusion in terrain views',()=>{
 const overlay=new CampaignOverlays(()=>0),data={type:'FeatureCollection' as const,features:[{type:'Feature' as const,properties:{},geometry:{type:'Polygon' as const,coordinates:[[[110,32],[111,32],[111,33],[110,33],[110,32]]]}}]};
 const layers=['realm-tint','territory-selected'].map(id=>({id,type:'fill',source:'territories',paint:{'fill-opacity':.4}})),sources=new Map([['territories',data]]);
 overlay.rebuild(layers,sources,3,.5,new Map(),undefined,true);
 const meshes=overlay.root.children as Mesh[];
 expect(meshes.map(m=>m.renderOrder)).toEqual([1,2]);
 for(const m of meshes){const mat=m.material as MeshBasicMaterial;expect(mat.depthTest).toBe(false);expect(mat.depthWrite).toBe(false);}
 overlay.rebuild(layers,sources,3,.5,new Map(),undefined,false);
 expect(((overlay.root.children[0] as Mesh).material as MeshBasicMaterial).depthTest).toBe(true);
 overlay.rebuild(layers,sources,8,.05,new Map(),undefined,true);
 expect(((overlay.root.children[0] as Mesh).material as MeshBasicMaterial).depthTest).toBe(true);overlay.clear();
});
