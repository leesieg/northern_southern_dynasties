import {createSeasonState,seasons,type Season} from './seasons';
import {mountConstructionPreview} from './constructionPreview';
import {ACESFilmicToneMapping,BufferGeometry,CatmullRomCurve3,CanvasTexture,Color,CylinderGeometry,DirectionalLight,DoubleSide,Float32BufferAttribute,Fog,Group,HemisphereLight,InstancedMesh,Mesh,MeshStandardMaterial,MOUSE,Object3D,PCFSoftShadowMap,PerspectiveCamera,PlaneGeometry,Scene,Sprite,SpriteMaterial,SRGBColorSpace,TextureLoader,Vector3,WebGLRenderer} from 'three';
import {armyHeraldry} from '../ArmyHeraldry';
import {MapControls} from 'three/addons/controls/MapControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {polities,siteById} from '../../data/scenario';
import {project,sampleHeight,seededRandom,segmentDistance,type River,type TerrainMetadata} from './geography';
import {fieldColors,terrainMaterial,waterMaterial} from './materials';

const BASE=import.meta.env.BASE_URL+'art/campaign/';
const cityIds=['changan','luoyang'] as const;
async function resource(path:string){const r=await fetch(BASE+path,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error(`${path}（${r.status}）`);return r;}
export async function mountCampaign(container:HTMLElement,report:(s:string)=>void){
 const renderer=new WebGLRenderer({antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(container.clientWidth,container.clientHeight);
 renderer.outputColorSpace=SRGBColorSpace;renderer.toneMapping=ACESFilmicToneMapping;renderer.toneMappingExposure=1.10;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
 container.append(renderer.domElement);renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','三维地图，方向键平移，Q E 旋转，加减号缩放');
 const season=createSeasonState();
 const scene=new Scene();scene.background=new Color('#bdc6c1');scene.fog=new Fog('#bdc6c1',140,440);
 const camera=new PerspectiveCamera(39,container.clientWidth/container.clientHeight,1,1500);
 const controls=new MapControls(camera,renderer.domElement);controls.enableDamping=false;controls.screenSpacePanning=false;
 controls.minDistance=24;controls.maxDistance=360;controls.minPolarAngle=.22;controls.maxPolarAngle=1.12;controls.zoomSpeed=.85;controls.panSpeed=.8;
 controls.mouseButtons={LEFT:MOUSE.PAN,MIDDLE:MOUSE.DOLLY,RIGHT:MOUSE.ROTATE};
 const sky=new HemisphereLight('#c5d5e6','#49432c',.66);scene.add(sky);
 const sun=new DirectionalLight('#ffe1ad',2.7);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);sun.shadow.bias=-.00025;sun.shadow.normalBias=.13;sun.shadow.camera.near=1;sun.shadow.camera.far=600;sun.shadow.radius=2;
 scene.add(sun,sun.target);
 const loader=new GLTFLoader();loader.setCrossOrigin('anonymous');
 let disposed=false,dirty=true,frame=0;let cleanupConstruction:(()=>void)|undefined;const auxiliaryTextures:CanvasTexture[]=[];
 const dispose=()=>{disposed=true;cleanupConstruction?.();cancelAnimationFrame(frame);controls.dispose();resize.disconnect();const geometries=new Set<BufferGeometry>(),materials=new Set<MeshStandardMaterial|SpriteMaterial>();scene.traverse(o=>{if(o instanceof Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}if(o instanceof Sprite)materials.add(o.material);});for(const g of geometries)g.dispose();for(const m of materials){m.map?.dispose();m.dispose();}for(const texture of auxiliaryTextures)texture.dispose();renderer.dispose();};
 const resize=new ResizeObserver(()=>{camera.aspect=container.clientWidth/container.clientHeight;camera.updateProjectionMatrix();renderer.setSize(container.clientWidth,container.clientHeight);dirty=true;});resize.observe(container);
 window.addEventListener('pagehide',dispose,{once:true});
 let loaded;
 try{
  loaded=await Promise.all([resource('terrain.json').then(r=>r.json()) as Promise<TerrainMetadata>,resource('elevation.bin').then(r=>r.arrayBuffer()),resource('rivers.json').then(r=>r.json()) as Promise<River[]>,...['terrain','city','tree-0','tree-1','tree-2','rocks'].map(async name=>loader.parseAsync(await resource(name+'.glb').then(r=>r.arrayBuffer()),BASE))]);
 }catch(e){dispose();throw e;}
 if(disposed)return;
 const [metadata,buffer,rivers,...models]=loaded;
 const meta=metadata as TerrainMetadata,elevations=new Float32Array(buffer as ArrayBuffer),riverData=rivers as River[];
 if(elevations.length!==meta.rows*meta.columns){dispose();throw new Error('高程文件不完整');}
 const [terrainAsset,cityAsset,...natureAssets]=models;
 const cities=cityIds.map(id=>({id,...project(siteById[id].lon,siteById[id].lat,meta),height:0}));
 const measured=(x:number,z:number)=>sampleHeight(elevations,meta,x,z);
 for(const c of cities)c.height=measured(c.x,c.z);
 // Snap the coarse public river centreline to the measured valley, then cut a shallow channel.
 type RiverSegment={a:{x:number;z:number;y:number};b:{x:number;z:number;y:number};width:number};
 const riverSegments:RiverSegment[]=[],riverPaths:{points:{x:number;z:number;y:number}[];width:number}[]=[];
 for(const river of riverData){
  const source=river.points.map(([lon,lat])=>project(lon,lat,meta)),points:{x:number;z:number;y:number}[]=[];
  for(let i=0;i<source.length;i++){
   const p=source[i],a=source[Math.max(0,i-1)],b=source[Math.min(source.length-1,i+1)],len=Math.hypot(b.x-a.x,b.z-a.z)||1;
   let best={...p,y:measured(p.x,p.z)};
   for(let k=-6;k<=6;k++){const x=p.x-(b.z-a.z)/len*k*.22,z=p.z+(b.x-a.x)/len*k*.22,y=measured(x,z);if(y<best.y)best={x,z,y};}
   points.push(best);
  }
  const heights=points.map(p=>p.y);
  points.forEach((p,i)=>{const window=heights.slice(Math.max(0,i-2),i+3);p.y=Math.min(p.y,window.reduce((n,v)=>n+v,0)/window.length);});
  const width=river.name==='Huang'?1.05:river.name==='Wei'?.57:.28;
  const curve=new CatmullRomCurve3(points.map(p=>new Vector3(p.x,p.y,p.z)),false,'centripetal');
  const smooth=curve.getPoints(Math.max(2,Math.ceil(curve.getLength()/.65))).map(p=>({x:p.x,y:p.y,z:p.z}));
  for(let i=1;i<smooth.length;i++)riverSegments.push({a:smooth[i-1],b:smooth[i],width});
  riverPaths.push({points:smooth,width});
 }
 const riverCells=new Map<string,RiverSegment[]>();
 for(const seg of riverSegments)for(let x=Math.floor(Math.min(seg.a.x,seg.b.x)/8)-1;x<=Math.floor(Math.max(seg.a.x,seg.b.x)/8)+1;x++)for(let z=Math.floor(Math.min(seg.a.z,seg.b.z)/8)-1;z<=Math.floor(Math.max(seg.a.z,seg.b.z)/8)+1;z++){const key=x+','+z,cell=riverCells.get(key)??[];cell.push(seg);riverCells.set(key,cell);}
 const riverAt=(x:number,z:number)=>riverCells.get(Math.floor(x/8)+','+Math.floor(z/8))??[];
 function ground(x:number,z:number){
  let y=measured(x,z);
  for(const seg of riverAt(x,z)){
   const distance=segmentDistance(x,z,seg.a,seg.b),radius=seg.width*.5+2;if(distance>radius)continue;
   const dx=seg.b.x-seg.a.x,dz=seg.b.z-seg.a.z,t=Math.max(0,Math.min(1,((x-seg.a.x)*dx+(z-seg.a.z)*dz)/(dx*dx+dz*dz||1)));
   const level=seg.a.y*(1-t)+seg.b.y*t-.16,blend=1-Math.max(0,(distance-seg.width*.5-.8)/1.2);
   y=Math.min(y,y*(1-blend)+level*blend);
  }
  for(const c of cities){const d=Math.max(Math.abs(x-c.x)/10.5,Math.abs(z-c.z)/7);if(d<1.3){const t=Math.max(0,Math.min(1,(d-1)/.3));const v=t*t*(3-2*t);y=c.height*(1-v)+y*v;}}
  return y;
 }
 const terrain=terrainAsset.scene;
 terrain.traverse(ob=>{if(!(ob instanceof Mesh))return;
  // glTF Y-up is baked by Blender into the node transform; operate in world coordinates.
  ob.updateWorldMatrix(true,false);ob.geometry=ob.geometry.clone().applyMatrix4(ob.matrixWorld);ob.position.set(0,0,0);ob.rotation.set(0,0,0);ob.scale.set(1,1,1);
  const p=ob.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,ground(p.getX(i),p.getZ(i)));p.needsUpdate=true;ob.geometry.computeVertexNormals();ob.geometry.computeBoundingSphere();
  ob.material=terrainMaterial(undefined,season);ob.castShadow=true;ob.receiveShadow=true;
 });scene.add(terrain);
 report('山河已展开，正在布置河流与城邑…');
 function ribbon(points:{x:number;z:number;y?:number}[],width:number,material:MeshStandardMaterial,offset:number){
  const positions:number[]=[],indices:number[]=[],uv:number[]=[];
  for(let i=0;i<points.length;i++){
   const p=points[i],a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],len=Math.hypot(b.x-a.x,b.z-a.z)||1;
   const dx=-(b.z-a.z)/len*width/2,dz=(b.x-a.x)/len*width/2;
   for(const side of [-1,1]){const x=p.x+dx*side,z=p.z+dz*side;positions.push(x,(p.y??ground(x,z))+offset,z);uv.push(side===-1?0:1,i*.2);}
   if(i>0){const n=i*2;indices.push(n-2,n,n-1,n-1,n,n+1);}
  }
  const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(positions,3));g.setAttribute('uv',new Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();const mesh=new Mesh(g,material);mesh.receiveShadow=true;scene.add(mesh);return mesh;
 }
 const water=waterMaterial(),bank=new MeshStandardMaterial({color:'#a5a084',roughness:1,side:DoubleSide});
 for(const river of riverPaths){
  const points:{x:number;z:number;y:number}[]=[];
  for(let i=1;i<river.points.length;i++){const a=river.points[i-1],b=river.points[i],steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.25);for(let j=0;j<steps;j++){const t=j/steps;points.push({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,y:a.y+(b.y-a.y)*t});}}
  points.push(river.points.at(-1)!);ribbon(points,river.width+.22,bank,.025);ribbon(points,river.width,water,.085);
 }
 const nearRiver=(x:number,z:number,margin:number)=>riverAt(x,z).some(s=>segmentDistance(x,z,s.a,s.b)<s.width/2+margin);
 const labels:{button:HTMLButtonElement;anchor:Vector3}[]=[],flags:Mesh[]=[];
 const flagLoader=new TextureLoader();
 const countryFlags=await Promise.all(cities.map(c=>{const realm=siteById[c.id].polity;return flagLoader.loadAsync(armyHeraldry(realm,polities[realm].name));}));
 countryFlags.forEach(t=>{t.colorSpace=SRGBColorSpace;});
 if(disposed){countryFlags.forEach(t=>t.dispose());return;}

 for(const [cityIndex,c] of cities.entries()){
  const root=cityAsset.scene.clone(true);root.position.set(c.x,c.height+.05,c.z);scene.add(root);
  root.traverse(ob=>{if(ob instanceof Mesh){ob.castShadow=true;ob.receiveShadow=true;}});
  const pole=new Mesh(new CylinderGeometry(.045,.065,7,8),new MeshStandardMaterial({color:'#49412b',roughness:.8}));pole.position.set(c.x+6.8,c.height+3.5,c.z-1);pole.castShadow=true;scene.add(pole);
  const cloth=new Mesh(new PlaneGeometry(2.30,2.83,12,16),new MeshStandardMaterial({map:countryFlags[cityIndex],transparent:true,alphaTest:.12,roughness:.95,side:DoubleSide}));cloth.position.set(c.x+6.8,c.height+5.7,c.z-1);cloth.castShadow=true;scene.add(cloth);flags.push(cloth);
  const button=document.createElement('button');button.className='city-label';const site=siteById[c.id];
  button.innerHTML='<span class="city-medallion" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M4 14 16 5l12 9H4Zm3 2h18v12h-7v-7h-4v7H7Z" fill="currentColor"/><path d="M3 29h26M6 14v-3m20 3v-3" fill="none" stroke="currentColor" stroke-width="2"/></svg></span><span class="city-caption"><strong></strong><small></small></span>';
  button.querySelector('strong')!.textContent=site.name;button.querySelector('small')!.textContent=polities[site.polity].name+' · '+(site.capital?'都城':'城邑');
  button.setAttribute('aria-label','定位'+site.name+'，'+polities[site.polity].name);button.title=site.name+' · '+polities[site.polity].name;button.dataset.site=c.id;button.addEventListener('click',()=>focus(c.id));document.querySelector('#labels')!.append(button);labels.push({button,anchor:new Vector3(c.x,c.height+.7,c.z+10)});
 }
 // Small farm parcels and paths form inhabited basins. These are art placements, not history data.
 const random=seededRandom(546);
 const fieldCanvas=document.createElement('canvas');fieldCanvas.width=2048;fieldCanvas.height=1024;const fg=fieldCanvas.getContext('2d')!;
 for(const [cityIndex,c] of cities.entries()){
  for(let ix=-10;ix<=10;ix++)for(let iz=-10;iz<=10;iz++){
   const x=c.x+ix*2.9,z=c.z+iz*2.5,w=2.3+random()*.4,d=1.5+random()*.7;
   if(Math.abs(x-c.x)<11&&Math.abs(z-c.z)<7.5||nearRiver(x,z,1.5)||Math.abs(ground(x+w,z)-ground(x-w,z))>.65||Math.hypot(ix,iz)>11||random()<.26)continue;
   const px=cityIndex*1024+(x-c.x+35)/70*1024,py=(z-c.z+35)/70*1024,pw=w/70*1024,ph=d/70*1024;
   fg.save();fg.beginPath();fg.moveTo(px-pw/2,py-ph/2+random()*2);fg.lineTo(px+pw/2,py-ph/2+random()*3);fg.lineTo(px+pw/2-random()*3,py+ph/2);fg.lineTo(px-pw/2+random()*2,py+ph/2-random()*2);fg.closePath();fg.clip();
   fg.fillStyle=fieldColors[Math.floor(random()*fieldColors.length)].getStyle();fg.fillRect(px-pw/2,py-ph/2,pw,ph);
   fg.fillStyle='rgba(44,61,21,.17)';for(let row=0;row<ph;row+=3)fg.fillRect(px-pw/2,py-ph/2+row,pw,1);
   fg.strokeStyle='rgba(176,167,107,.7)';fg.lineWidth=1.2;fg.stroke();fg.restore();
  }
  const road=new MeshStandardMaterial({color:'#b0a084',roughness:1,side:DoubleSide});
  for(const [dx,dz] of [[0,27],[-25,9],[24,10]]){
   const points=Array.from({length:160},(_,i)=>({x:c.x+dx*i/159+Math.sin(i/159*Math.PI)*1.2,z:c.z+5.4+dz*i/159}));ribbon(points,.21,road,.10);
  }
 }
 const farmAtlas=new CanvasTexture(fieldCanvas);auxiliaryTextures.push(farmAtlas);farmAtlas.colorSpace=SRGBColorSpace;farmAtlas.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 terrain.traverse(ob=>{if(ob instanceof Mesh){(ob.material as MeshStandardMaterial).dispose();ob.material=terrainMaterial({map:farmAtlas,centers:cities},season);}});
 const waterNearby=(x:number,z:number)=>riverAt(x,z).some(s=>segmentDistance(x,z,s.a,s.b)<s.width/2+.6);
 const placements:{x:number;y:number;z:number;scale:number;rotation:number}[][]=[[],[],[]],rocks:typeof placements[0]=[];
 for(let i=0;i<100000;i++){
  const x=(meta.west-meta.originLon)*meta.lonScale+random()*(meta.east-meta.west)*meta.lonScale,z=(meta.originLat-meta.north)*meta.latScale+random()*(meta.north-meta.south)*meta.latScale;
  if(x<-262||x>280||z<-119||z>130)continue;
  const y=ground(x,z),slope=Math.hypot(ground(x+.7,z)-y,ground(x,z+.7)-y)/.7;
  if(cities.some(c=>Math.abs(x-c.x)<11.5&&Math.abs(z-c.z)<8)||waterNearby(x,z))continue;
  const patch=(Math.sin(x*.14+Math.sin(z*.17))*Math.cos(z*.09-x*.025)+1)/2;
  if(y>8&&slope>1.05&&random()<.06){rocks.push({x,y:y-.2,z,scale:.4+random()*.75,rotation:random()*Math.PI*2});continue;}
  if(slope>1.8||random()>(y>6?.78:.29)*patch)continue;
  const type=Math.floor(random()*3);if(placements.reduce((n,p)=>n+p.length,0)>=meta.treeBudget)break;
  for(let k=0;k<4&&placements.reduce((n,p)=>n+p.length,0)<meta.treeBudget;k++){
   const xx=x+(random()-.5)*2.2,zz=z+(random()-.5)*2.2;
   if(waterNearby(xx,zz)||cities.some(c=>Math.abs(xx-c.x)<11.5&&Math.abs(zz-c.z)<8))continue;
   placements[type].push({x:xx,y:ground(xx,zz),z:zz,scale:.6+random()*.85,rotation:random()*Math.PI*2});
  }
 }
 function instances(root:Group,places:typeof rocks){
  root.updateMatrixWorld(true);root.traverse(ob=>{if(!(ob instanceof Mesh))return;
   const geometry=ob.geometry.clone().applyMatrix4(ob.matrixWorld),instanced=new InstancedMesh(geometry,ob.material,places.length),dummy=new Object3D();
   places.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.scale.setScalar(p.scale);dummy.rotation.set(0,p.rotation,0);dummy.updateMatrix();instanced.setMatrixAt(i,dummy.matrix);instanced.setColorAt(i,new Color().setRGB(.82+random()*.3,.86+random()*.24,.72+random()*.25));});
   instanced.castShadow=true;instanced.receiveShadow=true;instanced.computeBoundingSphere();scene.add(instanced);
  });
 }
 placements.forEach((p,i)=>instances(natureAssets[i].scene,p));instances(natureAssets[3].scene,rocks);
 // Restrained, static valley mist. Perspective depth fog supplies the distant atmosphere.
 const mistCanvas=document.createElement('canvas');mistCanvas.width=128;mistCanvas.height=64;const mg=mistCanvas.getContext('2d')!;const gradient=mg.createRadialGradient(64,32,1,64,32,63);gradient.addColorStop(0,'rgba(228,232,215,.22)');gradient.addColorStop(.45,'rgba(228,232,215,.10)');gradient.addColorStop(1,'rgba(228,232,215,0)');mg.fillStyle=gradient;mg.fillRect(0,0,128,64);const mistMap=new CanvasTexture(mistCanvas);
 for(let i=0;i<55;i++){const x=-250+random()*520,z=-95+random()*210,y=ground(x,z);if(y<6)continue;const sprite=new Sprite(new SpriteMaterial({map:mistMap,transparent:true,opacity:.56,depthWrite:false}));sprite.position.set(x,y+1,z);sprite.scale.set(18+random()*17,3+random()*3,1);scene.add(sprite);}
 const selected=(id:string)=>{document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===id)));for(const l of labels)l.button.setAttribute('aria-current',String(l.button.dataset.site===id));};
 let targetFlight:{from:Vector3;to:Vector3;fromCamera:Vector3;toCamera:Vector3;start:number;frames:number}|undefined;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function focus(id:string,immediate=false){
  const c=cities.find(c=>c.id===id);const target=c?new Vector3(c.x,c.height,c.z-3):new Vector3(0,5,0);
  const offset=c?new Vector3(38,58,73):new Vector3(38,193,232);const next=target.clone().add(offset);
  if(immediate||reduced){controls.target.copy(target);camera.position.copy(next);controls.update();targetFlight=undefined;}else targetFlight={from:controls.target.clone(),to:target,fromCamera:camera.position.clone(),toCamera:next,start:performance.now(),frames:0};
  selected(id);dirty=true;
 }
 document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.addEventListener('click',()=>focus(b.dataset.view!)));
 document.querySelector('#reset')!.addEventListener('click',()=>focus('luoyang'));
 function rotate(angle:number){targetFlight=undefined;const offset=camera.position.clone().sub(controls.target);offset.applyAxisAngle(new Vector3(0,1,0),angle);camera.position.copy(controls.target).add(offset);controls.update();dirty=true;}
 function zoom(factor:number){targetFlight=undefined;const offset=camera.position.clone().sub(controls.target),distance=Math.max(controls.minDistance,Math.min(controls.maxDistance,offset.length()*factor));offset.setLength(distance);camera.position.copy(controls.target).add(offset);controls.update();dirty=true;}
 document.querySelector('#rotate')!.addEventListener('click',()=>rotate(.30));document.querySelector('#zoom-in')!.addEventListener('click',()=>zoom(.8));document.querySelector('#zoom-out')!.addEventListener('click',()=>zoom(1.25));
 renderer.domElement.addEventListener('keydown',e=>{
  if(e.key==='q'||e.key==='Q')rotate(-.15);else if(e.key==='e'||e.key==='E')rotate(.15);else if(e.key==='+'||e.key==='=')zoom(.85);else if(e.key==='-')zoom(1.18);else if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){
   const forward=controls.target.clone().sub(camera.position);forward.y=0;forward.normalize();const right=new Vector3(-forward.z,0,forward.x),amount=camera.position.distanceTo(controls.target)*.035;
   const d=(e.key==='ArrowUp'?forward:e.key==='ArrowDown'?forward.negate():e.key==='ArrowRight'?right:right.negate()).multiplyScalar(amount);camera.position.add(d);controls.target.add(d);targetFlight=undefined;controls.update();dirty=true;
  }else return;e.preventDefault();
 });
 controls.addEventListener('start',()=>{targetFlight=undefined;});controls.addEventListener('change',()=>{dirty=true;});
 report('正在装配营建模型…');
 try{cleanupConstruction=await mountConstructionPreview(scene,camera,renderer,cities,site=>{focus(site,true);camera.position.sub(controls.target).multiplyScalar(.65).add(controls.target);controls.update();},()=>{season.sync(scene);dirty=true;});}catch(error){dispose();throw error;}
 if(disposed){cleanupConstruction();return;}
 const seasonControls=document.querySelector<HTMLElement>('.season-controls')!;
 function applySeason(value:Season){
  const p=seasons[value];season.set(value);season.sync(scene);
  (scene.background as Color).set(p.fog);(scene.fog as Fog).color.set(p.fog);
  sun.color.set(p.sun);sun.intensity=p.intensity;sky.color.set(p.sky);
  scene.traverse(o=>{if(o instanceof Mesh){for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof MeshStandardMaterial&&m.name==='Campaign river')m.color.set(p.water);}});
  seasonControls.querySelectorAll<HTMLButtonElement>('[data-season]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.season===value)));
  seasonControls.querySelector<HTMLElement>('.season-description')!.textContent=p.description;
  container.dataset.season=value;dirty=true;
 }
 seasonControls.querySelectorAll<HTMLButtonElement>('[data-season]').forEach(b=>{b.disabled=false;b.addEventListener('click',()=>applySeason(b.dataset.season as Season));});
 applySeason('summer');
 focus('luoyang',true);
 let resolveReady:()=>void,rejectReady:(e:unknown)=>void;
 const ready=new Promise<void>((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});let firstFrame=true;
 renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();cancelAnimationFrame(frame);report('图形上下文丢失，请重新加载');document.querySelector('#notice')!.classList.remove('ready');document.querySelector<HTMLButtonElement>('#retry')!.hidden=false;});
 let last=0;
 function render(now:number){
  if(disposed)return;frame=requestAnimationFrame(render);
  if(targetFlight){const f=targetFlight;f.frames++;const t=Math.min(1,(now-f.start)/900),v=t*t*(3-2*t);controls.target.lerpVectors(f.from,f.to,v);camera.position.lerpVectors(f.fromCamera,f.toCamera,v);controls.update();dirty=true;if(t===1){container.dataset.flightFps=(f.frames/((now-f.start)/1000)).toFixed(1);targetFlight=undefined;}}
  if(!dirty&&(reduced||now-last<66))return;last=now;
  const before=controls.target.clone();controls.target.x=Math.max(-245,Math.min(255,controls.target.x));controls.target.z=Math.max(-105,Math.min(115,controls.target.z));controls.target.y=ground(controls.target.x,controls.target.z);
  camera.position.add(controls.target.clone().sub(before));camera.position.y=Math.max(camera.position.y,ground(camera.position.x,camera.position.z)+7);camera.lookAt(controls.target);
  const distance=camera.position.distanceTo(controls.target),shadowSize=Math.max(55,Math.min(290,distance*.9));
  sun.position.copy(controls.target).add(new Vector3(-135,130,80));sun.target.position.copy(controls.target);const sc=sun.shadow.camera;sc.left=-shadowSize;sc.right=shadowSize;sc.top=shadowSize;sc.bottom=-shadowSize;sc.updateProjectionMatrix();
  (scene.fog as Fog).near=distance*.8;(scene.fog as Fog).far=distance*2.6;
  if(!reduced)for(const flag of flags){const p=flag.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,Math.sin(p.getX(i)*2.8+p.getY(i)*1.8+now*.0013)*.13*(1.415-p.getY(i))/2.83);p.needsUpdate=true;flag.geometry.computeVertexNormals();}
  camera.updateMatrixWorld();
  for(const {button,anchor} of labels){const p=anchor.clone().project(camera),inView=p.z>-1&&p.z<1&&Math.abs(p.x)<1.1&&Math.abs(p.y)<1.15;button.hidden=!inView;if(inView)button.style.transform=`translate(${(p.x*.5+.5)*container.clientWidth}px,${(-p.y*.5+.5)*container.clientHeight}px) translate(-50%,-100%) scale(${Math.max(.65,Math.min(1,135/distance))})`;}
  try{renderer.shadowMap.needsUpdate=dirty;renderer.render(scene,camera);dirty=false;
   if(firstFrame){firstFrame=false;container.dataset.ready='true';report('山河已就绪');resolveReady();}
  }catch(error){cancelAnimationFrame(frame);report('地图渲染失败：'+String(error));document.querySelector('#notice')!.classList.remove('ready');document.querySelector<HTMLButtonElement>('#retry')!.hidden=false;rejectReady(error);}

 }
 frame=requestAnimationFrame(render);
 // Inspectable operational metrics, no game-state mirror.
 container.dataset.renderer='three-campaign';container.dataset.trees=String(placements.reduce((n,p)=>n+p.length,0));container.dataset.terrainVertices=String(meta.columns*meta.rows);
 return ready;
}
