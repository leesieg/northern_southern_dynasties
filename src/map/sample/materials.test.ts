import {it,expect} from 'vitest';
import {Texture,ShaderLib,type WebGLRenderer} from 'three';
import {terrainMaterial} from './materials';
import {createSeasonState} from './seasons';
it('updates farmland uniforms without replacing the compiled terrain material or season state',()=>{
 const season=createSeasonState(),material=terrainMaterial(undefined,season,{fade:false});
 const shader={vertexShader:ShaderLib.standard.vertexShader,fragmentShader:ShaderLib.standard.fragmentShader,uniforms:{...ShaderLib.standard.uniforms}};
 material.onBeforeCompile(shader as Parameters<typeof material.onBeforeCompile>[0],{} as WebGLRenderer);const version=material.version,first=new Texture(),second=new Texture();
 material.setFarms({map:first,centers:[{x:10,z:20}],columns:6,rows:6});
 expect(shader.uniforms.farmAtlas.value).toBe(first);expect(shader.uniforms.farmCount.value).toBe(1);
 material.setFarms({map:second,centers:Array.from({length:36},(_,i)=>({x:i,z:i*2})),columns:6,rows:6});
 expect(shader.uniforms.farmAtlas.value).toBe(second);expect(shader.uniforms.farmCenters.value[35].toArray()).toEqual([35,70]);
 material.setRegionalStyle(1);expect(shader.uniforms.regionalStyle.value).toBe(1);material.setRegionalStyle(0);expect(shader.uniforms.regionalStyle.value).toBe(0);
 expect(material.version).toBe(version);expect(shader.uniforms.seasonSnow).toBe(season.uniforms.seasonSnow);
 season.set('winter');expect(shader.uniforms.seasonSnow.value).toBeGreaterThan(0);material.dispose();first.dispose();second.dispose();
});
