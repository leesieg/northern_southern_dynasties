import {portraitContext} from '../character/composition';
import {approvedPaintedRecipe} from '../character/paintedSelection';
import {portraitImage} from '../character/portraitCache';
import type {World} from '../core/types';

/** Share the portrait cache; discard late results after a marker changes or is removed. */
export function updateMarkerPortrait(host:HTMLElement,id:string|undefined,world:World){
 if(!id){host.replaceChildren();delete host.dataset.portraitKey;host.textContent='城';return;}
 const context=portraitContext(id,world),recipe=JSON.stringify(approvedPaintedRecipe(id,context)),life=JSON.stringify(context.life??null),key=id+recipe+life;
 if(host.dataset.portraitKey===key)return;
 host.dataset.portraitKey=key;host.replaceChildren();host.textContent='…';
 void portraitImage(recipe,life,true).then(source=>{
  if(!host.isConnected||host.dataset.portraitKey!==key)return;
  const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;canvas.getContext('2d')!.drawImage(source,0,0);canvas.setAttribute('aria-hidden','true');host.replaceChildren(canvas);
 }).catch(()=>{if(host.dataset.portraitKey===key){delete host.dataset.portraitKey;host.textContent='人';host.title='肖像暂未载入，后续更新时重试';}});
}
