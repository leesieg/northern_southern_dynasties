import {describe,it,expect} from 'vitest';
import {newCampaignWorld} from './world';
import {actIntrigue,advanceIntrigue,intrigueQuote} from './intrigue';
import {actCustody,advanceCustody,custodyAuthority,custodyReason,custodyChief,visibleCustodyRecords,visibleCustodyHistory,custodyUpkeepQuote} from './custody';
import {validCustody} from './custodySave';
import {accountWallet} from './obligations';
import {nextMonthStart} from './calendar';
import {die} from './life';
import {lifeOf} from './lifeState';
import {parseWorld,serializeWorld} from './save';
import type {World} from './types';
function kidnapped(actor='xiao-gang',target='dugu-xin',viewer=actor){
 const w=newCampaignWorld(viewer,undefined,'sandbox');w.people[0].coins=2000;w.relationships!.reserves[actor]=2000;w.mobility!.residences[actor]={site:'jiankang',journey:null};w.mobility!.residences[target]={site:'jiankang',journey:null};w.people[0].location='jiankang';actIntrigue(w,{type:'intrigue',action:'start',kind:'abduct',target},actor);const s=w.intrigue!.schemes.at(-1)!;s.successRoll=0;s.exposureRoll=.999;w.day=s.due;advanceIntrigue(w);return w;
}
const totalCentral=(w:World)=>Object.values(w.realm!.treasuries).reduce((n,t)=>n+t.coins,0);
describe('真实私人绑架拘押',()=>{
 it('真实计谋来源和私人持有者保存，非君主可释放，普通君主没有私囚处置权',()=>{
  const w=kidnapped(),p=w.custody!.records['dugu-xin'];expect(p.cause).toBe('abduction');expect(p.captorPerson).toBe('xiao-gang');expect(custodyAuthority(w,'xiao-gang',p)).toBe('私人看管');expect(custodyAuthority(w,'xiao-yan',p)).toBe('');expect(custodyChief(w,p)).toBe('xiao-gang');expect(validCustody(w)).toBe(true);expect(parseWorld(serializeWorld(w))).toEqual(w);expect(custodyReason(w,{type:'custody',action:'release',person:p.person},'xiao-yan')).toContain('没有当前');expect(()=>actCustody(w,{type:'custody',action:'release',person:p.person},'xiao-yan')).toThrow();actCustody(w,{type:'custody',action:'release',person:p.person});expect(w.custody!.records[p.person]).toBeUndefined();
 });
 it('未知绑架者不进入公开记录、日志和明细；自己的计谋可查真实持有者',()=>{
  const w=kidnapped('xiao-gang','dugu-xin','dugu-xin'),own=visibleCustodyRecords(w,'xiao-gang')[0],victim=visibleCustodyRecords(w)[0];expect(own.captorPerson).toBe('xiao-gang');expect(victim.captorPerson).toBeNull();expect(victim.source).toBe('abduction:unknown');expect(visibleCustodyRecords(w,'xiao-yan')).toEqual([]);expect(visibleCustodyHistory(w,'xiao-yan')).toEqual([]);expect(visibleCustodyHistory(w).every(h=>!h.source.startsWith('scheme:'))).toBe(true);expect(custodyUpkeepQuote(w,victim).holder).toBeNull();expect(custodyUpkeepQuote(w,victim).balance).toBeNull();const scheme=w.intrigue!.schemes.find(s=>s.kind==='abduct')!;scheme.exposed=true;scheme.discovered=true;expect(visibleCustodyRecords(w)[0].captorPerson).toBe('xiao-gang');
 });
 it('私人绑架只容一位实际囚徒，不能刷成国家招降、授官或司法罚金',()=>{
  const w=kidnapped(),coins=w.people[0].coins;expect(intrigueQuote(w,{type:'intrigue',action:'start',kind:'abduct',target:'xiao-yan'}).reason).toContain('容量');for(const action of ['recruit','fine','acquit','accept'] as const){const c=action==='recruit'?{type:'custody' as const,action,person:'dugu-xin',offer:'office' as const}:{type:'custody' as const,action,person:'dugu-xin'};expect(custodyReason(w,c)).not.toBe('');expect(()=>actCustody(w,c)).toThrow();}expect(w.people[0].coins).toBe(coins);
 });
 it('看管费用来自真实私财，月度去重；欠费后守卫离开释放，无中央补贴',()=>{
  const w=kidnapped(),p=w.custody!.records['dugu-xin'],central=totalCentral(w),before=w.people[0].coins;p.treatment='honored';const month=nextMonthStart(w.day,w.scriptId);w.day=month;advanceCustody(w);expect(w.people[0].coins).toBe(before-6);expect(totalCentral(w)).toBe(central);const snapshot=structuredClone(w);advanceCustody(w);expect(w).toEqual(snapshot);w.people[0].coins=1;w.day=nextMonthStart(w.day,w.scriptId);advanceCustody(w);expect(w.people[0].coins).toBe(0);expect(w.custody!.records[p.person]).toBeUndefined();expect(totalCentral(w)).toBe(central);expect(w.custody!.history.at(-1)!.result).toContain('经费不足');
 });
 it('赎金从囚徒实际钱包进入私人持有者账户，双方与公库守恒且不能重复收款',()=>{
  const w=kidnapped('xiao-gang','dugu-xin','dugu-xin'),p=w.custody!.records['dugu-xin'],before=w.people[0].coins,holder=accountWallet(w,'person:xiao-gang')!.read(),central=totalCentral(w);expect(custodyReason(w,{type:'custody',action:'ransom',person:p.person})).toBe('');actCustody(w,{type:'custody',action:'ransom',person:p.person});expect(w.people[0].coins).toBe(before-p.ransom);expect(accountWallet(w,'person:xiao-gang')!.read()).toBe(holder+p.ransom);expect(w.people[0].coins+accountWallet(w,'person:xiao-gang')!.read()).toBe(before+holder);expect(totalCentral(w)).toBe(central);expect(()=>actCustody(w,{type:'custody',action:'ransom',person:p.person})).toThrow();expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('私人持有者离世或失去自由后释放，囚徒可按实际道路逃离',()=>{
  const dead=kidnapped('xiao-gang','dugu-xin','dugu-xin');die(dead,'xiao-gang','age');dead.day++;advanceCustody(dead);expect(dead.custody!.records['dugu-xin']).toBeUndefined();
  const escaped=kidnapped('xiao-gang','xiao-yi','xiao-yi'),p=escaped.custody!.records['xiao-yi'];p.escapeAfter=escaped.day;escaped.life!.seed=2000;expect(custodyReason(escaped,{type:'custody',action:'escape',person:p.person})).toBe('');actCustody(escaped,{type:'custody',action:'escape',person:p.person});expect(escaped.custody!.records[p.person]).toBeUndefined();expect(escaped.people[0].journey).not.toBeNull();
 });
 it('私囚杀害沿用谋杀死亡清理，无合法处决或中央支持扣罚',()=>{
  const w=kidnapped(),support=w.realm!.governments!.realms.liang.support;actCustody(w,{type:'custody',action:'execute',person:'dugu-xin'});expect(lifeOf(w,'dugu-xin')!.death?.cause).toBe('murder');expect(w.custody!.records['dugu-xin']).toBeUndefined();expect(w.realm!.governments!.realms.liang.support).toBe(support);expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('伪造私人来源、持有者或国家招降条件被存档校验拒绝',()=>{
  const w=kidnapped();for(const change of [(x:World)=>x.custody!.records['dugu-xin'].source='scheme:999',(x:World)=>x.custody!.records['dugu-xin'].captorPerson='xiao-yan',(x:World)=>x.custody!.records['dugu-xin'].offer='office',(x:World)=>x.intrigue!.schemes.find(s=>s.kind==='abduct')!.status='failed']){const bad=structuredClone(w);change(bad);expect(validCustody(bad)).toBe(false);expect(()=>serializeWorld(bad)).toThrow('存档');}
 });
 it('有实际拒命依据的中央拘捕可依法接管私囚，无依据不能自动接管',()=>{
  const w=kidnapped('xiao-gang','xiao-yi');expect(custodyReason(w,{type:'custody',action:'arrest',person:'xiao-yi'},'xiao-yan')).toContain('实际拘捕依据');w.realm!.armies.push({id:99,realm:'liang',location:'jiankang',troops:100,morale:80,supply:30,journey:null,siege:0,refusal:{kind:'replace',commander:'xiao-yi',day:w.day,reason:'拒绝实际撤换命令'}});actCustody(w,{type:'custody',action:'arrest',person:'xiao-yi'},'xiao-yan');w.day+=7;advanceCustody(w);const p=w.custody!.records['xiao-yi'];expect(p.cause).toBe('arrest');expect(p.source).toMatch(/^warrant:/);expect(custodyAuthority(w,'xiao-yan',p)).toBe('国家裁定');expect(custodyAuthority(w,'xiao-gang',p)).toBe('');expect(validCustody(w)).toBe(true);
 });
});
