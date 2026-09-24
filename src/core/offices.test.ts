import { describe,it,expect } from 'vitest';
import { officeHierarchy,superiorOffice,directSubordinates,officeChain } from './offices';
import { newCampaignWorld,act,advance } from './world';
import { governmentOf } from './government';
import { parseWorld,serializeWorld } from './save';
import { historicalCharacters } from '../data/characters';
import type { World } from './types';
const start=(id='xiao-yan')=>newCampaignWorld(id,undefined,'sandbox');
const node=(w:World,id:string)=>officeHierarchy(w).find(n=>n.id===id)!;
function pass(w:World,days:number){for(let i=0;i<days;i++){if(w.realm!.event)act(w,{type:'realm',action:'event',choice:'decline'});advance(w,1);}}
function ready(w:World,year:number){w.day=Math.round((Date.UTC(year,0,1)-Date.UTC(546,0,1))/86400000);w.realm!.influence=300;w.realm!.treasuries.liang.coins=10000;governmentOf(w)!.support=80;governmentOf(w)!.legitimacy=90;}
describe('官爵与科层图',()=>{
 it.each(historicalCharacters.map(c=>c.id))('%s 开局关系唯一、无环且职位都有有效父节点',id=>{
  const w=start(id),nodes=officeHierarchy(w);expect(new Set(nodes.map(n=>n.id)).size).toBe(nodes.length);expect(nodes.some(n=>n.holder===id)).toBe(true);
  for(const n of nodes){const chain=officeChain(nodes,n);expect(chain.at(-1)).toBe(n);expect(chain[0].parentId).toBeNull();if(n.parentId)expect(nodes.some(p=>p.id===n.parentId&&p.realm===n.realm)).toBe(true);expect(superiorOffice(nodes,n)?.holder).not.toBe(n.holder);}
 });
 it('东魏名义君主、执政与朝官分列，宗亲不自动成为直属属员',()=>{
  const w=start('gao-yang'),nodes=officeHierarchy(w),office=node(w,'office:546:east-secretariat');
  expect(superiorOffice(nodes,office)?.holder).toBe('gao-huan');expect(officeChain(nodes,office).map(n=>n.holder)).toEqual(['yuan-shanjian','gao-huan','gao-yang']);
  expect(directSubordinates(nodes,'gao-huan').some(n=>n.holder==='gao-yang')).toBe(true);
  expect(directSubordinates(nodes,'xiao-yan').some(n=>n.holder==='xiao-gang')).toBe(false);
  expect(node(w,'office:546:liang-heir').relation).toBe('honour');
 });
 it('任命送达前保留原任，送达后新任与旧任详情同时更新',()=>{
  const w=start();act(w,{type:'realm',action:'appoint',site:'jiankang',candidate:'xiao-gang'});
  pass(w,7);expect(node(w,'office:city:jiankang').holder).toBe('xiao-yan');pass(w,1);
  const n=node(w,'office:city:jiankang');expect(n.holder).toBe('xiao-gang');expect(superiorOffice(officeHierarchy(w),n)?.holder).toBe('xiao-yan');
  expect(directSubordinates(officeHierarchy(w),'xiao-yan').filter(n=>n.holder==='xiao-gang')).toHaveLength(1);
  expect(officeHierarchy(parseWorld(serializeWorld(w)))).toEqual(officeHierarchy(w));
 });
 it('失守只暂停实际治理，不把军事占领伪装成行政易主',()=>{
  const w=start('dugu-xin'),id='office:city:tianshui';w.realm!.cities.tianshui.controller='east';const n=node(w,id);
  expect(n.active).toBe(false);expect(n.realm).toBe('west');expect(n.holder).toBe('dugu-xin');expect(superiorOffice(officeHierarchy(w),n)?.holder).toBe('yuwen-tai');
  // Legal transfer, as performed by the peace rule, preserves office identity, but changes its parent and clears its holder.
  w.realm!.cities.tianshui.owner='east';w.realm!.cities.tianshui.governor=null;expect(node(w,id)).toMatchObject({realm:'east',holder:null,parentId:'office:east:executive:0',active:true});
 });
 it('封建家业交接转移领有；官僚家业交接不继承公职',()=>{
  for(const feudal of [false,true]){const w=start();if(feudal)governmentOf(w)!.type='feudal';act(w,{type:'heir',target:'xiao-gang'});act(w,{type:'handover'});expect(node(w,'office:city:jiankang')).toMatchObject({holder:feudal?'xiao-gang':'xiao-yan',relation:feudal?'liege':'administration'});}
 });
 it('陈氏执政和代梁后切换持有人、清理旧朝官爵，重新请任归属新执政者',()=>{
  const w=start();ready(w,555);act(w,{type:'government',action:'succession',stage:'chen-regency'});pass(w,governmentOf(w)!.task!.required);
  expect(node(w,'office:liang:sovereign').holder).toBe('xiao-fangzhi');expect(node(w,'office:liang:executive:0').holder).toBe('chen-baxian');expect(officeHierarchy(w).filter(n=>n.realm==='liang'&&n.kind==='honour')).toEqual([]);
  ready(w,557);act(w,{type:'government',action:'succession',stage:'chen-accession'});pass(w,governmentOf(w)!.task!.required);
  expect(node(w,'office:liang:sovereign')).toMatchObject({holder:'chen-baxian',regimeId:'liang-chen'});expect(node(w,'office:city:jiankang').holder).toBeNull();
  w.realm!.influence=300;act(w,{type:'realm',action:'petition',site:'jiankang'});pass(w,8);expect(superiorOffice(officeHierarchy(w),node(w,'office:city:jiankang'))?.holder).toBe('chen-baxian');
  expect(officeHierarchy(parseWorld(serializeWorld(w)))).toEqual(officeHierarchy(w));
 });
 it('旧沙盒迁移生成相同关系；教学局无科层数据',()=>{const w=start();const expected=officeHierarchy(w);delete w.realm!.governments;expect(officeHierarchy(parseWorld(serializeWorld(w)))).toEqual(expected);expect(officeHierarchy(newCampaignWorld())).toEqual([]);});
});
