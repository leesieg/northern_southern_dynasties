/** Explicit offline asset export: CARRY_PREVIEW=1 npx vitest run this file. */
import {it} from 'vitest';
import {mkdirSync,writeFileSync} from 'node:fs';
import {Mesh,SkinnedMesh,Vector3} from 'three';
import {readInfantryTestAsset} from '../../src/map/infantryAsset.testSupport';
import {createInfantryAnimation,updateInfantryAnimation} from '../../src/map/RiggedInfantry';
import {attachMilitaryEquipment} from '../../src/map/MilitaryEquipment';
import {createMilitaryCarryPose,prepareMilitaryHands} from '../../src/map/MilitaryCarryPose';
it.skipIf(!process.env.CARRY_PREVIEW)('exports actual runtime deformed geometry for offline inspection',async()=>{
 const out=process.env.CARRY_OUT??'.cache/weapons/carry';mkdirSync(out,{recursive:true});
 const kit=await readInfantryTestAsset('weapons-v1.glb');
 for(const [kind,current,original] of [['foot','infantry-sword-shield-v2.glb','infantry-rigged-v1.glb'],['spear','spear-infantry-v2.glb','infantry-rigged-v1.glb'],['archer','archer-infantry-v2.glb','infantry-rigged-v1.glb'],['lightHorse','light-cavalry-v2.glb','light-cavalry-v1.glb'],['heavyHorse','heavy-cavalry-v2.glb','heavy-cavalry-v1.glb'],['siege','siege-crew-v2.glb','siege-crew-v1.glb']]){
  const file=process.env.CARRY_BASELINE?original:current;
  const asset=await readInfantryTestAsset(file);prepareMilitaryHands(asset.scene);
  for(const [state,frame] of [['garrison',0],['marching',90],['marching',108],['marching',126],...(asset.animations.some(c=>c.name==='Attack')?[['battle',24],['battle',39],['battle',54]]:[])]){
   const a=createInfantryAnimation(asset,0);if(!a.authoredCarry&&kind!=='siege'){a.carryPose=createMilitaryCarryPose(a.root,kind);a.carryPose();}if(kind!=='siege')attachMilitaryEquipment(a.root,kit,kind);
   for(let i=0;i<=frame;i++)updateInfantryAnimation(a,state,i/60,true);
   a.root.updateMatrixWorld(true);const objects=[];
   a.root.traverse(o=>{if(!(o instanceof Mesh))return;
    if(o instanceof SkinnedMesh)o.skeleton.update();
    const p=o.geometry.getAttribute('position'),uv=o.geometry.getAttribute('uv'),positions=[];
    for(let i=0;i<p.count;i++){const v=new Vector3().fromBufferAttribute(p,i);if(o instanceof SkinnedMesh)o.applyBoneTransform(i,v);v.applyMatrix4(o.matrixWorld);positions.push(v.x,-v.z,v.y);}
    const colour=o.geometry.getAttribute('color');const colours=colour?Array.from({length:colour.count},(_,i)=>[colour.getX(i),colour.getY(i),colour.getZ(i),colour.itemSize===4?colour.getW(i):1]).flat():[];
    objects.push({name:o.name,colours,positions,uv:Array.from(uv?.array??[]),indices:Array.from(o.geometry.index?.array??Array.from({length:p.count},(_,i)=>i))});
   });writeFileSync(`${out}/${kind}-${frame}.json`,JSON.stringify({file,objects}));
  }
 }
},60000);
