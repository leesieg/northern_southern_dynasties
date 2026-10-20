import {describe,it,expect} from 'vitest';
import {createCampaign} from './campaignStart';
import {newCampaignWorld} from './world';
import {advanceSeasonReport,validSeasonReport} from './seasonReport';
import {calendarDate,isMonthStart} from './calendar';
import {serializeWorld,parseWorld} from './save';
import {pauseSnapshot,pauseEvents} from './pauseEvents';

const quarterDay=(day:number)=>{let d=day+1;while(!(isMonthStart(d)&&[0,3,6,9].includes(calendarDate(d).getUTCMonth())))d++;return d;};
describe('季度述职',()=>{
 it('初始化只记基准不出报告',()=>{
  const w=createCampaign('xiao-yan',undefined,'sandbox');advanceSeasonReport(w);
  expect(w.seasonReport?.snap.coins).toBe(w.people[0].coins);expect(w.seasonReport?.last).toBeUndefined();
 });
 it('季度首日生成行值正确的报告且不重复',()=>{
  const w=createCampaign('xiao-yan',undefined,'sandbox');advanceSeasonReport(w);w.people[0].coins+=50;
  const before=pauseSnapshot(w);
  w.day=quarterDay(w.day);advanceSeasonReport(w);advanceSeasonReport(w);
  const report=w.seasonReport!.last!;
  expect(report.from).toBe(0);expect(report.to).toBe(w.day);expect(report.rows.find(r=>r.label==='私财')).toMatchObject({before:w.people[0].coins-50,after:w.people[0].coins});
  const events=pauseEvents(before,w);expect(events.some(e=>e.kind==='report'&&e.notice==='report'&&e.id==='report:'+report.to)).toBe(true);
  expect(pauseEvents(pauseSnapshot(w),w).some(e=>e.kind==='report')).toBe(false);
 });
 it('人物继承后以新人物重置',()=>{
  const w=createCampaign('xiao-yan',undefined,'sandbox');advanceSeasonReport(w);w.day=quarterDay(w.day);advanceSeasonReport(w);
  w.characterId='xiao-gang';advanceSeasonReport(w);
  expect(w.seasonReport?.last).toBeUndefined();expect(w.seasonReport?.person).toBe('xiao-gang');expect(w.seasonReport?.start).toBe(w.day);
 });
 it('非沙盒不生效',()=>{
  const w=newCampaignWorld(undefined,undefined,'tutorial');advanceSeasonReport(w);expect(w.seasonReport).toBeUndefined();
 });
 it('季度纪事保留合法长行记，并可保存重读',()=>{
  const w=createCampaign('xiao-yan',undefined,'sandbox');advanceSeasonReport(w);w.day=quarterDay(w.day);
  const text='纪'.repeat(400);w.chronicle.push({day:w.day,person:'player',text});advanceSeasonReport(w);
  expect(w.seasonReport!.last!.entries).toContain(text);expect(parseWorld(serializeWorld(w)).seasonReport).toEqual(w.seasonReport);
  w.seasonReport!.last!.entries=[text+'纪'];expect(()=>serializeWorld(w)).toThrow('存档');
 });
 it('校验形状与存档往返',()=>{
  const w=createCampaign('xiao-yan',undefined,'sandbox');advanceSeasonReport(w);
  expect(parseWorld(serializeWorld(w))).toBeTruthy();
  expect(validSeasonReport({version:1,start:0,snap:{coins:'x'},person:'xiao-yan'},w)).toBe(false);
  const plain=createCampaign('xiao-yan',undefined,'sandbox');expect(parseWorld(serializeWorld(plain))).toBeTruthy();
 });
});
