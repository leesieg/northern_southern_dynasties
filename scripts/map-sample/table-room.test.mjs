import {it,expect} from 'vitest';
import {tableRoomStrength} from '../../src/map/three/tableRoom';

it('keeps the actual study material shader layout stable through its entire fade',async()=>{
 const {readFile}=await import('node:fs/promises'),{Texture,Mesh}=await import('three'),{loadTableRoom}=await import('../../src/map/three/tableRoom');
 const bytes=await readFile('public/art/campaign/atlas-study-v2.glb'),original=globalThis.fetch;
 globalThis.fetch=async()=>new Response(bytes);
 const painting=new Texture(),wood=new Texture();
 try{
  const room=await loadTableRoom(painting,wood);
  const lights=[];room.root.traverse(o=>{if(o.isPointLight)lights.push(o);});
  expect(lights).toHaveLength(2);
  for(const zoom of [3,2.5,2,1.1,2.4,3]){
   room.update(zoom);
   // Hidden-room lights stay in the scene with zero intensity: no shader-count switch on zoom.
   expect(room.root.visible).toBe(true);
   for(const light of lights){expect(light.visible).toBe(true);expect(light.intensity).toBeCloseTo(.14*tableRoomStrength(zoom));}
   room.root.traverse(o=>{if(o instanceof Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material]){
    expect(m.transparent).toBe(true);expect(m.opacity).toBeCloseTo(tableRoomStrength(zoom));
   }});
  }
  room.dispose();
 }finally{globalThis.fetch=original;painting.dispose();wood.dispose();}
});
