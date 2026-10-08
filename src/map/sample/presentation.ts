import {siteById} from '../../data/scenario';

/** Display budgets only: metres, pixels and object counts; no simulation state. */
export const SAMPLE_CITIES=['changan','luoyang'] as const;
export const TREE_LIMIT=280;
export const TREE_GRID=.010;
export function treeCandidates(lon:number,lat:number){
 const cx=Math.floor(lon/TREE_GRID),cy=Math.floor(lat/TREE_GRID);
 const random=(x:number,y:number,salt:number)=>{let h=Math.imul(x+salt,374761393)^Math.imul(y-salt,668265263);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;};
 const candidates=[];
 for(let x=cx-12;x<=cx+12;x++)for(let y=cy-12;y<=cy+12;y++){
  if(random(x,y,9)>.58)continue;
  candidates.push({lon:(x+.15+random(x,y,3)*.7)*TREE_GRID,lat:(y+.15+random(x,y,7)*.7)*TREE_GRID,size:100+random(x,y,13)*80});
 }
 return candidates.sort((a,b)=>(a.lon-lon)**2+(a.lat-lat)**2-(b.lon-lon)**2-(b.lat-lat)**2);
}
export function outsideCity(lon:number,lat:number){
 return SAMPLE_CITIES.every(id=>{const s=siteById[id];return Math.hypot((lon-s.lon)*111320*Math.cos(s.lat*Math.PI/180),(lat-s.lat)*111320)>4100;});
}
export function citySize(zoom:number){return Math.min(6200,Math.max(2200,5400+(10-zoom)*1800));}
