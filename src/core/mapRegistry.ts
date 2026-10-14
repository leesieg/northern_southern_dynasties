import type {Road,RoutePlan,Site} from './types';

/** An immutable map snapshot with private route caches. No global "current map". */
export function createMapRegistry(inputSites:readonly Site[],inputRoads:readonly Road[]){
 const sites=Object.freeze(structuredClone(inputSites).map(site=>Object.freeze(site)));
 const roads=Object.freeze(structuredClone(inputRoads).map(road=>Object.freeze(road)));
 const byId=new Map<string,Readonly<Site>>();
 for(const site of sites){
  if(!site.id||byId.has(site.id))throw new Error('地图地点 ID 缺失或重复：'+site.id);
  if(!Number.isFinite(site.lon)||!Number.isFinite(site.lat)||Math.abs(site.lon)>180||Math.abs(site.lat)>90)throw new Error('地点坐标不合法：'+site.id);
  byId.set(site.id,site);
 }
 function distanceBetween(a:string,b:string):number{
  const p=byId.get(a),q=byId.get(b);
  if(!p||!q)throw new Error('地图中不存在此地点。');
  const lat=(p.lat+q.lat)*Math.PI/360;
  return Math.hypot((p.lon-q.lon)*Math.cos(lat),p.lat-q.lat)*111;
 }
 const roadLinks=new Map<string,Map<string,number>>(),routeLinks=new Map<string,Map<string,number>>();
 const edges=new Set<string>();
 for(const edge of roads){
  const key=[edge.from,edge.to].sort().join('|');if(edges.has(key))throw new Error('道路端点重复，旧路段与新路段不能具有歧义行程：'+key);edges.add(key);
  if(!byId.has(edge.from)||!byId.has(edge.to)||edge.from===edge.to)throw new Error('道路端点无效：'+edge.from+' → '+edge.to);
  if(!Number.isFinite(edge.factor)||edge.factor<=0||edge.days!==undefined&&(!Number.isSafeInteger(edge.days)||edge.days<1||edge.days>10000))throw new Error('道路行程参数无效：'+edge.from+' → '+edge.to);
  const days=edge.days??Math.max(1,Math.ceil(distanceBetween(edge.from,edge.to)*edge.factor/40));
  if(days>10000)throw new Error('道路行程超出存档支持范围。');
  for(const [from,to] of [[edge.from,edge.to],[edge.to,edge.from]]){
   const links=roadLinks.get(from)??new Map<string,number>();if(!links.has(to))links.set(to,days);roadLinks.set(from,links);
   if(!edge.legacyOnly){const active=routeLinks.get(from)??new Map<string,number>();if(!active.has(to))active.set(to,days);routeLinks.set(from,active);}
  }
 }
 function legDays(a:string,b:string):number{
  const days=roadLinks.get(a)?.get(b);if(days===undefined)throw new Error('这两处地点之间没有已开放的道路。');return days;
 }
 function planRoute(from:string,to:string,allowed:(id:string)=>boolean=()=>true):RoutePlan|null{
  if(!byId.has(from)||!byId.has(to)||from===to)return null;
  const cost=new Map([[from,0]]),prev=new Map<string,string>();
  const unvisited=new Set(sites.map(s=>s.id));
  while(unvisited.size){
   let current:string|undefined,best=Infinity;
   for(const id of unvisited)if((cost.get(id)??Infinity)<best){current=id;best=cost.get(id)!;}
   if(current===undefined)break;
   if(current===to){
    const route=[to];while(route[0]!==from)route.unshift(prev.get(route[0])!);
    const durations=route.slice(1).map((id,i)=>legDays(route[i],id)),days=durations.reduce((a,b)=>a+b,0);
    return {route,durations,days,food:days,distance:Math.round(route.slice(1).reduce((sum,id,i)=>sum+distanceBetween(route[i],id),0))};
   }
   unvisited.delete(current);
   for(const [next,days] of routeLinks.get(current)??[]){
    if(!unvisited.has(next)||!allowed(next))continue;
    const nextCost=cost.get(current)!+days;
    if(nextCost<(cost.get(next)??Infinity)){cost.set(next,nextCost);prev.set(next,current);}
   }
  }
  return null;
 }
 return Object.freeze({sites,roads,getSite:(id:string)=>byId.get(id),distanceBetween,legDays,planRoute});
}
