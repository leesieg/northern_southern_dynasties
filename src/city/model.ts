import * as THREE from 'three';
import {cityRoofGeometry,cityRoofTiles,cityWindowGeometry} from './architecture';
import type { CityBuilding,CityHolding } from '../core/construction';

export const cityPlots:Record<CityBuilding,[number,number]>={market:[-3.8,2.8],granary:[3.9,-1.2],hostel:[3.9,4]};
export function cityModelState(holding:CityHolding,day:number){
  return (Object.keys(cityPlots) as CityBuilding[]).map(id=>{
    const project=holding.project?.building===id?holding.project:null;
    return {id,level:holding.levels[id],target:project?.level??null,
      progress:project?Math.max(0,Math.min(1,(day-project.started)/(project.due-project.started))):null,
      remaining:project?Math.max(0,project.due-day):0};
  });
}
const colors={earth:0x807651,stone:0x9a947c,wall:0xb2a17b,plaster:0xdfc9a0,wood:0x66503a,roof:0x485e57,road:0xc0ad80,leaf:0x687856,gold:0xd6b36b};
export function createCityModel(holding:CityHolding,day:number,capital=false,selected:CityBuilding|null=null){
  const root=new THREE.Group();
  const geometryCache=new Map<string,THREE.BufferGeometry>();
  function geometry(key:string,make:()=>THREE.BufferGeometry){if(!geometryCache.has(key))geometryCache.set(key,make());return geometryCache.get(key)!;}
  const materials=new Map<number,THREE.MeshStandardMaterial>();
  function material(color:number){if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.93}));return materials.get(color)!;}
  function mesh(parent:THREE.Group,geometry:THREE.BufferGeometry,color:number,x:number,y:number,z:number){
    const m=new THREE.Mesh(geometry,material(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
  }
  function box(g:THREE.Group,x:number,y:number,z:number,w:number,h:number,d:number,color:number){const m=mesh(g,geometry('unit-box',()=>new THREE.BoxGeometry(1,1,1)),color,x,y,z);m.scale.set(w,h,d);return m;}
  function roof(g:THREE.Group,x:number,y:number,z:number,w:number,d:number,h:number){
    const key=`${w}:${d}:${h}`;
    mesh(g,geometry('roof:'+key,()=>cityRoofGeometry(w,d,h)),colors.roof,x,y,z);
    mesh(g,geometry('tiles:'+key,()=>cityRoofTiles(w,d,h)),0x65746c,x,y,z);
    box(g,x,y+h+.045,z,w*.61,.09,.105,0x7b8070);
    for(const dx of [-w*.3,w*.3]){const finial=mesh(g,geometry('ridge-end',()=>new THREE.ConeGeometry(.055,.17,6)),colors.roof,x+dx,y+h+.10,z);finial.rotation.z=dx>0?-.35:.35;}
    box(g,x,y-.045,z,w*.9,.11,d*.86,colors.wood);
    for(const dz of [-d*.39,d*.39])box(g,x,y-.13,z+dz,w*.88,.09,.07,0x8f7351);
  }

  function house(g:THREE.Group,x:number,z:number,w=1.5,d=1.2,h=1.1){
    box(g,x,.16,z,w+.22,.28,d+.22,colors.stone);
    box(g,x,.3+h/2,z,w,h,d,colors.plaster);
    const facade=z+d/2+.04;
    for(const dx of [-w/2+.09,0,w/2-.09]){
      mesh(g,geometry('column:'+h,()=>new THREE.CylinderGeometry(.047,.06,h,8)),colors.wood,x+dx,.3+h/2,facade+.05);
      box(g,x+dx,h+.23,facade+.08,.20,.09,.16,colors.wood);
      box(g,x+dx,h+.31,facade+.08,.30,.065,.22,0x8f7351);
    }
    box(g,x,.70,facade,.33,.8,.035,0x443d30);
    for(const dx of [-.12,0,.12])box(g,x+dx,.70,facade+.025,.015,.76,.025,0x917455);
    box(g,x,.22,facade+.18,.60,.12,.35,colors.stone);
    box(g,x,.105,facade+.35,.73,.10,.28,colors.stone);
    if(w>1)for(const dx of [-w*.30,w*.30]){
      box(g,x+dx,.85,facade,.28,.38,.025,0x444b40);
      mesh(g,geometry('window',()=>cityWindowGeometry(.28,.38)),colors.wood,x+dx,.85,facade+.024);
    }
    for(const dz of [-d/2-.005,d/2+.005])box(g,x,.41,z+dz,w,.08,.035,0x9d8d70);
    roof(g,x,h+.33,z,w+.55,d+.52,.55);
  }
  function tree(x:number,z:number){box(root,x,.65,z,.13,1.2,.13,colors.wood);mesh(root,new THREE.IcosahedronGeometry(.65,0),colors.leaf,x,1.45,z);}
  box(root,0,-.38,0,19,.7,18,colors.earth);
  box(root,0,.005,0,1.2,.035,15.5,colors.road);
  box(root,0,.008,0,15.5,.04,.9,colors.road);
  box(root,0,.01,4,15.5,.04,.65,colors.road);
  // Enclosing walls, an open southern gate and corner watchtowers.
  box(root,0,.68,-7.7,16,1.3,.38,colors.wall);
  for(const x of [-7.8,7.8])box(root,x,.68,0,.38,1.3,15.5,colors.wall);
  for(const x of [-4.65,4.65])box(root,x,.68,7.7,6.3,1.3,.38,colors.wall);
  for(const y of [.18,1.28]){
    box(root,0,y,-7.7,16,.12,.47,colors.stone);
    for(const x of [-7.8,7.8])box(root,x,y,0,.47,.12,15.5,colors.stone);
    for(const x of [-4.65,4.65])box(root,x,y,7.7,6.3,.12,.47,colors.stone);
  }
  for(let v=-7.5;v<=7.5;v+=.75){
    box(root,v,1.43,-7.7,.37,.26,.42,colors.stone);
    if(Math.abs(v)>1.6)box(root,v,1.43,7.7,.37,.26,.42,colors.stone);
    for(const x of [-7.8,7.8])box(root,x,1.43,v,.42,.26,.37,colors.stone);
  }
  for(const x of [-7.8,7.8])for(const z of [-7.7,7.7]){box(root,x,1,z,1.15,2,1.15,colors.wall);roof(root,x,2.1,z,1.8,1.8,.6);}
  for(const x of [-1.4,1.4])box(root,x,.95,7.7,.65,1.9,.8,colors.stone);
  box(root,0,2,7.7,3.5,.3,1.2,colors.wall);roof(root,0,2.25,7.7,4,1.8,.65);
  house(root,0,-4.6,capital?3.8:2.8,2.1,capital?1.8:1.4);
  for(const x of [-5.5,-3.4,3.3,5.5])house(root,x,-5,1.3,1.2,.9);
  for(const x of [-5.8,-3.7])house(root,x,-2.4,1.4,1.1,.85);
  for(const [x,z] of [[-6.6,5.6],[6.5,6],[6.5,-3.8],[-1.5,-6.5],[1.7,-6.4],[-6.5,-.6]])tree(x,z);
  for(const state of cityModelState(holding,day)){
    const group=new THREE.Group();group.name=state.id;group.userData.building=state.id;
    const [x,z]=cityPlots[state.id];group.position.set(x,0,z);root.add(group);
    box(group,0,.055,0,3.5,.08,3.5,selected===state.id?colors.gold:0x938668);
    if(state.id==='market'&&state.level){
      house(group,0,-.9,2.1,1,1+state.level*.12);
      for(let i=0;i<state.level+1;i++){
        const px=-1+i*.7;box(group,px,.48,.8,.55,.8,.65,colors.wood);
        for(const dz of [-.4,.4])box(group,px,1,.8+dz,.055,1,.055,colors.wood);
        const awning=box(group,px,1.5,.8,.7,.045,1, i%2?0xaa8253:0xb6b29a);awning.rotation.x=.12;
        for(const dz of [.62,.91]){box(group,px,.94,dz,.42,.12,.19,0x9c7b4d);for(const dx of [-.12,0,.12])mesh(group,geometry('produce',()=>new THREE.SphereGeometry(.052,6,4)),dz<.8?0xb18b52:0x75834b,px+dx,1.025,dz);}
      }
    }
    if(state.id==='granary')for(let i=0;i<state.level;i++){
      const px=-1+i;box(group,px,.28,0,.8,.5,1.7,colors.stone);
      house(group,px,0,.7,1.5,1.1+state.level*.1);
      box(group,px,.94,.79,.32,.18,.03,0x464335);
      mesh(group,geometry('granary-vent',()=>cityWindowGeometry(.32,.18)),colors.wood,px,.94,.815);
    }
    if(state.id==='hostel'&&state.level){
      house(group,0,-.65,2.5,1.3,1+state.level*.3);
      if(state.level>=2)house(group,-1,.85,.7,1.2,.85);
      if(state.level>=3)house(group,1,.85,.7,1.2,.85);
      box(group,0,.11,.85,1.3,.05,.55,colors.stone);
      for(const px of [-.5,0,.5])box(group,px,.35,1.1,.08,.6,.08,colors.wood);
    }
    if(state.progress!==null){
      const works=new THREE.Group();works.name='construction';group.add(works);
      // Upgrades retain finished buildings; scaffolding encloses the existing plot.
      const height=.6+state.progress*1.7;
      for(const px of [-1.55,1.55])for(const pz of [-1.55,1.55])box(works,px,height/2,pz,.09,height,.09,colors.wood);
      for(const y of [.4,height])for(const pz of [-1.55,1.55])box(works,0,y,pz,3.2,.075,.075,colors.gold);
      for(const px of [-1.55,1.55])box(works,px,height,0,.075,.075,3.2,colors.gold);
      for(let i=0;i<3;i++)box(works,-.8+i*.45,.18,1.45,.3,.3,.45,colors.plaster);
    }
  }
  return root;
}
export function disposeCityModel(root:THREE.Object3D){
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
  root.traverse(object=>{if(object instanceof THREE.Mesh){geometries.add(object.geometry);for(const m of Array.isArray(object.material)?object.material:[object.material])materials.add(m);}});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
}
