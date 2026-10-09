import {capital,fortificationLevel} from '../core/realm';
import {worldRealms,polityStyle} from '../core/polityRuntime';
import type {World,Site} from '../core/types';

// Presentation budgets and exaggerated model sizes, not simulation resources or measured footprints.
export const SCENERY_MIN_ZOOM=6.2;
export const MAX_SCENERY_CITIES=36;
export const MAX_CITY_GEOMETRIES=48;
export const CITY_DETAIL_ZOOM=8.2;
export const MAX_DETAILED_CITIES=4;
export type CityDetail='regional'|'close';
export interface CampaignCityAppearance {
 capital:boolean;south:boolean;style:ReturnType<typeof cityRegionalStyle>;county:boolean;fort:number;levels:[number,number,number];
 project:number;progress:number;besieged:boolean;color:string;
}
export function campaignCityAppearance(world:World,site:Site):CampaignCityAppearance {
 const city=world.realm?.cities[site.id],holding=world.holdings.cities[site.id];
 const capitals=worldRealms(world).filter(r=>!world.realm?.annexed?.[r]).map(r=>capital(r,world));
 const project=holding?.project,projectIndex=project?['market','granary','hostel'].indexOf(project.building):-1;
 const progress=project&&projectIndex>=0?Math.floor(Math.max(0,Math.min(1,(world.day-project.started)/Math.max(1,project.due-project.started)))*4):0;
 return {capital:capitals.includes(site.id),south:cityRegionalStyle(site)==='jiangnan',style:cityRegionalStyle(site),county:site.rank==='county',fort:Math.max(0,Math.min(3,city?fortificationLevel(world,site.id):0)),
  levels:['market','granary','hostel'].map(id=>Math.max(0,Math.min(3,holding?.levels[id as keyof typeof holding.levels]??0))) as [number,number,number],
  project:projectIndex,progress,besieged:!!world.realm?.sieges?.some(s=>s.site===site.id),
  color:polityStyle(world,city?.controller??site.polity).color};
}
export function campaignCityKey(a:CampaignCityAppearance){return [a.capital,a.style,a.county,a.fort,...a.levels,a.project,a.progress,a.besieged].join(':');}
export function campaignCityPixels(site:Site,capital:boolean,zoom:number){
 const metersPerPixel=40075016.686*Math.cos(site.lat*Math.PI/180)/(512*2**zoom);
 return Math.max(capital?30:site.rank==='county'?14:22,campaignCityMeters(site,capital)/metersPerPixel);
}
/** Bounded symbolic footprint, independent of zoom, latitude and viewport. Not measured historical city area. */
export function campaignCityMeters(site:Site,capital:boolean){return capital?29500:site.rank==='county'?13800:22500;}
/** World-space platform and vegetation clearance, in projected kilometres. */
export function campaignCityRadius(site:Site,capital:boolean){return campaignCityMeters(site,capital)*.65/1000/Math.cos(site.lat*Math.PI/180);}
/** Static landscape style, independent of conquest and today's polity. Visual design zones, not cultural census. */
export function cityRegionalStyle(site:Site){
 if(site.terrain==='绿洲')return 'oasis';
 if(site.lon<106&&site.lat<34)return 'basin';
 return site.lat<33&&site.lon>=106?'jiangnan':'northern';
}
export function campaignCityPlacements<T extends {site:Site;point:{x:number;y:number};capital:boolean;pixels?:number}>(items:T[],selected:string,zoom:number){
 const result:T[]=[];
 const sorted=[...items].sort((a,b)=>Number(b.site.id===selected)-Number(a.site.id===selected)||Number(b.capital)-Number(a.capital)||Number(a.site.rank==='county')-Number(b.site.rank==='county'));
 for(const item of sorted){
  const radius=(item.pixels??campaignCityPixels(item.site,item.capital,zoom))*.6;
  if(result.some(other=>Math.hypot(other.point.x-item.point.x,(other.point.y-item.point.y)*1.3)<radius+(other.pixels??campaignCityPixels(other.site,other.capital,zoom))*.6))continue;
  result.push(item);if(result.length===MAX_SCENERY_CITIES)break;
 }
 return result;
}
export function sceneryVisible(zoom:number){return zoom>=SCENERY_MIN_ZOOM;}
