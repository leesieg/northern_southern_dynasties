import type {SeasonState} from './seasons';
import {Color,DoubleSide,MeshStandardMaterial,Vector2,type Texture} from 'three';
type FarmFields={map:Texture;centers:{x:number;z:number}[];columns?:number;rows?:number};
/** Original surface noise, independent of geographic height (never generates hills). */
export function terrainMaterial(fields:FarmFields|undefined,season:SeasonState,options:{fade?:boolean;detailMap?:Texture}={}){
 const m=new MeshStandardMaterial({color:'#ffffff',roughness:.94,transparent:true});
 const regionalStyle={value:0};
 const farmUniforms={farmAtlas:{value:fields?.map??null},hasFarms:{value:fields?1:0},farmCenters:{value:Array.from({length:36},(_,i)=>new Vector2(fields?.centers[i]?.x??1e8,fields?.centers[i]?.z??1e8))},farmCount:{value:Math.min(36,fields?.centers.length??0)},farmGrid:{value:new Vector2(fields?.columns??2,fields?.rows??1)}};
 m.onBeforeCompile=s=>{
  Object.assign(s.uniforms,season.uniforms,farmUniforms,{regionalStyle,terrainAtlas:{value:options.detailMap??null},hasTerrainAtlas:{value:options.detailMap?1:0}});
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 terrainPosition; varying vec3 terrainNormal;').replace('#include <begin_vertex>','#include <begin_vertex>\nterrainPosition=position; terrainNormal=normal;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
 varying vec3 terrainPosition; varying vec3 terrainNormal;
 uniform float regionalStyle; uniform vec3 seasonLow; uniform vec3 seasonHigh; uniform vec3 seasonForest; uniform vec3 seasonField; uniform float seasonSnow;
 uniform sampler2D terrainAtlas;uniform float hasTerrainAtlas;
 vec3 terrainSwatch(vec2 uv,vec2 tile){vec2 q=abs(fract(uv*.5)*2.-1.);return texture2D(terrainAtlas,tile+vec2(.004)+q*.492).rgb;}
 uniform sampler2D farmAtlas; uniform float hasFarms; uniform vec2 farmCenters[36]; uniform int farmCount; uniform vec2 farmGrid;
 float hash2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash2(i),hash2(i+vec2(1,0)),f.x),mix(hash2(i+vec2(0,1)),hash2(i+vec2(1,1)),f.x),f.y);}
 float fbm(vec2 p){return noise2(p)*.55+noise2(p*2.07)*.26+noise2(p*4.1)*.13+noise2(p*8.2)*.06;}
 `).replace('#include <color_fragment>',`#include <color_fragment>
 vec2 p=terrainPosition.xz;float n=fbm(p*.18);
 float grainFootprint=max(length(dFdx(p*5.)),length(dFdy(p*5.)));
 float fine=mix(noise2(p*5.),.5,smoothstep(.15,.8,grainFootprint));
 float slope=1.-abs(normalize(terrainNormal).y);
 // Broad pasture / woodland masses carry the composition; fine noise only weathers them.
 float pasture=smoothstep(.18,.82,fbm(p*.035));
 vec3 meadow=mix(seasonLow,seasonHigh,pasture)*(.96+n*.08);
 vec3 forest=seasonForest*(.88+n*.24);
 float groveCover=smoothstep(.23,.80,noise2(p/28.)*.7+fbm(p*.12)*.3);
 float wooded=groveCover*(1.-smoothstep(.30,.58,slope));
 vec3 soil=mix(vec3(.35,.28,.145),vec3(.51,.43,.24),n);
 vec3 land=mix(meadow,soil,smoothstep(.61,.8,fbm(p*.05+15.))*.32);
 land=mix(land,forest,wooded*.62);
 // Warm exposed strata against cool, dark vegetation. All shapes still come from the DEM.
 float stone=smoothstep(.07,.28,slope)*smoothstep(1.2,6.,terrainPosition.y);
 stone=mix(stone,smoothstep(.055,.24,slope)*smoothstep(.8,4.,terrainPosition.y),regionalStyle);
 vec2 cliffUV=vec2(dot(p,vec2(.73,.68))*.52,terrainPosition.y*.23);
 float fissure=smoothstep(.57,.77,fbm(cliffUV));
 vec3 rock=mix(vec3(.48,.46,.39),vec3(.23,.25,.23),fissure);
 float strataPhase=terrainPosition.y*2.3+noise2(p*.14)*2.;
 float strata=.91+.09*sin(strataPhase)*(1.-smoothstep(.4,2.,fwidth(strataPhase)));
 float scree=fbm(p*.65+terrainPosition.y*.7);
 rock*=.86+scree*.26;
 float cleft=smoothstep(.70,.84,fbm(vec2(dot(p,vec2(.83,.55))*1.6,terrainPosition.y*.075)));
 rock*=1.-cleft*.28;land=mix(land,rock*strata,stone);
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
  land=mix(land,mix(field.rgb,seasonField,.40),field.a*.78);
 }
 if(hasTerrainAtlas>.5){
  // Mirrored quadrants prevent seams and mip bleeding; triplanar rock follows steep faces.
  vec3 grassTex=terrainSwatch(p*.34,vec2(0.,.5));
  vec3 weights=pow(abs(normalize(terrainNormal)),vec3(4.));weights/=max(.001,weights.x+weights.y+weights.z);
  vec3 rockTex=terrainSwatch(terrainPosition.zy*.23,vec2(.5,.5))*weights.x+terrainSwatch(p*.23,vec2(.5,.5))*weights.y+terrainSwatch(terrainPosition.xy*.23,vec2(.5,.5))*weights.z;
  float textureDetail=mix(dot(grassTex,vec3(.3,.59,.11))*2.8+.44,dot(rockTex,vec3(.3,.59,.11))*1.9+.34,stone);
  float detailFade=1.-smoothstep(1.,5.,length(fwidth(p)));
  land*=mix(1.,clamp(textureDetail,.48,1.4),detailFade*.85);
 }
 float snowCover=0.;
 if(seasonSnow>.001){
 // Display elevation is exaggerated: these are art thresholds, not a climatic snowline.
 vec3 groundNormal=normalize(terrainNormal);
 float altitude=smoothstep(4.,21.,terrainPosition.y);
 vec2 driftUV=p*.08+vec2(noise2(p*.035),noise2(p*.035+37.))*1.4;
 float driftGrain=mix(noise2(p*.4),.5,smoothstep(.1,.7,length(fwidth(p*.4))));
 float drift=fbm(driftUV)*.86+driftGrain*.14;
 // Sunward faces thaw first; steep rock faces retain only isolated snow shelves.
 float sunward=dot(groundNormal.xz,normalize(vec2(-135.,80.)));
 float retention=smoothstep(.40,.88,groundNormal.y);
 float accumulation=.20+altitude*.38+drift*.48-sunward*.13;
 snowCover=seasonSnow*retention*smoothstep(.38,.74,accumulation);
 float snowLight=clamp(.52+sunward*.30+(drift-.5)*.22,0.,1.);
 vec3 snowColor=mix(vec3(.56,.65,.72),vec3(.84,.85,.81),snowLight);
 land=mix(land,snowColor,snowCover);
 }
 // Keep grain on exposed earth, but avoid stamping the soil texture into deep snow.
 float turf=fbm(p*1.7);float soilGrain=mix(.74+turf*.38+fine*.12,.97+fine*.045,snowCover);
 diffuseColor.rgb*=land*soilGrain;
 ${options.fade===false?'':'float edge=min(min(p.x+276.,294.4-p.x),min(p.y+133.2,144.3-p.y));diffuseColor.a*=smoothstep(0.,14.,edge);'}
 `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
 float rugged=stone;
 float rockFootprint=length(fwidth(terrainPosition.xz));
 float relief=(noise2(terrainPosition.xz*3.)*.13*(1.-smoothstep(.15,.5,rockFootprint))+noise2(terrainPosition.xz*10.)*.022*(1.-smoothstep(.04,.16,rockFootprint)))*rugged*(1.-snowCover*.85);
 vec3 q0=dFdx(-vViewPosition),q1=dFdy(-vViewPosition);
 vec3 r1=cross(q1,normal),r2=cross(normal,q0);float determinant=dot(q0,r1);
 normal=normalize(abs(determinant)*normal-sign(determinant)*(dFdx(relief)*r1+dFdy(relief)*r2));
 `);
 };
 return Object.assign(m,{setRegionalStyle(value:number){regionalStyle.value=value;},setFarms(next:FarmFields){farmUniforms.farmAtlas.value=next.map;farmUniforms.hasFarms.value=1;farmUniforms.farmCount.value=Math.min(36,next.centers.length);farmUniforms.farmGrid.value.set(next.columns??2,next.rows??1);farmUniforms.farmCenters.value.forEach((c,i)=>c.set(next.centers[i]?.x??1e8,next.centers[i]?.z??1e8));}});
}
export function waterMaterial(){
 const m=new MeshStandardMaterial({color:'#285d6b',roughness:.32,metalness:.12,side:DoubleSide});m.name='Campaign river';
 m.onBeforeCompile=s=>{
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 riverUV;').replace('#include <begin_vertex>','#include <begin_vertex>\nriverUV=uv;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 riverUV;').replace('#include <color_fragment>',`#include <color_fragment>
   float shore=pow(abs(riverUV.x-.5)*2.,5.);
   float ripplePhase=riverUV.y*31.+sin(riverUV.x*17.+riverUV.y*3.);
   float ripple=.96+.04*sin(ripplePhase)*(1.-smoothstep(.4,2.,fwidth(ripplePhase)));
   diffuseColor.rgb=mix(diffuseColor.rgb*ripple,vec3(.20,.28,.22),shore*.65);
  `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   float flow=riverUV.y*23.+sin(riverUV.x*18.+riverUV.y*2.);
   float rippleDetail=1.-smoothstep(.5,3.,fwidth(flow));
   normal=normalize(normal+vec3(sin(flow)*.045,cos(flow*.71)*.018,0.)*rippleDetail);
  `).replace('#include <opaque_fragment>',`float riverFresnel=pow(1.-max(0.,dot(normal,normalize(vViewPosition))),3.);
   outgoingLight=mix(outgoingLight,vec3(.43,.53,.55),riverFresnel*.32);
   #include <opaque_fragment>`);
 };
 return m;
}
export const fieldColors=['#aaa452','#b9aa62','#c1b67d','#879249','#b29a52'].map(c=>new Color(c));
