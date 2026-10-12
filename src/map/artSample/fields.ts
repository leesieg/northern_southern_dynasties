import {BufferGeometry,Float32BufferAttribute,Group,Mesh,MeshStandardMaterial,DoubleSide} from 'three';
import {seededRandom} from '../sample/geography';
import {cityClearance,forestCover,palettes,type SampleSeason,type Point} from './layout';
/** Decorative farmland around actual cities; no production or building state is invented. */
export function createFields(terrain:{cities:Point[];height:(x:number,z:number)=>number;river:(x:number,z:number)=>number}){
 const random=seededRandom(5461011);
 const root=new Group(),fields=root,fieldMaterials:MeshStandardMaterial[]=[];
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
   const outline=[...points,points[0]],verts:number[]=[];
   for(let i=1;i<outline.length;i++){const a=outline[i-1],b=outline[i],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz)||1;const row=[a,b].flatMap(p=>[-1,1].map(side=>({x:p.x-dz/len*.0175*side,z:p.z+dx/len*.0175*side})));for(const n of [0,2,1,1,2,3]){const p=row[n];verts.push(p.x,terrain.height(p.x,p.z)+.035,p.z);}}
   const border=new BufferGeometry();border.setAttribute('position',new Float32BufferAttribute(verts,3));border.computeVertexNormals();root.add(new Mesh(border,bankMaterial));
  }
 }
 function season(value:SampleSeason){fieldMaterials.forEach((m,k)=>m.color.set(palettes[value].field).multiplyScalar(.89+k*.033));bankMaterial.color.set(value==='winter'?'#858d79':'#665e37');}
 season('summer');return {root,season,dispose(){root.traverse(o=>{if(o instanceof Mesh)o.geometry.dispose();});fieldMaterials.forEach(m=>m.dispose());bankMaterial.dispose();}};
}
