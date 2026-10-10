import {expect,it,vi} from 'vitest';
import {Mesh,MeshStandardMaterial,Raycaster,Vector3} from 'three';
import type {FeatureCollection} from 'geojson';
import {CampaignOverlays} from './overlays';
import {projectGround} from './geography';
const road:FeatureCollection={type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'LineString',coordinates:[[110,32],[110.05,32],[110.1,32]]},properties:{}}]};
it('updates a marching route without rebuilding static roads and releases replaced geometry',()=>{
 const overlay=new CampaignOverlays(()=>0),layers=[{id:'trails',type:'line',source:'roads',paint:{'line-width':3}},{id:'march',type:'line',source:'route',paint:{'line-width':3}}],sources=new Map([['roads',road],['route',structuredClone(road)]]);
 overlay.rebuild(layers,sources,12,.1,new Map());const trail=overlay.root.children.find(m=>m.userData.overlaySource==='roads') as Mesh,route=overlay.root.children.find(m=>m.userData.overlaySource==='route') as Mesh,trailDispose=vi.spyOn(trail.geometry,'dispose'),routeDispose=vi.spyOn(route.geometry,'dispose');
 const advanced=structuredClone(road);(advanced.features[0].geometry as {coordinates:number[][]}).coordinates[0]=[110.02,32];sources.set('route',advanced);overlay.rebuild(layers,sources,12,.1,new Map(),undefined,false,false,new Set(['route']));expect(overlay.root.children).toContain(trail);expect(trailDispose).not.toHaveBeenCalled();expect(routeDispose).toHaveBeenCalledOnce();expect(overlay.root.children).not.toContain(route);expect(overlay.root.children).toHaveLength(2);
 const changed=overlay.root.children.find(m=>m.userData.overlaySource==='route') as Mesh;expect(changed.renderOrder).toBe(route.renderOrder);overlay.clear();expect(trailDispose).toHaveBeenCalledOnce();
});
it('keeps a short river crossing above water and releases its geometry on rebuild',()=>{
 const overlay=new CampaignOverlays(()=>1,undefined,(lon)=>lon>110.04&&lon<110.06?3:null);
 const layer={id:'campaign-trails',type:'line',source:'roads',paint:{'line-width':3,'line-opacity':.8}};
 overlay.rebuild([layer],new Map([['roads',road]]),12,.1,new Map());
 const bridge=overlay.root.getObjectByName('Campaign timber bridges') as Mesh;expect(bridge).toBeDefined();
 const mesh=overlay.root.children.find(m=>m!==bridge) as Mesh,p=mesh.geometry.getAttribute('position'),c=mesh.geometry.getAttribute('color');
 expect(mesh.material).toBeInstanceOf(MeshStandardMaterial);expect(mesh.receiveShadow).toBe(true);
 const ys=Array.from({length:p.count},(_,i)=>p.getY(i));expect(Math.max(...ys)).toBeCloseTo(1.05,4);expect(Math.min(...ys)).toBeGreaterThan(1);
 expect(Array.from({length:c.count},(_,i)=>c.getW(i)).some(a=>a===0)).toBe(true);
 const at=projectGround(110.05,32),ray=new Raycaster(new Vector3(at.x+.015,10,at.z),new Vector3(0,-1,0));
 bridge.updateMatrixWorld();const hits=ray.intersectObject(bridge);expect(hits.length).toBeGreaterThan(0);expect(hits[0].point.y).toBeGreaterThan(3.2);
 expect(ray.intersectObject(mesh)).toHaveLength(0);expect(bridge.castShadow).toBe(true);
 const dispose=vi.spyOn(bridge.geometry,'dispose');overlay.clear();expect(dispose).toHaveBeenCalledOnce();expect(overlay.root.children).toHaveLength(0);
});
it('clips offscreen road triangles before submitting them to the renderer',()=>{
 const overlay=new CampaignOverlays(()=>0),layer={id:'campaign-trails',type:'line',source:'roads',paint:{'line-width':3}};
 overlay.rebuild([layer],new Map([['roads',road]]),12,.1,new Map(),[109.99,31.99,110.01,32.01]);
 const p=(overlay.root.children[0] as Mesh).geometry.getAttribute('position');expect(p.count).toBeLessThan(1500);overlay.clear();
});

it('does not invent a bridge without two dry banks or a bounded river crossing',()=>{
 const layer={id:'campaign-trails',type:'line',source:'roads',paint:{'line-width':3}};
 for(const water of [()=>3,(lon:number)=>lon<110.06?3:null]){
  const overlay=new CampaignOverlays(()=>1,undefined,water);overlay.rebuild([layer],new Map([['roads',road]]),12,.1,new Map());
  expect(overlay.root.getObjectByName('Campaign timber bridges')).toBeUndefined();overlay.clear();
 }
});
