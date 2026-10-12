import {describe,it,expect} from 'vitest';
import {annotationDensity,cityAnnotationModes} from './annotationDensity';
import {layoutArmyCards} from './armyMapPresentation';
describe('campaign annotation density',()=>{
 it('keeps the selected entity over neighbours without moving geographic anchors',()=>{
  const items=[{key:'ordinary',point:{x:100,y:100},priority:0},{key:'selected',point:{x:110,y:110},priority:0,required:true},{key:'battle',point:{x:300,y:300},priority:3}];
  expect([...annotationDensity(items,{width:800,height:600},2,100)]).toEqual(['selected','battle']);expect(items[1].point).toEqual({x:110,y:110});
 });
 it('does not pull offscreen units into the map and is stable across input order',()=>{
  const items=[{key:'b',point:{x:100,y:100},priority:1},{key:'a',point:{x:110,y:100},priority:1},{key:'off',point:{x:-10,y:200},priority:99,required:true}];
  expect([...annotationDensity(items,{width:800,height:600},5,100)]).toEqual(['a']);expect([...annotationDensity([...items].reverse(),{width:800,height:600},5,100)]).toEqual(['a']);
 });
 it('preserves explicit multi-selection beyond the normal display budget',()=>{
  expect(annotationDensity(['a','b'].map(key=>({key,point:{x:100,y:100},priority:0,required:true})),{width:800,height:600},1,100).size).toBe(2);
 });
 it('does not send a crowded army label across the screen',()=>{
  const result=layoutArmyCards([{key:'a',point:{x:150,y:150}}],[{left:0,top:0,right:400,bottom:400}],{width:1000,height:800},false,120);expect(result.size).toBe(0);
 });
});

it('keeps every visible city clickable at every zoom even when nameplates exceed the budget',()=>{
 const viewport={width:800,height:600},items=Array.from({length:40},(_,i)=>({key:String(i),point:{x:100+i*2,y:100},priority:0,required:i===39})),before=structuredClone(items);
 for(const zoom of [1.4,3,5,7,10]){
  const modes=cityAnnotationModes(items,viewport,zoom);
  expect(modes.size).toBe(40);expect(modes.get('39')).toBe('detail');expect([...modes.values()].filter(v=>v==='pin').length).toBeGreaterThan(30);
 }
 expect(items).toEqual(before);
});
it('keeps cities at the viewport edge and does not invent offscreen positions',()=>{
 const modes=cityAnnotationModes([{key:'edge',point:{x:0,y:0},priority:0},{key:'off',point:{x:-1,y:0},priority:1}],{width:800,height:600},3);
 expect(modes.has('edge')).toBe(true);expect(modes.has('off')).toBe(false);
});
