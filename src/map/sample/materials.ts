import {Color,DoubleSide,MeshStandardMaterial,type Texture} from 'three';
/** Original surface noise, independent of geographic height (never generates hills). */
export function terrainMaterial(fields?:{map:Texture;centers:{x:number;z:number}[]}){
 const m=new MeshStandardMaterial({color:'#ffffff',roughness:.94,transparent:true});
 m.onBeforeCompile=s=>{
  s.uniforms.farmAtlas={value:fields?.map??null};s.uniforms.hasFarms={value:fields?1:0};
  s.uniforms.farmCenter0={value:fields?[fields.centers[0].x,fields.centers[0].z]:[0,0]};s.uniforms.farmCenter1={value:fields?[fields.centers[1].x,fields.centers[1].z]:[0,0]};
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 terrainPosition; varying vec3 terrainNormal;').replace('#include <begin_vertex>','#include <begin_vertex>\nterrainPosition=position; terrainNormal=normal;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
 varying vec3 terrainPosition; varying vec3 terrainNormal;
 uniform sampler2D farmAtlas; uniform float hasFarms; uniform vec2 farmCenter0; uniform vec2 farmCenter1;
 float hash2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash2(i),hash2(i+vec2(1,0)),f.x),mix(hash2(i+vec2(0,1)),hash2(i+vec2(1,1)),f.x),f.y);}
 float fbm(vec2 p){return noise2(p)*.55+noise2(p*2.07)*.26+noise2(p*4.1)*.13+noise2(p*8.2)*.06;}
 `).replace('#include <color_fragment>',`#include <color_fragment>
 vec2 p=terrainPosition.xz;float n=fbm(p*.47),fine=fbm(p*7.);
 float slope=1.-abs(normalize(terrainNormal).y);
 vec3 meadow=mix(vec3(.085,.135,.064),vec3(.265,.285,.135),n);
 vec3 forest=mix(vec3(.035,.072,.043),vec3(.105,.165,.077),n);
 vec3 rock=mix(vec3(.205,.205,.175),vec3(.49,.455,.355),fbm(p*.75));
 float wooded=smoothstep(4.,9.,terrainPosition.y)*smoothstep(.26,.7,n);
 vec3 soil=mix(vec3(.235,.195,.115),vec3(.37,.315,.205),n);
 vec3 land=mix(meadow,soil,smoothstep(.52,.76,fbm(p*.19+15.))*.65);
 land=mix(land,forest,wooded*.85);
 float stone=smoothstep(.18,.52,slope+n*.19)*smoothstep(4.,11.,terrainPosition.y);
 float strata=.86+.14*sin(terrainPosition.y*5.+noise2(p*1.4)*5.);
 land=mix(land,rock*strata,stone);
 if(hasFarms>.5){
  vec2 uv0=(p-farmCenter0)/70.+.5;vec2 uv1=(p-farmCenter1)/70.+.5;
  vec4 field=vec4(0.);
  if(uv0.x>0.&&uv0.x<1.&&uv0.y>0.&&uv0.y<1.)field=texture2D(farmAtlas,vec2(uv0.x*.5,1.-uv0.y));
  if(uv1.x>0.&&uv1.x<1.&&uv1.y>0.&&uv1.y<1.)field=texture2D(farmAtlas,vec2(.5+uv1.x*.5,1.-uv1.y));
  land=mix(land,field.rgb,field.a*.83);
 }
 diffuseColor.rgb*=land*(.80+fine*.35);
 float edge=min(min(p.x+276.,294.4-p.x),min(p.y+133.2,144.3-p.y));diffuseColor.a*=smoothstep(0.,14.,edge);
 `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
 float rugged=smoothstep(5.,13.,terrainPosition.y);
 float relief=(noise2(terrainPosition.xz*3.)*.13+noise2(terrainPosition.xz*10.)*.022)*rugged;
 vec3 q0=dFdx(-vViewPosition),q1=dFdy(-vViewPosition);
 vec3 r1=cross(q1,normal),r2=cross(normal,q0);float determinant=dot(q0,r1);
 normal=normalize(abs(determinant)*normal-sign(determinant)*(dFdx(relief)*r1+dFdy(relief)*r2));
 `);
 };
 return m;
}
export function waterMaterial(){
 const m=new MeshStandardMaterial({color:'#426f70',roughness:.34,metalness:.10,side:DoubleSide});
 m.onBeforeCompile=s=>{
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 riverUV;').replace('#include <begin_vertex>','#include <begin_vertex>\nriverUV=uv;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 riverUV;').replace('#include <color_fragment>',`#include <color_fragment>
   float shore=pow(abs(riverUV.x-.5)*2.,7.);
   float ripple=.96+.04*sin(riverUV.y*17.+sin(riverUV.x*23.));
   diffuseColor.rgb=mix(diffuseColor.rgb*ripple,vec3(.32,.40,.32),shore*.48);
  `);
 };
 return m;
}
export const fieldColors=['#8c8748','#a79a58','#b3a269','#76804c','#a88e50'].map(c=>new Color(c));
