import {Bone,Matrix4,Quaternion,SkinnedMesh,Vector3,type Group} from 'three';
import type {ArmyModelKind} from './MilitaryModels';

/** Carry targets in the authored soldier frame (+Z forward), separate from locomotion. */
export function createMilitaryCarryPose(root:Group,kind:ArmyModelKind){
 let mesh:SkinnedMesh|undefined;root.traverse(o=>{if(o instanceof SkinnedMesh&&!mesh)mesh=o;});
 if(!mesh)throw new Error('兵模缺少骨架');
 const skeleton=mesh.skeleton;
 const get=(name:string)=>{const i=skeleton.bones.findIndex(b=>b.name.replaceAll('.','')===name);if(i<0)throw new Error('缺少持握骨骼 '+name);return {bone:skeleton.bones[i],bind:skeleton.boneInverses[i].clone().invert()};};
 const chest=get('Chest'),mounted=kind==='lightHorse'||kind==='heavyHorse';
 const sides=kind==='foot'?['R','L']:kind==='archer'?['L','R']:['R'];
 const arms=sides.map(side=>{
  const upper=get('UpperArm'+side),fore=get('Forearm'+side),hand=get('Hand'+side),sign=side==='R'?-1:1;
  const point=(m:Matrix4)=>new Vector3().setFromMatrixPosition(m);
  return {upper,fore,hand,sign,a:point(upper.bind).distanceTo(point(fore.bind)),b:point(fore.bind).distanceTo(point(hand.bind)),target:new Vector3(sign*(mounted?.51:.40),mounted?1.70:side==='L'&&kind==='foot'?1.08:1.04,mounted?.16:.24)};
 });
 const inverse=new Matrix4(),chestDelta=new Matrix4();
 function setPose(bone:Bone,position:Vector3,rotation:Quaternion){
  const parent=new Matrix4().multiplyMatrices(inverse,bone.parent!.matrixWorld).invert();
  const local=parent.multiply(new Matrix4().compose(position,rotation,new Vector3(1,1,1)));
  local.decompose(bone.position,bone.quaternion,bone.scale);bone.quaternion.normalize();bone.updateMatrixWorld(true);
 }
 function point(bone:Bone,bind:Matrix4,from:Vector3,to:Vector3){
  const q=new Quaternion().setFromRotationMatrix(bind),axis=new Vector3(0,1,0).applyQuaternion(q);
  setPose(bone,from,new Quaternion().setFromUnitVectors(axis,to.clone().sub(from).normalize()).multiply(q));
 }
 return (seconds=0,attackWeight=0)=>{
  root.updateWorldMatrix(true,true);inverse.copy(root.matrixWorld).invert();
  chestDelta.multiplyMatrices(inverse,chest.bone.matrixWorld).multiply(chest.bind.clone().invert());
  for(const {upper,fore,hand,sign,a,b,target} of arms){
   const shoulder=upper.bone.getWorldPosition(new Vector3()).applyMatrix4(inverse),wrist=target.clone();
   const t=(seconds%2.4)/2.4,wave=Math.sin(t*Math.PI*2),strike=Math.max(0,Math.sin(t*Math.PI*2));
   if(attackWeight>0){const combat=target.clone();if(kind==='archer'){combat.set(sign*.33,mounted?1.85:1.42,sign>0?.58:.28-strike*.30);}else if(kind==='spear'||kind==='heavyHorse'){combat.z+=strike*.40;combat.y+=.12;}else if(sign<0){combat.y+=.32+wave*.28;combat.z+=strike*.26;combat.x+=wave*.10;}else{combat.y+=.20;combat.z+=.16;}wrist.lerp(combat,attackWeight);}
   wrist.applyMatrix4(chestDelta);
   const axis=wrist.clone().sub(shoulder),d=Math.min(axis.length(),a+b-.0001);axis.normalize();wrist.copy(shoulder).addScaledVector(axis,d);
   const along=(a*a-b*b+d*d)/(2*d),height=Math.sqrt(Math.max(0,a*a-along*along));
   const bend=new Vector3(sign*.25,-1,-.15).transformDirection(chestDelta);bend.addScaledVector(axis,-bend.dot(axis)).normalize();
   const elbow=shoulder.clone().addScaledVector(axis,along).addScaledVector(bend,height);
   point(upper.bone,upper.bind,shoulder,elbow);point(fore.bone,fore.bind,elbow,wrist);
   const palm=new Matrix4().makeBasis(new Vector3(0,-sign,0),new Vector3(0,0,1),new Vector3(-sign,0,0));
   const turn=new Quaternion().setFromRotationMatrix(chestDelta).multiply(new Quaternion().setFromRotationMatrix(palm));
   if(attackWeight>0&&sign<0&&(kind==='foot'||kind==='lightHorse'))turn.multiply(new Quaternion().setFromAxisAngle(new Vector3(1,0,0),(wave*.9-.25)*attackWeight));
   setPose(hand.bone,wrist,turn);
  }
 };
}

