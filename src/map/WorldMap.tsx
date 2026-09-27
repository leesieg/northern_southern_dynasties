import {civilWar,playerCommandsArmy} from '../core/civilWars';
import {mapActivities} from '../core/mapActivities';
import type {OngoingItem} from '../core/ongoing';
import {mapTravelers} from '../core/residence';
import { diplomaticColor,personalRoute } from '../core/diplomacy';
import type { RealmId } from '../core/realm';
import type { ExpressionSpecification } from 'maplibre-gl';
import { regimeName } from '../core/government';
import { ArtIcon } from '../ui/ArtIcon';
import { familyName } from '../data/characters';
import { territoryNodes,descendantSites,nodeForSite,levelNames,controlEvents,type TerritoryLevel } from '../data/territorialHierarchy';
import { useEffect, useRef, useState } from 'react';
import { Map as AtlasMap, Marker, setWorkerUrl, setWorkerCount, type GeoJSONSource } from 'maplibre-gl';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import './atlas.css';
import { polities, siteById, sites } from '../data/scenario';
import { position } from '../core/world';
import type { World } from '../core/types';
import { activeRoute, atlasLabels, pointFeature } from './geography';
import { atlasStyle, POLITICAL_LAYERS, ROAD_LAYERS } from './atlasStyle';
import { administration, administrationPath } from '../data/administration';
import { territoryHit } from './territories';
import { mapResourceUrl } from './mapResources';

setWorkerUrl(mapWorkerUrl);
setWorkerCount(2);

