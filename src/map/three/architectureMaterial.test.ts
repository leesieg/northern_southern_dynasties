import {expect,it} from 'vitest';
import {Mesh,BoxGeometry,Scene,ShaderLib,type WebGLRenderer} from 'three';
import {architectureMaterial,architectureSurface} from './architectureMaterial';
import {createSeasonState} from '../sample/seasons';

it('preserves tile, masonry and timber identity and bounded roughness',()=>{
 expect(architectureSurface('Slate tile',.61)).toEqual([.61,1]);
 expect(architectureSurface('Warm limestone',.94)).toEqual([.94,2]);
 expect(architectureSurface('Dark timber',.82)).toEqual([.82,3]);
 expect(architectureSurface('Courtyard earth',3)).toEqual([1,0]);
});
it('composes architecture shading with seasons without losing either hook',()=>{
 const material=architectureMaterial(),scene=new Scene(),geometry=new BoxGeometry(),seasons=createSeasonState();scene.add(new Mesh(geometry,material));
 seasons.sync(scene);const key=material.customProgramCacheKey(),shader={...ShaderLib.standard,uniforms:{...ShaderLib.standard.uniforms}};
 material.onBeforeCompile(shader as Parameters<typeof material.onBeforeCompile>[0],{} as WebGLRenderer);
 expect(shader.vertexShader).toContain('attribute vec2 architectureSurface');
 expect(shader.fragmentShader).toContain('roughnessFactor*=buildingSurface.x');
 expect(shader.fragmentShader).toContain('seasonSnow*smoothstep');
 expect(shader.fragmentShader).toContain('fwidth');
 seasons.set('winter');seasons.sync(scene);expect(material.customProgramCacheKey()).toBe(key);
 expect(shader.uniforms.seasonSnow.value).toBe(.92);geometry.dispose();material.dispose();
});
