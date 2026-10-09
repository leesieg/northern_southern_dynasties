import {afterEach,beforeAll,describe,expect,it,vi} from 'vitest';
import {Box3,Camera,Color,DirectionalLight,FogExp2,HemisphereLight,Matrix4,MeshStandardMaterial,PerspectiveCamera,Scene,Texture,TextureLoader,Vector3} from 'three';
import {ARMY_MODEL_PIXELS,anchoredArmyModels,armyMapPosition,armyMarkerFootprint,armyModelBadgeBottom,armyShowsModel,dockMapMarker,layoutArmyCards,screenOverlap,type ScreenRect} from './armyMapPresentation';
import {addMilitaryLighting,militaryModelScale,militarySurfaceMaterial,positionMilitaryModel,updateMilitaryCamera} from './militaryRendering';
import {animateMilitaryModel,militaryModelAssets} from './MilitaryModels';
import type {Army} from '../core/realm';
import {GLTFLoader,type GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {readInfantryTestAsset} from './infantryAsset.testSupport';
let infantry:GLTF,lightHorse:GLTF,heavyHorse:GLTF;
beforeAll(async()=>{[infantry,lightHorse,heavyHorse]=await Promise.all(['infantry-rigged-v1.glb','light-cavalry-v1.glb','heavy-cavalry-v1.glb'].map(readInfantryTestAsset));});

const viewport={width:1200,height:800},anchor={x:600,y:400};
const army=(id=1):Army=>({id,realm:'liang',location:'jiankang',troops:800,morale:80,supply:500,siege:0,journey:null});
const inViewport=(r:ScreenRect)=>{expect(r.left).toBeGreaterThanOrEqual(8);expect(r.top).toBeGreaterThanOrEqual(8);expect(r.right).toBeLessThanOrEqual(viewport.width-8);expect(r.bottom).toBeLessThanOrEqual(viewport.height-8);};
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});

describe('anchored models and map annotations (no UI)',()=>{
 const entries=[{key:'2',point:anchor,position:{lon:118.78,lat:32.04}},{key:'1',point:anchor,position:{lon:118.78,lat:32.04}}];
 it('keeps a model exactly at the anchor through pan, zoom and viewport changes',()=>{
  for(const point of [anchor,{x:8,y:8},{x:1195,y:798},{x:300,y:110}])for(const view of [viewport,{width:900,height:650}]){
   const p=anchoredArmyModels([{...entries[0],point}],[],view).get('2');if(p){expect(p.offset).toEqual({x:0,y:0});expect((p.bounds.left+p.bounds.right)/2).toBe(point.x);expect(p.bounds.bottom-armyMarkerFootprint(true).bottom).toBe(point.y);}
  }
 });
 it('does not push an edge model inward or pull an offscreen model onto the map',()=>{
  const edge=anchoredArmyModels([{...entries[0],point:{x:8,y:8}}],[],viewport).get('2')!;expect(edge.bounds.left).toBeLessThan(0);expect(edge.bounds.top).toBeLessThan(0);expect(edge.offset).toEqual({x:0,y:0});expect(anchoredArmyModels([{...entries[0],point:{x:-500,y:400}}],[],viewport).size).toBe(0);
 });
 it('uses a deterministic same-location representative and switches selection without changing position',()=>{
  const before=structuredClone(entries),first=anchoredArmyModels(entries,[],viewport),selected=anchoredArmyModels(entries,['2'],viewport);
  expect(first.size).toBe(1);expect(first.has('1')).toBe(true);expect(anchoredArmyModels([...entries].reverse(),[],viewport)).toEqual(first);expect(selected.has('2')).toBe(true);expect(first.get('1')).toEqual(selected.get('2'));expect(entries).toEqual(before);
 });
 it('reduces density instead of displacing nearby models, giving the selected army priority',()=>{
  const other={key:'3',point:{x:620,y:400},position:{lon:118.98,lat:32.04}},p=anchoredArmyModels([...entries,other],[],viewport),selected=anchoredArmyModels([...entries,other],['3'],viewport);expect(p.size).toBe(1);expect(p.has('1')).toBe(true);expect(selected.has('3')).toBe(true);for(const item of [...p.values(),...selected.values()])expect(item.offset).toEqual({x:0,y:0});
 });
 it('moves estate, city, activity and traveler annotations rather than moving a model',()=>{
  const obstacles=[{left:579,right:621,top:299,bottom:351},{left:560,right:640,top:365,bottom:396},{left:618,right:654,top:354,bottom:385},{left:662,right:711,top:390,bottom:452}],before=structuredClone(obstacles);
  const p=anchoredArmyModels(entries,[],viewport).get('1')!,placed:ScreenRect[]=[];
  for(const obstacle of obstacles){const dock=dockMapMarker(obstacle,[p.bounds],placed);expect(screenOverlap(dock.bounds,p.bounds)).toBe(0);placed.push(dock.bounds);}expect(p.offset).toEqual({x:0,y:0});expect(obstacles).toEqual(before);
 });
 it('keeps annotation docking stable when the whole map pans',()=>{
  const rect={left:575,right:625,top:300,bottom:350},bounds=anchoredArmyModels(entries,[],viewport).get('1')!.bounds,dock=dockMapMarker(rect,[bounds],[]),translate=(r:ScreenRect)=>({left:r.left+40,right:r.right+40,top:r.top-30,bottom:r.bottom-30});expect(dockMapMarker(translate(rect),[translate(bounds)],[]).offset).toEqual(dock.offset);
 });
 it('leaves unrelated annotations at their established positions',()=>{const rect={left:20,right:70,top:20,bottom:45},bounds=anchoredArmyModels(entries,[],viewport).get('1')!.bounds;expect(dockMapMarker(rect,[bounds],[]).offset).toEqual({x:0,y:0});});
});

