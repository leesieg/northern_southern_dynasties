import {type Map,type ImageSource} from 'maplibre-gl';
import type {Position} from 'geojson';
import {siteById} from '../../data/scenario';
import {SAMPLE_CITIES} from './presentation';

let atlas:HTMLImageElement|undefined;
export function loadLandscapeAtlas(){
 return new Promise<void>((resolve,reject)=>{const image=new Image();image.onload=()=>{atlas=image;resolve();};image.onerror=()=>reject(new Error('地表贴图加载失败'));image.src=import.meta.env.BASE_URL+'art/map-sample/ground-atlas.png';});
}

/** A material skin over the same loaded DEM, not an independently generated landscape. */
export function landscapeSurface(map:Map){
 if(!atlas)return false;
 const center=map.getCenter(),span=Math.min(.48,Math.max(.08,1.2/2**(map.getZoom()-8)));
 const west=center.lng-span,east=center.lng+span,south=center.lat-span*.75,north=center.lat+span*.75;
 const size=1024,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
 const ctx=canvas.getContext('2d')!;
 const patterns=Array.from({length:4},(_,i)=>{const tile=document.createElement('canvas');tile.width=tile.height=i===1?128:256;tile.getContext('2d')!.drawImage(atlas!,i%2*atlas!.width/2,Math.floor(i/2)*atlas!.height/2,atlas!.width/2,atlas!.height/2,0,0,tile.width,tile.height);return ctx.createPattern(tile,'repeat')!;});
 ctx.fillStyle=patterns[0];ctx.fillRect(0,0,size,size);
 const point=(p:Position)=>[(p[0]-west)/(east-west)*size,(north-p[1])/(north-south)*size];
 const path=(rings:Position[][])=>{ctx.beginPath();for(const ring of rings){ring.forEach((p,i)=>{const [x,y]=point(p);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.closePath();}};
 const features=map.querySourceFeatures('natural',{sourceLayer:'landcover'});
 for(const f of features){
  const kind=f.properties?.class;
  ctx.fillStyle=patterns[kind==='wood'?1:kind==='farmland'?3:0];
  if(f.geometry.type==='Polygon'){path(f.geometry.coordinates);ctx.fill('evenodd');}
  if(f.geometry.type==='MultiPolygon')for(const polygon of f.geometry.coordinates){path(polygon);ctx.fill('evenodd');}
 }
 // Exposed-rock pigment follows DEM slope, never a generated mountain silhouette.
 const cells=96,cell=size/cells;
 for(let y=0;y<cells;y++)for(let x=0;x<cells;x++){
  const lon=west+(x+.5)/cells*(east-west),lat=north-(y+.5)/cells*(north-south);
  const h=map.queryTerrainElevation({lng:lon,lat}),hx=map.queryTerrainElevation({lng:lon+.001,lat}),hy=map.queryTerrainElevation({lng:lon,lat:lat+.001});
  if(h===null||hx===null||hy===null)continue;
  const slope=Math.hypot(hx-h,hy-h),alpha=Math.min(.8,Math.max(0,(slope-65)/180));
  if(alpha>0){ctx.globalAlpha=alpha;ctx.fillStyle=patterns[2];ctx.fillRect(x*cell,y*cell,cell+1,cell+1);ctx.globalAlpha=1;}
 }
 // Fine surface grain in the albedo, without introducing invented geographical relief.
 let seed=546;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<70000;i++){const light=random()>.5;ctx.fillStyle=light?'#e0c98618':'#182d2319';ctx.fillRect(random()*size,random()*size,1+random()*3,1+random()*2);}
 // Art-directed agricultural plots around the city miniature, not historical parcel boundaries.
 for(const id of SAMPLE_CITIES){
  const city=siteById[id];
  for(let i=0;i<110;i++){
   const dx=(random()-.5)*.21,dy=(random()-.5)*.15;
   if(Math.abs(dx)<.038&&Math.abs(dy)<.035)continue;
   const [x,y]=point([city.lon+dx,city.lat+dy]);
   const w=(.004+random()*.009)/(east-west)*size,h=(.002+random()*.006)/(north-south)*size;
   ctx.save();ctx.translate(x,y);ctx.rotate(-.10);ctx.fillStyle=patterns[3];ctx.fillRect(0,0,w,h);
   ctx.strokeStyle='#595f383b';ctx.lineWidth=.7;for(let row=2;row<h;row+=3){ctx.beginPath();ctx.moveTo(0,row);ctx.lineTo(w,row);ctx.stroke();}ctx.restore();
  }
 }
 for(const f of map.querySourceFeatures('natural',{sourceLayer:'water'})){
  ctx.fillStyle='#497b72';ctx.strokeStyle='#b9ae7b';ctx.lineWidth=2.5;
  if(f.geometry.type==='Polygon'){path(f.geometry.coordinates);ctx.stroke();ctx.fill('evenodd');}
  if(f.geometry.type==='MultiPolygon')for(const polygon of f.geometry.coordinates){path(polygon);ctx.stroke();ctx.fill('evenodd');}
 }
 for(const f of map.querySourceFeatures('natural',{sourceLayer:'waterway'})){
  const lines=f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.type==='MultiLineString'?f.geometry.coordinates:[];
  for(const line of lines){ctx.beginPath();line.forEach((p,i)=>{const [x,y]=point(p);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.strokeStyle='#42756c';ctx.lineWidth=f.properties?.class==='river'?2:1;ctx.stroke();}
 }
 ctx.globalCompositeOperation='destination-in';
 for(const axis of ['x','y']){const g=ctx.createLinearGradient(0,0,axis==='x'?size:0,axis==='y'?size:0);g.addColorStop(0,'#0000');g.addColorStop(.12,'#000');g.addColorStop(.88,'#000');g.addColorStop(1,'#0000');ctx.fillStyle=g;ctx.fillRect(0,0,size,size);}
 const coordinates:[[number,number],[number,number],[number,number],[number,number]]=[[west,north],[east,north],[east,south],[west,south]];
 const url=canvas.toDataURL('image/png');
 const source=map.getSource('sample-surface') as ImageSource|undefined;
 if(source)source.updateImage({url,coordinates});
 else{
  map.addSource('sample-surface',{type:'image',url,coordinates});
  map.addLayer({id:'sample-surface',type:'raster',source:'sample-surface',minzoom:8.5,paint:{'raster-fade-duration':0,'raster-opacity':.9}},'mountain-shadow');
 }
 return true;
}
