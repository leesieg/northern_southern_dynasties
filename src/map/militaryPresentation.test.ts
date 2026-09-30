import {afterEach,describe,expect,it,vi} from 'vitest';
import {Box3,Camera,Color,DirectionalLight,HemisphereLight,Matrix4,MeshStandardMaterial,PerspectiveCamera,Scene,Texture,TextureLoader,Vector3} from 'three';
import {ARMY_MODEL_PIXELS,armyMapPosition,armyMarkerFootprint,armyShowsModel,layoutArmyMarkers,screenOverlap,type ScreenRect} from './armyMapPresentation';
import {addMilitaryLighting,militaryModelScale,militarySurfaceMaterial,updateMilitaryCamera} from './militaryRendering';
import {animateMilitaryModel,militaryModelAssets} from './MilitaryModels';
import type {Army} from '../core/realm';

const viewport={width:1200,height:800},anchor={x:600,y:400};
const army=(id=1):Army=>({id,realm:'liang',location:'jiankang',troops:800,morale:80,supply:500,siege:0,journey:null});
const inViewport=(r:ScreenRect)=>{expect(r.left).toBeGreaterThanOrEqual(8);expect(r.top).toBeGreaterThanOrEqual(8);expect(r.right).toBeLessThanOrEqual(viewport.width-8);expect(r.bottom).toBeLessThanOrEqual(viewport.height-8);};
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});

describe('army map collision placement (no UI)',()=>{
 it('keeps an unobstructed model at its actual anchor',()=>{const p=layoutArmyMarkers([{key:'1',point:anchor}],[],viewport,true).get('1')!;expect(p.model).toBe(true);expect(p.offset).toEqual({x:0,y:0});});
 it('avoids estate, city, activity and traveler rectangles without changing their positions',()=>{
  const obstacles=[{left:579,right:621,top:299,bottom:351},{left:560,right:640,top:365,bottom:396},{left:618,right:654,top:354,bottom:385},{left:662,right:711,top:390,bottom:452}],before=structuredClone(obstacles);
  const p=layoutArmyMarkers([{key:'1',point:anchor}],obstacles,viewport,true).get('1')!;
  expect(p.model).toBe(true);expect(p.offset).not.toEqual({x:0,y:0});for(const obstacle of obstacles)expect(screenOverlap(p.bounds,obstacle)).toBe(0);inViewport(p.bounds);expect(obstacles).toEqual(before);
 });
 it('separates same-location armies and nearby armies deterministically',()=>{
  const entries=Array.from({length:6},(_,i)=>({key:String(i),point:{x:600+(i%2)*20,y:400}})),first=layoutArmyMarkers(entries,[],viewport,true);
  expect(first.size).toBe(6);expect(layoutArmyMarkers(entries,[],viewport,true)).toEqual(first);
  for(const [id,a] of first){inViewport(a.bounds);for(const [other,b] of first)if(id!==other)expect(screenOverlap(a.bounds,b.bounds)).toBe(0);}
 });
 it('fits a visible edge unit within the viewport and does not pull offscreen units onto the map',()=>{
  const p=layoutArmyMarkers([{key:'edge',point:{x:8,y:8}},{key:'outside',point:{x:-30,y:400}}],[],viewport,true);
  expect(p.has('outside')).toBe(false);inViewport(p.get('edge')!.bounds);
 });
 it('falls back to a card if the available viewport cannot fit a model',()=>{
  const p=layoutArmyMarkers([{key:'1',point:{x:200,y:100}}],[],{width:400,height:180},true).get('1')!;expect(p.model).toBe(false);expect(p.bounds.bottom-p.bounds.top).toBe(armyMarkerFootprint(false).height);
 });
 it('keeps card mode and model failure operable using the same obstacle rules',()=>{
  const obstacle={left:570,right:670,top:380,bottom:490},p=layoutArmyMarkers([{key:'1',point:anchor}],[obstacle],viewport,armyShowsModel(8,false)).get('1')!;
  expect(p.model).toBe(false);expect(screenOverlap(p.bounds,obstacle)).toBe(0);expect(armyShowsModel(6.49,true)).toBe(false);expect(armyShowsModel(6.5,true)).toBe(true);
 });
 it('does not let crowded fallback cards cover a model',()=>{
  const entries=Array.from({length:22},(_,i)=>({key:String(i),point:anchor})),placements=layoutArmyMarkers(entries,[],{width:680,height:440},true);
  expect(placements.size).toBe(22);for(const a of placements.values())for(const b of placements.values())if(a!==b&&(a.model||b.model))expect(screenOverlap(a.bounds,b.bounds)).toBe(0);
 });
 it('changes only presentation, leaving the actual journey and order origin intact',()=>{
  const a=army();a.journey={route:['jiankang','jingkou'],durations:[4],leg:0,elapsed:2,started:0};const before=structuredClone(a),at=armyMapPosition(a);
  layoutArmyMarkers([{key:'1',point:anchor}],[{left:500,right:700,top:200,bottom:450}],viewport,true);expect(a).toEqual(before);expect(armyMapPosition(a)).toEqual(at);expect(at.lon).toBeGreaterThan(118.78);
 });
});

