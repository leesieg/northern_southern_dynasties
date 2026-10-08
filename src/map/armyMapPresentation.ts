import type {Army} from '../core/realm';
import {siteById} from '../data/scenario';
import {journeyPosition} from '../core/routeGeometry';

// Visual scale only; marker targets and the shared model layer use the same anchors.
export const ARMY_MODEL_ZOOM=6.5;
export const ARMY_MODEL_PIXELS=92;
export const armyShowsModel=(zoom:number,enabled:boolean)=>enabled&&zoom>=ARMY_MODEL_ZOOM;
export function armyMapPosition(a:Army){
 let {lon,lat}=siteById[a.location];
 if(a.journey)return journeyPosition(a.journey);
 return {lon,lat};
}
export interface ScreenPoint {x:number;y:number}
export interface ScreenRect {left:number;top:number;right:number;bottom:number}
export interface ArmyMarkerPlacement {offset:ScreenPoint;model:boolean;bounds:ScreenRect}
// Both DOM hit targets and GPU models consume these screen placements. No world position is changed.
export const armyMarkerFootprint=(model:boolean,strategic=false)=>model?{width:Math.ceil(3*ARMY_MODEL_PIXELS),height:Math.ceil(348*ARMY_MODEL_PIXELS/72),bottom:Math.ceil(132*ARMY_MODEL_PIXELS/72)}:strategic?{width:126,height:46,bottom:50}:{width:82,height:78,bottom:66};
export const armyModelBadgeBottom=(pitch:number)=>Math.ceil(96*ARMY_MODEL_PIXELS/72*Math.cos(pitch*Math.PI/180))+36;
export const screenOverlap=(a:ScreenRect,b:ScreenRect)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
/** One representative at each actual location; choosing another co-located army never moves the model. */
export function anchoredArmyModels(armies:{key:string;point:ScreenPoint;position:{lon:number;lat:number}}[],selected:readonly string[],viewport:{width:number;height:number}){
 const groups=new Map<string,typeof armies>(),placements=new Map<string,ArmyMarkerPlacement>(),size=armyMarkerFootprint(true);
 for(const army of armies){const key=army.position.lon.toFixed(5)+':'+army.position.lat.toFixed(5),group=groups.get(key)??[];group.push(army);groups.set(key,group);}
 const priority=(a:typeof armies[number],b:typeof armies[number])=>Number(selected.includes(b.key))-Number(selected.includes(a.key))||a.key.localeCompare(b.key,undefined,{numeric:true});
 const leaders=[...groups.values()].map(group=>group.sort(priority)[0]).sort(priority);
 for(const lead of leaders){
  const p=lead.point,bounds={left:p.x-size.width/2,right:p.x+size.width/2,top:p.y+size.bottom-size.height,bottom:p.y+size.bottom};
  if(bounds.right<0||bounds.left>viewport.width||bounds.bottom<0||bounds.top>viewport.height)continue;
  if([...placements.values()].some(other=>screenOverlap(bounds,other.bounds)>0))continue; // Density changes representation, never coordinates.
  placements.set(lead.key,{model:true,offset:{x:0,y:0},bounds});
 }
 return placements;
}

/** Move DOM labels around fixed units, rather than moving a unit to another place on the map. */
export function dockMapMarker(rect:ScreenRect,armies:ScreenRect[],placed:ScreenRect[],viewport?:{width:number;height:number}){
 const gap=8,blockers=[...armies,...placed],width=rect.right-rect.left,height=rect.bottom-rect.top;
 const within=(r:ScreenRect)=>!viewport||(r.left>=gap&&r.top>=gap&&r.right<=viewport.width-gap&&r.bottom<=viewport.height-gap);
 if(within(rect)&&!blockers.some(b=>screenOverlap(rect,b)>0))return {offset:{x:0,y:0},bounds:rect};
 const candidates:ScreenPoint[]=[];
 const add=(x:number,y:number)=>{
  if(viewport&&width<=viewport.width-2*gap&&height<=viewport.height-2*gap){
   x=Math.max(gap-rect.left,Math.min(x,viewport.width-gap-rect.right));
   y=Math.max(gap-rect.top,Math.min(y,viewport.height-gap-rect.bottom));
  }
  candidates.push({x,y});
 };
 add(0,0);
 // Individual obstacles, not a giant rectangle spanning unrelated armies.
 for(const b of blockers){
  const xs=[0,b.left-gap-rect.right,b.right+gap-rect.left],ys=[0,b.top-gap-rect.bottom,b.bottom+gap-rect.top];
  for(const x of xs)for(const y of ys)add(x,y);
 }
 candidates.sort((a,b)=>a.x*a.x+a.y*a.y-(b.x*b.x+b.y*b.y));
 let best=candidates[0],bestOverlap=Infinity;
 for(const offset of candidates){
  const at={left:rect.left+offset.x,right:rect.right+offset.x,top:rect.top+offset.y,bottom:rect.bottom+offset.y};
  if(!within(at)||armies.some(b=>screenOverlap(at,b)>0))continue;
  const overlap=placed.reduce((sum,b)=>sum+screenOverlap(at,b),0);
  if(!overlap)return {offset,bounds:at};
  if(overlap<bestOverlap){bestOverlap=overlap;best=offset;}
 }
 return {offset:best,bounds:{left:rect.left+best.x,right:rect.right+best.x,top:rect.top+best.y,bottom:rect.bottom+best.y}};
}

export function layoutArmyCards(armies:{key:string;point:ScreenPoint}[],obstacles:ScreenRect[],viewport:{width:number;height:number},strategic=false,maxDistance=Infinity){
 const placements=new Map<string,ArmyMarkerPlacement>(),occupied:ScreenRect[]=[],gap=8;
 const padded=(r:ScreenRect)=>({left:r.left-gap,top:r.top-gap,right:r.right+gap,bottom:r.bottom+gap});
 const fixed=obstacles.map(padded);
 function find(point:ScreenPoint,allowCrowding=false){
  const size=armyMarkerFootprint(false,strategic),above=size.height-size.bottom;
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
   if(Math.hypot(anchor.x-point.x,anchor.y-point.y)>maxDistance)continue;
   const bounds={left:anchor.x-size.width/2,right:anchor.x+size.width/2,top:anchor.y-above,bottom:anchor.y+size.bottom};
   if(fixed.some(rect=>screenOverlap(bounds,rect)>0))continue;
   const overlap=occupied.reduce((sum,rect)=>sum+screenOverlap(bounds,padded(rect)),0),placement={offset:{x:anchor.x-point.x,y:anchor.y-point.y},model:false,bounds};
   if(!overlap)return placement;
   if(allowCrowding&&overlap<crowding){crowded=placement;crowding=overlap;}
  }
  return crowded;
 }
 for(const army of armies){
  if(army.point.x<0||army.point.y<0||army.point.x>viewport.width||army.point.y>viewport.height)continue;
  const placement=find(army.point)??find(army.point,true);
  if(placement){placements.set(army.key,placement);occupied.push(placement.bounds);}
 }
 return placements;
}
