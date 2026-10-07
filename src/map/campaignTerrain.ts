import {BufferGeometry} from 'three';
import type {Geometry,Position} from 'geojson';

export const CAMPAIGN_EXPOSURE=1.05;
export const CAMPAIGN_FOG_COLOR='#d0cdb3';
// MapLibre's separated view matrix outputs camera pixels, not normalized Mercator units.
export const CAMPAIGN_FOG_DENSITY=.00015;
export const CAMPAIGN_SUN={color:'#fff0cc',intensity:2.1,x:-1,y:1,z:1.8};
export type GroundSample=(x:number,z:number)=>number|null;
function inRing(point:Position,ring:Position[]){
 let inside=false;const [x,y]=point;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside;
}
export function waterMaskContains(point:Position,geometry:Geometry):boolean{
 const polygon=(rings:Position[][])=>!!rings.length&&inRing(point,rings[0])&&!rings.slice(1).some(r=>inRing(point,r));
 const line=(points:Position[])=>points.slice(1).some((b,i)=>{const a=points[i],cos=Math.cos(point[1]*Math.PI/180),dx=(b[0]-a[0])*cos,dy=b[1]-a[1],px=(point[0]-a[0])*cos,py=point[1]-a[1],d=dx*dx+dy*dy,t=d?Math.max(0,Math.min(1,(px*dx+py*dy)/d)):0;return Math.hypot(px-t*dx,py-t*dy)*111320<100;});
 if(geometry.type==='Polygon')return polygon(geometry.coordinates);
 if(geometry.type==='MultiPolygon')return geometry.coordinates.some(polygon);
 if(geometry.type==='LineString')return line(geometry.coordinates);
 if(geometry.type==='MultiLineString')return geometry.coordinates.some(line);
 return false;
}
/** Five by five samples over the visual footprint. Missing DEM stays missing, never invented relief. */
export function sampleCityGround(sample:GroundSample,radius=15){
 const values=Array.from({length:25},(_,i)=>sample((i%5-2)*radius/2,(Math.floor(i/5)-2)*radius/2));
 if(values.some(v=>v===null||!Number.isFinite(v)))return null;
 const heights=values as number[],center=heights[12];
 return {heights,center,radius,relief:Math.max(...heights)-Math.min(...heights)};
}
export function groundHeight(ground:NonNullable<ReturnType<typeof sampleCityGround>>,x:number,z:number){
 const gx=Math.max(0,Math.min(4,(x/ground.radius+1)*2)),gz=Math.max(0,Math.min(4,(z/ground.radius+1)*2));
 const ix=Math.min(3,Math.floor(gx)),iz=Math.min(3,Math.floor(gz)),tx=gx-ix,tz=gz-iz,h=ground.heights;
 return (h[iz*5+ix]*(1-tx)+h[iz*5+ix+1]*tx)*(1-tz)+(h[(iz+1)*5+ix]*(1-tx)+h[(iz+1)*5+ix+1]*tx)*tz;
}
/** Each building is rigid at its plot's elevation; the ground skin conforms per vertex. Shared templates stay immutable. */
export function groundCityGeometry(template:BufferGeometry,ground:NonNullable<ReturnType<typeof sampleCityGround>>,metersPerUnit:number,water?:(x:number,z:number)=>boolean){
 const geometry=template.clone(),p=geometry.getAttribute('position'),plots=geometry.getAttribute('ground');
 for(let i=0;i<p.count;i++)p.setY(i,p.getY(i)+(groundHeight(ground,plots.getX(i),plots.getY(i))-ground.center)/metersPerUnit);
 if(water&&geometry.index){
  const dry=new Map<string,boolean>(),kept:number[]=[],index=geometry.index;
  const isDry=(i:number)=>{const x=plots.getX(i),z=plots.getY(i),key=x+':'+z;if(!dry.has(key))dry.set(key,!water(x,z));return dry.get(key)!;};
  for(let i=0;i<index.count;i+=3){const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2);if(isDry(a)&&isDry(b)&&isDry(c))kept.push(a,b,c);}
  geometry.setIndex(kept);
 }
 p.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry;
}
