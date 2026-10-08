/** Original, static map-anchored pigments. Landcover masks come from the vector source;
 * these tiles describe material only, never terrain, forest extent or historical land use. */
export const ATLAS_MATERIALS=['atlas-earth-grain','atlas-canopy','atlas-water-silk','atlas-fog-cloud'] as const;
export type AtlasMaterial=typeof ATLAS_MATERIALS[number];
export function atlasMaterial(name:AtlasMaterial){
 const width=128,height=128,data=new Uint8Array(width*height*4);
 const noise=(x:number,y:number)=>{let v=Math.imul(x+17,374761393)^Math.imul(y+59,668265263);v=Math.imul(v^(v>>>13),1274126177);return ((v^(v>>>16))>>>0)/4294967295;};
 const crowns=Array.from({length:30},(_,i)=>({x:noise(i,1)*128,y:noise(i,2)*128,r:3+noise(i,3)*5,warm:noise(i,4)>.74}));
 const wrap=(d:number)=>d-Math.round(d/128)*128;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4,n=noise(x,y);let r=73,g=68,b=42,a=0;
  if(name==='atlas-fog-cloud'){
   const cloud=(Math.sin(x*Math.PI/64+Math.sin(y*Math.PI/64)*1.2)+Math.cos(y*Math.PI/64)+Math.sin((x+y)*Math.PI/32)*.35)/2.35;
   r=cloud>0?225:129;g=cloud>0?230:149;b=cloud>0?224:145;a=18+Math.abs(cloud)*57;
  }else if(name==='atlas-earth-grain'){const light=n>.55;r=light?227:73;g=light?218:79;b=light?173:49;a=5+n*15;}
  else if(name==='atlas-canopy'){
   // Overlapping canopy marks with northwest highlights; wrapped edges are seamless.
   for(const c of crowns){const dx=wrap(x-c.x),dy=wrap(y-c.y),d=Math.hypot(dx,dy*.85);
    if(Math.hypot(dx-2,dy-2)<c.r+1){r=36;g=53;b=36;a=68;}
    if(d<c.r){const light=Math.max(0,1-Math.hypot(dx+2,dy+2)/c.r);r=(c.warm?112:58)+light*34;g=(c.warm?112:86)+light*27;b=48+light*16;a=120+n*35;}
   }
  }else{
   const phase=y+Math.sin(x*Math.PI/32)*1.2;
   const crest=Math.abs(phase-Math.round(phase/16)*16);
   const broken=.45+.55*Math.sin(x*Math.PI/64+y*Math.PI/32)**2;
   if(crest<1.1){r=224;g=229;b=198;a=(1-crest/1.1)*broken*40;}
   else if(crest<2){r=39;g=77;b=78;a=12;}
  }
  data[i]=Math.round(r);data[i+1]=Math.round(g);data[i+2]=Math.round(b);data[i+3]=Math.round(a);
 }
 return {width,height,data};
}
