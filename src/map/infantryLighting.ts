import {Color,CubeTexture,DataTexture,LinearSRGBColorSpace,Mesh,MeshStandardMaterial,Vector3,type Group} from 'three';

/** Local daylight reflections for the infantry PBR metal, without changing map lighting. */
export function applyInfantryLighting(root:Group){
 const materials=new Set<MeshStandardMaterial>();
 root.traverse(o=>{if(o instanceof Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof MeshStandardMaterial)materials.add(m);});
 if(!materials.size)return;
 const size=16,sky=new Color(.72,.80,.88),horizon=new Color(.43,.45,.42),ground=new Color(.24,.20,.15),color=new Color();
 const directions=[(u:number,v:number)=>new Vector3(1,-v,-u),(u:number,v:number)=>new Vector3(-1,-v,u),(u:number,v:number)=>new Vector3(u,1,v),(u:number,v:number)=>new Vector3(u,-1,-v),(u:number,v:number)=>new Vector3(u,-v,1),(u:number,v:number)=>new Vector3(-u,-v,-1)];
 const faces=directions.map(direction=>{
  const pixels=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const up=direction((x+.5)/size*2-1,(y+.5)/size*2-1).normalize().y;
   color.copy(horizon).lerp(up>=0?sky:ground,Math.abs(up));const i=(y*size+x)*4;
   pixels[i]=Math.round(color.r*255);pixels[i+1]=Math.round(color.g*255);pixels[i+2]=Math.round(color.b*255);pixels[i+3]=255;
  }
  return new DataTexture(pixels,size,size);
 });
 const environment=new CubeTexture(faces);environment.name='Infantry soft daylight';environment.colorSpace=LinearSRGBColorSpace;environment.needsUpdate=true;
 for(const material of materials){
  material.envMap=environment;material.envMapIntensity=1.25;
  material.metalness*=.85;material.normalScale.multiplyScalar(.8);material.needsUpdate=true;
 }
}
