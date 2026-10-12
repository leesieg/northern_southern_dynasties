import {PlaneGeometry} from 'three';

export interface PaperBounds {minX:number;minZ:number;maxX:number;maxZ:number}
/** Crop the physical sheet, preserving the canvas's geographic UV coordinates. */
export function paperGeometry(center:{x:number;z:number},span:number,bounds?:PaperBounds){
 const minX=Math.max(center.x-span/2,bounds?.minX??-Infinity),maxX=Math.min(center.x+span/2,bounds?.maxX??Infinity);
 const minZ=Math.max(center.z-span/2,bounds?.minZ??-Infinity),maxZ=Math.min(center.z+span/2,bounds?.maxZ??Infinity);
 const geometry=new PlaneGeometry(Math.max(0,maxX-minX),Math.max(0,maxZ-minZ));
 geometry.translate((minX+maxX)/2-center.x,center.z-(minZ+maxZ)/2,0);
 const positions=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');
 for(let i=0;i<positions.count;i++)uv.setXY(i,positions.getX(i)/span+.5,positions.getY(i)/span+.5);
 return geometry;
}