export type MapMode='diplomacy'|'political'|'domains'|'terrain'|'roads';
interface Props {
  onActivity:(item:OngoingItem)=>void;
  onEstate:()=>void;
  selectedArmies:number[];onSelectArmy:(id:number,extend:boolean)=>void;
  onDiplomacy:(r:RealmId)=>void;
  onInspectPeople:(ids:string[])=>void;
  territory:string;territoryLevel:TerritoryLevel;historyEvent:string|null;onSelectTerritory:(id:string)=>void;
  world:World; selected:string; route:string[]; mode:MapMode; showTravelers:boolean; tilted:boolean;
  cameraAction:{type:'home'|'player'|'selected'|'in'|'out';seq:number}; onSelect:(id:string)=>void; onPreviewRoute:(id:string)=>void;
}
interface MapAPI {update:()=>void;camera:(type:Props['cameraAction']['type'])=>void}

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
    let lastMode='',lastTilt:boolean|undefined,lastWorld:World|undefined,lastSelected='',lastRoute='';
    let hoveredId:string|null=null;
    const allMarkers:Marker[]=[];
    const activityMarkers=new globalThis.Map<string,{marker:Marker;button:HTMLButtonElement}>();
    let estateMarker:Marker|undefined,estateButton:HTMLButtonElement|undefined;
    const armyMarkers=new globalThis.Map<string,{marker:Marker;button:HTMLButtonElement}>();
    const places:{marker:Marker;button:HTMLButtonElement;id:string;capital:boolean}[]=[];
    const people=new globalThis.Map<string,{marker:Marker;label:HTMLSpanElement}>();
    const labels:{marker:Marker;data:typeof atlasLabels[number]}[]=[];
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setReady(false);setError('');setWarning('');setHover(null);setMenu(null);

    function home(){
      if(!map)return;
      map.fitBounds([[73,19],[135,53]],{padding:{top:125,bottom:105,left:28,right:28},pitch:current.current.tilted?24:0,bearing:0,duration:0,maxZoom:4.5});
    }
    function updateLabels(){
      if(!map||disposed)return;
      const zoom=map.getZoom(),w=container.clientWidth,h=container.clientHeight;
      const occupied:{x:number;y:number}[]=[];
      const list=[...places].sort((a,b)=>Number(b.id===current.current.selected)-Number(a.id===current.current.selected)||Number(b.capital)-Number(a.capital));
      for(const item of list){
        const s=siteById[item.id],p=map.project([s.lon,s.lat]);
        const selected=item.id===current.current.selected;
        const visible=p.x>10&&p.x<w-10&&p.y>15&&p.y<h-30&&(selected||item.capital||zoom>=(s.rank==='county'?6:4.5))&&!occupied.some(v=>Math.abs(v.x-p.x)<58&&Math.abs(v.y-p.y)<31);
        item.marker.getElement().hidden=!visible;
        item.button.classList.toggle('is-selected',selected);
        if(visible)occupied.push({x:p.x,y:p.y});
      }
      for(const {marker,data} of labels){
        const point=map.project([data.lon,data.lat]);
        const hidden=zoom<data.minZoom||zoom>data.maxZoom||data.kind==='realm'&&!['political','diplomacy'].includes(current.current.mode)||(data.kind==='prefecture'||data.kind==='province')&&current.current.mode!=='domains'||occupied.some(v=>Math.abs(v.x-point.x)<78&&Math.abs(v.y-point.y)<38);
        marker.getElement().hidden=hidden;if(data.kind==='realm'){const r:RealmId=data.text.includes('东')?'east':data.text.includes('西')?'west':'liang';marker.getElement().textContent=regimeName(current.current.world,r);}
        if(data.kind==='realm'){const id=data.text==='梁'?'liang':data.text==='东 魏'?'east':'west';marker.getElement().textContent=regimeName(current.current.world,id);}
      }
    }
    function focusSite(id:string){
      const site=siteById[id];
      map?.easeTo({center:[site.lon,site.lat],zoom:6.8,pitch:current.current.tilted?38:0,duration:reduced?0:500});
    }
    function openMenu(id:string,x:number,y:number){
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
        map.setFilter('hierarchy-lines',['==',['get','level'],p.territoryLevel]);
        for(const layer of ['territory-selected','territory-selected-shadow','territory-selected-edge','selected-ring'])map.setLayoutProperty(layer,'visibility',p.territoryLevel==='city'?'visible':'none');
        map.setLayoutProperty('territory-border','visibility',['county','city'].includes(p.territoryLevel)?'visible':'none');
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
      const routeKey=p.route.join(',');
      if(lastWorld!==p.world||lastRoute!==routeKey){
        (map.getSource('route') as GeoJSONSource).setData(activeRoute(p.world,p.route));
        const estate=p.world.holdings.estate,estateSite=siteById[estate.location];
        if(estateMarker&&estateButton&&estateSite){
          estateMarker.setLngLat([estateSite.lon,estateSite.lat]);
          estateButton.setAttribute('aria-label','查看'+familyName(estate.family)+'氏庄园，位于'+estateSite.name);
          estateButton.title=estateSite.name+' · '+familyName(estate.family)+'氏庄园';
        }
        for(const person of mapTravelers(p.world)){
          const entry=people.get(person.id),pos=position(person);
          entry?.marker.setLngLat([pos.lon,pos.lat]);
          if(entry){entry.marker.getElement().setAttribute('aria-label','查看'+person.name+'详情');entry.label.textContent=person.name+(person.journey?' · 在途':'');const pennant=entry.marker.getElement().querySelector('.traveler-pennant');if(pennant&&person.id==='player')pennant.textContent=familyName(p.world.holdings.estate.family).slice(0,1);}
        }
        for(const item of places){const state=p.world.realm?.cities[item.id];if(state){item.button.style.borderColor=polities[state.controller].color;const internal=state.controller!=='frontier'?civilWar(p.world,state.controller):undefined,rebel=internal?.civil?.cities.includes(item.id);item.button.textContent=siteById[item.id].name+(state.controller!==state.owner?' · 占':rebel?' · 举兵':'');item.button.dataset.rebel=String(!!rebel);item.button.title='法理：'+regimeName(p.world,state.owner)+' / 控制：'+regimeName(p.world,state.controller);}}
        const currentArmies=p.world.realm?.armies??[];
        for(const [key,item] of armyMarkers)if(!currentArmies.some((a,i)=>String(a.id??a.realm+':'+i)===key)){item.marker.remove();armyMarkers.delete(key);}
        for(const [i,a] of currentArmies.entries()){const key=String(a.id??a.realm+':'+i);let item=armyMarkers.get(key);if(!item){const button=document.createElement('button');button.className='atlas-army-marker';button.style.borderColor=polities[a.realm].color;button.onclick=event=>{event.stopPropagation();const army=current.current.world.realm?.armies.find((b,j)=>String(b.id??b.realm+':'+j)===key);if(!army)return;if(army.id&&playerCommandsArmy(current.current.world,army))current.current.onSelectArmy(army.id,event.shiftKey);else current.current.onSelect(army.location);};const marker=new Marker({element:button,anchor:'top',offset:[0,12]}).setLngLat([105,34]).addTo(map);item={marker,button};armyMarkers.set(key,item);}
         let {lon,lat}=siteById[a.location];if(a.journey){const j=a.journey,from=siteById[j.route[j.leg]],to=siteById[j.route[j.leg+1]],t=j.elapsed/j.durations[j.leg];lon=from.lon+(to.lon-from.lon)*t;lat=from.lat+(to.lat-from.lat)*t;}const peers=currentArmies.slice(0,i).filter(b=>b.location===a.location&&!b.journey).length;item.marker.setLngLat([lon,lat]).setOffset([0,12+peers*28]);const rebel=civilWar(p.world,a.realm)?.civil?.armies.includes(a.id!);item.button.dataset.rebel=String(!!rebel);item.button.textContent=(rebel?'举兵':regimeName(p.world,a.realm))+'軍 '+(a.id??'')+' · '+a.troops;item.button.title='士气 '+a.morale+' / 随军粮 '+a.supply+(a.arrears?' / 欠饷 '+a.arrears:'');if(playerCommandsArmy(p.world,a)){item.button.setAttribute('aria-label',`选择第 ${a.id} 军，Shift 点击可多选`);item.button.setAttribute('aria-pressed','false');}else{item.button.setAttribute('aria-label',`查看第 ${a.id} 军驻地`);item.button.removeAttribute('aria-pressed');}}

        const activityGroups=mapActivities(p.world);
        for(const [site,entry] of activityMarkers)if(!activityGroups.some(g=>g.site===site)){entry.marker.remove();activityMarkers.delete(site);}
        for(const group of activityGroups){let entry=activityMarkers.get(group.site);if(!entry){const button=document.createElement('button');button.className='atlas-activity-marker';const loc=siteById[group.site];const marker=new Marker({element:button,anchor:'left',offset:[18,-22]}).setLngLat([loc.lon,loc.lat]).addTo(map);entry={marker,button};activityMarkers.set(group.site,entry);}
         const item=group.items[0];entry.button.dataset.kind=item.kind;entry.button.textContent=group.items.length>1?String(group.items.length):'';entry.button.title=group.items.map(i=>i.title+' · '+i.status+(i.days===null?'':' · '+i.days+'日')).join('\n');entry.button.setAttribute('aria-label',siteById[group.site].name+'的活动：'+entry.button.title);entry.button.onclick=e=>{e.stopPropagation();setActivitySite(group.site);};}
        lastWorld=p.world;lastRoute=routeKey;
      }
      for(const [key,item] of armyMarkers){const selected=p.selectedArmies.includes(Number(key));item.button.dataset.selected=String(selected);if(item.button.hasAttribute('aria-pressed'))item.button.setAttribute('aria-pressed',String(selected));}
      map.setPaintProperty('territory-fill','fill-color',p.mode==='diplomacy'?['match',['get','id'],...sites.flatMap(s=>[s.id,diplomaticColor(p.world,p.world.realm?.cities[s.id].controller??s.polity)]),'#77796e'] as unknown as ExpressionSpecification:['get','color']);
      map.setPaintProperty('territory-fill','fill-opacity',p.mode==='diplomacy'?.55:0);
      map.setPaintProperty('realm-tint','fill-opacity',p.mode==='diplomacy'?0:['interpolate',['linear'],['zoom'],3,.48,5,.28,8,.08]);
      for(const [id,entry] of people)entry.marker.getElement().hidden=!p.showTravelers||!mapTravelers(p.world).find(person=>person.id===id)?.journey;
      if(lastMode!==p.mode){
        map.setLayoutProperty('prefecture-boundary','visibility','none');
        map.setLayoutProperty('hierarchy-lines','visibility',p.mode==='domains'?'visible':'none');
        for(const id of POLITICAL_LAYERS)map.setLayoutProperty(id,'visibility',(p.mode==='political'||p.mode==='domains'||p.mode==='diplomacy')?'visible':'none');
        for(const id of ROAD_LAYERS)map.setLayoutProperty(id,'visibility',p.mode==='roads'?'visible':'none');
        map.setPaintProperty('territory-tone','fill-opacity',p.mode==='domains'?.3:['interpolate',['linear'],['zoom'],4,0,6,.12,9,.04]);
        map.setPaintProperty('territory-border','line-opacity',p.mode==='domains'?.7:['interpolate',['linear'],['zoom'],4,0,5,.45,8,.65]);
        lastMode=p.mode;
      }
      if(lastTilt!==p.tilted){
        map.setTerrain(p.tilted?{source:'dem-terrain',exaggeration:1.15}:null);
        if(lastTilt!==undefined)map.easeTo({pitch:p.tilted?38:0,duration:reduced?0:450});
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
      home();
      map.on('style.load',()=>{
        if(!map||disposed)return;
        styleReady=true;
        for(const s of sites){
          const element=document.createElement('div');element.className='atlas-place';
          const button=document.createElement('button');button.className=`atlas-place-label${s.capital?' capital':s.rank==='county'?' county':''}`;button.textContent=s.name;button.setAttribute('aria-label',`选择${s.name}`);
          button.onclick=event=>{event.stopPropagation();current.current.onSelect(s.id);};
          button.ondblclick=event=>{event.stopPropagation();current.current.onSelect(s.id);focusSite(s.id);};
          button.oncontextmenu=event=>{event.preventDefault();event.stopPropagation();const rect=container.getBoundingClientRect();openMenu(s.id,event.clientX-rect.left,event.clientY-rect.top);};
          element.append(button);
          const marker=new Marker({element,anchor:'bottom',offset:[0,-7],opacityWhenCovered:.3}).setLngLat([s.lon,s.lat]).addTo(map);
          places.push({marker,button,id:s.id,capital:!!s.capital});allMarkers.push(marker);
        }
        estateButton=document.createElement('button');estateButton.type='button';estateButton.className='atlas-estate-marker';
        estateButton.onclick=event=>{event.stopPropagation();setMenu(null);current.current.onEstate();};
        estateButton.ondblclick=event=>event.stopPropagation();
        const estateSite=siteById[current.current.world.holdings.estate.location];
        if(estateSite){estateMarker=new Marker({element:estateButton,anchor:'bottom',offset:[0,-55]}).setLngLat([estateSite.lon,estateSite.lat]).addTo(map);allMarkers.push(estateMarker);}
        for(const person of mapTravelers(current.current.world)){
          const element=document.createElement('button');element.type='button';element.hidden=true;element.className=`atlas-traveler${person.id==='player'?' player':''}`;
          element.onclick=event=>{event.stopPropagation();setMenu(null);current.current.onInspectPeople([person.id==='player'?(current.current.world.characterId??'player'):person.id]);};element.ondblclick=event=>event.stopPropagation();element.setAttribute('aria-label','查看'+person.name+'详情');
          const pennant=document.createElement('i');pennant.className='traveler-pennant';pennant.setAttribute('aria-hidden','true');pennant.textContent=person.id==='player'?familyName(current.current.world.holdings.estate.family).slice(0,1):'';
          const label=document.createElement('span');label.textContent=person.name;element.append(pennant,label);
          const pos=position(person);
          const marker=new Marker({element,anchor:'bottom',offset:[0,-2],opacityWhenCovered:.5}).setLngLat([pos.lon,pos.lat]).addTo(map);
          people.set(person.id,{marker,label});allMarkers.push(marker);
        }

        for(const data of atlasLabels){
          const element=document.createElement(data.kind==='realm'?'button':'span');element.className=`atlas-geographic-label ${data.kind}`;element.textContent=data.text;if(data.kind==='realm'){const realm:RealmId=data.text.includes('东')?'east':data.text.includes('西')?'west':'liang';element.style.pointerEvents='auto';element.onclick=e=>{e.stopPropagation();current.current.onDiplomacy(realm);};element.setAttribute('aria-label','查看'+data.text+'外交');}
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
        hoveredId=null;setHover(null);if(map)map.getCanvas().style.cursor='';
      };
      map.on('mousemove',event=>{
        if(map?.isMoving())return;
        const id=hit(event.point);
        if(id!==hoveredId){clearHover();if(id)map?.setFeatureState({source:'territories',id},{hover:true});hoveredId=id;}
        if(map)map.getCanvas().style.cursor=id?'pointer':'';
        setHover(id?{id,x:Math.max(8,Math.min(event.point.x+18,container.clientWidth-240)),y:Math.max(8,Math.min(event.point.y+18,container.clientHeight-165))}:null);
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
  return <div className="world-map atlas-map">
    <div className="map-canvas atlas-canvas" ref={host}/>
    <div className="atlas-paper" aria-hidden="true"/>
    {activitySite&&<section className="map-activity-list" aria-label="当地活动"><header><strong>{siteById[activitySite].name}</strong><button aria-label="关闭活动列表" onClick={()=>setActivitySite(null)}>×</button></header>{(mapActivities(props.world).find(g=>g.site===activitySite)?.items??[]).map(item=><button key={item.id} onClick={()=>{props.onActivity(item);setActivitySite(null);}}><ArtIcon name={item.kind==='construction'?'estate':item.kind==='service'?'diligent':'person'} size={28}/><span><strong>{item.title}</strong><small>{item.status} · {item.days===null?'待定':item.days+' 日'}</small>{item.progress!==null&&<progress max={1} value={item.progress}/>}</span><span>›</span></button>)}</section>}
    {shownEvent&&<div className="history-map-notice"><strong>{shownEvent.year} 年 · {shownEvent.label}</strong><span>标记为城市攻取记录；底图仍是 546 行政基底，未重建当年疆界。</span></div>}
    {hover&&hoverSite&&!menu&&<div className="territory-tooltip" style={{left:hover.x,top:hover.y}}>
      <span className="territory-kicker">{regimeName(props.world,props.world.realm?.cities[hoverSite.id]?.controller??hoverSite.polity)} · {administration[hoverSite.id]?.prefecture??'区划待核'}</span><strong>{hoverNode?.name??hoverSite.name}</strong><p>{hoverNode?levelNames[hoverNode.level]:'城市'} · 单击选择此层级</p>
      <p>{administrationPath(hoverSite.id)}</p><p>{hoverSite.terrain}{hoverSite.capital?' · 都城':''}</p>
      <p>{player.journey?'行旅途中 · 可查看目的地':hoverSite.id===player.location?'你正驻足于此':hoverPlan?('预计 '+hoverPlan.days+' 日 · 行粮 '+hoverPlan.food+' 日份'):'暂无可用路线'}</p>
      <small>单击查看 · 双击拉近 · 右键操作</small>
    </div>}
    {menu&&<div className="territory-menu" role="group" aria-label={siteById[menu.id].name+'城域操作'} style={{left:menu.x,top:menu.y}} onPointerDown={e=>e.stopPropagation()}>
      <header><strong>{siteById[menu.id].name}</strong><button aria-label="关闭城域操作" onClick={()=>setMenu(null)}>×</button></header>
      <button ref={menuButton} onClick={()=>{props.onSelect(menu.id);setMenu(null);}}>查看城域详情 <span>→</span></button>
      <button onClick={()=>{api.current?.camera('selected');setMenu(null);}}><ArtIcon name="city" size={28}/>拉近至城邑 <span>↗</span></button>
      <button disabled={!!player.journey||player.location===menu.id} onClick={()=>{props.onPreviewRoute(menu.id);setMenu(null);}}>预览前往路线 <span>→</span></button>
      <small>{player.journey?'行旅途中，抵达后可规划新路线':'预览后，在右侧面板确认启程'}</small>
    </div>}
    {!ready&&!error&&<div className="map-status">正在铺展山河<span>载入真实高程与矢量水系</span></div>}
    {warning&&!error&&<div className="atlas-network-notice" role="status"><span>{warning}</span><button onClick={()=>setRetry(n=>n+1)}>重试</button></div>}
    {error&&<div className="map-status error" role="alert">{error}<button onClick={()=>setRetry(n=>n+1)}>重新载入地图</button></div>}
  </div>;
}
