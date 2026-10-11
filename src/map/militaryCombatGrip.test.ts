import {beforeAll,expect,it} from 'vitest';
import {Box3,DoubleSide,Matrix4,Quaternion,Raycaster,SkinnedMesh,Vector3} from 'three';
import {readInfantryTestAsset} from './infantryAsset.testSupport';
import {createInfantryAnimation,disposeInfantryAnimation,updateInfantryAnimation} from './RiggedInfantry';
import {attachMilitaryEquipment} from './MilitaryEquipment';

type Asset=Awaited<ReturnType<typeof readInfantryTestAsset>>;
let spear:Asset,archer:Asset,horse:Asset,light:Asset,crew:Asset,kit:Asset;
beforeAll(async()=>{[spear,archer,horse,light,crew,kit]=await Promise.all(['spear-infantry-v2.glb','archer-infantry-v2.glb','heavy-cavalry-v2.glb','light-cavalry-v2.glb','siege-crew-v2.glb','weapons-v1.glb'].map(readInfantryTestAsset));});

it.each(['archer','horse','light'] as const)('%s keeps the weapon elbow and forearm fixed to the chest during combat',kind=>{
 const a=createInfantryAnimation({archer,horse,light}[kind],0);a.idle.setEffectiveWeight(0);a.attack!.setEffectiveWeight(1);const side=kind==='archer'?'L':'R',reference=new Map<string,Matrix4>();let first:Quaternion|undefined,turn=0;
 for(let f=0;f<=120;f++){
  a.mixer.setTime(a.attack!.getClip().duration*f/120);a.root.updateMatrixWorld(true);const inverse=a.root.getObjectByName('Chest')!.matrixWorld.clone().invert();
  for(const n of ['UpperArm','Forearm','ForearmTwist']){const name=n+side,pose=new Matrix4().multiplyMatrices(inverse,a.root.getObjectByName(name)!.matrixWorld);if(!f)reference.set(name,pose.clone());else pose.elements.forEach((v,i)=>expect(v,`${name} ${f}`).toBeCloseTo(reference.get(name)!.elements[i],4));}
  const hand=new Matrix4().multiplyMatrices(inverse,a.root.getObjectByName('Hand'+side)!.matrixWorld),q=new Quaternion().setFromRotationMatrix(hand);first??=q.clone();turn=Math.max(turn,q.angleTo(first));
 }expect(turn).toBeGreaterThan(.01);disposeInfantryAnimation(a);
});

it('carries the bow with its marching elbow outside the shoulder',()=>{
 const a=createInfantryAnimation(archer,0);a.idle.setEffectiveWeight(0);a.walk.setEffectiveWeight(1);
 for(let f=0;f<72;f++){
  a.mixer.setTime(a.walk.getClip().duration*f/72);a.root.updateMatrixWorld(true);const inverse=a.root.getObjectByName('Chest')!.matrixWorld.clone().invert(),p=(name:string)=>a.root.getObjectByName(name)!.getWorldPosition(new Vector3()).applyMatrix4(inverse);
  expect(p('ForearmL').x-p('UpperArmL').x,`elbow at ${f}`).toBeGreaterThan(.015);
 }disposeInfantryAnimation(a);
});

it('keeps the full spear, including its butt, outside the body during combat',()=>{
 const a=createInfantryAnimation(spear,0);attachMilitaryEquipment(a.root,kit,'spear');a.idle.setEffectiveWeight(0);a.attack!.setEffectiveWeight(1);const box=new Box3().setFromObject(kit.scene.getObjectByName('Spear')!),body:SkinnedMesh[]=[];
 a.root.traverse(o=>{if(o instanceof SkinnedMesh){body.push(o);for(const m of Array.isArray(o.material)?o.material:[o.material])m.side=DoubleSide;}});const ray=new Raycaster();
 for(let f=0;f<=72;f++){
  a.mixer.setTime(a.attack!.getClip().duration*f/72);a.root.updateMatrixWorld(true);body.forEach(o=>{o.skeleton.update();o.computeBoundingBox();o.computeBoundingSphere();});const weapon=a.root.getObjectByName('Equipment Spear')!;
  for(const offset of [-.012,0,.012]){
   const start=new Vector3(offset,box.min.y,0).applyMatrix4(weapon.matrixWorld),end=new Vector3(offset,box.max.y,0).applyMatrix4(weapon.matrixWorld),d=end.sub(start);ray.set(start,d.clone().normalize());ray.far=d.length();
   for(const hit of ray.intersectObjects(body,false)){const m=hit.object as SkinnedMesh,indices=m.geometry.getAttribute('skinIndex');expect([hit.face!.a,hit.face!.b,hit.face!.c].every(i=>/^Hand[LR]$/.test(m.skeleton.bones[indices.getX(i)].name)),`shaft intersects body at ${f}`).toBe(true);}
  }
 }disposeInfantryAnimation(a);
});

