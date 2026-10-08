import {Camera,Scene,WebGLRenderer,Matrix4,Vector3,Mesh,InstancedMesh,Group,Color,ACESFilmicToneMapping,HemisphereLight,DirectionalLight,AmbientLight,LinearSRGBColorSpace,type Material,type Texture} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MercatorCoordinate,type Map,type CustomLayerInterface} from 'maplibre-gl';
import {siteById} from '../../data/scenario';
import {positionMilitaryModel,updateMilitaryCamera} from '../militaryRendering';
import {landscapeSurface,loadLandscapeAtlas} from './landscape';
import {nearCampaignRoad} from '../CampaignEnvironment';
import {citySize,outsideCity,SAMPLE_CITIES,TREE_LIMIT,treeCandidates} from './presentation';

export function sampleLayer(report:(message:string)=>void):CustomLayerInterface{
 const scene=new Scene(),camera=new Camera(),origin=MercatorCoordinate.fromLngLat([110,34]);
 const anchor=new Matrix4().makeTranslation(origin.x,origin.y,0).scale(new Vector3(1,-1,1));
 const cities=new globalThis.Map<string,Group>(),trees:InstancedMesh[]=[],resources:Group[]=[];
 let map:Map,renderer:WebGLRenderer,disposed=false,dirty=true,timer:ReturnType<typeof setTimeout>|undefined,failed=false;
 let surfaceView='';

 const changed=()=>{dirty=true;map?.triggerRepaint();};
 const sourceChanged=(event:{sourceId?:string;isSourceLoaded?:boolean})=>{
  if(!['dem-terrain','natural'].includes(event.sourceId??'')||!event.isSourceLoaded||timer)return;
  timer=setTimeout(()=>{timer=undefined;changed();},300);
 };
 function refresh(){
  const centerAt=map.getCenter(),viewKey=[centerAt.lng.toFixed(4),centerAt.lat.toFixed(4),map.getZoom().toFixed(2),!!map.getTerrain()].join(':');
  if(map.getZoom()>=8.5&&map.isSourceLoaded('natural')&&map.isSourceLoaded('dem-terrain')&&viewKey!==surfaceView&&landscapeSurface(map))surfaceView=viewKey;
  for(const [id,root] of cities){
   const site=siteById[id],z=map.getTerrain()?map.queryTerrainElevation({lng:site.lon,lat:site.lat}):0;
   root.visible=z!==null&&map.getZoom()>=6.6;
   if(z===null)continue;
   const at=MercatorCoordinate.fromLngLat([site.lon,site.lat],z+2),scale=citySize(map.getZoom())/7.5*at.meterInMercatorCoordinateUnits();
   positionMilitaryModel(root.matrix,at,origin,scale);
  }
  for(const tree of trees)tree.count=0;
  if(map.getZoom()<8.3||!trees.length)return;
  const center=map.getCenter(),bounds=map.getBounds(),canvas=map.getCanvas(),matrix=new Matrix4();
  const masks=['woodland','ocean','inland-water','rivers-major','rivers-minor'].filter(id=>!!map.getLayer(id));
  let count=0;
  const borderTrees=SAMPLE_CITIES.flatMap(id=>{const s=siteById[id];return Array.from({length:36},(_,i)=>{
   const a=Math.floor(i/3)*Math.PI/6,r=.059+(i%3)*.0018;
   return {lon:s.lon+Math.cos(a)*r,lat:s.lat+Math.sin(a)*r*.8,size:100+(i%3)*28,ornamental:true};
  });});
  for(const p of [...borderTrees,...treeCandidates(center.lng,center.lat).map(p=>({...p,ornamental:false}))]){
   if(count>=TREE_LIMIT)break;
   if(!bounds.contains([p.lon,p.lat])||!outsideCity(p.lon,p.lat)||nearCampaignRoad(p.lon,p.lat))continue;
   const screen=map.project([p.lon,p.lat]);
   if(screen.x<0||screen.y<0||screen.x>canvas.clientWidth||screen.y>canvas.clientHeight)continue;
   const hits=map.queryRenderedFeatures([[screen.x-5,screen.y-5],[screen.x+5,screen.y+5]],{layers:masks});
   if((!p.ornamental&&!hits.some(f=>f.layer.id==='woodland'))||hits.some(f=>f.layer.id!=='woodland'))continue;
   const z=map.getTerrain()?map.queryTerrainElevation({lng:p.lon,lat:p.lat}):0,neighbor=map.getTerrain()?map.queryTerrainElevation({lng:p.lon+.001,lat:p.lat}):0;
   if(z===null||neighbor===null||Math.abs(z-neighbor)>30)continue;
   const at=MercatorCoordinate.fromLngLat([p.lon,p.lat],z),scale=p.size*at.meterInMercatorCoordinateUnits();
   positionMilitaryModel(matrix,at,origin,scale);
   for(const tree of trees){tree.setMatrixAt(count,matrix);tree.setColorAt(count,new Color('#d6d6ae'));tree.count=count+1;}
   count++;
  }
  for(const tree of trees){tree.instanceMatrix.needsUpdate=true;if(tree.instanceColor)tree.instanceColor.needsUpdate=true;}
 }
 return {id:'sample-models',type:'custom',renderingMode:'3d',onAdd(m,gl){
  map=m;renderer=new WebGLRenderer({canvas:m.getCanvas(),context:gl,antialias:true});renderer.autoClear=false;
  renderer.toneMapping=ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
  const sky=new HemisphereLight('#e5edee','#48513a',2.2);sky.position.set(0,0,1);
  const sun=new DirectionalLight('#ffe1a6',3.2);sun.position.set(-.8,-.6,1.4);
  scene.add(sky,sun,new AmbientLight('#e0dac4',.55));
  map.on('moveend',changed);map.on('sourcedata',sourceChanged);
  void loadLandscapeAtlas().then(()=>{if(!disposed)changed();}).catch(e=>{if(!disposed)report(String(e));});
  const loader=new GLTFLoader();
  void Promise.allSettled([loader.loadAsync(import.meta.env.BASE_URL+'art/map-sample/northern-city.glb'),loader.loadAsync(import.meta.env.BASE_URL+'art/map-sample/woodland-tree.glb')]).then(results=>{
   for(const result of results)if(result.status==='fulfilled')resources.push(result.value.scene);
   const [cityResult,forestResult]=results;
   if(cityResult.status==='rejected'||forestResult.status==='rejected'){release();throw new Error('城邑或林木资源未能载入');}
   const city=cityResult.value,forest=forestResult.value;
   city.scene.traverse(ob=>{if(ob instanceof Mesh)for(const m of Array.isArray(ob.material)?ob.material:[ob.material])if(m.map){m.map.colorSpace=LinearSRGBColorSpace;m.map.needsUpdate=true;}});
   if(disposed){release();return;}
   for(const id of SAMPLE_CITIES){const root=city.scene.clone(true);root.matrixAutoUpdate=false;root.visible=false;cities.set(id,root);scene.add(root);}
   forest.scene.updateMatrixWorld(true);
   forest.scene.traverse(ob=>{if(!(ob instanceof Mesh))return;const geometry=ob.geometry.clone().applyMatrix4(ob.matrixWorld),tree=new InstancedMesh(geometry,ob.material,TREE_LIMIT);tree.count=0;tree.frustumCulled=false;trees.push(tree);scene.add(tree);});
   report('模型已就绪');changed();
  }).catch(e=>{if(!disposed)report('模型加载失败，保留城邑定位：'+String(e));});
 },render(_gl,args){
  if(disposed||failed)return;
  try{
   if(dirty){refresh();dirty=false;}
   updateMilitaryCamera(camera,args.projectionMatrix,args.defaultProjectionData.mainMatrix,anchor);
   renderer.resetState();renderer.render(scene,camera);renderer.resetState();
  }catch(e){failed=true;renderer.resetState();report('模型渲染失败，保留地图操作：'+String(e));}
 },onRemove(){disposed=true;if(timer)clearTimeout(timer);map.off('moveend',changed);map.off('sourcedata',sourceChanged);release();renderer?.dispose();}};
 function release(){
  const materials=new Set<Material>(),textures=new Set<Texture>();
  for(const root of resources)root.traverse(ob=>{if(ob instanceof Mesh){ob.geometry.dispose();for(const m of Array.isArray(ob.material)?ob.material:[ob.material])materials.add(m);}});
  for(const m of materials){for(const value of Object.values(m))if(value&&typeof value==='object'&&'isTexture' in value)textures.add(value as Texture);m.dispose();}
  textures.forEach(t=>t.dispose());for(const t of trees){t.geometry.dispose();t.dispose();}resources.length=0;trees.length=0;
 }
}
