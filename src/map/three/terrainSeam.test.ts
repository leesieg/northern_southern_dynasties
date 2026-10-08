import {expect,it} from 'vitest';
import {coarseSurfaceHeight} from './terrainSeam';
it('stitches a dense tile edge to the coarse mesh even when the DEM has intervening peaks',()=>{
 const grid={columns:32,rows:32,west:0,north:0,width:4,height:4},sample=(x:number,y:number)=>x*x+y*y;
 for(let y=0;y<=4;y+=.125){const j=Math.min(3,Math.floor(y)),v=y-j;
  expect(coarseSurfaceHeight(2,y,grid,8,sample)).toBeCloseTo(sample(2,j)*(1-v)+sample(2,j+1)*v);
 }
 expect(coarseSurfaceHeight(2,.5,grid,8,sample)).not.toBe(sample(2,.5));
});
it('uses the same diagonal as the rendered coarse triangles, including corners',()=>{
 const grid={columns:8,rows:8,west:0,north:0,width:1,height:1},sample=(x:number,y:number)=>x*y*10;
 expect(coarseSurfaceHeight(.2,.3,grid,8,sample)).toBe(0);
 expect(coarseSurfaceHeight(.8,.7,grid,8,sample)).toBeCloseTo(5);
 expect(coarseSurfaceHeight(1,1,grid,8,sample)).toBe(10);
});
