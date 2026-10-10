import {landscapeMaterial} from './landscapeMaterial';
import {smoothGroundPath,pathSections,riverSafeCity} from './landscapePaths';
import {coarseSurfaceHeight,surfaceFootprintHeight} from './terrainSeam';
import {elevationTiles,decodeElevation,type ElevationManifest} from './elevationTiles';
import {parchmentTexture,strategicReliefTexture} from './parchment';
import {segmentDistance} from '../sample/geography';
import {campaignCityRadius} from '../campaignScenery';
import {sites} from '../../data/scenario';
import {campaignFarmAtlas} from '../sample/farmAtlas';
import {coverageTexture} from './overlays';
import {BufferGeometry,Float32BufferAttribute,Mesh,DoubleSide,Group,Vector3,Vector4,type Texture,type Material} from 'three';
import {mapResource,MapResourceError} from '../resourceLoader';
import type {MapLoadProgress} from '../mapLoadState';
import {paperTexture,coarseReliefTexture,resourceTexture,installTexture} from './resourceTexture';
import type {FeatureCollection} from 'geojson';
import {terrainMaterial,waterMaterial} from '../sample/materials';
import type {SeasonState} from '../sample/seasons';
import {WORLD_KM,ORIGIN,mercator,geographic,gridHeight,campaignHeight,projectGround,type DEMGrid} from './geography';

