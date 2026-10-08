/** Screen-space presentation only; hidden markers remain available in entity lists. */
export function annotationDensity<T extends {key:string;point:{x:number;y:number};priority:number;required?:boolean}>(items:T[],viewport:{width:number;height:number},budget:number,gap:number){
 const visible=items.filter(i=>i.point.x>=0&&i.point.y>=0&&i.point.x<=viewport.width&&i.point.y<=viewport.height).sort((a,b)=>Number(!!b.required)-Number(!!a.required)||b.priority-a.priority||a.key.localeCompare(b.key));
 const kept:T[]=[];
 for(const item of visible){if(item.required||(kept.length<budget&&!kept.some(k=>Math.hypot(k.point.x-item.point.x,k.point.y-item.point.y)<gap)))kept.push(item);}
 return new Set(kept.map(i=>i.key));
}
