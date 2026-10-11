import {ACESFilmicToneMapping,AnimationMixer,Box3,Color,DirectionalLight,Fog,Group,HemisphereLight,Mesh,MeshStandardMaterial,MOUSE,PCFSoftShadowMap,PerspectiveCamera,Scene,SRGBColorSpace,Texture,Vector3,WebGLRenderer,type AnimationAction,type BufferGeometry,type Material} from 'three';
import {MapControls} from 'three/addons/controls/MapControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {mapResource} from '../resourceLoader';
import {createTerrain} from './terrain';
import {createScenery} from './scenery';
import {EXTENT,clamp,detailWeights,palettes,smooth,travelPose,views,type SampleSeason,type View} from './layout';

export async function mountArtSample(container:HTMLElement,report:(message:string)=>void){
 const renderer=new WebGLRenderer({antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(container.clientWidth,container.clientHeight);renderer.outputColorSpace=SRGBColorSpace;renderer.toneMapping=ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
 container.append(renderer.domElement);renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','独立地图样板，拖动平移，右键旋转，滚轮缩放；方向键平移，Q E 旋转');
 const scene=new Scene();scene.background=new Color(palettes.autumn.fog);scene.fog=new Fog(palettes.autumn.fog,125,340);
 const camera=new PerspectiveCamera(39,container.clientWidth/container.clientHeight,.25,750);
 camera.position.fromArray(views.middle.eye);
 const controls=new MapControls(camera,renderer.domElement);controls.target.fromArray(views.middle.target);controls.enableDamping=false;controls.minDistance=22;controls.maxDistance=260;controls.minPolarAngle=.015;controls.maxPolarAngle=1.18;controls.zoomSpeed=.8;controls.panSpeed=.7;controls.mouseButtons={LEFT:MOUSE.PAN,MIDDLE:MOUSE.DOLLY,RIGHT:MOUSE.ROTATE};controls.update();
 const hemi=new HemisphereLight('#c5d5dc','#595135',1.05),sun=new DirectionalLight(palettes.autumn.sun,2.6);sun.position.set(-65,95,45);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.near=1;sun.shadow.camera.far=350;sun.shadow.bias=-.00014;sun.shadow.normalBias=.025;sun.shadow.radius=2;scene.add(hemi,sun,sun.target);
 const composer=new EffectComposer(renderer),renderPass=new RenderPass(scene,camera),ao=new SSAOPass(scene,camera,container.clientWidth,container.clientHeight,12),output=new OutputPass();
 ao.kernelRadius=5;ao.minDistance=.0001;ao.maxDistance=.025;composer.addPass(renderPass);composer.addPass(ao);composer.addPass(output);
 let closed=false,frame=0,walking=false,last=0,walkTime=0,paper=0,paperTarget=0,dirty=true;
 let transition:{start:number;from:Vector3;to:Vector3;targetFrom:Vector3;targetTo:Vector3}|undefined;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let scenery:Awaited<ReturnType<typeof createScenery>>|undefined;
 const actors:{root:Group;mixer:AnimationMixer;idle?:AnimationAction;walk?:AnimationAction;offset:number;moving:boolean;weight:number}[]=[];
 const labels:{element:HTMLElement;point:Vector3;capital:boolean}[]=[];
 const dispose=()=>{
  if(closed)return;closed=true;cancelAnimationFrame(frame);observer.disconnect();controls.dispose();window.removeEventListener('pagehide',dispose);renderer.domElement.removeEventListener('keydown',keydown);
  actors.forEach(a=>{a.mixer.stopAllAction();a.mixer.uncacheRoot(a.root);});
  const geometries=new Set<BufferGeometry>(),materials=new Set<Material>(),textures=new Set<Texture>();
  scene.traverse(o=>{if(o instanceof Mesh){geometries.add(o.geometry);for(const material of Array.isArray(o.material)?o.material:[o.material]){materials.add(material);for(const value of Object.values(material))if(value instanceof Texture)textures.add(value);}}});
  geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());scenery?.dispose();ao.dispose();output.dispose();composer.dispose();renderer.dispose();renderer.domElement.remove();labels.forEach(l=>l.element.remove());
 };
 const observer=new ResizeObserver(()=>{if(closed)return;const w=container.clientWidth,h=container.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);composer.setSize(w,h);dirty=true;});observer.observe(container);
 function keydown(e:KeyboardEvent){
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','q','e','+','-','='].includes(e.key))return;e.preventDefault();transition=undefined;
  const distance=camera.position.distanceTo(controls.target),delta=new Vector3(e.key==='ArrowLeft'?-distance*.06:e.key==='ArrowRight'?distance*.06:0,0,e.key==='ArrowUp'?-distance*.06:e.key==='ArrowDown'?distance*.06:0);
  if(e.key==='q'||e.key==='e'){const offset=camera.position.clone().sub(controls.target).applyAxisAngle(new Vector3(0,1,0),e.key==='q'?-.18:.18);camera.position.copy(controls.target).add(offset);}else if(['+','=','-'].includes(e.key)){camera.position.sub(controls.target).multiplyScalar(e.key==='-'?1.15:1/1.15).add(controls.target);}else{controls.target.add(delta);camera.position.add(delta);}controls.update();dirty=true;
 }
 renderer.domElement.addEventListener('keydown',keydown);window.addEventListener('pagehide',dispose,{once:true});
 controls.addEventListener('start',()=>{transition=undefined;});controls.addEventListener('change',()=>{dirty=true;});
 try{
  const terrain=await createTerrain(report);if(closed){terrain.root.traverse(o=>{if(o instanceof Mesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}});throw new Error('样板已关闭');}scene.add(terrain.root);
  scenery=await createScenery(terrain,report);if(closed){scenery.dispose();throw new Error('样板已关闭');}scene.add(scenery.root);
  report('正在安置四名行旅与兵模…');
  const loader=new GLTFLoader(),paths=['han-male','han-female','xianbei-male','xianbei-female'].map(kind=>`art/campaign/travelers/${kind}-near.glb`);paths.push('art/military/spear-infantry-v2.glb');
  const models=await Promise.all(paths.map(async path=>loader.parseAsync(await mapResource(path).then(r=>r.arrayBuffer()),'')));
  if(closed)throw new Error('样板已关闭');
  models.forEach((model,i)=>{
   const body=model.scene,bounds=new Box3().setFromObject(body),height=bounds.max.y-bounds.min.y,root=new Group();
   // One world-space body scale for all five figures. No screen-size correction at zoom boundaries.
   if(!Number.isFinite(height)||height<=0)throw new Error('人物资产缺少有效尺寸');
   // Infantry and travelers are already authored in the same body units; do not normalize a spear into a human height.
   const scale=i<4?1.72/height:1;body.scale.setScalar(scale);body.position.y=-bounds.min.y*scale;root.add(body);
   body.traverse(o=>{if(o instanceof Mesh){o.castShadow=true;o.receiveShadow=true;for(const m of Array.isArray(o.material)?o.material:[o.material])m.transparent=true;}});
   const mixer=new AnimationMixer(body),idleClip=model.animations.find(c=>/idle/i.test(c.name)),walkClip=model.animations.find(c=>/walk|march/i.test(c.name));
   const idle=idleClip?mixer.clipAction(idleClip):undefined,walk=walkClip?mixer.clipAction(walkClip):undefined;idle?.play();walk?.play();walk?.setEffectiveWeight(0);mixer.update(0);
   const offset=.5+i*.40,p=terrain.walkPath.getPointAt(travelPose(0,offset).u);root.position.set(p.x,terrain.height(p.x,p.z)+.07,p.z);root.rotation.y=-.55;scene.add(root);actors.push({root,mixer,idle,walk,offset,moving:i<4,weight:0});
  });
  for(const town of terrain.cities){const element=document.createElement('div');element.className='sample-label';element.innerHTML=(town.id==='jiankang'?'<small>梁 · 都城</small>':'')+'<span></span>';element.querySelector('span')!.textContent=town.name;document.getElementById('sample-labels')!.append(element);labels.push({element,point:new Vector3(town.x,town.height+.8,town.z+5*town.scale),capital:town.id==='jiankang'});}
  const changeSeason=(value:SampleSeason)=>{terrain.colorize(value);scenery!.season(value);const p=palettes[value];terrain.water.color.set(p.water);sun.color.set(p.sun);sun.intensity=value==='winter'?2.25:2.6;hemi.color.set(value==='winter'?'#d7e1e6':'#c5d5dc');(scene.background as Color).set(p.fog);(scene.fog as Fog).color.set(p.fog);dirty=true;};
  const view=(value:View)=>{
   const v=views[value];paperTarget=value==='paper'?1:0;
   if(reduced.matches){camera.position.fromArray(v.eye);controls.target.fromArray(v.target);paper=paperTarget;controls.update();transition=undefined;}else transition={start:performance.now(),from:camera.position.clone(),to:new Vector3(...v.eye),targetFrom:controls.target.clone(),targetTo:new Vector3(...v.target)};
   dirty=true;
  };
  const projected=new Vector3();let lastShadowKey='';
  function render(now:number){
   if(closed)return;frame=requestAnimationFrame(render);const dt=last?Math.min(.05,(now-last)/1000):0;last=now;if(document.hidden)return;
   if(transition){const t=smooth(0,1,(now-transition.start)/1100);camera.position.lerpVectors(transition.from,transition.to,t);controls.target.lerpVectors(transition.targetFrom,transition.targetTo,t);controls.update();dirty=true;if(t===1)transition=undefined;}
   // Manual navigation retains geography and uses the same continuous material transition.
   const previousTarget=controls.target.clone();controls.target.x=clamp(controls.target.x,-EXTENT.width*.35,EXTENT.width*.35);controls.target.z=clamp(controls.target.z,-EXTENT.depth*.35,EXTENT.depth*.35);camera.position.add(controls.target.clone().sub(previousTarget));
   const distance=camera.position.distanceTo(controls.target);camera.lookAt(controls.target);camera.updateMatrixWorld();
   const nextPaper=paper+(paperTarget-paper)*Math.min(1,dt*5);if(Math.abs(nextPaper-paper)>.0001){paper=nextPaper;dirty=true;}terrain.paperBlend.value=paper;
   if(!reduced.matches){terrain.time.value=now*.001;dirty=true;}
   if(walking){walkTime+=dt;dirty=true;}
   const weights=detailWeights(distance);
   actors.forEach(a=>{
    const active=walking&&a.moving,{u,speed}=travelPose(walkTime,a.offset);
    a.weight+=((active?smooth(0,.35,Math.abs(speed)):0)-a.weight)*Math.min(1,dt*7);a.walk?.setEffectiveWeight(a.weight);a.idle?.setEffectiveWeight(1-a.weight);
    if(walking||a.weight>.001){a.mixer.update(dt);dirty=true;}
    if(active){const p=terrain.walkPath.getPointAt(u),t=terrain.walkPath.getTangentAt(u).multiplyScalar(speed<0?-1:1);a.root.position.set(p.x,terrain.height(p.x,p.z)+.07,p.z);const heading=Math.atan2(t.x,t.z),delta=Math.atan2(Math.sin(heading-a.root.rotation.y),Math.cos(heading-a.root.rotation.y));a.root.rotation.y+=delta*Math.min(1,dt*6);a.walk?.setEffectiveTimeScale(Math.max(.15,Math.abs(speed)));}
    a.root.visible=weights.units>.025&&paper<.9;
    a.root.traverse(o=>{if(o instanceof Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material]){if(m instanceof MeshStandardMaterial)m.opacity=weights.units*(1-paper);}});
   });
   if(!dirty)return;dirty=false;controls.update();
   scenery!.update(distance,paper);ao.enabled=distance<170&&paper<.4;
   const span=clamp(distance*.62,28,120);sun.target.position.copy(controls.target);sun.position.copy(controls.target).add(new Vector3(-65,95,45));Object.assign(sun.shadow.camera,{left:-span,right:span,top:span,bottom:-span});sun.shadow.camera.updateProjectionMatrix();
   const key=[...controls.target.toArray(),span].map(v=>v.toFixed(2)).join('|')+sun.color.getHex();renderer.shadowMap.needsUpdate=walking||key!==lastShadowKey;lastShadowKey=key;
   const fog=scene.fog as Fog;fog.near=Math.max(65,distance*.90);fog.far=Math.max(240,distance*2.3);
   composer.render();
   for(const label of labels){projected.copy(label.point).project(camera);const visible=projected.z>-1&&projected.z<1&&(label.capital||distance>65);label.element.hidden=!visible;if(visible){label.element.style.left=(projected.x*.5+.5)*container.clientWidth+'px';label.element.style.top=(-projected.y*.5+.5)*container.clientHeight+'px';label.element.style.color=paper>.5?'#293c30':'';label.element.style.textShadow=paper>.5?'0 1px 4px #e5dfc6':'';}}
  }
  frame=requestAnimationFrame(render);
  return {view,season:changeSeason,walk(enabled:boolean){walking=enabled;dirty=true;},dispose};
 }catch(error){dispose();throw error;}
}
