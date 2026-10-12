import {BufferGeometry,Color,DoubleSide,Float32BufferAttribute,InstancedMesh,MeshStandardMaterial,Object3D} from 'three';
import {seededRandom} from '../sample/geography';
import type {SampleTerrain} from './terrain';
import {noise,type SampleSeason} from './layout';

/** Small, broken reed colonies at dry bank edges; never an unbroken ribbon. */
export function bankVegetation(terrain:SampleTerrain){
 const random=seededRandom(124546),positions:number[]=[],indices:number[]=[];
 for(let i=0;i<9;i++){
  const x=(random()-.5)*.46,z=(random()-.5)*.46,h=.24+random()*.36,a=random()*Math.PI,w=.025;
  const n=positions.length/3,dx=Math.cos(a)*w,dz=Math.sin(a)*w;
  positions.push(x-dx,0,z-dz,x+dx,0,z+dz,x+dx+h*.11,h*.7,z+dz,x+h*.2,h,z);indices.push(n,n+1,n+2,n,n+2,n+3);
 }
 const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 const items:{x:number;y:number;z:number;scale:number}[]=[];
 for(const line of terrain.channel.profiles)for(const p of line){
  if(Math.abs(p.x)>88||Math.abs(p.z)>72||noise(p.x*.27,p.z*.27)<.48)continue;
  for(const side of [-1,1])for(let j=0;j<3;j++){
   if(random()<.4)continue;
   const width=(side<0?p.left:p.right)+.12+random()*.4,x=p.x+p.nx*width*side+(random()-.5)*.45,z=p.z+p.nz*width*side+(random()-.5)*.45,bank=terrain.channel.sample(x,z),y=terrain.height(x,z);
   if(!bank||bank.edge<.06||y<bank.level||y-bank.level>.28)continue;
   items.push({x,y,z,scale:.6+random()*.7});
  }
 }
 const material=new MeshStandardMaterial({color:'#738342',roughness:1,side:DoubleSide}),mesh=new InstancedMesh(geometry,material,items.length),dummy=new Object3D();
 items.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.scale.setScalar(p.scale);dummy.rotation.y=random()*Math.PI;dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,new Color().setScalar(.8+random()*.3));});
 mesh.receiveShadow=true;mesh.computeBoundingSphere();
 return {mesh,season(season:SampleSeason){material.color.set(season==='summer'?'#738342':season==='autumn'?'#8f9156':'#9fa791');}};
}
