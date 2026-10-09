import {expect,it} from 'vitest';
import {coarseSurfaceHeight,surfaceFootprintHeight} from './terrainSeam';
it('stitches a dense tile edge to the coarse mesh even when the DEM has intervening peaks',()=>{
 const grid={columns:32,rows:32,west:0,north:0,width:4,height:4},sample=(x:number,y:number)=>x*x+y*y;
 for(let y=0;y<=4;y+=.125){const j=Math.min(3,Math.floor(y)),v=y-j;
  expect(coarseSurfaceHeight(2,y,grid,8,sample)).toBeCloseTo(sample(2,j)*(1-v)+sample(2,j+1)*v);
 }
 expect(coarseSurfaceHeight(2,.5,grid,8,sample)).not.toBe(sample(2,.5));
});

it('finds a peak inside a city footprint missed by centre and corner samples',()=>{
 const grid={columns:16,rows:16,west:0,north:0,width:8,height:8},sample=(i:number,j:number)=>i===2&&j===6?12:0;
 expect(surfaceFootprintHeight({minX:1,minY:1,maxX:7,maxY:7},grid,2,sample)).toBe(12);
 expect(coarseSurfaceHeight(4,4,grid,2,sample)).toBe(0);
});
it('clips triangles to the real footprint instead of lifting a city for a neighbouring mountain',()=>{
 const grid={columns:8,rows:8,west:0,north:0,width:1,height:1},sample=(i:number,j:number)=>i*j*10;
 expect(surfaceFootprintHeight({minX:0,minY:0,maxX:.25,maxY:.25},grid,8,sample)).toBe(0);
 expect(surfaceFootprintHeight({minX:.6,minY:.6,maxX:.8,maxY:.8},grid,8,sample)).toBeCloseTo(6);
 expect(surfaceFootprintHeight({minX:.7,minY:.7,maxX:.7,maxY:.7},grid,8,sample)).toBeCloseTo(4);
 expect(surfaceFootprintHeight({minX:2,minY:2,maxX:3,maxY:3},grid,8,sample)).toBeNull();
});
it('excludes coarse faces cut away by the refined terrain patch',()=>{
 const grid={columns:16,rows:16,west:0,north:0,width:2,height:2},cut={columns:8,rows:8,west:0,north:0,width:1,height:1},bounds={minX:.2,minY:.2,maxX:.8,maxY:.8};
 expect(surfaceFootprintHeight(bounds,grid,8,()=>90,cut)).toBeNull();
 expect(surfaceFootprintHeight(bounds,cut,2,()=>3)).toBe(3);
});
it('uses the same diagonal as the rendered coarse triangles, including corners',()=>{
 const grid={columns:8,rows:8,west:0,north:0,width:1,height:1},sample=(x:number,y:number)=>x*y*10;
 expect(coarseSurfaceHeight(.2,.3,grid,8,sample)).toBe(0);
 expect(coarseSurfaceHeight(.8,.7,grid,8,sample)).toBeCloseTo(5);
 expect(coarseSurfaceHeight(1,1,grid,8,sample)).toBe(10);
});
