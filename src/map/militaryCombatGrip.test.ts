import {beforeAll,expect,it} from 'vitest';
import {DoubleSide,Quaternion,Raycaster,SkinnedMesh,Vector3} from 'three';
import {readInfantryTestAsset} from './infantryAsset.testSupport';
import {createInfantryAnimation,disposeInfantryAnimation,updateInfantryAnimation} from './RiggedInfantry';
import {attachMilitaryEquipment} from './MilitaryEquipment';

type Asset=Awaited<ReturnType<typeof readInfantryTestAsset>>;
let spear:Asset,archer:Asset,horse:Asset,kit:Asset;
beforeAll(async()=>{[spear,archer,horse,kit]=await Promise.all(['spear-infantry-v2.glb','archer-infantry-v2.glb','heavy-cavalry-v2.glb','weapons-v1.glb'].map(readInfantryTestAsset));});

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

it('keeps the moving bowstring clear of the body and bow arm through the cycle and transitions',()=>{
 const a=createInfantryAnimation(archer,0),body:SkinnedMesh[]=[];
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
 for(let f=0;f<180;f++){updateInfantryAnimation(a,f<45?'garrison':f<135?'battle':'marching',f/60,true);check(f+121);}
 disposeInfantryAnimation(a);
},15000);
