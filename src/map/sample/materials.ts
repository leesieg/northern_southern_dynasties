import {CanvasTexture,Color,DoubleSide,MeshStandardMaterial,SRGBColorSpace,type Texture} from 'three';
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
 vec3 meadow=mix(vec3(.14,.205,.058),vec3(.34,.345,.13),n);
 vec3 forest=mix(vec3(.06,.12,.048),vec3(.16,.23,.072),n);
 vec3 rock=mix(vec3(.26,.265,.23),vec3(.58,.55,.43),fbm(p*.75));
 float wooded=smoothstep(4.,9.,terrainPosition.y)*smoothstep(.26,.7,n);
 vec3 land=mix(meadow,forest,wooded*.9);
 float stone=smoothstep(.24,.63,slope+n*.22)*smoothstep(4.,11.,terrainPosition.y);
 float strata=.90+.10*sin(terrainPosition.y*7.+noise2(p*1.4)*4.);
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
export function waterMaterial(){return new MeshStandardMaterial({color:'#477d79',roughness:.27,metalness:.22,side:DoubleSide});}
export function flagTexture(name:string,color:string){
 const c=document.createElement('canvas');c.width=128;c.height=256;const g=c.getContext('2d')!;
 g.fillStyle=color;g.fillRect(0,0,128,256);g.strokeStyle='#bba36a';g.lineWidth=4;g.strokeRect(9,9,110,238);
 g.fillStyle='#e4d3a3';g.textAlign='center';g.font='68px "Songti SC",serif';g.fillText(name,64,132);
 const t=new CanvasTexture(c);t.colorSpace=SRGBColorSpace;return t;
}
export const fieldColors=['#929853','#a29b55','#b2a56b','#859149','#b7a564'].map(c=>new Color(c));
