import type {SeasonState} from './seasons';
import {Color,DoubleSide,MeshStandardMaterial,type Texture} from 'three';
/** Original surface noise, independent of geographic height (never generates hills). */
export function terrainMaterial(fields:{map:Texture;centers:{x:number;z:number}[]}|undefined,season:SeasonState){
 const m=new MeshStandardMaterial({color:'#ffffff',roughness:.94,transparent:true});
 m.onBeforeCompile=s=>{
  Object.assign(s.uniforms,season.uniforms);
  s.uniforms.farmAtlas={value:fields?.map??null};s.uniforms.hasFarms={value:fields?1:0};
  s.uniforms.farmCenter0={value:fields?[fields.centers[0].x,fields.centers[0].z]:[0,0]};s.uniforms.farmCenter1={value:fields?[fields.centers[1].x,fields.centers[1].z]:[0,0]};
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 terrainPosition; varying vec3 terrainNormal;').replace('#include <begin_vertex>','#include <begin_vertex>\nterrainPosition=position; terrainNormal=normal;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
 varying vec3 terrainPosition; varying vec3 terrainNormal;
 uniform vec3 seasonLow; uniform vec3 seasonHigh; uniform vec3 seasonForest; uniform vec3 seasonField; uniform float seasonSnow;
 uniform sampler2D farmAtlas; uniform float hasFarms; uniform vec2 farmCenter0; uniform vec2 farmCenter1;
 float hash2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash2(i),hash2(i+vec2(1,0)),f.x),mix(hash2(i+vec2(0,1)),hash2(i+vec2(1,1)),f.x),f.y);}
 float fbm(vec2 p){return noise2(p)*.55+noise2(p*2.07)*.26+noise2(p*4.1)*.13+noise2(p*8.2)*.06;}
 `).replace('#include <color_fragment>',`#include <color_fragment>
 vec2 p=terrainPosition.xz;float n=fbm(p*.47),fine=fbm(p*7.);
 float slope=1.-abs(normalize(terrainNormal).y);
 vec3 meadow=mix(seasonLow,seasonHigh,n);
 vec3 forest=seasonForest*(.65+n*.7);
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
  land=mix(land,mix(field.rgb,seasonField,.72),field.a*.83);
 }
 float snowCover=0.;
 if(seasonSnow>.001){
 // Display elevation is exaggerated: these are art thresholds, not a climatic snowline.
 vec3 groundNormal=normalize(terrainNormal);
 float altitude=smoothstep(4.,21.,terrainPosition.y);
 vec2 driftUV=p*.23+vec2(noise2(p*.075),noise2(p*.075+37.))*2.4;
 float drift=fbm(driftUV)*.78+noise2(p*1.8)*.22;
 // Sunward faces thaw first; steep rock faces retain only isolated snow shelves.
 float sunward=dot(groundNormal.xz,normalize(vec2(-135.,80.)));
 float retention=smoothstep(.40,.88,groundNormal.y);
 float accumulation=.20+altitude*.38+drift*.48-sunward*.13;
 snowCover=seasonSnow*retention*smoothstep(.46,.70,accumulation);
 float snowLight=clamp(.52+sunward*.30+(drift-.5)*.22,0.,1.);
 vec3 snowColor=mix(vec3(.56,.65,.72),vec3(.84,.85,.81),snowLight);
 land=mix(land,snowColor,snowCover);
 }
 // Keep grain on exposed earth, but avoid stamping the soil texture into deep snow.
 diffuseColor.rgb*=land*mix(.80+fine*.35,.97+fine*.045,snowCover);
 float edge=min(min(p.x+276.,294.4-p.x),min(p.y+133.2,144.3-p.y));diffuseColor.a*=smoothstep(0.,14.,edge);
 `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
 float rugged=smoothstep(5.,13.,terrainPosition.y);
 float relief=(noise2(terrainPosition.xz*3.)*.13+noise2(terrainPosition.xz*10.)*.022)*rugged*(1.-snowCover*.85);
 vec3 q0=dFdx(-vViewPosition),q1=dFdy(-vViewPosition);
 vec3 r1=cross(q1,normal),r2=cross(normal,q0);float determinant=dot(q0,r1);
 normal=normalize(abs(determinant)*normal-sign(determinant)*(dFdx(relief)*r1+dFdy(relief)*r2));
 `);
 };
 return m;
}
export function waterMaterial(){
 const m=new MeshStandardMaterial({color:'#426f70',roughness:.34,metalness:.10,side:DoubleSide});m.name='Campaign river';
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
