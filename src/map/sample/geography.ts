/** Campaign presentation coordinates only. Authoritative sites keep their lon/lat. */
export interface TerrainMetadata {west:number;east:number;south:number;north:number;columns:number;rows:number;originLon:number;originLat:number;lonScale:number;latScale:number;heightScale:number;treeBudget:number}
export interface River {name:string;points:[number,number][]}
export function project(lon:number,lat:number,m:TerrainMetadata){return {x:(lon-m.originLon)*m.lonScale,z:(m.originLat-lat)*m.latScale};}
export function unproject(x:number,z:number,m:TerrainMetadata){return {lon:x/m.lonScale+m.originLon,lat:m.originLat-z/m.latScale};}
export function sampleHeight(data:Float32Array,m:TerrainMetadata,x:number,z:number){
 const {lon,lat}=unproject(x,z,m);
 const col=Math.max(0,Math.min(m.columns-1,(lon-m.west)/(m.east-m.west)*(m.columns-1)));
 const row=Math.max(0,Math.min(m.rows-1,(m.north-lat)/(m.north-m.south)*(m.rows-1)));
 const i=Math.min(m.columns-2,Math.floor(col)),j=Math.min(m.rows-2,Math.floor(row)),u=col-i,v=row-j;
 return ((data[j*m.columns+i]*(1-u)+data[j*m.columns+i+1]*u)*(1-v)+(data[(j+1)*m.columns+i]*(1-u)+data[(j+1)*m.columns+i+1]*u)*v)*m.heightScale;
}
export function seededRandom(seed:number){let n=seed;return ()=>{n=(Math.imul(1664525,n)+1013904223)>>>0;return n/4294967296;};}
export function segmentDistance(x:number,z:number,a:{x:number;z:number},b:{x:number;z:number}){
 const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));
 return Math.hypot(x-a.x-dx*t,z-a.z-dz*t);
}
