export interface RockFootprint{x:number;z:number;width:number}
/** Spatial index avoids scanning every outcrop for every forest candidate. */
export function plantClearance(rocks:readonly RockFootprint[]){
 const cells=new Map<string,RockFootprint[]>(),cell=8;
 for(const rock of rocks){const r=rock.width*.6;for(let x=Math.floor((rock.x-r)/cell);x<=Math.floor((rock.x+r)/cell);x++)for(let z=Math.floor((rock.z-r)/cell);z<=Math.floor((rock.z+r)/cell);z++){const key=x+':'+z,list=cells.get(key)??[];list.push(rock);cells.set(key,list);}}
 return (x:number,z:number,bank?:{edge:number;inner:number}|null)=>!(bank&&bank.edge<.85+bank.inner*.65)&&!(cells.get(Math.floor(x/cell)+':'+Math.floor(z/cell))??[]).some(p=>Math.hypot(x-p.x,z-p.z)<p.width*.6);
}
