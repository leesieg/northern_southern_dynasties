import type {FeatureCollection} from 'geojson';
import {projectGround} from '../three/geography';
export const ATLAS_PAPER_COLOR='#d6d3bd';
/** Feather only inward. A pixel outside authoritative coverage never reveals map ink. */
export function inwardPaperCoverage(coverage:number,blurred:number){
 const t=Math.max(0,Math.min(1,(blurred-.48)/.50));
 return Math.max(0,Math.min(1,coverage))*t*t*(3-2*t);
}
export function paperCoverageMask(realms:FeatureCollection,center:{x:number;z:number},span:number){
 const size=2048,mask=document.createElement('canvas');mask.width=mask.height=size;
 const ctx=mask.getContext('2d')!;ctx.fillStyle='#fff';
 for(const feature of realms.features){const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.type==='MultiPolygon'?feature.geometry.coordinates:[];
  for(const polygon of polygons){ctx.beginPath();for(const ring of polygon){ring.forEach((v,i)=>{const p=projectGround(v[0],v[1]),x=((p.x-center.x)/span+.5)*size,y=((p.z-center.z)/span+.5)*size;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.closePath();}ctx.fill('evenodd');}
 }
 const softened=document.createElement('canvas');softened.width=softened.height=size;const soft=softened.getContext('2d')!;
 soft.filter=`blur(${Math.max(1.3,Math.min(6,18*size/span))}px)`;soft.drawImage(mask,0,0);
 const raw=ctx.getImageData(0,0,size,size),blur=soft.getImageData(0,0,size,size);
 for(let i=3;i<raw.data.length;i+=4)raw.data[i]=Math.round(255*inwardPaperCoverage(raw.data[i]/255,blur.data[i]/255));
 ctx.putImageData(raw,0,0);return mask;
}
