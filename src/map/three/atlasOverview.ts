import type {FeatureCollection} from 'geojson';
import {projectGround,zoomDistance} from './geography';
import {TABLE_CENTER} from './tableRoom';
/** Frame the modeled world, not the decorative sheet. No geographic coordinates are moved. */
export function atlasOverview(realms:FeatureCollection|undefined,aspect:number){
 const points=(realms?.features??[]).flatMap(f=>f.geometry.type==='Polygon'?f.geometry.coordinates.flat():f.geometry.type==='MultiPolygon'?f.geometry.coordinates.flat(2):[]).map(p=>projectGround(p[0],p[1]));
 if(!points.length)return {center:{...TABLE_CENTER},fov:39};
 const xs=points.map(p=>p.x),zs=points.map(p=>p.z),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
 const halfWidth=(maxX-minX)/2,halfHeight=(maxZ-minZ)/2,d=zoomDistance(1.1),pitch=40*Math.PI/180;
 const nearest=d-halfHeight*Math.sin(pitch),tangent=Math.max(halfWidth/(Math.max(.3,aspect)*.78*nearest),halfHeight*Math.cos(pitch)/(.72*nearest));
 return {center:{x:(minX+maxX)/2,z:(minZ+maxZ)/2},fov:Math.max(6,Math.min(39,2*Math.atan(tangent)*180/Math.PI))};
}
export function atlasOverviewFov(zoom:number,outerFov:number){
 if(zoom>=4.8)return 39;
 // Interpolate apparent ground span, not FOV: zoom-out must never reverse scale.
 const t=Math.max(0,Math.min(1,(4.8-zoom)/3.7)),start=zoomDistance(4.8)*Math.tan(39*Math.PI/360);
 const end=Math.max(start,zoomDistance(1.1)*Math.tan(outerFov*Math.PI/360));
 const span=Math.exp(Math.log(start)+(Math.log(end)-Math.log(start))*t);
 return 2*Math.atan(span/zoomDistance(zoom))*180/Math.PI;
}
