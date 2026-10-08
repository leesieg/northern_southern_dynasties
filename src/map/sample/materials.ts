import type {SeasonState} from './seasons';
import {Color,DoubleSide,MeshStandardMaterial,Vector2,type Texture} from 'three';
type FarmFields={map:Texture;centers:{x:number;z:number}[];columns?:number;rows?:number};
/** Original surface noise, independent of geographic height (never generates hills). */
export function terrainMaterial(fields:FarmFields|undefined,season:SeasonState,options:{fade?:boolean}={}){
 const m=new MeshStandardMaterial({color:'#ffffff',roughness:.94,transparent:true});
 const regionalStyle={value:0};
 const farmUniforms={farmAtlas:{value:fields?.map??null},hasFarms:{value:fields?1:0},farmCenters:{value:Array.from({length:36},(_,i)=>new Vector2(fields?.centers[i]?.x??1e8,fields?.centers[i]?.z??1e8))},farmCount:{value:Math.min(36,fields?.centers.length??0)},farmGrid:{value:new Vector2(fields?.columns??2,fields?.rows??1)}};
 m.onBeforeCompile=s=>{
  Object.assign(s.uniforms,season.uniforms,farmUniforms,{regionalStyle});
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 terrainPosition; varying vec3 terrainNormal;').replace('#include <begin_vertex>','#include <begin_vertex>\nterrainPosition=position; terrainNormal=normal;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
 varying vec3 terrainPosition; varying vec3 terrainNormal;
 uniform float regionalStyle; uniform vec3 seasonLow; uniform vec3 seasonHigh; uniform vec3 seasonForest; uniform vec3 seasonField; uniform float seasonSnow;
 uniform sampler2D farmAtlas; uniform float hasFarms; uniform vec2 farmCenters[36]; uniform int farmCount; uniform vec2 farmGrid;
 float hash2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash2(i),hash2(i+vec2(1,0)),f.x),mix(hash2(i+vec2(0,1)),hash2(i+vec2(1,1)),f.x),f.y);}
 float fbm(vec2 p){return noise2(p)*.55+noise2(p*2.07)*.26+noise2(p*4.1)*.13+noise2(p*8.2)*.06;}
 `).replace('#include <color_fragment>',`#include <color_fragment>
 vec2 p=terrainPosition.xz;float n=fbm(p*.18);
 float grainFootprint=max(length(dFdx(p*5.)),length(dFdy(p*5.)));
 float fine=mix(noise2(p*5.),.5,smoothstep(.15,.8,grainFootprint));
 float slope=1.-abs(normalize(terrainNormal).y);
 vec3 meadow=mix(seasonLow,seasonHigh,n);
 vec3 forest=seasonForest*(.82+n*.38);
 vec3 rock=mix(vec3(.27,.29,.27),vec3(.55,.54,.47),noise2(p*.32));
 rock=mix(rock,mix(vec3(.22,.24,.22),vec3(.48,.49,.43),n),regionalStyle);
 float wooded=smoothstep(.05,4.,terrainPosition.y)*smoothstep(.26,.7,n);
 vec3 soil=mix(vec3(.235,.195,.115),vec3(.37,.315,.205),n);
 vec3 land=mix(meadow,soil,smoothstep(.52,.76,fbm(p*.19+15.))*.4);
 land=mix(land,forest,wooded*mix(.64,.32,regionalStyle));
 float stone=smoothstep(.18,.52,slope+n*.19)*smoothstep(4.,11.,terrainPosition.y);
 stone=mix(stone,smoothstep(.10,.38,slope+n*.09)*smoothstep(1.,5.,terrainPosition.y),regionalStyle);
 float strata=.96+.04*sin(terrainPosition.y*1.8+noise2(p*.4)*3.);
 land=mix(land,rock*strata,stone);
 if(hasFarms>.5){
  vec4 field=vec4(0.);
  for(int i=0;i<36;i++){
   if(i>=farmCount)break;
   vec2 local=(p-farmCenters[i])/70.+.5;
   if(local.x>0.&&local.x<1.&&local.y>0.&&local.y<1.){
    vec2 tile=vec2(mod(float(i),farmGrid.x),floor(float(i)/farmGrid.x));
    vec4 parcel=texture2D(farmAtlas,vec2((tile.x+local.x)/farmGrid.x,1.-(tile.y+local.y)/farmGrid.y));
    field=mix(field,parcel,parcel.a);
   }
  }
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
 diffuseColor.rgb*=land*mix(.94+fine*.12,.97+fine*.045,snowCover);
 ${options.fade===false?'':'float edge=min(min(p.x+276.,294.4-p.x),min(p.y+133.2,144.3-p.y));diffuseColor.a*=smoothstep(0.,14.,edge);'}
 `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
 float rugged=smoothstep(5.,13.,terrainPosition.y);
 float relief=(noise2(terrainPosition.xz*3.)*.13+noise2(terrainPosition.xz*10.)*.022)*rugged*(1.-snowCover*.85);
 vec3 q0=dFdx(-vViewPosition),q1=dFdy(-vViewPosition);
 vec3 r1=cross(q1,normal),r2=cross(normal,q0);float determinant=dot(q0,r1);
 normal=normalize(abs(determinant)*normal-sign(determinant)*(dFdx(relief)*r1+dFdy(relief)*r2));
 `);
 };
 return Object.assign(m,{setRegionalStyle(value:number){regionalStyle.value=value;},setFarms(next:FarmFields){farmUniforms.farmAtlas.value=next.map;farmUniforms.hasFarms.value=1;farmUniforms.farmCount.value=Math.min(36,next.centers.length);farmUniforms.farmGrid.value.set(next.columns??2,next.rows??1);farmUniforms.farmCenters.value.forEach((c,i)=>c.set(next.centers[i]?.x??1e8,next.centers[i]?.z??1e8));}});
}
export function waterMaterial(){
 const m=new MeshStandardMaterial({color:'#426f70',roughness:.46,metalness:.06,side:DoubleSide});m.name='Campaign river';
 m.onBeforeCompile=s=>{
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 riverUV;').replace('#include <begin_vertex>','#include <begin_vertex>\nriverUV=uv;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 riverUV;').replace('#include <color_fragment>',`#include <color_fragment>
   float shore=pow(abs(riverUV.x-.5)*2.,7.);
   float ripple=.96+.04*sin(riverUV.y*17.+sin(riverUV.x*23.));
   diffuseColor.rgb=mix(diffuseColor.rgb*ripple,vec3(.32,.40,.32),shore*.3);
  `);
 };
 return m;
}
export const fieldColors=['#8c8748','#a79a58','#b3a269','#76804c','#a88e50'].map(c=>new Color(c));
