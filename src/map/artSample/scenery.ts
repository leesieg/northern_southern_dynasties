import {plantClearance} from './plantClearance';
import {Box3,BufferGeometry,Color,Float32BufferAttribute,Group,InstancedMesh,Mesh,MeshStandardMaterial,Object3D,DoubleSide} from 'three';
import {loadCampaignSampleAssets} from '../CampaignSampleAssets';
import {seededRandom} from '../sample/geography';
import {EXTENT,cityClearance,forestCover,palettes,plantable,type SampleSeason} from './layout';
import type {SampleTerrain} from './terrain';
import {createOutcrops} from './outcrops';
import {bankVegetation} from './bankVegetation';

export async function createScenery(terrain:SampleTerrain,report:(message:string)=>void){
 const assets=await loadCampaignSampleAssets(undefined,(n,total)=>report(`正在布置城郭与林地 · ${n} / ${total}`));
 const root=new Group(),trees:InstancedMesh[]=[],treeMaterials:MeshStandardMaterial[]=[],treeColors:Float32Array[]=[],random=seededRandom(5461011),dummy=new Object3D();
 const outcrops=await createOutcrops(terrain);root.add(outcrops.root);const banks=bankVegetation(terrain);root.add(banks.mesh);
 for(const town of terrain.cities){
  const city=assets.city({capital:town.id==='jiankang',south:true,style:'jiangnan',county:town.id!=='jiankang',fort:town.id==='jiankang'?3:1,levels:town.id==='jiankang'?[2,2,2]:[1,1,1],project:-1,progress:0,besieged:false,color:'#627b5f'},'close');
  const bounds=new Box3().setFromObject(city),scale=9.5*town.scale/(bounds.max.x-bounds.min.x);
  city.scale.setScalar(scale);city.position.set(town.x,town.height-bounds.min.y*scale+.035,town.z);city.traverse(o=>{if(o instanceof Mesh){o.castShadow=true;o.receiveShadow=true;}});root.add(city);
 }
 const canPlant=plantClearance(outcrops.placements);
 const placements:{x:number;z:number;y:number;size:number;angle:number;variant:number;tint:number}[]=[];
 // World anchored clusters; thinning keeps the same trees rather than re-rolling the forest.
 for(let z=-EXTENT.depth*.49;z<EXTENT.depth*.49;z+=.85)for(let x=-EXTENT.width*.49;x<EXTENT.width*.49;x+=.85){
  const px=x+(random()-.5)*1.2,pz=z+(random()-.5)*1.2,y=terrain.height(px,pz),bank=terrain.channel.sample(px,pz),cover=forestCover(px,pz,y);
  if(!plantable(px,pz,y,terrain.river(px,pz),terrain.cities)||!canPlant(px,pz,bank)||random()>cover*(.62+forestCover(px+8,pz-12,y)*.36))continue;
  if(Math.abs(terrain.height(px+.5,pz)-terrain.height(px-.5,pz))>2.6)continue;
  placements.push({x:px,z:pz,y,size:.5+cover*.65+random()*.95,angle:random()*Math.PI*2,variant:Math.floor(random()*3)+(Math.hypot(px,pz)<40?0:3),tint:.82+random()*.34});
 }
 for(let k=0;k<6;k++){
  const geometry=(k<3?assets.closeTrees[k]:assets.trees[k-3]).clone();geometry.computeBoundingBox();const bounds=geometry.boundingBox!,size=bounds.max.y-bounds.min.y;geometry.translate(0,-bounds.min.y,0);geometry.scale(1/size,1/size,1/size);
  treeColors.push(new Float32Array(geometry.getAttribute('color').array));
  const material=new MeshStandardMaterial({vertexColors:true,roughness:.96,transparent:true});treeMaterials.push(material);
  const items=placements.filter(p=>p.variant===k),mesh=new InstancedMesh(geometry,material,items.length);
  items.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.angle,0);dummy.scale.set(p.size*(k<3?1.2:1.5),p.size*(k<3?.83:.74),p.size*(k<3?1.2:1.5));dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,new Color().setScalar(p.tint));});
  mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();trees.push(mesh);root.add(mesh);
 }
 // Terrain-conforming, irregular field parcels, with their own banks and row detail.
 const fields=new Group(),fieldMaterials:MeshStandardMaterial[]=[];
 for(let k=0;k<5;k++){
  const material=new MeshStandardMaterial({color:'#aa9b57',roughness:1,side:DoubleSide});
  material.onBeforeCompile=shader=>{
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 fieldPoint;').replace('#include <begin_vertex>','#include <begin_vertex>\nfieldPoint=position;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 fieldPoint;').replace('#include <color_fragment>',`#include <color_fragment>
    float row=sin((fieldPoint.x*.93+fieldPoint.z*.37)*38.);float detail=1.-smoothstep(.2,1.5,length(fwidth(fieldPoint.xz))*38.);diffuseColor.rgb*=.96+row*.09*detail;
   `);
  };fieldMaterials.push(material);
 }
 const bankMaterial=new MeshStandardMaterial({color:'#665e37',roughness:1,side:DoubleSide});
 for(const town of terrain.cities){
  for(let iz=-6;iz<=6;iz++)for(let ix=-6;ix<=6;ix++){
   const x=town.x+ix*2.65+(random()-.5)*.6,z=town.z+iz*2.35+(random()-.5)*.6;
   if(cityClearance(x,z,terrain.cities)<7||Math.hypot(ix,iz)>5||terrain.river(x,z)<2.6||forestCover(x,z,terrain.height(x,z))>.29||random()<.40)continue;
   if(Math.abs(terrain.height(x+1,z)-terrain.height(x-1,z))>.45||Math.abs(terrain.height(x,z+1)-terrain.height(x,z-1))>.45)continue;
   const w=1.8+random()*.4,d=1.4+random()*.5,points=[{x:x-w/2,z:z-d/2},{x:x+w/2,z:z-d/2+.17},{x:x+w/2-.2,z:z+d/2},{x:x-w/2+.1,z:z+d/2-.1}];
   const pos:number[]=[],idx:number[]=[];
   // Subdivide each field so it conforms to actual relief without burying its centre.
   for(let j=0;j<=4;j++)for(let i=0;i<=4;i++){const u=i/4,v=j/4,px=(points[0].x*(1-u)+points[1].x*u)*(1-v)+(points[3].x*(1-u)+points[2].x*u)*v,pz=(points[0].z*(1-u)+points[1].z*u)*(1-v)+(points[3].z*(1-u)+points[2].z*u)*v;pos.push(px,terrain.height(px,pz)+.016,pz);if(i<4&&j<4){const a=j*5+i;idx.push(a,a+5,a+1,a+1,a+5,a+6);}}
   const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();const mesh=new Mesh(g,fieldMaterials[Math.floor(random()*5)]);mesh.receiveShadow=true;fields.add(mesh);
   terrain.ribbon([...points,points[0]],.035,bankMaterial);
  }
 }root.add(fields);
 // Reuse the approved hostel architecture for small roadside homesteads.
 const village=assets.city({capital:false,south:true,style:'jiangnan',county:true,fort:0,levels:[1,0,1],project:-1,progress:0,besieged:false,color:'#647557'},'regional');
 for(const p of [{x:12,z:11},{x:-14,z:17},{x:24,z:5}]){
  if(terrain.river(p.x,p.z)<3)continue;
  const model=village.clone(true),bounds=new Box3().setFromObject(model),s=1.8/(bounds.max.x-bounds.min.x);model.scale.setScalar(s);model.position.set(p.x,terrain.height(p.x,p.z)-bounds.min.y*s,p.z);model.traverse(o=>{if(o instanceof Mesh){o.castShadow=true;o.receiveShadow=true;}});root.add(model);
 }
 function season(value:SampleSeason){
  const p=palettes[value];
  trees.forEach((tree,k)=>{const colors=tree.geometry.getAttribute('color'),original=treeColors[k],leaf=new Color(p.leaf[k%3]);
   for(let i=0;i<colors.count;i++){const r=original[i*3],g=original[i*3+1],b=original[i*3+2],foliage=g>r*1.02&&g>b*1.1;
    const c=foliage?leaf.clone().multiplyScalar(.63+Math.min(1,g*2)*.6):new Color().setRGB(r,g,b);colors.setXYZ(i,c.r,c.g,c.b);}
   colors.needsUpdate=true;
  });
  fieldMaterials.forEach((m,k)=>m.color.set(p.field).multiplyScalar(.89+k*.033));outcrops.season(value);banks.season(value);bankMaterial.color.set(value==='winter'?'#858d79':'#665e37');
 }
 season('summer');
 function update(distance:number,paper:number){treeMaterials.forEach(m=>{m.opacity=1-paper*.93;});trees.forEach(t=>{t.visible=paper<.99;t.castShadow=distance<175;});banks.mesh.visible=paper<.2&&distance<135;fields.visible=paper<.9;outcrops.root.visible=paper<.95;root.traverse(o=>{if(o instanceof Mesh&&!(o instanceof InstancedMesh))o.castShadow=distance<175;});}
 return {root,season,update,treeCount:placements.length,assets,dispose(){assets.dispose();}};
}
