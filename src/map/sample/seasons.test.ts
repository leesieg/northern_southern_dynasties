import {describe,it,expect} from 'vitest';
import {BoxGeometry,Color,Mesh,MeshStandardMaterial,Scene} from 'three';
import {createSeasonState} from './seasons';

describe('sample seasonal materials',()=>{
 it('keeps shared snow state for buildings added during winter and clears it on spring switch',()=>{
  const state=createSeasonState(),scene=new Scene(),snow=state.uniforms.seasonSnow;
  state.set('winter');
  const roof=new MeshStandardMaterial({name:'Slate tile.005',color:'#555f62'});
  scene.add(new Mesh(new BoxGeometry(),roof));state.sync(scene);
  const shader={uniforms:{},vertexShader:'#include <common>\n#include <defaultnormal_vertex>',fragmentShader:'#include <common>\n#include <color_fragment>'};
  roof.onBeforeCompile(shader as never,{} as never);
  expect((shader.uniforms as Record<string,unknown>).seasonSnow).toBe(snow);
  expect(snow.value).toBeGreaterThan(.8);
  state.set('spring');expect(snow.value).toBe(0);
  expect(roof.color.getHexString()).toBe('555f62');
 });
 it('returns foliage to the same summer color without cumulative tinting or affecting flags',()=>{
  const state=createSeasonState(),scene=new Scene();
  const leaf=new MeshStandardMaterial({name:'Leaf olive.003',color:'#526742'}),flag=new MeshStandardMaterial({name:'National flag',color:'#a83c38'});
  scene.add(new Mesh(new BoxGeometry(),leaf),new Mesh(new BoxGeometry(),flag));state.sync(scene);
  const summer=leaf.color.clone();state.set('autumn');state.sync(scene);expect(leaf.color.equals(summer)).toBe(false);
  state.set('winter');state.sync(scene);state.set('summer');state.sync(scene);expect(leaf.color.equals(summer)).toBe(true);
  state.sync(scene);expect(leaf.color.equals(summer)).toBe(true);expect(flag.color.getHexString()).toBe('a83c38');
 });
});

it('preserves baked foliage albedo in summer and applies reversible relative seasonal tint',()=>{
 const state=createSeasonState(),scene=new Scene(),leaf=new MeshStandardMaterial({name:'Leaf campaign',vertexColors:true});
 const geometry=new BoxGeometry(),mesh=new Mesh(geometry,leaf);scene.add(mesh);
 state.sync(scene);expect(leaf.color.toArray()).toEqual([1,1,1]);
 state.set('autumn');state.sync(scene);const autumn=leaf.color.clone();expect(autumn.equals(new Color('#ffffff'))).toBe(false);
 state.sync(scene);expect(leaf.color.equals(autumn)).toBe(true);
 state.set('winter');state.sync(scene);for(const channel of leaf.color.toArray())expect(channel).toBeGreaterThanOrEqual(.45);
 state.set('summer');state.sync(scene);expect(leaf.color.toArray()).toEqual([1,1,1]);
 geometry.dispose();leaf.dispose();
});
