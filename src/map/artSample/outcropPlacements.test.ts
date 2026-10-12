import {it,expect} from 'vitest';
import {outcropPlacements} from './outcrops';
import {riverShape} from './riverShape';
it('keeps rock groups world anchored when streamed view bounds move',()=>{
 const height=(x:number,z:number)=>15+Math.sin(x*.12)*3+Math.cos(z*.14)*2,terrain={height,channel:riverShape([],height),cities:[]} as Parameters<typeof outcropPlacements>[0];
 const a=outcropPlacements(terrain,{minX:0,maxX:100,minZ:0,maxZ:100}),b=outcropPlacements(terrain,{minX:-30,maxX:130,minZ:-30,maxZ:130});
 expect(a.length).toBeGreaterThan(30);for(const p of a)expect(b).toContainEqual(p);
 for(const p of a){expect(p.y).toBeLessThanOrEqual(height(p.x,p.z));expect(p.width).toBeLessThan(4.4);}
});
