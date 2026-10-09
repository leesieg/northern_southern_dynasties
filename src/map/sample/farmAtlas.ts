import {CanvasTexture,SRGBColorSpace} from 'three';
import {fieldColors} from './materials';
import {seededRandom} from './geography';
import {woodlandCover} from '../three/vegetation';
/** Original campaign farm layout; visual parcels, never simulated acreage. */
export function campaignFarmAtlas(centers:{x:number;z:number;radius?:number}[],height:(x:number,z:number)=>number|null){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=1536;const ctx=canvas.getContext('2d')!;
 for(const [index,c] of centers.slice(0,36).entries()){const random=seededRandom(Math.round(c.x*31+c.z*17));for(let ix=-10;ix<=10;ix++)for(let iz=-10;iz<=10;iz++){
  const x=c.x+ix*2.9,z=c.z+iz*2.5,w=2.3+random()*.4,d=1.5+random()*.7,h=height(x,z),left=height(x-w,z),right=height(x+w,z);
  // Share the actual grove field, including parcel corners: no square crop tiles under trees.
  const wooded=[[-w,-d],[-w,d],[w,-d],[w,d],[0,0]].some(([dx,dz])=>woodlandCover(x+dx,z+dz)>.47);
  if(wooded||h===null||h<.2||left===null||right===null||Math.abs(left-right)>.65||Math.abs(x-c.x)<(c.radius??11)+w/2&&Math.abs(z-c.z)<(c.radius??7.5)+d/2||Math.hypot(ix,iz)>11||random()<.26)continue;
  const px=(index%6)*256+(x-c.x+35)/70*256,py=Math.floor(index/6)*256+(z-c.z+35)/70*256,pw=w/70*256,ph=d/70*256;
  ctx.save();ctx.globalAlpha=.68;ctx.beginPath();ctx.moveTo(px-pw/2,py-ph/2+random()*.5);ctx.lineTo(px+pw/2,py-ph/2+random()*.75);ctx.lineTo(px+pw/2-random()*.75,py+ph/2);ctx.lineTo(px-pw/2+random()*.5,py+ph/2-random()*.5);ctx.closePath();ctx.clip();ctx.filter='blur(.35px)';ctx.fillStyle=fieldColors[Math.floor(random()*fieldColors.length)].getStyle();ctx.fillRect(px-pw/2,py-ph/2,pw,ph);ctx.fillStyle='rgba(44,61,21,.17)';for(let row=0;row<ph;row+=.75)ctx.fillRect(px-pw/2,py-ph/2+row,pw,.25);ctx.restore();
 }
 }
 const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;return texture;
}
