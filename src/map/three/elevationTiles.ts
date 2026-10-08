import {mercator,type DEMGrid} from './geography';
export interface ElevationManifest{zoom:number;west:number;east:number;north:number;south:number;tileSize:number;}
export function elevationWindow(lon:number,lat:number,m:ElevationManifest){
 const p=mercator(lon,lat),n=2**m.zoom;
 const x=Math.max(m.west,Math.min(m.east-3,Math.floor(p.x*n)-1)),y=Math.max(m.north,Math.min(m.south-3,Math.floor(p.y*n)-1));
 return {x,y,key:x+':'+y,meta:{columns:m.tileSize*3,rows:m.tileSize*3,west:x/n,north:y/n,width:3/n,height:3/n} satisfies DEMGrid};
}
/** Bounded decoded-tile cache; adjacent views reuse their overlapping source data. */
export function elevationTiles(manifest:ElevationManifest,read:(x:number,y:number)=>Promise<Int16Array>){
 const cache=new Map<string,Promise<Int16Array>>();
 function tile(x:number,y:number){const key=x+':'+y,existing=cache.get(key);if(existing){cache.delete(key);cache.set(key,existing);return existing;}
  const pending=read(x,y).then(data=>{if(data.length!==manifest.tileSize**2)throw new Error('本地高程分块不完整：'+key);return data;}).catch(error=>{if(cache.get(key)===pending)cache.delete(key);throw error;});cache.set(key,pending);
  while(cache.size>48)cache.delete(cache.keys().next().value!);return pending;
 }
 return {window:(lon:number,lat:number)=>elevationWindow(lon,lat,manifest),async load(lon:number,lat:number){
  const area=elevationWindow(lon,lat,manifest),size=manifest.tileSize,values=new Float32Array(size*size*9);
  const tiles=await Promise.all(Array.from({length:9},(_,i)=>tile(area.x+i%3,area.y+Math.floor(i/3))));
  tiles.forEach((data,i)=>{for(let row=0;row<size;row++)values.set(data.subarray(row*size,(row+1)*size),(Math.floor(i/3)*size+row)*size*3+i%3*size);});
  return {meta:area.meta,values,key:area.key};
 },clear(){cache.clear();}};
}
export async function decodeElevation(response:Response){
 if(!response.ok)throw new Error('本地高程分块加载失败（'+response.status+'）');
 if(!response.body)throw new Error('本地高程分块为空');
 // Vite serves .gz with Content-Encoding: gzip (fetch already decodes it); other static hosts may serve raw gzip.
 const payload=await response.arrayBuffer(),signature=new Uint8Array(payload,0,Math.min(2,payload.byteLength));
 const buffer=signature[0]===0x1f&&signature[1]===0x8b?await new Response(new Blob([payload]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():payload;
 if(buffer.byteLength!==256*256*2)throw new Error('本地高程分块字节数不完整');
 const data=new Int16Array(256*256),view=new DataView(buffer);for(let i=0;i<data.length;i++)data[i]=view.getInt16(i*2,true);return data;
}
