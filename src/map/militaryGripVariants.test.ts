import {beforeAll,expect,it} from 'vitest';
import {DoubleSide,Quaternion,Raycaster,SkinnedMesh,Vector3} from 'three';
import {readInfantryTestAsset} from './infantryAsset.testSupport';
import {createInfantryAnimation,disposeInfantryAnimation,updateInfantryAnimation} from './RiggedInfantry';
import {attachMilitaryEquipment} from './MilitaryEquipment';
import {prepareMilitaryHands} from './MilitaryCarryPose';
import type {ArmyModelKind} from './MilitaryModels';

const files={foot:'infantry-sword-shield-v2',spear:'spear-infantry-v2',archer:'archer-infantry-v2',lightHorse:'light-cavalry-v2',heavyHorse:'heavy-cavalry-v2',siege:'siege-crew-v2'};
type Asset=Awaited<ReturnType<typeof readInfantryTestAsset>>;
let assets:Record<ArmyModelKind,Asset>,kit:Asset;
beforeAll(async()=>{assets=Object.fromEntries(await Promise.all(Object.entries(files).map(async([kind,file])=>[kind,await readInfantryTestAsset(file+'.glb')]))) as typeof assets;kit=await readInfantryTestAsset('weapons-v1.glb');});

it.each(Object.keys(files) as ArmyModelKind[])('%s uses authored, neutral wrists in every clip without runtime mesh warping',kind=>{
 const a=createInfantryAnimation(assets[kind],0);expect(a.authoredCarry).toBe(true);expect(a.attack).toBeDefined();
 const skins:SkinnedMesh[]=[];a.root.traverse(o=>{if(o instanceof SkinnedMesh)skins.push(o);});const before=skins.map(o=>o.geometry.getAttribute('position').array.slice());prepareMilitaryHands(a.root);skins.forEach((o,i)=>expect(o.geometry.getAttribute('position').array).toEqual(before[i]));
 for(const action of [a.idle,a.walk,a.attack!]){
  [a.idle,a.walk,a.attack!].forEach(v=>v.setEffectiveWeight(v===action?1:0));
  for(let f=0;f<=48;f++){
   a.mixer.setTime(action.getClip().duration*f/48);a.root.updateMatrixWorld(true);
   a.root.traverse(b=>{if(!/Hand[LR]$/.test(b.name.replaceAll('.','')))return;const fore=a.root.getObjectByName(b.name.replace('Hand','Forearm'));if(!fore)return;
    const foreAxis=b.getWorldPosition(new Vector3()).sub(fore.getWorldPosition(new Vector3())).normalize(),palmAxis=new Vector3(0,1,0).transformDirection(b.matrixWorld);
    expect(foreAxis.dot(palmAxis),`${kind} ${action.getClip().name} ${f}: ${b.name} wrist bend`).toBeGreaterThan(Math.cos(Math.PI/6));
   });
   expect(a.root.position.toArray()).toEqual([0,0,0]);
  }
 }
 disposeInfantryAnimation(a);
});

it.each(['foot','lightHorse'] as const)('%s holds the sword upright with the sharp edge facing the enemy',kind=>{
 const a=createInfantryAnimation(assets[kind],0);attachMilitaryEquipment(a.root,kit,kind);
 for(const action of [a.idle,a.walk]){a.idle.setEffectiveWeight(action===a.idle?1:0);a.walk.setEffectiveWeight(action===a.walk?1:0);
  for(let f=0;f<24;f++){a.mixer.setTime(action.getClip().duration*f/24);a.root.updateMatrixWorld(true);const p=a.root.getObjectByName('Equipment Sword')!;
   // The supplied blade is sharp at local -X, broad along X, long along Y.
   expect(new Vector3(-1,0,0).transformDirection(p.matrixWorld).z).toBeGreaterThan(.85);
   expect(new Vector3(0,1,0).transformDirection(p.matrixWorld).y).toBeGreaterThan(.9);
   expect(p.position.length()).toBe(0);expect(p.parent?.name).toBe('GripSword');
  }
 }disposeInfantryAnimation(a);
});

it.each(['spear','archer','lightHorse','heavyHorse'] as const)('%s equipment follows dedicated sockets through state transitions',kind=>{
 const a=createInfantryAnimation(assets[kind],5);a.mounted=kind==='lightHorse'||kind==='heavyHorse';attachMilitaryEquipment(a.root,kit,kind);
 for(let f=0;f<180;f++){
  updateInfantryAnimation(a,f<45?'garrison':f<90?'marching':f<150?'battle':'marching',f/30,true);a.root.updateMatrixWorld(true);
  expect(a.idle.getEffectiveWeight()+a.walk.getEffectiveWeight()+a.attack!.getEffectiveWeight()).toBeCloseTo(1,5);
  a.root.traverse(p=>{if(!p.name.startsWith('Equipment '))return;expect(p.parent?.name).toBe('Grip'+p.name.slice(10));expect(p.position.length()).toBe(0);expect(p.getWorldPosition(new Vector3()).toArray().every(Number.isFinite)).toBe(true);});
 }disposeInfantryAnimation(a);
});

