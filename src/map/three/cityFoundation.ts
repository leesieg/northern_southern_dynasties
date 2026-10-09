import {Box3,BufferGeometry,Float32BufferAttribute} from 'three';

/** An earth platform and ground-reaching sides inside the existing city footprint. */
export function cityFoundationGeometry(bounds:Box3,at:{x:number;y:number;z:number},scale:number,height:(x:number,z:number)=>number|null){
 const corners=[[bounds.min.x,bounds.min.z],[bounds.max.x,bounds.min.z],[bounds.max.x,bounds.max.z],[bounds.min.x,bounds.max.z]],rim:number[][]=[];
 for(let side=0;side<4;side++)for(let i=0;i<8;i++){const a=corners[side],b=corners[(side+1)%4],t=i/8;rim.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}
 const top=bounds.min.y-.015/scale,vertices=[(bounds.min.x+bounds.max.x)/2,top,(bounds.min.z+bounds.max.z)/2],indices:number[]=[];
 for(const [x,z] of rim){const ground=height(at.x+x*scale,at.z+z*scale);vertices.push(x,top,z,x,Math.min(top,((ground??at.y)-at.y-.05)/scale),z);}
 for(let i=0;i<rim.length;i++){const a=1+i*2,b=1+(i+1)%rim.length*2;indices.push(0,b,a,a,b,b+1,a,b+1,a+1);}
 const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry;
}