describe('army card collision placement (no UI)',()=>{
 it('keeps an unobstructed card at its anchor',()=>{const p=layoutArmyCards([{key:'1',point:anchor}],[],viewport).get('1')!;expect(p.model).toBe(false);expect(p.offset).toEqual({x:0,y:0});});
 it('separates same-location cards and nearby cards deterministically',()=>{
  const entries=Array.from({length:6},(_,i)=>({key:String(i),point:{x:600+(i%2)*20,y:400}})),first=layoutArmyCards(entries,[],viewport);
  expect(first.size).toBe(6);expect(layoutArmyCards(entries,[],viewport)).toEqual(first);
  for(const [id,a] of first){inViewport(a.bounds);for(const [other,b] of first)if(id!==other)expect(screenOverlap(a.bounds,b.bounds)).toBe(0);}
 });
 it('fits a visible edge unit within the viewport and does not pull offscreen units onto the map',()=>{
  const p=layoutArmyCards([{key:'edge',point:{x:8,y:8}},{key:'outside',point:{x:-30,y:400}}],[],viewport);
  expect(p.has('outside')).toBe(false);inViewport(p.get('edge')!.bounds);
 });
 it('fits a card in a short viewport',()=>{
  const p=layoutArmyCards([{key:'1',point:{x:200,y:100}}],[],{width:400,height:180}).get('1')!;expect(p.model).toBe(false);expect(p.bounds.bottom-p.bounds.top).toBe(armyMarkerFootprint(false).height);
 });
 it('keeps card mode and model failure operable using the same obstacle rules',()=>{
  const obstacle={left:570,right:670,top:380,bottom:490},p=layoutArmyCards([{key:'1',point:anchor}],[obstacle],viewport).get('1')!;
  expect(p.model).toBe(false);expect(screenOverlap(p.bounds,obstacle)).toBe(0);expect(armyShowsModel(6.49,true)).toBe(false);expect(armyShowsModel(6.5,true)).toBe(true);
  expect(armyShowsModel(8,false)).toBe(false);
 });
 it('does not let crowded fallback cards cover a model',()=>{
  const bounds={left:245,right:437,top:0,bottom:312},entries=Array.from({length:22},(_,i)=>({key:String(i),point:{x:340,y:220}})),placements=layoutArmyCards(entries,[bounds],{width:680,height:440});
  expect(placements.size).toBe(22);for(const a of placements.values())expect(screenOverlap(a.bounds,bounds)).toBe(0);
 });
 it('changes only presentation, leaving the actual journey and order origin intact',()=>{
  const a=army();a.journey={route:['jiankang','jingkou'],durations:[4],leg:0,elapsed:2,started:0};const before=structuredClone(a),at=armyMapPosition(a);
  layoutArmyCards([{key:'1',point:anchor}],[{left:500,right:700,top:200,bottom:450}],viewport);expect(a).toEqual(before);expect(armyMapPosition(a)).toEqual(at);expect(at.lon).toBeGreaterThan(118.78);
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
  const at=new Vector3(.82,.43,.001),scale=.001,newModel=positionMilitaryModel(new Matrix4(),at,origin,scale),oldModel=new Matrix4().makeTranslation(at.x,at.y,at.z).scale(new Vector3(scale,-scale,scale)).multiply(new Matrix4().makeRotationX(Math.PI/2));
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
 it('keeps building color visible when the real map view reports camera depth in pixels',()=>{
  const scene=new Scene();addMilitaryLighting(scene);const fog=scene.fog as FogExp2;
  const view=new PerspectiveCamera(37,1.5,1,10000);view.position.set(0,-800,1000);view.lookAt(0,0,0);view.updateMatrixWorld();
  const pixels=new Matrix4().makeScale(512*2**11,512*2**11,512*2**11),anchor=new Matrix4(),main=view.projectionMatrix.clone().multiply(view.matrixWorldInverse).multiply(pixels),camera=new Camera();
  updateMilitaryCamera(camera,view.projectionMatrix.elements,main.elements,anchor);
  const depth=-new Vector3(0,0,0).applyMatrix4(camera.matrixWorldInverse).z,factor=1-Math.exp(-(fog.density**2*depth**2));
  expect(depth).toBeGreaterThan(1000);expect(factor).toBeGreaterThan(0);expect(factor).toBeLessThan(.1);
 });
 it.each(['foot','lightHorse','heavyHorse','siege'] as const)('contains the %s miniature inside its reserved target across headings and pitches',async kind=>{
  vi.spyOn(GLTFLoader.prototype,'loadAsync').mockImplementation(async url=>String(url).includes('light-cavalry')?lightHorse:String(url).includes('heavy-cavalry')?heavyHorse:infantry);
  vi.spyOn(TextureLoader.prototype,'load').mockImplementation(()=>new Texture());
  vi.stubGlobal('document',{createElement:()=>({width:128,height:128,getContext:()=>({createRadialGradient:()=>({addColorStop:()=>{}}),fillRect:()=>{}})})});
  const assets=militaryModelAssets(()=>{},()=>{}),model=assets.create(army(),kind,'梁'),size=armyMarkerFootprint(true),extent={width:0,above:0,below:0};
  await assets.ready;expect(model.animation).toBeDefined();
  try{
   for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2])for(const pitch of [0,38,60])for(const height of [600,900]){
    const camera=new PerspectiveCamera(37,1.5,1,4000),distance=height/(2*Math.tan(37*Math.PI/360));camera.up.set(0,1,0);camera.position.set(0,-Math.sin(pitch*Math.PI/180)*distance,Math.cos(pitch*Math.PI/180)*distance);camera.lookAt(0,0,0);camera.updateMatrixWorld();
    const main=camera.projectionMatrix.clone().multiply(camera.matrixWorldInverse),scale=militaryModelScale(main.elements,new Vector3(),height*1.5,ARMY_MODEL_PIXELS);
    animateMilitaryModel(model,'marching',1,true);model.body.rotation.y=heading;model.root.matrix.makeScale(scale,scale,scale).multiply(new Matrix4().makeRotationX(Math.PI/2));model.root.updateMatrixWorld(true);const bounds=new Box3().setFromObject(model.root);
    for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
     const p=new Vector3(x,y,z).project(camera),screen={x:p.x*height*1.5/2,y:-p.y*height/2};extent.width=Math.max(extent.width,Math.abs(screen.x)*2);extent.above=Math.max(extent.above,-screen.y);extent.below=Math.max(extent.below,screen.y);expect(screen.y).toBeLessThan(armyModelBadgeBottom(pitch)-29);
    }
   }
   expect(extent.width,JSON.stringify(extent)).toBeLessThanOrEqual(size.width);expect(extent.above,JSON.stringify(extent)).toBeLessThanOrEqual(size.height-size.bottom);expect(extent.below,JSON.stringify(extent)).toBeLessThanOrEqual(size.bottom);
   model.root.traverse(object=>{if('material' in object){const material=object.material;if(material instanceof MeshStandardMaterial)expect(material.bumpMap).toBeNull();}});
  }finally{assets.dispose();}
 });
});

