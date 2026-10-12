import {riverShape} from '../artSample/riverShape';
import {softenRelief} from '../artSample/relief';
import {artWaterMaterial} from '../artSample/waterMaterial';
import {yubiTerrain,yubiCityCenter,usesYubiTerrain,jiankangTerrain,usesJiankangTerrain,localTerrainMesh} from './localTerrain';
import {riverSafeCity} from './landscapePaths';
import {coarseSurfaceHeight,surfaceFootprintHeight} from './terrainSeam';
import {elevationTiles,decodeElevation,type ElevationManifest} from './elevationTiles';
import {parchmentTexture,strategicReliefTexture} from './parchment';
import {segmentDistance} from '../sample/geography';
import {campaignCityRadius} from '../campaignScenery';
import {sites,siteById} from '../../data/scenario';
import {createFields} from '../artSample/fields';
import {coverageTexture} from './overlays';
import {BufferGeometry,CatmullRomCurve3,Float32BufferAttribute,Mesh,Group,Vector3,Vector4,type Texture,type Material} from 'three';
import {mapResource,MapResourceError} from '../resourceLoader';
import type {MapLoadProgress} from '../mapLoadState';
import {paperTexture,coarseReliefTexture,resourceTexture,installTexture} from './resourceTexture';
import type {FeatureCollection} from 'geojson';
import {groundMaterial} from '../artSample/groundMaterial';
import {groundColors} from '../artSample/groundColors';
import type {SampleSeason} from '../artSample/layout';
import type {SeasonState} from '../sample/seasons';
import {WORLD_KM,ORIGIN,mercator,geographic,gridHeight,campaignHeight,projectGround,type DEMGrid} from './geography';