it.each(['lightHorse','heavyHorse','siege'] as const)('%s preserves the existing horse or mechanism geometry and animation',async kind=>{
 const old=await readInfantryTestAsset(files[kind].replace('-v2','-v1')+'.glb'),a=createInfantryAnimation(assets[kind],0),b=createInfantryAnimation(old,0);
 const names=kind==='siege'?['ChassisMesh','ThrowArmMesh','PouchMesh','ProjectileMesh']:['Horse'];
 for(const name of names){const meshes=(root:typeof a.root)=>{const result:SkinnedMesh[]=[];root.getObjectByName(name)!.traverse(o=>{if(o instanceof SkinnedMesh)result.push(o);});return result;},original=meshes(b.root),current=meshes(a.root);expect(current.length).toBe(original.length);expect(current.length).toBeGreaterThan(0);current.forEach((o,i)=>expect(o.geometry.getAttribute('position').array).toEqual(original[i].geometry.getAttribute('position').array));}
 for(const name of kind==='siege'?['Idle','Walk','Attack']:['Idle','Walk']){
  for(const model of [a,b])[model.idle,model.walk,model.attack].forEach(v=>v?.setEffectiveWeight(v.getClip().name===name?1:0));
  for(let f=0;f<=24;f++){const seconds=old.animations.find(c=>c.name===name)!.duration*f/24;for(const model of [a,b]){model.mixer.setTime(seconds);model.root.updateMatrixWorld(true);}
   for(const joint of kind==='siege'?['Chassis','ThrowArm','Pouch','Projectile','HaulRope']:['HorseBody','HorseHead']){const first=a.root.getObjectByName(joint)!,second=b.root.getObjectByName(joint)!;first.matrixWorld.elements.forEach((v,i)=>expect(v).toBeCloseTo(second.matrixWorld.elements[i],5));}
  }
 }disposeInfantryAnimation(a);disposeInfantryAnimation(b);
});

it.each(['lightHorse','heavyHorse'] as const)('%s keeps both reins gathered in its left hand',kind=>{
 const a=createInfantryAnimation(assets[kind],0);const reins:SkinnedMesh[]=[];a.root.traverse(o=>{if(o instanceof SkinnedMesh&&o.name.startsWith('Rein'))reins.push(o);});expect(reins).toHaveLength(2);
 for(const action of [a.idle,a.walk,a.attack!]){[a.idle,a.walk,a.attack!].forEach(v=>v.setEffectiveWeight(v===action?1:0));for(let f=0;f<24;f++){
  a.mixer.setTime(action.getClip().duration*f/24);a.root.updateMatrixWorld(true);const grip=a.root.getObjectByName('GripReins')!.getWorldPosition(new Vector3());
  for(const mesh of reins){mesh.skeleton.update();const p=mesh.geometry.getAttribute('position');let gap=Infinity;for(let i=0;i<p.count;i++)gap=Math.min(gap,mesh.applyBoneTransform(i,new Vector3().fromBufferAttribute(p,i)).applyMatrix4(mesh.matrixWorld).distanceTo(grip));expect(gap).toBeLessThan(.02);}
 }}disposeInfantryAnimation(a);
});

it('orients the bowstring towards the archer and keeps the nocking hand on it',()=>{
 const a=createInfantryAnimation(assets.archer,0);attachMilitaryEquipment(a.root,kit,'archer');a.idle.setEffectiveWeight(0);a.attack!.setEffectiveWeight(1);
 for(let f=0;f<48;f++){a.mixer.setTime(a.attack!.getClip().duration*f/48);a.root.updateMatrixWorld(true);const bow=a.root.getObjectByName('Equipment Bow')!,string=new Vector3(0,0,.233).applyMatrix4(bow.matrixWorld),grip=a.root.getObjectByName('GripSword')!.getWorldPosition(new Vector3());expect(new Vector3(0,0,1).transformDirection(bow.matrixWorld).z).toBeLessThan(-.6);expect(grip.distanceTo(string)).toBeLessThan(.025);}
 disposeInfantryAnimation(a);
});

it.each(['spear','heavyHorse'] as const)('%s thrusts with its elbow below the grip and no wrist flips',kind=>{
 const a=createInfantryAnimation(assets[kind],0);attachMilitaryEquipment(a.root,kit,kind);a.idle.setEffectiveWeight(0);a.attack!.setEffectiveWeight(1);const hand=a.root.getObjectByName('HandR')!,elbow=a.root.getObjectByName('ForearmR')!,shoulder=a.root.getObjectByName('UpperArmR')!,previous=new Quaternion();
 for(let f=0;f<=144;f++){a.mixer.setTime(a.attack!.getClip().duration*f/144);a.root.updateMatrixWorld(true);const wrist=hand.getWorldPosition(new Vector3()),joint=elbow.getWorldPosition(new Vector3()),upper=shoulder.getWorldPosition(new Vector3()),turn=hand.getWorldQuaternion(new Quaternion());
  expect(wrist.y-joint.y,`${kind} ${f}: elbow below hand`).toBeGreaterThan(.07);expect(joint.y-upper.y,`${kind} ${f}: elbow below shoulder`).toBeLessThan(.01);
  if(f)expect(turn.angleTo(previous),`${kind} ${f}: wrist angular step`).toBeLessThan(.12);previous.copy(turn);
 }disposeInfantryAnimation(a);
});

