import {newGovernedCampaignWorld as newCampaignWorld} from './governedTestWorld';
import {describe,it,expect} from 'vitest';
import {act} from './world';
import {noticeTier,validNoticeSettings,defaultNoticeSettings,normalizeNoticeSettings} from './noticePolicy';
import type {PauseEvent as PE} from './pauseEvents';
const event=(kind:PE['kind'],extra:Partial<PE>={}):PE=>({id:'test',kind,title:'事项',body:'说明',...extra});
describe('通知分级',()=>{
 it('未打标签的事件始终暂停',()=>{
  const w=newCampaignWorld('xiao-yan',undefined,'sandbox');
  expect(noticeTier(w,event('realm'),defaultNoticeSettings)).toBe('pause');
  expect(noticeTier(w,event('custody'),defaultNoticeSettings)).toBe('pause');
 });
 it('打标签且无动作的事件为提示',()=>{
  const w=newCampaignWorld('xiao-yan',undefined,'sandbox');
  expect(noticeTier(w,event('arrival',{notice:'travel'}),defaultNoticeSettings)).toBe('notice');
  expect(noticeTier(w,event('background',{notice:'family'}),defaultNoticeSettings)).toBe('notice');
 });
 it('打标签但仍有可执行动作的事件暂停',()=>{
  const w=newCampaignWorld('xiao-gang',undefined,'sandbox');
  act(w,{type:'mobility',action:'plan',kind:'visit',site:'xunyang',target:'xiao-yi'});
  const a=w.mobility!.activities[0];
  expect(noticeTier(w,event('mobility',{notice:'travel',activityId:a.id}),defaultNoticeSettings)).toBe('pause');
 });
 it('类别设为暂停时打标签事件也暂停',()=>{
  const w=newCampaignWorld('xiao-yan',undefined,'sandbox');
  expect(noticeTier(w,event('arrival',{notice:'travel'}),{...defaultNoticeSettings,travel:'pause'})).toBe('pause');
 });
 it('校验通知设置形状',()=>{
  expect(validNoticeSettings(defaultNoticeSettings)).toBe(true);
  expect(validNoticeSettings(null)).toBe(false);
  expect(validNoticeSettings({...defaultNoticeSettings,travel:'loud'})).toBe(false);
  expect(validNoticeSettings({travel:'notice'})).toBe(true);
 });
 it('旧设置缺少新类别时按默认补齐而非判无效',()=>{
  expect(normalizeNoticeSettings({travel:'pause'})).toEqual({...defaultNoticeSettings,travel:'pause'});
  expect(normalizeNoticeSettings(null)).toEqual(defaultNoticeSettings);
  expect(defaultNoticeSettings.report).toBe('notice');
 });
});
