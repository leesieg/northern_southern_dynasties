import * as T from 'three';
const ownedSurfaces=new WeakMap<T.Object3D,T.Texture[]>();
export function releasePortraitSurfaces(root:T.Object3D){ownedSurfaces.get(root)?.forEach(t=>t.dispose());ownedSurfaces.delete(root);}
/** Tileable material microstructure; deliberately no painted facial features. */
export function surfaceTexture(kind:'skin'|'cloth'|'hair'){
 const size=128,data=new Uint8Array(size*size*4);let seed=546;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
 seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=(seed/4294967296-.5);
 const v=kind==='cloth'?128+Math.sin(x*Math.PI/2)*25+Math.sin(y*Math.PI/2)*25+noise*12:kind==='hair'?128+Math.sin(x*1.8)*42+noise*15:128+noise*65;
 const index=(y*size+x)*4;data[index]=data[index+1]=data[index+2]=Math.round(v);data[index+3]=255;
 }
 const texture=new T.DataTexture(data,size,size,T.RGBAFormat);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.repeat.set(kind==='cloth'?8:kind==='skin'?5:2,kind==='hair'?1:5);texture.needsUpdate=true;return texture;
}
export function applyPortraitSurfaces(root:T.Object3D){
 const skin=surfaceTexture('skin'),cloth=surfaceTexture('cloth'),hair=surfaceTexture('hair');
 root.traverse(o=>{if(!(o instanceof T.Mesh))return;const m=o.material as T.MeshStandardMaterial;if(m.name==='skin'){m.bumpMap=skin;m.bumpScale=.0016;m.roughness=.57;}else if(m.name==='cloth'){m.bumpMap=cloth;m.bumpScale=.0025;m.roughness=.91;}else if(m.name==='hair'){m.bumpMap=hair;m.bumpScale=.004;m.roughness=.7;}m.needsUpdate=true;});
 // Own all textures, even a wardrobe variant that does not use every surface.
 ownedSurfaces.set(root,[skin,cloth,hair]);
}
