import {MeshStandardMaterial,type Texture} from 'three';
/** World-space weathering keeps adjacent instances from repeating the same painted face. */
export function landscapeMaterial(name:string,stone=false,atlas?:Texture,tile=stone?1:2){
 const material=new MeshStandardMaterial({name,vertexColors:true,roughness:1,transparent:!stone,depthWrite:stone});
 material.onBeforeCompile=s=>{
  s.uniforms.landscapeAtlas={value:atlas??null};
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 landscapePoint;').replace('#include <begin_vertex>','#include <begin_vertex>\nlandscapePoint=(modelMatrix*'+(stone?'instanceMatrix*':'')+'vec4(position,1.)).xyz;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
   uniform sampler2D landscapeAtlas;varying vec3 landscapePoint;
   float landscapeNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float a=dot(i,vec3(17.,59.4,15.));vec4 n=fract(sin(vec4(a,a+17.,a+59.4,a+76.4))*43758.5);vec4 n2=fract(sin(vec4(a,a+17.,a+59.4,a+76.4)+15.)*43758.5);return mix(mix(mix(n.x,n.y,f.x),mix(n.z,n.w,f.x),f.y),mix(mix(n2.x,n2.y,f.x),mix(n2.z,n2.w,f.x),f.y),f.z);}
  `).replace('#include <color_fragment>',`#include <color_fragment>
   vec3 p=landscapePoint;float large=landscapeNoise(p*1.4),grain=landscapeNoise(p*18.);
   float detail=1.-smoothstep(.03,.18,length(fwidth(p)));
   float weather=.78+large*.32+(grain-.5)*.16*detail;
   ${stone?'float strata=p.y*10.+landscapeNoise(p*.7)*2.;weather*=.90+.10*sin(strata)*(1.-smoothstep(.5,3.,fwidth(strata)));':''}
   ${atlas?`vec2 uv=${stone?'vec2(p.x+p.z,p.y)':'p.xz'}*.55;
   vec2 mirrored=abs(fract(uv*.5)*2.-1.);
   vec3 texel=texture2D(landscapeAtlas,vec2(${tile%2?'.5':'0.'},${tile<2?'.5':'0.'})+vec2(.004)+mirrored*.492).rgb;
   weather*=clamp(dot(texel,vec3(.3,.59,.11))*2.3+.35,.48,1.4);`:''}
   diffuseColor.rgb*=weather;
  `);
 };
 material.customProgramCacheKey=()=> 'campaign-landscape-weather-v2-'+stone+'-'+tile+'-'+!!atlas;
 return material;
}
