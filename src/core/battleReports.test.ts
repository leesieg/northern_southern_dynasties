import {describe,it,expect} from 'vitest';
import {newCampaignWorld} from './world';
import type {BattleRecord} from './militaryAftermath';
import {battleKey,battleReportSide,completedBattleReports} from './battleReports';
import {pauseSnapshot,pauseEvents} from './pauseEvents';
import {ensureAftermath} from './militaryAftermath';
const record=(more:Partial<BattleRecord>={}):BattleRecord=>({id:1,key:'1|luoyang',war:1,site:'luoyang',day:5,last:10,round:5,stage:'clash',a:1,b:2,lossA:30,lossB:40,participants:[{army:1,realm:'liang',commander:'xiao-yan',troops:500,side:'attack'},{army:2,realm:'east',commander:null,troops:600,side:'defend'}],...more});
function setup(){const w=newCampaignWorld('xiao-yan',undefined,'sandbox');w.day=10;ensureAftermath(w).battles=[record()];return w;}
describe('battle result notifications',()=>{
 it('emits a completed result once, preserving a snapshot even after the world changes',()=>{const w=setup(),before=pauseSnapshot(w);w.militaryAftermath!.battles[0].ended=10;w.militaryAftermath!.battles[0].winner='attack';const events=pauseEvents(before,w).filter(e=>e.kind==='battle');expect(events).toHaveLength(1);expect(events[0].battle?.winner).toBe('attack');w.militaryAftermath!.battles[0].lossA=99;expect(events[0].battle?.lossA).toBe(30);expect(pauseEvents(pauseSnapshot(w),w).some(e=>e.kind==='battle')).toBe(false);});
 it('queues same-day reports with different IDs and does not notify unrelated wars',()=>{const w=setup();w.militaryAftermath!.battles=[record({ended:10}),record({id:2,key:'another',ended:10}),record({id:3,ended:10,participants:[{army:1,realm:'west',commander:null,troops:100,side:'attack'}]})];expect(completedBattleReports(new Set(),w).map(b=>b.id)).toEqual([1,2]);});
 it('does not replay loaded results, including legacy reports assigned an ID later',()=>{const w=setup();w.militaryAftermath!.battles=[record({id:undefined,ended:10})];const before=pauseSnapshot(w);ensureAftermath(w);expect(completedBattleReports(before.endedBattles,w)).toEqual([]);expect(completedBattleReports(new Set(w.militaryAftermath!.battles.map(battleKey)),w)).toEqual([]);});
 it('keeps participants once per army when commanders change and respects recorded sides in civil wars',()=>{const b=record({attackers:[1],defenders:[2],participants:[{army:1,realm:'liang',commander:'xiao-yan',troops:500,side:'attack'},{army:1,realm:'liang',commander:null,troops:450,side:'attack'},{army:2,realm:'liang',commander:null,troops:600,side:'defend'}]});expect(battleReportSide(b,'attack').armies).toEqual([1]);expect(battleReportSide(b,'defend').armies).toEqual([2]);expect(battleReportSide(b,'attack').loss).toBe(30);});
 it('preserves missing legacy detail rather than manufacturing it',()=>{const b=record({participants:undefined,losses:undefined});expect(battleReportSide(b,'attack')).toEqual({loss:30,participants:[],armies:[1]});});
});
