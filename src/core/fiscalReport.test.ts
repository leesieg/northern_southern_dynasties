import {describe,it,expect} from 'vitest';
import {fiscalReport} from './fiscalReport';
import type {FiscalEntry} from './treasury';
const entry=(id:number,day:number,from:string,to:string,coins:number):FiscalEntry=>({id,day,from,to,coins,reason:'调拨',realm:'liang'});
describe('公库显示汇总',()=>{
 it('只记录所选账户与日期的出入，不把余额当收入',()=>{const entries=[entry(1,1,'tax','county',100),entry(2,2,'county','province',65),entry(3,3,'province','central',50),entry(4,4,'county','expense',10)];expect(fiscalReport(entries,['county'],2,3)).toMatchObject({income:0,expense:65,net:-65});expect(fiscalReport(entries,['province'],1,3)).toMatchObject({income:65,expense:50,net:15});});
 it('跨层级汇总抵消内部转移，不重复计入财政收入',()=>{const entries=[entry(1,1,'tax','county',100),entry(2,1,'county','province',65),entry(3,1,'province','central',50)];expect(fiscalReport(entries,['county','province','central'],1,2)).toMatchObject({income:100,expense:0,net:100});});
 it('专款退款返回原账户、忽略自转账，空记录不造期初余额',()=>{const result=fiscalReport([entry(1,1,'county','task:1',40),entry(2,2,'task:1','county',15),entry(3,2,'county','county',999)],['county'],1,2);expect(result).toMatchObject({income:15,expense:40,net:-25});expect(result.entries).toHaveLength(2);expect(fiscalReport([],['county'],1,3)).not.toHaveProperty('opening');});
});
