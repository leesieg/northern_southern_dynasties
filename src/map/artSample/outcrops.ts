import {Color,Group,InstancedMesh,Mesh,Object3D,type BufferGeometry} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {mapResource} from '../resourceLoader';
import {seededRandom} from '../sample/geography';
import {cityClearance,EXTENT,type SampleSeason} from './layout';
import {outcropMaterial} from './geologyMaterial';
import type {SampleTerrain} from './terrain';

export interface Outcrop {x:number;z:number;y:number;width:number;angle:number;variant:number;tint:number}
export function outcropPlacements(terrain:Pick<SampleTerrain,'height'|'channel'|'cities'>){
 const random=seededRandom(621011),items:Outcrop[]=[];
 const safe=(x:number,z:number)=>cityClearance(x,z,terrain.cities)>10&&(terrain.channel.sample(x,z)?.edge??Infinity)>1.2;
 for(let z=-EXTENT.depth*.44;z<EXTENT.depth*.44;z+=7)for(let x=-EXTENT.width*.44;x<EXTENT.width*.44;x+=7){
  const ax=x+(random()-.5)*5,az=z+(random()-.5)*5,h=terrain.height(ax,az),dx=terrain.height(ax+.7,az)-terrain.height(ax-.7,az),dz=terrain.height(ax,az+.7)-terrain.height(ax,az-.7),slope=Math.hypot(dx,dz)/1.4;
  if(h<.8||slope<.12||slope>1.6||!safe(ax,az)||random()<.32)continue;
  const angle=Math.atan2(-dz,dx),main=2.2+random()*2.1;
  // One exposed face, a lower shoulder and a downslope talus apron share a geological direction.
  for(let j=0;j<3;j++){
   const width=main*(j===0?1:j===1?.64:.40),offset=j===0?0:j===1?main*.52:main*.87;
   const px=ax-dx/(slope*1.4)*offset,pz=az-dz/(slope*1.4)*offset;
   if(!safe(px,pz))continue;
   const samples=[terrain.height(px,pz),terrain.height(px-width*.20,pz),terrain.height(px+width*.20,pz),terrain.height(px,pz-width*.20),terrain.height(px,pz+width*.20)];
   items.push({x:px,z:pz,y:Math.min(...samples)-width*.14,width,angle:angle+(random()-.5)*.22,variant:j===2?2:Math.floor(random()*2),tint:.91+random()*.16});
  }
 }
 for(const line of terrain.channel.profiles)for(let i=4;i<line.length;i+=9){
  const p=line[i],side=random()<.5?-1:1,bank=side<0?p.leftBank:p.rightBank,width=(side<0?p.left:p.right)+bank*.45,x=p.x+p.nx*width*side,z=p.z+p.nz*width*side;
  if(Math.abs(x)>EXTENT.width*.47||Math.abs(z)>EXTENT.depth*.47||cityClearance(x,z,terrain.cities)<10||random()<.62)continue;
  const size=.36+random()*.45;items.push({x,z,y:terrain.height(x,z)-size*.2,width:size,angle:Math.atan2(p.nx,p.nz),variant:2,tint:.78+random()*.1});
 }
 return items;
}

export async function createOutcrops(terrain:SampleTerrain){
 const loader=new GLTFLoader(),models=await Promise.all([0,1,2].map(async i=>loader.parseAsync(await mapResource(`art/campaign/art-sample/outcrop-${i}.glb`).then(r=>r.arrayBuffer()),'')));
 const geometries=models.map(asset=>{
  asset.scene.updateMatrixWorld(true);const parts:BufferGeometry[]=[];
  asset.scene.traverse(o=>{if(o instanceof Mesh){const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld);for(const name of Object.keys(geometry.attributes))if(!['position','normal','color'].includes(name))geometry.deleteAttribute(name);parts.push(geometry);}});
  const geometry=mergeGeometries(parts)!;parts.forEach(g=>g.dispose());geometry.computeBoundingBox();const box=geometry.boundingBox!,width=box.max.x-box.min.x;geometry.translate(-(box.max.x+box.min.x)*.5,-box.min.y,-(box.max.z+box.min.z)*.5);geometry.scale(1/width,1/width,1/width);
  asset.scene.traverse(o=>{if(o instanceof Mesh){o.geometry.dispose();for(const material of Array.isArray(o.material)?o.material:[o.material])material.dispose();}});return geometry;
 });
 const placements=outcropPlacements(terrain),root=new Group(),material=outcropMaterial(terrain.atlas),dummy=new Object3D();
 geometries.forEach((geometry,variant)=>{const items=placements.filter(p=>p.variant===variant),mesh=new InstancedMesh(geometry,material,items.length);
  items.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.angle,0);dummy.scale.set(p.width,p.width*.85,p.width*.95);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,new Color().setScalar(p.tint));});
  mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();root.add(mesh);
 });
 return {root,placements,season(value:SampleSeason){material.color.set(value==='winter'?'#cbd3cf':'#ffffff');}};
}
