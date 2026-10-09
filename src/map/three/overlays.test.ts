import {expect,it} from 'vitest';
import {Mesh,MeshStandardMaterial} from 'three';
import type {FeatureCollection} from 'geojson';
import {CampaignOverlays} from './overlays';
const road:FeatureCollection={type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'LineString',coordinates:[[110,32],[110.1,32]]},properties:{}}]};
it('keeps a short river crossing above water and releases its geometry on rebuild',()=>{
 const overlay=new CampaignOverlays(()=>1,undefined,(lon)=>lon>110.04&&lon<110.06?3:null);
 const layer={id:'campaign-trails',type:'line',source:'roads',paint:{'line-width':3,'line-opacity':.8}};
 overlay.rebuild([layer],new Map([['roads',road]]),12,.1,new Map());
 const mesh=overlay.root.children[0] as Mesh,p=mesh.geometry.getAttribute('position'),c=mesh.geometry.getAttribute('color');
 expect(mesh.material).toBeInstanceOf(MeshStandardMaterial);expect(mesh.receiveShadow).toBe(true);
 const ys=Array.from({length:p.count},(_,i)=>p.getY(i));expect(Math.max(...ys)).toBeCloseTo(3.34,4);expect(Math.min(...ys)).toBeGreaterThan(1);
 expect(Array.from({length:c.count},(_,i)=>c.getW(i)).some(a=>a===0)).toBe(true);
 overlay.clear();expect(overlay.root.children).toHaveLength(0);
});
it('clips offscreen road triangles before submitting them to the renderer',()=>{
 const overlay=new CampaignOverlays(()=>0),layer={id:'campaign-trails',type:'line',source:'roads',paint:{'line-width':3}};
 overlay.rebuild([layer],new Map([['roads',road]]),12,.1,new Map(),[109.99,31.99,110.01,32.01]);
 const p=(overlay.root.children[0] as Mesh).geometry.getAttribute('position');expect(p.count).toBeLessThan(1500);overlay.clear();
});
