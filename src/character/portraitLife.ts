import type {PaintedRecipe} from './paintedLayers';
export interface PortraitLife {age:number;baselineAge:number;sickness:0|1|2|3;deceased:boolean;beard?:boolean}
export function lifeAppearance(life:PortraitLife){
 const clamp=(n:number)=>Math.max(0,Math.min(1,n));
 return {wrinkles:clamp((life.age-35)/45),additionalAge:clamp((life.age-Math.max(35,life.baselineAge))/40),silver:clamp((life.age-45)/40),pallor:life.sickness/3,deceased:life.deceased};
}
/** An independent, anatomy-anchored wash layer. Identity, clothing and source art stay intact. */
export function paintLifeLayer(canvas:HTMLCanvasElement,recipe:PaintedRecipe,life:PortraitLife){
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const a=lifeAppearance(life),w=canvas.width,h=canvas.height;
 const part=(slot:string)=>recipe.parts.find(p=>p.slot===slot)!.place;
 const left=part('eye-left'),right=part('eye-right'),nose=part('nose'),mouth=part('mouth');
 const eyes=[left,right].map(b=>({x:(b.x+b.width/2)*w,y:(b.y+b.height/2)*h,width:b.width*w,height:b.height*h}));
 const centerX=(eyes[0].x+eyes[1].x)/2,eyeY=(eyes[0].y+eyes[1].y)/2,span=Math.abs(eyes[1].x-eyes[0].x);
 const mouthY=(mouth.y+mouth.height/2)*h,faceH=Math.max(span,mouthY-eyeY),faceW=span*1.5;
 // Dark low-chroma pixels in the temples and beard receive silver ink. A soft mask
 // excludes the cap, skin and robe, unlike a whole-portrait grayscale age filter.
 if(a.silver>0){
  const pixels=ctx.getImageData(0,0,w,h),data=pixels.data;
  for(let y=Math.max(0,Math.floor(eyeY-faceH*.9));y<Math.min(h,mouthY+faceH*.9);y++)for(let x=Math.max(0,Math.floor(centerX-faceW));x<Math.min(w,centerX+faceW);x++){
   const dx=(x-centerX)/faceW,dy=(y-eyeY)/faceH;
   const temple=Math.max(0,1-Math.abs(Math.abs(dx)-.85)/.18)*Math.max(0,1-Math.abs(dy+.25)/.7);
   const beard=(life.beard===false?0:1)*Math.max(0,1-Math.abs(dx)/.52)*Math.max(0,1-Math.abs(dy-1.45)/.55);
   const i=(y*w+x)*4,lum=data[i]*.3+data[i+1]*.59+data[i+2]*.11,chroma=Math.max(data[i],data[i+1],data[i+2])-Math.min(data[i],data[i+1],data[i+2]);
   const strength=Math.max(temple,beard)*a.silver*.64*Math.max(0,1-lum/115)*Math.max(0,1-chroma/65);
   for(let c=0;c<3;c++)data[i+c]+=([185,181,163][c]-data[i+c])*strength;
  }
  ctx.putImageData(pixels,0,0);
 }
 ctx.save();ctx.lineCap='round';ctx.lineWidth=Math.max(.6,w/900);
 const line=(x:number,y:number,dx:number,dy:number,opacity:number)=>{ctx.strokeStyle=`rgba(94,68,52,${opacity})`;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+dx*.55,y+dy*.25+1.5*w/768,x+dx,y+dy);ctx.stroke();};
 const ink=(a.wrinkles*.12+a.additionalAge*.17);
 for(const [i,e] of eyes.entries()){
  const outward=i===0?-1:1;
  for(let k=0;k<3;k++)line(e.x+outward*e.width*.3,e.y+k*2*h/1152,outward*e.width*.24,(k-1)*3*h/1152,ink);
  line(e.x-e.width*.28,e.y+e.height*.34,e.width*.52,1,ink*.65+a.pallor*.17);
 }
 if(a.wrinkles>.2){
  for(let k=0;k<2;k++)line(centerX-span*.4,eyeY-faceH*(.55+k*.1),span*.75,1,ink*.65);
  line(nose.x*w, (nose.y+nose.height*.75)*h,-span*.12,faceH*.4,ink);
  line((nose.x+nose.width)*w,(nose.y+nose.height*.75)*h,span*.12,faceH*.4,ink);
 }
 if(a.pallor){
  const wash=ctx.createRadialGradient(centerX,eyeY+faceH*.35,span*.1,centerX,eyeY+faceH*.35,faceW);
  wash.addColorStop(0,`rgba(171,177,157,${a.pallor*.2})`);wash.addColorStop(1,'rgba(171,177,157,0)');ctx.fillStyle=wash;ctx.fillRect(centerX-faceW,eyeY-faceH*.5,faceW*2,faceH*2);
 }
 ctx.restore();
 if(a.deceased){const memory=document.createElement('canvas');memory.width=w;memory.height=h;memory.getContext('2d')!.drawImage(canvas,0,0);ctx.save();ctx.filter='grayscale(1) sepia(.22)';ctx.drawImage(memory,0,0);ctx.restore();}
}
