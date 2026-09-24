import {beforeEach,afterEach,it,expect,vi} from 'vitest';
const {render,paint}=vi.hoisted(()=>({render:vi.fn(),paint:vi.fn()}));
vi.mock('./paintedRenderer',()=>({renderPaintedPortrait:render}));
vi.mock('./portraitLife',()=>({paintLifeLayer:paint}));
beforeEach(()=>{vi.resetModules();render.mockReset();paint.mockReset();render.mockResolvedValue({width:768,height:1152});vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>({drawImage:vi.fn()})})});});
afterEach(()=>vi.unstubAllGlobals());
it('相同身份、生命外观与画幅复用结果，并合并头像和半身像并发合成',async()=>{const {portraitImage,peekPortrait}=await import('./portraitCache');const recipe=JSON.stringify({parts:[]});const [a,b,c]=await Promise.all([portraitImage(recipe,'null',false),portraitImage(recipe,'null',false),portraitImage(recipe,'null',true)]);expect(a).toBe(b);expect(render).toHaveBeenCalledTimes(1);expect(c.width).toBe(192);expect(peekPortrait(recipe,'null',false)).toBe(a);await portraitImage(recipe,'null',true);expect(render).toHaveBeenCalledTimes(1);});
it('衰老与健康变化刷新缓存；失败可重试且不缓存失败',async()=>{const {portraitImage}=await import('./portraitCache');await portraitImage('{}','null',false);await portraitImage('{}','{"age":80}',false);expect(paint).toHaveBeenCalledTimes(1);render.mockRejectedValueOnce(new Error('offline'));await expect(portraitImage('{"different":1}','null',false)).rejects.toThrow('offline');await portraitImage('{"different":1}','null',false);expect(render).toHaveBeenCalledTimes(4);});
it('缓存总像素有上限，长名单不会永久持有全部大画布',async()=>{const {portraitImage,peekPortrait}=await import('./portraitCache');for(let i=0;i<35;i++)await portraitImage(JSON.stringify({id:i}),'null',false);expect(peekPortrait('{"id":0}','null',false)).toBeUndefined();expect(peekPortrait('{"id":34}','null',false)).toBeDefined();});
