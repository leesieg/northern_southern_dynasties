import * as equipment from '../MilitaryEquipment';
import {afterEach,expect,it,vi} from 'vitest';
import {BoxGeometry,Group,Scene,SkinnedMesh,Texture,TextureLoader,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {newCampaignWorld} from '../../core/world';
import * as campaignAssets from '../CampaignSampleAssets';
import {readInfantryTestAsset} from '../infantryAsset.testSupport';
import {armyMapPosition} from '../armyMapPresentation';
import * as mapResources from '../resourceLoader';
import {campaignActors,type ActorView} from './actors';
import {projectGround} from './geography';
import {sampleRoad} from '../../core/routeGeometry';

afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
it.each(['foot','spear','archer','lightHorse','heavyHorse','siege'] as const)('uses %s at the real army position and releases it on removal',async kind=>{
 vi.spyOn(equipment,'loadMilitaryEquipment').mockResolvedValue(await readInfantryTestAsset('weapons-v1.glb'));
 const infantry=await readInfantryTestAsset(kind==='foot'?'infantry-sword-shield-v2.glb':kind==='spear'?'spear-infantry-v2.glb':kind==='archer'?'archer-infantry-v2.glb':kind==='lightHorse'?'light-cavalry-v2.glb':kind==='heavyHorse'?'heavy-cavalry-v2.glb':'siege-crew-v2.glb');vi.spyOn(mapResources,'mapResource').mockImplementation(async()=>new Response(new ArrayBuffer(0)));vi.spyOn(GLTFLoader.prototype,'parseAsync').mockResolvedValue(infantry);
 vi.spyOn(TextureLoader.prototype,'load').mockImplementation(()=>new Texture());
 vi.stubGlobal('document',{createElement:()=>({width:128,height:128,getContext:()=>({createRadialGradient:()=>({addColorStop:()=>{}}),fillRect:()=>{}})})});
 // Only unrelated scenery and terrain inputs are substituted; infantry and its mixer are real.
 const geometry=new BoxGeometry();vi.spyOn(campaignAssets,'loadCampaignSampleAssets').mockResolvedValue({city:()=>new Group(),prune:()=>{},dispose:()=>geometry.dispose(),tree:geometry,trees:[],closeTrees:[],rocks:geometry});
 const world=newCampaignWorld('xiao-yan',undefined,'sandbox'),army={id:987,realm:'liang' as const,location:'jiankang',troops:800,morale:80,supply:500,siege:0,journey:null,regiments:[{id:'987:1',kind:kind==='foot'?'shield' as const:kind,troops:800,service:'standing' as const,origin:'jiankang',experience:0}]};world.realm!.armies=[army];
 const state={world,selected:'',tilted:true,sceneryDetail:false,militaryModels:true,armyMotion:true};
 const scene=new Scene(),repaint=vi.fn(),warning=vi.fn();const view:ActorView={scene,cityLayout:()=>undefined,height:()=>7.3,isLand:()=>true,isRiver:()=>false,isMoving:()=>true,project:()=>({x:200,y:200}),getZoom:()=>8,getSize:()=>({width:1200,height:800}),unitsPerPixel:()=>1,unitsPerPixelAt:()=>1,getTarget:()=>new Vector3(),getViewKey:()=>'',repaint,warning};
 const actors=await campaignActors(view,()=>state,()=>({model:true,offset:{x:500,y:-200},bounds:{left:0,top:0,right:200,bottom:400}}));
 try{
  actors.update(0);await vi.waitFor(()=>expect(repaint).toHaveBeenCalled());
  const rigName=['foot','spear','archer'].includes(kind)?'Rigged campaign infantry':'Rigged campaign '+kind;await vi.waitFor(()=>expect(scene.getObjectByName(rigName)).toBeDefined());expect(actors.update(1)).toBe(true);
  const rig=scene.getObjectByName(rigName)!,root=rig.parent!.parent!,at=armyMapPosition(army),p=projectGround(at.lon,at.lat);
  expect(root.visible).toBe(true);expect(root.position.toArray()).toEqual([p.x,7.38,p.z]);
  let mesh!:SkinnedMesh;rig.traverse(o=>{if(o instanceof SkinnedMesh)mesh=o;});expect(mesh.castShadow).toBe(false);const initial=mesh.skeleton.bones.map(b=>b.quaternion.clone());
  for(let i=1;i<=30;i++)actors.update(i*1000/60);
  expect(mesh.skeleton.bones.some((b,i)=>!b.quaternion.equals(initial[i]))).toBe(true);
  // Arrival remains at its buffered road pose until the confirmed final stretch finishes.
  const roadA=sampleRoad('jiankang','jingkou',.4),roadB=sampleRoad('jiankang','jingkou',.40001),groundA=projectGround(roadA.lon,roadA.lat),groundB=projectGround(roadB.lon,roadB.lat),heading=Math.atan2(groundB.x-groundA.x,groundA.z-groundB.z);
  Object.assign(state,{armyPosition:()=>({...roadA,heading}),armyMoving:()=>true});actors.update(550);
  const forward=new Vector3(0,0,1).applyAxisAngle(new Vector3(0,1,0),rig.parent!.rotation.y),direction=new Vector3(groundB.x-groundA.x,0,groundB.z-groundA.z).normalize();expect(forward.dot(direction)).toBeGreaterThan(.99999);expect(root.position.x).toBeCloseTo(groundA.x);expect(root.position.z).toBeCloseTo(groundA.z);
  Object.assign(state,{armyMoving:()=>false});
  state.armyMotion=false;expect(actors.update(600)).toBe(false);
  const dispose=vi.spyOn(mesh.skeleton,'dispose');world.realm!.armies=[];actors.update(700);
  expect(dispose).toHaveBeenCalledOnce();expect(scene.getObjectByName(rigName)).toBeUndefined();expect(warning).not.toHaveBeenCalled();
 }finally{actors.dispose();}
});
