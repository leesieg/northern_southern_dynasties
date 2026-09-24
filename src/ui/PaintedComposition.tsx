import {paintLifeLayer,type PortraitLife} from '../character/portraitLife';
import {useEffect,useRef,useState} from 'react';
import type {PaintedRecipe} from '../character/paintedLayers';
import {renderPaintedPortrait} from '../character/paintedRenderer';

export function PaintedComposition({recipe,compact,life}:{recipe:PaintedRecipe;compact:boolean;life?:PortraitLife}){
 const holder=useRef<HTMLDivElement>(null),[status,setStatus]=useState<'loading'|'ready'|'error'>('loading'),[retry,setRetry]=useState(0);
 // World ticks do not repaint an unchanged face; only the actual recipe is a dependency.
 const key=JSON.stringify(recipe),lifeKey=JSON.stringify(life??null);
 useEffect(()=>{
  let active=true;setStatus('loading');holder.current?.replaceChildren();
  void renderPaintedPortrait(JSON.parse(key) as PaintedRecipe).then(source=>{
   if(!active)return;
   if(lifeKey!=='null')paintLifeLayer(source,JSON.parse(key),JSON.parse(lifeKey));
   const canvas=document.createElement('canvas');canvas.width=compact?384:768;canvas.height=compact?384:1152;
   const ctx=canvas.getContext('2d');if(!ctx)throw new Error('人物画布不可用');
   ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
   if(compact){const crop=(JSON.parse(key) as PaintedRecipe).thumbnail??{x:310/1024,y:180/1536,width:360/1024,height:360/1536};ctx.drawImage(source,crop.x*source.width,crop.y*source.height,crop.width*source.width,crop.height*source.height,0,0,384,384);}
   else ctx.drawImage(source,0,0,768,1152);
   canvas.setAttribute('aria-hidden','true');holder.current?.replaceChildren(canvas);setStatus('ready');
  }).catch(()=>{if(active)setStatus('error');});
  return()=>{active=false;};
 },[key,lifeKey,compact,retry]);
 return <><div ref={holder} className="painted-composition-canvas" aria-busy={status==='loading'}/>{status!=='ready'&&<div className="painted-portrait-status" role="status">{status==='loading'?'正在绘制肖像…':<>肖像载入失败{!compact&&<button type="button" onClick={event=>{event.stopPropagation();setRetry(v=>v+1);}}>重试</button>}</>}</div>}</>;
}
