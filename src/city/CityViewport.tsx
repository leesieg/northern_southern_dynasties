import { ViewControl,type ViewAction } from '../ui/ViewControl';
import { useEffect,useRef,useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { cityBuildings,type CityBuilding,type CityHolding } from '../core/construction';
import { cityModelState,createCityModel,disposeCityModel } from './model';
import './city.css';
interface Props {holding:CityHolding;day:number;name:string;capital:boolean;selected:CityBuilding|null;onSelect:(id:CityBuilding)=>void}
interface View {update:(holding:CityHolding,day:number,capital:boolean,selected:CityBuilding|null)=>void;move:(action:string)=>void}
export default function CityViewport({holding,day,name,capital,selected,onSelect}:Props){
  const host=useRef<HTMLDivElement>(null),view=useRef<View|null>(null),select=useRef(onSelect);
  const [failure,setFailure]=useState(''),[retry,setRetry]=useState(0);
  select.current=onSelect;
  useEffect(()=>{
    const element=host.current!;
    let renderer:THREE.WebGLRenderer;
    try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});}catch{setFailure('无法启用城市 3D 视图。请检查浏览器图形加速，营建列表仍可使用。');return;}
    setFailure('');
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x1c2a26,1);element.appendChild(renderer.domElement);
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.1,120);
    const controls=new OrbitControls(camera,renderer.domElement);
    controls.enablePan=false;controls.minDistance=22;controls.maxDistance=55;
    controls.minPolarAngle=.25;controls.maxPolarAngle=Math.PI*.46;
    controls.target.set(0,.5,0);
    const reset=()=>{camera.position.set(24,26,30);controls.target.set(0,.5,0);controls.update();};
    reset();
    scene.add(new THREE.HemisphereLight(0xf3e7cc,0x465b50,2.6));
    const sun=new THREE.DirectionalLight(0xffe3ab,3.1);sun.position.set(-12,23,10);sun.castShadow=true;
    sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-15,right:15,top:15,bottom:-15,near:1,far:65});sun.shadow.bias=-.001;scene.add(sun);
    let model:THREE.Group|null=null,disposed=false,lost=false;
    const render=()=>{if(!disposed&&!lost)renderer.render(scene,camera);};
    controls.addEventListener('change',render);
    const resize=new ResizeObserver(()=>{const w=element.clientWidth,h=element.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);render();});resize.observe(element);
    const onLost=(event:Event)=>{event.preventDefault();lost=true;setFailure('城市 3D 视图已中断，可重新加载；营建数据不受影响。');};
    renderer.domElement.addEventListener('webglcontextlost',onLost);
    const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let down:{x:number;y:number}|null=null;
    const start=(event:PointerEvent)=>{down={x:event.clientX,y:event.clientY};};
    const cancel=()=>{down=null;};
    const pick=(event:PointerEvent)=>{
      if(event.button!==0||!down||Math.hypot(event.clientX-down.x,event.clientY-down.y)>5){down=null;return;}down=null;
      const bounds=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1);
      ray.setFromCamera(pointer,camera);
      if(!model)return;
      const hit=ray.intersectObject(model,true)[0];let object:THREE.Object3D|null=hit?.object??null;
      while(object){if(object.userData.building){select.current(object.userData.building as CityBuilding);break;}object=object.parent;}
    };
    renderer.domElement.addEventListener('pointerdown',start);renderer.domElement.addEventListener('pointerup',pick);renderer.domElement.addEventListener('pointercancel',cancel);
    view.current={
      update:(next,tick,isCapital,active)=>{if(model){scene.remove(model);disposeCityModel(model);}model=createCityModel(next,tick,isCapital,active);scene.add(model);render();},
      move:action=>{if(action==='reset')reset();else if(action==='left'||action==='right'){
        const offset=camera.position.clone().sub(controls.target);offset.applyAxisAngle(new THREE.Vector3(0,1,0),action==='left'?-.35:.35);camera.position.copy(controls.target).add(offset);
      }else {const offset=camera.position.clone().sub(controls.target);offset.setLength(THREE.MathUtils.clamp(offset.length()*(action==='in'?.85:1.15),22,55));camera.position.copy(controls.target).add(offset);}controls.update();render();},
    };
    return ()=>{disposed=true;view.current=null;resize.disconnect();controls.dispose();renderer.domElement.removeEventListener('webglcontextlost',onLost);renderer.domElement.removeEventListener('pointerdown',start);renderer.domElement.removeEventListener('pointerup',pick);renderer.domElement.removeEventListener('pointercancel',cancel);if(model)disposeCityModel(model);sun.shadow.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();};
  },[retry]);
  const signature=JSON.stringify(holding);
  // Rebuild only for saved building changes or an active project's progress, never for unrelated world ticks.
  const progressDay=holding.project?day:0;
  useEffect(()=>{view.current?.update(JSON.parse(signature) as CityHolding,progressDay,capital,selected);},[signature,progressDay,capital,selected,retry]);
  const parts=cityModelState(holding,day);
  return <section className="city-view" aria-label={`${name}城市立体模型`}>
    <header><span>城 池 营 造</span><small>{name} · 立体沙盘</small></header>
    <div className="city-viewport" ref={host} role="img" aria-label={`${name}城墙、街道及建筑。${parts.map(p=>`${cityBuildings[p.id].name}${p.level}级${p.progress!==null?'，施工中':''}`).join('；')}`}/>
    {failure&&<div className="city-view-error" role="alert">{failure}<button onClick={()=>setRetry(n=>n+1)}>重新加载模型</button></div>}
    <div className="city-view-controls" aria-label="城市模型视角">{(['left','right','out','in','reset'] as ViewAction[]).map(id=><ViewControl key={id} action={id} disabled={!!failure} onClick={()=>view.current?.move(id)}/>)}</div>
    <p className="city-view-hint">拖动旋转 · 滚轮缩放 · 点选营建地块</p>
    <div className="city-plot-register">{parts.map(p=><button key={p.id} data-city-building={p.id} aria-pressed={selected===p.id} onClick={()=>onSelect(p.id)}><strong>{cityBuildings[p.id].name}</strong><span>{p.progress!==null?`施工 · ${p.remaining}日`:p.level?`${p.level} / 3级`:'尚未营建'}</span>{p.progress!==null&&<progress aria-label={`${cityBuildings[p.id].name}施工进度`} value={p.progress} max={1}/>}</button>)}</div>

  </section>;
}
