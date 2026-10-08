import {afterEach,describe,it,expect,vi} from 'vitest';
import {Camera,Group,Scene,Matrix4,Vector3,PerspectiveCamera} from 'three';
import {MercatorCoordinate,type Map as AtlasMap,type CustomRenderMethodInput} from 'maplibre-gl';
import {newCampaignWorld} from '../core/world';
import {siteById} from '../data/scenario';
import {campaignLayer} from './CampaignLayer';
import {loadCampaignSampleAssets} from './CampaignSampleAssets';
import {campaignCityAppearance} from './campaignScenery';
import {Mesh} from 'three';

// CPU contract test of projection, hit targets and fallback; no browser or UI automation.
const draws=vi.hoisted(()=>({frames:[] as {scene:Scene;camera:Camera}[],fail:false,assetFailure:false,onRender:()=>{}}));
vi.mock('three',async importOriginal=>{
 const actual=await importOriginal<typeof import('three')>();
 return {...actual,TextureLoader:class {load(_url:string,onLoad:(t:unknown)=>void){onLoad(new actual.Texture());}},WebGLRenderer:class {autoClear=true;toneMapping=0;toneMappingExposure=1;resetState(){}dispose(){}render(scene:Scene,camera:Camera){draws.onRender();if(draws.fail)throw new Error('render failed');scene.updateMatrixWorld(true);draws.frames.push({scene,camera});}}};
});
vi.mock('./CampaignSampleAssets',async importOriginal=>{
 const actual=await importOriginal<typeof import('./CampaignSampleAssets')>();
 return {...actual,loadCampaignSampleAssets:async()=>{
  if(draws.assetFailure)throw new Error('asset unavailable');
  // Node-only fixture I/O; keep Node declarations out of the browser TypeScript project.
  const filesystemModule='node:fs/promises';
  const {readFile}=await import(/* @vite-ignore */ filesystemModule) as {readFile(path:string):Promise<Uint8Array<ArrayBuffer>>};
  const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
  const names=['city','tree-0',...['market','granary','hostel'].flatMap(b=>[1,2,3].map(n=>b+'-'+n)),...['worksite-0','worksite-1','worksite-2']];
  const models=await Promise.all(names.map(async name=>{const b=await readFile('public/art/campaign/'+name+'.glb');return [name,(await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'' )).scene] as const;}));
  return actual.sampleCampaignAssets(new Map(models));
 }};
});
afterEach(()=>{draws.frames=[];draws.fail=false;draws.assetFailure=false;draws.onRender=()=>{};});

