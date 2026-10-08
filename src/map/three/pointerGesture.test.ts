import {describe,it,expect} from 'vitest';
import {PointerGesture} from './pointerGesture';
describe('map selection gesture',()=>{
 it('accepts a stationary click and tolerates small hand jitter',()=>{const g=new PointerGesture();expect(g.allowsClick()).toBe(false);g.begin(1,10,10);g.end(1,12,11);expect(g.allowsClick()).toBe(true);});
 it('rejects a drag that returns to its starting point, then accepts a fresh click',()=>{const g=new PointerGesture();g.begin(1,0,0);g.move(1,15,0);g.end(1,0,0);expect(g.allowsClick()).toBe(false);g.begin(2,0,0);g.end(2,0,0);expect(g.allowsClick()).toBe(true);});
 it('rejects release displacement even if intermediate moves were missed',()=>{const g=new PointerGesture();g.begin(1,0,0);g.end(1,4,0);expect(g.allowsClick()).toBe(false);});
 it('keeps press-time context menus available but blocks them after a drag',()=>{const g=new PointerGesture();g.begin(1,0,0);expect(g.allowsContextMenu()).toBe(true);expect(g.allowsClick()).toBe(false);g.move(1,10,0);expect(g.allowsContextMenu()).toBe(false);g.end(1,10,0);expect(g.allowsContextMenu()).toBe(false);});
 it('rejects cancelled, multi-touch, and camera-stopping taps',()=>{const g=new PointerGesture();g.begin(1,0,0);g.cancel();g.end(1,0,0);expect(g.allowsClick()).toBe(false);g.begin(1,0,0,true);g.begin(2,1,1,true);g.end(2,1,1);g.end(1,0,0);expect(g.allowsClick()).toBe(false);g.begin(1,0,0,false,true);g.end(1,0,0);expect(g.allowsClick()).toBe(false);});
});
