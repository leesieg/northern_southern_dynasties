import {Group,Mesh,MeshStandardMaterial} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {WORLD_KM,ORIGIN,geographic} from './geography';
// Same physical extent as national-terrain.json; model units are 1000 projected kilometres.
export const TABLE_CENTER={x:(.78125-ORIGIN.x)*WORLD_KM,z:(.375-ORIGIN.y)*WORLD_KM};
export const TABLE_COORDINATE=geographic(.78125,.375);
export function tableRoomStrength(zoom:number){const t=Math.max(0,Math.min(1,(2.7-zoom)/.7));return t*t*(3-2*t);}
export async function loadTableRoom(){
 const response=await fetch(import.meta.env.BASE_URL+'art/campaign/atlas-study.glb',{signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw new Error('室内舆图模型加载失败（'+response.status+'）');
 const model=(await new GLTFLoader().parseAsync(await response.arrayBuffer(),'')).scene;
 const root=new Group();root.add(model);root.scale.setScalar(1000);root.position.set(TABLE_CENTER.x,0,TABLE_CENTER.z);root.visible=false;
 const materials=new Set<MeshStandardMaterial>();model.traverse(o=>{if(o instanceof Mesh){o.castShadow=false;o.receiveShadow=false;for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof MeshStandardMaterial){m.fog=false;
 if(m.name==='Study timber'||m.name==='Study edge'){
  m.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 studyPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nstudyPosition=position;');s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 studyPosition;').replace('#include <color_fragment>','#include <color_fragment>\nfloat grain=sin(studyPosition.z*95.+sin(studyPosition.x*2.)*3.+studyPosition.y*7.);diffuseColor.rgb*=.88+grain*.09;');};
  m.customProgramCacheKey=()=> 'atlas-study-timber-v1';
 }
 materials.add(m);}}});
 return {root,update(zoom:number){const opacity=tableRoomStrength(zoom);root.visible=opacity>0;for(const m of materials){m.transparent=opacity<1;m.opacity=opacity;m.depthWrite=opacity===1;}},dispose(){root.removeFromParent();model.traverse(o=>{if(o instanceof Mesh)o.geometry.dispose();});materials.forEach(m=>m.dispose());}};
}
