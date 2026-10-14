import {ATLAS_PAPER_COLOR,paperCoverageMask} from './paperCoverage';
import {paperRidgeLod} from './paperInk';
import type {FeatureCollection} from 'geojson';
import {CanvasTexture,Color,Group,Mesh,MeshBasicMaterial,SRGBColorSpace} from 'three';
import {paperGeometry,type PaperBounds} from './paperGeometry';
import {territories,territoryRealms} from '../territories';
import {siteById} from '../../data/scenario';
import {projectGround} from '../three/geography';
import {seededRandom} from '../sample/geography';
import {forestCover} from './layout';
import {inkEdge} from './paperInk';
import type {SampleTerrain} from './terrain';

const SIZE=4096;
export interface PaperMapOptions{center:{x:number;z:number};span:number;realms:FeatureCollection;territories:FeatureCollection;land?:FeatureCollection;bounds?:PaperBounds;}
export type PaperTerrain=Pick<SampleTerrain,'measured'|'river'|'channel'> & {cities:{id:string;x:number;z:number}[]};
const washes:Record<string,string>={liang:'#6c966f',east:'#b67c9b',west:'#b19563',frontier:'#aba58e'};
/** A separate printed atlas, anchored to the same geography. Existing polygons remain schematic. */
export function createPaperMap(terrain:PaperTerrain,options?:PaperMapOptions){
 const SPAN=options?.span??840,SCALE=SIZE/SPAN,step=Math.max(1,SPAN/840),extent=options?SPAN*.5:260,extentZ=options?SPAN*.5:230;
 const realmData=options?.realms??territoryRealms,territoryData=options?.territories??territories;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=SIZE;
 const live=canvas.getContext('2d');if(!live)throw new Error('无法创建舆图画布');let ctx=live;
 // Keep public geography separate from live political, administrative and city information.
 const context=options?document.createElement('canvas'):undefined;
 if(context)context.width=context.height=SIZE;
 const outside=context?.getContext('2d');
 const random=seededRandom(5461012),origin=options?.center??projectGround(siteById.jiankang.lon,siteById.jiankang.lat);
 const ground=(x:number,z:number)=>terrain.measured(x+(options?origin.x:0),z+(options?origin.z:0));
 const river=(x:number,z:number)=>terrain.river(x+(options?origin.x:0),z+(options?origin.z:0));
 const towns=terrain.cities.map(c=>({...c,x:c.x-(options?origin.x:0),z:c.z-(options?origin.z:0)}));
 const local=(coordinates:number[])=>{const p=projectGround(coordinates[0],coordinates[1]);return {x:p.x-origin.x,z:p.z-origin.z};};
 const px=(v:number)=>(v+SPAN/2)*SCALE;
 ctx.fillStyle=ATLAS_PAPER_COLOR;ctx.fillRect(0,0,SIZE,SIZE);ctx.lineJoin='round';ctx.lineCap='round';
 const polygon=(coordinates:number[][][][])=>{ctx.beginPath();for(const shape of coordinates)for(const ring of shape){ring.forEach((v,i)=>{const p=local(v);if(i===0)ctx.moveTo(px(p.x),px(p.z));else if(options){const a=projectGround(ring[i-1][0],ring[i-1][1]),b=projectGround(v[0],v[1]);for(const q of inkEdge(a,b))ctx.lineTo(px(q.x-origin.x),px(q.z-origin.z));}else for(const q of inkEdge(local(ring[i-1]),p))ctx.lineTo(px(q.x),px(q.z));});ctx.closePath();}};
 if(options?.land){ctx.fillStyle='#aec4bb';ctx.fillRect(0,0,SIZE,SIZE);for(const f of options.land.features){const coordinates=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.type==='MultiPolygon'?f.geometry.coordinates:[];polygon(coordinates);ctx.fillStyle=ATLAS_PAPER_COLOR;ctx.fill('evenodd');ctx.strokeStyle='#788e7f';ctx.lineWidth=.22*SCALE*step;ctx.stroke();}}
 if(outside)outside.drawImage(canvas,0,0);
 for(const feature of realmData.features){polygon(feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.type==='MultiPolygon'?feature.geometry.coordinates:[]);ctx.globalAlpha=.84;ctx.fillStyle=washes[String(feature.properties?.origin??feature.properties?.id)]??(options&&feature.properties?.color?new Color(String(feature.properties.color)).lerp(new Color('#d6d3bd'),.08).getStyle():washes.frontier);ctx.fill('evenodd');ctx.globalAlpha=.36;ctx.strokeStyle='#667061';ctx.lineWidth=2.6*SCALE;ctx.stroke();}
 // Local borders use the project's existing schematic polygons, never newly invented divisions.
 for(const feature of territoryData.features){polygon(feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.type==='MultiPolygon'?feature.geometry.coordinates:[]);ctx.globalAlpha=.16;ctx.strokeStyle='#364c35';ctx.lineWidth=.95*SCALE;ctx.stroke();ctx.globalAlpha=.55;ctx.lineWidth=.35*SCALE;ctx.stroke();}
 ctx.globalAlpha=1;
 // Draw the same physical ink once, then composite it onto both sides of the coverage edge.
 const physical=options?document.createElement('canvas'):undefined;
 if(physical){physical.width=physical.height=SIZE;ctx=physical.getContext('2d')!;ctx.lineJoin='round';ctx.lineCap='round';}
 // Uneven pigment density adds a broad paper wash without screen-space noise.
 for(let i=0;i<4600;i++){const x=random()*SIZE,y=random()*SIZE,r=(4+random()*14)*SCALE;ctx.globalAlpha=.038;ctx.fillStyle=i%3?'#e2d6ae':'#4b6655';ctx.beginPath();ctx.ellipse(x,y,r,r*(.3+random()*.6),random()*Math.PI,0,Math.PI*2);ctx.fill();}
 // Low-frequency ink wash follows elevation; bilinear scaling avoids a grid or lit 3D relief.
 const relief=document.createElement('canvas');relief.width=260;relief.height=230;const rc=relief.getContext('2d')!,reliefPixels=rc.createImageData(260,230);
 for(let j=0;j<230;j++)for(let i=0;i<260;i++){const h=ground(-extent+i/260*extent*2,-extentZ+j/230*extentZ*2),n=(j*260+i)*4;reliefPixels.data[n]=58;reliefPixels.data[n+1]=82;reliefPixels.data[n+2]=60;reliefPixels.data[n+3]=Math.min(78,Math.max(0,h-.18)*24);}
 rc.putImageData(reliefPixels,0,0);ctx.globalAlpha=1;ctx.drawImage(relief,px(-extent),px(-extentZ),extent*2*SCALE,extentZ*2*SCALE);
 // Fibre and pigment are fixed in map space, so moving the camera never re-rolls the grain.
 const fibre=document.createElement('canvas');fibre.width=fibre.height=256;const f=fibre.getContext('2d')!;
 const pixels=f.createImageData(256,256);for(let i=0;i<pixels.data.length;i+=4){const value=82+random()*85;pixels.data[i]=value;pixels.data[i+1]=value-5;pixels.data[i+2]=value-16;pixels.data[i+3]=random()*55;}f.putImageData(pixels,0,0);
 ctx.fillStyle=ctx.createPattern(fibre,'repeat')!;ctx.fillRect(0,0,SIZE,SIZE);
 // Visible fibres and soft creases span several texels rather than disappearing into mipmaps.
 for(let i=0;i<18000;i++){const x=random()*SIZE,y=random()*SIZE;ctx.globalAlpha=.045+random()*.06;ctx.strokeStyle=i%3?'#ede1b9':'#5a6046';ctx.lineWidth=.5+random()*1.6;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+3,y-2,x+5+random()*22,y+(random()-.5)*5);ctx.stroke();}
 ctx.globalAlpha=1;
 // Hand-drawn ridge marks follow measured high ground; these are map symbols, not new mountains.
 const stamps:{x:number;z:number}[]=[],ridge=paperRidgeLod(SPAN);
 for(let z=-extentZ;z<extentZ;z+=2.7*step*ridge.spacing)for(let x=-extent;x<extent;x+=3.2*step*ridge.spacing){
  const sx=x+(random()-.5)*3*step,sz=z+(random()-.5)*2*step,h=ground(sx,sz);
  if(h<.34||random()>.69||river(sx,sz)<2||towns.some(c=>Math.hypot(sx-c.x,sz-c.z)<5))continue;
  const slope=Math.abs(ground(sx+1,sz)-ground(sx-1,sz))+Math.abs(ground(sx,sz+1)-ground(sx,sz-1));
  if(slope<.08&&h<1.1)continue;
  const w=(1.3+random()*1.5)*SCALE*step,height=(1.0+Math.min(3,h)*.8)*SCALE*step,cx=px(sx),cy=px(sz);
  ctx.strokeStyle='#3c513a';ctx.fillStyle='#526548';ctx.globalAlpha=.63*ridge.opacity;ctx.lineWidth=.23*SCALE*step;
  ctx.beginPath();ctx.moveTo(cx-w*1.5,cy+height*.45);ctx.lineTo(cx-w*.78,cy-height*.18);ctx.lineTo(cx-w*.44,cy+height*.12);ctx.moveTo(cx+w*.37,cy-height*.13);ctx.lineTo(cx+w*.69,cy-height*.39);ctx.lineTo(cx+w*1.4,cy+height*.36);ctx.stroke();
  ctx.beginPath();ctx.moveTo(cx-w,cy+height*.42);ctx.bezierCurveTo(cx-w*.62,cy+height*.12,cx-w*.30,cy-height*.60,cx,cy-height);ctx.bezierCurveTo(cx+w*.28,cy-height*.38,cx+w*.5,cy-height*.1,cx+w,cy+height*.34);ctx.stroke();
  ctx.globalAlpha=.34*ridge.opacity;ctx.lineTo(cx+w*.10,cy+height*.14);ctx.lineTo(cx,cy-height);ctx.fill();
  ctx.globalAlpha=.52*ridge.opacity;ctx.lineWidth=.16*SCALE*step;
  for(let j=0;j<5;j++){ctx.beginPath();ctx.moveTo(cx+(j*.10-.15)*w,cy-height*(.86-j*.12));ctx.lineTo(cx+(.18+j*.15)*w,cy+height*(.14+j*.08));ctx.stroke();}
  stamps.push({x:sx,z:sz});
 }
 // Sparse woodland wash remains secondary to the ridge strokes and labels.
 for(let z=options?-extentZ:-150;z<(options?extentZ:150);z+=4*step)for(let x=options?-extent:-180;x<(options?extent:180);x+=4*step){const h=ground(x,z);if(h>.9||forestCover(x,z,h)<.57||river(x,z)<3||random()>.42)continue;ctx.globalAlpha=.15;ctx.fillStyle='#53694e';ctx.beginPath();ctx.ellipse(px(x),px(z),2.2*SCALE,.65*SCALE,0,0,Math.PI*2);ctx.fill();}
 // Cyan water and pale banks match the reference's printed waterway, using actual channel profiles.
 for(const source of terrain.channel.profiles){const line=options?source.map(p=>({...p,x:p.x-origin.x,z:p.z-origin.z})):source;ctx.beginPath();line.forEach((p,i)=>{const x=px(p.x-p.nx*p.left),z=px(p.z-p.nz*p.left);if(i===0)ctx.moveTo(x,z);else ctx.lineTo(x,z);});for(let i=line.length-1;i>=0;i--){const p=line[i];ctx.lineTo(px(p.x+p.nx*p.right),px(p.z+p.nz*p.right));}ctx.closePath();ctx.globalAlpha=.92;ctx.strokeStyle='#e1ece0';ctx.lineWidth=.50*SCALE;ctx.stroke();ctx.fillStyle='#29c2e5';ctx.fill();
  ctx.globalAlpha=.38;ctx.strokeStyle='#d2f0e5';ctx.lineWidth=.14*SCALE;ctx.beginPath();line.forEach((p,i)=>{const x=px(p.x+p.nx*p.right*.67),z=px(p.z+p.nz*p.right*.67);if(i===0)ctx.moveTo(x,z);else ctx.lineTo(x,z);});ctx.stroke();}
 if(physical&&outside){
  live.drawImage(physical,0,0);outside.drawImage(physical,0,0);
  // A light paper wash keeps peripheral geography subordinate without erasing its contours.
  outside.fillStyle=ATLAS_PAPER_COLOR;outside.globalAlpha=.18;outside.fillRect(0,0,SIZE,SIZE);outside.globalAlpha=1;
  ctx=live;
 }
 // Administrative names reuse existing feature identities. Position in an open part of each group.
 const districts=new Map<string,{name:string;points:{x:number;z:number}[]}>();
 for(const feature of territoryData.features){const id=String(feature.properties?.id),town=towns.find(c=>c.id===id);if(!town)continue;const group=String(feature.properties?.group),entry=districts.get(group)??{name:String(feature.properties?.prefecture),points:[]};entry.points.push(town);districts.set(group,entry);}
 ctx.font=`${3.7*SCALE}px 'FYN Song', SampleSong, 'Songti SC', serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#4a6850';ctx.globalAlpha=.46;
 for(const district of districts.values()){if(district.points.length<2)continue;const x=district.points.reduce((n,p)=>n+p.x,0)/district.points.length,z=district.points.reduce((n,p)=>n+p.z,0)/district.points.length;
  const candidates=[{x:x-7,z:z+5},{x:x+8,z:z+6},{x:x-5,z:z-8},{x:x+9,z:z-9}];candidates.sort((a,b)=>Math.min(...towns.map(c=>Math.hypot(b.x-c.x,b.z-c.z)))-Math.min(...towns.map(c=>Math.hypot(a.x-c.x,a.z-c.z))));const p=candidates[0];ctx.fillText(district.name,px(p.x),px(p.z));}
 // Small roof-and-wall seals replace the white 3D city blocks in atlas mode.
 ctx.globalAlpha=.70;ctx.strokeStyle='#4f6250';ctx.fillStyle='#4f6250';ctx.lineWidth=.18*SCALE;
 for(const town of towns){const x=px(town.x),y=px(town.z),s=(town.id==='jiankang'?1.4:1)*SCALE;
  for(const offset of [-1,0,1]){const cx=x+offset*s*.8,cy=y+(offset===0?-.5:.05)*s;ctx.beginPath();ctx.moveTo(cx-s*.6,cy);ctx.lineTo(cx,cy-s*.5);ctx.lineTo(cx+s*.6,cy);ctx.closePath();ctx.fill();ctx.strokeRect(cx-s*.36,cy+s*.10,s*.72,s*.48);}ctx.beginPath();ctx.moveTo(x-s*1.6,y+s*.9);ctx.lineTo(x+s*1.6,y+s*.9);ctx.stroke();}
 ctx.globalAlpha=1;
 // Feather ONLY live information. Coastlines, measured relief and shared ridge/water ink
 // continue into the surrounding sheet; no invented settlements or political claims are added.
 if(context&&outside){
  outside.globalCompositeOperation='destination-out';outside.drawImage(paperCoverageMask(realmData,origin,SPAN),0,0,SIZE,SIZE);
  ctx.drawImage(context,0,0);
  context.width=1; // Release temporary 4096² backing stores after compositing.
  if(physical)physical.width=1;
 }
 const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;texture.anisotropy=4;
 const material=new MeshBasicMaterial({map:texture,transparent:true,opacity:0,depthTest:!!options,depthWrite:false,toneMapped:false,fog:false});
 const plane=new Mesh(paperGeometry(origin,SPAN,options?.bounds),material);plane.rotation.x=-Math.PI/2;plane.position.set(options?origin.x:0,options?0.5:0.06,options?origin.z:0);plane.renderOrder=options?0:8;plane.frustumCulled=false;
 const root=new Group();root.add(plane);root.visible=false;
 return {root,texture,dispose(){texture.dispose();material.dispose();plane.geometry.dispose();},stampCount:stamps.length,update(blend:number){root.visible=blend>.001;material.opacity=blend;}};
}
