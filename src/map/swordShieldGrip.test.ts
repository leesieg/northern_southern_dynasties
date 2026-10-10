import {beforeAll,expect,it} from 'vitest';
import {DoubleSide,Matrix4,Mesh,Raycaster,SkinnedMesh,Triangle,Vector3} from 'three';
import {readInfantryTestAsset} from './infantryAsset.testSupport';
import {createInfantryAnimation,disposeInfantryAnimation,updateInfantryAnimation} from './RiggedInfantry';
import {attachMilitaryEquipment} from './MilitaryEquipment';
import {prepareMilitaryHands} from './MilitaryCarryPose';
let asset:Awaited<ReturnType<typeof readInfantryTestAsset>>,kit:typeof asset;
beforeAll(async()=>{[asset,kit]=await Promise.all([readInfantryTestAsset('infantry-sword-shield-v2.glb'),readInfantryTestAsset('weapons-v1.glb')]);});
it('preserves body, face and armour triangles and their winding outside the replaced hands',async()=>{
 const original=await readInfantryTestAsset();const triangles=(root:typeof asset.scene,onlyBody=false)=>{const result=new Set<string>();root.traverse(o=>{if(!(o instanceof SkinnedMesh))return;const p=o.geometry.getAttribute('position'),index=o.geometry.index;for(let i=0;i<(index?.count??p.count);i+=3){const points=[0,1,2].map(j=>new Vector3().fromBufferAttribute(p,index?index.getX(i+j):i+j));if(onlyBody&&!points.every(v=>v.y>1.05)&&!points.every(v=>v.y<.6)&&!points.every(v=>Math.abs(v.x)<.29))continue;const keys=points.map(v=>v.toArray().map(n=>n.toFixed(5)).join(','));result.add([keys.join('|'),[keys[1],keys[2],keys[0]].join('|'),[keys[2],keys[0],keys[1]].join('|')].sort()[0]);}});return result;};const expected=triangles(original.scene,true),actual=triangles(asset.scene);expect(expected.size).toBeGreaterThan(1000);for(const tri of expected)expect(actual.has(tri)).toBe(true);
});
it('uses authored joint clips and fixed sockets without a second runtime hand deformation',()=>{
 const a=createInfantryAnimation(asset,3);expect(a.authoredCarry).toBe(true);expect(a.attack).toBeDefined();let skin!:SkinnedMesh;a.root.traverse(o=>{if(o instanceof SkinnedMesh)skin=o;});const before=skin.geometry.getAttribute('position').array.slice();prepareMilitaryHands(a.root);expect(skin.geometry.getAttribute('position').array).toEqual(before);attachMilitaryEquipment(a.root,kit,'foot');expect(a.root.getObjectByName('Equipment Sword')?.parent?.name).toBe('GripSword');expect(a.root.getObjectByName('Equipment Shield')?.parent?.name).toBe('GripShield');disposeInfantryAnimation(a);
});
it('puts skin in contact with the actual sword handle and the horizontal shield grip',()=>{
 const a=createInfantryAnimation(asset,0);attachMilitaryEquipment(a.root,kit,'foot');a.root.updateMatrixWorld(true);
 for(const [name,side] of [['Sword','R'],['Shield','L']]){const prop=a.root.getObjectByName('Equipment '+name)!,inverse=prop.matrixWorld.clone().invert(),triangles:Triangle[]=[],points:Vector3[]=[];
  prop.traverse(o=>{if(!(o instanceof Mesh))return;const p=o.geometry.getAttribute('position'),index=o.geometry.index,transform=new Matrix4().multiplyMatrices(inverse,o.matrixWorld);for(let i=0;i<(index?.count??p.count);i+=3){const v=[0,1,2].map(j=>new Vector3().fromBufferAttribute(p,index?index.getX(i+j):i+j).applyMatrix4(transform)),center=v[0].clone().add(v[1]).add(v[2]).multiplyScalar(1/3);if(Math.abs(center.y)<.06&&Math.abs(center.x)<.14&&Math.abs(center.z)<.07)triangles.push(new Triangle(v[0],v[1],v[2]));}});
  a.root.traverse(o=>{if(!(o instanceof SkinnedMesh))return;o.skeleton.update();const bone=o.skeleton.bones.findIndex(b=>b.name.replaceAll('.','')==='Hand'+side),p=o.geometry.getAttribute('position'),indices=o.geometry.getAttribute('skinIndex'),weights=o.geometry.getAttribute('skinWeight'),transform=new Matrix4().multiplyMatrices(inverse,o.matrixWorld);for(let i=0;i<p.count;i++){if(![0,1,2,3].some(c=>indices.getComponent(i,c)===bone&&weights.getComponent(i,c)>.99))continue;const v=o.applyBoneTransform(i,new Vector3().fromBufferAttribute(p,i)).applyMatrix4(transform);if(Math.abs(v.y)<.055&&v.length()<.11)points.push(v);}});
  let nearest=Infinity;const closest=new Vector3();for(const point of points)for(const tri of triangles)nearest=Math.min(nearest,tri.closestPointToPoint(point,closest).distanceTo(point));expect(points.length).toBeGreaterThan(10);expect(triangles.length).toBeGreaterThan(10);expect(nearest,name+' grip gap').toBeLessThan(.012);
 }
 disposeInfantryAnimation(a);
});
it.each(['garrison','marching','battle'] as const)('keeps sword and shield attached and out of the body during %s',state=>{
 const a=createInfantryAnimation(asset,0);attachMilitaryEquipment(a.root,kit,'foot');const body:SkinnedMesh[]=[];a.root.traverse(o=>{if(o instanceof SkinnedMesh){body.push(o);for(const mat of Array.isArray(o.material)?o.material:[o.material])mat.side=DoubleSide;}});const ray=new Raycaster();
 const paths={Sword:[[[0,.12,0],[0,.80,0]]],Shield:[[[-.24,-.35,.05],[.24,-.35,.05]],[[-.24,.35,.05],[.24,.35,.05]]]};
 for(let frame=0;frame<288;frame++){
  updateInfantryAnimation(a,state,frame/60,true);a.root.updateMatrixWorld(true);body.forEach(m=>{m.skeleton.update();m.computeBoundingBox();m.computeBoundingSphere();});
  for(const [name,segments] of Object.entries(paths)){const prop=a.root.getObjectByName('Equipment '+name)!,grip=prop.getWorldPosition(new Vector3());expect(prop.position.length()).toBe(0);expect(prop.quaternion.w).toBe(1);
   for(const [start,end] of segments){const from=new Vector3(...start).applyMatrix4(prop.matrixWorld),to=new Vector3(...end).applyMatrix4(prop.matrixWorld),delta=to.clone().sub(from);ray.set(from,delta.clone().normalize());ray.far=delta.length();for(const hit of ray.intersectObjects(body,false))expect(hit.point.distanceTo(grip),`${state} ${name} at ${frame/60}s`).toBeLessThan(.11);}
  }
  expect(a.root.position.toArray()).toEqual([0,0,0]);
 }
 disposeInfantryAnimation(a);
});
it('keeps wrists neutral and the pose stable through state transitions and pauses',()=>{
 const a=createInfantryAnimation(asset,4);attachMilitaryEquipment(a.root,kit,'foot');let skin!:SkinnedMesh;a.root.traverse(o=>{if(o instanceof SkinnedMesh)skin=o;});const find=(name:string)=>skin.skeleton.bones.find(b=>b.name.replaceAll('.','')===name)!;
 for(let i=0;i<600;i++){updateInfantryAnimation(a,i<150?'garrison':i<300?'marching':i<480?'battle':'garrison',i/60,true);a.root.updateMatrixWorld(true);for(const side of ['R','L']){const fore=find('Forearm'+side),hand=find('Hand'+side),direction=hand.getWorldPosition(new Vector3()).sub(fore.getWorldPosition(new Vector3())).normalize(),palmForward=new Vector3(0,1,0).transformDirection(hand.matrixWorld);expect(direction.dot(palmForward)).toBeGreaterThan(Math.cos(Math.PI/6));}}
 updateInfantryAnimation(a,'garrison',11,false);const q=find('HandR').quaternion.clone();for(let i=0;i<10;i++)updateInfantryAnimation(a,'garrison',12+i,false);expect(find('HandR').quaternion.toArray()).toEqual(q.toArray());disposeInfantryAnimation(a);
});
it('staggers authored sword attacks without changing grip alignment',()=>{
 const a=createInfantryAnimation(asset,1),b=createInfantryAnimation(asset,8);for(let i=0;i<35;i++){updateInfantryAnimation(a,'battle',i/60,true);updateInfantryAnimation(b,'battle',i/60,true);}expect(a.root.getObjectByName('GripSword')!.getWorldPosition(new Vector3()).distanceTo(b.root.getObjectByName('GripSword')!.getWorldPosition(new Vector3()))).toBeGreaterThan(.03);disposeInfantryAnimation(a);disposeInfantryAnimation(b);
});
