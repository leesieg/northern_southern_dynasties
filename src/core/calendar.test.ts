import {describe,it,expect} from 'vitest';
import {calendarDate,isMonthStart,monthStart,nextMonthStart,monthIndex} from './calendar';
import {dateLabel} from './world';
const dayOf=(year:number,month:number,day:number)=>(Date.UTC(year,month-1,day)-Date.UTC(546,0,1))/86_400_000;
describe('游戏日历月结边界',()=>{
 it('月初与界面日期一致，大小月不使用固定 30 日',()=>{
  const starts=[0,31,59,90,120,151,181,212,243,273,304,334,365];
  for(let i=0;i<starts.length-1;i++){
   const day=starts[i];expect(isMonthStart(day)).toBe(true);expect(monthIndex(day)).toBe(i);
   expect(nextMonthStart(day)).toBe(starts[i+1]);expect(monthStart(starts[i+1]-1)).toBe(day);
   expect(dateLabel(day)).toBe(`546 年 ${i+1} 月 1 日`);
  }
  for(const day of [30,60,120-1,360,364])expect(isMonthStart(day)).toBe(false);
 });
 it('闰年二月、跨年和月初当天的下一期都是未来月初',()=>{
  for(const [year,days] of [[547,28],[548,29],[600,28],[800,29]]){
   const feb=dayOf(year,2,1),march=dayOf(year,3,1);expect(nextMonthStart(feb)-feb).toBe(days);
   expect(nextMonthStart(march-1)).toBe(march);expect(isMonthStart(march-1)).toBe(false);
   expect(calendarDate(march).getUTCDate()).toBe(1);expect(monthStart(march)).toBe(march);
  }
  expect(nextMonthStart(dayOf(548,12,31))).toBe(dayOf(549,1,1));
  expect(isMonthStart(-1)).toBe(false);expect(isMonthStart(31.5)).toBe(false);
 });
});
