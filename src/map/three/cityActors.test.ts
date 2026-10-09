import {afterEach,expect,it,vi} from 'vitest';
import {BoxGeometry,Group,Mesh,MeshStandardMaterial,Scene,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {newCampaignWorld} from '../../core/world';
import {siteById} from '../../data/scenario';
import * as campaignAssets from '../CampaignSampleAssets';
import {campaignActors,type ActorView} from './actors';
import {projectGround} from './geography';

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
