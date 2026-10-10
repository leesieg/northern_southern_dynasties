import * as equipment from '../MilitaryEquipment';
import {afterEach,expect,it,vi} from 'vitest';
import {BoxGeometry,Group,Scene,SkinnedMesh,Texture,TextureLoader,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {newCampaignWorld} from '../../core/world';
import * as campaignAssets from '../CampaignSampleAssets';
import {readInfantryTestAsset} from '../infantryAsset.testSupport';
import {armyMapPosition} from '../armyMapPresentation';
import {campaignActors,type ActorView} from './actors';
import {projectGround} from './geography';

afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
it.each(['foot','spear','archer','lightHorse','heavyHorse','siege'] as const)('uses %s at the real army position and releases it on removal',async kind=>{
 vi.spyOn(equipment,'loadMilitaryEquipment').mockResolvedValue(await readInfantryTestAsset('weapons-v1.glb'));
 const infantry=await readInfantryTestAsset(['foot','spear','archer'].includes(kind)?'infantry-rigged-v1.glb':kind==='lightHorse'?'light-cavalry-v1.glb':kind==='heavyHorse'?'heavy-cavalry-v1.glb':'siege-crew-v1.glb');vi.spyOn(GLTFLoader.prototype,'loadAsync').mockResolvedValue(infantry);
 vi.spyOn(TextureLoader.prototype,'load').mockImplementation(()=>new Texture());
 vi.stubGlobal('document',{createElement:()=>({width:128,height:128,getContext:()=>({createRadialGradient:()=>({addColorStop:()=>{}}),fillRect:()=>{}})})});
 // Only unrelated scenery and terrain inputs are substituted; infantry and its mixer are real.
 const geometry=new BoxGeometry();vi.spyOn(campaignAssets,'loadCampaignSampleAssets').mockResolvedValue({city:()=>new Group(),prune:()=>{},dispose:()=>geometry.dispose(),tree:geometry,trees:[],closeTrees:[],rocks:geometry});
 const world=newCampaignWorld('xiao-yan',undefined,'sandbox'),army={id:987,realm:'liang' as const,location:'jiankang',troops:800,morale:80,supply:500,siege:0,journey:null,regiments:[{id:'987:1',kind:kind==='foot'?'shield' as const:kind,troops:800,service:'standing' as const,origin:'jiankang',experience:0}]};world.realm!.armies=[army];
 const state={world,selected:'',tilted:true,sceneryDetail:false,militaryModels:true,armyMotion:true};
 const scene=new Scene(),repaint=vi.fn(),warning=vi.fn();const view:ActorView={scene,cityLayout:()=>undefined,height:()=>7.3,isLand:()=>true,isRiver:()=>false,isMoving:()=>true,project:()=>({x:200,y:200}),getZoom:()=>8,getSize:()=>({width:1200,height:800}),unitsPerPixel:()=>1,unitsPerPixelAt:()=>1,getTarget:()=>new Vector3(),getViewKey:()=>'',repaint,warning};
 const actors=await campaignActors(view,()=>state,()=>({model:true,offset:{x:500,y:-200},bounds:{left:0,top:0,right:200,bottom:400}}));
 try{
  await vi.waitFor(()=>expect(repaint).toHaveBeenCalled());actors.update(0);
  const rigName=['foot','spear','archer'].includes(kind)?'Rigged campaign infantry':'Rigged campaign '+kind;await vi.waitFor(()=>expect(scene.getObjectByName(rigName)).toBeDefined());expect(actors.update(1)).toBe(true);
  const rig=scene.getObjectByName(rigName)!,root=rig.parent!.parent!,at=armyMapPosition(army),p=projectGround(at.lon,at.lat);
  expect(root.visible).toBe(true);expect(root.position.toArray()).toEqual([p.x,7.38,p.z]);
  let mesh!:SkinnedMesh;rig.traverse(o=>{if(o instanceof SkinnedMesh)mesh=o;});const initial=mesh.skeleton.bones.map(b=>b.quaternion.clone());
  for(let i=1;i<=30;i++)actors.update(i*1000/60);
  expect(mesh.skeleton.bones.some((b,i)=>!b.quaternion.equals(initial[i]))).toBe(true);
  state.armyMotion=false;expect(actors.update(600)).toBe(false);
  const dispose=vi.spyOn(mesh.skeleton,'dispose');world.realm!.armies=[];actors.update(700);
  expect(dispose).toHaveBeenCalledOnce();expect(scene.getObjectByName(rigName)).toBeUndefined();expect(warning).not.toHaveBeenCalled();
 }finally{actors.dispose();}
});
