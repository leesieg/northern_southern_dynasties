import type { FeatureCollection, MultiPolygon } from 'geojson';
import data from '../data/territories.json';
import realms from '../data/territory-realms.json';
import { roads, siteById } from '../data/scenario';
export const territories=data as FeatureCollection<MultiPolygon>;
export const territoryRealms=realms as FeatureCollection<MultiPolygon>;
export function roadNeighbors(id:string){
  return roads.filter(r=>r.from===id||r.to===id).map(r=>siteById[r.from===id?r.to:r.from]);
}
// Canvas feature queries can return water and land together: water must win.
export function territoryHit(features:{layer:{id:string};properties:Record<string,unknown>|null}[]):string|null{
  if(features.some(f=>f.layer.id==='ocean'||f.layer.id==='inland-water'))return null;
  const id=features.find(f=>f.layer.id==='territory-fill')?.properties?.id;
  return typeof id==='string'&&siteById[id]?id:null;
}
