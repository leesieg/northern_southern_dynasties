import type {DEMGrid} from './geography';
/** Match the actual coarse triangle edge, not a fresh DEM sample between its vertices. */
export function coarseSurfaceHeight(x:number,y:number,grid:DEMGrid,step:number,sample:(x:number,y:number)=>number){
 const columns=Math.ceil(grid.columns/step),rows=Math.ceil(grid.rows/step),dx=grid.width/columns,dy=grid.height/rows;
 const col=Math.max(0,Math.min(columns,(x-grid.west)/dx)),row=Math.max(0,Math.min(rows,(y-grid.north)/dy));
 const i=Math.min(columns-1,Math.floor(col)),j=Math.min(rows-1,Math.floor(row)),u=col-i,v=row-j;
 const at=(a:number,b:number)=>sample(grid.west+(i+a)*dx,grid.north+(j+b)*dy);
 return u+v<=1?at(0,0)*(1-u-v)+at(1,0)*u+at(0,1)*v:at(1,1)*(u+v-1)+at(1,0)*(1-v)+at(0,1)*(1-u);
}
