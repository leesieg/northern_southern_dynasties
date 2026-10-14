import {describe,it,expect} from 'vitest';
import {createMapRegistry} from './mapRegistry';
import type {Site} from './types';
const sites:Site[]=['a','b','c'].map((id,i)=>({id,name:id,lon:110+i,lat:30,polity:'liang',terrain:'平原',description:''}));
describe('instance map registries',()=>{
 it('owns its source and cached durations independently, including identical IDs',()=>{
  const input=structuredClone(sites),roads=[{from:'a',to:'b',factor:1,days:2},{from:'b',to:'c',factor:1,days:3}];
  const a=createMapRegistry(input,roads);input[0].lon=130;roads[0].days=20;
  const b=createMapRegistry(input,roads);
  expect(a.planRoute('a','c')).toMatchObject({route:['a','b','c'],durations:[2,3],days:5,food:5});
  expect(b.planRoute('a','c')?.days).toBe(23);expect(a.getSite('a')?.lon).toBe(110);
  expect(Object.isFrozen(a.sites[0])).toBe(true);expect(Object.isFrozen(a.roads)).toBe(true);
  expect(()=>{(a.sites[0] as Site).lon=0;}).toThrow();
 });
 it('keeps booked legacy legs readable while excluding them from new routes',()=>{
  const map=createMapRegistry(sites,[{from:'a',to:'c',factor:1,days:1,legacyOnly:true},{from:'a',to:'b',factor:1,days:2},{from:'b',to:'c',factor:1,days:3}]);
  expect(map.legDays('a','c')).toBe(1);expect(map.planRoute('a','c')?.route).toEqual(['a','b','c']);
  expect(map.planRoute('a','c',id=>id!=='b')).toBeNull();expect(map.planRoute('c','a')?.days).toBe(5);
  expect(map.planRoute('ghost','a')).toBeNull();expect(map.planRoute('a','a')).toBeNull();
 });
 it('rejects overlapping active and legacy legs before a journey can receive ambiguous durations',()=>{
  expect(()=>createMapRegistry(sites,[{from:'a',to:'b',factor:1,days:2,legacyOnly:true},{from:'b',to:'a',factor:1,days:6}])).toThrow('端点重复');
 });
 it('rejects invalid map data before building a cache',()=>{
  expect(()=>createMapRegistry([...sites,sites[0]],[])).toThrow('重复');
  expect(()=>createMapRegistry([{...sites[0],lon:NaN}],[])).toThrow('坐标');
  expect(()=>createMapRegistry(sites,[{from:'a',to:'ghost',factor:1}])).toThrow('端点');
  expect(()=>createMapRegistry(sites,[{from:'a',to:'b',factor:0}])).toThrow('参数');
  expect(()=>createMapRegistry(sites,[{from:'a',to:'b',factor:1,days:0.5}])).toThrow('参数');
 });
});
