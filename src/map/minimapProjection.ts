import type {FeatureCollection,MultiPolygon,Position} from 'geojson';
import {projectGround,unprojectGround,ORIGIN,WORLD_KM} from './three/geography';
/** A north-up, equal-scale Mercator inset. Political geometry is the same modeled control as the main map. */
export function minimapProjection(regions:FeatureCollection<MultiPolygon>){
 const points=regions.features.flatMap(f=>f.geometry.coordinates.flat(2)).map(p=>projectGround(p[0],p[1]));
 if(!points.length)points.push(projectGround(96,20),projectGround(127,43));
 let west=Infinity,east=-Infinity,north=Infinity,south=-Infinity;
 for(const p of points){west=Math.min(west,p.x);east=Math.max(east,p.x);north=Math.min(north,p.z);south=Math.max(south,p.z);}
 const cx=(west+east)/2,cz=(north+south)/2,scale=172/Math.max(1,Math.hypot(east-west,south-north));
 const project=(lon:number,lat:number)=>{const p=projectGround(lon,lat);return {x:100+(p.x-cx)*scale,y:100+(p.z-cz)*scale};};
 const unproject=(x:number,y:number)=>unprojectGround(cx+(x-100)/scale,cz+(y-100)/scale);
 const ring=(points:Position[])=>{let previous={x:Infinity,y:Infinity};return points.flatMap((ll,i)=>{const p=project(ll[0],ll[1]);if(i&&i!==points.length-1&&Math.hypot(p.x-previous.x,p.y-previous.y)<.4)return [];previous=p;return [(i?'L':'M')+p.x.toFixed(2)+','+p.y.toFixed(2)];}).join('')+'Z';};
 const path=(geometry:MultiPolygon)=>geometry.coordinates.flatMap(poly=>poly.map(ring)).join('');
 return {project,unproject,path,paper:{x:100+((.65625-ORIGIN.x)*WORLD_KM-cx)*scale,y:100+((.28125-ORIGIN.y)*WORLD_KM-cz)*scale,width:WORLD_KM*.25*scale,height:WORLD_KM*.1875*scale}};
}
export function minimapPoint(clientX:number,clientY:number,rect:{left:number;top:number;width:number;height:number}){
 const x=(clientX-rect.left)/rect.width*200,y=(clientY-rect.top)/rect.height*200;
 return Math.hypot(x-100,y-100)<=100?{x,y}:null;
}
