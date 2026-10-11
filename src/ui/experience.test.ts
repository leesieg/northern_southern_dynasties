import {afterEach,describe,expect,it,vi} from 'vitest';
import {afterCommand} from './actionFeedback';
import {parseSound,defaultSound,changeSound} from './audioSettings';
import {GameSound} from './soundEngine';
import {governmentPreview} from './governmentPreview';
import {newCampaignWorld} from '../core/world';
import {governmentBonus} from '../core/government';
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
describe('command confirmation lifecycle',()=>{
 it('keeps a draft while pending and on refusal, closes only on an affirmative receipt',async()=>{const close=vi.fn();let resolve!:(ok:boolean)=>void;const pending=new Promise<boolean>(done=>{resolve=done;});const result=afterCommand(pending,close);expect(close).not.toHaveBeenCalled();resolve(false);expect(await result).toBe(false);expect(close).not.toHaveBeenCalled();expect(await afterCommand(undefined,close)).toBe(false);expect(await afterCommand(Promise.resolve(true),close)).toBe(true);expect(close).toHaveBeenCalledOnce();});
 it('does not discard a draft if transport rejects',async()=>{const close=vi.fn();await expect(afterCommand(Promise.reject(new Error('offline')),close)).rejects.toThrow('offline');expect(close).not.toHaveBeenCalled();});
});
describe('sound settings and lifecycle',()=>{
 it('recovers malformed preferences and bounds volumes independently',()=>{expect(parseSound('{bad')).toEqual(defaultSound);expect(parseSound('{"music":9,"effects":-2,"ambience":"loud","muted":true}')).toEqual({...defaultSound,music:1,effects:0,muted:true});expect(parseSound('null')).toEqual(defaultSound);});
 it('waits for a gesture, crossfades scenes and stops on hidden, muted and dispose',async()=>{
  vi.useFakeTimers();const tracks:MockAudio[]=[];class MockAudio {paused=true;volume=1;loop=false;preload='';error=null;play=vi.fn(async()=>{this.paused=false;});pause=vi.fn(()=>{this.paused=true;});load=vi.fn();addEventListener=vi.fn();removeAttribute=vi.fn();constructor(public src:string){tracks.push(this);}}
  const param=()=>({value:0,setTargetAtTime:vi.fn()});const node=()=>({connect(){return this;},gain:param(),frequency:param(),start:vi.fn(),stop:vi.fn()});const context={state:'running',sampleRate:10,currentTime:0,destination:{},resume:vi.fn(async()=>{context.state='running';}),suspend:vi.fn(async()=>{context.state='suspended';}),close:vi.fn(async()=>{}),createBuffer:()=>({getChannelData:()=>new Float32Array(50)}),createBufferSource:node,createBiquadFilter:node,createGain:node};
  const doc={hidden:false};vi.stubGlobal('document',doc);vi.stubGlobal('Audio',MockAudio);vi.stubGlobal('AudioContext',function(){return context;});vi.stubGlobal('localStorage',{setItem:vi.fn()});changeSound(defaultSound);
  const engine=new GameSound();engine.setPage('menu');expect(tracks).toHaveLength(0);await engine.unlock();expect(tracks).toHaveLength(1);vi.advanceTimersByTime(3000);expect(tracks[0].volume).toBe(defaultSound.music);
  engine.setPage('play');expect(tracks).toHaveLength(2);vi.advanceTimersByTime(3000);expect(tracks[0].paused).toBe(true);expect(tracks[1].volume).toBe(defaultSound.music);
  doc.hidden=true;engine.update();expect(tracks.every(a=>a.paused)).toBe(true);expect(context.suspend).toHaveBeenCalled();doc.hidden=false;engine.update();expect(tracks[1].paused).toBe(false);changeSound({muted:true});engine.update();expect(tracks.every(a=>a.paused)).toBe(true);engine.dispose();expect(context.close).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(0);changeSound(defaultSound);
 });
});
it('compares government effects through real formulas without changing the world',()=>{const w=newCampaignWorld('xiao-yan',undefined,'sandbox'),before=structuredClone(w),projected=structuredClone(w);projected.realm!.governments!.realms.liang.type='feudal';expect(governmentPreview(w,'liang',{government:'feudal'})).toEqual(governmentBonus(projected,'liang'));expect(w).toEqual(before);});
