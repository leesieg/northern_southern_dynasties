// The authored portrait sheets have opaque paper backgrounds. Only the audience
// view needs a cutout, so keep the shared portrait cache and source art intact.
const cutouts=new WeakMap<HTMLCanvasElement,HTMLCanvasElement>();

export function removePortraitBackdrop(pixels:Uint8ClampedArray,width:number,height:number){
 const count=width*height,seen=new Uint8Array(count),queue=new Int32Array(count);
 const corner=(x:number,y:number)=>{const i=(y*width+x)*4;return [pixels[i],pixels[i+1],pixels[i+2]];};
 const first=corner(0,0),last=corner(width-1,0);
 const paper=Math.min(...first)>=Math.min(...last)?first:last;
 // Flood from the image edge so pale clothing and faces inside the silhouette survive.
 const difference=(index:number)=>{
  const i=index*4;
  return Math.max(Math.abs(pixels[i]-paper[0]),Math.abs(pixels[i+1]-paper[1]),Math.abs(pixels[i+2]-paper[2]));
 };
 const eligible=(index:number)=>{
  const i=index*4;
  return pixels[i+3]>0&&Math.min(pixels[i],pixels[i+1],pixels[i+2])>205&&difference(index)<48;
 };
 let head=0,tail=0;
 const enqueue=(index:number)=>{if(!seen[index]&&eligible(index)){seen[index]=1;queue[tail++]=index;}};
 for(let x=0;x<width;x++){enqueue(x);enqueue((height-1)*width+x);}
 for(let y=1;y<height-1;y++){enqueue(y*width);enqueue(y*width+width-1);}
 while(head<tail){
  const index=queue[head++],x=index%width,y=(index-x)/width;
  if(x>0)enqueue(index-1);
  if(x+1<width)enqueue(index+1);
  if(y>0)enqueue(index-width);
  if(y+1<height)enqueue(index+width);
 }
 // Soften only the single pixel immediately bordering the removed paper.
 const softened=new Uint8Array(count);
 const soften=(neighbor:number)=>{
  if(neighbor<0||seen[neighbor]||softened[neighbor])return;
  softened[neighbor]=1;
  const delta=difference(neighbor);
  if(delta>=85)return;
  const offset=neighbor*4,alpha=Math.max(0,Math.min(255,Math.round((delta-35)*255/50)));
  if(alpha>=pixels[offset+3])return;
  if(alpha>0){
   const fraction=alpha/255;
   for(let channel=0;channel<3;channel++)pixels[offset+channel]=Math.max(0,Math.min(255,Math.round((pixels[offset+channel]-(1-fraction)*paper[channel])/fraction)));
  }
  pixels[offset+3]=alpha;
 };
 for(let i=0;i<tail;i++){
  const index=queue[i],x=index%width,y=(index-x)/width;
  if(x>0)soften(index-1);
  if(x+1<width)soften(index+1);
  if(y>0)soften(index-width);
  if(y+1<height)soften(index+width);
  pixels[index*4+3]=0;
 }
}

export function cutoutPortrait(source:HTMLCanvasElement){
 const cached=cutouts.get(source);if(cached)return cached;
 const canvas=document.createElement('canvas');canvas.width=Math.min(source.width,384);canvas.height=Math.round(source.height*canvas.width/source.width);
 const context=canvas.getContext('2d');if(!context)throw new Error('无法创建透明肖像');
 context.drawImage(source,0,0,canvas.width,canvas.height);
 const image=context.getImageData(0,0,canvas.width,canvas.height);
 removePortraitBackdrop(image.data,canvas.width,canvas.height);
 context.putImageData(image,0,0);cutouts.set(source,canvas);
 return canvas;
}
