import {describe,it,expect} from 'vitest';
import {newCampaignWorld} from './world';
import {collectFiscal,payFiscalOperations,publicBalance,territoryAccount,localSalaryExpense,actFiscal,advanceFiscal,grantFactors} from './treasury';
import {setLocalHolder} from './localAdministration';
import {realmForecast} from './realm';
import {parseWorld,serializeWorld} from './save';
const start=()=>newCampaignWorld('dugu-xin',undefined,'sandbox');
const qin='province:west:秦州';
describe('地方财政体验',()=>{
 it('秦州留用税不再被俸禄清空，俸禄拨付有真实中央来源',()=>{const w=start();collectFiscal(w,'west');const key=territoryAccount(w,'west',qin),retained=publicBalance(w,key);expect(retained).toBeGreaterThan(0);payFiscalOperations(w,'west');expect(publicBalance(w,key)).toBe(retained);expect(w.realm!.fiscal!.entries.some(e=>e.to===key&&e.reason==='州郡官员俸禄拨付')).toBe(true);expect(localSalaryExpense(w,'west')).toBeGreaterThan(0);expect(realmForecast(w,'west').expense).toBeGreaterThanOrEqual(localSalaryExpense(w,'west'));expect(parseWorld(serializeWorld(w))).toEqual(w);});
 it('足额但不富裕的中央可批准空州库的适量请款；审批转移守恒',()=>{const w=start();w.realm!.treasuries.west.coins=100;actFiscal(w,{type:'fiscal',action:'request',site:'tianshui',territory:qin,amount:100,purpose:'construction'});const q=w.realm!.fiscal!.requests.at(-1)!;expect(grantFactors(w,q).reduce((sum,p)=>sum+p.value,0)).toBeGreaterThanOrEqual(50);w.day=3;advanceFiscal(w);expect(q.status).toBe('approved');expect(w.realm!.treasuries.west.coins).toBe(0);expect(publicBalance(w,territoryAccount(w,'west',qin))).toBe(100);expect(q.reply).toContain('秦州公库');});
 it('县库空缺但无赈济急需时不再群发储备请款',()=>{const w=start();for(const city of Object.values(w.realm!.cities))city.order=70;w.day=5;advanceFiscal(w);expect(w.realm!.fiscal!.requests).toHaveLength(0);for(const city of Object.values(w.realm!.cities))city.order=30;w.day=36;advanceFiscal(w);const counts=new Map<string,number>();for(const q of w.realm!.fiscal!.requests.filter(q=>q.status==='pending'))counts.set(q.approver,(counts.get(q.approver)??0)+1);expect([...counts.values()].every(n=>n<=2)).toBe(true);});
 it('上缴路径州库满额时跳过薪俸补助，不中断月结',()=>{const w=start();setLocalHolder(w,qin,'west',null);setLocalHolder(w,'prefecture:tianshui','west','dugu-xin');const key=territoryAccount(w,'west',qin);w.realm!.fiscal!.balances[key]=1_000_000;expect(()=>payFiscalOperations(w,'west')).not.toThrow();expect(publicBalance(w,key)).toBe(1_000_000);expect(w.realm!.fiscal!.entries.some(e=>e.to==='west|prefecture:tianshui'&&e.reason==='州郡官员俸禄拨付')).toBe(false);});

});
