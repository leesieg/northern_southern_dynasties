import {BufferGeometry,CatmullRomCurve3,CircleGeometry,ExtrudeGeometry,Float32BufferAttribute,Group,Mesh,Shape,TubeGeometry,Vector3,type Material} from 'three';

type GeometryCache=(key:string,create:()=>BufferGeometry)=>BufferGeometry;
/** Sculpted jaw, cheekbones and recessed eye sockets; coordinates in the miniature's local head space. */
export function militaryHeadGeometry(){
 const rings=[[-.116,.012,.046,.025],[-.103,.036,.061,.039],[-.084,.060,.072,.052],[-.061,.073,.077,.063],[-.032,.081,.081,.075],[0,.086,.086,.082],[.029,.084,.086,.084],[.051,.082,.080,.082],[.077,.076,.072,.073],[.102,.057,.052,.053],[.120,.024,.024,.025]],segments=32,positions:number[]=[],indices:number[]=[];
 for(const [y,width,front,back] of rings)for(let i=0;i<segments;i++){
  const t=i/segments*Math.PI*2,s=Math.sin(t),c=Math.cos(t),x=s*width;
  let z=c>=0?Math.sqrt(c)*front:c*back;
  if(c>0){
   const socket=Math.exp(-(((Math.abs(x)-.032)/.015)**2+((y-.029)/.015)**2)),cheek=Math.exp(-(((Math.abs(x)-.052)/.025)**2+((y+.008)/.020)**2));
   z-=socket*.009*c;z+=cheek*.003*c;
  }
  positions.push(x,y,z);
 }
 for(let row=0;row<rings.length-1;row++)for(let col=0;col<segments;col++){const i=row*segments+col,next=row*segments+(col+1)%segments,j=i+segments;indices.push(i,next,j,next,next+segments,j);}
 const bottom=positions.length/3;positions.push(0,rings[0][0],0);const top=positions.length/3;positions.push(0,rings.at(-1)![0],0);
 for(let col=0;col<segments;col++){indices.push(bottom,(col+1)%segments,col);const last=(rings.length-1)*segments;indices.push(top,last+col,last+(col+1)%segments);}
 const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

export function militaryNoseGeometry(){
 const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute([
  -.004,.050,.083, .004,.050,.083, -.004,.015,.101, .004,.015,.101,
  -.006,-.018,.117, .006,-.018,.117, -.012,-.027,.098, 0,-.030,.111, .012,-.027,.098,
  -.014,-.036,.078, .014,-.036,.078, 0,-.039,.078,
 ],3));geometry.setIndex([0,2,1,1,2,3,2,4,3,3,4,5,4,7,5,6,7,4,5,7,8,0,6,2,2,6,4,1,3,8,3,5,8,6,9,7,7,9,11,7,11,10,7,10,8,0,9,6,1,8,10]);geometry.computeVertexNormals();return geometry;
}

export function buildMilitaryFace(parent:Group,materials:{skin:Material;white:Material;iris:Material;lip:Material;hair:Material},geo:GeometryCache){
 const head=new Group();head.name='human-head';head.position.set(0,1.611,.008);parent.add(head);
 function add(name:string,g:BufferGeometry,m:Material,x=0,y=0,z=0){const mesh=new Mesh(g,m);mesh.name=name;mesh.position.set(x,y,z);mesh.frustumCulled=false;head.add(mesh);return mesh;}
 function stroke(key:string,points:number[][],radius:number,m:Material,x=0,y=0,z=0){return add(key,geo(key,()=>new TubeGeometry(new CatmullRomCurve3(points.map(p=>new Vector3(p[0],p[1],p[2]))),12,radius,5,false)),m,x,y,z);}
 add('head-skin',geo('human-head-skin',militaryHeadGeometry),materials.skin);
 add('nose-bridge',geo('human-nose',militaryNoseGeometry),materials.skin);
 const eye=geo('human-eye',()=>{const shape=new Shape();shape.moveTo(-.012,0);shape.quadraticCurveTo(-.006,.004,0,.0032);shape.quadraticCurveTo(.007,.0038,.012,0);shape.quadraticCurveTo(.006,-.0027,0,-.0025);shape.quadraticCurveTo(-.007,-.0027,-.012,0);return new ExtrudeGeometry(shape,{depth:.010,bevelEnabled:false,curveSegments:10,steps:1}).translate(0,0,-.009);});
 for(const side of [-1,1]){
  const x=side*.032,y=.029;
  add('eye-white',eye,materials.white,x,y,.080);
  add('iris',geo('human-iris',()=>new CircleGeometry(.0028,16)),materials.iris,x,y,.0812);
  stroke('upper-eyelid',[[-.012,0,0],[-.004,.0037,.0004],[.006,.0032,.0004],[.012,0,0]],.0011,materials.skin,x,y,.0818);
  stroke('lower-eyelid',[[-.012,0,0],[0,-.003,0],[.012,0,0]],.0008,materials.skin,x,y,.0815);
  stroke('eyebrow',[[-.014,-.0005,0],[0,.003,0],[.014,0,-.003]],.0017,materials.hair,x,.045,.084);
  add('nostril',geo('human-nostril',()=>new CircleGeometry(.0019,12)),materials.lip,side*.0075,-.026,.109).scale.set(1,.55,1);
 }
 stroke('upper-lip',[[-.020,0,0],[-.007,.0015,.001],[0,.0002,.002],[.007,.0015,.001],[.020,0,0]],.0012,materials.lip,0,-.054,.083);
 stroke('lower-lip',[[-.018,0,0],[0,-.0018,.001],[.018,0,0]],.0013,materials.lip,0,-.056,.082);
 return head;
}
