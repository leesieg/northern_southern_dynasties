/** Explicit offline asset export: CARRY_PREVIEW=1 npx vitest run this file. */
import {it} from 'vitest';
import {mkdirSync,writeFileSync} from 'node:fs';
import {Mesh,SkinnedMesh,Vector3} from 'three';
import {readInfantryTestAsset} from '../../src/map/infantryAsset.testSupport';
import {createInfantryAnimation,updateInfantryAnimation} from '../../src/map/RiggedInfantry';
import {attachMilitaryEquipment} from '../../src/map/MilitaryEquipment';
import {createMilitaryCarryPose,prepareMilitaryHands} from '../../src/map/MilitaryCarryPose';
it.skipIf(!process.env.CARRY_PREVIEW)('exports actual runtime deformed geometry for offline inspection',async()=>{
 const out='.cache/weapons/carry';mkdirSync(out,{recursive:true});
 const kit=await readInfantryTestAsset('weapons-v1.glb');
 for(const [kind,file] of [['foot','infantry-rigged-v1.glb'],['spear','infantry-rigged-v1.glb'],['archer','infantry-rigged-v1.glb'],['lightHorse','light-cavalry-v1.glb'],['heavyHorse','heavy-cavalry-v1.glb']]){
  const asset=await readInfantryTestAsset(file);prepareMilitaryHands(asset.scene);
  for(const [state,frame] of [['garrison',0],['marching',90],['marching',108],['marching',126]]){
   const a=createInfantryAnimation(asset,0);a.carryPose=createMilitaryCarryPose(a.root,kind);a.carryPose();attachMilitaryEquipment(a.root,kit,kind);
   for(let i=0;i<=frame;i++)updateInfantryAnimation(a,state,i/60,true);
   a.root.updateMatrixWorld(true);const objects=[];
   a.root.traverse(o=>{if(!(o instanceof Mesh))return;
    if(o instanceof SkinnedMesh)o.skeleton.update();
    const p=o.geometry.getAttribute('position'),uv=o.geometry.getAttribute('uv'),positions=[];
    for(let i=0;i<p.count;i++){const v=new Vector3().fromBufferAttribute(p,i);if(o instanceof SkinnedMesh)o.applyBoneTransform(i,v);v.applyMatrix4(o.matrixWorld);positions.push(v.x,-v.z,v.y);}
    objects.push({name:o.name,positions,uv:Array.from(uv?.array??[]),indices:Array.from(o.geometry.index?.array??Array.from({length:p.count},(_,i)=>i))});
   });writeFileSync(`${out}/${kind}-${frame}.json`,JSON.stringify({file,objects}));
  }
 }
},60000);
