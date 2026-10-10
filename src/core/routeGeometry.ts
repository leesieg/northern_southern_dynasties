import {siteById} from '../data/scenario';
import {roadCorridors} from '../data/roadCorridors';
import type {Journey} from './types';
export type RoutePoint=[number,number];
export function roadCoordinates(from:string,to:string):RoutePoint[]{
 const a=siteById[from],b=siteById[to],forward=roadCorridors[from+':'+to],backward=roadCorridors[to+':'+from];
 return [[a.lon,a.lat],...(forward??(backward?[...backward].reverse():[])),[b.lon,b.lat]];
}
function lengths(points:RoutePoint[]){return points.slice(1).map((b,i)=>{const a=points[i],cos=Math.cos((a[1]+b[1])*Math.PI/360);return Math.hypot((b[0]-a[0])*cos,b[1]-a[1]);});}
/** One sampler for persons, armies, headings, previews and geographic decisions. Unconfigured edges stay linear. */
export function sampleRoad(from:string,to:string,fraction:number){
 const points=roadCoordinates(from,to),segments=lengths(points),total=segments.reduce((n,d)=>n+d,0),t=Math.max(0,Math.min(1,fraction));
 let remaining=total*t;
 for(let i=0;i<segments.length;i++)if(remaining<=segments[i]||i===segments.length-1){
  const a=points[i],b=points[i+1],part=segments[i]?remaining/segments[i]:0;
  return {lon:a[0]+(b[0]-a[0])*part,lat:a[1]+(b[1]-a[1])*part,segment:i};
 }else remaining-=segments[i];
 return {lon:points[0][0],lat:points[0][1],segment:0};
}
export function journeyPosition(j:Journey){const p=sampleRoad(j.route[j.leg],j.route[j.leg+1],j.elapsed/j.durations[j.leg]);return {lon:p.lon,lat:p.lat};}
export function routeCoordinates(route:string[]):RoutePoint[]{
 if(route.length<2)return route.map(id=>[siteById[id].lon,siteById[id].lat]);
 return route.slice(1).flatMap((id,i)=>roadCoordinates(route[i],id).slice(i?1:0));
}
export function remainingRouteCoordinates(j:Journey):RoutePoint[]{
 const from=j.route[j.leg],to=j.route[j.leg+1],p=sampleRoad(from,to,j.elapsed/j.durations[j.leg]);
 return [[p.lon,p.lat],...roadCoordinates(from,to).slice(p.segment+1),...routeCoordinates(j.route.slice(j.leg+1)).slice(1)];
}
/** Clockwise from north, using the same Mercator proportions as the formal map. */
export function roadHeading(j:Journey){const p=sampleRoad(j.route[j.leg],j.route[j.leg+1],j.elapsed/j.durations[j.leg]),points=roadCoordinates(j.route[j.leg],j.route[j.leg+1]),a=points[p.segment],b=points[p.segment+1],north=(Math.log(Math.tan(Math.PI/4+b[1]*Math.PI/360))-Math.log(Math.tan(Math.PI/4+a[1]*Math.PI/360)))*180/Math.PI;return Math.atan2(b[0]-a[0],north);}
