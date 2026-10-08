import {parchmentTexture} from './parchment';
import {segmentDistance} from '../sample/geography';
import {sites} from '../../data/scenario';
import {campaignFarmAtlas} from '../sample/farmAtlas';
import {coverageTexture} from './overlays';
import {BufferGeometry,Float32BufferAttribute,Mesh,Group,Vector3,type Material} from 'three';
import type {FeatureCollection} from 'geojson';
import {terrainMaterial,waterMaterial} from '../sample/materials';
import type {SeasonState} from '../sample/seasons';
import {WORLD_KM,ORIGIN,mercator,geographic,gridHeight,campaignHeight,projectGround,type DEMGrid} from './geography';

async function local(path:string){const r=await fetch(import.meta.env.BASE_URL+path,{signal:AbortSignal.timeout(25000)});if(!r.ok)throw new Error(`地图资源 ${path}：${r.status}`);return r;}
export async function countrySurface(season:SeasonState){
 const [meta,buffer,land,rivers]=await Promise.all([local('art/campaign/national-terrain.json').then(r=>r.json()) as Promise<DEMGrid>,local('art/campaign/national-elevation.bin').then(r=>r.arrayBuffer()),local('data/land.geojson').then(r=>r.json()) as Promise<FeatureCollection>,local('data/rivers.geojson').then(r=>r.json()) as Promise<FeatureCollection>]);
 const values=new Float32Array(buffer);if(values.length!==meta.columns*meta.rows)throw new Error('全国高程数据不完整');
 const parchment=parchmentTexture(values,meta,land,rivers);
 const root=new Group(),meshes:Mesh[]=[],water=waterMaterial(),riverGroup=new Group();let surface=terrainMaterial(undefined,season,{fade:false});root.add(riverGroup);
 const strategic={value:0},landMask=coverageTexture(land,2048);let farms:ReturnType<typeof campaignFarmAtlas>|undefined,farmKey="";
 function bindLand(){const compile=surface.onBeforeCompile;
 surface.onBeforeCompile=(shader,renderer)=>{compile(shader,renderer);shader.uniforms.landMask={value:landMask};shader.uniforms.strategic=strategic;shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float campaignElevation;').replace('terrainPosition=position;','terrainPosition=position;terrainPosition.y=campaignElevation;');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D landMask; uniform float strategic;').replace('diffuseColor.rgb*=land*',`land=mix(land,vec3(.68,.65,.53)*(1.-stone*.24)+(n-.5)*.035,strategic);float isLand=texture2D(landMask,vec2(terrainPosition.x/${WORLD_KM}+${ORIGIN.x},terrainPosition.z/${WORLD_KM}+${ORIGIN.y})).r;land=mix(mix(vec3(.055,.135,.14),vec3(.39,.43,.39),strategic),land,isLand);\n diffuseColor.rgb*=land*`);};}
 bindLand();
 let detail:{meta:DEMGrid;values:Float32Array}|undefined,flat=false,closed=false;
 const sampledHeight=(lon:number,lat:number,original=false)=>{const p=mercator(lon,lat);let raw=gridHeight(values,meta,p.x,p.y);if(raw===null)return null;if(detail){const fine=gridHeight(detail.values,detail.meta,p.x,p.y);if(fine!==null){const d=detail.meta,edge=Math.min((p.x-d.west)/d.width,(d.west+d.width-p.x)/d.width,(p.y-d.north)/d.height,(d.north+d.height-p.y)/d.height);raw=raw+(fine-raw)*Math.min(1,Math.max(0,edge*24));}}return flat&&!original?0:campaignHeight(raw,lat);};
 const cityCells=new Map<string,{lon:number;lat:number;x:number;z:number;radius:number}[]>();
 for(const site of sites){const p=projectGround(site.lon,site.lat),cell=Math.floor(p.x/20)+':'+Math.floor(p.z/20),items=cityCells.get(cell)??[];items.push({lon:site.lon,lat:site.lat,...p,radius:(site.capital?5:site.rank==='county'?1.7:3.3)/Math.cos(site.lat*Math.PI/180)});cityCells.set(cell,items);}
 // The same display-only city-footprint leveling as the accepted sample.
 const landHeight=(lon:number,lat:number,original=false)=>{let h=sampledHeight(lon,lat,original);if(h===null||flat&&!original)return h;const p=projectGround(lon,lat),cx=Math.floor(p.x/20),cz=Math.floor(p.z/20);
  for(let x=cx-1;x<=cx+1;x++)for(let z=cz-1;z<=cz+1;z++)for(const c of cityCells.get(x+':'+z)??[]){const d=Math.max(Math.abs(p.x-c.x),Math.abs(p.z-c.z))/c.radius;if(d>=1.5)continue;const center=sampledHeight(c.lon,c.lat,true);if(center===null)continue;const t=Math.min(1,Math.max(0,(d-1)/.5)),blend=t*t*(3-2*t);h=center+(h-center)*blend;}return h;
 };
 type RiverSegment={a:Vector3;b:Vector3};
 const riverCells=new Map<string,RiverSegment[]>();let riverPaths:Vector3[][]=[];
 const nearSegments=(x:number,z:number)=>riverCells.get(Math.floor(x/8)+':'+Math.floor(z/8))??[];
 const height=(lon:number,lat:number,original=false)=>{let h=landHeight(lon,lat,original);if(h===null||flat&&!original)return h;const p=projectGround(lon,lat);for(const seg of nearSegments(p.x,p.z)){const distance=segmentDistance(p.x,p.z,seg.a,seg.b);if(distance>1.1)continue;const dx=seg.b.x-seg.a.x,dz=seg.b.z-seg.a.z,t=Math.max(0,Math.min(1,((p.x-seg.a.x)*dx+(p.z-seg.a.z)*dz)/(dx*dx+dz*dz||1))),water=seg.a.y+(seg.b.y-seg.a.y)*t;h=Math.min(h,water-.12*Math.max(0,1-distance/1.1));}return h;};
 function prepareRivers(){riverCells.clear();riverPaths=[];for(const f of rivers.features){const g=f.geometry;if(g.type!=='LineString'&&g.type!=='MultiLineString')continue;for(const path of g.type==='LineString'?[g.coordinates]:g.coordinates){const points:Vector3[]=[];
  for(let i=1;i<path.length;i++){const a=projectGround(path[i-1][0],path[i-1][1]),b=projectGround(path[i][0],path[i][1]),dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz)||1,steps=Math.max(1,Math.ceil(length/1.5));for(let j=0;j<steps;j++){const x=a.x+dx*j/steps,z=a.z+dz*j/steps;let best:Vector3|undefined;for(let k=-4;k<=4;k++){const xx=x-dz/length*k*.3,zz=z+dx/length*k*.3,ll=geographic(xx/WORLD_KM+ORIGIN.x,zz/WORLD_KM+ORIGIN.y),h=landHeight(ll.lng,ll.lat,true);if(h!==null&&(!best||h<best.y))best=new Vector3(xx,h,zz);}if(best)points.push(best);}}
  if(points.length<2)continue;riverPaths.push(points);for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],segment={a,b};for(let x=Math.floor((Math.min(a.x,b.x)-1.1)/8);x<=Math.floor((Math.max(a.x,b.x)+1.1)/8);x++)for(let z=Math.floor((Math.min(a.z,b.z)-1.1)/8);z<=Math.floor((Math.max(a.z,b.z)+1.1)/8);z++){const key=x+':'+z,cell=riverCells.get(key)??[];cell.push(segment);riverCells.set(key,cell);}}
 }}}
 function geometry(m:DEMGrid,step:number,cut?:DEMGrid){
  const columns=Math.ceil(m.columns/step),rows=Math.ceil(m.rows/step),vertices:number[]=[],elevations:number[]=[],indices:number[]=[];
  for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){const x=m.west+i/columns*m.width,y=m.north+j/rows*m.height,ll=geographic(x,y);const h=height(ll.lng,ll.lat,true)??0;vertices.push((x-ORIGIN.x)*WORLD_KM,h,(y-ORIGIN.y)*WORLD_KM);elevations.push(h);}
  for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){const x=m.west+(i+.5)/columns*m.width,y=m.north+(j+.5)/rows*m.height;if(cut&&x>cut.west&&x<cut.west+cut.width&&y>cut.north&&y<cut.north+cut.height)continue;const a=j*(columns+1)+i;indices.push(a,a+columns+1,a+1,a+1,a+columns+1,a+columns+2);}
  const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(vertices,3));g.setIndex(indices);g.setAttribute('campaignElevation',new Float32BufferAttribute(elevations,1));g.computeVertexNormals();if(flat){const p=g.getAttribute('position');for(let i=0;i<p.count;i++)p.setY(i,0);}g.computeBoundingSphere();return g;
 }
 function rebuild(){farmKey="";prepareRivers();for(const mesh of meshes){root.remove(mesh);mesh.geometry.dispose();}meshes.length=0;for(const [m,step,cut] of [[meta,4,detail?.meta],...(detail?[[detail.meta,2,undefined]]:[])] as [DEMGrid,number,DEMGrid|undefined][]){const mesh=new Mesh(geometry(m,step,cut),surface);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);meshes.push(mesh);}rebuildRivers();}
 function rebuildRivers(){for(const o of [...riverGroup.children]){riverGroup.remove(o);(o as Mesh).geometry.dispose();}
  for(const source of riverPaths){const points=source.map(p=>new Vector3(p.x,flat?.1:p.y+.085,p.z));
   if(points.length<2)continue;const pos:number[]=[],uv:number[]=[],indices:number[]=[];
   for(let i=0;i<points.length;i++){const p=points[i],a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],d=new Vector3().subVectors(b,a).setY(0).normalize();for(const sign of [-1,1]){pos.push(p.x-d.z*.48*sign,p.y,p.z+d.x*.48*sign);uv.push(sign===-1?0:1,i*.2);}if(i){const n=i*2;indices.push(n-2,n,n-1,n-1,n,n+1);}}
   const geo=new BufferGeometry();geo.setAttribute('position',new Float32BufferAttribute(pos,3));geo.setAttribute('uv',new Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();riverGroup.add(new Mesh(geo,water));
  }
 }
 rebuild();
 let detailKey='',pendingKey='';
 async function refine(lon:number,lat:number){const p=mercator(lon,lat),tx=Math.floor(p.x*256)-1,ty=Math.floor(p.y*256)-1,key=tx+':'+ty;if(key===detailKey||key===pendingKey)return false;pendingKey=key;
  try{const tiles=await Promise.all(Array.from({length:9},async(_,i)=>{const x=tx+i%3,y=ty+Math.floor(i/3),response=await fetch(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/8/${x}/${y}.png`,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error('局部高程瓦片 '+response.status);const image=await createImageBitmap(await response.blob(),{colorSpaceConversion:'none'});const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(image,0,0);image.close();return ctx.getImageData(0,0,256,256).data;}));if(closed||pendingKey!==key)return false;
   const fine=new Float32Array(768*768);tiles.forEach((pixels,i)=>{for(let y=0;y<256;y++)for(let x=0;x<256;x++){const k=(y*256+x)*4;fine[(Math.floor(i/3)*256+y)*768+i%3*256+x]=pixels[k]*256+pixels[k+1]+pixels[k+2]/256-32768;}});
   detail={meta:{columns:768,rows:768,west:tx/256,north:ty/256,width:3/256,height:3/256},values:fine};detailKey=key;rebuild();return true;
  }finally{if(pendingKey===key)pendingKey='';}
 }
 return {root,meshes,land,rivers,parchment,height,refine,water,isRiver(lon:number,lat:number){const p=projectGround(lon,lat);return nearSegments(p.x,p.z).some(s=>segmentDistance(p.x,p.z,s.a,s.b)<.65);},setFarms(centers:{x:number;z:number}[]){const key=centers.map(c=>c.x+':'+c.z).join('|');if(key===farmKey)return;farmKey=key;farms?.dispose();farms=campaignFarmAtlas(centers,(x,z)=>{const ll=geographic(x/WORLD_KM+ORIGIN.x,z/WORLD_KM+ORIGIN.y);return height(ll.lng,ll.lat,true);});surface.dispose();surface=terrainMaterial({map:farms,centers,columns:6,rows:6},season,{fade:false});bindLand();for(const mesh of meshes)mesh.material=surface;},setFlat(value:boolean){if(flat===value)return;flat=value;strategic.value=value?1:0;rebuild();},dispose(){closed=true;parchment.dispose();landMask.dispose();farms?.dispose();root.traverse(o=>{if(o instanceof Mesh)o.geometry.dispose();});for(const material of [surface,water])material.dispose();},fogMaterialMeshes(material:Material){return meshes.map(m=>new Mesh(m.geometry,material));}};
}
