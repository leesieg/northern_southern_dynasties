import {describe,it,expect} from 'vitest';
import {cityRoofGeometry,cityRoofTiles} from './architecture';

describe('city roof geometry (CPU only)',()=>{
 it.each([[1.25,2.02,.55],[4,1.8,.65]])('keeps all four roof slopes outward and the tile relief bounded (%s)',(w,d,h)=>{
  const roof=cityRoofGeometry(w,d,h),tiles=cityRoofTiles(w,d,h),normals=roof.getAttribute('normal');
  for(let i=0;i<normals.count;i++){expect(Number.isFinite(normals.getX(i)+normals.getY(i)+normals.getZ(i))).toBe(true);expect(normals.getY(i)).toBeGreaterThan(0);}
  tiles.computeBoundingBox();const b=tiles.boundingBox!;expect(b.min.x).toBeGreaterThan(-w/2-.06);expect(b.max.x).toBeLessThan(w/2+.06);expect(b.max.y).toBeLessThan(h+.08);
  expect(tiles.getAttribute('position').count).toBeLessThan(20000);roof.dispose();tiles.dispose();
 });
});
