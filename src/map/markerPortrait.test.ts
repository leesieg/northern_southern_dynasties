import {afterEach,describe,expect,it,vi} from 'vitest';
import type {World} from '../core/types';
import {updateMarkerPortrait} from './markerPortrait';
const {load}=vi.hoisted(()=>({load:vi.fn()}));
vi.mock('../character/composition',()=>({portraitContext:(id:string)=>({id})}));
vi.mock('../character/paintedSelection',()=>({approvedPaintedRecipe:(id:string)=>({id})}));
vi.mock('../character/portraitCache',()=>({portraitImage:load}));
const host=()=>({dataset:{} as Record<string,string>,isConnected:true,textContent:'',title:'',replaceChildren:vi.fn()}) as unknown as HTMLElement;
const world={} as World;
afterEach(()=>{vi.clearAllMocks();vi.unstubAllGlobals();});
describe('map marker portrait lifecycle',()=>{
 it('shares unchanged appearance requests across world updates',async()=>{
  load.mockResolvedValue({width:40,height:40});const canvas={getContext:()=>({drawImage:vi.fn()}),setAttribute:vi.fn()};vi.stubGlobal('document',{createElement:()=>canvas});
  const h=host();updateMarkerPortrait(h,'a',world);updateMarkerPortrait(h,'a',{...world});await Promise.resolve();
  expect(load).toHaveBeenCalledTimes(1);expect(h.replaceChildren).toHaveBeenLastCalledWith(canvas);
 });
 it('discards a stale result when the office becomes vacant',async()=>{
  let resolve!:(v:unknown)=>void;load.mockReturnValue(new Promise(r=>{resolve=r;}));const h=host();updateMarkerPortrait(h,'a',world);updateMarkerPortrait(h,undefined,world);resolve({});await Promise.resolve();
  expect(h.textContent).toBe('城');expect(h.dataset.portraitKey).toBeUndefined();expect(h.replaceChildren).toHaveBeenCalledTimes(2);
 });
 it('ignores removed markers and allows failed portraits to retry',async()=>{
  load.mockRejectedValue(new Error('asset unavailable'));const h=host();updateMarkerPortrait(h,'a',world);await Promise.resolve();await Promise.resolve();expect(h.dataset.portraitKey).toBeUndefined();
  load.mockResolvedValue({});Object.defineProperty(h,'isConnected',{value:false});updateMarkerPortrait(h,'a',world);await Promise.resolve();expect(load).toHaveBeenCalledTimes(2);expect(h.replaceChildren).toHaveBeenCalledTimes(2);
 });
});
