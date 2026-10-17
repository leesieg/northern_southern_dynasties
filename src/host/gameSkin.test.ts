import {afterEach,describe,expect,it,vi} from 'vitest';
afterEach(()=>{vi.doUnmock('../ui/gameStyles');vi.resetModules();vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('game skin startup',()=>{
 it('shares one load between normal startup and recovery',async()=>{
  const load=vi.fn(()=>({}));vi.doMock('../ui/gameStyles',load);
  const {loadGameSkin}=await import('./gameSkin'),first=loadGameSkin();
  expect(loadGameSkin()).toBe(first);await first;expect(loadGameSkin()).toBe(first);expect(load).toHaveBeenCalledOnce();
 });
 it('keeps a rejected load rejected instead of trusting the preload cache on retry',async()=>{
  const error=new Error('stylesheet unavailable'),load=vi.fn(()=>{throw error;});vi.doMock('../ui/gameStyles',load);
  const {loadGameSkin}=await import('./gameSkin'),first=loadGameSkin();
  const failure=await first.then(()=>null,error=>error);expect(failure).toBeInstanceOf(Error);expect(loadGameSkin()).toBe(first);
  await expect(loadGameSkin()).rejects.toBe(failure);expect(load).toHaveBeenCalledOnce();
 });
 it('replaces the pending boot status with an error without needing game CSS',async()=>{
  const message={textContent:'正在载入游戏资源…',setAttribute:vi.fn()},getElementById=vi.fn(()=>message),error=new Error('stylesheet unavailable');
  vi.stubGlobal('document',{getElementById});const log=vi.spyOn(console,'error').mockImplementation(()=>{});
  const {reportGameSkinFailure}=await import('./gameSkin');reportGameSkinFailure(error);
  expect(getElementById).toHaveBeenCalledWith('boot-message');expect(message.textContent).toBe('游戏界面资源加载失败，请刷新重试。');
  expect(message.setAttribute).toHaveBeenCalledWith('role','alert');expect(log).toHaveBeenCalledWith('Game interface styles failed to load',error);
 });
});
