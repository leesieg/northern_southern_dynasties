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