export function hasAuthoredMilitaryGrip(root:Group){
 let authored=false;root.traverse(o=>{if(o.userData.authoredCarry==='military-v2'||o.userData.authoredCarry==='sword-shield-v2')authored=true;});return authored;
}

/** Close the source's open fingers once, in hand bind space; retain UVs and skin weights. */
export function prepareMilitaryHands(root:Group){
 if(hasAuthoredMilitaryGrip(root))return;
 root.traverse(o=>{
  if(!(o instanceof SkinnedMesh)||o.geometry.userData.carryGrip||o.userData.authoredCarry==='sword-shield-v2')return;
  const p=o.geometry.getAttribute('position'),weights=o.geometry.getAttribute('skinWeight'),indices=o.geometry.getAttribute('skinIndex');
  let changed=false;
  // The original proximity rig assigned outer skirt plates to nearby empty hands.
  // Raising those hands must not pull armour into spikes. Repair only that region.
  const mounted=o.skeleton.bones.some(b=>b.name==='HorseBody');
  const armIndices=new Set(o.skeleton.bones.flatMap((b,i)=>/^(Hand|Forearm|UpperArm|Clavicle)/.test(b.name)?[i]:[]));
  for(let i=0;i<p.count;i++){
   const v=new Vector3().fromBufferAttribute(p,i).applyMatrix4(o.bindMatrix);
   if(v.y>=(mounted?1.62:1.0)||Math.abs(v.x)>(mounted?.40:.355))continue;
   let removed=0,total=0;for(let c=0;c<4;c++){const w=weights.getComponent(i,c);if(armIndices.has(indices.getComponent(i,c))){removed+=w;weights.setComponent(i,c,0);}else total+=w;}
   if(!removed)continue;
   if(total>.0001){for(let c=0;c<4;c++)weights.setComponent(i,c,weights.getComponent(i,c)/total);}
   else{const name=(v.y<(mounted?1.45:.85)?'SkirtSide':'Hips')+(v.y<(mounted?1.45:.85)?(v.x>0?'L':'R'):'');const target=o.skeleton.bones.findIndex(b=>b.name.replaceAll('.','')===name);indices.setXYZW(i,target,0,0,0);weights.setXYZW(i,1,0,0,0);}
   changed=true;
  }
  weights.needsUpdate=true;indices.needsUpdate=true;
  for(const side of ['R','L']){
   const index=o.skeleton.bones.findIndex(b=>b.name.replaceAll('.','')==='Hand'+side);if(index<0)continue;
   const toHand=o.skeleton.boneInverses[index].clone().multiply(o.bindMatrix),fromHand=toHand.clone().invert(),sign=side==='L'?1:-1;
   for(let i=0;i<p.count;i++){
    let weight=0;for(let c=0;c<4;c++)if(indices.getComponent(i,c)===index)weight+=weights.getComponent(i,c);
    if(weight<.1)continue;
    const v=new Vector3().fromBufferAttribute(p,i).applyMatrix4(toHand);
    if(v.y<=.025||v.y>.16||v.z<-.145||v.z>.005||v.x*sign<.005||v.x*sign>.115)continue;
    const angle=Math.min(2.9,(v.y-.025)/.032);v.y=.025+.032*Math.sin(angle);v.z+=.032*(1-Math.cos(angle));
    v.applyMatrix4(fromHand);p.setXYZ(i,v.x,v.y,v.z);changed=true;
   }
  }
  if(changed){p.needsUpdate=true;o.geometry.computeVertexNormals();o.geometry.computeBoundingSphere();o.geometry.computeBoundingBox();}
  o.geometry.userData.carryGrip=true;
 });
}
