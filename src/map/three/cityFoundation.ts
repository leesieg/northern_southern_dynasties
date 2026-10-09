import {Box3,BufferGeometry,Float32BufferAttribute} from 'three';

/** A graded earthen apron: level under the walls, irregular toes buried in actual terrain. */
export function cityFoundationGeometry(bounds:Box3,at:{x:number;y:number;z:number},scale:number,height:(x:number,z:number)=>number|null,clear:(x:number,z:number)=>boolean=()=>true){
 const cx=(bounds.min.x+bounds.max.x)/2,cz=(bounds.min.z+bounds.max.z)/2,hx=(bounds.max.x-bounds.min.x)/2,hz=(bounds.max.z-bounds.min.z)/2;
 const top=bounds.min.y-.015/scale,vertices=[cx,top,cz],colors=[.32,.27,.17,1],indices:number[]=[],segments=64,rings=6;
 for(let ring=0;ring<rings;ring++)for(let i=0;i<segments;i++){
  const angle=i/segments*Math.PI*2,dx=Math.cos(angle),dz=Math.sin(angle),r=1/Math.max(Math.abs(dx)/hx,Math.abs(dz)/hz);
  const x=cx+dx*r,z=cz+dz*r,ground=height(at.x+x*scale,at.z+z*scale)??at.y,drop=Math.max(0,at.y+top*scale-ground);
  const spread=Math.min(Math.min(hx,hz)*.48,Math.max(1.4,drop/scale*1.8))*(1+.12*Math.sin(angle*7)+.07*Math.cos(angle*11));
  let reach=spread;for(let s=1;s<=4;s++)if(!clear(at.x+(x+dx*spread*s/4)*scale,at.z+(z+dz*spread*s/4)*scale)){reach=spread*(s-1)/4;break;}
  const t=ring/(rings-1),px=x+dx*reach*t,pz=z+dz*reach*t,base=((height(at.x+px*scale,at.z+pz*scale)??ground)-at.y)/scale;
  const blend=t*t*(3-2*t),y=top+(base-top)*blend-(ring===rings-1?.035/scale:0);
  vertices.push(px,y,pz);const grass=blend*.75,grain=.96+.04*Math.sin(i*2.3+ring);
  colors.push((.32*(1-grass)+.22*grass)*grain,(.27*(1-grass)+.28*grass)*grain,(.17*(1-grass)+.105*grass)*grain,1-Math.pow(t,3));
  if(ring===0)indices.push(0,1+(i+1)%segments,1+i);
  if(ring){const a=1+(ring-1)*segments+i,b=1+(ring-1)*segments+(i+1)%segments,c=1+ring*segments+i,d=1+ring*segments+(i+1)%segments;indices.push(a,b,c,b,d,c);}
 }
 const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(vertices,3));geometry.setAttribute('color',new Float32BufferAttribute(colors,4));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry;
}
