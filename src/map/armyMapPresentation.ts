import type {Army} from '../core/realm';
import {siteById} from '../data/scenario';

// Visual scale only; marker targets and the shared model layer use the same anchors.
export const ARMY_MODEL_ZOOM=6.5;
export const ARMY_MODEL_PIXELS=72;
export const armyShowsModel=(zoom:number,enabled:boolean)=>enabled&&zoom>=ARMY_MODEL_ZOOM;
export function armyMapPosition(a:Army){
 let {lon,lat}=siteById[a.location];
 if(a.journey){const j=a.journey,from=siteById[j.route[j.leg]],to=siteById[j.route[j.leg+1]],t=j.elapsed/j.durations[j.leg];lon=from.lon+(to.lon-from.lon)*t;lat=from.lat+(to.lat-from.lat)*t;}
 return {lon,lat};
}
export interface ScreenPoint {x:number;y:number}
export interface ScreenRect {left:number;top:number;right:number;bottom:number}
export interface ArmyMarkerPlacement {offset:ScreenPoint;model:boolean;bounds:ScreenRect}
// Both DOM hit targets and GPU models consume these screen placements. No world position is changed.
export const armyMarkerFootprint=(model:boolean)=>model?{width:192,height:312,bottom:96}:{width:154,height:58,bottom:66};
export const screenOverlap=(a:ScreenRect,b:ScreenRect)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
export function layoutArmyMarkers(armies:{key:string;point:ScreenPoint}[],obstacles:ScreenRect[],viewport:{width:number;height:number},models:boolean){
 const placements=new Map<string,ArmyMarkerPlacement>(),occupied:ScreenRect[]=[],gap=8;
 const padded=(r:ScreenRect)=>({left:r.left-gap,top:r.top-gap,right:r.right+gap,bottom:r.bottom+gap});
 const fixed=obstacles.map(padded);
 function find(point:ScreenPoint,model:boolean,allowCrowding=false){
  const size=armyMarkerFootprint(model),above=size.height-size.bottom;
  const minX=size.width/2+gap,maxX=viewport.width-size.width/2-gap,minY=above+gap,maxY=viewport.height-size.bottom-gap;
  if(maxX<minX||maxY<minY)return;
  const blocked=[...fixed,...occupied.map(padded)],candidates:ScreenPoint[]=[];
  function add(x:number,y:number){candidates.push({x:Math.max(minX,Math.min(maxX,x)),y:Math.max(minY,Math.min(maxY,y))});}
  add(point.x,point.y);
  for(const rect of blocked){add(rect.right+size.width/2,point.y);add(rect.left-size.width/2,point.y);add(point.x,rect.bottom+above);add(point.x,rect.top-size.bottom);}
  // A bounded scan handles a dense group or a corner without stacking every unit at one anchor.
  for(let y=minY;y<=maxY+size.height/2;y+=size.height/2)for(let x=minX;x<=maxX+size.width/2;x+=size.width/2)add(x,y);
  candidates.sort((a,b)=>(a.x-point.x)**2+(a.y-point.y)**2-((b.x-point.x)**2+(b.y-point.y)**2));
  let crowded:ArmyMarkerPlacement|undefined,crowding=Infinity;
  for(const anchor of candidates){
   const bounds={left:anchor.x-size.width/2,right:anchor.x+size.width/2,top:anchor.y-above,bottom:anchor.y+size.bottom};
   if(fixed.some(rect=>screenOverlap(bounds,rect)>0))continue;
   const overlap=occupied.reduce((sum,rect)=>sum+screenOverlap(bounds,padded(rect)),0),placement={offset:{x:anchor.x-point.x,y:anchor.y-point.y},model,bounds};
   if(!overlap)return placement;
   if(allowCrowding&&overlap<crowding){crowded=placement;crowding=overlap;}
  }
  return crowded;
 }
 for(const army of armies){
  if(army.point.x<0||army.point.y<0||army.point.x>viewport.width||army.point.y>viewport.height)continue;
  let placement=(models?find(army.point,true):undefined)??find(army.point,false);
  // Never put a crowded DOM card over a GPU unit. Compact the viewport before allowing card crowding.
  if(!placement&&models)return layoutArmyMarkers(armies,obstacles,viewport,false);
  placement??=find(army.point,false,true);
  if(placement){placements.set(army.key,placement);occupied.push(placement.bounds);}
 }
 return placements;
}
