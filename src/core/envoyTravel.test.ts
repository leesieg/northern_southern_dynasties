import {describe,it,expect} from 'vitest';
import {newCampaignWorld,act} from './world';
import {diplomaticQuote,advanceDiplomacy,diplomaticPair} from './diplomacy';
import {envoyCandidates,defaultEnvoy,envoyReason,envoyEstimate,missionJourney} from './envoyTravel';
import {personResidence} from './residence';
import {parseWorld,serializeWorld} from './save';
import {capital} from './realm';
import {serviceBusy} from './assignments';
import {publicOfficeReason} from './officeEligibility';
import {advanceMobility} from './mobility';
const start=()=>{const w=newCampaignWorld('gao-huan',undefined,'sandbox');w.realm!.influence=900;w.realm!.treasuries.east.coins=10000;return w;};
describe('实名使团',()=>{
 it('选人报价、真实到都交涉与返程，重载不重复结算',()=>{
  const w=start(),id=defaultEnvoy(w,'east','west')!;expect(id).toBeTruthy();const home=personResidence(w,id).site;
  const c={type:'diplomacy',action:'improve',target:'west',envoy:id} as const,q=diplomaticQuote(w,c);expect(q.reason).toBe('');act(w,c);
  const m=w.diplomacy!.missions[0];expect(m.envoy).toBe(id);expect(serviceBusy(w,id)).toBe(true);expect(publicOfficeReason(w,id)).toContain('使团');expect(missionJourney(w,id)?.route.at(-1)).toBe(capital('west'));
  const copy=parseWorld(serializeWorld(w));const due=m.due;
  for(let day=1;day<=due;day++){w.day++;copy.day++;advanceDiplomacy(w);advanceDiplomacy(copy);}
  expect(w).toEqual(copy);expect(personResidence(w,id).site).toBe(capital('west'));expect(m.status).toBe('returning');expect(diplomaticPair(w,'east','west')!.opinion).toBe(-45);
  const before=structuredClone(w);advanceDiplomacy(w);expect(w).toEqual(before);
  for(let day=w.day;day<m.due;day++){w.day++;advanceDiplomacy(w);}
  expect(personResidence(w,id).site).toBe(home);expect(w.diplomacy!.missions).toHaveLength(0);expect(diplomaticPair(w,'east','west')!.opinion).toBe(-45);expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('错误归属和重复占用不扣款，通行只授予此次使节行程',()=>{const w=start(),id=defaultEnvoy(w,'east','west')!;const before=structuredClone(w);expect(()=>act(w,{type:'diplomacy',action:'improve',target:'west',envoy:'yuwen-tai'})).toThrow();expect(w).toEqual(before);act(w,{type:'diplomacy',action:'improve',target:'west',envoy:id});expect(envoyReason(w,id,'east','liang')).toContain('事务');const j=structuredClone(missionJourney(w,id));w.day++;advanceMobility(w);expect(missionJourney(w,id)).toEqual(j);});
 it('外交能力影响交涉日数和成功率，亡故中止且保留实际驻地',()=>{const w=start(),id=defaultEnvoy(w,'east','west')!,a=envoyEstimate(w,id,'east','west','alliance',80);expect(a.chance).toBeGreaterThanOrEqual(5);expect(a.negotiation).toBe(Math.max(2,14-Math.floor(a.skill/2)));act(w,{type:'diplomacy',action:'improve',target:'west',envoy:id});const at=personResidence(w,id).site;w.life!.people[id].death={day:w.day,cause:'illness'};w.day++;advanceDiplomacy(w);expect(w.diplomacy!.missions).toHaveLength(0);expect(personResidence(w,id).site).toBe(at);expect(missionJourney(w,id)).toBeNull();expect(diplomaticPair(w,'east','west')!.opinion).toBe(-70);});
 it('交涉中停留首都，返程占用至实际到家；损坏使者存档被拒绝',()=>{const w=start(),id=defaultEnvoy(w,'east','west')!;act(w,{type:'diplomacy',action:'improve',target:'west',envoy:id});const m=w.diplomacy!.missions[0];while(missionJourney(w,id)){w.day++;advanceDiplomacy(w);}expect(personResidence(w,id).site).toBe(capital('west'));w.day++;advanceMobility(w);expect(missionJourney(w,id)).toBeNull();expect(serviceBusy(w,id)).toBe(true);m.envoy='ghost';expect(()=>serializeWorld(w)).toThrow();});
 it('不同外交能力给出不同交涉时间与成功率',()=>{const w=start();diplomaticPair(w,'east','west')!.opinion=0;const people=envoyCandidates(w,'east','west').filter(p=>!p.reason),high=people[0],low=people.at(-1)!;expect(high.score).toBeGreaterThan(low.score);const a=envoyEstimate(w,high.id,'east','west','pact',50),b=envoyEstimate(w,low.id,'east','west','pact',50);expect(a.negotiation).toBeLessThan(b.negotiation);expect(a.chance).toBeGreaterThan(b.chance);});
 it('首都失守不远程成交，使团按现实位置返还',()=>{const w=start(),id=defaultEnvoy(w,'east','west')!;act(w,{type:'diplomacy',action:'improve',target:'west',envoy:id});while(missionJourney(w,id)){w.day++;advanceDiplomacy(w);}w.realm!.cities.changan.controller='liang';w.day++;advanceDiplomacy(w);expect(diplomaticPair(w,'east','west')!.opinion).toBe(-75);expect(w.diplomacy!.missions.every(m=>m.status==='returning')).toBe(true);});
 it('跳过日期不能让尚在道路上的使者远程完成交涉',()=>{const w=start(),id=defaultEnvoy(w,'east','west')!;act(w,{type:'diplomacy',action:'improve',target:'west',envoy:id});w.day=w.diplomacy!.missions[0].due;advanceDiplomacy(w);expect(missionJourney(w,id)).not.toBeNull();expect(diplomaticPair(w,'east','west')!.opinion).toBe(-70);});

});
