import {WORLD_KM,ORIGIN} from './geography';

/** Keep the live sheet inside the same national extent the study table was built around. */
export function paperViewport(center:{x:number;z:number},range:number,extent:readonly number[]){
 const [west,north,width,height]=extent;
 const bounds={minX:(west-ORIGIN.x)*WORLD_KM,minZ:(north-ORIGIN.y)*WORLD_KM,maxX:(west+width-ORIGIN.x)*WORLD_KM,maxZ:(north+height-ORIGIN.y)*WORLD_KM};
 const span=Math.min(Math.max(width,height)*WORLD_KM,840*2**Math.max(0,Math.ceil(Math.log2(Math.max(840,range*1.35)/840)))),cell=span/8;
 const snap=(value:number,min:number,max:number)=>span>=max-min?(min+max)/2:Math.max(min+span/2,Math.min(max-span/2,Math.round(value/cell)*cell));
 return {span,bounds,center:{x:snap(center.x,bounds.minX,bounds.maxX),z:snap(center.z,bounds.minZ,bounds.maxZ)}};
}
