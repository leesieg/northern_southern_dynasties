/** Mercator kilometres, right-handed Three.js X/east, Y/up, Z/south. */
export const WORLD_KM=40075.016686,ORIGIN={x:(110+180)/360,y:(1-Math.log(Math.tan(Math.PI/4+32*Math.PI/360))/Math.PI)/2};
export function mercator(lon:number,lat:number){return {x:(lon+180)/360,y:(1-Math.log(Math.tan(Math.PI/4+Math.max(-85,Math.min(85,lat))*Math.PI/360))/Math.PI)/2};}
export function geographic(x:number,y:number){return {lng:x*360-180,lat:Math.atan(Math.sinh(Math.PI*(1-2*y)))*180/Math.PI};}
export function projectGround(lon:number,lat:number){const p=mercator(lon,lat);return {x:(p.x-ORIGIN.x)*WORLD_KM,z:(p.y-ORIGIN.y)*WORLD_KM};}
export function unprojectGround(x:number,z:number){return geographic(x/WORLD_KM+ORIGIN.x,z/WORLD_KM+ORIGIN.y);}
export interface DEMGrid{columns:number;rows:number;west:number;north:number;width:number;height:number;}
export function gridHeight(values:Float32Array,m:DEMGrid,x:number,y:number):number|null{
 if(x<m.west||x>m.west+m.width||y<m.north||y>m.north+m.height)return null;
 const col=Math.max(0,Math.min(m.columns-1,(x-m.west)/m.width*m.columns-.5)),row=Math.max(0,Math.min(m.rows-1,(y-m.north)/m.height*m.rows-.5));
 const i=Math.min(m.columns-2,Math.floor(col)),j=Math.min(m.rows-2,Math.floor(row)),u=col-i,v=row-j;
 return (values[j*m.columns+i]*(1-u)+values[j*m.columns+i+1]*u)*(1-v)+(values[(j+1)*m.columns+i]*(1-u)+values[(j+1)*m.columns+i+1]*u)*v;
}
export function campaignHeight(metres:number,lat:number){return Math.max(0,metres)*.01/Math.cos(lat*Math.PI/180);}
export function zoomDistance(zoom:number){return 100*2**((11.3-zoom)*.75);}
export function distanceZoom(distance:number){return 11.3-Math.log2(distance/100)/.75;}