export async function countrySurface(_season:SeasonState,options:{signal?:AbortSignal;progress?:(value:MapLoadProgress)=>void}={}){
 let completed=0;
 const local=(path:string)=>mapResource(path,{signal:options.signal,priority:0}).then(response=>{options.progress?.({stage:'terrain',completed:++completed,total:4,busy:completed<4});return response;});
 const [meta,buffer,land,rivers]=await Promise.all([local('art/campaign/national-terrain.json').then(r=>r.json()) as Promise<DEMGrid>,local('art/campaign/national-elevation.bin').then(r=>r.arrayBuffer()),local('data/land.geojson').then(r=>r.json()) as Promise<FeatureCollection>,local('art/campaign/river-corridors.geojson').then(r=>r.json()) as Promise<FeatureCollection>]);
 if(!Number.isInteger(meta.columns)||!Number.isInteger(meta.rows)||meta.columns<2||meta.rows<2||![meta.west,meta.north,meta.width,meta.height].every(Number.isFinite)||meta.width<=0||meta.height<=0)throw new MapResourceError('corrupt','art/campaign/national-terrain.json');
 const values=new Float32Array(buffer);if(values.length!==meta.columns*meta.rows)throw new Error('全国高程数据不完整');
 const detailMap=paperTexture('#afa38a'),parchment=paperTexture('#eadbc1'),hiddenPaper=paperTexture('#eadbc1'),strategicRelief=coarseReliefTexture(meta,values);detailMap.anisotropy=8;parchment.userData.extent=[meta.west,meta.north,meta.width,meta.height];hiddenPaper.userData.extent=parchment.userData.extent;
 const root=new Group(),meshes:Mesh[]=[],waterState=artWaterMaterial(),water=waterState.water,riverGroup=new Group();const {soil:surface,paperBlend:paperStrength}=groundMaterial(detailMap);let currentSeason:SampleSeason='summer';const artOrigin=projectGround(siteById.jiankang.lon,siteById.jiankang.lat);root.add(riverGroup);
 const tintMap={value:null as Texture|null},tintExtent={value:new Vector4()},tintEnabled={value:0};
 const landMask=coverageTexture(land,2048);const landPixels=(landMask.image as HTMLCanvasElement).getContext('2d')!.getImageData(0,0,2048,2048).data;let farms:ReturnType<typeof createFields>|undefined,farmKey="";
 // Country masks and gameplay overlays wrap the SAME ground shader, after its albedo/texture pass.
 const compileGround=surface.onBeforeCompile;
 surface.onBeforeCompile=(shader,renderer)=>{
  compileGround(shader,renderer);Object.assign(shader.uniforms,{tintMap,tintExtent,tintEnabled,landMask:{value:landMask}});
  shader.vertexShader=shader.vertexShader.replace('soilPoint=position;',`soilPoint=position-vec3(${artOrigin.x},0.,${artOrigin.z});`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D tintMap;uniform vec4 tintExtent;uniform float tintEnabled;uniform sampler2D landMask;').replace('#include <normal_fragment_begin>',`
   vec2 campaignPoint=soilPoint.xz+vec2(${artOrigin.x},${artOrigin.z});
   float isLand=texture2D(landMask,vec2(campaignPoint.x/${WORLD_KM}+${ORIGIN.x},campaignPoint.y/${WORLD_KM}+${ORIGIN.y})).r;
   diffuseColor.rgb=mix(vec3(.045,.20,.26),diffuseColor.rgb,isLand);
   if(tintEnabled>.5){vec2 tintUV=(campaignPoint-tintExtent.xy)/tintExtent.zw;if(all(greaterThanEqual(tintUV,vec2(0.)))&&all(lessThanEqual(tintUV,vec2(1.)))){vec4 tint=texture2D(tintMap,tintUV);diffuseColor.rgb=mix(diffuseColor.rgb,tint.rgb,tint.a);}}
   #include <normal_fragment_begin>`);
 };
 let tileStore:ReturnType<typeof elevationTiles>|undefined,manifestPending:Promise<ReturnType<typeof elevationTiles>>|undefined;
 const yubiStore=elevationTiles(yubiTerrain,(x,y)=>mapResource(`art/campaign/elevation/yubi/${x}-${y}.bin.gz`,{signal:options.signal,priority:1}).then(decodeElevation));
 const jiankangStore=elevationTiles(jiankangTerrain,(x,y)=>mapResource(`art/campaign/art-sample/jiankang-dem/${x}-${y}.bin.gz`,{signal:options.signal,priority:1}).then(decodeElevation));
 function detailStore(){if(tileStore)return Promise.resolve(tileStore);return manifestPending??=mapResource('art/campaign/elevation/manifest.json',{signal:options.signal,priority:1}).then(r=>r.json()).then((manifest:ElevationManifest)=>{
  if(manifest.tileSize!==256||manifest.zoom!==7||![manifest.west,manifest.east,manifest.north,manifest.south].every(Number.isInteger)||manifest.east-manifest.west<3||manifest.south-manifest.north<3)throw new MapResourceError('corrupt','art/campaign/elevation/manifest.json');
  return tileStore=elevationTiles(manifest,(x,y)=>mapResource(`art/campaign/elevation/${x}-${y}.bin.gz`,{signal:options.signal,priority:1}).then(decodeElevation));
 }).finally(()=>{manifestPending=undefined;});
 }
 let regional:{meta:DEMGrid;values:Float32Array}|undefined,detail:{meta:DEMGrid;values:Float32Array}|undefined,detailMesh:DEMGrid|undefined,flat=false,closed=false;
 const sampledHeight=(lon:number,lat:number)=>{const p=mercator(lon,lat);let raw=gridHeight(values,meta,p.x,p.y);if(raw===null)return null;if(regional){const h=gridHeight(regional.values,regional.meta,p.x,p.y);if(h!==null)raw=h;}if(detail){const fine=gridHeight(detail.values,detail.meta,p.x,p.y);if(fine!==null){const d=detail.meta,edge=Math.min((p.x-d.west)/d.width,(d.west+d.width-p.x)/d.width,(p.y-d.north)/d.height,(d.north+d.height-p.y)/d.height);raw=raw+(fine-raw)*Math.min(1,Math.max(0,edge*24));}}return campaignHeight(raw,lat);};
 const cityCells=new Map<string,{lon:number;lat:number;x:number;z:number;radius:number}[]>();
 const cityLayouts=new Map<string,ReturnType<typeof riverSafeCity>>();
 // The same display-only city-footprint leveling as the accepted sample.
 const landHeight=(lon:number,lat:number)=>{let h=sampledHeight(lon,lat);if(h===null)return h;const p=projectGround(lon,lat);if(nearSegments(p.x,p.z).some(s=>segmentDistance(p.x,p.z,s.a,s.b)<2))return h;const cx=Math.floor(p.x/48),cz=Math.floor(p.z/48);
  for(let x=cx-1;x<=cx+1;x++)for(let z=cz-1;z<=cz+1;z++)for(const c of cityCells.get(x+':'+z)??[]){const d=Math.pow(Math.pow(Math.abs(p.x-c.x),4)+Math.pow(Math.abs(p.z-c.z),4),.25)/c.radius;if(d>=1.65)continue;const center=sampledHeight(c.lon,c.lat);if(center===null)continue;const t=Math.min(1,Math.max(0,(d-.82)/.83)),blend=t*t*(3-2*t);h=center+(h-center)*blend;}return h;
 };
 type RiverSegment={a:Vector3;b:Vector3};
 const riverCells=new Map<string,RiverSegment[]>();let riverPaths:Vector3[][]=[];
 const nearSegments=(x:number,z:number)=>riverCells.get(Math.floor(x/8)+':'+Math.floor(z/8))??[];
 let channel:ReturnType<typeof riverShape>|undefined;
 const height=(lon:number,lat:number)=>{const h=landHeight(lon,lat);if(h===null)return h;const p=projectGround(lon,lat);return channel?channel.carve(h,channel.sample(p.x,p.z)):h;};
 function prepareRivers(){riverCells.clear();cityCells.clear();riverPaths=[];
  for(const f of rivers.features){const g=f.geometry;if(g.type!=='LineString'&&g.type!=='MultiLineString')continue;
   for(const path of g.type==='LineString'?[g.coordinates]:g.coordinates){
    const raw=path.map(p=>projectGround(p[0],p[1]));
    if(raw.length<2||!raw.some(p=>p.x>(meta.west-ORIGIN.x)*WORLD_KM&&p.x<(meta.west+meta.width-ORIGIN.x)*WORLD_KM&&p.z>(meta.north-ORIGIN.y)*WORLD_KM&&p.z<(meta.north+meta.height-ORIGIN.y)*WORLD_KM))continue;
    // Round within the source corridor; no per-vertex random valley snapping or invented meanders.
    const curve=new CatmullRomCurve3(raw.map(p=>new Vector3(p.x,0,p.z)),false,'centripetal');const points=curve.getPoints(Math.max(8,Math.ceil(curve.getLength()/.8))).map(p=>{const ll=geographic(p.x/WORLD_KM+ORIGIN.x,p.z/WORLD_KM+ORIGIN.y),h=sampledHeight(ll.lng,ll.lat);return h===null?null:new Vector3(p.x,h,p.z);});
    let run:Vector3[]=[];for(const p of [...points,null]){if(p){run.push(p);continue;}if(run.length>1)riverPaths.push(run);run=[];}
   }
  }
  for(const points of riverPaths)for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],segment={a,b};for(let x=Math.floor((Math.min(a.x,b.x)-1.4)/8);x<=Math.floor((Math.max(a.x,b.x)+1.4)/8);x++)for(let z=Math.floor((Math.min(a.z,b.z)-1.4)/8);z<=Math.floor((Math.max(a.z,b.z)+1.4)/8);z++){const key=x+':'+z,cell=riverCells.get(key)??[];cell.push(segment);riverCells.set(key,cell);}}
  channel=riverShape(riverPaths,(x,z)=>{const ll=geographic(x/WORLD_KM+ORIGIN.x,z/WORLD_KM+ORIGIN.y);return sampledHeight(ll.lng,ll.lat)??0;},artOrigin);
  const segments=riverPaths.flatMap(path=>path.slice(1).map((b,i)=>({a:path[i],b})));
  for(const site of sites){const anchor=projectGround(site.lon,site.lat),layout=site.id==='yubi'?{...projectGround(yubiCityCenter.lon,yubiCityCenter.lat),scale:1,radius:campaignCityRadius(site,false),clearance:0}:riverSafeCity(anchor,campaignCityRadius(site,true)*1.12,segments,site.id==='jiankang');cityLayouts.set(site.id,layout);if(!layout.scale||site.id==='yubi')continue;const ll=geographic(layout.x/WORLD_KM+ORIGIN.x,layout.z/WORLD_KM+ORIGIN.y),cell=Math.floor(layout.x/48)+':'+Math.floor(layout.z/48),items=cityCells.get(cell)??[];items.push({lon:ll.lng,lat:ll.lat,x:layout.x,z:layout.z,radius:campaignCityRadius(site,!!site.capital)*layout.scale});cityCells.set(cell,items);}
 }
 function geometry(m:DEMGrid,step:number,cut?:DEMGrid,parent=meta,parentStep=8){
  const columns=Math.ceil(m.columns/step),rows=Math.ceil(m.rows/step),vertices:number[]=[],indices:number[]=[];
  for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){const x=m.west+i/columns*m.width,y=m.north+j/rows*m.height,ll=geographic(x,y);let h=height(ll.lng,ll.lat)??0;if(m!==meta&&(i===0||j===0||i===columns||j===rows))h=coarseSurfaceHeight(x,y,parent,parentStep,(x,y)=>{const p=geographic(x,y);return height(p.lng,p.lat)??0;});vertices.push((x-ORIGIN.x)*WORLD_KM,h,(y-ORIGIN.y)*WORLD_KM);}
  for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){const x=m.west+(i+.5)/columns*m.width,y=m.north+(j+.5)/rows*m.height;if(cut&&x>cut.west&&x<cut.west+cut.width&&y>cut.north&&y<cut.north+cut.height)continue;const a=j*(columns+1)+i;indices.push(a,a+columns+1,a+1,a+1,a+columns+1,a+columns+2);}
  const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(vertices,3));g.setIndex(indices);g.setAttribute('color',new Float32BufferAttribute(new Float32Array(vertices.length).fill(1),3));g.computeVertexNormals();groundColors(g,currentSeason,channel,[...cityLayouts.values()].filter(c=>c.scale>0),artOrigin);g.computeBoundingSphere();return g;
 }
 // Sample the triangles actually on screen, including coarse/fine stitched edge vertices.
 // Sampling the raw DEM under a ribbon can put water and roads below an interpolated terrain face.
 function renderedHeight(lon:number,lat:number){
  const p=mercator(lon,lat);let mesh=meshes[0];for(const candidate of meshes){const m=candidate.userData.grid as DEMGrid;if(p.x>m.west&&p.x<m.west+m.width&&p.y>m.north&&p.y<m.north+m.height)mesh=candidate;}if(!mesh)return height(lon,lat);
  const grid=mesh.userData.grid as DEMGrid,step=mesh.userData.step as number;
  const columns=Math.ceil(grid.columns/step),rows=Math.ceil(grid.rows/step),positions=mesh.geometry.getAttribute('position');
  return coarseSurfaceHeight(p.x,p.y,grid,step,(x,y)=>{const i=Math.round((x-grid.west)/grid.width*columns),j=Math.round((y-grid.north)/grid.height*rows);return positions.getY(j*(columns+1)+i);});
 }
 function footprintHeight(bounds:{minX:number;minZ:number;maxX:number;maxZ:number}){
  const box={minX:bounds.minX/WORLD_KM+ORIGIN.x,minY:bounds.minZ/WORLD_KM+ORIGIN.y,maxX:bounds.maxX/WORLD_KM+ORIGIN.x,maxY:bounds.maxZ/WORLD_KM+ORIGIN.y};
  if(box.minX<meta.west||box.maxX>meta.west+meta.width||box.minY<meta.north||box.maxY>meta.north+meta.height)return null;
  let peak:number|null=null;
  for(const mesh of meshes){const grid=mesh.userData.grid as DEMGrid,step=mesh.userData.step as number,cut=mesh.userData.cut as DEMGrid|undefined;
   const positions=mesh.geometry.getAttribute('position');if(!positions)continue;const columns=Math.ceil(grid.columns/step);
   const value=surfaceFootprintHeight(box,grid,step,(i,j)=>positions.getY(j*(columns+1)+i),cut);if(value!==null)peak=Math.max(peak??-Infinity,value);
  }return peak===null?null:peak*root.scale.y;
 }
 function rebuild(){farmKey="";for(const mesh of meshes){root.remove(mesh);mesh.geometry.dispose();}meshes.length=0;
  const levels:[DEMGrid,number,DEMGrid|undefined,DEMGrid,number][]=[[meta,8,regional?.meta??detailMesh,meta,8]];
  if(regional)levels.push([regional.meta,1,detailMesh,meta,8]);
  if(detailMesh)levels.push([detailMesh,1,undefined,regional?.meta??meta,regional?1:8]);
  for(const [m,step,cut,parent,parentStep] of levels){const mesh=new Mesh(geometry(m,step,cut,parent,parentStep),surface);mesh.userData={grid:m,step,cut};mesh.castShadow=m!==meta;mesh.receiveShadow=true;root.add(mesh);meshes.push(mesh);}rebuildRivers();}
 water.transparent=true;
 function rebuildRivers(){for(const o of [...riverGroup.children]){riverGroup.remove(o);(o as Mesh).geometry.dispose();}
  for(const line of channel?.profiles??[])for(let start=0;start<line.length-1;start+=256){
   const points=line.slice(start,start+257),pos:number[]=[],uv:number[]=[],idx:number[]=[],across=8;
   for(let i=0;i<points.length;i++){const p=points[i];let level=p.level;
    // Coarse terrain remains authoritative for visible contact until fine tiles arrive.
    for(const side of [-1,0,1]){const width=side<0?p.left:p.right,ll=geographic((p.x+p.nx*width*side)/WORLD_KM+ORIGIN.x,(p.z+p.nz*width*side)/WORLD_KM+ORIGIN.y);level=Math.max(level,renderedHeight(ll.lng,ll.lat)??level);}
    for(let j=0;j<=across;j++){const v=j/across*2-1,width=v<0?p.left:p.right;pos.push(p.x+p.nx*width*v,level+.008,p.z+p.nz*width*v);uv.push(j/across,p.distance);if(i&&j){const a=i*(across+1)+j;idx.push(a-across-2,a-1,a-across-1,a-across-1,a-1,a);}}
   }
   const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(pos,3));g.setAttribute('uv',new Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const mesh=new Mesh(g,water);mesh.receiveShadow=true;mesh.renderOrder=2;riverGroup.add(mesh);
  }
 }

 prepareRivers();rebuild();
 let detailKey='',pendingKey='',requestedDetail:[number,number]|undefined,refineGeneration=0;
 async function refine(lon:number,lat:number,canApply:()=>boolean=()=>true){requestedDetail=[lon,lat];let store:ReturnType<typeof elevationTiles>;
  try{store=usesYubiTerrain(lon,lat)?yubiStore:usesJiankangTerrain(lon,lat)?jiankangStore:await detailStore();}catch(error){if(closed||!requestedDetail||requestedDetail[0]!==lon||requestedDetail[1]!==lat)return false;throw error;}
  const isLocal=store!==tileStore,prefix=store===yubiStore?'yubi:':store===jiankangStore?'jiankang:':'national:',key=prefix+store.window(lon,lat).key,targetCurrent=()=>!!requestedDetail&&(usesYubiTerrain(...requestedDetail)?'yubi:':usesJiankangTerrain(...requestedDetail)?'jiankang:':'national:')+store.window(...requestedDetail).key===key;if(closed||!targetCurrent()||key===detailKey||key===pendingKey)return false;const generation=++refineGeneration,current=()=>refineGeneration===generation&&targetCurrent();pendingKey=key;
  options.progress?.({stage:'detail',completed:0,total:9,busy:true});
  try{const surrounding=isLocal?await (await detailStore()).load(lon,lat):undefined;const next=await store.load(lon,lat,completed=>{if(pendingKey===key&&!closed&&current())options.progress?.({stage:'detail',completed,total:9,busy:true});});
   // Decode ahead, but never replace terrain meshes in the middle of a gesture.
   while(!closed&&pendingKey===key&&current()&&!canApply())await new Promise<void>(resolve=>setTimeout(resolve,100));
   if(closed||pendingKey!==key||!current())return false;
   regional=surrounding;detail={...next,values:softenRelief(next.values,next.meta.columns,next.meta.rows,store===jiankangStore?6:1)};detailMesh=isLocal?localTerrainMesh(next.meta,regional!.meta,1):next.meta;detailKey=key;
   // Keep river XY stable; refresh elevations without nine valley searches per point.
   for(const path of riverPaths)for(const point of path){const ll=geographic(point.x/WORLD_KM+ORIGIN.x,point.z/WORLD_KM+ORIGIN.y);point.y=sampledHeight(ll.lng,ll.lat)??point.y;}
   channel=riverShape(riverPaths,(x,z)=>{const ll=geographic(x/WORLD_KM+ORIGIN.x,z/WORLD_KM+ORIGIN.y);return sampledHeight(ll.lng,ll.lat)??0;},artOrigin);
   rebuild();options.progress?.({stage:'detail',completed:9,total:9,busy:false});return true;
  }catch(error){if(closed||pendingKey!==key)return false;options.progress?.({stage:'detail',completed:0,total:9,busy:false});throw error;}finally{if(refineGeneration===generation&&pendingKey===key)pendingKey='';}
 }
 const artwork=[()=>parchmentTexture(meta,false,options.signal),()=>strategicReliefTexture(options.signal),()=>parchmentTexture(meta,true,options.signal),()=>resourceTexture('art/campaign/terrain-atlas-v1.png',options.signal,true).then(texture=>{texture.anisotropy=8;return texture;})],targets=[parchment,strategicRelief,hiddenPaper,detailMap],artReady=new Set<number>();let artPending:Promise<void>|undefined;
 function loadArt(repaint:()=>void){if(artPending)return artPending;
  options.progress?.({stage:'art',completed:artReady.size,total:4,busy:true});
  artPending=Promise.allSettled(artwork.map(async(load,index)=>{if(artReady.has(index))return;const loaded=await load();if(closed){loaded.dispose();return;}installTexture(targets[index],loaded);artReady.add(index);options.progress?.({stage:'art',completed:artReady.size,total:4,busy:true});repaint();})).then(results=>{if(closed)return;options.progress?.({stage:'art',completed:artReady.size,total:4,busy:false});const failure=results.find(r=>r.status==='rejected');if(failure?.status==='rejected')throw failure.reason;}).finally(()=>{artPending=undefined;});return artPending;
 }
 function riverHeight(lon:number,lat:number){const p=projectGround(lon,lat),bank=channel?.sample(p.x,p.z);return bank&&bank.edge<0?Math.max(bank.level,renderedHeight(lon,lat)??bank.level)+.008:null;}

 return {time:waterState.time,channel:()=>channel,measured:(x:number,z:number)=>{const ll=geographic(x/WORLD_KM+ORIGIN.x,z/WORLD_KM+ORIGIN.y);return sampledHeight(ll.lng,ll.lat)??0;},loadArt,cancelRefine(){refineGeneration++;requestedDetail=undefined;pendingKey="";},detailMap,riverHeight,renderedHeight,footprintHeight,cityLayout:(id:string)=>cityLayouts.get(id),root,meshes,land,rivers,parchment,hiddenPaper,height:(lon:number,lat:number)=>{const h=height(lon,lat);return h===null?null:h*root.scale.y;},baseHeight:height,refine,water,setTint(map:Texture,extent:[number,number,number,number],enabled:boolean){tintMap.value=map;tintExtent.value.fromArray(extent);tintEnabled.value=enabled?1:0;},setPaperStrength(value:number){paperStrength.value=flat?1:value;root.scale.y=Math.max(.00001,1-paperStrength.value);riverGroup.visible=paperStrength.value<.999;if(farms)farms.root.visible=paperStrength.value<.9;water.opacity=1-paperStrength.value;},setSeason(value:string){const next=value==='spring'?'summer':value as SampleSeason;if(next===currentSeason)return;currentSeason=next;farms?.season(currentSeason);for(const mesh of meshes)groundColors(mesh.geometry,currentSeason,channel,[...cityLayouts.values()].filter(c=>c.scale>0),artOrigin);},isLand(lon:number,lat:number){const p=mercator(lon,lat),x=Math.floor(p.x*2048),y=Math.floor(p.y*2048);return x>=0&&x<2048&&y>=0&&y<2048&&landPixels[(y*2048+x)*4]>127;},isRiver(lon:number,lat:number){const p=projectGround(lon,lat);return (channel?.sample(p.x,p.z)?.edge??Infinity)<.4;},setFarms(centers:{x:number;z:number;radius?:number}[]){const key=centers.map(c=>c.x+':'+c.z+':'+c.radius).join('|');if(key===farmKey)return;farmKey=key;if(farms){root.remove(farms.root);farms.dispose();}farms=createFields({cities:centers.map(c=>({x:c.x-artOrigin.x,z:c.z-artOrigin.z})),height:(x,z)=>{const ll=geographic((x+artOrigin.x)/WORLD_KM+ORIGIN.x,(z+artOrigin.z)/WORLD_KM+ORIGIN.y);return renderedHeight(ll.lng,ll.lat)??0;},river:(x,z)=>channel?.sample(x+artOrigin.x,z+artOrigin.z)?.distance??Infinity});farms.root.position.set(artOrigin.x,0,artOrigin.z);farms.season(currentSeason);root.add(farms.root);},setFlat(value:boolean){flat=value;if(flat)tintEnabled.value=0;},dispose(){closed=true;detailMap.dispose();strategicRelief.dispose();hiddenPaper.dispose();tileStore?.clear();yubiStore.clear();jiankangStore.clear();parchment.dispose();landMask.dispose();farms?.dispose();root.traverse(o=>{if(o instanceof Mesh)o.geometry.dispose();});for(const material of [surface,water])material.dispose();},fogMaterialMeshes(material:Material){return meshes.map(m=>new Mesh(m.geometry,material));}};
}
