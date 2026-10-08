import {Box3,BufferGeometry,Color,CylinderGeometry,DoubleSide,Float32BufferAttribute,Group,Mesh,MeshStandardMaterial,PlaneGeometry,SRGBColorSpace,TextureLoader,type Texture} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {campaignCityKey,MAX_CITY_GEOMETRIES,type CampaignCityAppearance,type CityDetail} from './campaignScenery';

const modules=['city','tree-0',...['market','granary','hostel'].flatMap(b=>[1,2,3].map(level=>`${b}-${level}`)),...['worksite-0','worksite-1','worksite-2']];
export async function loadCampaignSampleAssets(){
 const loader=new GLTFLoader();
 const models=await Promise.all(modules.map(async name=>{
  const response=await fetch(import.meta.env.BASE_URL+'art/campaign/'+name+'.glb',{signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error(`${name} 模型加载失败（${response.status}）`);
  return [name,(await loader.parseAsync(await response.arrayBuffer(),'')).scene] as const;
 }));
 return sampleCampaignAssets(new Map(models));
}
/** Bake the approved Blender modules to one draw call per settlement; no legacy city fallback. */
export function sampleCampaignAssets(models:Map<string,Group>){
 const material=new MeshStandardMaterial({name:'Campaign city',vertexColors:true,roughness:.94,side:DoubleSide});
 const templates=new Map<string,BufferGeometry>(),geometries=new Map<string,BufferGeometry>();
 const base=models.get('city')!;base.updateMatrixWorld(true);const bounds=new Box3().setFromObject(base),scale=17/(bounds.max.x-bounds.min.x);
 for(const [name,model] of models){
  model.updateMatrixWorld(true);const pieces:BufferGeometry[]=[],scaffolds:BufferGeometry[]=[];
  model.traverse(o=>{if(!(o instanceof Mesh))return;const m=(Array.isArray(o.material)?o.material[0]:o.material) as MeshStandardMaterial;
   const g=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(o.matrixWorld),position=g.getAttribute('position'),old=g.getAttribute('color'),values:number[]=[],ground:number[]=[];
   for(let i=0;i<position.count;i++){
    const c=m.color.clone();if(old)c.multiply(new Color().setRGB(old.getX(i),old.getY(i),old.getZ(i)));values.push(c.r,c.g,c.b);
    // The city core stays rigid. Courtyard skin follows the DEM; modules anchor at their actual lot.
    ground.push(m.name.startsWith('Courtyard earth')?position.getX(i):0,m.name.startsWith('Courtyard earth')?position.getZ(i):0);
   }
   for(const key of Object.keys(g.attributes))if(!['position','normal'].includes(key))g.deleteAttribute(key);
   g.setAttribute('color',new Float32BufferAttribute(values,3));g.setAttribute('ground',new Float32BufferAttribute(ground,2));pieces.push(g);if(name.startsWith('worksite-')&&! /^(Lime plaster|Slate tile)/.test(m.name))scaffolds.push(g.clone());
  });
  const geometry=mergeGeometries(pieces)!;pieces.forEach(g=>g.dispose());templates.set(name,geometry);if(scaffolds.length){templates.set(name.replace('worksite-','upgrade-'),mergeGeometries(scaffolds)!);scaffolds.forEach(g=>g.dispose());}
 }
 const poles=new CylinderGeometry(.035,.035,3.5,6).translate(0,1.75,0),poleMaterial=new MeshStandardMaterial({color:'#665941',roughness:1});
 const flagGeometry=new PlaneGeometry(1.25,1.54).translate(.63,2.7,0),flags=new Map<string,MeshStandardMaterial>(),textureLoader=new TextureLoader();let disposed=false;
 function city(a:CampaignCityAppearance,detail:CityDetail='regional',flagUrl?:string,repaint?:()=>void){
  const key=campaignCityKey(a)+':'+detail;let geometry=geometries.get(key);
  if(!geometry){
   const parts=[templates.get('city')!.clone()];
   ['market','granary','hostel'].forEach((name,i)=>{
    const x=(i-1)*3.8,z=2.5;
    const add=(id:string)=>{const g=templates.get(id)!.clone().translate(x,0,z),ground=g.getAttribute('ground');for(let j=0;j<ground.count;j++)ground.setXY(j,x,z);parts.push(g);};
    if(a.levels[i])add(name+'-'+a.levels[i]);
    if(a.project===i)add((a.levels[i]?'upgrade-':'worksite-')+Math.min(2,Math.floor(a.progress*3/4)));
   });
   geometry=mergeGeometries(parts)!;parts.forEach(g=>g.dispose());geometry.scale(scale,scale,scale);const ground=geometry.getAttribute('ground');for(let i=0;i<ground.count;i++)ground.setXY(i,ground.getX(i)*scale,ground.getY(i)*scale);geometry.setIndex(Array.from({length:geometry.getAttribute('position').count},(_,i)=>i));geometry.computeBoundingSphere();geometries.set(key,geometry);
  }
  const root=new Group();root.add(new Mesh(geometry,material));const pole=new Mesh(poles,poleMaterial);pole.position.set(-1,0,4);root.add(pole);
  if(flagUrl){let flag=flags.get(flagUrl);if(!flag){flag=new MeshStandardMaterial({transparent:true,opacity:0,alphaTest:.15,side:DoubleSide,roughness:1});flags.set(flagUrl,flag);const target=flag;textureLoader.load(flagUrl,(texture:Texture)=>{if(disposed||flags.get(flagUrl)!==target){texture.dispose();return;}texture.colorSpace=SRGBColorSpace;target.map=texture;target.opacity=1;target.needsUpdate=true;repaint?.();},undefined,()=>{target.opacity=0;repaint?.();});}const banner=new Mesh(flagGeometry,flag);banner.position.copy(pole.position);root.add(banner);}
  return root;
 }
 function prune(active:Set<string>,activeFlags:Set<string>=new Set()){for(const [url,m] of flags){if(flags.size<=32)break;if(!activeFlags.has(url)){m.map?.dispose();m.dispose();flags.delete(url);}}for(const [key,g] of geometries){if(geometries.size<=MAX_CITY_GEOMETRIES)break;if(!active.has(key)){g.dispose();geometries.delete(key);}}}
 function dispose(){disposed=true;for(const g of [...templates.values(),...geometries.values()])g.dispose();material.dispose();poles.dispose();poleMaterial.dispose();flagGeometry.dispose();for(const m of flags.values()){m.map?.dispose();m.dispose();}for(const root of models.values())root.traverse(o=>{if(o instanceof Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});}
 return {city,prune,dispose,tree:templates.get('tree-0')!};
}
