import {afterEach,describe,expect,it,vi} from 'vitest';
import {Camera,Group,Matrix4,PerspectiveCamera,Scene,Texture,TextureLoader,Vector3} from 'three';
import {MercatorCoordinate,type CustomRenderMethodInput,type Map as AtlasMap} from 'maplibre-gl';
import {act,newCampaignWorld} from '../core/world';
import {armyMapPosition} from './armyMapPresentation';
import {militaryLayer} from './MilitaryLayer';

const draws=vi.hoisted(()=>({frames:[] as {scene:Scene;camera:Camera}[]}));
vi.mock('three',async importOriginal=>{
 const actual=await importOriginal<typeof import('three')>();
 return {...actual,WebGLRenderer:class {autoClear=true;toneMapping=0;toneMappingExposure=1;resetState(){}dispose(){}render(scene:Scene,camera:Camera){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);draws.frames.push({scene,camera});}}};
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();draws.frames.length=0;});

describe('military layer geographic anchoring (CPU integration, no GPU or UI)',()=>{
 it('ignores layout displacement and follows only the actual army coordinate over successive camera frames',()=>{
  vi.spyOn(TextureLoader.prototype,'load').mockImplementation(()=>new Texture());vi.stubGlobal('document',{createElement:()=>({width:128,height:128,getContext:()=>({createRadialGradient:()=>({addColorStop:()=>{}}),fillRect:()=>{}})})});
  const world=newCampaignWorld('xiao-yan',undefined,'sandbox');world.realm!.cities.jiankang.grain=1000;act(world,{type:'recruitmentPlan',entries:[{site:'jiankang',kind:'shield',service:'levy',count:1}]});const a=world.realm!.armies[0];expect(a.id).toBeGreaterThan(0);world.realm!.armies=[a];
  const canvas={clientWidth:1200},origin=MercatorCoordinate.fromLngLat([110,32]),boundary=new Matrix4().makeTranslation(origin.x,origin.y,0).scale(new Vector3(1,-1,1)),onFailure=vi.fn(),onReady=vi.fn();
  let zoom=8,elevation=120;const project=vi.fn(()=>{throw new Error('A model must not read screen placement');}),unproject=vi.fn(()=>{throw new Error('A model must not derive a new location from a screen placement');}),map={getCanvas:()=>canvas,getZoom:()=>zoom,queryTerrainElevation:()=>elevation,project,unproject,triggerRepaint:vi.fn()};
  const layer=militaryLayer(()=>({world,militaryModels:true,armyMotion:false}),onFailure,onReady,()=>({model:true,offset:{x:900,y:-300},bounds:{left:0,right:192,top:0,bottom:312}}));
  layer.onAdd!(map as unknown as AtlasMap,{} as WebGL2RenderingContext);expect(onReady).toHaveBeenCalledOnce();
  try{
   for(const frame of [{zoom:6.5,pitch:0,pan:0,width:1200,elevation:0},{zoom:8,pitch:38,pan:.005,width:900,elevation:120},{zoom:10,pitch:60,pan:-.002,width:1600,elevation:240},{zoom:8,pitch:38,pan:0,width:1200,elevation:120}]){
    zoom=frame.zoom;elevation=frame.elevation;canvas.clientWidth=frame.width;const pos=armyMapPosition(a),at=MercatorCoordinate.fromLngLat([pos.lon,pos.lat],elevation),center=new Vector3(at.x-origin.x,origin.y-at.y,at.z),distance=.05*2**(8-zoom),camera=new PerspectiveCamera(37,1.5,.00001,2);camera.position.set(center.x+frame.pan,center.y-Math.sin(frame.pitch*Math.PI/180)*distance,center.z+Math.cos(frame.pitch*Math.PI/180)*distance);camera.lookAt(center.x+frame.pan,center.y,center.z);camera.updateMatrixWorld();
    const main=camera.projectionMatrix.clone().multiply(camera.matrixWorldInverse).multiply(boundary.clone().invert());layer.render!({} as WebGL2RenderingContext,{projectionMatrix:camera.projectionMatrix.elements,defaultProjectionData:{mainMatrix:main.elements}} as unknown as CustomRenderMethodInput);
    expect(onFailure).not.toHaveBeenCalled();const draw=draws.frames.at(-1)!,root=draw.scene.children.find(object=>object instanceof Group&&object.visible)!;
    const foot=new Vector3().applyMatrix4(root.matrixWorld).applyMatrix4(boundary);expect(foot.distanceTo(new Vector3(at.x,at.y,at.z))).toBeLessThan(1e-12);
    const expected=new Vector3(at.x,at.y,at.z).applyMatrix4(main),actual=new Vector3().applyMatrix4(root.matrixWorld).applyMatrix4(draw.camera.matrixWorldInverse).applyMatrix4(draw.camera.projectionMatrix);expect(actual.distanceTo(expected)).toBeLessThan(1e-8);
   }
   expect(draws.frames).toHaveLength(4);expect(project).not.toHaveBeenCalled();expect(unproject).not.toHaveBeenCalled();
  }finally{layer.onRemove!(map as unknown as AtlasMap,{} as WebGL2RenderingContext);}
 });
});
