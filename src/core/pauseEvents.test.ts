import {describe,it,expect} from 'vitest';
import {newCampaignWorld,act,advance} from './world';
import {pauseSnapshot,pauseEvents} from './pauseEvents';
import {lifeOf} from './lifeState';
import {die} from './life';
describe('pause event reasons',()=>{
 it('reports simultaneous arrival and illness without losing either cause, then does not repeat them',()=>{
  const w=newCampaignWorld();act(w,{type:'travel',destination:'jingkou'});const before=pauseSnapshot(w);
  w.people[0].location='jingkou';w.people[0].journey=null;lifeOf(w,'fictional')!.illness={kind:'fever',since:0,severity:1};
  const events=pauseEvents(before,w);expect(events.map(e=>e.kind)).toEqual(['health','arrival']);expect(events[1].site).toBe('jingkou');expect(pauseEvents(pauseSnapshot(w),w)).toEqual([]);
 });
 it('distinguishes interrupted journeys from arrival',()=>{const w=newCampaignWorld();act(w,{type:'travel',destination:'jingkou'});const before=pauseSnapshot(w);w.people[0].journey=null;expect(pauseEvents(before,w)[0].kind).toBe('journey');});
 it('reports a new duty decision, completion, and realm events',()=>{
  const w=newCampaignWorld('yuwen-tai',undefined,'sandbox');act(w,{type:'duty',action:'open'});const before=pauseSnapshot(w);advance(w,2);expect(pauseEvents(before,w).map(e=>e.kind)).toEqual(['duties']);
  const approved=pauseSnapshot(w);act(w,{type:'duty',action:'cancel'});expect(pauseEvents(approved,w)[0].kind).toBe('duties');
  const previous=pauseSnapshot(w);advance(w,88);expect(pauseEvents(previous,w).some(e=>e.kind==='realm')).toBe(true);
 });
 it('reports inheritance instead of falsely declaring arrival after death',()=>{
  const w=newCampaignWorld('xiao-yan',undefined,'sandbox');act(w,{type:'travel',destination:'jingkou'});const before=pauseSnapshot(w);die(w,'xiao-yan','age');const kinds=pauseEvents(before,w).map(e=>e.kind);expect(kinds).toContain('inheritance');expect(kinds).not.toContain('arrival');expect(kinds).not.toContain('journey');
 });
 it('reports the end of a campaign once',()=>{const w=newCampaignWorld(),before=pauseSnapshot(w);advance(w,120);expect(pauseEvents(before,w).some(e=>e.kind==='outcome')).toBe(true);expect(pauseEvents(pauseSnapshot(w),w)).toEqual([]);});
 it('reports newly arrived diplomatic missions',()=>{
  const w=newCampaignWorld('gao-huan',undefined,'sandbox');act(w,{type:'diplomacy',action:'improve',target:'west'});const before=pauseSnapshot(w);w.diplomacy!.missions[0].status='audience';expect(pauseEvents(before,w)[0].kind).toBe('diplomacy');
 });
});