it('keeps all four siege wrist bridges joined to cuff and palm in every clip',()=>{
 const a=createInfantryAnimation(crew,0),bridges:SkinnedMesh[]=[];a.root.traverse(o=>{if(o instanceof SkinnedMesh&&/Crew[LR]_Wrist[LR]/.test(o.name))bridges.push(o);});expect(bridges).toHaveLength(4);
 for(const action of [a.idle,a.walk,a.attack!]){
  [a.idle,a.walk,a.attack!].forEach(v=>v.setEffectiveWeight(v===action?1:0));
  for(let f=0;f<=24;f++){
   a.mixer.setTime(action.getClip().duration*f/24);a.root.updateMatrixWorld(true);
   for(const bridge of bridges){bridge.skeleton.update();const prefix=bridge.name.slice(0,6),side=bridge.name.at(-1)!,hand=a.root.getObjectByName(prefix+'Hand'+side)!,inverse=hand.matrixWorld.clone().invert(),positions=bridge.geometry.getAttribute('position');let back=Infinity,front=-Infinity,maxRadius=0;
    for(let i=0;i<positions.count;i++){const p=bridge.applyBoneTransform(i,new Vector3().fromBufferAttribute(positions,i)).applyMatrix4(bridge.matrixWorld).applyMatrix4(inverse);back=Math.min(back,p.y);front=Math.max(front,p.y);maxRadius=Math.max(maxRadius,Math.hypot(p.x,p.z));}
    expect(back).toBeLessThan(-.08);expect(front).toBeGreaterThan(.01);expect(maxRadius).toBeLessThan(.065);
   }
  }
 }disposeInfantryAnimation(a);
});

it('keeps both spear palms on the same shaft throughout the thrust and recovery',()=>{
 const a=createInfantryAnimation(spear,0);attachMilitaryEquipment(a.root,kit,'spear');a.idle.setEffectiveWeight(0);a.attack!.setEffectiveWeight(1);
 for(let f=0;f<=180;f++){
  a.mixer.setTime(a.attack!.getClip().duration*f/180);a.root.updateMatrixWorld(true);
  const weapon=a.root.getObjectByName('Equipment Spear')!,rear=a.root.getObjectByName('GripSpear')!.getWorldPosition(new Vector3()),front=a.root.getObjectByName('GripReins')!.getWorldPosition(new Vector3()),axis=new Vector3(0,1,0).transformDirection(weapon.matrixWorld),gap=front.sub(rear);
  expect(gap.clone().cross(axis).length(),`shaft contact at ${f}`).toBeLessThan(.008);expect(gap.dot(axis)).toBeGreaterThan(.26);expect(gap.length()).toBeLessThan(.31);
 }disposeInfantryAnimation(a);
});

it('bends the bow limbs without stretching the string and aims the nocked arrow forward',()=>{
 const a=createInfantryAnimation(archer,0);a.idle.setEffectiveWeight(0);a.attack!.setEffectiveWeight(1);
 for(let f=0;f<=120;f++){
  const t=f/120;a.mixer.setTime(a.attack!.getClip().duration*t);a.root.updateMatrixWorld(true);const nock=a.root.getObjectByName('BowNock')!.getWorldPosition(new Vector3());
  for(const name of ['BowUpper','BowLower'])expect(a.root.getObjectByName(name)!.getWorldPosition(new Vector3()).distanceTo(nock)).toBeCloseTo(.44,2);
  if(t>.35&&t<.55){const arrow=a.root.getObjectByName('BowArrow')!;expect(arrow.getWorldPosition(new Vector3()).distanceTo(nock)).toBeLessThan(.005);expect(new Vector3(0,1,0).transformDirection(arrow.matrixWorld).z).toBeGreaterThan(.9);}
 }disposeInfantryAnimation(a);
});

