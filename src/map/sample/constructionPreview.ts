import {BoxGeometry,EdgesGeometry,LineBasicMaterial,LineSegments,Group,Mesh,MeshStandardMaterial,Raycaster,Vector2,type Camera,type Scene,type WebGLRenderer} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import type {World} from '../../core/types';
import {cityBuildings,type CityBuilding} from '../../core/construction';
import {siteById} from '../../data/scenario';
import {advanceDemoConstruction,buildingAppearance,constructionQuote,DEMO_BUILDINGS,newConstructionDemo,startDemoConstruction} from './constructionState';

export async function mountConstructionPreview(scene:Scene,camera:Camera,renderer:WebGLRenderer,cities:{id:string;x:number;z:number;height:number}[],focus:(site:string)=>void,changed:()=>void,external?:{world:World;changed:(world:World)=>void}){
 const fresh=()=>newConstructionDemo(cities.map(c=>c.id));
 let world=external?.world??newConstructionDemo(),selectedSite=cities.some(c=>c.id==='luoyang')?'luoyang':cities[0].id,selectedBuilding:CityBuilding='market';
 const names=[...DEMO_BUILDINGS.flatMap(b=>[1,2,3].map(n=>b+'-'+n)),...['worksite-0','worksite-1','worksite-2']],loader=new GLTFLoader();
 const assets=await Promise.all((external?[]:names).map(async name=>{const path=import.meta.env.BASE_URL+'art/campaign/'+name+'.glb',response=await fetch(path,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error('营建模型未能加载：'+name);return (await loader.parseAsync(await response.arrayBuffer(),'')).scene;}));
 const templates=new Map(names.map((name,i)=>[name,assets[i]]));
 const outlineGeometry=new EdgesGeometry(new BoxGeometry(3,.02,3.1)),outlineMaterial=new LineBasicMaterial({color:'#e2bd71'});
 const lots=(external?[]:cities).flatMap(city=>DEMO_BUILDINGS.map((building,i)=>{const group=new Group();group.position.set(city.x+(i-1)*3.8,city.height+.08,city.z+2.5);scene.add(group);const outline=new LineSegments(outlineGeometry,outlineMaterial);outline.position.copy(group.position);outline.position.y+=.13;scene.add(outline);return {city:city.id,building,group,outline,key:''};}));
 const plotGeometry=new BoxGeometry(2.7,.055,2.6),plotMaterial=new MeshStandardMaterial({color:'#77714f',roughness:1});
 const hitGeometry=new BoxGeometry(2.9,2.6,3),hitMaterial=new MeshStandardMaterial({visible:false});
 const hitTargets=lots.map(lot=>{const hit=new Mesh(hitGeometry,hitMaterial);hit.position.copy(lot.group.position);hit.position.y+=1.2;hit.userData={site:lot.city,building:lot.building};scene.add(hit);return hit;});
 const dialog=document.createElement('dialog');dialog.className='construction-preview';dialog.setAttribute('aria-label','城市营建样板');
 dialog.innerHTML=`<div class="construction-heading"><div><small>独立营建演示</small><h2></h2></div><button type="button" data-close aria-label="关闭营建样板">×</button></div><p class="construction-meta"></p><div class="construction-tabs" role="group" aria-label="营建建筑">${DEMO_BUILDINGS.map(b=>`<button data-building="${b}" aria-pressed="false">${cityBuildings[b].name}</button>`).join('')}</div><div class="construction-description"></div><progress max="1" aria-label="施工进度"></progress><p class="construction-status" role="status"></p><div class="construction-actions"><button data-start></button><div class="construction-time"><button data-days="1">推进 1 日</button><button data-days="5">推进 5 日</button><button data-finish>推进至完工</button></div></div><details><summary>样板说明与重置</summary><p>每座城可同时进行一项工程，最高 3 级。演示资金初始 2000 钱，采用现有教学局营建及月度收入规则；只推进营建日期，不读写正式存档。从城邑列表切换后可预览当地营建。</p><button data-reset>重置演示局</button></details>`;
 document.querySelector('#sample')!.append(dialog);
 const openButton=document.createElement('button');openButton.id='construction-open';openButton.textContent='营建样板';openButton.disabled=false;document.querySelector('nav')!.append(openButton);
 const status=dialog.querySelector<HTMLElement>('.construction-status')!;
 function renderModels(){
  for(const lot of lots){lot.outline.visible=dialog.open&&lot.city===selectedSite&&lot.building===selectedBuilding;const a=buildingAppearance(world,lot.city,lot.building),key=`${a.level}:${a.phase}:${a.target}`;if(key===lot.key)continue;lot.key=key;lot.group.clear();
   const add=(name:string)=>{const ob=templates.get(name)!.clone(true);ob.traverse(o=>{if(o instanceof Mesh){o.castShadow=true;o.receiveShadow=true;}});lot.group.add(ob);};
   if(a.level)add(lot.building+'-'+a.level);
   if(a.phase!==null){add('worksite-'+a.phase);if(a.level){const scaffold=lot.group.children.at(-1)!;scaffold.scale.set(1.1,1.15,1.1);scaffold.traverse(o=>{if(o instanceof Mesh){const m=(Array.isArray(o.material)?o.material[0]:o.material);if(m.name.startsWith('Lime plaster')||m.name.startsWith('Slate tile'))o.visible=false;}});}}
   if(!a.level&&a.phase===null){const plot=new Mesh(plotGeometry,plotMaterial);plot.name='Empty building plot';plot.receiveShadow=true;lot.group.add(plot);}
   lot.group.userData={site:lot.city,building:lot.building,level:a.level,phase:a.phase};
  }external?.changed(world);changed();
 }
 function refresh(){
  renderModels();const a=buildingAppearance(world,selectedSite,selectedBuilding),q=constructionQuote(world,selectedSite,selectedBuilding),project=world.holdings.cities[selectedSite].project;
  dialog.querySelector('h2')!.textContent=siteById[selectedSite].name+' · '+cityBuildings[selectedBuilding].name;
  dialog.querySelector('.construction-meta')!.textContent=`第 ${world.day} 日　演示资金 ${world.people[0].coins} 钱`;
  dialog.querySelectorAll<HTMLButtonElement>('[data-building]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.building===selectedBuilding)));
  dialog.querySelector('.construction-description')!.textContent=`已建等级 ${a.level} / 3。${cityBuildings[selectedBuilding].effect}`;
  const progress=dialog.querySelector('progress')!;progress.hidden=a.phase===null;progress.value=a.progress;
  status.textContent=a.phase!==null?`${['地基施工','主体搭建','屋面收尾'][a.phase]} · 升至 ${a.target} 级 · 还需 ${a.remaining} 日`:project?`${cityBuildings[project.building as CityBuilding].name}正在施工，本城暂不能开启另一项工程。`:a.level===3?'已完成最高等级建设。':`升至 ${q.level} 级：${q.cost} 钱，${q.days} 日。`;
  const start=dialog.querySelector<HTMLButtonElement>('[data-start]')!;start.textContent=a.level?'升级'+cityBuildings[selectedBuilding].name:'开建'+cityBuildings[selectedBuilding].name;start.disabled=!!q.reason;start.title=q.reason||`支出 ${q.cost} 钱，工期 ${q.days} 日`;
  dialog.querySelectorAll<HTMLButtonElement>('[data-days],[data-finish]').forEach(b=>b.disabled=!project);
  dialog.dataset.site=selectedSite;dialog.dataset.building=selectedBuilding;dialog.dataset.level=String(a.level);dialog.dataset.phase=String(a.phase??'complete');
 }
 function open(site=selectedSite,building=selectedBuilding){selectedSite=site;selectedBuilding=building;focus(site);if(!dialog.open)dialog.show();refresh();}
 function close(){dialog.close();refresh();openButton.focus();}
 openButton.addEventListener('click',()=>open());dialog.querySelector('[data-close]')!.addEventListener('click',close);
 dialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}});
 dialog.querySelectorAll<HTMLButtonElement>('[data-building]').forEach(b=>b.addEventListener('click',()=>{selectedBuilding=b.dataset.building as CityBuilding;refresh();}));
 const act=(run:()=>void)=>{try{run();refresh();}catch(e){refresh();status.textContent=e instanceof Error?e.message:String(e);}};
 dialog.querySelector('[data-start]')!.addEventListener('click',()=>act(()=>startDemoConstruction(world,selectedSite,selectedBuilding)));
 dialog.querySelectorAll<HTMLButtonElement>('[data-days]').forEach(b=>b.addEventListener('click',()=>act(()=>advanceDemoConstruction(world,Number(b.dataset.days)))));
 dialog.querySelector('[data-finish]')!.addEventListener('click',()=>act(()=>{const p=world.holdings.cities[selectedSite].project;if(p)advanceDemoConstruction(world,Math.max(1,p.due-world.day));}));
 dialog.querySelector('[data-reset]')!.addEventListener('click',()=>{world=external?fresh():newConstructionDemo();refresh();});
 const onView=(event:Event)=>{const target=(event.target as HTMLElement).closest<HTMLElement>('[data-view],[data-site]'),site=target?.dataset.view??target?.dataset.site;if(site&&cities.some(c=>c.id===site)){selectedSite=site;if(dialog.open)refresh();}};
 document.querySelector('#sample')!.addEventListener('click',onView);
 const onSite=(event:Event)=>{const id=(event as CustomEvent<string>).detail;if(cities.some(c=>c.id===id)){selectedSite=id;if(dialog.open)refresh();}};
 document.querySelector('#sample')!.addEventListener('sample:site',onSite);
 let downX=0,downY=0;const down=(e:PointerEvent)=>{downX=e.clientX;downY=e.clientY;};
 const up=(e:PointerEvent)=>{if(e.button!==0||Math.hypot(e.clientX-downX,e.clientY-downY)>5)return;const r=renderer.domElement.getBoundingClientRect(),ray=new Raycaster();ray.setFromCamera(new Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const hit=ray.intersectObjects(hitTargets)[0];if(hit)open(hit.object.userData.site,hit.object.userData.building);};
 renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointerup',up);refresh();
 return ()=>{renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointerup',up);document.querySelector('#sample')?.removeEventListener('click',onView);document.querySelector('#sample')?.removeEventListener('sample:site',onSite);dialog.remove();openButton.remove();outlineGeometry.dispose();outlineMaterial.dispose();hitGeometry.dispose();hitMaterial.dispose();plotGeometry.dispose();plotMaterial.dispose();for(const root of assets)root.traverse(o=>{if(o instanceof Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});};
}
