import {MeshStandardMaterial,type Texture} from 'three';
import {stoneGLSL} from './geologyMaterial';
import {artSurfaceTexture} from './surfaceTexture';
/** One ground shader for the approved sample and the campaign; no legacy terrain/snow pass. */
export function groundMaterial(atlas?:Texture){
 const paperBlend={value:0},soil=new MeshStandardMaterial({vertexColors:true,roughness:.98});
 soil.onBeforeCompile=shader=>{
  shader.uniforms.paperBlend=paperBlend;shader.uniforms.surfaceAtlas={value:atlas??null};
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 soilPoint;varying vec3 soilNormal;varying float soilSlope;').replace('#include <begin_vertex>','#include <begin_vertex>\nsoilPoint=position;soilNormal=normal;soilSlope=1.-normal.y;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying vec3 soilPoint;varying vec3 soilNormal;varying float soilSlope;uniform float paperBlend;uniform sampler2D surfaceAtlas;
   vec3 swatch(vec2 uv,vec2 tile){return texture2D(surfaceAtlas,tile+vec2(.004)+abs(fract(uv*.5)*2.-1.)*.492).rgb;}
   float grain(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   ${stoneGLSL}
  `).replace('#include <color_fragment>',`#include <color_fragment>
   ${artSurfaceTexture(!!atlas)}
   vec3 paperColor=mix(vec3(.57,.52,.37),vec3(.25,.31,.23),clamp(soilPoint.y/32.,0.,.65));
   diffuseColor.rgb=mix(diffuseColor.rgb,paperColor,paperBlend*.86);
  `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   float rockDetail=smoothstep(.05,.25,soilSlope)*(1.-smoothstep(.06,.35,length(fwidth(soilPoint))))*(1.-paperBlend);
   if(rockDetail>.01){float centre=mineral(soilPoint);vec3 grad=vec3(mineral(soilPoint+vec3(.04,0,0))-centre,mineral(soilPoint+vec3(0,.04,0))-centre,mineral(soilPoint+vec3(0,0,.04))-centre);
   normal=normalize(normal-mat3(viewMatrix)*grad*.7*rockDetail);}
  `);
 };
 return {soil,paperBlend};
}
