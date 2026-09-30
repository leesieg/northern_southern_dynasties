import {polityStyle,worldRealms} from '../core/polityRuntime';
import {updateMarkerPortrait} from './markerPortrait';
import {ATLAS_MATERIALS,atlasMaterial} from './atlasMaterials';
import {atlasPresentation} from './atlasPresentation';
import {armyHeraldry} from './ArmyHeraldry';
import {armyVisualState} from '../core/armyPresentation';
import {militaryArmyView} from '../core/militaryView';
import {civilWar} from '../core/civilWars';
import {mapActivities} from '../core/mapActivities';
import type {OngoingItem} from '../core/ongoing';
import {mapTravelers} from '../core/residence';
import { diplomaticColor,personalRoute } from '../core/diplomacy';
import {realmReason,canMarchThrough,capital} from '../core/realm';
import type { Army,RealmId } from '../core/realm';
import type { ExpressionSpecification } from 'maplibre-gl';
import { regimeName } from '../core/government';
import { ArtIcon } from '../ui/ArtIcon';
import {OngoingItemsDialog} from '../ui/OngoingFlags';
import { familyName } from '../data/characters';
import { territoryNodes,descendantSites,nodeForSite,levelNames,controlEvents,type TerritoryLevel } from '../data/territorialHierarchy';
import { useEffect, useRef, useState } from 'react';
import { Map as AtlasMap, Marker, setWorkerUrl, setWorkerCount, type GeoJSONSource } from 'maplibre-gl';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import './atlas.css';
import { polities, siteById, sites } from '../data/scenario';
import { position,planRoute } from '../core/world';
import type { World } from '../core/types';
import { activeRoute, previewArmyRoute, atlasLabels, pointFeature } from './geography';
import { atlasStyle, POLITICAL_LAYERS, ROAD_LAYERS } from './atlasStyle';
import { administration, administrationPath } from '../data/administration';
import { territoryHit } from './territories';
import { mapResourceUrl } from './mapResources';
import {armyShowsModel,armyMapPosition,armyMarkerFootprint,armyModelBadgeBottom,anchoredArmyModels,dockMapMarker,layoutArmyCards,type ArmyMarkerPlacement,type ScreenRect} from './armyMapPresentation';

setWorkerUrl(mapWorkerUrl);
setWorkerCount(2);

export type MapMode='diplomacy'|'political'|'domains'|'terrain'|'roads';
interface Props {
  militaryModels:boolean;armyMotion:boolean;
  onActivity:(item:OngoingItem)=>void;
  onBrowseActivities:()=>void;
  onEstate:()=>void;
  selectedArmies:number[];onSelectArmy:(id:number,extend:boolean)=>void;
  onCommandArmy:(site:string)=>boolean;
  onDiplomacy:(r:RealmId)=>void;
  onInspectPeople:(ids:string[])=>void;
  territory:string;territoryLevel:TerritoryLevel;historyEvent:string|null;onSelectTerritory:(id:string)=>void;
  world:World; selected:string; route:string[]; mode:MapMode; showTravelers:boolean; tilted:boolean;
  cameraAction:{type:'home'|'player'|'selected'|'in'|'out';seq:number}; onSelect:(id:string)=>void; onPreviewRoute:(id:string)=>void;
}
interface MapAPI {update:()=>void;camera:(type:Props['cameraAction']['type'])=>void}
function armyOrderPreview(w:World,a:Army,id:string){const reason=realmReason(w,{type:'realm',action:'march',army:a.id,site:id}),j=a.journey,from=j?.route[j.leg+1]??a.location,path=from===id?{route:[id],days:0}:planRoute(from,id,node=>canMarchThrough(w,a.realm,node,id));return {reason,route:path?.route??[],days:path?path.days+(j?j.durations[j.leg]-j.elapsed:0):null};}

