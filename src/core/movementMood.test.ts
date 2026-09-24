import {describe,it,expect} from 'vitest';
import {newCampaignWorld,act} from './world';
import {courtOf,movementMood,courtCatalysts,advanceCourts} from './court';
import {governmentOf} from './government';
import {parseWorld,serializeWorld} from './save';
const start=()=>newCampaignWorld('xiao-yan',undefined,'sandbox');
describe('集团诉求与局势反馈',()=>{
 it('国策与眷顾改变满意度，读状态无副作用且可由旧档重建',()=>{const w=start(),c=courtOf(w)!;c.members['xiao-gang']='reform';const before=structuredClone(w),base=movementMood(w,'liang','reform');expect(w).toEqual(before);c.policy='reform';c.favored='reform';const pleased=movementMood(w,'liang','reform');expect(pleased.satisfaction).toBeGreaterThan(base.satisfaction);expect(pleased.tension).toBeLessThanOrEqual(0);expect(movementMood(parseWorld(serializeWorld(w)),'liang','reform')).toEqual(pleased);});
 it('不满集团按势力施压，主动奏议可批准并改善立场',()=>{const w=start(),c=courtOf(w)!,g=governmentOf(w)!;for(const id of Object.keys(c.members))c.members[id]=id==='xiao-yan'?'dynastic':'reform';c.corruption=60;c.policy='consolidation';w.realm!.influence=500;w.realm!.treasuries.liang.coins=5000;const m=movementMood(w,'liang','reform');expect(m.satisfaction).toBeLessThan(40);expect(m.tension).toBeGreaterThan(0);expect(courtCatalysts(w,'liang').some(v=>v.label==='经世派施压')).toBe(true);w.day=30;advanceCourts(w);expect(c.petition?.group).toBe('reform');const t=c.tension,s=g.support;act(w,{type:'court',action:'resolve',accept:true});expect(c.tension).toBe(t-8);expect(g.support).toBe(Math.min(100,s+5));expect(movementMood(w,'liang','reform').satisfaction).toBeGreaterThan(m.satisfaction);expect(parseWorld(serializeWorld(w))).toEqual(w);});
 it('结算一次且不在暂停政体中生效，未结党不产生施压',()=>{const w=start(),c=courtOf(w)!;for(const id of Object.keys(c.members))c.members[id]='unaligned';expect(movementMood(w,'liang','unaligned').tension).toBe(0);w.day=30;advanceCourts(w);const after=structuredClone(c);advanceCourts(w);expect(c).toEqual(after);governmentOf(w)!.type='feudal';w.day=60;advanceCourts(w);expect(c).toEqual(after);});
 it('中央任官代表性即时改变集团态度',()=>{const w=start(),c=courtOf(w)!;c.members['xiao-gang']='reform';c.ministries.finance='xiao-gang';const represented=movementMood(w,'liang','reform').satisfaction;c.ministries.finance='xiao-yan';expect(movementMood(w,'liang','reform').satisfaction).toBeLessThan(represented);});
});

import {pauseSnapshot,pauseEvents,pauseHasActions} from './pauseEvents';
it('集团奏议通知执政者并在裁决后解除决策状态，教学局兼容',()=>{const w=start(),before=pauseSnapshot(w);courtOf(w)!.petition={group:'reform',sponsor:'xiao-gang',due:15};const events=pauseEvents(before,w),event=events.find(e=>e.kind==='court')!;expect(event).toBeDefined();expect(pauseHasActions(w,event)).toBe(true);act(w,{type:'court',action:'resolve',accept:false});expect(pauseHasActions(w,event)).toBe(false);const tutorial=newCampaignWorld();expect(()=>pauseEvents(pauseSnapshot(tutorial),tutorial)).not.toThrow();});
