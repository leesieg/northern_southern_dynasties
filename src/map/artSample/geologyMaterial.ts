import {MeshStandardMaterial,type Texture} from 'three';

// Domain-warped mineral patches and directional fractures, shared by embedded outcrops and terrain.
export const stoneGLSL=`
 float geoHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
 float geoNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(geoHash(i),geoHash(i+vec3(1,0,0)),f.x),mix(geoHash(i+vec3(0,1,0)),geoHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(geoHash(i+vec3(0,0,1)),geoHash(i+vec3(1,0,1)),f.x),mix(geoHash(i+vec3(0,1,1)),geoHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
 float mineral(vec3 p){float coarse=geoNoise(p*.8);vec3 warped=p+vec3(coarse,geoNoise(p.zxy*.7),geoNoise(p.yzx*.7))*.65;return geoNoise(warped*3.3)*.65+geoNoise(warped*10.)*.35;}
 float fracture(vec3 p){float warp=geoNoise(p*.75)*.8;float vein=abs(sin((p.y*.8+p.x*.18+warp)*8.));return smoothstep(.015,.11,vein);}
`;

export function outcropMaterial(atlas?:Texture){
 const material=new MeshStandardMaterial({vertexColors:true,roughness:1});
 material.onBeforeCompile=shader=>{
  shader.uniforms.rockAtlas={value:atlas??null};
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 rockPoint;varying vec3 rockNormal;')
   .replace('#include <begin_vertex>',`#include <begin_vertex>
    vec4 geoPosition=vec4(position,1.);vec3 geoNormal=normal;
    #ifdef USE_INSTANCING
     geoPosition=instanceMatrix*geoPosition;
     geoNormal/=vec3(dot(instanceMatrix[0].xyz,instanceMatrix[0].xyz),dot(instanceMatrix[1].xyz,instanceMatrix[1].xyz),dot(instanceMatrix[2].xyz,instanceMatrix[2].xyz));
     geoNormal=mat3(instanceMatrix)*geoNormal;
    #endif
    rockPoint=(modelMatrix*geoPosition).xyz;rockNormal=normalize(mat3(modelMatrix)*geoNormal);
   `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 rockPoint;varying vec3 rockNormal;uniform sampler2D rockAtlas;\nvec3 rockSwatch(vec2 uv){return texture2D(rockAtlas,vec2(.504,.504)+abs(fract(uv*.5)*2.-1.)*.492).rgb;}\n'+stoneGLSL)
   .replace('#include <color_fragment>',`#include <color_fragment>
    float grain=mineral(rockPoint),detail=1.-smoothstep(.08,.8,length(fwidth(rockPoint)));
    float seams=mix(1.,fracture(rockPoint),detail*.16);
    diffuseColor.rgb*=seams*(.73+grain*.51);
    ${atlas?`vec3 weights=pow(abs(normalize(rockNormal)),vec3(4.));weights/=max(.001,weights.x+weights.y+weights.z);
    vec3 texel=rockSwatch(rockPoint.zy*.55)*weights.x+rockSwatch(rockPoint.xz*.55)*weights.y+rockSwatch(rockPoint.xy*.55)*weights.z;
    diffuseColor.rgb*=clamp(dot(texel,vec3(.3,.59,.11))*2.1+.3,.48,1.40);`:''}
    float moss=smoothstep(.4,.85,rockNormal.y)*smoothstep(.50,.73,geoNoise(rockPoint*.8));
    diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.67,.78,.49),moss*.32);
   `)
   .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
    float detailNormal=1.-smoothstep(.07,.45,length(fwidth(rockPoint)));float centre=mineral(rockPoint);
    vec3 grad=vec3(mineral(rockPoint+vec3(.04,0,0))-centre,mineral(rockPoint+vec3(0,.04,0))-centre,mineral(rockPoint+vec3(0,0,.04))-centre);
    normal=normalize(normal-mat3(viewMatrix)*grad*.55*detailNormal);
   `);
 };
 material.customProgramCacheKey=()=> 'sample-weathered-outcrop-v3-'+!!atlas;return material;
}
