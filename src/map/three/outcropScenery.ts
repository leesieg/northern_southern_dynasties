import {Color,Group,InstancedMesh,Object3D,type Texture} from 'three';
import {loadOutcropGeometries,outcropPlacements} from '../artSample/outcrops';
import {outcropMaterial} from '../artSample/geologyMaterial';
import {bankVegetation} from '../artSample/bankVegetation';
import type {riverShape} from '../artSample/riverShape';
import type {Season} from '../sample/seasons';
/** The approved rock assets/materials, streamed around the real campaign camera. */
export async function outcropScenery(atlas:Texture|undefined,signal?:AbortSignal){
 const geometries=await loadOutcropGeometries(signal),material=outcropMaterial(atlas),root=new Group(),dummy=new Object3D();
 const rocks=geometries.map(g=>{const mesh=new InstancedMesh(g,material,900);mesh.count=0;mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);return mesh;});
 let reeds:ReturnType<typeof bankVegetation>|undefined;
 function clearReeds(){if(reeds){root.remove(reeds.mesh);reeds.mesh.geometry.dispose();reeds.mesh.material.dispose();reeds.mesh.dispose();reeds=undefined;}}
 return {root,refresh(center:{x:number;z:number},range:number,height:(x:number,z:number)=>number,channel:ReturnType<typeof riverShape>,cities:{x:number;z:number}[],visible:(x:number,z:number)=>boolean){
  const bounds={minX:center.x-range,maxX:center.x+range,minZ:center.z-range,maxZ:center.z+range};
  rocks.forEach(m=>{m.count=0;});
  for(const p of outcropPlacements({height,channel,cities} as Parameters<typeof outcropPlacements>[0],bounds)){
   const mesh=rocks[p.variant];if(mesh.count>=900||!visible(p.x,p.z))continue;
   dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(p.pitch,p.angle,0,'YXZ');dummy.scale.set(p.width,p.width*p.rise,p.width*p.depth);dummy.updateMatrix();mesh.setMatrixAt(mesh.count,dummy.matrix);mesh.setColorAt(mesh.count++,new Color().setScalar(p.tint));
  }
  rocks.forEach(m=>{m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;m.computeBoundingSphere();});
  clearReeds();const profiles=channel.profiles.map(line=>line.filter(p=>p.x>=bounds.minX&&p.x<=bounds.maxX&&p.z>=bounds.minZ&&p.z<=bounds.maxZ&&visible(p.x,p.z)));
  reeds=bankVegetation({height,channel:{...channel,profiles}},bounds);root.add(reeds.mesh);
 },update(visible:boolean,season:Season){root.visible=visible;material.color.set(season==='winter'?'#cbd3cf':'#ffffff');reeds?.season(season==='spring'?'summer':season);},dispose(){clearReeds();rocks.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());material.dispose();}};
}
