import type {Polygon,MultiPolygon,Position} from 'geojson';
import {capital,fortificationLevel} from '../core/realm';
import {worldRealms,polityStyle} from '../core/polityRuntime';
import type {World,Site} from '../core/types';

// Presentation budgets and exaggerated model sizes, not simulation resources or measured footprints.
export const SCENERY_MIN_ZOOM=6.2;
export const MAX_SCENERY_CITIES=36;
export const MAX_FOREST_TREES=1200;
export const MAX_FOREST_CANDIDATES=12000;
export const MAX_CITY_GEOMETRIES=48;
export interface CampaignCityAppearance {
 capital:boolean;south:boolean;fort:number;levels:[number,number,number];
 project:number;progress:number;besieged:boolean;color:string;
}
export function campaignCityAppearance(world:World,site:Site):CampaignCityAppearance {
 const city=world.realm?.cities[site.id],holding=world.holdings.cities[site.id];
 const capitals=worldRealms(world).filter(r=>!world.realm?.annexed?.[r]).map(r=>capital(r,world));
 const project=holding?.project,projectIndex=project?['market','granary','hostel'].indexOf(project.building):-1;
 const progress=project&&projectIndex>=0?Math.floor(Math.max(0,Math.min(1,(world.day-project.started)/Math.max(1,project.due-project.started)))*4):0;
 return {capital:capitals.includes(site.id),south:site.lat<33,fort:Math.max(0,Math.min(3,city?fortificationLevel(world,site.id):0)),
  levels:['market','granary','hostel'].map(id=>Math.max(0,Math.min(3,holding?.levels[id as keyof typeof holding.levels]??0))) as [number,number,number],
  project:projectIndex,progress,besieged:!!world.realm?.sieges?.some(s=>s.site===site.id),
  color:polityStyle(world,city?.controller??site.polity).color};
}
export function campaignCityKey(a:CampaignCityAppearance){return [a.capital,a.south,a.fort,...a.levels,a.project,a.progress,a.besieged].join(':');}
export function campaignCityPixels(site:Site,capital:boolean,zoom:number){
 const detail=Math.max(0,Math.min(1,(zoom-SCENERY_MIN_ZOOM)/2));
 return capital?78+detail*82:site.rank==='county'?28+detail*40:48+detail*64;
}
export function campaignCityPlacements<T extends {site:Site;point:{x:number;y:number};capital:boolean}>(items:T[],selected:string,zoom:number){
 const result:T[]=[];
 const sorted=[...items].sort((a,b)=>Number(b.site.id===selected)-Number(a.site.id===selected)||Number(b.capital)-Number(a.capital)||Number(a.site.rank==='county')-Number(b.site.rank==='county'));
 for(const item of sorted){
  const radius=campaignCityPixels(item.site,item.capital,zoom)*.6;
  if(result.some(other=>Math.hypot(other.point.x-item.point.x,(other.point.y-item.point.y)*1.3)<radius+campaignCityPixels(other.site,other.capital,zoom)*.6))continue;
  result.push(item);if(result.length===MAX_SCENERY_CITIES)break;
 }
 return result;
}
export function sceneryVisible(zoom:number){return zoom>=SCENERY_MIN_ZOOM;}
export type SceneryPolygon=Polygon|MultiPolygon;
export interface ForestTree {lon:number;lat:number;seed:number;}
export interface GeographicBounds {west:number;south:number;east:number;north:number;}
function insideRing(lon:number,lat:number,ring:Position[]){
 let inside=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];
  if((a[1]>lat)!==(b[1]>lat)&&lon<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside;
}
export function insideSceneryPolygon(lon:number,lat:number,geometry:SceneryPolygon){
 const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
 return polygons.some(rings=>rings.length&&insideRing(lon,lat,rings[0])&&!rings.slice(1).some(r=>insideRing(lon,lat,r)));
}
function seedAt(x:number,y:number){let v=Math.imul(x,374761393)^Math.imul(y,668265263);v=Math.imul(v^(v>>>13),1274126177);return ((v^(v>>>16))>>>0)/4294967295;}
const mercatorY=(lat:number)=>(1-Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))/Math.PI)/2;
const latitude=(y:number)=>Math.atan(Math.sinh(Math.PI*(1-2*y)))*180/Math.PI;

/** Deterministic map-anchored samples of modern landcover. Holes and water always win.
 * Sampling stays inside the viewport, with a bounded grid and output regardless of polygon size. */
export function forestTrees(woods:SceneryPolygon[],water:SceneryPolygon[],bounds:GeographicBounds,zoom:number,exclusions:{lon:number;lat:number;radius:number}[]=[]):ForestTree[]{
 if(!sceneryVisible(zoom)||!woods.length||bounds.east<=bounds.west||bounds.north<=bounds.south)return [];
 const west=(bounds.west+180)/360,east=(bounds.east+180)/360,north=mercatorY(bounds.north),south=mercatorY(bounds.south);
 let cells=2**Math.min(16,Math.max(12,Math.floor(zoom)+6));
 while((Math.ceil((east-west)*cells)+2)*(Math.ceil((south-north)*cells)+2)>MAX_FOREST_CANDIDATES)cells/=2;
 const index=(geometries:SceneryPolygon[])=>geometries.flatMap(g=>(g.type==='Polygon'?[g.coordinates]:g.coordinates).map(rings=>{
  let west=Infinity,south=Infinity,east=-Infinity,north=-Infinity;
  for(const point of rings[0]??[]){west=Math.min(west,point[0]);east=Math.max(east,point[0]);south=Math.min(south,point[1]);north=Math.max(north,point[1]);}
  return {west,south,east,north,rings};
 })).filter(p=>p.east>=bounds.west&&p.west<=bounds.east&&p.north>=bounds.south&&p.south<=bounds.north);
 const woodsIndex=index(woods),waterIndex=index(water);
 const contains=(entries:ReturnType<typeof index>,lon:number,lat:number)=>entries.some(p=>lon>=p.west&&lon<=p.east&&lat>=p.south&&lat<=p.north&&p.rings.length&&insideRing(lon,lat,p.rings[0])&&!p.rings.slice(1).some(r=>insideRing(lon,lat,r)));
 const candidates:ForestTree[]=[];
 for(let y=Math.floor(north*cells);y<=Math.ceil(south*cells);y++)for(let x=Math.floor(west*cells);x<=Math.ceil(east*cells);x++){
  const seed=seedAt(x,y),lon=(x+.2+seed*.6)/cells*360-180,lat=latitude((y+.2+seedAt(y,x)*.6)/cells);
  if(lon<bounds.west||lon>bounds.east||lat<bounds.south||lat>bounds.north)continue;
  if(!contains(woodsIndex,lon,lat)||contains(waterIndex,lon,lat))continue;
  if(exclusions.some(p=>Math.hypot((lon-p.lon)*Math.cos(lat*Math.PI/180),lat-p.lat)*111320<p.radius))continue;
  candidates.push({lon,lat,seed});
 }
 // A spatially distributed subset, rather than filling the northwest corner until the cap is hit.
 return candidates.sort((a,b)=>a.seed-b.seed).slice(0,MAX_FOREST_TREES);
}
