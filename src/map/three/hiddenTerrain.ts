import {Color,ShaderMaterial,Vector4} from 'three';
import {WORLD_KM,ORIGIN} from './geography';
/** Opaque unmodeled territory; strategic art contains natural geography only. */
export function hiddenTerrainMaterial(){
 return new ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,uniforms:{
  coverage:{value:null},parchment:{value:null},paperExtent:{value:new Vector4()},strategic:{value:0},fogColor:{value:new Color('#bdc6c1')},
 },vertexShader:`varying vec2 ground;
 void main(){ground=position.xz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`varying vec2 ground;
 uniform sampler2D coverage;uniform sampler2D parchment;uniform vec4 paperExtent;uniform float strategic;uniform vec3 fogColor;
 void main(){
  vec2 uv=vec2(ground.x/${WORLD_KM}+${ORIGIN.x},ground.y/${WORLD_KM}+${ORIGIN.y});
  float known=texture2D(coverage,uv).r;
  float cloud=.5+.22*sin(ground.x*.032+sin(ground.y*.021))+.18*cos(ground.y*.049);
  float alpha=1.-smoothstep(.05,.7,known);if(alpha<.002)discard;
  vec3 paper=texture2D(parchment,(uv-paperExtent.xy)/paperExtent.zw).rgb;
  // A narrow brown ink wash softens the paper edge without revealing hidden entities.
  float ink=dot(paper,vec3(.2126,.7152,.0722));paper=vec3(mix(.96,ink,.38));
  gl_FragColor=vec4(mix(fogColor*(.91+cloud*.15),paper,strategic),alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`});
}
