import {AmbientLight,Camera,DirectionalLight,DoubleSide,HemisphereLight,Matrix4,MeshStandardMaterial,Scene,Vector3,type Texture} from 'three';

/** Keep the map's view transform out of the projection: PBR needs the actual eye and view normals. */
export function updateMilitaryCamera(camera:Camera,projection:ArrayLike<number>,mercatorProjection:ArrayLike<number>,anchor:Matrix4){
 camera.matrixAutoUpdate=false;camera.matrixWorldAutoUpdate=false;
 camera.projectionMatrix.fromArray(projection);camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
 camera.matrixWorldInverse.copy(camera.projectionMatrixInverse).multiply(new Matrix4().fromArray(mercatorProjection)).multiply(anchor);
 camera.matrixWorld.copy(camera.matrixWorldInverse).invert();
}

export function addMilitaryLighting(scene:Scene){
 const sky=new HemisphereLight('#fff4df','#b9baa1',1.65);sky.position.set(0,0,1); // Mercator Z is up, not Three's default Y.
 const key=new DirectionalLight('#fff1d6',2.8);key.position.set(-.7,-1,1.8);
 const fill=new DirectionalLight('#e0e9ee',1.45);fill.position.set(.8,1,.8);
 scene.add(new AmbientLight('#eee4cc',.9),sky,key,fill);
}

export function militarySurfaceMaterial(color:string,map?:Texture,metalness=0){
 // The atlas is painted color, not a height map. Sculpted geometry supplies the relief.
 // Weathered metal keeps a diffuse component in this lightweight pass without an HDR environment.
 return new MeshStandardMaterial({color,map:map??null,roughness:metalness?.72:.94,metalness,side:DoubleSide});
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