export function WorldMap(props:Props){
  const host=useRef<HTMLDivElement>(null),api=useRef<MapAPI|null>(null),current=useRef(props);
  current.current=props;
  const [activitySite,setActivitySite]=useState<string|null>(null);
  const [error,setError]=useState(''),[warning,setWarning]=useState(''),[ready,setReady]=useState(false),[retry,setRetry]=useState(0);
  const [hover,setHover]=useState<{id:string;x:number;y:number}|null>(null);
  const [menu,setMenu]=useState<{id:string;x:number;y:number}|null>(null);
  const menuButton=useRef<HTMLButtonElement>(null);
  useEffect(()=>{if(menu)menuButton.current?.focus();},[menu]);
  useEffect(()=>{
    const dismiss=()=>setMenu(null);
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setMenu(null);setHover(null);}};
    window.addEventListener('pointerdown',dismiss);window.addEventListener('keydown',escape);
    return()=>{window.removeEventListener('pointerdown',dismiss);window.removeEventListener('keydown',escape);};
  },[]);
  useEffect(()=>api.current?.update(),[props]);
  useEffect(()=>api.current?.camera(props.cameraAction.type),[props.cameraAction]);

  useEffect(()=>{
    if(!host.current)return;
    const container=host.current;
    let map:AtlasMap|undefined,observer:ResizeObserver|undefined,disposed=false,styleReady=false,frame=0,slowLoad:ReturnType<typeof setTimeout>|undefined;
    let lastTerritory='',lastLevel='',lastEvent:string|null|undefined;
    let terrainEnabled:boolean|undefined;
    let travelingIds=new Set<string>();
    let lastMode='',lastTilt:boolean|undefined,lastWorld:World|undefined,lastSelected='',lastRoute='';
    let hoveredId:string|null=null;
    const allMarkers:Marker[]=[];
    const activityMarkers=new globalThis.Map<string,{marker:Marker;button:HTMLButtonElement}>();
    let estateButton:HTMLButtonElement|undefined;
    const armyMarkers=new globalThis.Map<string,{marker:Marker;button:HTMLButtonElement;flag:HTMLImageElement;strength:HTMLSpanElement;label:HTMLElement}>();
    let armyPlacements=new globalThis.Map<string,ArmyMarkerPlacement>();
    let militaryLayerReady=false;
    const places:{marker:Marker;button:HTMLButtonElement;badge:HTMLButtonElement;flag:HTMLImageElement;portrait:HTMLButtonElement;id:string;capital:boolean}[]=[];
    const people=new globalThis.Map<string,{marker:Marker;label:HTMLSpanElement}>();
    const labels:{marker:Marker;data:typeof atlasLabels[number]}[]=[];
    const realmLabels=new globalThis.Map<RealmId,Marker>();
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setReady(false);setError('');setWarning('');setHover(null);setMenu(null);

    function home(){
      if(!map)return;
      map.fitBounds([[73,19],[135,53]],{padding:{top:125,bottom:105,left:28,right:28},pitch:0,bearing:0,duration:0,maxZoom:4.5});
    }
    function updateLabels(){
      if(!map||disposed)return;
      const zoom=map.getZoom(),w=container.clientWidth,h=container.clientHeight;
      const presentation=atlasPresentation(zoom,current.current.tilted);
      container.parentElement?.style.setProperty('--atlas-paper-strength',String(presentation.paper));
      container.parentElement?.setAttribute('data-scale',presentation.strategic?'strategic':'landscape');
      const occupied:{x:number;y:number;width:number}[]=[];
      const list=[...places].sort((a,b)=>Number(b.id===current.current.selected)-Number(a.id===current.current.selected)||Number(b.id===current.current.world.holdings.estate.location)-Number(a.id===current.current.world.holdings.estate.location)||Number(b.capital)-Number(a.capital));
      for(const item of list){
        const s=siteById[item.id],p=map.project([s.lon,s.lat]);
        const selected=item.id===current.current.selected,estate=item.id===current.current.world.holdings.estate.location;
        const width=Math.max(item.marker.getElement().offsetWidth,(item.button.textContent?.length??0)*(item.capital?20:14)+60+(estate?34:0));
        const visible=p.x>10&&p.x<w-10&&p.y>15&&p.y<h-30&&(selected||estate||item.capital||zoom>=(s.rank==='county'?6:4.5))&&!occupied.some(v=>Math.abs(v.x-p.x)<(width+v.width)/2+12&&Math.abs(v.y-p.y)<36);
        item.marker.getElement().hidden=!visible;
        item.button.classList.toggle('is-selected',selected);item.marker.getElement().classList.toggle('is-selected',selected);
        if(visible)occupied.push({x:p.x,y:p.y,width});
      }
      for(const {marker,data} of labels){
        const point=map.project([data.lon,data.lat]);
        const hidden=zoom<data.minZoom||zoom>data.maxZoom||data.kind==='realm'&&!['political','diplomacy'].includes(current.current.mode)||(data.kind==='prefecture'||data.kind==='province')&&current.current.mode!=='domains'||occupied.some(v=>Math.abs(v.x-point.x)<78&&Math.abs(v.y-point.y)<38);
        marker.getElement().hidden=hidden;
      }
      const world=current.current.world;
      for(const r of worldRealms(world)){
        let marker=realmLabels.get(r);
        if(!marker){const element=document.createElement('button');element.className='atlas-geographic-label realm';element.style.pointerEvents='auto';element.onclick=e=>{e.stopPropagation();current.current.onDiplomacy(r);};marker=new Marker({element,anchor:'center',opacityWhenCovered:.4}).setLngLat([0,0]).addTo(map);realmLabels.set(r,marker);allMarkers.push(marker);}
        const old=atlasLabels.find(v=>v.kind==='realm'&&v.text===(r==='liang'?'梁':r==='east'?'东 魏':r==='west'?'西 魏':'')),site=siteById[capital(r,world)],moved=!!world.realm?.identities?.[r],coords:[number,number]=old&&!moved?[old.lon,old.lat]:[site.lon,site.lat],offset=moved?-50:0,point=map.project(coords),element=marker.getElement();
        marker.setLngLat(coords).setOffset([0,offset]);element.textContent=regimeName(world,r);element.setAttribute('aria-label','查看'+regimeName(world,r)+'外交');element.hidden=!!world.realm?.annexed?.[r]||zoom<2||zoom>6||!['political','diplomacy'].includes(current.current.mode)||occupied.some(v=>Math.abs(v.x-point.x)<78&&Math.abs(v.y-point.y-offset)<38);
      }
      for(const [id,entry] of people){entry.marker.getElement().hidden=!current.current.showTravelers||!travelingIds.has(id)||(presentation.strategic&&id!=='player'&&id!==current.current.world.characterId);}
      const armies=current.current.world.realm?.armies??[],models=armyShowsModel(zoom,current.current.militaryModels&&militaryLayerReady);
      const viewport=container.getBoundingClientRect(),mapMarkers:{marker:Marker;offset:[number,number];bounds:ScreenRect}[]=[];
      const annotations:{marker:Marker;offset:[number,number]}[]=[...list.map(p=>({marker:p.marker,offset:[0,-7] as [number,number]})),...[...activityMarkers.values()].map(p=>({marker:p.marker,offset:[18,-22] as [number,number]})),...[...people.values()].map(p=>({marker:p.marker,offset:[0,-2] as [number,number]})),...labels.map(l=>({marker:l.marker,offset:[0,0] as [number,number]}))];
      // Measure the undocked rectangle, so last frame's offset cannot feed back into the next layout.
      for(const {marker,offset} of annotations){
        const element=marker.getElement();if(element.hidden)continue;
        const rect=element.getBoundingClientRect();if(!rect.width||!rect.height)continue;const previous=marker.getOffset(),dx=previous.x-offset[0],dy=previous.y-offset[1];
        const bounds={left:rect.left-viewport.left-dx-6,top:rect.top-viewport.top-dy-6,right:rect.right-viewport.left-dx+6,bottom:rect.bottom-viewport.top-dy+6};if(bounds.right>0&&bounds.left<w&&bounds.bottom>0&&bounds.top<h){mapMarkers.push({marker,offset,bounds});}
      }
      const anchors=armies.map((a,i)=>{const pos=armyMapPosition(a);return {key:String(a.id??a.realm+':'+i),point:map!.project([pos.lon,pos.lat]),position:pos,available:typeof a.id==='number'&&a.id>0};}),view={width:w,height:h};
      const fixed=models?anchoredArmyModels(anchors.filter(a=>a.available),current.current.selectedArmies.map(String),view):new globalThis.Map<string,ArmyMarkerPlacement>(),modelBounds=[...fixed.values()].map(p=>p.bounds);
      // Place settlement groups first, then cards against their final bounds. Models never move.
      const placed:ScreenRect[]=[];
      for(const item of mapMarkers){
        const dock=dockMapMarker(item.bounds,modelBounds,placed,view),offset:[number,number]=[item.offset[0]+dock.offset.x,item.offset[1]+dock.offset.y],previous=item.marker.getOffset();
        if(previous.x!==offset[0]||previous.y!==offset[1])item.marker.setOffset(offset);
        const element=item.marker.getElement();
        element.style.setProperty('--annotation-link-length',Math.hypot(dock.offset.x,dock.offset.y)>12?Math.hypot(offset[0],offset[1])+'px':'0px');
        element.style.setProperty('--annotation-link-angle',Math.atan2(-offset[1],-offset[0])+'rad');
        placed.push(dock.bounds);
      }
      armyPlacements=new globalThis.Map([...fixed,...layoutArmyCards(anchors.filter(a=>!fixed.has(a.key)),[...placed,...modelBounds],view,presentation.strategic)]);
      for(const [i,a] of armies.entries()){
        const item=armyMarkers.get(String(a.id??a.realm+':'+i));if(!item)continue;
        const placement=armyPlacements.get(String(a.id??a.realm+':'+i));item.button.hidden=!placement;if(!placement)continue;
        const {offset,model}=placement,size=armyMarkerFootprint(model,presentation.strategic);
        item.button.dataset.presentation=model?'model':'card';
        item.button.style.setProperty('--army-target-width',size.width+'px');item.button.style.setProperty('--army-target-height',size.height+'px');item.button.style.setProperty('--army-foot',size.bottom+'px');
        item.button.style.setProperty('--army-badge-bottom',armyModelBadgeBottom(map.getPitch())+'px');
        item.button.style.setProperty('--army-link-length',Math.hypot(offset.x,offset.y)>12?Math.hypot(offset.x,offset.y)+'px':'0px');item.button.style.setProperty('--army-link-angle',Math.atan2(-offset.y,-offset.x)+'rad');
        const pos=armyMapPosition(a);item.marker.setLngLat([pos.lon,pos.lat]).setOffset([offset.x,offset.y+size.bottom]);
      }
      if(models)map.triggerRepaint();
    }
    function syncPerspective(){
      if(!map||!styleReady||disposed)return;
      const view=atlasPresentation(map.getZoom(),current.current.tilted);
      if(terrainEnabled!==view.terrain){map.setTerrain(view.terrain?{source:'dem-terrain',exaggeration:1.15}:null);terrainEnabled=view.terrain;}
      if(Math.abs(map.getPitch()-view.pitch)>.5)map.easeTo({pitch:view.pitch,duration:reduced?0:250});
    }
    function focusSite(id:string){
      const site=siteById[id];
      map?.easeTo({center:[site.lon,site.lat],zoom:6.8,pitch:current.current.tilted?38:0,duration:reduced?0:500});
    }
    function openMenu(id:string,x:number,y:number){
      if(current.current.selectedArmies.length&&current.current.onCommandArmy(id)){setMenu(null);setHover(null);return;}
      current.current.onSelect(id);setHover(null);
      setMenu({id,x:Math.max(8,Math.min(x,container.clientWidth-220)),y:Math.max(8,Math.min(y,container.clientHeight-190))});
    }
    const scheduleLabels=()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;updateLabels();});};
    function update(){
      if(!map||!styleReady||disposed)return;
      const p=current.current;
      if(lastTerritory!==p.territory||lastLevel!==p.territoryLevel){
        const selectedId=territoryNodes[p.territory].level==='city'?'':p.territory;
        for(const layer of ['hierarchy-selected','hierarchy-selected-edge'])map.setFilter(layer,['==',['get','id'],selectedId]);
        for(const layer of ['hierarchy-seam','hierarchy-lines'])map.setFilter(layer,['==',['get','level'],p.territoryLevel]);
        for(const layer of ['territory-selected','territory-selected-shadow','territory-selected-edge','selected-ring'])map.setLayoutProperty(layer,'visibility',p.territoryLevel==='city'?'visible':'none');
        lastTerritory=p.territory;lastLevel=p.territoryLevel;
      }
      if(lastEvent!==p.historyEvent){
        const event=controlEvents.find(e=>e.id===p.historyEvent),city=event?siteById[event.site]:null;
        (map.getSource('history-event') as GeoJSONSource).setData({type:'FeatureCollection',features:city?[pointFeature(city.lon,city.lat)]:[]});
        lastEvent=p.historyEvent;
      }
      if(lastSelected!==p.selected){
        if(lastSelected)map.setFeatureState({source:'territories',id:lastSelected},{selected:false});
        map.setFeatureState({source:'territories',id:p.selected},{selected:true});
        const site=siteById[p.selected];
        (map.getSource('selection') as GeoJSONSource).setData({type:'FeatureCollection',features:[pointFeature(site.lon,site.lat)]});
        lastSelected=p.selected;
      }
      const selectedArmy=p.world.realm?.armies.find(a=>p.selectedArmies.includes(a.id!)),routeKey=p.route.join(',')+'|'+(selectedArmy?.id??'');
      if(lastWorld!==p.world||lastRoute!==routeKey){
        (map.getSource('route') as GeoJSONSource).setData(activeRoute(p.world,p.route,selectedArmy));
        const estate=p.world.holdings.estate,estateSite=siteById[estate.location];
        if(estateButton&&estateSite){
          places.find(item=>item.id===estate.location)?.marker.getElement().append(estateButton);
          estateButton.setAttribute('aria-label','查看'+familyName(estate.family)+'氏庄园，位于'+estateSite.name);
          estateButton.title=estateSite.name+' · '+familyName(estate.family)+'氏庄园';
        }
        const travelers=mapTravelers(p.world);travelingIds=new Set(travelers.filter(person=>person.journey).map(person=>person.id));
        for(const person of travelers){
          const entry=people.get(person.id),pos=position(person);
          entry?.marker.setLngLat([pos.lon,pos.lat]);
          if(entry){const personId=person.id==='player'?(p.world.characterId??'player'):person.id,face=entry.marker.getElement().querySelector<HTMLElement>('.traveler-face');if(face)updateMarkerPortrait(face,personId,p.world);entry.marker.getElement().setAttribute('aria-label','查看'+person.name+'详情');entry.label.textContent=person.name+(person.journey?' · 在途':'');}
        }
        for(const item of places){
          const site=siteById[item.id],state=p.world.realm?.cities[item.id],controller=state?.controller??site.polity,owner=state?.owner??site.polity;
          const internal=controller!=='frontier'?civilWar(p.world,controller):undefined,rebel=internal?.civil?.cities.includes(item.id),name=regimeName(p.world,controller);
          item.marker.getElement().style.setProperty('--city-realm',polityStyle(p.world,controller).color);
          item.button.replaceChildren(document.createTextNode(site.name+(controller!==owner?' · 占':rebel?' · 举兵':'')));const county=document.createElement('small');county.textContent=administration[site.id]?.prefecture??(site.capital?'都城':'县治');item.button.append(county);
          const governor=state?.owner===state?.controller?state?.governor:undefined;updateMarkerPortrait(item.portrait,governor??undefined,p.world);item.portrait.setAttribute('aria-label',governor?'查看本城治理者':'查看'+site.name+'详情');item.portrait.onclick=event=>{event.stopPropagation();if(governor)current.current.onInspectPeople([governor]);else current.current.onSelect(site.id);};item.button.dataset.rebel=String(!!rebel);
          item.button.title='法理：'+regimeName(p.world,owner)+' / 控制：'+name;
          item.button.setAttribute('aria-label',site.name+'，'+name+'控制，查看城域详情');
          item.flag.src=armyHeraldry(controller,name,p.world);item.badge.disabled=controller==='frontier';
          item.badge.title=controller==='frontier'?'周边地区，尚无统一国家档案':name+' · 查看国家详情';item.badge.setAttribute('aria-label',item.badge.title);
        }
        const currentArmies=p.world.realm?.armies??[];
        for(const [key,item] of armyMarkers)if(!currentArmies.some((a,i)=>String(a.id??a.realm+':'+i)===key)){item.marker.remove();armyMarkers.delete(key);}
        for(const [i,a] of currentArmies.entries()){
          const key=String(a.id??a.realm+':'+i);let item=armyMarkers.get(key);
          if(!item){
            const button=document.createElement('button');button.type='button';button.className='atlas-army-marker';button.dataset.presentation='card';
            const flag=document.createElement('img');flag.className='atlas-army-flag';flag.alt='';flag.setAttribute('aria-hidden','true');flag.draggable=false;
            const body=document.createElement('span');body.className='atlas-army-card-body';
            const label=document.createElement('small');label.className='atlas-army-label';
            const strength=document.createElement('span');strength.className='atlas-army-strength';body.append(label,strength);button.append(flag,body);
            button.onmousedown=event=>{if(event.shiftKey)event.stopPropagation();};
            button.ondblclick=event=>event.stopPropagation();
            button.onclick=event=>{event.stopPropagation();const army=current.current.world.realm?.armies.find((b,j)=>String(b.id??b.realm+':'+j)===key);if(!army)return;if(army.id&&militaryArmyView(current.current.world,army).command)current.current.onSelectArmy(army.id,event.shiftKey);else current.current.onSelect(army.location);};
            const marker=new Marker({element:button,anchor:'bottom',offset:[0,68]}).setLngLat([105,34]).addTo(map);item={marker,button,flag,strength,label};armyMarkers.set(key,item);
          }
          const {lon,lat}=armyMapPosition(a),rebel=civilWar(p.world,a.realm)?.civil?.armies.includes(a.id!),view=militaryArmyView(p.world,a),name=regimeName(p.world,a.realm);
          item.marker.setLngLat([lon,lat]);item.button.style.setProperty('--army-cloth',polityStyle(p.world,a.realm).color);item.button.dataset.rebel=String(!!rebel);item.button.dataset.exact=String(view.exact);
          item.flag.src=armyHeraldry(a.realm,name,p.world);item.button.dataset.state=armyVisualState(p.world,a);item.label.textContent=(rebel?'举兵 · ':'')+'第 '+(a.id??'')+' 军';item.strength.textContent=view.exact?view.strength:view.strength.replace('区域情报 ','估 ');
          item.button.title=name+' · 第 '+(a.id??'')+' 军 · '+view.strength+(view.exact?' 人 / 士气 '+a.morale+' / 随军粮 '+a.supply+(a.arrears?' / 欠饷 '+a.arrears:''):' · 公开军旗');
          item.button.setAttribute('aria-label',`${name}第 ${a.id} 军，${view.strength}${view.exact?' 人':''}，${view.command?'点击选择，Shift 点击可多选':'查看驻地'}`);
          if(view.command)item.button.setAttribute('aria-pressed','false');else item.button.removeAttribute('aria-pressed');
        }

        const activityGroups=mapActivities(p.world);
        for(const [site,entry] of activityMarkers)if(!activityGroups.some(g=>g.site===site)){entry.marker.remove();activityMarkers.delete(site);}
        for(const group of activityGroups){let entry=activityMarkers.get(group.site);if(!entry){const button=document.createElement('button');button.className='atlas-activity-marker';const loc=siteById[group.site];const marker=new Marker({element:button,anchor:'left',offset:[18,-22]}).setLngLat([loc.lon,loc.lat]).addTo(map);entry={marker,button};activityMarkers.set(group.site,entry);}
         const item=group.items[0];entry.button.dataset.kind=item.kind;entry.button.textContent='';if(group.items.length>1){const count=document.createElement('span');count.className='atlas-activity-count';count.textContent=String(group.items.length);count.setAttribute('aria-hidden','true');entry.button.append(count);}entry.button.title=group.items.map(i=>i.title+' · '+i.status+(i.days===null?'':' · '+i.days+'日')).join('\n');entry.button.setAttribute('aria-label',group.items.length===1?'查看'+item.title+'详情':'查看'+siteById[group.site].name+'的'+group.items.length+'项事务');entry.button.onclick=e=>{e.stopPropagation();setMenu(null);const latest=mapActivities(current.current.world).find(value=>value.site===group.site);if(!latest)return;if(latest.items.length===1)current.current.onActivity(latest.items[0]);else{current.current.onBrowseActivities();setActivitySite(group.site);}};}
        lastWorld=p.world;lastRoute=routeKey;
      }
      for(const [key,item] of armyMarkers){const selected=p.selectedArmies.includes(Number(key));item.button.dataset.selected=String(selected);if(item.button.hasAttribute('aria-pressed'))item.button.setAttribute('aria-pressed',String(selected));}
      map.setPaintProperty('territory-fill','fill-color',p.mode==='diplomacy'?['match',['get','id'],...sites.flatMap(s=>[s.id,diplomaticColor(p.world,p.world.realm?.cities[s.id].controller??s.polity)]),'#77796e'] as unknown as ExpressionSpecification:['get','color']);
      map.setPaintProperty('territory-fill','fill-opacity',p.mode==='diplomacy'?.55:0);
      map.setPaintProperty('realm-tint','fill-opacity',p.mode==='diplomacy'?0:p.mode==='domains'?['interpolate',['linear'],['zoom'],3,.12,5,.06,8,.015]:['interpolate',['linear'],['zoom'],3,.22,5,.16,8,.035]);
      // Domains already draw the chosen hierarchy: do not stack the city catchment grid over it.
      map.setLayoutProperty('territory-border','visibility',p.mode!=='domains'&&['county','city'].includes(p.territoryLevel)?'visible':'none');
      if(lastMode!==p.mode){
        map.setLayoutProperty('prefecture-boundary','visibility','none');
        for(const layer of ['hierarchy-seam','hierarchy-lines'])map.setLayoutProperty(layer,'visibility',p.mode==='domains'?'visible':'none');
        for(const id of POLITICAL_LAYERS)map.setLayoutProperty(id,'visibility',(p.mode==='political'||p.mode==='domains'||p.mode==='diplomacy')?'visible':'none');
        for(const id of ROAD_LAYERS)map.setLayoutProperty(id,'visibility',p.mode==='roads'?'visible':'none');
        map.setPaintProperty('territory-tone','fill-opacity',p.mode==='domains'?0:['interpolate',['linear'],['zoom'],4,0,6,.12,9,.04]);
        map.setPaintProperty('territory-border','line-opacity',p.mode==='domains'?0:['interpolate',['linear'],['zoom'],4,0,5,.45,8,.65]);
        lastMode=p.mode;
      }
      if(lastTilt!==p.tilted){
        syncPerspective();
        lastTilt=p.tilted;
      }
      scheduleLabels();
    }

    try{
      map=new AtlasMap({
        container,style:atlasStyle(),center:[105.5,34.5],zoom:3.7,pitch:24,bearing:0,
        minZoom:2.2,maxZoom:11,maxPitch:60,renderWorldCopies:false,
        maxBounds:[[64,8],[148,61]],dragRotate:false,pitchWithRotate:false,
        canvasContextAttributes:{antialias:true,powerPreference:'high-performance'},
        attributionControl:{compact:false},
        transformRequest:url=>({url:mapResourceUrl(url,location.origin)}),
      });
      map.getCanvas().setAttribute('aria-label','全国地形地图，拖动平移，滚轮缩放；也可通过地点目录选择城邑');
      map.doubleClickZoom.disable();
      map.boxZoom.disable();
      home();
      map.on('style.load',()=>{
        if(!map||disposed)return;
        for(const name of ATLAS_MATERIALS)if(!map.hasImage(name))map.addImage(name,atlasMaterial(name),{pixelRatio:2});
        styleReady=true;
        void import('./MilitaryLayer').then(({militaryLayer})=>{if(!map||disposed||map.getLayer('military-models'))return;try{map.addLayer(militaryLayer(()=>current.current,reason=>{militaryLayerReady=false;setWarning(reason);scheduleLabels();},()=>{militaryLayerReady=true;scheduleLabels();},id=>armyPlacements.get(String(id))));}catch(e){militaryLayerReady=false;setWarning('军队 3D 图层不可用，保留军旗操作：'+(e instanceof Error?e.message:'WebGL 不可用'));scheduleLabels();}}).catch(()=>setWarning('军队模型加载失败，保留军旗操作。'));
        for(const s of sites){
          const element=document.createElement('div');element.className='atlas-place';
          const button=document.createElement('button');button.className=`atlas-place-label${s.capital?' capital':s.rank==='county'?' county':''}`;button.textContent=s.name;element.style.setProperty('--city-realm',polities[s.polity].color);button.setAttribute('aria-label',`选择${s.name}`);
          button.onclick=event=>{event.stopPropagation();current.current.onSelect(s.id);};
          button.ondblclick=event=>{event.stopPropagation();current.current.onSelect(s.id);focusSite(s.id);};
          button.oncontextmenu=event=>{event.preventDefault();event.stopPropagation();const rect=container.getBoundingClientRect();openMenu(s.id,event.clientX-rect.left,event.clientY-rect.top);};
          const badge=document.createElement('button');badge.type='button';badge.className='atlas-city-realm';
          const flag=document.createElement('img');flag.alt='';flag.setAttribute('aria-hidden','true');flag.draggable=false;badge.append(flag);
          badge.onclick=event=>{event.stopPropagation();const realm=current.current.world.realm?.cities[s.id]?.controller??s.polity;if(realm!=='frontier')current.current.onDiplomacy(realm);};
          badge.ondblclick=event=>event.stopPropagation();badge.oncontextmenu=event=>{event.preventDefault();event.stopPropagation();};
          const portrait=document.createElement('button');portrait.type='button';portrait.className='atlas-governor';element.append(portrait,badge,button);
          const marker=new Marker({element,anchor:'bottom',offset:[0,-7],opacityWhenCovered:.3}).setLngLat([s.lon,s.lat]).addTo(map);
          places.push({marker,button,badge,flag,portrait,id:s.id,capital:!!s.capital});allMarkers.push(marker);
        }
        estateButton=document.createElement('button');estateButton.type='button';estateButton.className='atlas-estate-marker';
        estateButton.onclick=event=>{event.stopPropagation();setMenu(null);current.current.onEstate();};
        estateButton.ondblclick=event=>event.stopPropagation();

        for(const person of mapTravelers(current.current.world)){
          const element=document.createElement('button');element.type='button';element.hidden=true;element.className=`atlas-traveler${person.id==='player'?' player':''}`;
          element.onclick=event=>{event.stopPropagation();setMenu(null);current.current.onInspectPeople([person.id==='player'?(current.current.world.characterId??'player'):person.id]);};element.ondblclick=event=>event.stopPropagation();element.setAttribute('aria-label','查看'+person.name+'详情');
          const face=document.createElement('div');face.className='traveler-face';face.setAttribute('aria-hidden','true');const label=document.createElement('span');label.textContent=person.name;element.append(face,label);
          const pos=position(person);
          const marker=new Marker({element,anchor:'bottom',offset:[0,-2],opacityWhenCovered:.5}).setLngLat([pos.lon,pos.lat]).addTo(map);
          people.set(person.id,{marker,label});allMarkers.push(marker);
        }

        for(const data of atlasLabels.filter(v=>v.kind!=='realm')){
          const element=document.createElement('span');element.className=`atlas-geographic-label ${data.kind}`;element.textContent=data.text;
          const marker=new Marker({element,anchor:'center',opacityWhenCovered:.4}).setLngLat([data.lon,data.lat]).addTo(map);
          labels.push({marker,data});allMarkers.push(marker);
        }
        update();setReady(true);
      });
      const hit=(point:{x:number;y:number})=>{
        if(!map||!styleReady)return null;
        const city=map.queryRenderedFeatures([point.x,point.y],{layers:['site-halo']})[0];
        if(city?.properties?.id)return String(city.properties.id);
        return territoryHit(map.queryRenderedFeatures([point.x,point.y],{layers:['territory-fill','ocean','inland-water']}));
      };
      const clearHover=()=>{
        if(hoveredId)map?.setFeatureState({source:'territories',id:hoveredId},{hover:false});
        if(map&&styleReady){const p=current.current,a=p.world.realm?.armies.find(a=>p.selectedArmies.includes(a.id!));(map.getSource('route') as GeoJSONSource).setData(activeRoute(p.world,p.route,a));}
        hoveredId=null;setHover(null);if(map)map.getCanvas().style.cursor='';
      };
      map.on('mousemove',event=>{
        if(map?.isMoving())return;
        const id=hit(event.point);
        if(id!==hoveredId){clearHover();if(id){map?.setFeatureState({source:'territories',id},{hover:true});const p=current.current,a=p.world.realm?.armies.find(a=>p.selectedArmies.includes(a.id!));if(a){const order=armyOrderPreview(p.world,a,id);if(map&&!order.reason&&order.route.length)(map.getSource('route') as GeoJSONSource).setData(previewArmyRoute(a,order.route));}}hoveredId=id;}
        if(map)map.getCanvas().style.cursor=id?'pointer':'';
        setHover(id?{id,x:Math.max(8,Math.min(event.point.x+18,container.clientWidth-240)),y:Math.max(8,Math.min(event.point.y+18,container.clientHeight-(current.current.selectedArmies.length?260:165)))}:null);
      });
      map.getCanvas().addEventListener('mouseleave',clearHover);
      map.on('movestart',()=>{clearHover();setMenu(null);});
      map.on('click',event=>{const id=hit(event.point);if(id)current.current.onSelectTerritory(nodeForSite(id,current.current.territoryLevel).id);setMenu(null);});
      map.on('dblclick',event=>{const id=hit(event.point);if(id){current.current.onSelect(id);focusSite(id);}});
      map.on('contextmenu',event=>{event.preventDefault();event.originalEvent.preventDefault();const id=hit(event.point);if(id)openMenu(id,event.point.x,event.point.y);});
      map.on('error',event=>{
        if(disposed)return;
        console.error('[Atlas]',event.error);
        const id=(event as typeof event&{sourceId?:string}).sourceId;
        if(id==='land')setWarning('备用陆地底图未能载入。请重新载入地图。');
        else if(id||/fetch|network|tile|http|ajax/i.test(event.error.message))setWarning('部分在线地形或水系未能载入，当前显示可用图层。');
        else setError(`地图初始化异常：${event.error.message}`);
      });
      map.on('webglcontextlost',()=>setError('图形上下文中断。重新载入地图可恢复，游戏进度仍保留。'));
      map.on('zoomend',syncPerspective);
      map.on('move',scheduleLabels);map.on('sourcedata',scheduleLabels);
      map.once('idle',()=>{if(slowLoad)clearTimeout(slowLoad);});
      slowLoad=setTimeout(()=>{if(!disposed&&map&&!map.areTilesLoaded())setWarning('高清地形仍在加载；可以继续操作，或稍后重试。');},20000);
      observer=new ResizeObserver(()=>{map?.resize();scheduleLabels();});observer.observe(container);
      api.current={update,camera(type){
        if(!map)return;
        const duration=reduced?0:450;
        if(type==='home')home();
        else if(type==='selected'){
          const ids=descendantSites(current.current.territory);
          if(ids.length<=1)focusSite(current.current.selected);
          else {const places=ids.map(id=>siteById[id]);map.fitBounds([[Math.min(...places.map(s=>s.lon))-.2,Math.min(...places.map(s=>s.lat))-.2],[Math.max(...places.map(s=>s.lon))+.2,Math.max(...places.map(s=>s.lat))+.2]],{padding:65,duration,maxZoom:7});}
        }
        else if(type==='player'){
          const p=position(current.current.world.people[0]);
          map.easeTo({center:[p.lon,p.lat],zoom:7,pitch:current.current.tilted?42:0,duration});
        }else if(type==='in')map.zoomIn({duration});else map.zoomOut({duration});
      }};
    }catch(e){setError(e instanceof Error?e.message:'无法启动 WebGL 2 地图。');}
    return()=>{
      disposed=true;if(slowLoad)clearTimeout(slowLoad);cancelAnimationFrame(frame);observer?.disconnect();
      activityMarkers.forEach(e=>e.marker.remove());armyMarkers.forEach(e=>e.marker.remove());allMarkers.forEach(marker=>marker.remove());map?.remove();api.current=null;
    };
  },[retry]);

  const shownEvent=controlEvents.find(e=>e.id===props.historyEvent);
  const hoverNode=hover?nodeForSite(hover.id,props.territoryLevel):null;
  const hoverSite=hover?siteById[hover.id]:null;
  const player=props.world.people[0];
  const hoverPlan=hoverSite&&!player.journey?personalRoute(props.world,hoverSite.id):null;
  const hoverArmy=props.world.realm?.armies.find(a=>props.selectedArmies.includes(a.id!));
  const hoverOrder=hoverSite&&hoverArmy?armyOrderPreview(props.world,hoverArmy,hoverSite.id):null;
  const activityGroup=activitySite?mapActivities(props.world).find(group=>group.site===activitySite):undefined;
  return <div className="world-map atlas-map">
    <div className="map-canvas atlas-canvas" ref={host}/>
    <div className="atlas-paper" aria-hidden="true"/>
    {activityGroup&&<OngoingItemsDialog title={siteById[activityGroup.site].name+'事务'} icon="city" items={activityGroup.items} onClose={()=>setActivitySite(null)} onOpen={props.onActivity}/>}
    {shownEvent&&<div className="history-map-notice"><strong>{shownEvent.year} 年 · {shownEvent.label}</strong><span>标记为城市攻取记录；底图仍是 546 行政基底，未重建当年疆界。</span></div>}
    {hover&&hoverSite&&!menu&&<div className="territory-tooltip" style={{left:hover.x,top:hover.y}}>
      <span className="territory-kicker">{regimeName(props.world,props.world.realm?.cities[hoverSite.id]?.controller??hoverSite.polity)} · {administration[hoverSite.id]?.prefecture??'区划待核'}</span><strong>{hoverNode?.name??hoverSite.name}</strong><p>{hoverNode?levelNames[hoverNode.level]:'城市'} · 单击选择此层级</p>
      <p>{administrationPath(hoverSite.id)}</p><p>{hoverSite.terrain}{hoverSite.capital?' · 都城':''}</p>
      <p>{hoverArmy&&hoverOrder?hoverOrder.reason?'第 '+hoverArmy.id+' 军：'+hoverOrder.reason:'第 '+hoverArmy.id+' 军预计 '+hoverOrder.days+' 日 · '+hoverOrder.route.slice(0,6).map(id=>siteById[id].name).join(' → ')+(hoverOrder.route.length>6?' 等 '+hoverOrder.route.length+' 站':''):player.journey?'行旅途中 · 可查看目的地':hoverSite.id===player.location?'你正驻足于此':hoverPlan?('预计 '+hoverPlan.days+' 日 · 行粮 '+hoverPlan.food+' 日份'):'暂无可用路线'}</p>
      <small>单击查看 · 双击拉近 · 右键操作</small>
    </div>}
    {menu&&<div className="territory-menu" role="group" aria-label={siteById[menu.id].name+'城域操作'} style={{left:menu.x,top:menu.y}} onPointerDown={e=>e.stopPropagation()}>
      <header><strong>{siteById[menu.id].name}</strong><button aria-label="关闭城域操作" onClick={()=>setMenu(null)}>×</button></header>
      <button ref={menuButton} onClick={()=>{props.onSelect(menu.id);setMenu(null);}}>查看城域详情 <span>→</span></button>
      <button onClick={()=>{api.current?.camera('selected');setMenu(null);}}><ArtIcon name="city" size={28}/>拉近至城邑 <span>↗</span></button>
      <button disabled={!!player.journey||player.location===menu.id} onClick={()=>{props.onPreviewRoute(menu.id);setMenu(null);}}>预览前往路线 <span>→</span></button>
      <small>{player.journey?'行旅途中，抵达后可规划新路线':'预览后，在左侧出行页确认启程'}</small>
    </div>}
    {!ready&&!error&&<div className="map-status">正在铺展山河<span>载入真实高程与矢量水系</span></div>}
    {warning&&!error&&<div className="atlas-network-notice" role="status"><span>{warning}</span><button onClick={()=>setRetry(n=>n+1)}>重试</button></div>}
    {error&&<div className="map-status error" role="alert">{error}<button onClick={()=>setRetry(n=>n+1)}>重新载入地图</button></div>}
  </div>;
}
