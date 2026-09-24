import {renderPaintedPortrait} from './paintedRenderer';
import {paintLifeLayer,type PortraitLife} from './portraitLife';
import type {PaintedRecipe} from './paintedLayers';
// Bounded decoded-pixel cache; pending requests are shared across all mounted portraits.
const ready=new Map<string,HTMLCanvasElement>(),pending=new Map<string,Promise<HTMLCanvasElement>>();
const LIMIT=24*1024*1024;let pixels=0;
const cacheKey=(recipe:string,life:string,compact:boolean)=>recipe+'|'+life+'|'+compact;
export function peekPortrait(recipe:string,life:string,compact:boolean){const key=cacheKey(recipe,life,compact),canvas=ready.get(key);if(canvas){ready.delete(key);ready.set(key,canvas);}return canvas;}
export function portraitImage(recipeKey:string,lifeKey:string,compact:boolean){
 const key=cacheKey(recipeKey,lifeKey,compact),cached=peekPortrait(recipeKey,lifeKey,compact);if(cached)return Promise.resolve(cached);
 const inflight=pending.get(key);if(inflight)return inflight;
 const request=(async()=>{const recipe=JSON.parse(recipeKey) as PaintedRecipe,source=compact?await portraitImage(recipeKey,lifeKey,false):await renderPaintedPortrait(recipe);if(!compact&&lifeKey!=='null')paintLifeLayer(source,recipe,JSON.parse(lifeKey) as PortraitLife);
 const canvas=document.createElement('canvas');canvas.width=compact?192:768;canvas.height=compact?192:1152;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('肖像画布不可用');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 if(compact){const c=recipe.thumbnail??{x:310/1024,y:180/1536,width:360/1024,height:360/1536};ctx.drawImage(source,c.x*source.width,c.y*source.height,c.width*source.width,c.height*source.height,0,0,192,192);}else ctx.drawImage(source,0,0);
 while(ready.size&&pixels+canvas.width*canvas.height>LIMIT){const first=ready.keys().next().value!,old=ready.get(first)!;pixels-=old.width*old.height;ready.delete(first);}ready.set(key,canvas);pixels+=canvas.width*canvas.height;return canvas;})();
 pending.set(key,request);void request.then(()=>pending.delete(key),()=>pending.delete(key));return request;
}
