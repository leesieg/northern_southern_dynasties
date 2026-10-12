import {CAMPAIGN_BODY_SCALE} from '../unitScale';
import {afterEach,expect,it,vi} from 'vitest';
import {Group,Scene,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import * as resources from '../resourceLoader';
import {readInfantryTestAsset} from '../infantryAsset.testSupport';
import {newCampaignWorld} from '../../core/world';
import {sampleRoad,roadHeading} from '../../core/routeGeometry';
import {travelerActors} from './travelerActors';
import {projectGround} from './geography';
import type {ActorView,CampaignState} from './actors';
afterEach(()=>vi.restoreAllMocks());
it('anchors the real traveler to terrain, follows visibility/LOD and releases on arrival without touching world state',async()=>{
 const asset=await readInfantryTestAsset('../campaign/travelers/han-male-near.glb');vi.spyOn(resources,'mapResource').mockImplementation(async()=>new Response(new ArrayBuffer(0)));vi.spyOn(GLTFLoader.prototype,'parseAsync').mockResolvedValue(asset);
 const world=newCampaignWorld('xiao-yan',undefined,'sandbox'),original=JSON.stringify(world),p=world.people[0],journey={route:['jiankang','jingkou'],durations:[4],leg:0,elapsed:2,started:0};let visible=true,zoom=8,walking=true,people=[p];const at={...sampleRoad('jiankang','jingkou',.5),heading:roadHeading(journey)};
 const state:CampaignState={world,selected:'',tilted:true,sceneryDetail:false,militaryModels:true,armyMotion:true,speed:1,showTravelers:true,travelers:()=>people,travelerVisible:()=>visible,travelerPosition:()=>at,travelerMoving:()=>walking};
 const scene=new Scene(),root=new Group();scene.add(root);const view:ActorView={scene,cityLayout:()=>undefined,height:()=>7.3,isLand:()=>true,isRiver:()=>false,isMoving:()=>false,project:()=>({x:200,y:200}),getZoom:()=>zoom,getSize:()=>({width:1200,height:800}),unitsPerPixel:()=>.1,unitsPerPixelAt:()=>.1,getTarget:()=>new Vector3(),getViewKey:()=>'',repaint:vi.fn(),warning:vi.fn()};const actors=travelerActors(view,root,vi.fn());
 try{
  actors.update(state,0);await vi.waitFor(()=>expect(root.children[0].children.length).toBe(2));actors.update(state,16);expect(actors.shows(p.id)).toBe(true);
  const model=root.children[0],ground=projectGround(at.lon,at.lat);expect(model.position.toArray()).toEqual([ground.x,7.335,ground.z]);expect(model.scale.x).toBeCloseTo(CAMPAIGN_BODY_SCALE);
  const forward=new Vector3(0,0,1).applyAxisAngle(new Vector3(0,1,0),model.rotation.y),b=sampleRoad('jiankang','jingkou',.50001),gb=projectGround(b.lon,b.lat);expect(forward.dot(new Vector3(gb.x-ground.x,0,gb.z-ground.z).normalize())).toBeGreaterThan(.9999);
  state.speed=0;walking=false;expect(actors.update(state,32)).toBe(false);expect(model.position.toArray()).toEqual([ground.x,7.335,ground.z]);
  view.unitsPerPixelAt=()=>.8;zoom=7;actors.update(state,40);await vi.waitFor(()=>expect(root.children[0].children.length).toBe(2));expect(resources.mapResource).toHaveBeenLastCalledWith('art/campaign/travelers/han-male-far.glb',expect.anything());expect(root.children[0].scale.x).toBe(model.scale.x);
  visible=false;actors.update(state,48);expect(root.children).toHaveLength(0);expect(actors.shows(p.id)).toBe(false);
  visible=true;actors.update(state,64);people=[];actors.update(state,80);expect(root.children).toHaveLength(0);expect(JSON.stringify(world)).toBe(original);
 }finally{actors.dispose();}
});
