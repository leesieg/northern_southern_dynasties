import {type PortraitLife} from '../character/portraitLife';
import {useLayoutEffect,useRef,useState} from 'react';
import type {PaintedRecipe} from '../character/paintedLayers';
import {portraitImage,peekPortrait} from '../character/portraitCache';

export function PaintedComposition({recipe,compact,life}:{recipe:PaintedRecipe;compact:boolean;life?:PortraitLife}){
 const lastRecipe=useRef<string|null>(null),holder=useRef<HTMLDivElement>(null),[status,setStatus]=useState<'loading'|'ready'|'error'>('loading'),[retry,setRetry]=useState(0);
 // World ticks do not repaint an unchanged face; only the actual recipe is a dependency.
 const key=JSON.stringify(recipe),lifeKey=JSON.stringify(life??null);
 useLayoutEffect(()=>{
  let active=true;
  const show=(source:HTMLCanvasElement)=>{if(!active)return;const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;canvas.getContext('2d')!.drawImage(source,0,0);canvas.setAttribute('aria-hidden','true');holder.current?.replaceChildren(canvas);lastRecipe.current=key;setStatus('ready');};
  const cached=peekPortrait(key,lifeKey,compact);
  if(cached)show(cached);
  else {setStatus('loading');if(lastRecipe.current!==key)holder.current?.replaceChildren();}
  let observer:IntersectionObserver|undefined;
  if(!cached){const start=()=>{observer?.disconnect();void portraitImage(key,lifeKey,compact).then(show).catch(()=>{if(active)setStatus('error');});};if(typeof IntersectionObserver==='undefined'||!holder.current)start();else {observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))start();},{rootMargin:'120px'});observer.observe(holder.current);}}
  return()=>{active=false;observer?.disconnect();};
 },[key,lifeKey,compact,retry]);
 return <><div ref={holder} className="painted-composition-canvas" aria-busy={status==='loading'}/>{status!=='ready'&&<div className={`painted-portrait-status ${lastRecipe.current===key?'is-refreshing':''}`} role="status">{status==='loading'?<span className="portrait-loading-sigil" aria-label="肖像载入中">◌</span>:<>肖像载入失败{<button type="button" onClick={event=>{event.stopPropagation();setRetry(v=>v+1);}}>重试</button>}</>}</div>}</>;
}
