import {it,expect,vi} from 'vitest';
import {campaignFarmAtlas} from './farmAtlas';

it('allocates farmland to every visible city, including the third and last atlas slots',()=>{
 // Canvas commands are recorded as unit-test data; no browser or visual acceptance.
 const slots=new Set<number>();
 const context={save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},clip(){},fillStyle:'',fillRect(x:number,y:number,w:number,h:number){if(w>1&&h>1)slots.add(Math.floor((y+h/2)/256)*6+Math.floor((x+w/2)/256));}};
 const canvas={width:0,height:0,getContext:()=>context};
 vi.stubGlobal('document',{createElement:()=>canvas});
 try{
  const centers=Array.from({length:36},(_,i)=>({x:i*100,z:i*200})),texture=campaignFarmAtlas(centers,()=>1);
  expect(slots.size).toBe(36);expect(slots.has(2)).toBe(true);expect(slots.has(35)).toBe(true);expect(canvas.width).toBe(1536);texture.dispose();
 }finally{vi.unstubAllGlobals();}
});
