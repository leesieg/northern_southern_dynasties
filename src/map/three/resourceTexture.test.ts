import {expect,it,vi} from 'vitest';
import {Texture} from 'three';
import {installTexture} from './resourceTexture';

it('releases placeholder GPU storage before switching to a differently sized artwork source',()=>{
 // Dimension-only image stubs: this checks allocation lifecycle, not GPU rendering.
 const target=new Texture({width:1,height:1} as ImageBitmap),loaded=new Texture({width:1448,height:1086} as ImageBitmap);
 const uniform={value:target},oldSource=target.source;
 const release=vi.fn(()=>{expect(target.source).toBe(oldSource);expect(target.image.width).toBe(1);});
 target.addEventListener('dispose',release);
 installTexture(target,loaded);
 expect(release).toHaveBeenCalledOnce();
 target.removeEventListener('dispose',release);
 expect(uniform.value).toBe(target);
 expect(target.source).toBe(loaded.source);
 expect(target.image.width).toBe(1448);
 expect(target.version).toBeGreaterThan(0);
});

it('releases each installed bitmap owner once across replacement and repeated teardown',()=>{
 const target=new Texture(),first=new Texture(),second=new Texture();
 const releaseFirst=vi.spyOn(first,'dispose'),releaseSecond=vi.spyOn(second,'dispose');
 installTexture(target,first);installTexture(target,second);
 expect(releaseFirst).toHaveBeenCalledOnce();expect(releaseSecond).not.toHaveBeenCalled();
 target.dispose();target.dispose();
 expect(releaseFirst).toHaveBeenCalledOnce();expect(releaseSecond).toHaveBeenCalledOnce();
});
