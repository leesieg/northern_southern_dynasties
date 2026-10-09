import {afterEach,expect,it,vi} from 'vitest';
import {BoxGeometry,Group,InstancedMesh,Matrix4,Mesh,MeshStandardMaterial,Scene,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {newCampaignWorld} from '../../core/world';
import {siteById} from '../../data/scenario';
import * as campaignAssets from '../CampaignSampleAssets';
import {campaignActors,type ActorView} from './actors';
import {projectGround} from './geography';
import * as vegetation from './vegetation';

afterEach(()=>vi.restoreAllMocks());
it('grounds the complete city above the footprint peak and updates its foundation after terrain refinement',async()=>{
 // Isolate placement from asset downloads; the box has a deliberately non-zero base height.
 vi.spyOn(GLTFLoader.prototype,'loadAsync').mockReturnValue(new Promise(()=>{}));
 const geometry=new BoxGeometry(17,3,17),material=new MeshStandardMaterial();
 vi.spyOn(campaignAssets,'loadCampaignSampleAssets').mockResolvedValue({city:()=>new Group().add(new Mesh(geometry,material)),prune:()=>{},dispose:()=>{geometry.dispose();material.dispose();},tree:geometry,trees:[],closeTrees:[],rocks:geometry});
 const world=newCampaignWorld('xiao-yan',undefined,'sandbox');world.realm!.armies=[];
 const site=siteById.jiankang,p=projectGround(site.lon,site.lat),state={world,selected:site.id,tilted:true,sceneryDetail:false,militaryModels:false,armyMotion:false};let peak:number|null=12;
 const view:ActorView={scene:new Scene(),cityLayout:()=>undefined,height:()=>2,footprintHeight:b=>b.minX===b.maxX?2:peak,isLand:()=>true,isRiver:()=>false,isMoving:()=>false,project:([lon,lat])=>({x:200+(lon-site.lon)*10000,y:200+(lat-site.lat)*10000}),getZoom:()=>10,getSize:()=>({width:1200,height:800}),unitsPerPixel:()=>1,unitsPerPixelAt:()=>1,getTarget:()=>new Vector3(p.x,0,p.z),getViewKey:()=>'',repaint:()=>{},warning:()=>{}};
 const actors=await campaignActors(view,()=>state,()=>undefined);
 try{
  actors.refresh();const city=actors.cityRoots().find(c=>c.userData.site===site.id)!;expect(city).toBeDefined();
  expect(city.position.x).toBe(p.x);expect(city.position.z).toBe(p.z);expect(city.position.y-1.5*city.scale.y).toBeCloseTo(12.08);
  const foundation=city.children.at(-1) as Mesh,dispose=vi.spyOn(foundation.geometry,'dispose');peak=18;actors.refresh();
  expect(city.position.y-1.5*city.scale.y).toBeCloseTo(18.08);expect(dispose).toHaveBeenCalledOnce();expect(city.children).toHaveLength(2);
  peak=null;actors.refresh();expect(city.visible).toBe(false);expect(actors.showsSite(site.id)).toBe(false);
 }finally{actors.dispose();}
});

it('roots forest instances on rendered terrain without stacking a rock layer below them',async()=>{
 vi.spyOn(GLTFLoader.prototype,'loadAsync').mockReturnValue(new Promise(()=>{}));
 const geometry=new BoxGeometry(1,1,1);
 vi.spyOn(campaignAssets,'loadCampaignSampleAssets').mockResolvedValue({city:()=>new Group(),prune:()=>{},dispose:()=>geometry.dispose(),tree:geometry,trees:[geometry,geometry,geometry],closeTrees:[geometry,geometry,geometry],rocks:geometry});
 const world=newCampaignWorld('xiao-yan',undefined,'sandbox');world.realm!.armies=[];
 const site=siteById.jiankang,p=projectGround(site.lon,site.lat);
 vi.spyOn(vegetation,'vegetationCandidates').mockReturnValue([{...p,rotation:0,scale:1,variant:0,priority:0}]);
 const state={world,selected:'',tilted:true,sceneryDetail:true,militaryModels:false,armyMotion:false};let rendered:number|null=18;
 const view:ActorView={scene:new Scene(),cityLayout:()=>({x:p.x+10000,z:p.z,scale:1,radius:1}),height:()=>2,sceneryHeight:()=>rendered,isLand:()=>true,isRiver:()=>false,isMoving:()=>false,project:([lon])=>({x:Math.abs(lon-site.lon)<.01?200:-100,y:200}),getZoom:()=>12,getSize:()=>({width:1200,height:800}),unitsPerPixel:()=>1,unitsPerPixelAt:()=>1,getTarget:()=>new Vector3(p.x,0,p.z),getViewKey:()=>'',repaint:()=>{},warning:()=>{}};
 const actors=await campaignActors(view,()=>state,()=>undefined);
 try{
  actors.refresh();const instances=actors.root.children.filter((m):m is InstancedMesh=>m instanceof InstancedMesh);
  expect(instances).toHaveLength(6);const populated=instances.filter(m=>m.count>0);expect(populated).toHaveLength(1);
  const matrix=new Matrix4();populated[0].getMatrixAt(0,matrix);expect(new Vector3().setFromMatrixPosition(matrix).y).toBe(18);
  rendered=null;actors.refresh();expect(instances.every(m=>m.count===0)).toBe(true);
 }finally{actors.dispose();}
});
