import {useEffect,useMemo,useRef} from 'react';
import type {World} from '../core/types';
import {siteById,sites} from '../data/scenario';
import {campaignDomains,controlledSite} from '../map/campaignDomains';
import {minimapProjection,minimapPoint} from '../map/minimapProjection';
import type {ThreeCampaignMap} from '../map/three/ThreeCampaignMap';
export function CampaignMinimap({map,world,selected}:{map:ThreeCampaignMap|null;world:World;selected:string}){
 const regions=campaignDomains(world).realms,projection=useMemo(()=>minimapProjection(regions),[regions]);
 const shapes=useMemo(()=>regions.features.map(f=>({id:String(f.properties?.id),color:String(f.properties?.color??'#b0b18b'),path:projection.path(f.geometry)})),[regions,projection]);
 const viewport=useRef<SVGPolygonElement>(null),center=useRef<SVGCircleElement>(null),compass=useRef<SVGGElement>(null),frame=useRef(0),drag=useRef<number|null>(null);
 useEffect(()=>{
  if(!map)return;
  const draw=()=>{frame.current=0;const view=map.minimapView(),p=projection.project(...view.center);viewport.current?.setAttribute('points',view.corners.map(ll=>{const p=projection.project(...ll);return p.x.toFixed(2)+','+p.y.toFixed(2);}).join(' '));center.current?.setAttribute('cx',String(p.x));center.current?.setAttribute('cy',String(p.y));compass.current?.setAttribute('transform',`rotate(${-map.getBearing()} 100 100)`);};
  const queue=()=>{if(!frame.current)frame.current=requestAnimationFrame(draw);};draw();map.on('move',queue);map.on('moveend',queue);map.on('sourcedata',queue);
  return()=>{cancelAnimationFrame(frame.current);frame.current=0;map.off('move',queue);map.off('moveend',queue);map.off('sourcedata',queue);};
 },[map,projection]);
 const jump=(x:number,y:number,immediate=false)=>{if(!map)return;const p=projection.unproject(x,y);map.easeTo({center:[p.lng,p.lat],zoom:Math.max(6.3,map.getZoom()),duration:immediate||matchMedia('(prefers-reduced-motion: reduce)').matches?0:220});};
 const selectedSite=siteById[selected],selectedPoint=selectedSite&&projection.project(selectedSite.lon,selectedSite.lat);
 return <div className="campaign-minimap-frame">
  <div className="campaign-minimap-surface" role="button" tabIndex={map?0:-1} aria-disabled={!map} aria-label="小地图：点击或拖动定位，方向键平移，回车返回主地图" title="小地图 · 点击或拖动定位"
   onPointerDown={e=>{if(!map||e.button!==0)return;const p=minimapPoint(e.clientX,e.clientY,e.currentTarget.getBoundingClientRect());if(!p)return;e.preventDefault();e.currentTarget.focus();drag.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);jump(p.x,p.y,true);}}
   onPointerMove={e=>{if(drag.current!==e.pointerId)return;const p=minimapPoint(e.clientX,e.clientY,e.currentTarget.getBoundingClientRect());if(p)jump(p.x,p.y,true);}}
   onPointerUp={e=>{if(drag.current===e.pointerId){drag.current=null;e.currentTarget.releasePointerCapture(e.pointerId);}}} onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}}
   onKeyDown={e=>{if(!map)return;if(e.key==='Enter'||e.key===' '){e.preventDefault();map.getCanvas().focus();return;}const delta=({ArrowLeft:[-8,0],ArrowRight:[8,0],ArrowUp:[0,-8],ArrowDown:[0,8]} as Record<string,number[]>)[e.key];if(delta){e.preventDefault();const p=projection.project(...map.minimapView().center);jump(p.x+delta[0],p.y+delta[1]);}}}>
   <svg viewBox="0 0 200 200" aria-hidden="true" className="campaign-minimap-chart">
    <circle cx="100" cy="100" r="100" fill="#ddcfaa"/>
    <image href={import.meta.env.BASE_URL+'art/campaign/national-parchment.webp'} {...projection.paper} preserveAspectRatio="none" opacity=".8"/>
    <g stroke="#776b48" strokeWidth=".45" strokeLinejoin="round" fillRule="evenodd">{shapes.map(f=><path key={f.id} d={f.path} fill={f.color} fillOpacity=".64"/>)}</g>
    <g fill="#655233" opacity=".72">{sites.filter(s=>controlledSite(world,s.id)&&s.capital).map(s=>{const p=projection.project(s.lon,s.lat);return <circle key={s.id} cx={p.x} cy={p.y} r="1.45"/>;})}</g>
    {selectedPoint&&<circle cx={selectedPoint.x} cy={selectedPoint.y} r="2.8" fill="#a33320" stroke="#f9e7b0" strokeWidth=".7"/>}
    <polygon ref={viewport} className="minimap-viewport" fill="#fff2c922" stroke="#fff3ba" strokeWidth="1.1"/>
    <circle ref={center} r="1.7" fill="#fff5cb" stroke="#362e1d" strokeWidth=".7"/>
   </svg>
  </div>
  <svg className="campaign-minimap-compass" viewBox="0 0 200 200" aria-hidden="true"><g ref={compass}><path d="M100 5l-3 7 3-1 3 1z" fill="#d5ba75"/><path d="M100 195l-2-5h4z" fill="#8f784b"/></g></svg>
  {!map&&<span className="minimap-loading" role="status">舆图载入中</span>}
 </div>;
}
