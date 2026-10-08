import {Texture,SRGBColorSpace} from 'three';
import type {DEMGrid} from './geography';
/** Offline geographic artwork. No per-load pixel painting and no game-state data. */
export async function parchmentTexture(meta:DEMGrid){
 const response=await fetch(import.meta.env.BASE_URL+'art/campaign/national-parchment.webp',{signal:AbortSignal.timeout(25000)});
 if(!response.ok)throw new Error('战略纸绘加载失败（'+response.status+'）');
 const bitmap=await createImageBitmap(await response.blob(),{colorSpaceConversion:'none'}),texture=new Texture(bitmap);
 texture.flipY=false;texture.colorSpace=SRGBColorSpace;texture.needsUpdate=true;
 texture.userData.extent=[meta.west,meta.north,meta.width,meta.height];
 texture.addEventListener('dispose',()=>bitmap.close());return texture;
}
