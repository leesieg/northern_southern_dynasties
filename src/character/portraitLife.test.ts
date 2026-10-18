import {expect,it} from 'vitest';
import {paintLifeLayer} from './portraitLife';
import {approvedPaintedRecipe} from './paintedSelection';
import {portraitContext} from './composition';

it('new painted beards turn silver with age even when old profile metadata had no beard',()=>{
 const recipe=approvedPaintedRecipe('chen-baxian',portraitContext('chen-baxian'));
 const canvas=()=>{
  const data=new Uint8ClampedArray(100*150*4);for(let i=0;i<data.length;i+=4)data.set([60,55,50,255],i);
  const context={getImageData:()=>({data}),putImageData:()=>{},save:()=>{},restore:()=>{},beginPath:()=>{},moveTo:()=>{},quadraticCurveTo:()=>{},stroke:()=>{}};
  return {data,view:{width:100,height:150,getContext:()=>context} as unknown as HTMLCanvasElement};
 };
 const authored=canvas(),legacy=canvas(),life={age:85,baselineAge:43,sickness:0 as const,deceased:false,beard:false};
 paintLifeLayer(authored.view,recipe,life);paintLifeLayer(legacy.view,{...recipe,facialHair:false},life);
 expect(authored.data.some((value,i)=>i%4!==3&&value>legacy.data[i])).toBe(true);
 expect(life.beard).toBe(false);expect(recipe.facialHair).toBe(true);
});
it('an eye patch receives no drawn eye wrinkles and is excluded from the illness wash',()=>{
 const recipe=approvedPaintedRecipe('xiao-yi',portraitContext('xiao-yi'));
 const canvas=()=>{
  const moves:number[][]=[],rects:number[][]=[],clips:string[]=[];
  const context={save:()=>{},restore:()=>{},beginPath:()=>{},moveTo:(...p:number[])=>moves.push(p),quadraticCurveTo:()=>{},stroke:()=>{},rect:(...p:number[])=>rects.push(p),clip:(rule:string)=>clips.push(rule),createRadialGradient:()=>({addColorStop:()=>{}}),fillRect:()=>{}};
  return {moves,rects,clips,view:{width:100,height:150,getContext:()=>context} as unknown as HTMLCanvasElement};
 };
 const patched=canvas(),uncovered=canvas(),life={age:40,baselineAge:38,sickness:3 as const,deceased:false};
 paintLifeLayer(patched.view,recipe,life);paintLifeLayer(uncovered.view,{...recipe,coveredEye:undefined},life);
 expect(recipe.coveredEye).toBe('left');expect(uncovered.moves).toHaveLength(8);
 expect(patched.moves).toEqual(uncovered.moves.slice(4));
 const b=recipe.parts.find(p=>p.slot==='eye-left')!.place;
 expect(patched.rects).toEqual([[0,0,100,150],[b.x*100,b.y*150,b.width*100,b.height*150]]);
 expect(patched.clips).toEqual(['evenodd']);expect(uncovered.clips).toEqual([]);
});
