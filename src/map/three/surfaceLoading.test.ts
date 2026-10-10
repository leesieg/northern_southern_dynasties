import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import * as resources from '../resourceLoader';
import {countrySurface} from './surface';
import {createSeasonState} from '../sample/seasons';
import type {MapLoadProgress} from '../mapLoadState';
// CPU resource lifecycle tests. Canvas stubs do not render or verify the interface.
const meta={columns:32,rows:24,west:84/128,north:36/128,width:32/128,height:24/128},manifest={zoom:7,west:84,east:116,north:36,south:60,tileSize:256},empty={type:'FeatureCollection',features:[]};
function base(path:string){if(path.endsWith('national-terrain.json'))return new Response(JSON.stringify(meta));if(path.endsWith('national-elevation.bin'))return new Response(new Float32Array(32*24).fill(100).buffer);return new Response(JSON.stringify(empty));}
beforeEach(()=>{vi.stubGlobal('document',{createElement:()=>({width:1,height:1,getContext:()=>({fillRect(){},createImageData:(w:number,h:number)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){},getImageData:()=>({data:new Uint8ClampedArray(2048*2048*4)})})})});vi.stubGlobal('createImageBitmap',vi.fn(async()=>({width:1,height:1,close:vi.fn()})));});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
it('makes real coarse terrain available before artwork and retries only failed artwork',async()=>{
 let failed=true;const progress:MapLoadProgress[]=[];const reader=vi.spyOn(resources,'mapResource').mockImplementation(async(path)=>{if(path.endsWith('terrain-atlas-v1.png')&&failed)throw new resources.MapResourceError('network',path);return base(path);});
 const surface=await countrySurface(createSeasonState(),{progress:p=>progress.push(p)});expect(reader).toHaveBeenCalledTimes(4);expect(surface.height(110,32)).not.toBeNull();expect(progress.at(-1)).toMatchObject({stage:'terrain',completed:4,total:4});
 try{await expect(surface.loadArt(()=>{})).rejects.toMatchObject({kind:'network'});expect(progress.at(-1)).toMatchObject({stage:'art',completed:3,busy:false});failed=false;const calls=reader.mock.calls.length;await surface.loadArt(()=>{});expect(reader.mock.calls.length-calls).toBe(1);expect(progress.at(-1)).toMatchObject({stage:'art',completed:4,busy:false});expect(createImageBitmap).toHaveBeenCalledWith(expect.any(Blob),expect.objectContaining({imageOrientation:'flipY'}));}finally{surface.dispose();}
});
it('coalesces the detail manifest, drops an obsolete view and cancels a pending refinement',async()=>{
 let releaseManifest!:(value:Response)=>void;const tileResolvers:((value:Response)=>void)[]=[];
 const reader=vi.spyOn(resources,'mapResource').mockImplementation(path=>path.endsWith('elevation/manifest.json')?new Promise(resolve=>{releaseManifest=resolve;}):path.endsWith('.bin.gz')?new Promise(resolve=>tileResolvers.push(resolve)):Promise.resolve(base(path)));
 const surface=await countrySurface(createSeasonState());
 try{const before=surface.height(125,35),obsolete=surface.refine(110,32),latest=surface.refine(125,35);releaseManifest(new Response(JSON.stringify(manifest)));expect(await obsolete).toBe(false);await vi.waitFor(()=>expect(tileResolvers).toHaveLength(9));expect(reader.mock.calls.filter(([path])=>path.endsWith('elevation/manifest.json'))).toHaveLength(1);surface.cancelRefine();tileResolvers.forEach(resolve=>resolve(new Response(new Int16Array(65536).fill(4000).buffer)));expect(await latest).toBe(false);expect(surface.height(125,35)).toBe(before);}finally{surface.dispose();}
});
it('applies only the latest request when the camera returns to an already pending window',async()=>{
 const pending=new Map<string,(response:Response)=>void>();vi.spyOn(resources,'mapResource').mockImplementation(path=>path.endsWith('elevation/manifest.json')?Promise.resolve(new Response(JSON.stringify(manifest))):path.endsWith('.bin.gz')?new Promise(resolve=>pending.set(path,resolve)):Promise.resolve(base(path)));
 const surface=await countrySurface(createSeasonState());
 try{const before=surface.height(110,32),first=surface.refine(110,32);await vi.waitFor(()=>expect(pending.size).toBe(9));const firstPaths=[...pending.keys()],middle=surface.refine(125,35);await vi.waitFor(()=>expect(pending.size).toBe(18));const latest=surface.refine(110,32);await Promise.resolve();for(const path of firstPaths)pending.get(path)!(new Response(new Int16Array(65536).fill(4000).buffer));expect(await first).toBe(false);expect(await latest).toBe(true);expect(surface.height(110,32)).toBeGreaterThan(before!);for(const [path,resolve] of pending)if(!firstPaths.includes(path))resolve(new Response(new Int16Array(65536).fill(2000).buffer));expect(await middle).toBe(false);}finally{surface.dispose();}
});
