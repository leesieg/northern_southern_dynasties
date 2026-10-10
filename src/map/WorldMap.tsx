import {armyBattle,liveBattleArmies,armyDisplayState} from '../core/combatPresentation';
import {ArmyMotion} from './ArmyMotion';
import {ownedEstates} from '../core/estates';
import {annotationDensity} from './annotationDensity';
import {waterMaskContains} from './campaignTerrain';
import {campaignDomains,controlledSite,domainSignature} from './campaignDomains';
import {campaignSeason} from './campaignSeason';
import {ActionDialog} from '../ui/ActionDialog';
import {engagementGroups,type EngagementRef} from '../ui/warPresentation';
import {polityStyle,worldRealms} from '../core/polityRuntime';
import {updateMarkerPortrait} from './markerPortrait';
import {atlasPresentation,CITY_VIEW_ZOOM,type CameraAction} from './atlasPresentation';
import {CITY_DETAIL_ZOOM} from './campaignScenery';
import {getPerson} from '../core/personRegistry';
import {armyHeraldry} from './ArmyHeraldry';
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
import {estateName} from '../core/construction';
import { territoryNodes,descendantSites,nodeForSite,levelNames,controlEvents,type TerritoryLevel } from '../data/territorialHierarchy';
import { useEffect, useRef, useState } from 'react';
import type {GeoJSONSource} from 'maplibre-gl';
import {ThreeCampaignMap as AtlasMap,ThreeMarker as Marker} from './three/ThreeCampaignMap';
import './atlas.css';
import {MapLoading,MapDetailLoading} from './MapLoading';
import {clearMapNotice,type MapNotice,type MapLoadProgress,type MapLoadStage} from './mapLoadState';
import {MapResourceError,mapResourceDiagnostics} from './resourceLoader';
import { polities, siteById, sites } from '../data/scenario';
import { position,planRoute } from '../core/world';
import type { World } from '../core/types';
import { activeRoute, previewArmyRoute, atlasLabels, pointFeature } from './geography';
import { atlasStyle, POLITICAL_LAYERS, ROAD_LAYERS } from './atlasStyle';
import { administration, administrationPath } from '../data/administration';
import { territoryHit } from './territories';
import type {CampaignSceneryLayer} from './CampaignLayer';
import {armyShowsModel,armyMarkerFootprint,armyModelBadgeBottom,anchoredArmyModels,dockMapMarker,layoutArmyCards,type ArmyMarkerPlacement,type ScreenRect} from './armyMapPresentation';


export type MapMode='diplomacy'|'political'|'domains'|'terrain'|'roads';
interface Props {
  onMapReady?:(map:AtlasMap|null)=>void;
  speed:number;militaryModels:boolean;armyMotion:boolean;sceneryDetail:boolean;
  onActivity:(item:OngoingItem)=>void;
  onEngagement:(selected:EngagementRef)=>void;
  onBrowseActivities:()=>void;
  onEstate:()=>void;
  selectedArmies:number[];onSelectArmy:(id:number,extend:boolean)=>void;
  onCommandArmy:(site:string)=>boolean;
  onDiplomacy:(r:RealmId)=>void;
  onInspectPeople:(ids:string[])=>void;
  territory:string;territoryLevel:TerritoryLevel;historyEvent:string|null;onSelectTerritory:(id:string)=>void;
  world:World; selected:string; selectionActive?:boolean; onClearSelection?:()=>void; route:string[]; mode:MapMode; showTravelers:boolean; tilted:boolean;
  cameraAction:{type:CameraAction;seq:number}; onSelect:(id:string)=>void; onPreviewRoute:(id:string)=>void;
}
interface MapAPI {retryResource:(source:string)=>void;update:()=>void;camera:(type:Props['cameraAction']['type'])=>void}
function armyOrderPreview(w:World,a:Army,id:string){const reason=realmReason(w,{type:'realm',action:'march',army:a.id,site:id}),j=a.journey,from=j?.route[j.leg+1]??a.location,path=from===id?{route:[id],days:0}:planRoute(from,id,node=>canMarchThrough(w,a.realm,node,id));return {reason,route:path?.route??[],days:path?path.days+(j?j.durations[j.leg]-j.elapsed:0):null};}

