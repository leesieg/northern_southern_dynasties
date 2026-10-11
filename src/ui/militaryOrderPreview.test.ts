import {describe,it,expect} from 'vitest';
import {newCampaignWorld} from '../core/world';
import {ensureArmyOrganization} from '../core/armyOrganization';
import {militaryActionReason} from '../core/militaryAftermath';
import type {Army} from '../core/realm';
import {militaryOrderPreview,militaryOrderTargets} from './militaryOrderPreview';

function setup(){const w=newCampaignWorld('xiao-yan',undefined,'sandbox');const a:Army={realm:'liang',location:'jiankang',troops:600,morale:80,supply:100,journey:null,siege:0};w.realm!.armies.push(a);ensureArmyOrganization(w);return {w,a};}
describe('military destination previews',()=>{
 it('offers a different legal retreat destination and uses its actual route',()=>{
  const {w,a}=setup(),targets=militaryOrderTargets(w,a.id!,'retreat');
  const selected=targets.find(t=>!t.reason);expect(selected).toBeDefined();expect(selected!.site).not.toBe(a.location);
  expect(selected!.route?.route[0]).toBe(a.location);expect(selected!.route?.route.at(-1)).toBe(selected!.site);
  expect(targets.find(t=>t.site===a.location)?.reason).toContain('另一处');
  expect(militaryActionReason(w,{type:'militaryAction',army:a.id!,action:'retreat',site:selected!.site})).toBe('');
 });
 it('revalidates the selected retreat target if control changes',()=>{
  const {w,a}=setup(),target=militaryOrderTargets(w,a.id!,'retreat').find(t=>!t.reason)!;
  w.realm!.cities[target.site].controller='east';
  expect(militaryOrderPreview(w,{type:'militaryAction',army:a.id!,action:'retreat',site:target.site}).reason).not.toBe('');
 });
 it('previews scout return time and blocks dispatch when supplies change',()=>{
  const {w,a}=setup(),local=militaryOrderPreview(w,{type:'militaryAction',army:a.id!,action:'scout',site:a.location});
  expect(local.reason).toBe('');expect(local.days).toBe(1);
  a.supply=4;expect(militaryOrderTargets(w,a.id!,'scout').every(t=>!!t.reason)).toBe(true);
 });
});
