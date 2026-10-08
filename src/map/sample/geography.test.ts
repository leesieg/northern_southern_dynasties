import {describe,it,expect} from 'vitest';
import {project,unproject,sampleHeight,segmentDistance,type TerrainMetadata} from './geography';
const m:TerrainMetadata={west:108,east:112,south:32,north:36,columns:3,rows:3,originLon:110,originLat:34,lonScale:92,latScale:111,heightScale:.01,treeBudget:18000};
describe('campaign geographic coordinates',()=>{
 it('preserves authoritative locations through projection and camera coordinates',()=>{
  for(const [lon,lat] of [[108.94,34.27],[112.45,34.62],[110,34]]){const p=project(lon,lat,m),back=unproject(p.x,p.z,m);expect(back.lon).toBeCloseTo(lon,10);expect(back.lat).toBeCloseTo(lat,10);}
  expect(project(110,35,m).z).toBeLessThan(0);
 });
 it('interpolates metre elevations with north-first rows and clamps the outer boundary',()=>{
  const h=new Float32Array([100,200,300,400,500,600,700,800,900]);
  const at=(lon:number,lat:number)=>{const p=project(lon,lat,m);return sampleHeight(h,m,p.x,p.z);};
  expect(at(108,36)).toBe(1);expect(at(112,32)).toBe(9);expect(at(110,34)).toBe(5);expect(at(109,35)).toBe(3);expect(at(107,37)).toBe(1);
 });
 it('excludes banks and river endpoints from vegetation without NaN on duplicate points',()=>{
  const a={x:0,z:0},b={x:10,z:0};expect(segmentDistance(4,2,a,b)).toBe(2);expect(segmentDistance(13,4,a,b)).toBe(5);expect(segmentDistance(3,4,a,a)).toBe(5);
 });
});
