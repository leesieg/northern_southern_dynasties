import {AmbientLight,Camera,DirectionalLight,DoubleSide,FogExp2,HemisphereLight,Matrix4,MeshStandardMaterial,Scene,Vector3,type Texture} from 'three';
import {CAMPAIGN_SUN,CAMPAIGN_FOG_COLOR} from './campaignTerrain';

/** Keep the map's view transform out of the projection: PBR needs the actual eye and view normals. */
export function updateMilitaryCamera(camera:Camera,projection:ArrayLike<number>,mercatorProjection:ArrayLike<number>,anchor:Matrix4){
 camera.matrixAutoUpdate=false;camera.matrixWorldAutoUpdate=false;
 camera.projectionMatrix.fromArray(projection);camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
 camera.matrixWorldInverse.copy(camera.projectionMatrixInverse).multiply(new Matrix4().fromArray(mercatorProjection)).multiply(anchor);
 camera.matrixWorld.copy(camera.matrixWorldInverse).invert();
}

export function addMilitaryLighting(scene:Scene){
 scene.fog=new FogExp2(CAMPAIGN_FOG_COLOR,60);
 const sky=new HemisphereLight('#fff2cf','#526253',1.6);sky.position.set(0,0,1); // Mercator Z is up, not Three's default Y.
 const key=new DirectionalLight(CAMPAIGN_SUN.color,CAMPAIGN_SUN.intensity);key.position.set(CAMPAIGN_SUN.x,CAMPAIGN_SUN.y,CAMPAIGN_SUN.z);
 const fill=new DirectionalLight('#dbe3cf',1.1);fill.position.set(.8,-1,.8);
 scene.add(new AmbientLight('#f3ebd3',.35),sky,key,fill);
}

export function militarySurfaceMaterial(color:string,map?:Texture,metalness=0){
 // The atlas is painted color, not a height map. Sculpted geometry supplies the relief.
 // Weathered metal keeps a diffuse component in this lightweight pass without an HDR environment.
 const material=new MeshStandardMaterial({color,map:map??null,roughness:metalness?.72:.88,metalness,side:DoubleSide});
 if(map){
  // Painted atlas shadows must not multiply the physical lighting at full strength.
  // Blend albedo in linear space, keeping real light response (no emissive floor).
  material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`vec3 militaryBaseAlbedo = diffuseColor.rgb;
#include <map_fragment>
diffuseColor.rgb = mix(militaryBaseAlbedo, diffuseColor.rgb, 0.48);`);};
  material.customProgramCacheKey=()=> 'military-albedo-v1';
 }
 return material;
}

/** Match a screen unit at this anchor, including perspective and terrain, instead of only using zoom. */
export function militaryModelScale(matrix:ArrayLike<number>,at:{x:number;y:number;z:number},width:number,pixels:number){
 const w=matrix[3]*at.x+matrix[7]*at.y+matrix[11]*at.z+matrix[15],x=matrix[0]*at.x+matrix[4]*at.y+matrix[8]*at.z+matrix[12];
 const pixelsPerUnit=Math.abs(width*.5*(matrix[0]*w-x*matrix[3])/(w*w));
 return pixels/pixelsPerUnit;
}

export function positionMilitaryModel(matrix:Matrix4,at:{x:number;y:number;z:number},origin:{x:number;y:number},scale:number){
 return matrix.makeTranslation(at.x-origin.x,origin.y-at.y,at.z).scale(new Vector3(scale,scale,scale)).multiply(new Matrix4().makeRotationX(Math.PI/2));
}
