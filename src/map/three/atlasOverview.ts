import {zoomDistance} from './geography';
import {TABLE_CENTER} from './tableRoom';
/** The last zoom step frames the physical study, independent of political coverage.
 * Bounds follow build_study_v2.py: desk, scrolls, inkstone, rear screen and window posts.
 * Geography and the 1000 km/model-unit room scale remain unchanged.
 */
export function atlasOverview(aspect:number){
 const d=zoomDistance(1.1),pitch=40*Math.PI/180;
 let tangent=0;
 for(const x of [-9100,9100])for(const y of [-2300,3650])for(const z of [-7400,4900]){
  const depth=d-y*Math.cos(pitch)-z*Math.sin(pitch),vertical=y*Math.sin(pitch)-z*Math.cos(pitch);
  tangent=Math.max(tangent,Math.abs(x)/(Math.max(.3,aspect)*.88*depth),Math.abs(vertical)/(.78*depth));
 }
 return {center:{...TABLE_CENTER},fov:2*Math.atan(tangent)*180/Math.PI};
}
export function atlasOverviewFov(zoom:number,outerFov:number){
 if(zoom>=4.8)return 39;
 // Interpolate apparent ground span, not FOV: zoom-out must never reverse scale.
 const t=Math.max(0,Math.min(1,(4.8-zoom)/3.7)),start=zoomDistance(4.8)*Math.tan(39*Math.PI/360);
 const end=Math.max(start,zoomDistance(1.1)*Math.tan(outerFov*Math.PI/360));
 const span=Math.exp(Math.log(start)+(Math.log(end)-Math.log(start))*t);
 return 2*Math.atan(span/zoomDistance(zoom))*180/Math.PI;
}