export async function countrySurface(season:SeasonState,options:{signal?:AbortSignal;progress?:(value:MapLoadProgress)=>void}={}){
 let completed=0;
 const local=(path:string)=>mapResource(path,{signal:options.signal,priority:0}).then(response=>{options.progress?.({stage:'terrain',completed:++completed,total:4,busy:completed<4});return response;});
 const [meta,buffer,land,rivers]=await Promise.all([local('art/campaign/national-terrain.json').then(r=>r.json()) as Promise<DEMGrid>,local('art/campaign/national-elevation.bin').then(r=>r.arrayBuffer()),local('data/land.geojson').then(r=>r.json()) as Promise<FeatureCollection>,local('art/campaign/river-corridors.geojson').then(r=>r.json()) as Promise<FeatureCollection>]);
 if(!Number.isInteger(meta.columns)||!Number.isInteger(meta.rows)||meta.columns<2||meta.rows<2||![meta.west,meta.north,meta.width,meta.height].every(Number.isFinite)||meta.width<=0||meta.height<=0)throw new MapResourceError('corrupt','art/campaign/national-terrain.json');
 const values=new Float32Array(buffer);if(values.length!==meta.columns*meta.rows)throw new Error('全国高程数据不完整');
 const detailMap=paperTexture('#afa38a'),parchment=paperTexture('#eadbc1'),hiddenPaper=paperTexture('#eadbc1'),strategicRelief=coarseReliefTexture(meta,values);detailMap.anisotropy=8;parchment.userData.extent=[meta.west,meta.north,meta.width,meta.height];hiddenPaper.userData.extent=parchment.userData.extent;
 const root=new Group(),meshes:Mesh[]=[],water=waterMaterial(),riverGroup=new Group();let surface=terrainMaterial(undefined,season,{fade:false,detailMap});root.add(riverGroup);
 const tintMap={value:null as Texture|null},tintExtent={value:new Vector4()},tintEnabled={value:0};
 const strategic={value:0},paperStrength={value:0},landMask=coverageTexture(land,2048);const landPixels=(landMask.image as HTMLCanvasElement).getContext('2d')!.getImageData(0,0,2048,2048).data;let farms:ReturnType<typeof campaignFarmAtlas>|undefined,farmKey="";
 function bindLand(){const compile=surface.onBeforeCompile;
 surface.onBeforeCompile=(shader,renderer)=>{compile(shader,renderer);Object.assign(shader.uniforms,{tintMap,tintExtent,tintEnabled});shader.uniforms.landMask={value:landMask};shader.uniforms.strategicPaper={value:parchment};shader.uniforms.strategic=strategic;shader.uniforms.paperStrength=paperStrength;shader.uniforms.strategicRelief={value:strategicRelief};shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float campaignElevation;').replace('terrainPosition=position;','terrainPosition=position;terrainPosition.y=campaignElevation;');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D tintMap; uniform vec4 tintExtent; uniform float tintEnabled; uniform sampler2D landMask; uniform sampler2D strategicPaper; uniform sampler2D strategicRelief; uniform float strategic; uniform float paperStrength;').replaceAll('terrainPosition.y','campaignSurfaceHeight').replace('float slope=1.-abs(normalize(terrainNormal).y);',`vec2 reliefUV=(vec2(terrainPosition.x/${WORLD_KM}+${ORIGIN.x},terrainPosition.z/${WORLD_KM}+${ORIGIN.y})-vec2(${meta.west},${meta.north}))/vec2(${meta.width},${meta.height});vec4 reliefData=texture2D(strategicRelief,reliefUV);vec3 reliefNormal=normalize(reliefData.rgb*2.-1.);float campaignSurfaceHeight=mix(terrainPosition.y,reliefData.a*180.,strategic);float slope=mix(1.-abs(normalize(terrainNormal).y),1.-abs(reliefNormal.y),strategic);`)
 .replace('#include <lights_physical_fragment>','normal=normalize(mix(normal,mat3(viewMatrix)*reliefNormal,strategic));\n#include <lights_physical_fragment>')
 .replace('diffuseColor.rgb*=land*',`vec3 paperInk=texture2D(strategicPaper,reliefUV).rgb;land=mix(land,paperInk,paperStrength);float isLand=texture2D(landMask,vec2(terrainPosition.x/${WORLD_KM}+${ORIGIN.x},terrainPosition.z/${WORLD_KM}+${ORIGIN.y})).r;land=mix(mix(vec3(.045,.20,.26),paperInk,paperStrength),land,isLand);\n if(tintEnabled>.5){vec2 tintUV=(terrainPosition.xz-tintExtent.xy)/tintExtent.zw;if(all(greaterThanEqual(tintUV,vec2(0.)))&&all(lessThanEqual(tintUV,vec2(1.)))){vec4 tint=texture2D(tintMap,tintUV);land=mix(land,tint.rgb,tint.a);}}\n diffuseColor.rgb*=land*`).replace('#include <opaque_fragment>','outgoingLight=mix(outgoingLight,diffuseColor.rgb,paperStrength*.9);\n#include <opaque_fragment>');};}
 bindLand();
 let tileStore:ReturnType<typeof elevationTiles>|undefined,manifestPending:Promise<ReturnType<typeof elevationTiles>>|undefined;
 function detailStore(){if(tileStore)return Promise.resolve(tileStore);return manifestPending??=mapResource('art/campaign/elevation/manifest.json',{signal:options.signal,priority:1}).then(r=>r.json()).then((manifest:ElevationManifest)=>{
  if(manifest.tileSize!==256||manifest.zoom!==7||![manifest.west,manifest.east,manifest.north,manifest.south].every(Number.isInteger)||manifest.east-manifest.west<3||manifest.south-manifest.north<3)throw new MapResourceError('corrupt','art/campaign/elevation/manifest.json');
  return tileStore=elevationTiles(manifest,(x,y)=>mapResource(`art/campaign/elevation/${x}-${y}.bin.gz`,{signal:options.signal,priority:1}).then(decodeElevation));
 }).finally(()=>{manifestPending=undefined;});
 }
 let detail:{meta:DEMGrid;values:Float32Array}|undefined,flat=false,closed=false;
 const sampledHeight=(lon:number,lat:number)=>{const p=mercator(lon,lat);let raw=gridHeight(values,meta,p.x,p.y);if(raw===null)return null;if(detail){const fine=gridHeight(detail.values,detail.meta,p.x,p.y);if(fine!==null){const d=detail.meta,edge=Math.min((p.x-d.west)/d.width,(d.west+d.width-p.x)/d.width,(p.y-d.north)/d.height,(d.north+d.height-p.y)/d.height);raw=raw+(fine-raw)*Math.min(1,Math.max(0,edge*24));}}return campaignHeight(raw,lat);};
 const cityCells=new Map<string,{lon:number;lat:number;x:number;z:number;radius:number}[]>();
 const cityLayouts=new Map<string,ReturnType<typeof riverSafeCity>>();
 // The same display-only city-footprint leveling as the accepted sample.
 const landHeight=(lon:number,lat:number)=>{let h=sampledHeight(lon,lat);if(h===null)return h;const p=projectGround(lon,lat);if(nearSegments(p.x,p.z).some(s=>segmentDistance(p.x,p.z,s.a,s.b)<2))return h;const cx=Math.floor(p.x/48),cz=Math.floor(p.z/48);
  for(let x=cx-1;x<=cx+1;x++)for(let z=cz-1;z<=cz+1;z++)for(const c of cityCells.get(x+':'+z)??[]){const d=Math.pow(Math.pow(Math.abs(p.x-c.x),4)+Math.pow(Math.abs(p.z-c.z),4),.25)/c.radius;if(d>=1.65)continue;const center=sampledHeight(c.lon,c.lat);if(center===null)continue;const t=Math.min(1,Math.max(0,(d-.82)/.83)),blend=t*t*(3-2*t);h=center+(h-center)*blend;}return h;
 };
 type RiverSegment={a:Vector3;b:Vector3};
 const riverCells=new Map<string,RiverSegment[]>();let riverPaths:Vector3[][]=[];
 const nearSegments=(x:number,z:number)=>riverCells.get(Math.floor(x/8)+':'+Math.floor(z/8))??[];
 const height=(lon:number,lat:number)=>{let h=landHeight(lon,lat);if(h===null)return h;const p=projectGround(lon,lat);for(const seg of nearSegments(p.x,p.z)){const distance=segmentDistance(p.x,p.z,seg.a,seg.b);if(distance>1.1)continue;const dx=seg.b.x-seg.a.x,dz=seg.b.z-seg.a.z,t=Math.max(0,Math.min(1,((p.x-seg.a.x)*dx+(p.z-seg.a.z)*dz)/(dx*dx+dz*dz||1))),water=seg.a.y+(seg.b.y-seg.a.y)*t;h=Math.min(h,water-.12*Math.max(0,1-distance/1.1));}return h;};
 function prepareRivers(){riverCells.clear();cityCells.clear();riverPaths=[];
  for(const f of rivers.features){const g=f.geometry;if(g.type!=='LineString'&&g.type!=='MultiLineString')continue;
   for(const path of g.type==='LineString'?[g.coordinates]:g.coordinates){
    const raw=path.map(p=>projectGround(p[0],p[1]));
    if(!raw.some(p=>p.x>(meta.west-ORIGIN.x)*WORLD_KM&&p.x<(meta.west+meta.width-ORIGIN.x)*WORLD_KM&&p.z>(meta.north-ORIGIN.y)*WORLD_KM&&p.z<(meta.north+meta.height-ORIGIN.y)*WORLD_KM))continue;
    // Round within the source corridor; no per-vertex random valley snapping or invented meanders.
    const points=smoothGroundPath(raw,.35,12).map(p=>{const ll=geographic(p.x/WORLD_KM+ORIGIN.x,p.z/WORLD_KM+ORIGIN.y),h=sampledHeight(ll.lng,ll.lat);return h===null?null:new Vector3(p.x,h,p.z);});
    let run:Vector3[]=[];for(const p of [...points,null]){if(p){run.push(p);continue;}if(run.length>1)riverPaths.push(run);run=[];}
   }
  }
  for(const points of riverPaths)for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],segment={a,b};for(let x=Math.floor((Math.min(a.x,b.x)-1.4)/8);x<=Math.floor((Math.max(a.x,b.x)+1.4)/8);x++)for(let z=Math.floor((Math.min(a.z,b.z)-1.4)/8);z<=Math.floor((Math.max(a.z,b.z)+1.4)/8);z++){const key=x+':'+z,cell=riverCells.get(key)??[];cell.push(segment);riverCells.set(key,cell);}}
  const segments=riverPaths.flatMap(path=>path.slice(1).map((b,i)=>({a:path[i],b})));
  for(const site of sites){const layout=riverSafeCity(projectGround(site.lon,site.lat),campaignCityRadius(site,true)*1.12,segments,site.id==='jiankang');cityLayouts.set(site.id,layout);if(!layout.scale)continue;const ll=geographic(layout.x/WORLD_KM+ORIGIN.x,layout.z/WORLD_KM+ORIGIN.y),cell=Math.floor(layout.x/48)+':'+Math.floor(layout.z/48),items=cityCells.get(cell)??[];items.push({lon:ll.lng,lat:ll.lat,x:layout.x,z:layout.z,radius:campaignCityRadius(site,!!site.capital)*layout.scale});cityCells.set(cell,items);}
 }
 function geometry(m:DEMGrid,step:number,cut?:DEMGrid){
  const columns=Math.ceil(m.columns/step),rows=Math.ceil(m.rows/step),vertices:number[]=[],elevations:number[]=[],indices:number[]=[];
  for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){const x=m.west+i/columns*m.width,y=m.north+j/rows*m.height,ll=geographic(x,y);let h=height(ll.lng,ll.lat)??0;if(m!==meta&&(i===0||j===0||i===columns||j===rows))h=coarseSurfaceHeight(x,y,meta,8,(x,y)=>{const p=geographic(x,y);return height(p.lng,p.lat)??0;});vertices.push((x-ORIGIN.x)*WORLD_KM,h,(y-ORIGIN.y)*WORLD_KM);elevations.push(h);}
  for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){const x=m.west+(i+.5)/columns*m.width,y=m.north+(j+.5)/rows*m.height;if(cut&&x>cut.west&&x<cut.west+cut.width&&y>cut.north&&y<cut.north+cut.height)continue;const a=j*(columns+1)+i;indices.push(a,a+columns+1,a+1,a+1,a+columns+1,a+columns+2);}
  const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(vertices,3));g.setIndex(indices);g.setAttribute('campaignElevation',new Float32BufferAttribute(elevations,1));g.computeVertexNormals();g.computeBoundingSphere();return g;
 }
 // Sample the triangles actually on screen, including coarse/fine stitched edge vertices.
 // Sampling the raw DEM under a ribbon can put water and roads below an interpolated terrain face.
 function renderedHeight(lon:number,lat:number){
  const p=mercator(lon,lat),d=detail?.meta,useDetail=!!d&&p.x>d.west&&p.x<d.west+d.width&&p.y>d.north&&p.y<d.north+d.height;
  const grid=useDetail?d!:meta,step=useDetail?1:8,mesh=meshes[useDetail?1:0];if(!mesh)return height(lon,lat);
  const columns=Math.ceil(grid.columns/step),rows=Math.ceil(grid.rows/step),positions=mesh.geometry.getAttribute('position');
  return coarseSurfaceHeight(p.x,p.y,grid,step,(x,y)=>{const i=Math.round((x-grid.west)/grid.width*columns),j=Math.round((y-grid.north)/grid.height*rows);return positions.getY(j*(columns+1)+i);});
 }
 function footprintHeight(bounds:{minX:number;minZ:number;maxX:number;maxZ:number}){
  const box={minX:bounds.minX/WORLD_KM+ORIGIN.x,minY:bounds.minZ/WORLD_KM+ORIGIN.y,maxX:bounds.maxX/WORLD_KM+ORIGIN.x,maxY:bounds.maxZ/WORLD_KM+ORIGIN.y};
  if(box.minX<meta.west||box.maxX>meta.west+meta.width||box.minY<meta.north||box.maxY>meta.north+meta.height)return null;
  let peak:number|null=null;
  for(const [index,grid,step,cut] of [[0,meta,8,detail?.meta],...(detail?[[1,detail.meta,1,undefined]]:[])] as [number,DEMGrid,number,DEMGrid|undefined][]){
   const positions=meshes[index]?.geometry.getAttribute('position');if(!positions)continue;const columns=Math.ceil(grid.columns/step);
   const value=surfaceFootprintHeight(box,grid,step,(i,j)=>positions.getY(j*(columns+1)+i),cut);if(value!==null)peak=Math.max(peak??-Infinity,value);
  }return peak===null?null:peak*root.scale.y;
 }
 function rebuild(){farmKey="";for(const mesh of meshes){root.remove(mesh);mesh.geometry.dispose();}meshes.length=0;for(const [m,step,cut] of [[meta,8,detail?.meta],...(detail?[[detail.meta,1,undefined]]:[])] as [DEMGrid,number,DEMGrid|undefined][]){const mesh=new Mesh(geometry(m,step,cut),surface);mesh.castShadow=m!==meta;mesh.receiveShadow=true;root.add(mesh);meshes.push(mesh);}rebuildRivers();}
 const bankMaterial=landscapeMaterial('River silt and reed edge',false,detailMap,3);bankMaterial.side=DoubleSide;
 water.transparent=true;
 function rebuildRivers(){for(const o of [...riverGroup.children]){riverGroup.remove(o);(o as Mesh).geometry.dispose();}
  // Independently culled river reaches: a close view must not submit the entire national network.
  for(const path of riverPaths){const sections=pathSections(path);for(let start=0;start<path.length-1;start+=512){
   const pos:number[]=[],uv:number[]=[],indices:number[]=[],banks:number[]=[],bankColors:number[]=[],bankIndices:number[]=[];
   const points=sections.slice(start,start+513),offset=0,bo=0;
   for(const [i,p] of points.entries()){
    // Slowly changing asymmetric shores within the reserved real river corridor.
    const width=.48+.075*Math.sin(p.x*.19+p.z*.13)+.035*Math.sin(p.distance*.43);
    let y=path[start+i].y;for(const offset of [-width,0,width]){const ll=geographic((p.x+p.nx*offset)/WORLD_KM+ORIGIN.x,(p.z+p.nz*offset)/WORLD_KM+ORIGIN.y);y=Math.max(y,renderedHeight(ll.lng,ll.lat)??y);}
    for(const sign of [-1,1]){pos.push(p.x+p.nx*width*sign,y+.035,p.z+p.nz*width*sign);uv.push(sign===-1?0:1,p.distance);}
    for(const side of [-1,1]){
     const shore=.17+.13*(.5+.5*Math.sin(p.distance*.27+side*1.7));
     for(const [j,d] of [width*.98,width+shore*.5,width+shore,width+shore+.24].entries()){
      const x=p.x+p.nx*d*side,z=p.z+p.nz*d*side,ll=geographic(x/WORLD_KM+ORIGIN.x,z/WORLD_KM+ORIGIN.y),h=renderedHeight(ll.lng,ll.lat)??y,t=j/3;
      banks.push(x,j===0?y+.022:y+(h-y)*t+.026,z);
      const grain=.94+.06*Math.sin(p.distance*3.7);bankColors.push(...(j===0?[.19*grain,.23*grain,.17*grain,1]:j<3?[.40*grain,.36*grain,.25*grain,1]:[.26,.31,.13,0]));
     }
    }
    if(i){const n=offset+i*2;indices.push(n-2,n-1,n,n-1,n+1,n);for(const side of [0,4])for(let j=0;j<3;j++){const k=bo+i*8+side+j;if(side===0)bankIndices.push(k-8,k,k-7,k-7,k,k+1);else bankIndices.push(k-8,k-7,k,k-7,k+1,k);}}
   }
  const geo=new BufferGeometry();geo.setAttribute('position',new Float32BufferAttribute(pos,3));geo.setAttribute('uv',new Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();const riverMesh=new Mesh(geo,water);riverMesh.receiveShadow=true;riverGroup.add(riverMesh);
  const bank=new BufferGeometry();bank.setAttribute('position',new Float32BufferAttribute(banks,3));bank.setAttribute('color',new Float32BufferAttribute(bankColors,4));bank.setIndex(bankIndices);bank.computeVertexNormals();const mesh=new Mesh(bank,bankMaterial);mesh.receiveShadow=true;riverGroup.add(mesh);
  }}
 }
 prepareRivers();rebuild();
 let detailKey='',pendingKey='',requestedDetail:[number,number]|undefined,refineGeneration=0;
 async function refine(lon:number,lat:number,canApply:()=>boolean=()=>true){requestedDetail=[lon,lat];let store:ReturnType<typeof elevationTiles>;
  try{store=await detailStore();}catch(error){if(closed||!requestedDetail||requestedDetail[0]!==lon||requestedDetail[1]!==lat)return false;throw error;}
  const key=store.window(lon,lat).key,targetCurrent=()=>!!requestedDetail&&store.window(...requestedDetail).key===key;if(closed||!targetCurrent()||key===detailKey||key===pendingKey)return false;const generation=++refineGeneration,current=()=>refineGeneration===generation&&targetCurrent();pendingKey=key;
  options.progress?.({stage:'detail',completed:0,total:9,busy:true});
  try{const next=await store.load(lon,lat,completed=>{if(pendingKey===key&&!closed&&current())options.progress?.({stage:'detail',completed,total:9,busy:true});});
   // Decode ahead, but never replace terrain meshes in the middle of a gesture.
   while(!closed&&pendingKey===key&&current()&&!canApply())await new Promise<void>(resolve=>setTimeout(resolve,100));
   if(closed||pendingKey!==key||!current())return false;
   detail=next;detailKey=key;
   // Keep river XY stable; refresh elevations without nine valley searches per point.
   for(const path of riverPaths)for(const point of path){const ll=geographic(point.x/WORLD_KM+ORIGIN.x,point.z/WORLD_KM+ORIGIN.y);point.y=sampledHeight(ll.lng,ll.lat)??point.y;}
   rebuild();options.progress?.({stage:'detail',completed:9,total:9,busy:false});return true;
  }catch(error){if(closed||pendingKey!==key)return false;options.progress?.({stage:'detail',completed:0,total:9,busy:false});throw error;}finally{if(refineGeneration===generation&&pendingKey===key)pendingKey='';}
 }
 const artwork=[()=>parchmentTexture(meta,false,options.signal),()=>strategicReliefTexture(options.signal),()=>parchmentTexture(meta,true,options.signal),()=>resourceTexture('art/campaign/terrain-atlas-v1.png',options.signal,true).then(texture=>{texture.anisotropy=8;return texture;})],targets=[parchment,strategicRelief,hiddenPaper,detailMap],artReady=new Set<number>();let artPending:Promise<void>|undefined;
 function loadArt(repaint:()=>void){if(artPending)return artPending;
  options.progress?.({stage:'art',completed:artReady.size,total:4,busy:true});
  artPending=Promise.allSettled(artwork.map(async(load,index)=>{if(artReady.has(index))return;const loaded=await load();if(closed){loaded.dispose();return;}installTexture(targets[index],loaded);artReady.add(index);options.progress?.({stage:'art',completed:artReady.size,total:4,busy:true});repaint();})).then(results=>{if(closed)return;options.progress?.({stage:'art',completed:artReady.size,total:4,busy:false});const failure=results.find(r=>r.status==='rejected');if(failure?.status==='rejected')throw failure.reason;}).finally(()=>{artPending=undefined;});return artPending;
 }
 function riverHeight(lon:number,lat:number){const p=projectGround(lon,lat);let water:number|null=null;for(const s of nearSegments(p.x,p.z)){if(segmentDistance(p.x,p.z,s.a,s.b)>.82)continue;const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,t=Math.max(0,Math.min(1,((p.x-s.a.x)*dx+(p.z-s.a.z)*dz)/(dx*dx+dz*dz||1)));water=Math.max(water??-Infinity,s.a.y+(s.b.y-s.a.y)*t,renderedHeight(lon,lat)??0);}return water===null?null:water+.06;}
 return {loadArt,cancelRefine(){refineGeneration++;requestedDetail=undefined;pendingKey="";},detailMap,riverHeight,renderedHeight,footprintHeight,cityLayout:(id:string)=>cityLayouts.get(id),root,meshes,land,rivers,parchment,hiddenPaper,height:(lon:number,lat:number)=>{const h=height(lon,lat);return h===null?null:h*root.scale.y;},baseHeight:height,refine,water,setTint(map:Texture,extent:[number,number,number,number],enabled:boolean){tintMap.value=map;tintExtent.value.fromArray(extent);tintEnabled.value=enabled?1:0;},setPaperStrength(value:number){paperStrength.value=flat?1:value;root.scale.y=Math.max(.00001,1-paperStrength.value);strategic.value=paperStrength.value;riverGroup.visible=paperStrength.value<.999;water.opacity=bankMaterial.opacity=1-paperStrength.value;},setRegionalStyle(value:number){surface.setRegionalStyle(value);},isLand(lon:number,lat:number){const p=mercator(lon,lat),x=Math.floor(p.x*2048),y=Math.floor(p.y*2048);return x>=0&&x<2048&&y>=0&&y<2048&&landPixels[(y*2048+x)*4]>127;},isRiver(lon:number,lat:number){const p=projectGround(lon,lat);return nearSegments(p.x,p.z).some(s=>segmentDistance(p.x,p.z,s.a,s.b)<.65);},setFarms(centers:{x:number;z:number;radius?:number}[]){const key=centers.map(c=>c.x+':'+c.z+':'+c.radius).join('|');if(key===farmKey)return;farmKey=key;farms?.dispose();farms=campaignFarmAtlas(centers,(x,z)=>{const ll=geographic(x/WORLD_KM+ORIGIN.x,z/WORLD_KM+ORIGIN.y);return height(ll.lng,ll.lat);});surface.setFarms({map:farms,centers,columns:6,rows:6});},setFlat(value:boolean){flat=value;if(flat)tintEnabled.value=0;},dispose(){closed=true;detailMap.dispose();strategicRelief.dispose();hiddenPaper.dispose();tileStore?.clear();parchment.dispose();landMask.dispose();farms?.dispose();root.traverse(o=>{if(o instanceof Mesh)o.geometry.dispose();});for(const material of [surface,water,bankMaterial])material.dispose();},fogMaterialMeshes(material:Material){return meshes.map(m=>new Mesh(m.geometry,material));}};
}
