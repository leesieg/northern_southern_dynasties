import {ARMY_MODEL_PIXELS} from './armyMapPresentation';
import {AnimationMixer,Group,Mesh,SkinnedMesh,type AnimationAction} from 'three';
import {GLTFLoader,type GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import type {World} from '../core/types';
import {personCulture} from '../core/culture';
import {getPerson} from '../core/personRegistry';
import {ageAt} from '../core/lifeState';
import {travelerPersonId} from './TravelerMotion';
import {mapResource,MapResourceError} from './resourceLoader';
import {applyInfantryLighting} from './infantryLighting';
import {disposeInfantryAsset} from './RiggedInfantry';
export type TravelerKind=`${'han'|'xianbei'}-${'male'|'female'}`;
export type TravelerAssetKey=`${TravelerKind}-${'near'|'far'}`;
// The imported traveler is 1.72 units tall. Match the army's scale per model unit,
// rather than comparing a full human height with the army's unit-scale constant.
export const TRAVELER_MODEL_HEIGHT=1.72;
export const travelerPixels=()=>TRAVELER_MODEL_HEIGHT*ARMY_MODEL_PIXELS;
/** Costume reuse is presentation only: it must never write culture or allegiance. */
export function travelerKind(w:World,id:string):TravelerKind|undefined{
 id=travelerPersonId(w,id);const age=ageAt(w,id);if(age!==null&&age<18)return;
 const sex=getPerson(w,id)?.sex??w.identities?.people[id]?.sex;if(!sex)return;
 return `${personCulture(w,id)==='han'?'han':'xianbei'}-${sex}`;
}
export async function loadTravelerAsset(key:TravelerAssetKey,signal?:AbortSignal){
 const response=await mapResource(`art/campaign/travelers/${key}.glb`,{signal,priority:3}),asset=await new GLTFLoader().parseAsync(await response.arrayBuffer(),'');
 let skinned=false;asset.scene.traverse(o=>{if(o instanceof SkinnedMesh)skinned=true;});
 if(!skinned||!['Idle','Walk'].every(name=>asset.animations.some(a=>a.name===name))){disposeInfantryAsset(asset);throw new Error('行旅模型缺少骨骼或动作');}
 applyInfantryLighting(asset.scene);return asset;
}
export interface TravelerModel {root:Group;key:TravelerAssetKey;body?:Group;mixer?:AnimationMixer;idle?:AnimationAction;walk?:AnimationAction;time?:number;weight:number;seed:number;}
/** At most eight shared assets, independent skeleton/mixer for each visible traveler. */
export function travelerModelAssets(repaint:()=>void,warn:(message:string)=>void,signal?:AbortSignal,load=loadTravelerAsset){
 const assets=new Map<TravelerAssetKey,GLTF>(),pending=new Map<TravelerAssetKey,Promise<void>>(),failed=new Set<TravelerAssetKey>(),models=new Set<TravelerModel>();let disposed=false;
 function attach(model:TravelerModel){
  const asset=assets.get(model.key);if(!asset||disposed||!models.has(model)||model.body)return;
  const body=clone(asset.scene) as Group,mixer=new AnimationMixer(body),idle=mixer.clipAction(asset.animations.find(a=>a.name==='Idle')!),walk=mixer.clipAction(asset.animations.find(a=>a.name==='Walk')!);
  body.traverse(o=>{if(o instanceof Mesh){o.castShadow=false;o.receiveShadow=true;o.frustumCulled=false;}});
  idle.play();walk.play();idle.time=model.seed%idle.getClip().duration;walk.time=model.seed%walk.getClip().duration;walk.setEffectiveWeight(0);mixer.update(0);
  Object.assign(model,{body,mixer,idle,walk});model.root.add(body);repaint();
 }
 function ensure(key:TravelerAssetKey){
  if(assets.has(key)||pending.has(key)||disposed)return;
  pending.set(key,load(key,signal).then(asset=>{if(disposed){disposeInfantryAsset(asset);return;}assets.set(key,asset);failed.delete(key);if(!failed.size)warn('');models.forEach(m=>{if(m.key===key)attach(m);});}).catch(error=>{if(!disposed&&!signal?.aborted){failed.add(key);warn(error instanceof MapResourceError&&error.kind==='auth'?error.message:'行旅人物模型未能载入，保留肖像和人物操作，可重试。');}}).finally(()=>pending.delete(key)));
 }
 function release(model:TravelerModel){models.delete(model);model.mixer?.stopAllAction();if(model.body){model.mixer?.uncacheRoot(model.body);model.body.traverse(o=>{if(o instanceof SkinnedMesh)o.skeleton.dispose();});}model.root.removeFromParent();}
 return {
  get ready(){return Promise.all(pending.values());},
  create(key:TravelerAssetKey,id:string){const model:TravelerModel={root:new Group(),key,weight:0,seed:[...id].reduce((n,c)=>n+c.charCodeAt(0)*.013,0)};models.add(model);if(!failed.has(key))ensure(key);attach(model);return model;},
  release,retry(){for(const key of failed)ensure(key);},
  dispose(){disposed=true;models.forEach(release);assets.forEach(disposeInfantryAsset);assets.clear();},
 };
}
export function animateTraveler(model:TravelerModel,now:number,walking:boolean,running:boolean){
 const dt=model.time===undefined?0:Math.min(.1,Math.max(0,(now-model.time)/1000));model.time=now;
 if(!model.mixer)return false;
 // Pausing freezes the displayed pose as well as the world position.
 if(!running)return false;
 model.weight+=(Number(walking)-model.weight)*(1-Math.exp(-dt/.09));if(Math.abs(Number(walking)-model.weight)<.001)model.weight=Number(walking);
 model.walk!.setEffectiveWeight(model.weight);model.idle!.setEffectiveWeight(1-model.weight);model.mixer.update(dt);return true;
}
