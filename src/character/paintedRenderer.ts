import { validatePaintedRecipe,type PaintedRecipe,type PaintedPart } from './paintedLayers';

const sources=new Map<string,Promise<HTMLImageElement>>();
const SOURCE_LIMIT=48;
function loadSource(url:string){
 let request=sources.get(url);
 if(request){sources.delete(url);sources.set(url,request);}
 if(!request){
  request=new Promise<HTMLImageElement>((resolve,reject)=>{
   const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('人物素材载入失败：'+url));image.src=url;
  });
  if(sources.size>=SOURCE_LIMIT)sources.delete(sources.keys().next().value!);
  sources.set(url,request);const current=request;
  request.catch(()=>{if(sources.get(url)===current)sources.delete(url);});
 }
 return request;
}

/** Opaque roster sheets contain white paper around the painted head. Only remove paper
 * connected to the silhouette's outside, never a white detail enclosed by the face. */
export function removeConnectedPaper(data:Uint8ClampedArray,width:number,height:number){
 const length=width*height,visited=new Uint8Array(length),queue=new Int32Array(length);
 let write=0,read=0;
 const paper=(index:number)=>{const k=index*4,r=data[k],g=data[k+1],b=data[k+2];return r>=235&&g>=235&&b>=231&&Math.max(r,g,b)-Math.min(r,g,b)<=20;};
 const accept=(index:number)=>{if(visited[index]||data[index*4+3]!==0&&!paper(index))return;visited[index]=1;queue[write++]=index;};
 for(let x=0;x<width;x++){accept(x);accept((height-1)*width+x);}
 for(let y=0;y<height;y++){accept(y*width);accept(y*width+width-1);}
 while(read<write){
  const index=queue[read++],x=index%width,y=Math.floor(index/width);
  if(data[index*4+3]!==0)data[index*4+3]=0;
  if(x>0)accept(index-1);if(x+1<width)accept(index+1);
  if(y>0)accept(index-width);if(y+1<height)accept(index+width);
 }
}

function maskedPart(image:HTMLImageElement,part:PaintedPart){
 const box=part.crop,canvas=document.createElement('canvas');
 canvas.width=Math.ceil(box.width);canvas.height=Math.ceil(box.height);
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('无法创建部件画布');
 ctx.drawImage(image,box.x,box.y,box.width,box.height,0,0,canvas.width,canvas.height);
 const mask=part.mask;if(!mask)return canvas;
 const layer=document.createElement('canvas');layer.width=canvas.width;layer.height=canvas.height;
 const mc=layer.getContext('2d');if(!mc)throw new Error('无法创建融合画布');
 if(mask.kind==='bottom-fade'){
  const fade=mc.createLinearGradient(0,0,0,layer.height);
  fade.addColorStop(0,'white');fade.addColorStop(mask.start,'white');fade.addColorStop(1,'transparent');
  mc.fillStyle=fade;mc.fillRect(0,0,layer.width,layer.height);
 }else{
  mc.filter=`blur(${Math.min(layer.width,layer.height)*mask.softness}px)`;mc.fillStyle='white';
  mc.beginPath();mask.points.forEach(([x,y],i)=>{if(i===0)mc.moveTo(x*layer.width,y*layer.height);else mc.lineTo(x*layer.width,y*layer.height);});mc.closePath();mc.fill();
 }
 ctx.globalCompositeOperation='destination-in';ctx.drawImage(layer,0,0);
 if(part.removePaper){const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);removeConnectedPaper(pixels.data,canvas.width,canvas.height);ctx.putImageData(pixels,0,0);}
 return canvas;
}

/** Render offscreen first: a failed part never leaves a partially drawn face on screen. */
export async function renderPaintedPortrait(recipe:PaintedRecipe,width=768,height=1152){
 const parts=validatePaintedRecipe(recipe);
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>2048||height>3072)throw new Error('立绘画布尺寸无效');
 const images=await Promise.all(parts.map(part=>loadSource(part.source)));
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('无法创建人物画布');
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 parts.forEach((part,index)=>{
  const image=images[index],box=part.crop,target=part.place;
  if(box.x+box.width>image.naturalWidth||box.y+box.height>image.naturalHeight)throw new Error('人物素材尺寸与配置不一致：'+part.id);
  if(part.mask)ctx.drawImage(maskedPart(image,part),target.x*width,target.y*height,target.width*width,target.height*height);
  else ctx.drawImage(image,box.x,box.y,box.width,box.height,target.x*width,target.y*height,target.width*width,target.height*height);
 });
 return canvas;
}
