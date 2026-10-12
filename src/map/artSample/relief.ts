/** Smooth measured high-frequency relief at campaign scale, without adding invented hills. */
export function softenRelief(values:Float32Array,columns:number,rows:number,radius=6){
 const weights=Array.from({length:radius*2+1},(_,i)=>Math.exp(-(((i-radius)/(radius*.52))**2)/2));
 const total=weights.reduce((a,b)=>a+b,0),pass=new Float32Array(values.length),result=new Float32Array(values.length);
 for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
  let h=0;for(let k=-radius;k<=radius;k++)h+=values[y*columns+Math.max(0,Math.min(columns-1,x+k))]*weights[k+radius];
  pass[y*columns+x]=h/total;
 }
 for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
  let h=0;for(let k=-radius;k<=radius;k++)h+=pass[Math.max(0,Math.min(rows-1,y+k))*columns+x]*weights[k+radius];
  result[y*columns+x]=h/total;
 }
 return result;
}
// Metres to scene kilometres, with restrained campaign-map vertical exaggeration.
export const RELIEF_SCALE=.010;
