import type {DEMGrid} from './geography';
/** Match the actual coarse triangle edge, not a fresh DEM sample between its vertices. */
export function coarseSurfaceHeight(x:number,y:number,grid:DEMGrid,step:number,sample:(x:number,y:number)=>number){
 const columns=Math.ceil(grid.columns/step),rows=Math.ceil(grid.rows/step),dx=grid.width/columns,dy=grid.height/rows;
 const col=Math.max(0,Math.min(columns,(x-grid.west)/dx)),row=Math.max(0,Math.min(rows,(y-grid.north)/dy));
 const i=Math.min(columns-1,Math.floor(col)),j=Math.min(rows-1,Math.floor(row)),u=col-i,v=row-j;
 const at=(a:number,b:number)=>sample(grid.west+(i+a)*dx,grid.north+(j+b)*dy);
 return u+v<=1?at(0,0)*(1-u-v)+at(1,0)*u+at(0,1)*v:at(1,1)*(u+v-1)+at(1,0)*(1-v)+at(0,1)*(1-u);
}

export interface TerrainFootprint{minX:number;minY:number;maxX:number;maxY:number;}
/** Maximum of the actual triangles clipped to a footprint, not just its centre/corners. */
export function surfaceFootprintHeight(bounds:TerrainFootprint,grid:DEMGrid,step:number,sample:(i:number,j:number)=>number,cut?:DEMGrid){
 const columns=Math.ceil(grid.columns/step),rows=Math.ceil(grid.rows/step),dx=grid.width/columns,dy=grid.height/rows;
 type Point={x:number;y:number;h:number};
 const clip=(input:Point[],axis:'x'|'y',edge:number,sign:number)=>{
  const out:Point[]=[];for(let i=0;i<input.length;i++){const a=input[i],b=input[(i+1)%input.length],insideA=(a[axis]-edge)*sign>=0,insideB=(b[axis]-edge)*sign>=0;
   if(insideA)out.push(a);if(insideA!==insideB){const t=(edge-a[axis])/(b[axis]-a[axis]);out.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,h:a.h+(b.h-a.h)*t});}
  }return out;
 };
 let peak=-Infinity;
 for(let j=Math.max(0,Math.floor((bounds.minY-grid.north)/dy));j<=Math.min(rows-1,Math.floor((bounds.maxY-grid.north)/dy));j++)for(let i=Math.max(0,Math.floor((bounds.minX-grid.west)/dx));i<=Math.min(columns-1,Math.floor((bounds.maxX-grid.west)/dx));i++){
  const x=grid.west+(i+.5)*dx,y=grid.north+(j+.5)*dy;if(cut&&x>cut.west&&x<cut.west+cut.width&&y>cut.north&&y<cut.north+cut.height)continue;
  const at=(a:number,b:number):Point=>({x:grid.west+(i+a)*dx,y:grid.north+(j+b)*dy,h:sample(i+a,j+b)}),a=at(0,0),b=at(1,0),c=at(0,1),d=at(1,1);
  for(const triangle of [[a,c,b],[b,c,d]]){
   let polygon=clip(triangle,'x',bounds.minX,1);polygon=clip(polygon,'x',bounds.maxX,-1);polygon=clip(polygon,'y',bounds.minY,1);polygon=clip(polygon,'y',bounds.maxY,-1);
   for(const p of polygon)peak=Math.max(peak,p.h);
  }
 }
 return Number.isFinite(peak)?peak:null;
}
