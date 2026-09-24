import { describe, expect, it } from 'vitest';
import clipping from 'polygon-clipping';
import type { MultiPolygon, Position } from 'geojson';
import { territories, territoryRealms, roadNeighbors, territoryHit } from './territories';
import { sites } from '../data/scenario';
function inside(point:Position,ring:Position[]){
  let result=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[i],b=ring[j];
    if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])result=!result;
  }
  return result;
}
function area(multi:MultiPolygon['coordinates']){
  return multi.reduce((sum,polygon)=>sum+polygon.reduce((part,ring,index)=>{
    const a=Math.abs(ring.reduce((value,p,i)=>{const q=ring[(i+1)%ring.length];return value+p[0]*q[1]-q[0]*p[1];},0)/2);
    return part+(index===0?a:-a);
  },0),0);
}
const asClip=(coordinates:MultiPolygon['coordinates'])=>coordinates as clipping.MultiPolygon;
describe('territory geometry and picking',()=>{
  it('gives every city a closed finite land cell containing its anchor',()=>{
    expect(territories.features).toHaveLength(sites.length);
    for(const site of sites){
      const f=territories.features.find(f=>f.properties?.id===site.id)!;
      expect(f,site.id).toBeDefined();
      expect(f.geometry.coordinates.some(p=>inside([site.lon,site.lat],p[0])&&!p.slice(1).some(r=>inside([site.lon,site.lat],r))),site.id).toBe(true);
      expect(area(f.geometry.coordinates)).toBeGreaterThan(0);
      for(const ring of f.geometry.coordinates.flat()){
        expect(ring[0]).toEqual(ring.at(-1));
        expect(ring.flat().every(Number.isFinite)).toBe(true);
      }
    }
  });
  it('has no overlapping interiors and aggregates identical realm geometry',()=>{
    for(let i=0;i<territories.features.length;i++)for(let j=i+1;j<territories.features.length;j++){
      const overlap=clipping.intersection(asClip(territories.features[i].geometry.coordinates),asClip(territories.features[j].geometry.coordinates));
      expect(area(overlap)).toBeLessThan(.000001);
    }
    for(const realm of territoryRealms.features){
      const cells=territories.features.filter(f=>f.properties?.polity===realm.properties?.id);
      expect(area(realm.geometry.coordinates)).toBeCloseTo(cells.reduce((sum,f)=>sum+area(f.geometry.coordinates),0),5);
    }
  });
  it('rejects water and unknown land instead of snapping to a distant city',()=>{
    const land={layer:{id:'territory-fill'},properties:{id:'jiankang'}};
    expect(territoryHit([land])).toBe('jiankang');
    expect(territoryHit([land,{layer:{id:'ocean'},properties:{}}])).toBeNull();
    expect(territoryHit([land,{layer:{id:'inland-water'},properties:{}}])).toBeNull();
    expect(territoryHit([])).toBeNull();
    expect(territoryHit([{...land,properties:{id:'missing'}}])).toBeNull();
  });
  it('keeps the neighboring-city actions connected to real roads',()=>{
    for(const site of sites){
      const neighbors=roadNeighbors(site.id);
      expect(neighbors.length).toBeGreaterThan(0);
      expect(new Set(neighbors.map(n=>n.id)).size).toBe(neighbors.length);
      for(const neighbor of neighbors)expect(roadNeighbors(neighbor.id).map(n=>n.id)).toContain(site.id);
    }
  });
});
