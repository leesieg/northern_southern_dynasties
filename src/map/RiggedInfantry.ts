import {AnimationMixer,Mesh,SkinnedMesh,Texture,type AnimationAction,type Group} from 'three';
import {GLTFLoader,type GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';

export interface InfantryAnimation {root:Group;mixer:AnimationMixer;idle:AnimationAction;walk:AnimationAction;weight:number;lastTime?:number;}
export function createInfantryAnimation(asset:GLTF,seed:number):InfantryAnimation{
 const root=clone(asset.scene) as Group,mixer=new AnimationMixer(root);
 root.name='Rigged campaign infantry';
 root.traverse(o=>{if(o instanceof Mesh){o.frustumCulled=false;o.castShadow=true;o.receiveShadow=true;}});
 const idle=mixer.clipAction(asset.animations.find(a=>a.name==='Idle')!),walk=mixer.clipAction(asset.animations.find(a=>a.name==='Walk')!);
 idle.play();walk.play();idle.time=(seed*.173)%idle.getClip().duration;walk.time=(seed*.137)%walk.getClip().duration;walk.setEffectiveWeight(0);mixer.update(0);
 return {root,mixer,idle,walk,weight:0};
}
/** Clock is real seconds. Root translation remains exclusively owned by the map. */
export function updateInfantryAnimation(a:InfantryAnimation,state:string,seconds:number,motion:boolean){
 const dt=a.lastTime===undefined?0:Math.max(0,Math.min(.1,seconds-a.lastTime));a.lastTime=seconds;
 const target=motion&&(state==='marching'||state==='retreat')?1:0;
 a.weight=motion?a.weight+(target-a.weight)*(1-Math.exp(-dt/.09)):0;
 if(Math.abs(target-a.weight)<.001)a.weight=target;
 a.idle.setEffectiveWeight(1-a.weight);a.walk.setEffectiveWeight(a.weight);a.mixer.update(motion?dt:0);
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
export async function loadInfantryAsset(){
 const asset=await new GLTFLoader().loadAsync(import.meta.env.BASE_URL+'art/military/infantry-rigged-v1.glb');
 if(!['Idle','Walk'].every(name=>asset.animations.some(a=>a.name===name))){disposeInfantryAsset(asset);throw new Error('兵模缺少待机或行军动画');}
 return asset;
}
