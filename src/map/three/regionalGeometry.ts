import {BufferGeometry,Float32BufferAttribute} from 'three';
/** Vertex clustering retains the silhouette and baked colours while collapsing subpixel detail. */
export function regionalGeometry(source:BufferGeometry){
 source.computeBoundingBox();const box=source.boundingBox!,p=source.getAttribute('position');
 const attributes=Object.entries(source.attributes).filter(([name])=>name!=='normal');
 const values=new Map(attributes.map(([name])=>[name,[] as number[]]));
 const snap=(value:number,min:number,max:number,steps:number)=>max===min?min:min+Math.round((value-min)/(max-min)*steps)*(max-min)/steps;
 for(let i=0;i<p.count;i+=3){
  const tri=[0,1,2].map(j=>[snap(p.getX(i+j),box.min.x,box.max.x,96),snap(p.getY(i+j),box.min.y,box.max.y,32),snap(p.getZ(i+j),box.min.z,box.max.z,96)]);
  const [a,b,c]=tri,u=b.map((v,k)=>v-a[k]),v=c.map((n,k)=>n-a[k]);
  if(Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])<1e-8)continue;
  for(const [name,attr] of attributes)for(let j=0;j<3;j++)for(let k=0;k<attr.itemSize;k++)values.get(name)!.push(name==='position'?tri[j][k]:attr.getComponent(i+j,k));
 }
 const result=new BufferGeometry();for(const [name,attr] of attributes)result.setAttribute(name,new Float32BufferAttribute(values.get(name)!,attr.itemSize));result.computeVertexNormals();return result;
}