it('keeps the actual bowstring ribbon out of the arms through clips and transitions',()=>{
 const a=createInfantryAnimation(assets.archer,0);attachMilitaryEquipment(a.root,kit,'archer');const body:SkinnedMesh[]=[];a.root.traverse(o=>{if(o instanceof SkinnedMesh){body.push(o);for(const mat of Array.isArray(o.material)?o.material:[o.material])mat.side=DoubleSide;}});const ray=new Raycaster();
 for(let f=0;f<240;f++){
  updateInfantryAnimation(a,f<60?'garrison':f<120?'marching':f<210?'battle':'garrison',f/30,true);a.root.updateMatrixWorld(true);body.forEach(o=>{o.skeleton.update();o.computeBoundingSphere();o.computeBoundingBox();});const bow=a.root.getObjectByName('Equipment Bow')!;
  // Measured from the actual kit: the broad string is at Z=.230–.235,
  // X=±.029. Check both edges as well as its centre, not just the grip.
  for(const x of [-.027,0,.027])for(const z of [.230,.235]){const start=new Vector3(x,-.38,z).applyMatrix4(bow.matrixWorld),end=new Vector3(x,.38,z).applyMatrix4(bow.matrixWorld),delta=end.clone().sub(start);ray.set(start,delta.clone().normalize());ray.far=delta.length();
   for(const hit of ray.intersectObjects(body,false)){const mesh=hit.object as SkinnedMesh,indices=mesh.geometry.getAttribute('skinIndex'),weights=mesh.geometry.getAttribute('skinWeight');
    const fingerContact=[hit.face!.a,hit.face!.b,hit.face!.c].every(i=>[0,1,2,3].some(c=>weights.getComponent(i,c)>.99&&mesh.skeleton.bones[indices.getComponent(i,c)].name.replaceAll('.','')==='HandR'));
    const joints=[hit.face!.a,hit.face!.b,hit.face!.c].map(i=>mesh.skeleton.bones[indices.getX(i)].name).join(',');expect(fingerContact,`bowstring hits ${joints} at frame ${f}`).toBe(true);
   }
  }
 }disposeInfantryAnimation(a);
},15000);

it('keeps both siege operators on the original animated mechanism contact paths',async()=>{
 const a=createInfantryAnimation(assets.siege,0),b=createInfantryAnimation(await readInfantryTestAsset('siege-crew-v1.glb'),0);
 b.root.updateMatrixWorld(true);const idleLeft=b.root.getObjectByName('CrewR_HandR')!.getWorldPosition(new Vector3()).add(new Vector3(0,0,.06)),idleRight=b.root.getObjectByName('CrewR_HandL')!.getWorldPosition(new Vector3()).add(new Vector3(0,0,.06));
 const smooth=(from:number,to:number,t:number)=>{const u=Math.max(0,Math.min(1,(t-from)/(to-from)));return u*u*(3-2*u);};
 for(const name of ['Idle','Walk','Attack']){
  for(const model of [a,b])[model.idle,model.walk,model.attack!].forEach(v=>v.setEffectiveWeight(v.getClip().name===name?1:0));
  for(let f=0;f<48;f++){const seconds=[b.idle,b.walk,b.attack!].find(v=>v.getClip().name===name)!.getClip().duration*f/48;for(const model of [a,b]){model.mixer.setTime(seconds);model.root.updateMatrixWorld(true);}
   // Old targets crossed the arms; each corrected hand takes the same-side path.
   for(const prefix of ['CrewL_','CrewR_'])for(const side of ['L','R']){let target=b.root.getObjectByName(prefix+'Hand'+(side==='L'?'R':'L'))!.getWorldPosition(new Vector3()).add(new Vector3(0,0,.06));
    if(name==='Attack'&&prefix==='CrewR_'){const load=smooth(.45,1.1,seconds)*(1-smooth(2.05,2.7,seconds));target=side==='R'?idleRight:b.root.getObjectByName('CrewR_HandL')!.getWorldPosition(new Vector3()).add(new Vector3(0,0,.06)).add(idleLeft.clone().sub(idleRight).multiplyScalar(1-load));}
    const palm=a.root.getObjectByName(prefix+'GripTool'+side)!.getWorldPosition(new Vector3());expect(palm.distanceTo(target),`${name} ${f} ${prefix}${side}`).toBeLessThan(.025);}
  }
 }disposeInfantryAnimation(a);disposeInfantryAnimation(b);
});
