import {MeshStandardMaterial,DoubleSide} from 'three';
import {palettes} from './layout';
import {stoneGLSL} from './geologyMaterial';
/** Approved campaign water, shared by the independent study and the full map. */
export function artWaterMaterial(){
 const time={value:0},water=new MeshStandardMaterial({color:palettes.summer.water,roughness:.25,metalness:.08,side:DoubleSide,transparent:true,depthWrite:false});
 water.onBeforeCompile=shader=>{
  shader.uniforms.flowTime=time;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 streamUV;varying vec3 waterPoint;').replace('#include <begin_vertex>','#include <begin_vertex>\nstreamUV=uv;waterPoint=position;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 streamUV;varying vec3 waterPoint;uniform float flowTime;\n'+stoneGLSL).replace('#include <color_fragment>',`#include <color_fragment>
   float shore=abs(streamUV.x*2.-1.),shallow=smoothstep(.42,.99,shore);
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.23,.34,.30),shallow*.43);
   float current=geoNoise(vec3(streamUV.y*.6-flowTime*.06,streamUV.x*3.,2.));
   diffuseColor.rgb*=.94+current*.10;diffuseColor.a*=1.-smoothstep(.975,1.,shore);
  `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   vec3 flow=vec3(waterPoint.x*3.1,waterPoint.z*3.1-flowTime*.20,flowTime*.045);
   float ripple=geoNoise(flow),dx=geoNoise(flow+vec3(.07,0,0))-ripple,dz=geoNoise(flow+vec3(0,.07,0))-ripple;
   float detail=1.-smoothstep(.12,.8,length(fwidth(waterPoint)));
   normal=normalize(normal+mat3(viewMatrix)*vec3(dx*.65,0.,dz*.65)*detail);
  `).replace('#include <opaque_fragment>',`float fresnel=pow(1.-max(0.,dot(normal,normalize(vViewPosition))),3.);outgoingLight=mix(outgoingLight,vec3(.49,.57,.55),fresnel*.48);\n#include <opaque_fragment>`);
 };
 return {water,time};
}