it('removes disconnected old string flakes from the authored bow mesh',()=>{
 const bow=archer.scene.getObjectByName('AuthoredBow') as SkinnedMesh,index=bow.skeleton.bones.findIndex(b=>b.name==='HandL'),positions=bow.geometry.getAttribute('position');expect(index).toBeGreaterThanOrEqual(0);
 const points=Array.from({length:positions.count},(_,i)=>new Vector3().fromBufferAttribute(positions,i).applyMatrix4(bow.bindMatrix).applyMatrix4(bow.skeleton.boneInverses[index])),indices=bow.geometry.index!;
 for(let i=0;i<indices.count;i+=3){
  const triangle=[0,1,2].map(j=>points[indices.getX(i+j)]);
  expect(triangle.every(p=>Math.abs(p.y+.168)<.007)&&triangle.some(p=>Math.abs(p.x)<.42),`old string triangle ${i/3}`).toBe(false);
 }
});

it.each(['spear','archer','horse'] as const)('%s has continuous wrist and elbow motion, including the loop seam',kind=>{
 const a=createInfantryAnimation({spear,archer,horse}[kind],0);a.idle.setEffectiveWeight(0);a.attack!.setEffectiveWeight(1);
 const previous=new Map<string,{q:Quaternion;p:Vector3}>();
 for(let f=0;f<=240;f++){
  a.mixer.setTime(a.attack!.getClip().duration*f/240);a.root.updateMatrixWorld(true);
  for(const name of ['HandL','HandR','ForearmL','ForearmR']){
   const bone=a.root.getObjectByName(name)!,q=bone.getWorldQuaternion(new Quaternion()),p=bone.getWorldPosition(new Vector3()),old=previous.get(name);
   if(old){expect(q.angleTo(old.q),`${name} rotation at ${f}`).toBeLessThan(.20);expect(p.distanceTo(old.p),`${name} movement at ${f}`).toBeLessThan(.025);}previous.set(name,{q,p});
  }
 }disposeInfantryAnimation(a);
});

it.each([0,3,7])('keeps the moving bowstring clear of body and bow arm through the cycle and transitions (seed %s)',seed=>{
 const a=createInfantryAnimation(archer,seed),body:SkinnedMesh[]=[];
 a.root.traverse(o=>{if(o instanceof SkinnedMesh&&o.name.startsWith('Infantry')){body.push(o);for(const m of Array.isArray(o.material)?o.material:[o.material])m.side=DoubleSide;}});expect(body.length).toBeGreaterThan(0);
 const ray=new Raycaster();
 function check(frame:number){
  a.root.updateMatrixWorld(true);body.forEach(o=>{o.skeleton.update();o.computeBoundingSphere();o.computeBoundingBox();});const hand=a.root.getObjectByName('HandL')!,centre=a.root.getObjectByName('BowNock')!.getWorldPosition(new Vector3());
  for(const sign of [-1,1])for(const offset of [-.002,0,.002]){
   const shift=new Vector3(0,0,1).transformDirection(hand.matrixWorld).multiplyScalar(offset),start=a.root.getObjectByName(sign>0?'BowUpper':'BowLower')!.getWorldPosition(new Vector3()).add(shift),end=centre.clone().add(shift),delta=end.sub(start);ray.set(start,delta.clone().normalize());ray.near=0;ray.far=delta.length();
   for(const hit of ray.intersectObjects(body,false)){
    const mesh=hit.object as SkinnedMesh,indices=mesh.geometry.getAttribute('skinIndex'),weights=mesh.geometry.getAttribute('skinWeight');
    const fingerContact=[hit.face!.a,hit.face!.b,hit.face!.c].every(i=>[0,1,2,3].some(c=>weights.getComponent(i,c)>.99&&mesh.skeleton.bones[indices.getComponent(i,c)].name==='HandR'));
    expect(fingerContact,`string/body intersection at frame ${frame}: ${[hit.face!.a,hit.face!.b,hit.face!.c].map(i=>mesh.skeleton.bones[indices.getX(i)].name).join(',')}`).toBe(true);
   }
  }
 }
 a.idle.setEffectiveWeight(0);a.attack!.setEffectiveWeight(1);
 for(let f=0;f<=120;f++){a.mixer.setTime(a.attack!.getClip().duration*f/120);check(f);}
 for(const [index,action] of [a.idle,a.walk].entries()){[a.idle,a.walk,a.attack!].forEach(v=>v.setEffectiveWeight(v===action?1:0));for(let f=0;f<=72;f++){a.mixer.setTime(action.getClip().duration*f/72);check(400+index*100+f);}}
 for(let f=0;f<180;f++){updateInfantryAnimation(a,f<45?'garrison':f<135?'battle':'marching',f/60,true);check(f+121);}
 disposeInfantryAnimation(a);
},30000);
