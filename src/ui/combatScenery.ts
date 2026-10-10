import {BufferGeometry,CanvasTexture,DoubleSide,Float32BufferAttribute,MeshStandardMaterial,SRGBColorSpace} from 'three';
import {mapResource} from '../map/resourceLoader';

/** One shared diffuse atlas; quadrant sampling stays inside each material's tile. */
export function combatMaterials(signal:AbortSignal,repaint:()=>void,warn:()=>void){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const context=canvas.getContext('2d')!;context.fillStyle='#fff';context.fillRect(0,0,1,1);
 const atlas=new CanvasTexture(canvas);atlas.colorSpace=SRGBColorSpace;atlas.anisotropy=4;
 let disposed=false,bitmap:ImageBitmap|undefined;
 function material(name:string,tile:number,color:string,vertical=false){
  const m=new MeshStandardMaterial({name,map:atlas,color,roughness:.98});
  m.onBeforeCompile=s=>{
   s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 combatPoint;').replace('#include <begin_vertex>','#include <begin_vertex>\ncombatPoint=(modelMatrix*vec4(position,1.)).xyz;');
   s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 combatPoint;').replace('#include <map_fragment>',`vec2 combatUv=${vertical?'vec2(combatPoint.x+combatPoint.z,combatPoint.y)':'combatPoint.xz'}*${vertical?'.24':'.22'};
    vec2 cell=vec2(${tile%2?'.5':'0.'},${tile<2?'.5':'0.'});
    vec3 surface=texture2D(map,cell+.004+fract(combatUv)*.492).rgb;
    surface=mix(surface,vec3(dot(surface,vec3(.3,.59,.11))),.25);
    diffuseColor.rgb*=surface;`);
  };
  m.customProgramCacheKey=()=>`combat-surface-v2-${tile}-${vertical}`;return m;
 }
 const earth=material('Trampled battlefield',1,'#d6cbb6'),stone=material('Rammed earth rampart',0,'#e0ded5',true),roof=material('Weathered ceramic eaves',2,'#d0d2ce'),wood=material('Weathered timber',3,'#c2b9a8',true),linen=new MeshStandardMaterial({color:'#8b806d',roughness:1,side:DoubleSide});
 roof.side=DoubleSide;
 void mapResource('art/military/battle-surface-atlas-v2.png',{signal,priority:3}).then(r=>r.blob()).then(blob=>createImageBitmap(blob,{imageOrientation:'flipY'})).then(image=>{if(disposed){image.close();return;}bitmap=image;/* A 1×1 placeholder cannot reuse immutable GPU storage for the full atlas. */atlas.dispose();atlas.image=image;atlas.needsUpdate=true;repaint();}).catch(()=>{if(!signal.aborted)warn();});
 return {earth,stone,roof,wood,linen,dispose(){disposed=true;bitmap?.close();atlas.dispose();[earth,stone,roof,wood,linen].forEach(m=>m.dispose());}};
}

/** A broad tiled roof with raised eaves, rather than a four-sided pyramid. */
export function combatRoof(width:number,depth:number,rise:number){
 const positions:number[]=[],uv:number[]=[],indices:number[]=[],steps=8;
 for(let side=0;side<2;side++)for(let i=0;i<=steps;i++){const t=i/steps,z=(side?1:-1)*depth*.5*t,y=rise*Math.pow(1-t,1.6)+.18*Math.pow(t,6);for(const x of [-width*.5,width*.5]){positions.push(x,y,z);uv.push((x/width+.5),t);}}
 for(let side=0;side<2;side++)for(let i=0;i<steps;i++){const a=side*(steps+1)*2+i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
 const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(positions,3));g.setAttribute('uv',new Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}

export function combatTent(){
 const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute([-1.3,0,-1.4,1.3,0,-1.4,0,1.6,-1.4,-1.3,0,1.4,1.3,0,1.4,0,1.6,1.4],3));g.setIndex([0,3,2,2,3,5,2,5,1,1,5,4,0,2,1,3,4,5]);g.computeVertexNormals();return g;
}