describe('campaign custom layer (CPU only)',()=>{
 it('uses local available terrain while other DEM tiles are loading instead of hiding all models',async()=>{
  const world=newCampaignWorld('xiao-yan'),onFailure=vi.fn(),setLayoutProperty=vi.fn();
  const map={getCanvas:()=>({clientWidth:1200,clientHeight:800}),getZoom:()=>7,isSourceLoaded:()=>false,queryTerrainElevation:()=>150,
   project:()=>({x:600,y:400}),queryRenderedFeatures:()=>[],on:vi.fn(),off:vi.fn(),getLayer:()=>true,setLayoutProperty,triggerRepaint:vi.fn()};
  const layer=campaignLayer(()=>({world,selected:'jiankang',tilted:true}),onFailure,()=>{}),args={projectionMatrix:new Matrix4().elements,defaultProjectionData:{mainMatrix:new Matrix4().elements}} as unknown as CustomRenderMethodInput;
  layer.onAdd!(map as unknown as AtlasMap,{} as WebGL2RenderingContext);
  await vi.waitFor(()=>expect(map.triggerRepaint).toHaveBeenCalled());
  try{layer.render({} as WebGL2RenderingContext,args);expect(layer.showsSite('jiankang')).toBe(true);expect(onFailure).not.toHaveBeenCalled();expect(setLayoutProperty).not.toHaveBeenCalled();}
  finally{layer.onRemove!(map as unknown as AtlasMap,{} as WebGL2RenderingContext);}
 });
 it('never reactivates retired legacy models during zoom, missing cities or layer removal',async()=>{
  const world=newCampaignWorld('xiao-yan'),setFilter=vi.fn(),onFailure=vi.fn();let zoom=7;
  const setLayoutProperty=vi.fn();
  const map={getCanvas:()=>({clientWidth:1200,clientHeight:800}),getZoom:()=>zoom,queryTerrainElevation:()=>0,
   project:([lon]:[number,number])=>({x:lon===siteById.jiankang.lon?600:lon===siteById.jingkou.lon?610:10000,y:400}),queryRenderedFeatures:()=>[],on:vi.fn(),off:vi.fn(),getLayer:()=>true,setFilter,setLayoutProperty,triggerRepaint:vi.fn()};
  const layer=campaignLayer(()=>({world,selected:'jiankang',tilted:false}),onFailure,()=>{}),args={projectionMatrix:new Matrix4().elements,defaultProjectionData:{mainMatrix:new Matrix4().elements}} as unknown as CustomRenderMethodInput;
  layer.onAdd!(map as unknown as AtlasMap,{} as WebGL2RenderingContext);
  await vi.waitFor(()=>expect(map.triggerRepaint).toHaveBeenCalled());draws.onRender=()=>{expect(setLayoutProperty).not.toHaveBeenCalled();expect(setFilter).not.toHaveBeenCalled();};
  try{
   layer.render({} as WebGL2RenderingContext,args);expect(layer.showsSite('jiankang')).toBe(true);expect(layer.showsSite('jingkou')).toBe(false);expect(setLayoutProperty).not.toHaveBeenCalled();
   for(const value of [6.3,6.1,7,4,7]){zoom=value;layer.render({} as WebGL2RenderingContext,args);}expect(setFilter).not.toHaveBeenCalled();expect(onFailure).not.toHaveBeenCalled();
  }finally{layer.onRemove!(map as unknown as AtlasMap,{} as WebGL2RenderingContext);}
  expect(setLayoutProperty).not.toHaveBeenCalled();
 });
 it('keeps city labels while local DEM is missing and recovers without legacy geometry',async()=>{
  const world=newCampaignWorld('xiao-yan'),setFilter=vi.fn(),setLayoutProperty=vi.fn(),onFailure=vi.fn();let loaded=false;
  const map={getCanvas:()=>({clientWidth:1200,clientHeight:800}),getZoom:()=>7,isSourceLoaded:()=>loaded,queryTerrainElevation:()=>loaded?200:null,
   project:()=>({x:600,y:400}),queryRenderedFeatures:()=>[],on:vi.fn(),off:vi.fn(),getLayer:()=>true,setFilter,setLayoutProperty,triggerRepaint:vi.fn()};
  const layer=campaignLayer(()=>({world,selected:'jiankang',tilted:true}),onFailure,()=>{}),args={projectionMatrix:new Matrix4().elements,defaultProjectionData:{mainMatrix:new Matrix4().elements}} as unknown as CustomRenderMethodInput;
  layer.onAdd!(map as unknown as AtlasMap,{} as WebGL2RenderingContext);
  await vi.waitFor(()=>expect(map.triggerRepaint).toHaveBeenCalled());
  try{
   layer.render({} as WebGL2RenderingContext,args);expect(layer.showsSite('jiankang')).toBe(false);expect(setLayoutProperty).not.toHaveBeenCalled();
   loaded=true;layer.render({} as WebGL2RenderingContext,args);expect(layer.showsSite('jiankang')).toBe(true);
   loaded=false;layer.render({} as WebGL2RenderingContext,args);expect(layer.showsSite('jiankang')).toBe(false);expect(setLayoutProperty).not.toHaveBeenCalled();expect(onFailure).not.toHaveBeenCalled();
  }finally{layer.onRemove!(map as unknown as AtlasMap,{} as WebGL2RenderingContext);}
 });
 it('keeps the settlement at its actual geographic anchor and makes the rendered model clickable across cameras',async()=>{
  const world=newCampaignWorld('xiao-yan'),site=siteById.jiankang,origin=MercatorCoordinate.fromLngLat([110,32]);
  const boundary=new Matrix4().makeTranslation(origin.x,origin.y,0).scale(new Vector3(1,-1,1));
  const canvas={clientWidth:1200,clientHeight:800},onFailure=vi.fn(),onChange=vi.fn(),setFilter=vi.fn(),setLayoutProperty=vi.fn(),off=vi.fn();
  let zoom=7,elevation=200,main=new Matrix4();
  const map={getCanvas:()=>canvas,getZoom:()=>zoom,isSourceLoaded:()=>true,isMoving:()=>false,queryTerrainElevation:()=>elevation,
   project:([lon,lat]:[number,number])=>{const at=MercatorCoordinate.fromLngLat([lon,lat],elevation),p=new Vector3(at.x,at.y,at.z).applyMatrix4(main);return {x:(p.x+1)*canvas.clientWidth/2,y:(1-p.y)*canvas.clientHeight/2};},
   queryRenderedFeatures:()=>[],getBounds:()=>({getWest:()=>117,getEast:()=>120,getSouth:()=>31,getNorth:()=>33}),
   triggerRepaint:vi.fn(),getLayer:()=>true,setFilter,setLayoutProperty,on:vi.fn(),off};
  const layer=campaignLayer(()=>({world,selected:site.id,tilted:true}),onFailure,onChange);
  layer.onAdd!(map as unknown as AtlasMap,{} as WebGL2RenderingContext);
  await vi.waitFor(()=>expect(map.triggerRepaint).toHaveBeenCalled());
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
   expect(onFailure).not.toHaveBeenCalled();expect(setFilter).not.toHaveBeenCalled();expect(setLayoutProperty).not.toHaveBeenCalled();
   zoom=4;render(0);expect(layer.showsSite(site.id)).toBe(false);expect(layer.siteAt({x:600,y:400})).toBeNull();
   expect(setLayoutProperty).not.toHaveBeenCalled();
  }finally{layer.onRemove!(map as unknown as AtlasMap,{} as WebGL2RenderingContext);}
  expect(off).toHaveBeenCalledTimes(2);
 });
 it('keeps marker fallback without resurrecting retired models when rendering fails',async()=>{
  const world=newCampaignWorld('xiao-yan'),setFilter=vi.fn(),setLayoutProperty=vi.fn(),onFailure=vi.fn();
  const map={getCanvas:()=>({clientWidth:1200,clientHeight:800}),getZoom:()=>7,isMoving:()=>false,queryTerrainElevation:()=>0,
   project:()=>({x:600,y:400}),getBounds:()=>({getWest:()=>117,getEast:()=>120,getSouth:()=>31,getNorth:()=>33}),queryRenderedFeatures:()=>[],
   on:vi.fn(),off:vi.fn(),getLayer:()=>true,setFilter,setLayoutProperty,triggerRepaint:vi.fn()};
  const layer=campaignLayer(()=>({world,selected:'jiankang',tilted:false}),onFailure,()=>{});
  const args={projectionMatrix:new Matrix4().elements,defaultProjectionData:{mainMatrix:new Matrix4().elements}} as unknown as CustomRenderMethodInput;
  layer.onAdd!(map as unknown as AtlasMap,{} as WebGL2RenderingContext);
  await vi.waitFor(()=>expect(map.triggerRepaint).toHaveBeenCalled());
  try{
   layer.render({} as WebGL2RenderingContext,args);expect(setLayoutProperty).not.toHaveBeenCalled();
   draws.fail=true;layer.render({} as WebGL2RenderingContext,args);
   expect(onFailure).toHaveBeenCalledOnce();expect(layer.showsSite('jiankang')).toBe(false);expect(layer.siteAt({x:600,y:400})).toBeNull();
   expect(setLayoutProperty).not.toHaveBeenCalled();
  }finally{layer.onRemove!(map as unknown as AtlasMap,{} as WebGL2RenderingContext);}
 });
});

