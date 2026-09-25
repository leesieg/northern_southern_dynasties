import { describe,it,expect } from 'vitest';
import { DEFAULT_SCRIPT,gameScripts,getScript,scriptLabel } from '../data/scripts';
import { characterById } from '../data/characters';
import { newCampaignWorld,dateLabel } from './world';
import { parseWorld,serializeWorld } from './save';
describe('剧本选择与存档',()=>{
 it('目录只开放具有完整人物配置的 546 剧本',()=>{
  expect(gameScripts).toHaveLength(1);const script=getScript();expect(script.year).toBe(546);
  expect(script.characterIds).toContain(script.defaultCharacter);
  for(const id of script.characterIds){expect(!!characterById[id]).toBe(true);const world=newCampaignWorld(id,script.id);expect(world.scriptId).toBe(script.id);expect(parseWorld(serializeWorld(world))).toEqual(world);}
  expect(newCampaignWorld(undefined,script.id).scriptId).toBe(script.id);
 });
 it('旧档缺少剧本字段时归入 546 年并保留原进度',()=>{
  const world=newCampaignWorld('xiao-yi');delete world.scriptId;const restored=parseWorld(serializeWorld(world));expect(restored).toEqual({...world,scriptId:DEFAULT_SCRIPT});expect(scriptLabel()).toBe('546 年 · 三国并立');expect(dateLabel(0,restored.scriptId)).toBe('546 年 1 月 1 日');
 });
 it('拒绝未开放剧本与不属于剧本的人物',()=>{
  expect(()=>newCampaignWorld('xiao-yan','unreleased')).toThrow('剧本');expect(()=>newCampaignWorld('unknown',DEFAULT_SCRIPT)).toThrow('剧本');
  const world=newCampaignWorld('xiao-yan');world.scriptId='unreleased';expect(()=>serializeWorld(world)).toThrow('剧本');
 });
});
