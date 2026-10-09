import {Group,Mesh,MeshStandardMaterial,PointLight,TextureLoader,RepeatWrapping,SRGBColorSpace,type Texture} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {WORLD_KM,ORIGIN,geographic} from './geography';
// Same physical extent as national-terrain.json; model units are 1000 projected kilometres.
export const TABLE_CENTER={x:(.78125-ORIGIN.x)*WORLD_KM,z:(.375-ORIGIN.y)*WORLD_KM};
export const TABLE_COORDINATE=geographic(.78125,.375);
export function tableRoomStrength(zoom:number){const t=Math.max(0,Math.min(1,(2.7-zoom)/.7));return t*t*(3-2*t);}
export async function loadTableRoom(painting:Texture,wood?:Texture){
 const response=await fetch(import.meta.env.BASE_URL+'art/campaign/atlas-study-v2.glb',{signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw new Error('室内舆图模型加载失败（'+response.status+'）');
 const model=(await new GLTFLoader().parseAsync(await response.arrayBuffer(),'')).scene;
 const timber=wood??await new TextureLoader().loadAsync(import.meta.env.BASE_URL+'art/campaign/study-walnut-v2.jpg');timber.wrapS=timber.wrapT=RepeatWrapping;timber.colorSpace=SRGBColorSpace;timber.anisotropy=4;
 const root=new Group();root.add(model);root.scale.setScalar(1000);root.position.set(TABLE_CENTER.x,0,TABLE_CENTER.z);model.visible=false;
 const materials=new Set<MeshStandardMaterial>();model.traverse(o=>{if(o instanceof Mesh){o.castShadow=false;o.receiveShadow=false;for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof MeshStandardMaterial){m.fog=false;m.transparent=true;
 if(m.name==='Study window silk'){m.emissive.set('#cbd8dc');m.emissiveIntensity=.35;}
 if(m.name==='Study flame'){m.emissive.set('#ffb347');m.emissiveIntensity=2;}
 if(m.name==='Study screen silk'){m.map=painting;m.color.set('#526248');m.roughness=1;m.needsUpdate=true;}
 if(['Study timber','Study edge','Study floor'].includes(m.name)){
  m.onBeforeCompile=s=>{
   s.uniforms.studyWood={value:timber};
   s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 studyPosition; varying vec3 studyNormal;').replace('#include <begin_vertex>','#include <begin_vertex>\nstudyPosition=position;studyNormal=normal;');
   s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 studyPosition;varying vec3 studyNormal;uniform sampler2D studyWood;').replace('#include <color_fragment>',`#include <color_fragment>
    vec3 weights=pow(abs(normalize(studyNormal)),vec3(6.));weights/=max(.001,weights.x+weights.y+weights.z);
    vec3 woodSample=texture2D(studyWood,studyPosition.zy*vec2(.35,.24)).rgb*weights.x+texture2D(studyWood,studyPosition.xz*vec2(.35,.18)).rgb*weights.y+texture2D(studyWood,studyPosition.xy*vec2(.35,.24)).rgb*weights.z;
    float fiber=clamp(dot(woodSample,vec3(.2126,.7152,.0722))/.115,.32,1.85);
    diffuseColor.rgb*=fiber;
   `);
  };
  m.customProgramCacheKey=()=> 'atlas-study-timber-v3';
 }
 if(['Study wall','Study woven reed','Study cushion','Study screen silk'].includes(m.name)){
  const plaster=m.name==='Study wall';m.roughness=plaster?.98:.94;
  m.onBeforeCompile=s=>{
   s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 studyPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nstudyPosition=position;');
   s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
    varying vec3 studyPosition;
    float studyHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
    float studyNoise(vec3 p){
     vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
     return mix(mix(mix(studyHash(i),studyHash(i+vec3(1,0,0)),f.x),mix(studyHash(i+vec3(0,1,0)),studyHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(studyHash(i+vec3(0,0,1)),studyHash(i+vec3(1,0,1)),f.x),mix(studyHash(i+vec3(0,1,1)),studyHash(i+vec3(1,1,1)),f.x),f.y),f.z);
    }
   `).replace('#include <color_fragment>',`#include <color_fragment>
    float mottling=studyNoise(studyPosition*7.);
    ${plaster?`float pores=studyNoise(studyPosition*110.);
    diffuseColor.rgb*=.86+.18*mottling+.08*(pores-.5);`:`vec3 thread=studyPosition*vec3(140.,140.,172.);
    vec3 resolved=vec3(1.)-smoothstep(vec3(.7),vec3(2.5),fwidth(thread));
    float weave=dot(cos(thread)*resolved,vec3(.333));
    diffuseColor.rgb*=.91+.12*mottling+.14*weave;`}
   `);
  };
  m.customProgramCacheKey=()=>plaster?'atlas-study-plaster-v1':'atlas-study-weave-v1';
 }
 materials.add(m);}}});
 const lamps=[-7.15,7.15].map(x=>{const lamp=new PointLight('#ffc375',0,14000,0);lamp.position.set(x,.32,-5.55);root.add(lamp);return lamp;});
 return {root,update(zoom:number){const opacity=tableRoomStrength(zoom);model.visible=opacity>0;lamps.forEach(l=>{l.intensity=.14*opacity;});for(const m of materials){m.opacity=opacity;m.depthWrite=opacity===1;}},dispose(){root.removeFromParent();model.traverse(o=>{if(o instanceof Mesh)o.geometry.dispose();});materials.forEach(m=>m.dispose());if(!wood)timber.dispose();}};
}
