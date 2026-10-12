import {ATLAS_PAPER_COLOR} from '../artSample/paperCoverage';
import {Color,ShaderMaterial,Vector4} from 'three';
import {WORLD_KM,ORIGIN} from './geography';
/** Opaque unmodeled territory; strategic mode samples the live atlas substrate itself. */
export function hiddenTerrainMaterial(){
 return new ShaderMaterial({transparent:true,toneMapped:false,depthWrite:false,depthTest:false,uniforms:{
  coverage:{value:null},atlas:{value:null},atlasExtent:{value:new Vector4()},strategic:{value:0},paperReady:{value:0},paperColor:{value:new Color(ATLAS_PAPER_COLOR)},fogColor:{value:new Color('#bdc6c1')},
 },vertexShader:`varying vec2 ground;
 void main(){ground=position.xz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`varying vec2 ground;
 uniform sampler2D coverage;uniform sampler2D atlas;uniform vec4 atlasExtent;uniform float strategic;uniform float paperReady;uniform vec3 paperColor;uniform vec3 fogColor;
 void main(){
  vec2 uv=vec2(ground.x/${WORLD_KM}+${ORIGIN.x},ground.y/${WORLD_KM}+${ORIGIN.y});
  float known=texture2D(coverage,uv).r;
  float cloud=.5+.22*sin(ground.x*.032+sin(ground.y*.021))+.18*cos(ground.y*.049);
  float alpha=1.-smoothstep(.05,.7,known);if(alpha<.002)discard;
  vec2 atlasUV=(ground-atlasExtent.xy)/atlasExtent.zw;
  bool onSheet=all(greaterThanEqual(atlasUV,vec2(0.)))&&all(lessThanEqual(atlasUV,vec2(1.)));
  vec3 paper=paperColor;
  if(paperReady>.5&&onSheet)paper=texture2D(atlas,vec2(atlasUV.x,1.-atlasUV.y)).rgb;
  // Fully strategic coverage is composited into the same fibre canvas as the map.
  gl_FragColor=vec4(mix(fogColor*(.91+cloud*.15),paper,strategic),alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`});
}