describe('army camera and material contracts (no GPU or UI)',()=>{
 it.each([0,38,60])('preserves map projection while using the real camera at pitch %s',pitch=>{
  const mapCamera=new PerspectiveCamera(37,1.5,.01,20);mapCamera.position.set(.14,Math.sin(pitch*Math.PI/180)*.8,.8*Math.cos(pitch*Math.PI/180));mapCamera.lookAt(.02,0,0);mapCamera.updateMatrixWorld();
  const anchorMatrix=new Matrix4().makeTranslation(.03,.04,0),main=new Matrix4().multiplyMatrices(mapCamera.projectionMatrix,mapCamera.matrixWorldInverse),camera=new Camera();
  updateMilitaryCamera(camera,mapCamera.projectionMatrix.elements,main.elements,anchorMatrix);
  const point=new Vector3(.01,.02,.05),mapClip=point.clone().applyMatrix4(anchorMatrix).applyMatrix4(mapCamera.matrixWorldInverse).applyMatrix4(mapCamera.projectionMatrix),armyClip=point.clone().applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix);
  expect(armyClip.distanceTo(mapClip)).toBeLessThan(1e-10);expect(new Vector3().setFromMatrixPosition(camera.matrixWorld).distanceTo(mapCamera.position.clone().sub(new Vector3(.03,.04,0)))).toBeLessThan(1e-10);
  camera.updateMatrixWorld();expect(point.clone().applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix).distanceTo(mapClip)).toBeLessThan(1e-10);
 });
 it('uses painted color without treating it as height data, and retains diffuse iron and bronze',()=>{
  const texture=new Texture(),iron=militarySurfaceMaterial('#ecebe1',texture,.20),bronze=militarySurfaceMaterial('#fff0c6',texture,.32);
  for(const material of [iron,bronze]){expect(material.map).toBe(texture);expect(material.bumpMap).toBeNull();expect(material.normalMap).toBeNull();expect(material.metalness).toBeLessThan(.4);expect(material.roughness).toBeGreaterThan(.65);expect(material.color.r).toBeGreaterThan(.8);material.dispose();}texture.dispose();
 });
 it('cancels Mercator handedness at the scene boundary, without inverted front-face normals',()=>{
  const realCamera=new PerspectiveCamera(37,1.5,.01,20);realCamera.position.set(0,-.3,.8);realCamera.lookAt(0,0,0);realCamera.updateMatrixWorld();
  const origin=new Vector3(.8,.4,0),sceneToMercator=new Matrix4().makeTranslation(origin.x,origin.y,0).scale(new Vector3(1,-1,1)),main=realCamera.projectionMatrix.clone().multiply(realCamera.matrixWorldInverse).multiply(sceneToMercator.clone().invert()),camera=new Camera();
  updateMilitaryCamera(camera,realCamera.projectionMatrix.elements,main.elements,sceneToMercator);
  expect(camera.matrixWorldInverse.determinant()).toBeGreaterThan(0);
  const at=new Vector3(.82,.43,.001),scale=.001,newModel=new Matrix4().makeTranslation(at.x-origin.x,origin.y-at.y,at.z).scale(new Vector3(scale,scale,scale)).multiply(new Matrix4().makeRotationX(Math.PI/2)),oldModel=new Matrix4().makeTranslation(at.x,at.y,at.z).scale(new Vector3(scale,-scale,scale)).multiply(new Matrix4().makeRotationX(Math.PI/2));
  expect(newModel.determinant()).toBeGreaterThan(0);
  const vertex=new Vector3(.1,1.6,.2),before=vertex.clone().applyMatrix4(oldModel).applyMatrix4(main),after=vertex.clone().applyMatrix4(newModel).applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix);
  expect(after.distanceTo(before)).toBeLessThan(1e-10);
 });
 it('keeps a screen unit stable at different depths and terrain elevations',()=>{
  const camera=new PerspectiveCamera(37,1.5,1,4000);camera.position.set(0,-500,1000);camera.lookAt(0,0,0);camera.updateMatrixWorld();const main=camera.projectionMatrix.clone().multiply(camera.matrixWorldInverse);
  for(const at of [new Vector3(0,0,0),new Vector3(200,-300,140),new Vector3(-200,300,0)]){
   const scale=militaryModelScale(main.elements,at,1350,72),from=at.clone().applyMatrix4(main),to=at.clone().add(new Vector3(scale,0,0)).applyMatrix4(main);expect((to.x-from.x)*1350/2).toBeCloseTo(72,8);expect(Number.isFinite(scale)).toBe(true);expect(scale).toBeGreaterThan(0);
  }
 });
 it('lights both sides of upright units in Mercator coordinates',()=>{
  const scene=new Scene();addMilitaryLighting(scene);scene.updateMatrixWorld();const sky=scene.children.find(light=>light instanceof HemisphereLight) as HemisphereLight;
  expect(sky.position).toEqual(new Vector3(0,0,1));expect(new Color(sky.groundColor).getHex()).not.toBe(0);
  const lights=scene.children.filter(light=>light instanceof DirectionalLight) as DirectionalLight[];
  for(const normal of [new Vector3(1,0,0),new Vector3(-1,0,0),new Vector3(0,1,0),new Vector3(0,-1,0),new Vector3(0,0,1)])expect(lights.reduce((sum,light)=>sum+Math.max(0,normal.dot(light.position.clone().normalize()))*light.intensity,0)).toBeGreaterThan(.35);
 });
 it.each(['foot','horse','siege'] as const)('contains the %s miniature inside its reserved target across headings and pitches',kind=>{
  vi.spyOn(TextureLoader.prototype,'load').mockImplementation(()=>new Texture());
  vi.stubGlobal('document',{createElement:()=>({width:128,height:128,getContext:()=>({createRadialGradient:()=>({addColorStop:()=>{}}),fillRect:()=>{}})})});
  const assets=militaryModelAssets(()=>{},()=>{}),model=assets.create(army(),kind,'梁'),size=armyMarkerFootprint(true),extent={width:0,above:0,below:0};
  try{
   for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2])for(const pitch of [0,38,60])for(const height of [600,900]){
    const camera=new PerspectiveCamera(37,1.5,1,4000),distance=height/(2*Math.tan(37*Math.PI/360));camera.up.set(0,1,0);camera.position.set(0,-Math.sin(pitch*Math.PI/180)*distance,Math.cos(pitch*Math.PI/180)*distance);camera.lookAt(0,0,0);camera.updateMatrixWorld();
    const main=camera.projectionMatrix.clone().multiply(camera.matrixWorldInverse),scale=militaryModelScale(main.elements,new Vector3(),height*1.5,ARMY_MODEL_PIXELS);
    animateMilitaryModel(model,'marching',1,true);model.body.rotation.y=heading;model.root.matrix.makeScale(scale,scale,scale).multiply(new Matrix4().makeRotationX(Math.PI/2));model.root.updateMatrixWorld(true);const bounds=new Box3().setFromObject(model.root);
    for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
     const p=new Vector3(x,y,z).project(camera),screen={x:p.x*height*1.5/2,y:-p.y*height/2};extent.width=Math.max(extent.width,Math.abs(screen.x)*2);extent.above=Math.max(extent.above,-screen.y);extent.below=Math.max(extent.below,screen.y);
    }
   }
   expect(extent.width,JSON.stringify(extent)).toBeLessThanOrEqual(size.width);expect(extent.above,JSON.stringify(extent)).toBeLessThanOrEqual(size.height-size.bottom);expect(extent.below,JSON.stringify(extent)).toBeLessThanOrEqual(size.bottom);
   model.root.traverse(object=>{if('material' in object){const material=object.material;if(material instanceof MeshStandardMaterial)expect(material.bumpMap).toBeNull();}});
  }finally{assets.dispose();}
 });
});
