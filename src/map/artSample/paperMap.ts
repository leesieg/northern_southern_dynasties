import {CanvasTexture,Group,Mesh,MeshBasicMaterial,PlaneGeometry,SRGBColorSpace} from 'three';
import {territories,territoryRealms} from '../territories';
import {siteById} from '../../data/scenario';
import {projectGround} from '../three/geography';
import {seededRandom} from '../sample/geography';
import {forestCover} from './layout';
import {inkEdge} from './paperInk';
import type {SampleTerrain} from './terrain';

const SIZE=4096,SPAN=840,SCALE=SIZE/SPAN;
const washes:Record<string,string>={liang:'#6c966f',east:'#b67c9b',west:'#b19563',frontier:'#aba58e'};
/** A separate printed atlas, anchored to the same geography. Existing polygons remain schematic. */
export function createPaperMap(terrain:SampleTerrain){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=SIZE;
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('无法创建舆图画布');
 const random=seededRandom(5461012),origin=projectGround(siteById.jiankang.lon,siteById.jiankang.lat);
 const local=(coordinates:number[])=>{const p=projectGround(coordinates[0],coordinates[1]);return {x:p.x-origin.x,z:p.z-origin.z};};
 const px=(v:number)=>(v+SPAN/2)*SCALE;
 ctx.fillStyle='#d6d3bd';ctx.fillRect(0,0,SIZE,SIZE);ctx.lineJoin='round';ctx.lineCap='round';
 const polygon=(coordinates:number[][][][])=>{ctx.beginPath();for(const shape of coordinates)for(const ring of shape){ring.forEach((v,i)=>{const p=local(v);if(i===0)ctx.moveTo(px(p.x),px(p.z));else for(const q of inkEdge(local(ring[i-1]),p))ctx.lineTo(px(q.x),px(q.z));});ctx.closePath();}};
 for(const feature of territoryRealms.features){polygon(feature.geometry.coordinates);ctx.globalAlpha=.84;ctx.fillStyle=washes[String(feature.properties?.id)]??washes.frontier;ctx.fill('evenodd');ctx.globalAlpha=.36;ctx.strokeStyle='#667061';ctx.lineWidth=2.6*SCALE;ctx.stroke();}
 // Uneven pigment density adds a broad paper wash without screen-space noise.
 for(let i=0;i<4600;i++){const x=random()*SIZE,y=random()*SIZE,r=(4+random()*14)*SCALE;ctx.globalAlpha=.038;ctx.fillStyle=i%3?'#e2d6ae':'#4b6655';ctx.beginPath();ctx.ellipse(x,y,r,r*(.3+random()*.6),random()*Math.PI,0,Math.PI*2);ctx.fill();}
 // Local borders use the project's existing schematic polygons, never newly invented divisions.
 for(const feature of territories.features){polygon(feature.geometry.coordinates);ctx.globalAlpha=.16;ctx.strokeStyle='#364c35';ctx.lineWidth=.95*SCALE;ctx.stroke();ctx.globalAlpha=.55;ctx.lineWidth=.35*SCALE;ctx.stroke();}
 ctx.globalAlpha=1;
 // Low-frequency ink wash follows elevation; bilinear scaling avoids a grid or lit 3D relief.
 const relief=document.createElement('canvas');relief.width=260;relief.height=230;const rc=relief.getContext('2d')!,reliefPixels=rc.createImageData(260,230);
 for(let j=0;j<230;j++)for(let i=0;i<260;i++){const h=terrain.measured(-260+i*2,-230+j*2),n=(j*260+i)*4;reliefPixels.data[n]=58;reliefPixels.data[n+1]=82;reliefPixels.data[n+2]=60;reliefPixels.data[n+3]=Math.min(78,Math.max(0,h-.18)*24);}
 rc.putImageData(reliefPixels,0,0);ctx.globalAlpha=1;ctx.drawImage(relief,px(-260),px(-230),520*SCALE,460*SCALE);
 // Fibre and pigment are fixed in map space, so moving the camera never re-rolls the grain.
 const fibre=document.createElement('canvas');fibre.width=fibre.height=256;const f=fibre.getContext('2d')!;
 const pixels=f.createImageData(256,256);for(let i=0;i<pixels.data.length;i+=4){const value=82+random()*85;pixels.data[i]=value;pixels.data[i+1]=value-5;pixels.data[i+2]=value-16;pixels.data[i+3]=random()*55;}f.putImageData(pixels,0,0);
 ctx.fillStyle=ctx.createPattern(fibre,'repeat')!;ctx.fillRect(0,0,SIZE,SIZE);
 // Visible fibres and soft creases span several texels rather than disappearing into mipmaps.
 for(let i=0;i<18000;i++){const x=random()*SIZE,y=random()*SIZE;ctx.globalAlpha=.045+random()*.06;ctx.strokeStyle=i%3?'#ede1b9':'#5a6046';ctx.lineWidth=.5+random()*1.6;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+3,y-2,x+5+random()*22,y+(random()-.5)*5);ctx.stroke();}
 ctx.globalAlpha=1;
 // Hand-drawn ridge marks follow measured high ground; these are map symbols, not new mountains.
 const stamps:{x:number;z:number}[]=[];
 for(let z=-230;z<230;z+=2.7)for(let x=-260;x<260;x+=3.2){
  const sx=x+(random()-.5)*3,sz=z+(random()-.5)*2,h=terrain.measured(sx,sz);
  if(h<.34||random()>.69||terrain.river(sx,sz)<2||terrain.cities.some(c=>Math.hypot(sx-c.x,sz-c.z)<5))continue;
  const slope=Math.abs(terrain.measured(sx+1,sz)-terrain.measured(sx-1,sz))+Math.abs(terrain.measured(sx,sz+1)-terrain.measured(sx,sz-1));
  if(slope<.08&&h<1.1)continue;
  const w=(1.3+random()*1.5)*SCALE,height=(1.0+Math.min(3,h)*.8)*SCALE,cx=px(sx),cy=px(sz);
  ctx.strokeStyle='#3c513a';ctx.fillStyle='#526548';ctx.globalAlpha=.63;ctx.lineWidth=.23*SCALE;
  ctx.beginPath();ctx.moveTo(cx-w*1.5,cy+height*.45);ctx.lineTo(cx-w*.78,cy-height*.18);ctx.lineTo(cx-w*.44,cy+height*.12);ctx.moveTo(cx+w*.37,cy-height*.13);ctx.lineTo(cx+w*.69,cy-height*.39);ctx.lineTo(cx+w*1.4,cy+height*.36);ctx.stroke();
  ctx.beginPath();ctx.moveTo(cx-w,cy+height*.42);ctx.bezierCurveTo(cx-w*.62,cy+height*.12,cx-w*.30,cy-height*.60,cx,cy-height);ctx.bezierCurveTo(cx+w*.28,cy-height*.38,cx+w*.5,cy-height*.1,cx+w,cy+height*.34);ctx.stroke();
  ctx.globalAlpha=.34;ctx.lineTo(cx+w*.10,cy+height*.14);ctx.lineTo(cx,cy-height);ctx.fill();
  ctx.globalAlpha=.52;ctx.lineWidth=.16*SCALE;
  for(let j=0;j<5;j++){ctx.beginPath();ctx.moveTo(cx+(j*.10-.15)*w,cy-height*(.86-j*.12));ctx.lineTo(cx+(.18+j*.15)*w,cy+height*(.14+j*.08));ctx.stroke();}
  stamps.push({x:sx,z:sz});
 }
 // Sparse woodland wash remains secondary to the ridge strokes and labels.
 for(let z=-150;z<150;z+=4)for(let x=-180;x<180;x+=4){const h=terrain.measured(x,z);if(h>.9||forestCover(x,z,h)<.57||terrain.river(x,z)<3||random()>.42)continue;ctx.globalAlpha=.15;ctx.fillStyle='#53694e';ctx.beginPath();ctx.ellipse(px(x),px(z),2.2*SCALE,.65*SCALE,0,0,Math.PI*2);ctx.fill();}
 // Cyan water and pale banks match the reference's printed waterway, using actual channel profiles.
 for(const line of terrain.channel.profiles){ctx.beginPath();line.forEach((p,i)=>{const x=px(p.x-p.nx*p.left),z=px(p.z-p.nz*p.left);if(i===0)ctx.moveTo(x,z);else ctx.lineTo(x,z);});for(let i=line.length-1;i>=0;i--){const p=line[i];ctx.lineTo(px(p.x+p.nx*p.right),px(p.z+p.nz*p.right));}ctx.closePath();ctx.globalAlpha=.92;ctx.strokeStyle='#e1ece0';ctx.lineWidth=.50*SCALE;ctx.stroke();ctx.fillStyle='#29c2e5';ctx.fill();
  ctx.globalAlpha=.38;ctx.strokeStyle='#d2f0e5';ctx.lineWidth=.14*SCALE;ctx.beginPath();line.forEach((p,i)=>{const x=px(p.x+p.nx*p.right*.67),z=px(p.z+p.nz*p.right*.67);if(i===0)ctx.moveTo(x,z);else ctx.lineTo(x,z);});ctx.stroke();}
 // Administrative names reuse existing feature identities. Position in an open part of each group.
 const districts=new Map<string,{name:string;points:{x:number;z:number}[]}>();
 for(const feature of territories.features){const id=String(feature.properties?.id),town=terrain.cities.find(c=>c.id===id);if(!town)continue;const group=String(feature.properties?.group),entry=districts.get(group)??{name:String(feature.properties?.prefecture),points:[]};entry.points.push(town);districts.set(group,entry);}
 ctx.font=`${3.7*SCALE}px SampleSong, 'Songti SC', serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#4a6850';ctx.globalAlpha=.46;
 for(const district of districts.values()){if(district.points.length<2)continue;const x=district.points.reduce((n,p)=>n+p.x,0)/district.points.length,z=district.points.reduce((n,p)=>n+p.z,0)/district.points.length;
  const candidates=[{x:x-7,z:z+5},{x:x+8,z:z+6},{x:x-5,z:z-8},{x:x+9,z:z-9}];candidates.sort((a,b)=>Math.min(...terrain.cities.map(c=>Math.hypot(b.x-c.x,b.z-c.z)))-Math.min(...terrain.cities.map(c=>Math.hypot(a.x-c.x,a.z-c.z))));const p=candidates[0];ctx.fillText(district.name,px(p.x),px(p.z));}
 // Small roof-and-wall seals replace the white 3D city blocks in atlas mode.
 ctx.globalAlpha=.70;ctx.strokeStyle='#4f6250';ctx.fillStyle='#4f6250';ctx.lineWidth=.18*SCALE;
 for(const town of terrain.cities){const x=px(town.x),y=px(town.z),s=(town.id==='jiankang'?1.4:1)*SCALE;
  for(const offset of [-1,0,1]){const cx=x+offset*s*.8,cy=y+(offset===0?-.5:.05)*s;ctx.beginPath();ctx.moveTo(cx-s*.6,cy);ctx.lineTo(cx,cy-s*.5);ctx.lineTo(cx+s*.6,cy);ctx.closePath();ctx.fill();ctx.strokeRect(cx-s*.36,cy+s*.10,s*.72,s*.48);}ctx.beginPath();ctx.moveTo(x-s*1.6,y+s*.9);ctx.lineTo(x+s*1.6,y+s*.9);ctx.stroke();}
 ctx.globalAlpha=1;
 const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;texture.anisotropy=4;
 const material=new MeshBasicMaterial({map:texture,transparent:true,opacity:0,depthTest:false,depthWrite:false,toneMapped:false});
 const plane=new Mesh(new PlaneGeometry(SPAN,SPAN),material);plane.rotation.x=-Math.PI/2;plane.position.y=.06;plane.renderOrder=8;plane.frustumCulled=false;
 const root=new Group();root.add(plane);root.visible=false;
 return {root,stampCount:stamps.length,update(blend:number){root.visible=blend>.001;material.opacity=blend;}};
}
