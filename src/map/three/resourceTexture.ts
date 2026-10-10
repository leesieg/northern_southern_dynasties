import {Texture,SRGBColorSpace} from 'three';
import {mapResource} from '../resourceLoader';
import {geographic,gridHeight,campaignHeight,WORLD_KM,type DEMGrid} from './geography';

export function paperTexture(color:string){const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const context=canvas.getContext('2d')!;context.fillStyle=color;context.fillRect(0,0,1,1);const texture=new Texture(canvas);texture.colorSpace=SRGBColorSpace;texture.flipY=false;texture.needsUpdate=true;return texture;}
/** Coarse strategic normals and heights come from the same genuine national DEM. */
export function coarseReliefTexture(meta:DEMGrid,values:Float32Array){
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=96;const context=canvas.getContext('2d')!,image=context.createImageData(128,96);
 const height=(x:number,y:number)=>{const px=meta.west+Math.max(0,Math.min(127,x))/127*meta.width,py=meta.north+Math.max(0,Math.min(95,y))/95*meta.height;return campaignHeight(gridHeight(values,meta,px,py)??0,geographic(px,py).lat);};
 for(let y=0;y<96;y++)for(let x=0;x<128;x++){const dx=-(height(x+1,y)-height(x-1,y))/(meta.width*WORLD_KM/127*2),dz=-(height(x,y+1)-height(x,y-1))/(meta.height*WORLD_KM/95*2),length=Math.hypot(dx,1,dz),i=(y*128+x)*4;image.data.set([(dx/length*.5+.5)*255,(1/length*.5+.5)*255,(dz/length*.5+.5)*255,Math.max(0,Math.min(1,height(x,y)/180))*255],i);}
 context.putImageData(image,0,0);const texture=new Texture(canvas);texture.flipY=false;texture.needsUpdate=true;return texture;
}
export async function resourceTexture(path:string,signal?:AbortSignal,flipY=false){const response=await mapResource(path,{signal,priority:2}),bitmap=await createImageBitmap(await response.blob(),{colorSpaceConversion:'none',imageOrientation:flipY?'flipY':'none'}),texture=new Texture(bitmap);texture.colorSpace=SRGBColorSpace;texture.flipY=false;texture.needsUpdate=true;texture.addEventListener('dispose',()=>bitmap.close());return texture;}
/** Preserve texture identity so already compiled shaders and actors see the new artwork. */
export function installTexture(target:Texture,loaded:Texture){target.image=loaded.image;target.colorSpace=loaded.colorSpace;target.flipY=loaded.flipY;target.anisotropy=loaded.anisotropy;target.needsUpdate=true;target.addEventListener('dispose',()=>loaded.dispose());}
