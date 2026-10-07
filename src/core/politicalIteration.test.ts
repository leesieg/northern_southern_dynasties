import {describe,it,expect} from 'vitest';
import {newCampaignWorld,act} from './world';
import {parseWorld,serializeWorld} from './save';
import {actIntrigue,advanceIntrigue,visibleSchemes,intrigueQuote} from './intrigue';
import {pauseSnapshot,pauseEvents,successionPauses,allegiancePauses} from './pauseEvents';
import {die} from './life';
import {applyPowerArrangement} from './powerPolitics';
import {syncRulerHistory,honorRecommendations} from './rulerHistory';
import {ongoingItems} from './ongoing';
import {personResidence} from './residence';
import {creditPersonalCoins} from './relationships';
import {attributes,abilityBreakdown} from './social';
import {actLifestyle} from './lifestyle';
import {fiscalRecord,publicFiscalEntries} from './treasury';

describe('权谋迭代的实际指令、存档与暂停交接',()=>{
 it('公库账目不暴露 NPC 私筹计谋，涉及公库的真实划转仍保留',()=>{
  const w=newCampaignWorld('xiao-yan',undefined,'sandbox');
  fiscalRecord(w,'liang','person:xiao-gang','expense',80,'计谋筹办：谋害');
  fiscalRecord(w,'liang','person:xiao-gang','person:xiao-yi',40,'密约礼金');
  fiscalRecord(w,'liang','central:liang','person:xiao-gang',50,'支付薪俸');
  const view=publicFiscalEntries(w,'liang');expect(view.some(e=>e.reason.includes('计谋')||e.reason.includes('密约'))).toBe(false);
  expect(view.find(e=>e.reason==='支付薪俸')?.coins).toBe(50);expect(w.realm!.fiscal!.entries).toHaveLength(3);
 });
 it('权谋生活成长进入真实谋略能力与行动机会，能力来源可以追溯',()=>{
  const w=newCampaignWorld('gao-huan',undefined,'sandbox');w.people[0].coins=1000;
  w.mobility!.residences['gao-cheng']={...w.mobility!.residences['gao-cheng'],site:personResidence(w,'gao-huan').site,journey:null};
  const c={type:'intrigue',action:'start',kind:'murder',target:'gao-cheng'} as const,base=attributes(w).intrigue,q=intrigueQuote(w,c);
  actLifestyle(w,{type:'lifestyle',action:'focus',focus:'intelligence'});actLifestyle(w,{type:'lifestyle',action:'unlock',perk:'observers'});
  expect(attributes(w).intrigue).toBe(base+3);expect(abilityBreakdown(w).intrigue.parts.some(p=>p.label==='已学技能'&&p.value===1)).toBe(true);
  expect(intrigueQuote(w,c).chance).toBeGreaterThan(q.chance);
 });
 it('改朝换代记录真实开创任期，通用官署同步不能覆盖开创依据',()=>{
  const w=newCampaignWorld('gao-huan',undefined,'sandbox');applyPowerArrangement(w,'east',{goal:'dynasty',sponsor:'gao-huan',beneficiary:'gao-huan',executive:'gao-huan',name:'齐'});
  const tenure=w.rulerHistory!.tenures.find(t=>t.realm==='east'&&t.office==='ruler'&&t.until===null)!;
  expect(tenure.basis).toBe('founding');expect(honorRecommendations(w,tenure.id).temple).toBe('太祖');
 });
 it('旧档补齐新系统但不增发钱粮、宣称或爵位，保留已获生活成长',()=>{
  const w=newCampaignWorld('xiao-yan',undefined,'sandbox'),stores=structuredClone(w.realm!.treasuries),coins=w.people[0].coins;
  delete w.intrigue;delete w.claims;delete w.nobility;delete w.rulerHistory;
  w.lifestyles!.version=2;delete (w.lifestyles!.people['xiao-yan'].xp as Partial<Record<string,number>>).intrigue;
  const restored=parseWorld(serializeWorld(w));
  expect(restored.people[0].coins).toBe(coins);expect(restored.realm!.treasuries).toEqual(stores);
  expect(restored.lifestyles!.version).toBe(3);expect(restored.lifestyles!.people['xiao-yan'].xp.intrigue).toBe(0);
  expect(restored.claims!.records).toEqual([]);expect(restored.nobility!.titles).toEqual([]);
  expect(restored.rulerHistory!.tenures.every(t=>t.from===restored.day)).toBe(true);
 });
 it('统一指令开始谋略后可存读，顶部事项指向工作台；进度和结果重放不重复扣奖',()=>{
  const w=newCampaignWorld('gao-huan',undefined,'sandbox');w.people[0].coins=1000;
  const site=personResidence(w,'gao-huan').site;w.mobility!.residences['gao-cheng']={...w.mobility!.residences['gao-cheng'],site,journey:null};
  const command={type:'intrigue',action:'start',kind:'befriend',target:'gao-cheng'} as const,cost=intrigueQuote(w,command).cost;
  act(w,command);expect(w.people[0].coins).toBe(1000-cost);
  expect(ongoingItems(w).find(i=>i.id.startsWith('intrigue:'))?.target).toEqual({page:'intrigue'});
  const loaded=parseWorld(serializeWorld(w)),before=pauseSnapshot(loaded);loaded.day=loaded.intrigue!.schemes[0].due;loaded.intrigue!.lastNPCReview=loaded.day;
  advanceIntrigue(loaded);syncRulerHistory(loaded);
  expect(pauseEvents(before,loaded).some(e=>e.kind==='intrigue')).toBe(true);
  const done=structuredClone(loaded);advanceIntrigue(loaded);expect(loaded).toEqual(done);
  expect(parseWorld(serializeWorld(loaded)).intrigue).toEqual(loaded.intrigue);
 });
 it('未知敌方谋略不进入事项或暂停文书，也不暴露执行者及随机结果',()=>{
  const w=newCampaignWorld('xiao-yan',undefined,'sandbox');w.mobility!.residences['xiao-gang']={...w.mobility!.residences['xiao-gang'],site:personResidence(w,'xiao-yan').site,journey:null};creditPersonalCoins(w,'xiao-gang',1000);
  const before=pauseSnapshot(w);actIntrigue(w,{type:'intrigue',action:'start',kind:'murder',target:'xiao-yan'},'xiao-gang');
  expect(visibleSchemes(w)).toEqual([]);expect(pauseEvents(before,w).filter(e=>e.kind==='intrigue')).toEqual([]);expect(ongoingItems(w).filter(i=>i.kind==='scheme')).toEqual([]);
  w.intrigue!.schemes[0].discovered=true;const threat=visibleSchemes(w)[0];expect(threat.actor).toBeNull();expect(threat.progress).toBeNull();expect(threat).not.toHaveProperty('successRoll');
 });
 it('正常君位继承暂停议谥，守丧不阻止办理文书，存读不重授称号',()=>{
  const w=newCampaignWorld('xiao-gang',undefined,'sandbox');die(w,'xiao-yan','age');syncRulerHistory(w);
  const event=successionPauses(w)[0];expect(event).toBeTruthy();const t=event.tenureId!,rec=honorRecommendations(w,t);
  act(w,{type:'honor',action:'confer',tenure:t,posthumous:rec.posthumous,temple:rec.temple});
  expect(successionPauses(w)).toEqual([]);expect(w.rulerHistory!.honors).toHaveLength(1);
  const restored=parseWorld(serializeWorld(w));expect(restored.rulerHistory!.honors).toEqual(w.rulerHistory!.honors);
  expect(()=>act(restored,{type:'honor',action:'confer',tenure:t,posthumous:'文'})).toThrow('不可重复');
 });
 it('异常交接保留玩家表态；接受统属只办理本人选择，通知随真实状态消失',()=>{
  const w=newCampaignWorld('xiao-yi',undefined,'sandbox');applyPowerArrangement(w,'liang',{goal:'ruler',sponsor:'xiao-gang',beneficiary:'xiao-gang',executive:'xiao-gang',name:''});syncRulerHistory(w);
  const e=allegiancePauses(w)[0];expect(e?.allegianceRealm).toBe('liang');
  act(w,{type:'power',action:'stance',realm:'liang',choice:'accept'});expect(allegiancePauses(w)).toEqual([]);
  expect(parseWorld(serializeWorld(w)).politics!.reassessments!.find(q=>q.person==='xiao-yi')?.choice).toBe('accept');
 });
});
