import {describe,it,expect} from 'vitest';
import {createCampaign} from './campaignStart';
import {act,advance} from './world';
import {actAmbition,ambitionReason,ambitionCandidates,careerRank,settleAmbitions,ambitionView,validAmbitions,ambitionEligibleKind} from './ambitions';
import {awardDeed} from './deeds';
import {familyStanding,familyRanks} from './family';
import {pauseSnapshot,pauseEvents} from './pauseEvents';
import {serializeWorld,parseWorld} from './save';
import {ongoingItems} from './ongoing';
import {isMonthStart,monthStart} from './calendar';
import {newCampaignWorld} from './world';
import {playerRealm} from './realm';

const kinds=(id:string)=>ambitionCandidates(createCampaign(id,undefined,'sandbox')).map(c=>c.kind);
describe('ambitions',()=>{
 it('xiao-yan can choose ruler ambitions but not promotion',()=>{
  const k=kinds('xiao-yan');expect(k).toEqual(expect.arrayContaining(['stableCourt','succession','expansion']));expect(k).not.toContain('promotion');
 });
 it('xiao-yi can choose promotion; dugu-xin martialMerit',()=>{
  expect(kinds('xiao-yi')).toContain('promotion');expect(kinds('dugu-xin')).toContain('martialMerit');
 });
 it('an office-less character can choose enterOffice',()=>{
  const w=createCampaign('xiao-gang',undefined,'sandbox');
  expect(kinds('xiao-gang')).toContain(careerRank(w,'xiao-gang')===0?'enterOffice':'promotion');
 });
 it('choose, abandon, and the 90-day cooldown',()=>{
  const w=createCampaign('dugu-xin',undefined,'sandbox'),cmd={type:'ambition',action:'choose',kind:'martialMerit'} as const;
  expect(ambitionReason(w,cmd)).toBe('');actAmbition(w,cmd);expect(w.ambitions!.people['dugu-xin'].active?.kind).toBe('martialMerit');
  act(w,{type:'ambition',action:'abandon'});expect(w.ambitions!.people['dugu-xin'].active).toBeNull();expect(w.ambitions!.people['dugu-xin'].history.at(-1)?.result).toBe('abandoned');
  expect(ambitionReason(w,cmd)).toContain('不可再立');w.day+=91;expect(ambitionReason(w,cmd)).toBe('');
 });
 it('familyStanding completes exactly once',()=>{
  const person=['xiao-yan','yuwen-tai','gao-huan','dugu-xin'].find(id=>ambitionEligibleKind(createCampaign(id,undefined,'sandbox'),'familyStanding'))!;
  expect(person).toBeTruthy();const w=createCampaign(person,undefined,'sandbox'),s=familyStanding(w,person);
  w.ambitions={version:1,people:{[person]:{active:{kind:'familyStanding',chosen:0,baseline:s.tier,counter:0,lastMonth:null},history:[]}}};
  w.families!.prestige[person]=familyRanks[Math.min(s.tier+1,familyRanks.length-1)].threshold;w.social!.stress=20;
  const before=pauseSnapshot(w);
  settleAmbitions(w);settleAmbitions(w);
  const rec=w.ambitions.people[person];
  expect(rec.active).toBeNull();expect(rec.history.at(-1)?.result).toBe('done');expect(w.families!.prestige[person]).toBe(familyRanks[Math.min(s.tier+1,familyRanks.length-1)].threshold+30);expect(w.social!.stress).toBe(5);
  expect(pauseEvents(before,w).some(e=>e.kind==='ambition')).toBe(true);
  const loaded=parseWorld(serializeWorld(w));settleAmbitions(loaded);
  expect(loaded.families).toEqual(w.families);expect(loaded.ambitions).toEqual(w.ambitions);expect(loaded.social!.stress).toBe(5);
 });
 it('martialMerit counts deed awards once per source',()=>{
  const w=createCampaign('dugu-xin',undefined,'sandbox');actAmbition(w,{type:'ambition',action:'choose',kind:'martialMerit'});
  awardDeed(w,playerRealm(w),'dugu-xin','battle:test:1',8,'测试战功');awardDeed(w,playerRealm(w),'dugu-xin','battle:test:1',8,'测试战功');
  expect(w.ambitions!.people['dugu-xin'].active!.counter).toBe(8);
  awardDeed(w,playerRealm(w),'dugu-xin','service:test:1',8,'非战功');expect(w.ambitions!.people['dugu-xin'].active!.counter).toBe(8);
 });
 it('stableCourt counts months without repeating a month',()=>{
  const w=createCampaign('xiao-yan',undefined,'sandbox');actAmbition(w,{type:'ambition',action:'choose',kind:'stableCourt'});
  const court=w.realm!.governments!.realms[playerRealm(w)].court!;court.phase='stable';
  let d=w.day;while(!isMonthStart(d,w.scriptId))d++;w.day=d;
  settleAmbitions(w);settleAmbitions(w);
  expect(w.ambitions!.people['xiao-yan'].active!.counter).toBe(1);
  court.phase='chaos';w.day=monthStart(w.day+32,w.scriptId);while(!isMonthStart(w.day,w.scriptId))w.day++;
  settleAmbitions(w);expect(w.ambitions!.people['xiao-yan'].active!.counter).toBe(0);
 });
 it('lapses when the required status is lost',()=>{
  const w=createCampaign('xiao-yan',undefined,'sandbox');actAmbition(w,{type:'ambition',action:'choose',kind:'expansion'});
  const g=w.realm!.governments!.realms.liang;g.ruler='xiao-gang';g.executives=[];settleAmbitions(w);
  expect(w.ambitions!.people['xiao-yan'].active).toBeNull();expect(w.ambitions!.people['xiao-yan'].history.at(-1)?.result).toBe('lapsed');
 });
 it('tutorial mode has no candidates',()=>{
  expect(ambitionCandidates(newCampaignWorld(undefined,undefined,'tutorial'))).toEqual([]);
 });
 it('validAmbitions rejects malformed state',()=>{
  const w=createCampaign('xiao-yan',undefined,'sandbox');
  expect(validAmbitions({version:1,people:{a:{active:{kind:'bogus',chosen:0,baseline:0,counter:0,lastMonth:null},history:[]}}},w)).toBe(false);
  expect(validAmbitions({version:1,people:{'xiao-yan':{active:{kind:'martialMerit',chosen:0,baseline:0,counter:25,lastMonth:null},history:[]}}},w)).toBe(false);
 });
 it('saves round-trip with and without ambition state',()=>{
  const w=createCampaign('xiao-yan',undefined,'sandbox');actAmbition(w,{type:'ambition',action:'choose',kind:'expansion'});
  const parsed=parseWorld(serializeWorld(w));expect(parsed?.ambitions?.people['xiao-yan'].active?.kind).toBe('expansion');
  const plain=createCampaign('xiao-yan',undefined,'sandbox');delete plain.ambitions;expect(parseWorld(serializeWorld(plain))).toBeTruthy();
 });
 it('untitled characters can save a nobility ambition without allowing negative baselines on other goals',()=>{
  const w=createCampaign('xiao-gang',undefined,'sandbox');
  actAmbition(w,{type:'ambition',action:'choose',kind:'nobility'});
  const a=w.ambitions!.people['xiao-gang'].active!;expect(a.baseline).toBe(-1);
  expect(parseWorld(serializeWorld(w)).ambitions).toEqual(w.ambitions);
  a.kind='expansion';expect(()=>serializeWorld(w)).toThrow('存档');
 });
 it('ongoing flag shows pick prompt or active progress',()=>{
  const w=createCampaign('xiao-yan',undefined,'sandbox');
  let item=ongoingItems(w).find(i=>i.kind==='ambition');expect(item?.id).toBe('ambition-pick');expect(item?.attention).toBe(true);
  actAmbition(w,{type:'ambition',action:'choose',kind:'expansion'});
  item=ongoingItems(w).find(i=>i.kind==='ambition');expect(item?.id).toBe('ambition:'+w.ambitions!.people['xiao-yan'].active!.chosen);expect(item?.attention).toBe(false);expect(ambitionView(w)?.progress).toBeGreaterThanOrEqual(0);
 });
 it('advance settles achievements',()=>{
  const w=createCampaign('xiao-yan',undefined,'sandbox');
  w.ambitions={version:1,people:{'xiao-yan':{active:{kind:'enterOffice',chosen:0,baseline:0,counter:0,lastMonth:null},history:[]}}};
  w.realm!.cities[w.people[0].location].governor='xiao-yan';advance(w,1);
  expect(w.ambitions.people['xiao-yan'].active).toBeNull();expect(w.ambitions.people['xiao-yan'].history.at(-1)?.result).toBe('done');
 });
});
