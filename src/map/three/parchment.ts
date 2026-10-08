import {CanvasTexture,SRGBColorSpace} from 'three';
import type {FeatureCollection,Position} from 'geojson';
import {mercator,gridHeight,type DEMGrid} from './geography';
import {polygonRings} from './overlays';
import {seededRandom} from '../sample/geography';

/** Geographic ink drawing only. Never receives polity, city, army or save information. */
export function parchmentTexture(values:Float32Array,meta:DEMGrid,land:FeatureCollection,rivers:FeatureCollection){
 const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=Math.round(canvas.width*meta.height/meta.width);
 const c=canvas.getContext('2d')!,w=canvas.width,h=canvas.height,random=seededRandom(546);
 const paper=c.createImageData(w,h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const grain=(random()-.5)*9+Math.sin(x*.018+Math.sin(y*.009))*2+Math.cos(y*.021)*2;
  const edge=Math.pow(Math.max(Math.abs(x/w-.5),Math.abs(y/h-.5))*2,5)*10,i=(y*w+x)*4;
  paper.data[i]=210+grain-edge;paper.data[i+1]=193+grain-edge;paper.data[i+2]=154+grain-edge;paper.data[i+3]=255;
 }
 c.putImageData(paper,0,0);
 const point=([lon,lat]:Position)=>{const p=mercator(lon,lat);return [(p.x-meta.west)/meta.width*w,(p.y-meta.north)/meta.height*h];};
 const path=(ring:Position[])=>ring.forEach((p,i)=>{const [x,y]=point(p);if(i)c.lineTo(x,y);else c.moveTo(x,y);});
 // Pale sea wash; shorelines and rivers follow the same Natural Earth data as the game.
 c.fillStyle='rgba(90,112,107,.14)';c.fillRect(0,0,w,h);
 for(const feature of land.features)for(const polygon of polygonRings(feature.geometry)){
  c.beginPath();for(const ring of polygon){path(ring);c.closePath();}
  c.fillStyle='rgba(239,218,170,.56)';c.fill('evenodd');
  c.strokeStyle='rgba(83,69,45,.18)';c.lineWidth=3.2;c.stroke();
  c.strokeStyle='rgba(80,64,41,.55)';c.lineWidth=.7;c.stroke();
 }
 c.save();c.beginPath();
 for(const feature of land.features)for(const polygon of polygonRings(feature.geometry))for(const ring of polygon){path(ring);c.closePath();}
 c.clip('evenodd');
 // Broken ridge strokes and short hatching are anchored to sampled geographic relief.
 for(let y=8;y<h-8;y+=12)for(let x=8;x<w-8;x+=13){
  const px=x+(random()-.5)*8,py=y+(random()-.5)*6,mx=meta.west+px/w*meta.width,my=meta.north+py/h*meta.height;
  const altitude=gridHeight(values,meta,mx,my)??0;
  const east=gridHeight(values,meta,mx+meta.width/w*5,my)??altitude;
  const south=gridHeight(values,meta,mx,my+meta.height/h*5)??altitude;
  const relief=Math.abs(east-altitude)+Math.abs(south-altitude);
  if(altitude<450||relief<75||random()>.68)continue;
  const peak=Math.min(9,2+relief/200),width=3+random()*3;
  c.strokeStyle=`rgba(81,64,39,${.15+Math.min(.23,relief/3500)})`;c.lineWidth=.65;
  c.beginPath();c.moveTo(px-width,py+2);c.lineTo(px-.8,py-peak);c.lineTo(px+width,py+1);c.stroke();
  c.strokeStyle='rgba(81,64,39,.18)';c.beginPath();
  for(let j=1;j<4;j++){c.moveTo(px+j*.8,py-peak+j*1.5);c.lineTo(px+j*.8+2,py+1);}c.stroke();
 }
 c.strokeStyle='rgba(86,99,91,.45)';c.lineWidth=.65;
 for(const feature of rivers.features){const g=feature.geometry;for(const line of g.type==='LineString'?[g.coordinates]:g.type==='MultiLineString'?g.coordinates:[]){c.beginPath();path(line);c.stroke();}}
 c.restore();
 const texture=new CanvasTexture(canvas);texture.flipY=false;texture.colorSpace=SRGBColorSpace;
 return Object.assign(texture,{userData:{extent:[meta.west,meta.north,meta.width,meta.height]}});
}
