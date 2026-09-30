import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/** Original hipped tile roof: curved slopes with modest raised eave corners. */
export function cityRoofPoint(w:number,d:number,h:number,side:number,u:number,t:number){
 const along=u*2-1,half=side%2?d/2:w/2;
 const cross=side%2?w/2:d/2;
 const a=along*(side%2?half*(1-t)+.006*t:half*(1-t)+w*.28*t);
 const b=cross*(1-t)+(side%2?w*.28:.006)*t;
 const y=h*Math.pow(t,1.5)+.075*Math.pow(Math.abs(along),5)*Math.pow(1-t,3);
 return new THREE.Vector3(side%2?(side===1?b:-b):a,y,side%2?a:(side===0?b:-b));
}
export function cityRoofGeometry(w:number,d:number,h:number){
 const p:number[]=[],uv:number[]=[],indices:number[]=[],cols=16,rows=8;
 for(let side=0;side<4;side++){
  const start=p.length/3;
  for(let r=0;r<=rows;r++)for(let c=0;c<=cols;c++){const v=cityRoofPoint(w,d,h,side,c/cols,r/rows);p.push(v.x,v.y,v.z);uv.push(c/cols,r/rows);}
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const a=start+r*(cols+1)+c,b=a+cols+1;const face=[a,a+1,b,a+1,b+1,b];if(side===1||side===2)face.reverse();indices.push(...face);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function cityRoofTiles(w:number,d:number,h:number){
 const parts:THREE.BufferGeometry[]=[];
 for(let side=0;side<4;side++){
  const n=Math.max(4,Math.round((side%2?d:w)/.17));
  for(let col=0;col<=n;col++){
   const points=Array.from({length:9},(_,row)=>cityRoofPoint(w,d,h,side,col/n,row/8).add(new THREE.Vector3(0,.018,0)));
   parts.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),8,.019,4,false));
  }
 }
 const g=mergeGeometries(parts)!;parts.forEach(p=>p.dispose());return g;
}
export function cityWindowGeometry(w:number,h:number){
 const parts:THREE.BufferGeometry[]=[];
 for(let i=0;i<5;i++)parts.push(new THREE.BoxGeometry(.022,h,.025).translate((i/4-.5)*w,0,0));
 for(let i=0;i<3;i++)parts.push(new THREE.BoxGeometry(w,.025,.025).translate(0,(i/2-.5)*h,0));
 const g=mergeGeometries(parts)!;parts.forEach(p=>p.dispose());return g;
}
