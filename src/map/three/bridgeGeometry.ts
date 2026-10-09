import {BoxGeometry,BufferGeometry,Color,Float32BufferAttribute,Matrix4,MeshStandardMaterial,Quaternion,Vector3} from 'three';
import type {GroundPoint} from './landscapePaths';

export interface BridgeStation extends GroundPoint {y:number;distance:number;}

/** Symbolic timber trestle bridge fitted to a display road, not a historical bridge site. */
export function bridgeGeometry(stations:BridgeStation[],groundHeight:(x:number,z:number)=>number|null,width=.48){
 const positions:number[]=[],normals:number[]=[],colors:number[]=[],uvs:number[]=[];
 const base=new BoxGeometry(1,1,1),box=base.toNonIndexed(),bp=box.getAttribute('position'),bn=box.getAttribute('normal'),uv=box.getAttribute('uv');base.dispose();
 const up=new Vector3(0,1,0),q=new Quaternion(),v=new Vector3(),n=new Vector3();
 const beam=(a:Vector3,b:Vector3,w:number,d:number,tone:string,variation=1)=>{
  const length=a.distanceTo(b);if(length<.00001)return;
  const axis=b.clone().sub(a).normalize(),across=Math.abs(axis.y)>.999?new Vector3(1,0,0):up.clone().cross(axis).normalize();
  q.setFromRotationMatrix(new Matrix4().makeBasis(across,axis,across.clone().cross(axis)));const center=a.clone().add(b).multiplyScalar(.5),color=new Color(tone).multiplyScalar(variation);
  for(let i=0;i<bp.count;i++){
   v.set(bp.getX(i)*w,bp.getY(i)*length,bp.getZ(i)*d).applyQuaternion(q).add(center);positions.push(v.x,v.y,v.z);
   n.fromBufferAttribute(bn,i).applyQuaternion(q);normals.push(n.x,n.y,n.z);colors.push(color.r,color.g,color.b);
   // Grain follows each individual piece of timber, including sloped ramps and braces.
   uvs.push(uv.getX(i)*w,uv.getY(i)*length);
  }
 };
 const start=stations[0].distance,length=stations[stations.length-1].distance-start;
 const at=(distance:number,side=0,lift=0)=>{
  const d=start+Math.max(0,Math.min(length,distance));let i=1;while(i<stations.length-1&&stations[i].distance<d)i++;
  const a=stations[i-1],b=stations[i],t=(d-a.distance)/(b.distance-a.distance||1),dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz)||1;
  return new Vector3(a.x+dx*t-dz/len*side,a.y+(b.y-a.y)*t+lift,a.z+dz*t+dx/len*side);
 };
 // Separate transverse planks leave fine joints; edge beams carry a continuous deck.
 const planks=Math.max(2,Math.ceil(length/.11)),step=length/planks;
 for(let i=0;i<planks;i++){const d=(i+.5)*step;beam(at(d,-width*.5,-.0275),at(d,width*.5,-.0275),step-.002,.055,'#88704d',.94+.10*Math.sin(i*2.37));}
 for(let i=1;i<stations.length;i++)for(const side of [-width*.38,width*.38])beam(at(stations[i-1].distance-start,side,-.09),at(stations[i].distance-start,side,-.09),.065,.095,'#514330');
 const bays=Math.max(2,Math.ceil(length/.55));
 for(let i=0;i<=bays;i++)for(const side of [-width*.48,width*.48]){
  const d=length*i/bays;beam(at(d,side,-.045),at(d,side,.28),.043,.043,'#665239');
  if(i)for(const lift of [.13,.255])beam(at(length*(i-1)/bays,side,lift),at(d,side,lift),.036,.035,'#9a8058');
 }
 const supports=Math.max(1,Math.ceil(length/1.5));
 for(let i=0;i<=supports;i++){
  const d=length*(.06+.88*i/supports),left=at(d,-width*.34,-.10),right=at(d,width*.34,-.10);
  const foot=(p:Vector3)=>new Vector3(p.x,Math.min(p.y-.15,(groundHeight(p.x,p.z)??p.y-1)-.10),p.z);
  const lf=foot(left),rf=foot(right);
  beam(lf,left,.075,.075,'#574737');beam(rf,right,.075,.075,'#574737');
  beam(left.clone().add(new Vector3(0,-.05,0)),right.clone().add(new Vector3(0,-.05,0)),.075,.075,'#6e573b');
  if(left.y-lf.y>.3){beam(lf,right,.04,.04,'#6a553c');beam(rf,left,.04,.04,'#6a553c');}
 }
 // Small masonry sleepers key the timber ramps into each dry bank, below the deck.
 for(const d of [0,length])beam(at(d,-.30,-.13),at(d,.30,-.13),.30,.22,'#777364');
 box.dispose();const geometry=new BufferGeometry();
 geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new Float32BufferAttribute(normals,3));geometry.setAttribute('color',new Float32BufferAttribute(colors,3));geometry.setAttribute('uv',new Float32BufferAttribute(uvs,2));geometry.computeBoundingSphere();
 return geometry;
}

export function bridgeMaterial(){
 const material=new MeshStandardMaterial({name:'Weathered timber bridges',vertexColors:true,roughness:.92});
 material.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 bridgeUV;').replace('#include <begin_vertex>','#include <begin_vertex>\nbridgeUV=uv;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 bridgeUV;').replace('#include <color_fragment>','#include <color_fragment>\nfloat phase=bridgeUV.x*720.0+sin(bridgeUV.y*23.0)*1.8;float grain=sin(phase)*(1.0-smoothstep(.5,3.0,fwidth(phase)));diffuseColor.rgb*=.94+.06*grain;');
 };
 material.customProgramCacheKey=()=> 'campaign-timber-bridge-v1';return material;
}
