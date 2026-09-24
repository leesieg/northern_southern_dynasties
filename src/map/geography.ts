import { administration } from '../data/administration';
import type { Feature, FeatureCollection, LineString, Point, Position } from 'geojson';
import { polities, roads, siteById, sites } from '../data/scenario';
import { position } from '../core/world';
import type { World } from '../core/types';

export const emptyCollection = (): FeatureCollection => ({type:'FeatureCollection',features:[]});
export const pointFeature = (lon:number,lat:number,properties:Record<string,unknown>={}):Feature<Point> => ({type:'Feature',properties,geometry:{type:'Point',coordinates:[lon,lat]}});
export const lineFeature = (coordinates:Position[],properties:Record<string,unknown>={}):Feature<LineString> => ({type:'Feature',properties,geometry:{type:'LineString',coordinates}});
export function routeCoordinates(route:string[]):Position[]{return route.map(id=>[siteById[id].lon,siteById[id].lat]);}
export const roadFeatures:FeatureCollection<LineString>={type:'FeatureCollection',features:roads.map(r=>lineFeature(routeCoordinates([r.from,r.to])))};
export const siteFeatures:FeatureCollection<Point>={type:'FeatureCollection',features:sites.map(s=>pointFeature(s.lon,s.lat,{id:s.id,capital:!!s.capital,color:polities[s.polity].color}))};

// The displayed route follows the simulation's exact linear interpolation.
export function activeRoute(world:World,preview:string[]):FeatureCollection<LineString>{
  const player=world.people[0],j=player.journey;
  const coordinates=j?[[position(player).lon,position(player).lat],...routeCoordinates(j.route.slice(j.leg+1))]:routeCoordinates(preview);
  return {type:'FeatureCollection',features:coordinates.length>1?[lineFeature(coordinates)]:[]};
}

export interface AtlasLabel {text:string;lon:number;lat:number;kind:'realm'|'range'|'water'|'prefecture'|'province';minZoom:number;maxZoom:number}
export const atlasLabels:AtlasLabel[]=[
  {text:'梁',lon:112.7,lat:28.6,kind:'realm',minZoom:2,maxZoom:6},
  {text:'东 魏',lon:117,lat:38.2,kind:'realm',minZoom:2,maxZoom:6},
  {text:'西 魏',lon:106.2,lat:36.8,kind:'realm',minZoom:2,maxZoom:6},
  {text:'西 域',lon:82.5,lat:41,kind:'range',minZoom:2,maxZoom:5},
  {text:'青 藏 高 原',lon:88,lat:32.5,kind:'range',minZoom:2,maxZoom:5.5},
  {text:'天 山',lon:85,lat:43.2,kind:'range',minZoom:3,maxZoom:7},
  {text:'祁 连 山',lon:99.1,lat:37.7,kind:'range',minZoom:4,maxZoom:7},
  {text:'秦 岭',lon:107.8,lat:33.65,kind:'range',minZoom:4.5,maxZoom:8},
  {text:'太 行 山',lon:113.7,lat:37.5,kind:'range',minZoom:5,maxZoom:8},
  {text:'长 江',lon:114,lat:30.1,kind:'water',minZoom:4.5,maxZoom:8},
  {text:'黄 河',lon:110.3,lat:38,kind:'water',minZoom:4.5,maxZoom:8},
  {text:'东 海',lon:126,lat:28,kind:'water',minZoom:2,maxZoom:6},
];

const labeledGroups=new Set<string>();
for(const site of sites){const a=administration[site.id];if(!a||labeledGroups.has(a.group))continue;labeledGroups.add(a.group);atlasLabels.push({text:a.prefecture,lon:site.lon,lat:site.lat+.45,kind:'prefecture',minZoom:4.9,maxZoom:6.4});}

// Label one province entity at the centroid of its recorded seats; zoom separates
// province / prefecture / city labels instead of adding a permanently dense layer.
const provinceSeats=new Map<string,typeof sites>();
for(const site of sites){const a=administration[site.id];if(!a)continue;const key=site.polity+':'+a.province;provinceSeats.set(key,[...(provinceSeats.get(key)??[]),site]);}
for(const seats of provinceSeats.values())atlasLabels.push({text:administration[seats[0].id].province,lon:seats.reduce((n,s)=>n+s.lon,0)/seats.length,lat:seats.reduce((n,s)=>n+s.lat,0)/seats.length,kind:'province',minZoom:3.5,maxZoom:4.9});