export function WorldMap(props:Props){
  const host=useRef<HTMLDivElement>(null),api=useRef<MapAPI|null>(null),current=useRef(props);
  current.current=props;
  const [combatGroupKey,setCombatGroupKey]=useState<string|null>(null);
  const [activitySite,setActivitySite]=useState<string|null>(null);
  const [error,setError]=useState(''),[errorAuth,setErrorAuth]=useState(false),[notices,setNotices]=useState<MapNotice[]>([]),[progress,setProgress]=useState<Partial<Record<MapLoadStage,MapLoadProgress>>>({}),[ready,setReady]=useState(false),[retry,setRetry]=useState(0);
  const detailProgress=progress.detail?.busy?progress.detail:progress.art?.busy?progress.art:progress.models?.busy?progress.models:undefined;
  function downloadDiagnostics(){const url=URL.createObjectURL(new Blob([JSON.stringify(mapResourceDiagnostics(),null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='fengyun-map-diagnostics.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  const [hover,setHover]=useState<{id:string;x:number;y:number;city:boolean}|null>(null);
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
    let lastDomains='',lastSeason='';
    let knownDomains:ReturnType<typeof campaignDomains>['realms']|undefined;
    let lastTerritory='',lastLevel='',lastSelectionActive:boolean|undefined,lastEvent:string|null|undefined;
    let terrainEnabled:boolean|undefined;
    let travelingIds=new Set<string>();
    let lastMode='',lastTilt:boolean|undefined,lastWorld:World|undefined,lastSelected='',lastRoute='';
    let hoveredId:string|null=null;
    const allMarkers:Marker[]=[],fogHidden=new Set<Marker>();
    const combatMarkers=new globalThis.Map<string,{marker:Marker;button:HTMLButtonElement}>();
    const activityMarkers=new globalThis.Map<string,{marker:Marker;button:HTMLButtonElement}>();
    let estateButton:HTMLButtonElement|undefined;
    const armyMarkers=new globalThis.Map<string,{marker:Marker;button:HTMLButtonElement;flag:HTMLImageElement;strength:HTMLSpanElement;label:HTMLElement}>();
    const motion=new ArmyMotion();
    const armyPosition=(a:Army)=>{const w=current.current.world;motion.sync(w,performance.now(),current.current.speed>0&&current.current.armyMotion);const battle=armyBattle(w,a);return !a.withdrawalUntil&&a.troops>=100&&battle?.contact?battle.contact:motion.position(a,performance.now());};
    let armyPlacements=new globalThis.Map<string,ArmyMarkerPlacement>();
    let militaryLayerReady=false;
    let sceneryLayer:Pick<CampaignSceneryLayer,'siteAt'|'showsSite'>|undefined;
    const places:{marker:Marker;button:HTMLButtonElement;badge:HTMLButtonElement;flag:HTMLImageElement;portrait:HTMLButtonElement;id:string;capital:boolean}[]=[];
    const people=new globalThis.Map<string,{marker:Marker;label:HTMLSpanElement}>();
    const labels:{marker:Marker;data:typeof atlasLabels[number]}[]=[];
    const realmLabels=new globalThis.Map<RealmId,Marker>();
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setReady(false);setError('');setErrorAuth(false);setNotices([]);setProgress({});setHover(null);setMenu(null);

    function home(){
      if(!map)return;
      map.fitBounds([[73,19],[135,53]],{padding:{top:125,bottom:105,left:28,right:28},pitch:0,bearing:0,duration:0,maxZoom:4.5});
    }
    function updateLabels(){
      if(!map||disposed)return;
      for(const marker of fogHidden)marker.getElement().hidden=false;fogHidden.clear();
      const zoom=map.getZoom(),w=container.clientWidth,h=container.clientHeight;
      const presentation=atlasPresentation(zoom,current.current.tilted),strategicView=presentation.strategic||!current.current.tilted;
      container.parentElement?.style.setProperty('--atlas-paper-strength',String(presentation.paper));
      container.parentElement?.setAttribute('data-scale',strategicView?'strategic':zoom>=CITY_DETAIL_ZOOM?'close':'landscape');
      const occupied:{x:number;y:number;width:number}[]=[];
      const list=[...places].sort((a,b)=>Number(b.id===current.current.selected)-Number(a.id===current.current.selected)||Number(b.id===(ownedEstates(current.current.world)[0]?.location??''))-Number(a.id===(ownedEstates(current.current.world)[0]?.location??''))||Number(b.capital)-Number(a.capital));
      const cityIds=annotationDensity(list.filter(i=>controlledSite(current.current.world,i.id)).map(i=>({key:i.id,point:map!.project(map!.cityCoordinate(i.id,[siteById[i.id].lon,siteById[i.id].lat])),priority:i.capital?2:siteById[i.id].rank==='county'?0:1,required:i.id===current.current.selected||i.id===(ownedEstates(current.current.world)[0]?.location??'')})),{width:w,height:h},zoom<6.2?6:zoom<9?10:16,zoom<9?150:115);
      const widths=new Map(list.map(item=>[item.id,item.marker.getElement().offsetWidth]));
      for(const item of list){
        const s=siteById[item.id],coordinate=map.cityCoordinate(s.id,[s.lon,s.lat]),p=map.project(coordinate);item.marker.setLngLat(coordinate);
        const selected=current.current.selectionActive!==false&&item.id===current.current.selected,estate=item.id===(ownedEstates(current.current.world)[0]?.location??'');
        const width=Math.max(widths.get(item.id)??0,s.name.length*14+38+(selected||item.capital&&zoom>=9?28:0)+(estate?34:0));
        const visible=!strategicView&&cityIds.has(item.id)&&controlledSite(current.current.world,item.id)&&p.x>10&&p.x<w-10&&p.y>15&&p.y<h-30&&(selected||estate||item.capital||zoom>=(s.rank==='county'?6:4.5))&&!occupied.some(v=>Math.abs(v.x-p.x)<(width+v.width)/2+12&&Math.abs(v.y-p.y)<36);
        item.marker.getElement().hidden=!visible;item.portrait.hidden=!(selected||item.capital&&zoom>=9);
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
      const travelerIds=annotationDensity([...people].filter(([id])=>travelingIds.has(id)).map(([id,entry])=>({key:id,point:map!.project([entry.marker.getLngLat().lng,entry.marker.getLngLat().lat]),priority:0,required:id==='player'||id===current.current.world.characterId})),{width:w,height:h},zoom<9?2:5,130);
      for(const [id,entry] of people){const self=id==='player'||id===current.current.world.characterId;entry.marker.getElement().hidden=!current.current.showTravelers||!travelingIds.has(id)||!travelerIds.has(id)||(!self&&(strategicView||zoom<7));}
      const armies=current.current.world.realm?.armies??[],models=armyShowsModel(zoom,current.current.militaryModels&&militaryLayerReady);
      const viewport=container.getBoundingClientRect(),mapMarkers:{marker:Marker;offset:[number,number];bounds:ScreenRect}[]=[];
      const annotations:{marker:Marker;offset:[number,number]}[]=[...list.map(p=>({marker:p.marker,offset:[0,sceneryLayer?.showsSite(p.id)?25:-7] as [number,number]})),...[...combatMarkers.values()].map(p=>({marker:p.marker,offset:[-44,-38] as [number,number]})),...[...activityMarkers.values()].map(p=>({marker:p.marker,offset:[18,-22] as [number,number]})),...[...people.values()].map(p=>({marker:p.marker,offset:[0,-2] as [number,number]})),...labels.map(l=>({marker:l.marker,offset:[0,0] as [number,number]}))];
      // Measure the undocked rectangle, so last frame's offset cannot feed back into the next layout.
      for(const {marker,offset} of annotations){
        const element=marker.getElement();if(element.hidden)continue;
        const rect=element.getBoundingClientRect();if(!rect.width||!rect.height)continue;const previous=marker.getOffset(),dx=previous.x-offset[0],dy=previous.y-offset[1];
        const bounds={left:rect.left-viewport.left-dx-6,top:rect.top-viewport.top-dy-6,right:rect.right-viewport.left-dx+6,bottom:rect.bottom-viewport.top-dy+6};if(bounds.right>0&&bounds.left<w&&bounds.bottom>0&&bounds.top<h){mapMarkers.push({marker,offset,bounds});}
      }
      const anchors=armies.map((a,i)=>{const pos=armyPosition(a);return {key:String(a.id??a.realm+':'+i),point:map!.project([pos.lon,pos.lat]),position:pos,combatSide:(()=>{const b=armyBattle(current.current.world,a);return b?liveBattleArmies(current.current.world,b,'attack').some(v=>v.id===a.id)?'attack':'defend':undefined;})(),available:typeof a.id==='number'&&a.id>0};}),view={width:w,height:h};
      const armyIds=annotationDensity(anchors.map((a,i)=>({...a,priority:armyDisplayState(current.current.world,armies[i])==='battle'?3:militaryArmyView(current.current.world,armies[i]).command?2:0,required:current.current.selectedArmies.includes(Number(a.key))})),view,zoom<6.2?4:zoom<9?8:12,90);
      const fixed=models&&!strategicView?anchoredArmyModels(anchors.filter(a=>a.available&&(armyIds.has(a.key)||a.combatSide)),current.current.selectedArmies.map(String),view):new globalThis.Map<string,ArmyMarkerPlacement>(),modelBounds=[...fixed.values()].map(p=>p.bounds);
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
      armyPlacements=new globalThis.Map([...fixed,...layoutArmyCards(anchors.filter(a=>!strategicView&&armyIds.has(a.key)&&!fixed.has(a.key)),[...placed,...modelBounds],view,strategicView,120)]);
      for(const [i,a] of armies.entries()){
        const item=armyMarkers.get(String(a.id??a.realm+':'+i));if(!item)continue;
        const placement=armyPlacements.get(String(a.id??a.realm+':'+i));item.button.hidden=strategicView||!placement;if(strategicView||!placement)continue;
        const {offset,model}=placement,size=armyMarkerFootprint(model,strategicView);
        item.button.dataset.presentation=model?'model':'card';
        item.button.style.setProperty('--army-target-width',(placement.combat?100:size.width)+'px');item.button.style.setProperty('--army-target-height',size.height+'px');item.button.style.setProperty('--army-foot',size.bottom+'px');
        item.button.style.setProperty('--army-badge-bottom',armyModelBadgeBottom(map.getPitch())+'px');
        item.button.style.setProperty('--army-link-length',Math.hypot(offset.x,offset.y)>12?Math.hypot(offset.x,offset.y)+'px':'0px');item.button.style.setProperty('--army-link-angle',Math.atan2(-offset.y,-offset.x)+'rad');
        const pos=armyPosition(a);item.marker.setLngLat([pos.lon,pos.lat]).setOffset([offset.x,offset.y+size.bottom]);
      }
      if(knownDomains){
        const outside=(marker:Marker)=>{const p=marker.getLngLat();return !knownDomains!.features.some(f=>waterMaskContains([p.lng,p.lat],f.geometry));};
        for(const marker of [...allMarkers,...[...armyMarkers.values(),...combatMarkers.values(),...activityMarkers.values()].map(v=>v.marker)])if(outside(marker)){marker.getElement().hidden=true;fogHidden.add(marker);}
        for(const [id,item] of armyMarkers)if(outside(item.marker))armyPlacements.delete(id);
      }
      if(models)map.triggerRepaint();
    }
    function syncPerspective(){
      if(!map||!styleReady||disposed)return;
      const enabled=current.current.tilted;
      if(terrainEnabled!==enabled){map.setTerrain(enabled);terrainEnabled=enabled;}
    }
    function focusSite(id:string){
      const site=siteById[id];
      map?.easeTo({center:[site.lon,site.lat],zoom:CITY_VIEW_ZOOM,pitch:atlasPresentation(CITY_VIEW_ZOOM,current.current.tilted).pitch,duration:reduced?0:500});
    }
    function openMenu(id:string,x:number,y:number){
      if(current.current.selectedArmies.length&&current.current.onCommandArmy(id)){setMenu(null);setHover(null);return;}
      current.current.onSelect(id);setHover(null);
      setMenu({id,x:Math.max(8,Math.min(x,container.clientWidth-220)),y:Math.max(8,Math.min(y,container.clientHeight-190))});
    }
    let lastLabelUpdate=-Infinity;
    const scheduleLabels=()=>{if(!frame)frame=requestAnimationFrame(now=>{frame=0;const cadence=map?.isMoving()?50:(current.current.world.realm?.armies??[]).some(a=>motion.moving(a,now))?1000/30:0;if(now-lastLabelUpdate<cadence){scheduleLabels();return;}lastLabelUpdate=now;updateLabels();});};
    function update(){
      if(!map||!styleReady||disposed)return;
      const p=current.current;
      const signature=domainSignature(p.world);
      if(signature!==lastDomains){const domain=campaignDomains(p.world);knownDomains=domain.realms;(map.getSource('unruled-fog') as GeoJSONSource).setData(domain.fog);for(const source of ['realms','frontiers'])(map.getSource(source) as GeoJSONSource).setData(domain.realms);lastDomains=signature;}
      const season=campaignSeason(p.world);if(lastSeason!==season){lastSeason=season;container.parentElement?.setAttribute('data-season',season);}
      const activeSites=sites.filter(s=>controlledSite(p.world,s.id)).map(s=>s.id);for(const layer of ['site-halo','site-heart'])map.setFilter(layer,['in',['get','id'],['literal',activeSites]]);
      const selectionActive=p.selectionActive!==false,selected=selectionActive?p.selected:'';
      if(lastTerritory!==p.territory||lastLevel!==p.territoryLevel||lastSelectionActive!==selectionActive){
        const selectedId=!selectionActive||territoryNodes[p.territory].level==='city'?'':p.territory;
        for(const layer of ['hierarchy-selected','hierarchy-selected-edge'])map.setFilter(layer,['==',['get','id'],selectedId]);
        for(const layer of ['hierarchy-seam','hierarchy-lines'])map.setFilter(layer,['==',['get','level'],p.territoryLevel]);
        for(const layer of ['territory-selected','territory-selected-shadow','territory-selected-edge','selected-ring'])map.setLayoutProperty(layer,'visibility',selectionActive&&p.territoryLevel==='city'?'visible':'none');
        if(!selectionActive){if(hoveredId)map.setFeatureState({source:'territories',id:hoveredId},{hover:false});hoveredId=null;setHover(null);setMenu(null);}
        lastTerritory=p.territory;lastLevel=p.territoryLevel;lastSelectionActive=selectionActive;
      }
      if(lastEvent!==p.historyEvent){
        const event=controlEvents.find(e=>e.id===p.historyEvent),city=event?siteById[event.site]:null;
        (map.getSource('history-event') as GeoJSONSource).setData({type:'FeatureCollection',features:city?[pointFeature(city.lon,city.lat)]:[]});
        lastEvent=p.historyEvent;
      }
      if(lastSelected!==selected){
        if(lastSelected)map.setFeatureState({source:'territories',id:lastSelected},{selected:false});
        if(selected)map.setFeatureState({source:'territories',id:selected},{selected:true});
        const site=siteById[selected];
        (map.getSource('selection') as GeoJSONSource).setData({type:'FeatureCollection',features:site?[pointFeature(site.lon,site.lat)]:[]});
        lastSelected=selected;
      }
      const selectedArmy=p.world.realm?.armies.find(a=>p.selectedArmies.includes(a.id!)),routeKey=p.route.join(',')+'|'+(selectedArmy?.id??'');
      if(lastWorld!==p.world||lastRoute!==routeKey){
        (map.getSource('route') as GeoJSONSource).setData(activeRoute(p.world,p.route,selectedArmy));
        const estate=ownedEstates(p.world)[0],estateSite=estate?siteById[estate.location]:undefined;
        if(estateButton&&estateSite&&estate){estateButton.hidden=false;
          places.find(item=>item.id===estate.location)?.marker.getElement().append(estateButton);
          estateButton.setAttribute('aria-label','查看'+estateName(estate.family)+'，位于'+estateSite.name);
          estateButton.title=estateSite.name+' · '+estateName(estate.family);
        }else if(estateButton)estateButton.hidden=true;
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
            const strength=document.createElement('span');strength.className='atlas-army-strength';const morale=document.createElement('span');morale.className='atlas-army-morale';morale.setAttribute('aria-hidden','true');body.append(label,strength,morale);button.append(flag,body);
            button.onmousedown=event=>{if(event.shiftKey)event.stopPropagation();};
            button.ondblclick=event=>event.stopPropagation();
            button.onclick=event=>{event.stopPropagation();const army=current.current.world.realm?.armies.find((b,j)=>String(b.id??b.realm+':'+j)===key);if(!army)return;if(army.id&&militaryArmyView(current.current.world,army).command)current.current.onSelectArmy(army.id,event.shiftKey);else current.current.onSelect(army.location);};
            const marker=new Marker({element:button,anchor:'bottom',offset:[0,68]}).setLngLat([105,34]).addTo(map);item={marker,button,flag,strength,label};armyMarkers.set(key,item);
          }
          const {lon,lat}=armyPosition(a),rebel=civilWar(p.world,a.realm)?.civil?.armies.includes(a.id!),view=militaryArmyView(p.world,a),name=regimeName(p.world,a.realm);
          item.marker.setLngLat([lon,lat]);item.button.style.setProperty('--army-cloth',polityStyle(p.world,a.realm).color);item.button.dataset.rebel=String(!!rebel);item.button.dataset.exact=String(view.exact);
          item.flag.src=armyHeraldry(a.realm,name,p.world);item.button.dataset.state=armyDisplayState(p.world,a);item.label.textContent=(rebel?'举兵 · ':'')+'第 '+(a.id??'')+' 军';item.strength.textContent=view.exact?view.strength:view.strength.replace('区域情报 ','估 ');
          item.button.style.setProperty('--army-morale',view.exact?Math.max(0,Math.min(100,a.morale))+'%':'0%');
          item.button.title=name+' · 第 '+(a.id??'')+' 军 · '+view.strength+(view.exact?' 人 / 士气 '+a.morale+' / 随军粮 '+a.supply+(a.arrears?' / 欠饷 '+a.arrears:''):' · 公开军旗');
          item.button.setAttribute('aria-label',`${name}第 ${a.id} 军，${view.strength}${view.exact?' 人，士气 '+a.morale:''}，${view.command?'点击选择，Shift 点击可多选':'查看驻地'}`);
          if(view.command)item.button.setAttribute('aria-pressed','false');else item.button.removeAttribute('aria-pressed');
        }

        const combats=engagementGroups(p.world);
        for(const [key,item] of combatMarkers)if(!combats.some(c=>c.key===key)){item.marker.remove();combatMarkers.delete(key);}
        for(const combat of combats){let item=combatMarkers.get(combat.key);if(!item){const button=document.createElement('button');button.type='button';button.className='atlas-combat-marker';const marker=new Marker({element:button,anchor:'bottom',offset:[-44,-38]}).setLngLat([combat.lon,combat.lat]).addTo(map);item={marker,button};combatMarkers.set(combat.key,item);}
         const kind=combat.items.some(i=>i.ref.kind==='battle')?'battle':'siege';item.button.textContent='';const icon=document.createElement('span');icon.className='art-icon';icon.style.backgroundPosition=kind==='battle'?'100% 66.6667%':'33.3333% 100%';item.button.append(icon);
         const primary=combat.items.find(i=>i.ref.kind===kind)!;
         if(kind==='siege'){const progress=document.createElement('span');progress.className='atlas-siege-progress';const values=combat.items.flatMap(i=>i.progress===undefined?[]:[i.progress]);progress.textContent=values.length>1?Math.min(...values)+'–'+Math.max(...values)+'%':primary.progress+'%';item.button.style.setProperty('--siege-progress',Math.min(...values)+'%');item.button.append(progress);}
         else if(primary.sides){primary.sides.forEach((side,index)=>{const row=document.createElement('span');row.className='atlas-combat-side';row.dataset.side=index===0?'attack':'defend';const flag=document.createElement('img');flag.src=armyHeraldry(side.realm,regimeName(p.world,side.realm),p.world);flag.alt=regimeName(p.world,side.realm);const strength=document.createElement('b');strength.textContent=side.strength;row.append(flag,strength);if(index===0)item!.button.prepend(row);else item!.button.append(row);});}
         if(kind==='battle'&&combat.items.some(i=>i.progress!==undefined)){const progress=document.createElement('span');progress.className='atlas-combat-siege-mini';const values=combat.items.flatMap(i=>i.progress===undefined?[]:[i.progress]);progress.textContent='围 '+(values.length===1?values[0]:Math.min(...values)+'–'+Math.max(...values))+'%';item.button.append(progress);}
         if(combat.items.length>1){const count=document.createElement('span');count.className='atlas-activity-count';count.textContent=String(combat.items.length);item.button.append(count);}
         item.marker.setLngLat([combat.lon,combat.lat]);item.button.dataset.kind=kind;item.button.title=combat.items.map(i=>i.label).join('\n');item.button.setAttribute('aria-label',combat.items.length>1?'查看此地 '+combat.items.length+' 场战事':'查看'+combat.items[0].label);item.button.onclick=e=>{e.stopPropagation();setMenu(null);const latest=engagementGroups(current.current.world).find(c=>c.key===combat.key);if(!latest)return;if(latest.items.length===1)current.current.onEngagement(latest.items[0].ref);else{current.current.onBrowseActivities();setCombatGroupKey(combat.key);}};
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
      map.setPaintProperty('realm-tint','fill-opacity',p.mode==='diplomacy'?0:p.mode==='domains'?['interpolate',['linear'],['zoom'],3,.12,5,.06,8,.015]:['interpolate',['linear'],['zoom'],3,.48,4.8,.44,6.2,.10,8,.035]);
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
      map.triggerRepaint();scheduleLabels();
    }

    try{
      const initialPosition=position(current.current.world.people[0]);
      map=new AtlasMap({
        container,style:atlasStyle(),center:[initialPosition.lon,initialPosition.lat],zoom:CITY_VIEW_ZOOM,pitch:atlasPresentation(CITY_VIEW_ZOOM,current.current.tilted).pitch,bearing:0,
        minZoom:1.1,maxZoom:12,
      });
      map.getCanvas().setAttribute('aria-label','全国三维地图，拖动平移，右键拖动旋转，滚轮缩放；右键单击查看操作，也可通过地点目录选择城邑');
      map.on('style.load',()=>{
        if(!map||disposed)return;
        styleReady=true;current.current.onMapReady?.(map);
        sceneryLayer={siteAt:point=>map?.siteAt(point)??null,showsSite:id=>map?.showsSite(id)??false};
        map.attachWorld(()=>({...current.current,armyPosition,armyMoving:(a:Army)=>motion.moving(a,performance.now()),selected:current.current.selectionActive===false?'':current.current.selected}),id=>armyPlacements.get(String(id)),()=>{militaryLayerReady=true;scheduleLabels();},message=>setNotices(value=>message?[...clearMapNotice(value,'models-runtime'),{source:'models-runtime',message,auth:message.includes('登录')}]:clearMapNotice(value,'models-runtime')));
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
        update();
      });
      const hit=(point:{x:number;y:number})=>{
        if(!map||!styleReady)return null;
        if(map.queryRenderedFeatures([point.x,point.y],{layers:['unruled-fog-cover']}).length)return null;
        const scenerySite=sceneryLayer?.siteAt(point);if(scenerySite)return scenerySite;
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
        const id=hit(event.point),model=id&&sceneryLayer?.siteAt(event.point);
        if(id!==hoveredId){clearHover();if(id){map?.setFeatureState({source:'territories',id},{hover:true});const p=current.current,a=p.world.realm?.armies.find(a=>p.selectedArmies.includes(a.id!));if(a){const order=armyOrderPreview(p.world,a,id);if(map&&!order.reason&&order.route.length)(map.getSource('route') as GeoJSONSource).setData(previewArmyRoute(a,order.route));}}hoveredId=id;}
        if(map)map.getCanvas().style.cursor=id?'pointer':'';
        setHover(id&&model?{id,city:true,x:Math.max(8,Math.min(event.point.x+18,container.clientWidth-240)),y:Math.max(8,Math.min(event.point.y+18,container.clientHeight-(current.current.selectedArmies.length?310:235)))}:null);
      });
      map.getCanvas().addEventListener('mouseleave',clearHover);
      map.on('movestart',()=>{clearHover();setMenu(null);});
      map.on('click',event=>{const p=current.current,id=hit(event.point),model=id&&sceneryLayer?.siteAt(event.point),node=id?nodeForSite(id,p.territoryLevel):null;if(!id||!model&&p.selectionActive!==false&&node?.id===p.territory){clearHover();p.onClearSelection?.();}else if(model)p.onSelect(id);else if(node)p.onSelectTerritory(node.id);setMenu(null);});
      map.on('dblclick',event=>{const id=hit(event.point);if(id){current.current.onSelect(id);focusSite(id);}});
      map.on('contextmenu',event=>{event.preventDefault();event.originalEvent.preventDefault();const id=hit(event.point);if(id)openMenu(id,event.point.x,event.point.y);});
      map.on('loadprogress',event=>{if(!disposed&&event.progress)setProgress(value=>({...value,[event.progress!.stage]:event.progress}));});
      map.on('error',event=>{
        if(disposed)return;
        console.error('[Atlas]',event.error);
        const source=event.sourceId??'map',auth=event.error instanceof MapResourceError&&event.error.kind==='auth';
        const message=auth?event.error.message:source==='detail-dem'?'近景细化暂未完成，当前保留真实全国底图。':source==='art'?'部分山色尚未载入，底图和地点操作仍可使用。':source==='models'?'城邑模型暂未载入，可继续使用地点铭牌。':source==='atlas-study'?'舆图室暂未载入，地图仍可使用。':event.error.message;
        if(source==='national-dem'||source==='map'){setError(auth?message:'地图暂未就绪：'+message);setErrorAuth(auth);}
        else setNotices(value=>[...clearMapNotice(value,source),{source,message,auth}]);
      });
      map.on('resourceinactive',event=>{if(!disposed&&event.sourceId)setNotices(value=>clearMapNotice(value,event.sourceId!));});
      map.on('webglcontextlost',()=>setError('图形上下文中断。重新载入地图可恢复，游戏进度仍保留。'));
      map.on('zoomend',syncPerspective);
      map.on('render',()=>{if((current.current.world.realm?.armies??[]).some(a=>motion.moving(a,performance.now())))scheduleLabels();});map.on('move',scheduleLabels);map.on('moveend',scheduleLabels);map.on('sourcedata',event=>{scheduleLabels();if(event.sourceId)setNotices(value=>clearMapNotice(value,event.sourceId!));});
      map.once('idle',()=>{setReady(true);setNotices(value=>clearMapNotice(value,'slow'));if(slowLoad)clearTimeout(slowLoad);});
      slowLoad=setTimeout(()=>{if(!disposed&&map&&!map.areTilesLoaded())setNotices(value=>[...clearMapNotice(value,'slow'),{source:'slow',message:'连接较慢，正在继续读取底图。'}]);},20000);
      observer=new ResizeObserver(()=>{map?.resize();scheduleLabels();});observer.observe(container);
      api.current={update,retryResource:source=>map?.retryResource(source),camera(type){
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
          map.easeTo({center:[p.lon,p.lat],zoom:CITY_VIEW_ZOOM,pitch:atlasPresentation(CITY_VIEW_ZOOM,current.current.tilted).pitch,duration});
        }else if(type==='left'||type==='right')map.easeTo({bearing:map.getBearing()+(type==='left'?-30:30),duration});
        else if(type==='north')map.easeTo({bearing:0,duration});
        else if(type==='in')map.zoomIn({duration});else map.zoomOut({duration});
      }};
    }catch(e){setError(e instanceof Error?e.message:'无法启动 WebGL 2 地图。');}
    return()=>{
      disposed=true;if(slowLoad)clearTimeout(slowLoad);cancelAnimationFrame(frame);observer?.disconnect();
      combatMarkers.forEach(e=>e.marker.remove());activityMarkers.forEach(e=>e.marker.remove());armyMarkers.forEach(e=>e.marker.remove());allMarkers.forEach(marker=>marker.remove());current.current.onMapReady?.(null);map?.remove();api.current=null;
    };
  },[retry]);

  const shownEvent=controlEvents.find(e=>e.id===props.historyEvent);
  const hoverNode=hover?nodeForSite(hover.id,hover.city?'city':props.territoryLevel):null;
  const hoverSite=hover?siteById[hover.id]:null;
  const hoverCity=hoverSite?props.world.realm?.cities[hoverSite.id]:undefined;
  const hoverGovernor=hoverCity?.owner===hoverCity?.controller?hoverCity?.governor:null;
  const hoverController=hoverCity?.controller??hoverSite?.polity;
  const player=props.world.people[0];
  const hoverPlan=hoverSite&&!player.journey?personalRoute(props.world,hoverSite.id):null;
  const hoverArmy=props.world.realm?.armies.find(a=>props.selectedArmies.includes(a.id!));
  const hoverOrder=hoverSite&&hoverArmy?armyOrderPreview(props.world,hoverArmy,hoverSite.id):null;
  const combatGroup=combatGroupKey?engagementGroups(props.world).find(g=>g.key===combatGroupKey):undefined;
  const activityGroup=activitySite?mapActivities(props.world).find(group=>group.site===activitySite):undefined;
  return <div className={`world-map atlas-map${ready?' is-ready':''}`}>
    <div className="map-canvas atlas-canvas" ref={host}/>
    <div className="atlas-paper" aria-hidden="true"/>
    {combatGroupKey&&<ActionDialog title="此地战事" cancelLabel="返回地图" onClose={()=>setCombatGroupKey(null)} actions={null}><div className="war-event-list">{combatGroup?combatGroup.items.map(item=><button key={item.key} onClick={()=>{setCombatGroupKey(null);props.onEngagement(item.ref);}}><ArtIcon name={item.ref.kind==='battle'?'army':'city'} size={26}/><span>{item.label}</span><b>查看 ›</b></button>):<p>此地已无进行中的战事。</p>}</div></ActionDialog>}
    {activityGroup&&<OngoingItemsDialog title={siteById[activityGroup.site].name+'事务'} icon="city" items={activityGroup.items} onClose={()=>setActivitySite(null)} onOpen={props.onActivity}/>}
    {shownEvent&&<div className="history-map-notice"><strong>{shownEvent.year} 年 · {shownEvent.label}</strong><span>标记为城市攻取记录；底图仍是 546 行政基底，未重建当年疆界。</span></div>}
    {hover&&hoverSite&&!menu&&<div className="territory-tooltip" style={{left:hover.x,top:hover.y}}>
      <span className="territory-kicker">{regimeName(props.world,props.world.realm?.cities[hoverSite.id]?.controller??hoverSite.polity)} · {administration[hoverSite.id]?.prefecture??'区划待核'}</span><strong>{hoverNode?.name??hoverSite.name}</strong><p>{hoverNode?levelNames[hoverNode.level]:'城市'} · 单击选择此层级</p>
      <p>{administrationPath(hoverSite.id)}</p><p>{hoverSite.terrain}{hoverController&&hoverController!=='frontier'&&capital(hoverController,props.world)===hoverSite.id?' · 都城':''}</p>
      {hover.city&&hoverCity&&<><p>治理者：{hoverGovernor?getPerson(props.world,hoverGovernor)?.name??'未录姓名':'空席'}{hoverCity.owner!==hoverCity.controller?' · 法理属'+regimeName(props.world,hoverCity.owner):''}</p><p>居民 {hoverCity.population.toLocaleString()} · 秩序 {hoverCity.order} · 繁荣 {hoverCity.prosperity}</p></>}
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
    {!error&&<MapLoading ready={ready} progress={progress.terrain}/>}
    {ready&&!error&&detailProgress&&<MapDetailLoading progress={detailProgress}/>}
    {!!notices.length&&!error&&<div className="atlas-network-notice" role="status"><div className="map-notice-text">{notices.map(notice=><span key={notice.source}>{notice.message}</span>)}</div><div className="map-notice-actions">{notices.some(n=>n.auth)&&<a href="/?login=games" target="_blank" rel="noopener">重新登录</a>}{notices.some(n=>['detail-dem','art','models','models-runtime','atlas-study'].includes(n.source))&&<button onClick={()=>notices.forEach(n=>api.current?.retryResource(n.source))}>重试未完成部分</button>}<button onClick={downloadDiagnostics}>下载诊断</button></div></div>}
    {error&&<div className="map-status error" role="alert">{error}{errorAuth&&<a href="/?login=games" target="_blank" rel="noopener">重新登录</a>}<button onClick={()=>setRetry(n=>n+1)}>{errorAuth?'登录后重试':'重新载入地图'}</button><button onClick={downloadDiagnostics}>下载诊断</button></div>}
  </div>;
}
