import {describe,expect,it} from 'vitest';
import {act,armyBatchReason,newCampaignWorld} from './world';
import {serializeWorld,validateWorld} from './save';

function setup(count:number){
 const w=newCampaignWorld('xiao-yan',undefined,'sandbox');
 w.realm!.cities.jiankang.grain=1000;
 for(let i=0;i<count;i++)act(w,{type:'army',action:'raise',site:'jiankang',kind:'shield',service:'levy'});
 return w;
}

describe('batch army orders',()=>{
 it('merges selected armies with their soldiers, supply and debts intact',()=>{
  const w=setup(3),ids=w.realm!.armies.map(a=>a.id!),[first,second,third]=w.realm!.armies;
  first.arrears=3;second.arrears=5;third.arrears=7;
  act(w,{type:'armyBatch',action:'merge',armies:ids,target:ids[0]});
  expect(w.realm!.armies).toHaveLength(1);
  expect(w.realm!.armies[0]).toMatchObject({id:ids[0],troops:600,supply:180,arrears:15});
  expect(w.realm!.armies[0].regiments).toHaveLength(3);
  validateWorld(w);
 });
 it('rejects the entire order when a later army cannot merge',()=>{
  const w=setup(3),ids=w.realm!.armies.map(a=>a.id!);
  w.realm!.armies[2].location='jingkou';
  const before=serializeWorld(w),order={type:'armyBatch',action:'merge',armies:ids,target:ids[0]} as const;
  expect(armyBatchReason(w,order)).toContain(`第 ${ids[2]} 军`);
  expect(()=>act(w,order)).toThrow(`第 ${ids[2]} 军`);
  expect(serializeWorld(w)).toBe(before);
 });
 it('moves selected armies together and sends their demobilized soldiers home',()=>{
  const w=setup(2),ids=w.realm!.armies.map(a=>a.id!);
  for(const a of w.realm!.armies)a.trainingUntil=w.day;
  act(w,{type:'armyBatch',action:'march',armies:ids,site:'jingkou'});
  expect(w.realm!.armies.every(a=>a.journey?.route.at(-1)==='jingkou')).toBe(true);
  expect(armyBatchReason(w,{type:'armyBatch',action:'disband',armies:ids})).toContain('抵达后');
  for(const a of w.realm!.armies){a.journey=null;a.location='jingkou';}
  const population=w.realm!.cities.jingkou.population;
  act(w,{type:'armyBatch',action:'disband',armies:ids});
  expect(w.realm!.armies).toHaveLength(0);
  expect(w.realm!.cities.jingkou.population).toBe(population);
  expect(w.realm!.population?.transfers.filter(t=>t.kind==='demobilized'&&t.to==='jiankang').reduce((n,t)=>n+t.sent,0)).toBe(400);
  validateWorld(w);
 });
});
