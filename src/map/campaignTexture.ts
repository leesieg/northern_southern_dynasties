import {DataTexture,RGBAFormat,SRGBColorSpace,LinearFilter} from 'three';
/** Original monochrome tile/wall/timber/earth atlas. Multiplies the established ink-green and earth pigments. */
export function campaignTexture(){
 const width=256,height=64,data=new Uint8Array(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const local=x%64,tile=Math.floor(x/64),noise=((Math.imul(x+11,374761393)^Math.imul(y+23,668265263))>>>0)%13;
  const line=tile===0?local%8===0||y%12===0:tile===1?y%10===0||(local+(Math.floor(y/10)%2)*16)%32===0:tile===2?local%11===0:false;
  const v=line?185:242+noise,index=(y*width+x)*4;
  data[index]=data[index+1]=data[index+2]=v;data[index+3]=255;
 }
 const texture=new DataTexture(data,width,height,RGBAFormat);texture.colorSpace=SRGBColorSpace;texture.magFilter=LinearFilter;texture.minFilter=LinearFilter;texture.needsUpdate=true;return texture;
}
