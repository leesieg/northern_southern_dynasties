import {CanvasTexture,SRGBColorSpace} from 'three';
import {fieldColors} from './materials';
import {seededRandom} from './geography';
/** Original campaign farm layout; visual parcels, never simulated acreage. */
export function campaignFarmAtlas(centers:{x:number;z:number}[],height:(x:number,z:number)=>number|null){
 const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=1024;const ctx=canvas.getContext('2d')!,random=seededRandom(546);
 for(const [index,c] of centers.slice(0,2).entries())for(let ix=-10;ix<=10;ix++)for(let iz=-10;iz<=10;iz++){
  const x=c.x+ix*2.9,z=c.z+iz*2.5,w=2.3+random()*.4,d=1.5+random()*.7,h=height(x,z),left=height(x-w,z),right=height(x+w,z);
  if(h===null||h<.2||left===null||right===null||Math.abs(left-right)>.65||Math.abs(x-c.x)<11&&Math.abs(z-c.z)<7.5||Math.hypot(ix,iz)>11||random()<.26)continue;
  const px=index*1024+(x-c.x+35)/70*1024,py=(z-c.z+35)/70*1024,pw=w/70*1024,ph=d/70*1024;
  ctx.save();ctx.beginPath();ctx.moveTo(px-pw/2,py-ph/2+random()*2);ctx.lineTo(px+pw/2,py-ph/2+random()*3);ctx.lineTo(px+pw/2-random()*3,py+ph/2);ctx.lineTo(px-pw/2+random()*2,py+ph/2-random()*2);ctx.closePath();ctx.clip();ctx.fillStyle=fieldColors[Math.floor(random()*fieldColors.length)].getStyle();ctx.fillRect(px-pw/2,py-ph/2,pw,ph);ctx.fillStyle='rgba(44,61,21,.17)';for(let row=0;row<ph;row+=3)ctx.fillRect(px-pw/2,py-ph/2+row,pw,1);ctx.restore();
 }
 const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;return texture;
}