describe('paper atlas army cards (no UI)',()=>{
 it('uses the compact hit bounds without changing geographic or model anchors',()=>{
  const entries=Array.from({length:8},(_,i)=>({key:String(i),point:{x:350,y:240}}));
  const placements=layoutArmyCards(entries,[],{width:800,height:500},true),size=armyMarkerFootprint(false,true);
  expect(placements.size).toBe(entries.length);
  for(const p of placements.values()){expect(p.bounds.right-p.bounds.left).toBe(size.width);expect(p.bounds.bottom-p.bounds.top).toBe(size.height);}
  const bounds=[...placements.values()].map(p=>p.bounds);
  for(let i=0;i<bounds.length;i++)for(let j=i+1;j<bounds.length;j++)expect(screenOverlap(bounds[i],bounds[j])).toBe(0);
  expect(armyMarkerFootprint(true,true)).toEqual(armyMarkerFootprint(true,false));
 });
});

describe('settlement groups around fixed army models (no UI)',()=>{
 it('separates adjacent annotations even without a model',()=>{
  const rect={left:250,right:380,top:220,bottom:260},dock=dockMapMarker(rect,[],[rect],{width:800,height:600});
  expect(screenOverlap(rect,dock.bounds)).toBe(0);
 });
 it('keeps a city and attached estate inside the viewport at an edge',()=>{
  const rect={left:5,right:180,top:200,bottom:246},model={left:0,right:190,top:160,bottom:430};
  const dock=dockMapMarker(rect,[model],[],{width:800,height:600});
  expect(screenOverlap(dock.bounds,model)).toBe(0);expect(dock.bounds.left).toBeGreaterThanOrEqual(8);expect(dock.bounds.right).toBeLessThanOrEqual(792);
 });
 it('places army cards against the final settlement position',()=>{
  const point={x:400,y:300},model=anchoredArmyModels([{key:'1',point,position:{lon:118.78,lat:32.04}}],[],{width:900,height:650}).get('1')!;
  const dock=dockMapMarker({left:325,right:475,top:260,bottom:300},[model.bounds],[],{width:900,height:650});
  const card=layoutArmyCards([{key:'2',point}],[model.bounds,dock.bounds],{width:900,height:650}).get('2')!;
  expect(screenOverlap(card.bounds,dock.bounds)).toBe(0);expect(screenOverlap(card.bounds,model.bounds)).toBe(0);expect(model.offset).toEqual({x:0,y:0});
 });
});
