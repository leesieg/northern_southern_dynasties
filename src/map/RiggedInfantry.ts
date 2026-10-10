import {mapResource} from './resourceLoader';
import {prepareMilitaryHands} from './MilitaryCarryPose';
import {AnimationMixer,Mesh,SkinnedMesh,Texture,type AnimationAction,type Group} from 'three';
import {GLTFLoader,type GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {applyInfantryLighting} from './infantryLighting';

export interface InfantryAnimation {phase?:number;mounted?:boolean;root:Group;mixer:AnimationMixer;idle:AnimationAction;walk:AnimationAction;attack?:AnimationAction;weight:number;attackWeight:number;attacking?:boolean;lastTime?:number;carryPose?:(seconds?:number,attackWeight?:number)=>void;}
export function createInfantryAnimation(asset:GLTF,seed:number):InfantryAnimation{
 const root=clone(asset.scene) as Group,mixer=new AnimationMixer(root);
 root.name='Rigged campaign infantry';
 root.traverse(o=>{if(o instanceof Mesh){o.frustumCulled=false;o.castShadow=true;o.receiveShadow=true;}});
 const idle=mixer.clipAction(asset.animations.find(a=>a.name==='Idle')!),walk=mixer.clipAction(asset.animations.find(a=>a.name==='Walk')!);
 idle.play();walk.play();idle.time=(seed*.173)%idle.getClip().duration;walk.time=(seed*.137)%walk.getClip().duration;walk.setEffectiveWeight(0);mixer.update(0);
 const clip=asset.animations.find(a=>a.name==='Attack'),attack=clip?mixer.clipAction(clip):undefined;
 if(attack){attack.play();attack.setEffectiveWeight(0);}
 return {phase:seed*.173,root,mixer,idle,walk,attack,weight:0,attackWeight:0};
}
/** Clock is real seconds. Root translation remains exclusively owned by the map. */
export function updateInfantryAnimation(a:InfantryAnimation,state:string,seconds:number,motion:boolean){
 const dt=a.lastTime===undefined?0:Math.max(0,Math.min(.1,seconds-a.lastTime));a.lastTime=seconds;
 const target=motion&&(state==='marching'||state==='retreat'||a.mounted&&state==='battle')?1:0;
 a.weight=motion?a.weight+(target-a.weight)*(1-Math.exp(-dt/.09)):0;
 if(Math.abs(target-a.weight)<.001)a.weight=target;
 const attacking=motion&&(state==='siege'||state==='battle'),attackTarget=attacking?1:0;
 if(attacking&&!a.attacking)a.attack?.reset().play();a.attacking=attacking;
 a.attackWeight=motion?a.attackWeight+(attackTarget-a.attackWeight)*(1-Math.exp(-dt/.09)):0;
 if(Math.abs(attackTarget-a.attackWeight)<.001)a.attackWeight=attackTarget;
 a.walk.setEffectiveTimeScale(a.mounted&&state==='battle'?1.6:state==='retreat'?1.25:1);a.idle.setEffectiveWeight(Math.max(0,1-a.weight-(a.attack?a.attackWeight:0)));a.walk.setEffectiveWeight(a.weight);a.attack?.setEffectiveWeight(a.attackWeight);a.mixer.update(motion?dt:0);a.carryPose?.(a.mixer.time+(a.phase??0),a.attackWeight);
 return motion;
}
export function disposeInfantryAnimation(a:InfantryAnimation){
 a.mixer.stopAllAction();a.mixer.uncacheRoot(a.root);a.root.traverse(o=>{if(o instanceof SkinnedMesh)o.skeleton.dispose();});a.root.removeFromParent();
}
export function disposeInfantryAsset(asset:GLTF){
 const geometries=new Set<Mesh['geometry']>(),textures=new Set<Texture>();
 // Sets avoid disposing shared resources more than once across mesh primitives.
 const mats=new Set<import('three').Material>();
 asset.scene.traverse(o=>{if(o instanceof Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])mats.add(m);}if(o instanceof SkinnedMesh)o.skeleton.dispose();});
 for(const m of mats){for(const value of Object.values(m))if(value instanceof Texture)textures.add(value);m.dispose();}
 geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());
}
export async function loadInfantryAsset(file='infantry-rigged-v1.glb',signal?:AbortSignal){
 const response=await mapResource('art/military/'+file,{signal,priority:3}),asset=await new GLTFLoader().parseAsync(await response.arrayBuffer(),'');
 const required=file==='siege-crew-v1.glb'?['Idle','Walk','Attack']:['Idle','Walk'];
 if(!required.every(name=>asset.animations.some(a=>a.name===name))){disposeInfantryAsset(asset);throw new Error('兵模缺少必要动画');}
 if(file!=='siege-crew-v1.glb')prepareMilitaryHands(asset.scene);
 applyInfantryLighting(asset.scene);
 return asset;
}
