import {BufferGeometry,CatmullRomCurve3,Float32BufferAttribute,Mesh,MeshStandardMaterial,Vector3,Group,DoubleSide,type Texture} from 'three';
import {siteById,sites} from '../../data/scenario';
import {mapResource} from '../resourceLoader';
import {decodeElevation,elevationTiles,type ElevationManifest} from '../three/elevationTiles';
import {gridHeight,mercator,projectGround,unprojectGround,WORLD_KM} from '../three/geography';
import {EXTENT,smooth,type Point,type SampleSeason} from './layout';
import {riverShape} from './riverShape';
import {groundMaterial} from './groundMaterial';
import {groundColors} from './groundColors';
import {RELIEF_SCALE,softenRelief} from './relief';
import {artWaterMaterial} from './waterMaterial';

export async function createTerrain(report:(message:string)=>void,atlas?:Texture){
 const origin=projectGround(siteById.jiankang.lon,siteById.jiankang.lat);
 const toLocal=(lon:number,lat:number)=>{const p=projectGround(lon,lat);return {x:p.x-origin.x,z:p.z-origin.z};};
 const manifest:ElevationManifest=await mapResource('art/campaign/elevation/manifest.json').then(r=>r.json());
 const tiles=elevationTiles(manifest,(x,y)=>mapResource(`art/campaign/elevation/${x}-${y}.bin.gz`).then(decodeElevation));
 const [dem,riverData,detailManifest]=await Promise.all([tiles.load(siteById.jiankang.lon,siteById.jiankang.lat,n=>report(`正在读取区域高程 · ${n} / 9`)),mapResource('art/campaign/river-corridors.geojson').then(r=>r.json()),mapResource('art/campaign/art-sample/jiankang-dem/manifest.json').then(r=>r.json()) as Promise<ElevationManifest>]);
 const detailTiles=elevationTiles(detailManifest,(x,y)=>mapResource(`art/campaign/art-sample/jiankang-dem/${x}-${y}.bin.gz`).then(decodeElevation));
 const detail=await detailTiles.load(siteById.jiankang.lon,siteById.jiankang.lat,n=>report(`正在读取建康精细高程 · ${n} / 9`));detailTiles.clear();
 tiles.clear();
 const detailRelief=softenRelief(detail.values,detail.meta.columns,detail.meta.rows);
 const measured=(x:number,z:number)=>{const ll=unprojectGround(x+origin.x,z+origin.z),p=mercator(ll.lng,ll.lat),h=gridHeight(dem.values,dem.meta,p.x,p.y);if(h===null)throw new Error('样板区域缺少真实高程');
  const fine=gridHeight(detailRelief,detail.meta,p.x,p.y),edge=Math.min(p.x-detail.meta.west,detail.meta.west+detail.meta.width-p.x,p.y-detail.meta.north,detail.meta.north+detail.meta.height-p.y),blend=fine===null?0:smooth(0,detail.meta.width*.12,edge);
  // Preserve measured ridgelines; exaggeration is a single presentation scale, not added mountains.
  return Math.max(0,h*(1-blend)+(fine??h)*blend)*RELIEF_SCALE;
 };
 const citySites=sites.map(site=>({...site,...toLocal(site.lon,site.lat)})).filter(s=>Math.abs(s.x)<EXTENT.width*.43&&Math.abs(s.z)<EXTENT.depth*.43).sort((a,b)=>Number(b.id==='jiankang')-Number(a.id==='jiankang')||Number(!!b.capital)-Number(!!a.capital));
 const towns:typeof citySites=[];
 for(const site of citySites)if(!towns.some(t=>Math.hypot(t.x-site.x,t.z-site.z)<15))towns.push(site);
 const cities=towns.slice(0,8).map(s=>({...s,height:measured(s.x,s.z),scale:s.id==='jiankang'?1:.54}));
 const lines:Point[][]=[];
 for(const feature of riverData.features){
  if(feature.geometry.type!=='LineString')continue;
  const points=(feature.geometry.coordinates as number[][]).map(([lon,lat])=>toLocal(lon,lat));
  // Split at the crop; never connect disjoint sections across the sample.
  let section:Point[]=[];
  const flush=()=>{if(section.length>1){const curve=new CatmullRomCurve3(section.map(p=>new Vector3(p.x,0,p.z)),false,'centripetal');lines.push(curve.getPoints(Math.max(8,Math.ceil(curve.getLength()/.8))).map(p=>({x:p.x,z:p.z})));}section=[];};
  for(const p of points){if(Math.abs(p.x)<250&&Math.abs(p.z)<215)section.push(p);else flush();}flush();
 }
 if(!lines.length)throw new Error('样板河道数据为空');
 const channel=riverShape(lines,measured);
 const river=(x:number,z:number)=>channel.sample(x,z)?.distance??Infinity;
 function height(x:number,z:number){
  let h=measured(x,z);
  for(const c of cities){const r=Math.max(Math.abs(x-c.x)/5.2,Math.abs(z-c.z)/4.2)/c.scale;if(r<1.8)h=c.height+(h-c.height)*smooth(1,1.8,r);}
  return channel.carve(h,channel.sample(x,z));
 }
 // A coarse real-elevation surround prevents a cut-off diorama edge in the far camera.
 const axis=(half:number,outer:number)=>[...Array.from({length:32},(_,i)=>-outer+(outer-half)*i/32),...Array.from({length:(half-28)*2},(_,i)=>-half+i*.5),...Array.from({length:449},(_,i)=>-28+i*.125),...Array.from({length:(half-28)*2},(_,i)=>28+(i+1)*.5),...Array.from({length:32},(_,i)=>half+(outer-half)*(i+1)/32)];
 const center=mercator(siteById.jiankang.lon,siteById.jiankang.lat);
 const outerX=Math.min(420,Math.min(center.x-dem.meta.west,dem.meta.west+dem.meta.width-center.x)*WORLD_KM-4),outerZ=Math.min(420,Math.min(center.y-dem.meta.north,dem.meta.north+dem.meta.height-center.y)*WORLD_KM-4);
 const xs=axis(EXTENT.width/2,outerX),zs=axis(EXTENT.depth/2,outerZ);
 const root=new Group(),geometry=new BufferGeometry(),positions:number[]=[],indices:number[]=[],colors:number[]=[],width=xs.length-1,depth=zs.length-1;
 for(let j=0;j<=depth;j++)for(let i=0;i<=width;i++){const x=xs[i],z=zs[j];positions.push(x,height(x,z),z);colors.push(1,1,1);if(i<width&&j<depth){const a=j*(width+1)+i;indices.push(a,a+width+1,a+1,a+1,a+width+1,a+width+2);}}
 geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setAttribute('color',new Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 const {soil,paperBlend}=groundMaterial(atlas);
 const ground=new Mesh(geometry,soil);ground.receiveShadow=true;ground.castShadow=true;root.add(ground);
 function colorize(season:SampleSeason){groundColors(geometry,season,channel,cities);}
 colorize('summer');
 const {water,time}=artWaterMaterial();
 function ribbon(points:Point[],width:number,material:MeshStandardMaterial,level?:(x:number,z:number)=>number){
  const pos:number[]=[],uv:number[]=[],idx:number[]=[];let distance=0;
  for(let i=0;i<points.length;i++){const p=points[i],a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],length=Math.hypot(b.x-a.x,b.z-a.z)||1;if(i)distance+=Math.hypot(p.x-a.x,p.z-a.z);
   for(const side of [-1,1]){const x=p.x-(b.z-a.z)/length*width*.5*side,z=p.z+(b.x-a.x)/length*width*.5*side;pos.push(x,level?level(x,z):height(x,z)+.035,z);uv.push((side+1)/2,distance);}
   if(i){const n=i*2;idx.push(n-2,n,n-1,n-1,n,n+1);}}
  const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(pos,3));g.setAttribute('uv',new Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const m=new Mesh(g,material);m.receiveShadow=true;root.add(m);return m;
 }
 // Nine vertices across the river preserve shallows at bends; banks are the actual terrain, not floating strips.
 for(const line of channel.profiles){
  const pos:number[]=[],uv:number[]=[],idx:number[]=[],across=8;
  for(let i=0;i<line.length;i++){const p=line[i];for(let j=0;j<=across;j++){const v=j/across*2-1,width=v<0?p.left:p.right;pos.push(p.x+p.nx*width*v,p.level+.008,p.z+p.nz*width*v);uv.push(j/across,p.distance);if(i&&j){const a=i*(across+1)+j;idx.push(a-across-2,a-1,a-across-1,a-across-1,a-1,a);}}}
  const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(pos,3));g.setAttribute('uv',new Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const surface=new Mesh(g,water);surface.name='Variable-width river and shallows';surface.receiveShadow=true;surface.renderOrder=2;root.add(surface);
 }
 const roadMaterial=new MeshStandardMaterial({color:'#b6a16e',roughness:1,side:DoubleSide});
 function path(points:Point[],width=.30){const curve=new CatmullRomCurve3(points.map(p=>new Vector3(p.x,0,p.z)),false,'centripetal');const samples=curve.getPoints(Math.max(8,Math.ceil(curve.getLength()/.3))).map(p=>({x:p.x,z:p.z}));ribbon(samples,width,roadMaterial);return curve;}
 // Art paths stay outside the city core and use the same ground function as the figures.
 const walkPath=path([{x:-4,z:5.8},{x:0,z:6.6},{x:5,z:9},{x:9,z:15},{x:14,z:21}],.48);
 path([{x:0,z:4.1},{x:0,z:6.6},{x:-6,z:8},{x:-10,z:13},{x:-15,z:20}],.48);
 path([{x:4.8,z:0},{x:10,z:1},{x:19,z:6},{x:28,z:11},{x:43,z:10}],.38);
 return {root,atlas,cities,lines,height,measured,river,channel,water,time,paperBlend,colorize,walkPath,ribbon,path};
}
export type SampleTerrain=Awaited<ReturnType<typeof createTerrain>>;
