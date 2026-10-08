import {DoubleSide,MeshStandardMaterial} from 'three';

/** Preserve the Blender material identity when baking a settlement to one mesh. */
export function architectureSurface(name:string,roughness=.94):[number,number]{
 const kind=/Slate tile|Ridge pottery/.test(name)?1:/Warm limestone|Lime plaster/.test(name)?2:/Dark timber/.test(name)?3:0;
 const limit=kind===1?.72:kind===3?.86:1;
 return [Math.max(.3,Math.min(limit,roughness)),kind];
}
export function architectureMaterial(){
 const material=new MeshStandardMaterial({name:'Campaign city',vertexColors:true,roughness:1,side:DoubleSide});
 material.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
   attribute vec2 architectureSurface; varying vec2 buildingSurface; varying vec3 buildingPosition;
  `).replace('#include <begin_vertex>',`#include <begin_vertex>
   buildingSurface=architectureSurface;buildingPosition=position;
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying vec2 buildingSurface; varying vec3 buildingPosition;
  `).replace('#include <color_fragment>',`#include <color_fragment>
   // Restrained tile courses, plaster mottling and timber grain; geometry carries the silhouette.
   vec3 p=buildingPosition;
   float tile=sin(p.x*58.)*sin(p.z*58.)*.035;
   float stone=sin(p.x*21.+sin(p.z*13.))*sin(p.y*25.)*.035;
   float timber=sin(p.y*72.+sin(p.x*8.)*2.)*.055;
   float grain=buildingSurface.y<.5?0.:buildingSurface.y<1.5?tile:buildingSurface.y<2.5?stone:timber;
   float footprint=length(fwidth(p))*72.;
   diffuseColor.rgb*=1.+grain*(1.-smoothstep(.4,1.6,footprint));
  `).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   roughnessFactor*=buildingSurface.x;
  `);
 };
 material.customProgramCacheKey=()=> 'campaign-architecture-v1';
 return material;
}
