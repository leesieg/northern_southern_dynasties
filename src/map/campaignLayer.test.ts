import {afterEach,describe,it,expect,vi} from 'vitest';
import {Camera,Group,Scene,Matrix4,Vector3,PerspectiveCamera} from 'three';
import {MercatorCoordinate,type Map as AtlasMap,type CustomRenderMethodInput} from 'maplibre-gl';
import {newCampaignWorld} from '../core/world';
import {siteById} from '../data/scenario';
import {campaignLayer} from './CampaignLayer';

// CPU contract test of projection, hit targets and fallback; no browser or UI automation.
const draws=vi.hoisted(()=>({frames:[] as {scene:Scene;camera:Camera}[],fail:false}));
vi.mock('three',async importOriginal=>{
 const actual=await importOriginal<typeof import('three')>();
 return {...actual,WebGLRenderer:class {autoClear=true;toneMapping=0;toneMappingExposure=1;resetState(){}dispose(){}render(scene:Scene,camera:Camera){if(draws.fail)throw new Error('render failed');scene.updateMatrixWorld(true);draws.frames.push({scene,camera});}}};
});
afterEach(()=>{draws.frames=[];draws.fail=false;});

describe('campaign custom layer (CPU only)',()=>{
 it('keeps the settlement at its actual geographic anchor and makes the rendered model clickable across cameras',()=>{
  const world=newCampaignWorld('xiao-yan'),site=siteById.jiankang,origin=MercatorCoordinate.fromLngLat([110,32]);
  const boundary=new Matrix4().makeTranslation(origin.x,origin.y,0).scale(new Vector3(1,-1,1));
  const canvas={clientWidth:1200,clientHeight:800},onFailure=vi.fn(),onChange=vi.fn(),setLayoutProperty=vi.fn(),off=vi.fn();
  let zoom=7,elevation=200,main=new Matrix4();
  const map={getCanvas:()=>canvas,getZoom:()=>zoom,isMoving:()=>false,queryTerrainElevation:()=>elevation,
   project:([lon,lat]:[number,number])=>{const at=MercatorCoordinate.fromLngLat([lon,lat],elevation),p=new Vector3(at.x,at.y,at.z).applyMatrix4(main);return {x:(p.x+1)*canvas.clientWidth/2,y:(1-p.y)*canvas.clientHeight/2};},
   queryRenderedFeatures:()=>[],getBounds:()=>({getWest:()=>117,getEast:()=>120,getSouth:()=>31,getNorth:()=>33}),
   triggerRepaint:vi.fn(),getLayer:()=>true,setLayoutProperty,on:vi.fn(),off};
  const layer=campaignLayer(()=>({world,selected:site.id,tilted:true}),onFailure,onChange);
  layer.onAdd!(map as unknown as AtlasMap,{} as WebGL2RenderingContext);
  const render=(pitch:number)=>{
   const at=MercatorCoordinate.fromLngLat([site.lon,site.lat],elevation),center=new Vector3(at.x-origin.x,origin.y-at.y,at.z);
   const view=new PerspectiveCamera(37,1.5,.00001,2),distance=.015;
   view.position.set(center.x,center.y-Math.sin(pitch*Math.PI/180)*distance,center.z+Math.cos(pitch*Math.PI/180)*distance);
   view.lookAt(center);view.updateMatrixWorld();main=view.projectionMatrix.clone().multiply(view.matrixWorldInverse).multiply(boundary.clone().invert());
   layer.render({} as WebGL2RenderingContext,{projectionMatrix:view.projectionMatrix.elements,defaultProjectionData:{mainMatrix:main.elements}} as unknown as CustomRenderMethodInput);
   return at;
  };
  try{
   for(const pitch of [0,44,60]){
    const at=render(pitch),draw=draws.frames.at(-1)!,root=draw.scene.children.find(o=>o instanceof Group&&o.userData.site===site.id)!;
    const foot=new Vector3().applyMatrix4(root.matrixWorld).applyMatrix4(boundary);
    expect(foot.distanceTo(new Vector3(at.x,at.y,at.z))).toBeLessThan(1e-12);
    expect(layer.siteAt({x:600,y:400})).toBe(site.id);expect(layer.showsSite(site.id)).toBe(true);
   }
   expect(onFailure).not.toHaveBeenCalled();expect(setLayoutProperty).toHaveBeenCalledTimes(1);
   zoom=4;render(0);expect(layer.showsSite(site.id)).toBe(false);expect(layer.siteAt({x:600,y:400})).toBeNull();
   expect(setLayoutProperty).toHaveBeenLastCalledWith('settlement-buildings','visibility','visible');
  }finally{layer.onRemove!(map as unknown as AtlasMap,{} as WebGL2RenderingContext);}
  expect(off).toHaveBeenCalledTimes(2);
 });
 it('restores the base city layer when an actual render fails and stops exposing stale model targets',()=>{
  const world=newCampaignWorld('xiao-yan'),setLayoutProperty=vi.fn(),onFailure=vi.fn();
  const map={getCanvas:()=>({clientWidth:1200,clientHeight:800}),getZoom:()=>7,isMoving:()=>false,queryTerrainElevation:()=>0,
   project:()=>({x:600,y:400}),getBounds:()=>({getWest:()=>117,getEast:()=>120,getSouth:()=>31,getNorth:()=>33}),queryRenderedFeatures:()=>[],
   on:vi.fn(),off:vi.fn(),getLayer:()=>true,setLayoutProperty,triggerRepaint:vi.fn()};
  const layer=campaignLayer(()=>({world,selected:'jiankang',tilted:false}),onFailure,()=>{});
  const args={projectionMatrix:new Matrix4().elements,defaultProjectionData:{mainMatrix:new Matrix4().elements}} as unknown as CustomRenderMethodInput;
  layer.onAdd!(map as unknown as AtlasMap,{} as WebGL2RenderingContext);
  try{
   layer.render({} as WebGL2RenderingContext,args);expect(setLayoutProperty).toHaveBeenLastCalledWith('settlement-buildings','visibility','none');
   draws.fail=true;layer.render({} as WebGL2RenderingContext,args);
   expect(onFailure).toHaveBeenCalledOnce();expect(layer.showsSite('jiankang')).toBe(false);expect(layer.siteAt({x:600,y:400})).toBeNull();
   expect(setLayoutProperty).toHaveBeenLastCalledWith('settlement-buildings','visibility','visible');
  }finally{layer.onRemove!(map as unknown as AtlasMap,{} as WebGL2RenderingContext);}
 });
});
