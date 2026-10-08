import {sites,siteById,polities} from '../../data/scenario';
import {ThreeCampaignMap,ThreeMarker} from '../three/ThreeCampaignMap';
import {atlasStyle} from '../atlasStyle';
import {atlasPresentation,CITY_VIEW_ZOOM} from '../atlasPresentation';
import {campaignDomains,controlledSite} from '../campaignDomains';
import {campaignCityPlacements} from '../campaignScenery';
import {armyHeraldry} from '../ArmyHeraldry';
import {regimeName} from '../../core/government';
import {newWorld} from '../../core/world';
import {newConstructionDemo} from './constructionState';
import {mountConstructionPreview} from './constructionPreview';
import {seasons,type Season} from './seasons';

/** Same national scene as WorldMap, with an isolated teaching world and preview controls. */
export function mountCampaign(host:HTMLElement,notice:(message:string)=>void){
 return new Promise<void>((resolve,reject)=>{
  const initial=newWorld(),locations=sites.filter(s=>controlledSite(initial,s.id));
  let world=newConstructionDemo(locations.map(s=>s.id)),selected='luoyang',seasonPreview:Season='summer',strategic=false,flat=false,settled=false;
  const map=new ThreeCampaignMap({container:host,style:atlasStyle(),center:[siteById[selected].lon,siteById[selected].lat],zoom:CITY_VIEW_ZOOM,pitch:atlasPresentation(CITY_VIEW_ZOOM,true).pitch,minZoom:2.2,maxZoom:12});
  const picker=document.querySelector<HTMLSelectElement>('#site-picker')!,sample=document.querySelector('#sample')!;
  for(const [polityId,polity] of Object.entries(polities)){const group=document.createElement('optgroup');group.label=polity.name;for(const site of locations.filter(s=>s.polity===polityId)){const o=document.createElement('option');o.value=site.id;o.textContent=site.name;group.append(o);}if(group.children.length)picker.append(group);}
  picker.value=selected;
  const markers=locations.map(site=>{const button=document.createElement('button');button.className='city-label';button.dataset.site=site.id;button.hidden=true;
   const flag=document.createElement('img');flag.src=armyHeraldry(site.polity,regimeName(world,site.polity),world);flag.alt='';flag.className='city-medallion';
   const caption=document.createElement('span');caption.className='city-caption';const name=document.createElement('strong');name.textContent=site.name;const realm=document.createElement('small');realm.textContent=regimeName(world,site.polity);caption.append(name,realm);button.append(flag,caption);button.addEventListener('click',()=>focus(site.id));
   return {site,button,marker:new ThreeMarker({element:button,offset:[0,32]}).setLngLat([site.lon,site.lat]).addTo(map)};
  });
  function labels(){const zoom=map.getZoom(),w=host.clientWidth,h=host.clientHeight;
   const candidates=locations.filter(s=>zoom>=6.2||s.capital||s.id===selected).map(site=>({site,capital:!!site.capital,point:map.project([site.lon,site.lat])})).filter(p=>p.point.x>30&&p.point.x<w-30&&p.point.y>35&&p.point.y<h-70);
   const kept=campaignCityPlacements(candidates,selected,zoom).filter((v,i,all)=>!all.slice(0,i).some(o=>Math.abs(o.point.x-v.point.x)<145&&Math.abs(o.point.y-v.point.y)<60));
   const visible=new Set(kept.map(p=>p.site.id));for(const m of markers){m.button.hidden=!visible.has(m.site.id);m.button.setAttribute('aria-current',String(m.site.id===selected));}
  }
  function presentation(){const view=atlasPresentation(map.getZoom(),true),next=strategic||!view.terrain;if(next!==flat){flat=next;map.setTerrain(!flat);}labels();const pitch=strategic?0:view.pitch;if(Math.abs(map.getPitch()-pitch)>.25)map.easeTo({pitch,duration:220});}
  function focus(id:string){const site=siteById[id];if(!site||!locations.some(s=>s.id===id))return;selected=id;picker.value=id;strategic=false;document.querySelector('#strategic')!.setAttribute('aria-pressed','false');sample.dispatchEvent(new CustomEvent('sample:site',{detail:id}));map.easeTo({center:[site.lon,site.lat],zoom:CITY_VIEW_ZOOM,pitch:atlasPresentation(CITY_VIEW_ZOOM,true).pitch,duration:700});}
  picker.addEventListener('change',()=>focus(picker.value));
  document.querySelector('[data-view="region"]')!.addEventListener('click',()=>{strategic=false;document.querySelector('#strategic')!.setAttribute('aria-pressed','false');map.fitBounds([[85,20],[130,45]],{pitch:0,duration:900});});
  document.querySelector('#strategic')!.addEventListener('click',()=>{strategic=!flat;document.querySelector('#strategic')!.setAttribute('aria-pressed',String(strategic));map.easeTo({pitch:strategic?0:51,zoom:strategic?Math.min(5,map.getZoom()):Math.max(7,map.getZoom()),duration:650});presentation();});
  document.querySelector('#rotate')!.addEventListener('click',()=>map.easeTo({bearing:map.getBearing()+30,duration:300}));
  document.querySelector('#zoom-in')!.addEventListener('click',()=>map.zoomIn({duration:300}));document.querySelector('#zoom-out')!.addEventListener('click',()=>map.zoomOut({duration:300}));document.querySelector('#reset')!.addEventListener('click',()=>focus(selected));
  document.querySelectorAll<HTMLButtonElement>('[data-season]').forEach(button=>button.addEventListener('click',()=>{seasonPreview=button.dataset.season as Season;document.querySelectorAll<HTMLButtonElement>('[data-season]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));document.querySelector('.season-description')!.textContent=seasons[seasonPreview].description;map.triggerRepaint();}));
  let labelFrame=0;
  map.on('move',()=>{if(!labelFrame)labelFrame=requestAnimationFrame(()=>{labelFrame=0;labels();});});map.on('moveend',presentation);
  map.on('click',event=>{const id=map.siteAt(event.point);if(id)focus(id);});
  map.on('error',event=>{notice(event.error.message);if(event.sourceId==='detail-dem'){document.querySelector<HTMLElement>('#notice')!.dataset.warning='true';document.querySelector('#notice')!.classList.remove('ready');return;}if(!settled){settled=true;reject(event.error);}else{document.querySelector('#notice')!.classList.remove('ready');document.querySelector<HTMLButtonElement>('#retry')!.hidden=false;}});
  const observer=new ResizeObserver(()=>{map.resize();labels();});observer.observe(host);let cleanupConstruction:(()=>void)|undefined;
  const warning=(message:string)=>{notice(message);document.querySelector('#notice')!.classList.remove('ready');};
  map.on('style.load',()=>{
   map.getSource('realms').setData(campaignDomains(world).realms);
   map.attachWorld(()=>({world,selected,seasonPreview,tilted:!flat,sceneryDetail:true,militaryModels:false,armyMotion:false}),()=>undefined,()=>{
    void mountConstructionPreview(map.scene,map.camera,map.renderer,locations.map(s=>({id:s.id,x:0,z:0,height:0})),focus,()=>map.triggerRepaint(),{world,changed:next=>{world={...next};map.triggerRepaint();}}).then(cleanup=>{
     cleanupConstruction=cleanup;picker.disabled=false;document.querySelectorAll<HTMLButtonElement>('[data-season]').forEach(b=>b.disabled=false);presentation();map.once('idle',()=>{if(!settled){settled=true;resolve();}});map.triggerRepaint();
    }).catch(error=>{settled=true;reject(error);});
   },message=>{warning(message);if(!settled){settled=true;reject(new Error(message));}});
  });
  window.addEventListener('pagehide',()=>{cancelAnimationFrame(labelFrame);observer.disconnect();cleanupConstruction?.();for(const m of markers)m.marker.remove();map.remove();},{once:true});
 });
}
