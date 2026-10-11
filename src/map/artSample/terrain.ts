import {BufferGeometry,CatmullRomCurve3,Color,Float32BufferAttribute,Mesh,MeshStandardMaterial,Vector3,Group,DoubleSide} from 'three';
import {siteById,sites} from '../../data/scenario';
import {mapResource} from '../resourceLoader';
import {decodeElevation,elevationTiles,type ElevationManifest} from '../three/elevationTiles';
import {gridHeight,mercator,projectGround,unprojectGround} from '../three/geography';
import {EXTENT,clamp,smooth,noise,forestCover,riverDistance,cityClearance,palettes,type Point,type SampleSeason} from './layout';

export async function createTerrain(report:(message:string)=>void){
 const origin=projectGround(siteById.jiankang.lon,siteById.jiankang.lat);
 const toLocal=(lon:number,lat:number)=>{const p=projectGround(lon,lat);return {x:p.x-origin.x,z:p.z-origin.z};};
 const manifest:ElevationManifest=await mapResource('art/campaign/elevation/manifest.json').then(r=>r.json());
 const tiles=elevationTiles(manifest,(x,y)=>mapResource(`art/campaign/elevation/${x}-${y}.bin.gz`).then(decodeElevation));
 const [dem,riverData]=await Promise.all([tiles.load(siteById.jiankang.lon,siteById.jiankang.lat,n=>report(`正在读取真实高程 · ${n} / 9`)),mapResource('art/campaign/river-corridors.geojson').then(r=>r.json())]);
 tiles.clear();
 const measured=(x:number,z:number)=>{const ll=unprojectGround(x+origin.x,z+origin.z),p=mercator(ll.lng,ll.lat),h=gridHeight(dem.values,dem.meta,p.x,p.y);if(h===null)throw new Error('样板区域缺少真实高程');return Math.max(0,h)*.025;};
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
 // Spatial buckets keep dense terrain and vegetation sampling bounded.
 const segments=new Map<string,Point[][]>();
 for(const line of lines)for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i];for(let ix=Math.floor((Math.min(a.x,b.x)-6)/8);ix<=Math.floor((Math.max(a.x,b.x)+6)/8);ix++)for(let iz=Math.floor((Math.min(a.z,b.z)-6)/8);iz<=Math.floor((Math.max(a.z,b.z)+6)/8);iz++){const key=ix+','+iz,list=segments.get(key)??[];list.push([a,b]);segments.set(key,list);}}
 const river=(x:number,z:number)=>riverDistance(x,z,segments.get(Math.floor(x/8)+','+Math.floor(z/8))??[]);
 const waterLevel=.40;
 function height(x:number,z:number){
  let h=measured(x,z);
  for(const c of cities){const r=Math.max(Math.abs(x-c.x)/5.2,Math.abs(z-c.z)/4.2)/c.scale;if(r<1.8)h=c.height+(h-c.height)*smooth(1,1.8,r);}
  const d=river(x,z);if(d<4)h=Math.min(h,(waterLevel-.30)+(h-waterLevel+.30)*smooth(.85,4,d));
  return h;
 }
 // A coarse real-elevation surround prevents a cut-off diorama edge in the far camera.
 const axis=(half:number,outer:number)=>[...Array.from({length:32},(_,i)=>-outer+(outer-half)*i/32),...Array.from({length:half*4+1},(_,i)=>-half+i*.5),...Array.from({length:32},(_,i)=>half+(outer-half)*(i+1)/32)];
 const xs=axis(EXTENT.width/2,250),zs=axis(EXTENT.depth/2,215);
 const root=new Group(),geometry=new BufferGeometry(),positions:number[]=[],indices:number[]=[],colors:number[]=[],width=xs.length-1,depth=zs.length-1;
 for(let j=0;j<=depth;j++)for(let i=0;i<=width;i++){const x=xs[i],z=zs[j];positions.push(x,height(x,z),z);colors.push(1,1,1);if(i<width&&j<depth){const a=j*(width+1)+i;indices.push(a,a+width+1,a+1,a+1,a+width+1,a+width+2);}}
 geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setAttribute('color',new Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 const paperBlend={value:0},soil=new MeshStandardMaterial({vertexColors:true,roughness:.98});
 soil.onBeforeCompile=shader=>{
  shader.uniforms.paperBlend=paperBlend;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 soilPoint;').replace('#include <begin_vertex>','#include <begin_vertex>\nsoilPoint=position;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying vec3 soilPoint;uniform float paperBlend;
   float grain(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  `).replace('#include <color_fragment>',`#include <color_fragment>
   vec2 p=soilPoint.xz;float detail=1.-smoothstep(.08,.55,length(fwidth(p)));
   float weather=sin(p.x*.83+sin(p.y*.71))*sin(p.y*1.32+p.x*.24);
   diffuseColor.rgb*=1.+weather*.055+(grain(floor(p*24.))-.5)*.15*detail;
   vec3 paperColor=mix(vec3(.57,.52,.37),vec3(.25,.31,.23),clamp(soilPoint.y/32.,0.,.65));
   diffuseColor.rgb=mix(diffuseColor.rgb,paperColor,paperBlend*.86);
  `);
 };
 const ground=new Mesh(geometry,soil);ground.receiveShadow=true;ground.castShadow=true;root.add(ground);
 function colorize(season:SampleSeason,paper=0){
  const p=palettes[season],base=new Color(p.ground),grass=new Color(p.grass),wood=new Color(p.forest),rock=new Color(p.rock),vellum=new Color('#c6bd9c'),ink=new Color('#687363');
  const position=geometry.getAttribute('position'),normal=geometry.getAttribute('normal'),color=geometry.getAttribute('color');
  for(let i=0;i<position.count;i++){const x=position.getX(i),z=position.getZ(i),h=position.getY(i),cover=forestCover(x,z,h)*smooth(7,13,cityClearance(x,z,cities));
   const c=base.clone().lerp(grass,noise(x*.21,z*.21)*.7).lerp(wood,cover*.8).lerp(rock,smooth(.10,.45,1-normal.getY(i))*.84);
   c.multiplyScalar(.88+noise(x*.065,z*.065)*.22);if(paper)c.lerp(vellum.clone().lerp(ink,clamp(h/26)*.48+cover*.13),paper);
   color.setXYZ(i,c.r,c.g,c.b);
  }color.needsUpdate=true;
 }
 colorize('autumn');
 const time={value:0},water=new MeshStandardMaterial({color:palettes.autumn.water,roughness:.23,metalness:.18,side:DoubleSide});
 water.onBeforeCompile=shader=>{
  shader.uniforms.flowTime=time;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 streamUV;').replace('#include <begin_vertex>','#include <begin_vertex>\nstreamUV=uv;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 streamUV;uniform float flowTime;').replace('#include <color_fragment>',`#include <color_fragment>
   float edge=smoothstep(.58,1.,abs(streamUV.x*2.-1.));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.25,.36,.29),edge*.7);
  `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   float phase=streamUV.y*17.-flowTime*.6+sin(streamUV.x*15.);float detail=1.-smoothstep(.7,3.,fwidth(phase));
   normal=normalize(normal+vec3(sin(phase)*.06,cos(phase*.73)*.025,0.)*detail);
  `).replace('#include <opaque_fragment>',`float fresnel=pow(1.-max(0.,dot(normal,normalize(vViewPosition))),3.);outgoingLight=mix(outgoingLight,vec3(.51,.61,.61),fresnel*.4);\n#include <opaque_fragment>`);
 };
 const bank=new MeshStandardMaterial({color:'#a3976c',roughness:1,side:DoubleSide});
 function ribbon(points:Point[],width:number,material:MeshStandardMaterial,level?:(x:number,z:number)=>number){
  const pos:number[]=[],uv:number[]=[],idx:number[]=[];let distance=0;
  for(let i=0;i<points.length;i++){const p=points[i],a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],length=Math.hypot(b.x-a.x,b.z-a.z)||1;if(i)distance+=Math.hypot(p.x-a.x,p.z-a.z);
   for(const side of [-1,1]){const x=p.x-(b.z-a.z)/length*width*.5*side,z=p.z+(b.x-a.x)/length*width*.5*side;pos.push(x,level?level(x,z):height(x,z)+.035,z);uv.push((side+1)/2,distance);}
   if(i){const n=i*2;idx.push(n-2,n,n-1,n-1,n,n+1);}}
  const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(pos,3));g.setAttribute('uv',new Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const m=new Mesh(g,material);m.receiveShadow=true;root.add(m);return m;
 }
 for(const line of lines){ribbon(line,2.50,bank,()=>waterLevel-.05);ribbon(line,1.8,water,()=>waterLevel);}
 const roadMaterial=new MeshStandardMaterial({color:'#b6a16e',roughness:1,side:DoubleSide});
 function path(points:Point[],width=.30){const curve=new CatmullRomCurve3(points.map(p=>new Vector3(p.x,0,p.z)),false,'centripetal');const samples=curve.getPoints(Math.max(8,Math.ceil(curve.getLength()/.3))).map(p=>({x:p.x,z:p.z}));ribbon(samples,width,roadMaterial);return curve;}
 // Art paths stay outside the city core and use the same ground function as the figures.
 const walkPath=path([{x:-4,z:5.8},{x:0,z:6.6},{x:5,z:9},{x:9,z:15},{x:14,z:21}],.48);
 path([{x:0,z:4.1},{x:0,z:6.6},{x:-6,z:8},{x:-10,z:13},{x:-15,z:20}],.48);
 path([{x:4.8,z:0},{x:10,z:1},{x:19,z:6},{x:28,z:11},{x:43,z:10}],.38);
 return {root,cities,lines,height,measured,river,water,bank,time,paperBlend,colorize,walkPath,ribbon,path};
}
export type SampleTerrain=Awaited<ReturnType<typeof createTerrain>>;
