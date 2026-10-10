import {Texture,SRGBColorSpace} from 'three';
import type {DEMGrid} from './geography';
import {mapResource} from '../resourceLoader';
/** Offline geographic artwork. No per-load pixel painting and no game-state data. */
export async function parchmentTexture(meta:DEMGrid,hidden=false,signal?:AbortSignal){
 const response=await mapResource('art/campaign/'+(hidden?'hidden-shanshui-v2.png':'national-parchment.webp'),{signal,priority:2});
 if(!response.ok)throw new Error('战略纸绘加载失败（'+response.status+'）');
 const bitmap=await createImageBitmap(await response.blob(),{colorSpaceConversion:'none'}),texture=new Texture(bitmap);
 texture.flipY=false;texture.colorSpace=SRGBColorSpace;texture.needsUpdate=true;
 texture.userData.extent=[meta.west,meta.north,meta.width,meta.height];
 texture.addEventListener('dispose',()=>bitmap.close());return texture;
}

/** Linear data, not an sRGB colour image: RGB normal, alpha display height / 180. */
export async function strategicReliefTexture(signal?:AbortSignal){
 const response=await mapResource('art/campaign/national-relief.png',{signal,priority:2});
 if(!response.ok)throw new Error('全国战略山纹加载失败（'+response.status+'）');
 const bitmap=await createImageBitmap(await response.blob(),{colorSpaceConversion:'none',premultiplyAlpha:'none'}),texture=new Texture(bitmap);
 texture.flipY=false;texture.needsUpdate=true;texture.addEventListener('dispose',()=>bitmap.close());return texture;
}