it('assembles actual Blender modules from authoritative building levels and shares cached geometry',async()=>{
 const assets=await loadCampaignSampleAssets(),a=campaignCityAppearance(newCampaignWorld('xiao-yan'),siteById.jiankang);
 try{
  const empty=assets.city({...a,levels:[0,0,0],project:-1}),built=assets.city({...a,levels:[3,3,3],project:-1}),upgrade=assets.city({...a,levels:[3,3,3],project:0,progress:2});
  const geometry=(root:Group)=>(root.children[0] as Mesh).geometry;
  expect(geometry(built).getAttribute('position').count).toBeGreaterThan(geometry(empty).getAttribute('position').count);
  expect(geometry(upgrade).getAttribute('position').count).toBeGreaterThan(geometry(built).getAttribute('position').count);
  expect(geometry(built)).toBe(geometry(assets.city({...a,levels:[3,3,3],project:-1})));
  expect(geometry(built).index).not.toBeNull();
 }finally{assets.dispose();}
});
it('reports asset failure and leaves city markers available without constructing old city models',async()=>{
 draws.assetFailure=true;const onFailure=vi.fn();
 const map={getCanvas:()=>({clientWidth:1000,clientHeight:700}),on:vi.fn(),off:vi.fn(),triggerRepaint:vi.fn(),getZoom:()=>8};
 const layer=campaignLayer(()=>({world:newCampaignWorld('xiao-yan'),selected:'jiankang',tilted:true}),onFailure,()=>{});
 layer.onAdd!(map as unknown as AtlasMap,{} as WebGL2RenderingContext);
 try{await vi.waitFor(()=>expect(onFailure).toHaveBeenCalledOnce());expect(layer.showsSite('jiankang')).toBe(false);expect(draws.frames).toHaveLength(0);}finally{layer.onRemove!(map as unknown as AtlasMap,{} as WebGL2RenderingContext);}
});
