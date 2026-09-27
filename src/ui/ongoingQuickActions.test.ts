import {describe,expect,it} from 'vitest';
import {newGovernedCampaignWorld} from '../core/governedTestWorld';
import {act} from '../core/world';
import {courtOf} from '../core/court';
import {ongoingItems} from '../core/ongoing';
import {ongoingQuickActions} from './ongoingQuickActions';

describe('合并事务的就地操作',()=>{
 it('集团奏议直接给出真实裁决，执行后事务消失',()=>{
  const w=newGovernedCampaignWorld('yuwen-tai',undefined,'sandbox');
  w.realm!.treasuries.west.coins=1000;w.realm!.influence=100;
  courtOf(w)!.petition={group:'reform',sponsor:'yuan-qin',due:20};
  const item=ongoingItems(w).find(item=>item.id.startsWith('petition:'))!;
  const before=structuredClone(w);
  const actions=ongoingQuickActions(w,item);
  expect(w).toEqual(before);
  expect(actions.map(action=>action.label)).toEqual(['批准','否决']);
  expect(actions.map(action=>action.reason)).toEqual(['','']);
  act(w,actions[0].command);
  expect(courtOf(w)!.petition).toBeNull();
  expect(ongoingItems(w).some(next=>next.id===item.id)).toBe(false);
 });
 it('差事请命按玩家权限提供动作，审批后不再显示旧动作',()=>{
  const w=newGovernedCampaignWorld('yuwen-tai',undefined,'sandbox');
  act(w,{type:'service',action:'begin'});
  act(w,{type:'service',action:'open',kind:'agriculture',site:'tianshui',officer:'yuan-qin'});
  w.service!.tasks[0].phase='petition';
  const item=ongoingItems(w).find(item=>item.id.startsWith('service:'))!;
  const actions=ongoingQuickActions(w,item);
  expect(actions.map(action=>action.label)).toEqual(['准予请命','不予准许']);
  expect(actions[0].reason).toBe('');
  act(w,actions[0].command);
  expect(ongoingQuickActions(w,item)).toEqual([]);
 });
});
