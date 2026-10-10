import {Mesh,SkinnedMesh,Vector3,Quaternion,type Group} from 'three';
import {GLTFLoader,type GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {applyInfantryLighting} from './infantryLighting';
import {disposeInfantryAsset} from './RiggedInfantry';
import type {ArmyModelKind} from './MilitaryModels';

const equipment={foot:['Sword','Shield'],spear:['Spear'],archer:['Bow','Quiver'],lightHorse:['Sword'],heavyHorse:['Spear'],siege:[]} as const;
export async function loadMilitaryEquipment(){
 const asset=await new GLTFLoader().loadAsync(import.meta.env.BASE_URL+'art/military/weapons-v1.glb');
 if(!['Sword','Shield','Spear','Bow','Quiver'].every(name=>asset.scene.getObjectByName(name))){disposeInfantryAsset(asset);throw new Error('兵器资源不完整');}
 applyInfantryLighting(asset.scene);return asset;
}
/** Rigid props share geometry/materials and follow each army's own animated bones. */
export function attachMilitaryEquipment(root:Group,kit:GLTF,kind:ArmyModelKind){
 let skin:SkinnedMesh|undefined;root.traverse(o=>{if(o instanceof SkinnedMesh&&!skin)skin=o;});
 if(!skin)throw new Error('兵模缺少骨架');
 // Resolve and validate all mounts before mutating the model.
 const mounts=equipment[kind].map(name=>{
  const template=kit.scene.getObjectByName(name),joint=name==='Quiver'?'Chest':name==='Bow'||name==='Shield'?'HandL':'HandR';
  const index=skin!.skeleton.bones.findIndex(b=>b.name.replaceAll('.','')===joint);
  if(!template||index<0)throw new Error('兵模缺少装备挂点：'+name);
  return {name,template,index};
 });
 for(const {name,template,index} of mounts){
  const bone=skin.skeleton.bones[index],bind=skin.skeleton.boneInverses[index].clone().invert();
  const prop=template.clone(true);prop.name='Equipment '+name;
  // Canonical kit grips are at the origin, +Y up; put them inside the palm.
  prop.position.set(0,.065,0);prop.quaternion.copy(new Quaternion().setFromRotationMatrix(bind).invert());
  if(name==='Sword')prop.quaternion.multiply(new Quaternion().setFromAxisAngle(new Vector3(1,0,0),.4));
  if(name==='Shield')prop.position.add(new Vector3(0,0,1).transformDirection(skin.skeleton.boneInverses[index]).multiplyScalar(.045));
  if(name==='Quiver'){
   const back=new Vector3(.12,1.20,-.19);prop.position.copy(back.applyMatrix4(skin.skeleton.boneInverses[index]));
  }
  prop.traverse(o=>{if(o instanceof Mesh){o.frustumCulled=false;o.castShadow=true;o.receiveShadow=true;}});bone.add(prop);
 }
}
