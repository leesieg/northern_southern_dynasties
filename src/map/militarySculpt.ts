import {BufferGeometry,Float32BufferAttribute,ExtrudeGeometry,Shape} from 'three';

/** Tailored elliptical cross sections. Folds taper at the waist instead of making a stack of primitives. */
export function militaryGarmentGeometry(rings:readonly (readonly [number,number,number])[],folds=0){
 const segments=40,positions:number[]=[],uv:number[]=[],indices:number[]=[];
 const bottom=rings[0][0],height=rings.at(-1)![0]-bottom;
 for(const [y,width,depth] of rings)for(let i=0;i<=segments;i++){
  const t=i/segments*Math.PI*2,fold=1+folds*Math.cos(t*10)*(1-(y-bottom)/height*.72);
  positions.push(Math.sin(t)*width*fold,y,Math.cos(t)*depth*fold);uv.push(i/segments,(y-bottom)/height);
 }
 for(let row=0;row<rings.length-1;row++)for(let col=0;col<segments;col++){const a=row*(segments+1)+col,b=a+segments+1;indices.push(a,a+1,b,a+1,b+1,b);}
 for(const [row,top] of [[0,false],[rings.length-1,true]] as const){const center=positions.length/3;positions.push(0,rings[row][0],0);uv.push(.5,.5);for(let col=0;col<segments;col++){const a=row*(segments+1)+col;indices.push(center,top?a:a+1,top?a+1:a);}}
 const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(positions,3));g.setAttribute('uv',new Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}

/** Rounded lamella with a shallow bevel: thin overlapping steel, not masonry blocks. */
export function militaryLamellaGeometry(){
 const s=new Shape();s.moveTo(-.024,.037);s.lineTo(.024,.037);s.lineTo(.024,-.025);s.quadraticCurveTo(.024,-.037,.012,-.037);s.lineTo(-.012,-.037);s.quadraticCurveTo(-.024,-.037,-.024,-.025);s.closePath();
 return new ExtrudeGeometry(s,{depth:.007,bevelEnabled:true,bevelThickness:.002,bevelSize:.002,bevelSegments:2,curveSegments:3,steps:1});
}
