import {describe,it,expect} from 'vitest';
import {newCampaignWorld} from './world';
import {strategicTargets,advanceRealmStrategy} from './realmStrategy';
import {warWillToContinue} from './warScoring';
import {ensureWars,activeWars} from './wars';
import {ensureAftermath} from './militaryAftermath';
import {ensureArmyOrganization} from './armyOrganization';
import {diplomaticPair} from './diplomacy';
import {nextMonthStart} from './calendar';
import {type Army,declareRealmWarReason} from './realm';
import {governingAuthority} from './government';
import {courtOf} from './court';
import {parseWorld,serializeWorld} from './save';
const start=()=>newCampaignWorld('guest-west',undefined,'sandbox');
function army(w:ReturnType<typeof start>,realm:Army['realm'],location:string,troops=600){const a:Army={realm,location,troops,morale:100,supply:120,journey:null,siege:0,automation:'delegated'};w.realm!.armies.push(a);ensureArmyOrganization(w);return a;}
function warWorld(){const w=start(),s=w.realm!;s.armies=[];army(w,'east','luoyang',2400);army(w,'west','changan',2400);s.treasuries.east.coins=s.treasuries.west.coins=2000;s.war={attacker:'east',defender:'west',target:'changan',started:0,score:0};delete s.wars;ensureWars(w);w.day=nextMonthStart(180);return w;}
function preparedWest(policy:'consolidation'|'reform'='consolidation'){
 const w=newCampaignWorld('xiao-yan',undefined,'sandbox'),s=w.realm!,actor=governingAuthority(w,'west')!;
 courtOf(w,'west')!.policy=policy;s.treasuries.west.coins=100000;s.treasuries.west.grain=10000;s.personalInfluence![actor]=500;
 const target=strategicTargets(w,'west')[0];
 for(const id of ['li-bi','dugu-xin','yuwen-hu']){const a=army(w,'west','changan');w.mobility!.armyCommanders??={};w.mobility!.armyCommanders[a.id!]=id;w.mobility!.residences[id]={site:'changan',journey:null};}
 s.strategy={west:{phase:'prepare',target:target.id,goal:'territory',since:0,reviewed:0,reason:'边境敌对关系'}};w.day=nextMonthStart(0);
 return {w,s,actor,target};
}
describe('strategic choice and finite war',()=>{
 it('Liang considers weak hostile borders without a forced war or hostility boost',()=>{const w=start(),before=diplomaticPair(w,'liang','east')!.opinion;expect(strategicTargets(w,'liang').length).toBeGreaterThan(0);expect(diplomaticPair(w,'liang','east')!.opinion).toBe(before);expect(activeWars(w)).toHaveLength(0);});
 it('Liang can actually declare after funded preparation through the shared rules',()=>{const w=start(),s=w.realm!,target=strategicTargets(w,'liang')[0],actor=governingAuthority(w,'liang')!;s.armies=[];s.treasuries.liang.coins=100000;s.treasuries.liang.grain=10000;s.personalInfluence![actor]=500;w.mobility!.armyCommanders={};for(const id of ['xiao-yi','xiao-gang']){const a=army(w,'liang','jiankang');w.mobility!.armyCommanders[a.id!]=id;}s.strategy={liang:{phase:'prepare',target:target.id,since:0,reviewed:0,reason:'边境机会'}};w.day=nextMonthStart(0);advanceRealmStrategy(w);expect(activeWars(w).some(v=>v.attacker==='liang'&&v.target===target.id)).toBe(true);expect(s.personalInfluence![actor]).toBe(460);});
 it('friendly relations do not receive opportunistic expansion motives',()=>{const w=start();diplomaticPair(w,'liang','east')!.opinion=30;diplomaticPair(w,'liang','west')!.opinion=30;expect(strategicTargets(w,'liang')).toHaveLength(0);});
 it('uses actual defense and approach instead of alphabetical target priority',()=>{const w=start(),before=strategicTargets(w,'west');expect(before.length).toBeGreaterThan(1);army(w,'east',before[0].id,6000);expect(strategicTargets(w,'west')[0].id).not.toBe(before[0].id);});
 it('funded evenly matched armies do not white-peace just because six months passed',()=>{const w=warWorld();expect(warWillToContinue(w,w.realm!.war!,'east').total).toBeGreaterThan(0);advanceRealmStrategy(w);expect(activeWars(w)).toHaveLength(1);});
 it('recent victory and effective siege affect willingness but stale or starved operations do not',()=>{const w=warWorld(),war=w.realm!.war!,base=warWillToContinue(w,war,'east').total;w.realm!.armies[0].location='changan';w.realm!.sieges=[{war:war.id!,side:'attack',site:'changan',progress:60,blockade:100,last:w.day,started:w.day-20}];expect(warWillToContinue(w,war,'east').total).toBe(base+12);w.realm!.sieges[0].started=w.day-121;expect(warWillToContinue(w,war,'east').total).toBe(base);w.realm!.sieges[0].started=w.day-20;w.realm!.armies[0].supply=0;expect(warWillToContinue(w,war,'east').parts.find(p=>p.label==='有效围城推进')!.value).toBe(0);});
 it('a recent real victory gives temporary momentum',()=>{const w=warWorld(),war=w.realm!.war!,base=warWillToContinue(w,war,'east').total;const b={war:war.id,key:'test',day:w.day-5,last:w.day,ended:w.day,winner:'attack' as const,round:3,stage:'pursuit' as const,a:w.realm!.armies[0].id!,b:w.realm!.armies[1].id!,lossA:10,lossB:100};ensureAftermath(w).battles.push(b);expect(warWillToContinue(w,war,'east').total).toBe(base+8);b.ended=w.day-31;expect(warWillToContinue(w,war,'east').total).toBe(base);});
 it('long stalemate can end and poverty does not force perpetual warfare',()=>{const w=warWorld();w.day=nextMonthStart(450);advanceRealmStrategy(w);expect(activeWars(w)).toHaveLength(0);const poor=warWorld();poor.realm!.treasuries.east.coins=poor.realm!.treasuries.west.coins=0;advanceRealmStrategy(poor);expect(activeWars(poor)).toHaveLength(0);});
 it('a repelled invasion can end even when the defender still has strong armies',()=>{const w=warWorld();w.realm!.armies=w.realm!.armies.filter(a=>a.realm!=='east');w.day=nextMonthStart(450);expect(warWillToContinue(w,w.realm!.war!,'west').total).toBeGreaterThan(5);advanceRealmStrategy(w);expect(activeWars(w)).toHaveLength(0);expect(w.realm!.cities.changan.owner).toBe('west');});
 it('prewar recruitment plans field strength after reserving a garrison',()=>{const w=start(),s=w.realm!;s.armies=[];army(w,'east','ye');army(w,'east','luoyang');army(w,'west','changan',1000);s.treasuries.east.coins=10000;s.treasuries.east.grain=10000;s.personalInfluence![governingAuthority(w,'east')!]=500;w.day=nextMonthStart(0);advanceRealmStrategy(w);expect(s.armies.filter(a=>a.realm==='east')).toHaveLength(3);expect(s.armies.filter(a=>a.realm==='east').some(a=>a.trainingUntil===w.day+30)).toBe(true);});
 it.each(['consolidation','reform'] as const)('stable %s NPC declares a funded hostile border war once, including after loading',policy=>{
  const {w,actor,target}=preparedWest(policy),loaded=parseWorld(serializeWorld(w));
  expect(declareRealmWarReason(loaded,actor,'west',target.id)).toBe('');advanceRealmStrategy(loaded);
  expect(activeWars(loaded).filter(v=>v.attacker==='west')).toHaveLength(1);expect(loaded.realm!.personalInfluence![actor]).toBe(460);expect(courtOf(loaded,'west')!.policy).toBe(policy);
  const saved=serializeWorld(loaded);advanceRealmStrategy(loaded);expect(serializeWorld(loaded)).toBe(saved);expect(activeWars(parseWorld(saved))).toHaveLength(1);
 });
 it.each(['strained','chaos'] as const)('%s court still suspends preparation despite funded and ready troops',phase=>{
  const {w,s,actor}=preparedWest();courtOf(w,'west')!.phase=phase;courtOf(w,'west')!.policy='expansion';const coins=s.treasuries.west.coins;
  advanceRealmStrategy(w);expect(activeWars(w)).toHaveLength(0);expect(s.strategy!.west?.phase).toBe('recover');expect(s.armies.filter(a=>a.realm==='west')).toHaveLength(3);expect(s.treasuries.west.coins).toBe(coins);expect(s.personalInfluence![actor]).toBe(500);
 });
 it.each(['budget','support','arrears'] as const)('stable non-expansion court still respects the %s barrier',barrier=>{
  const {w,s,actor}=preparedWest('reform');if(barrier==='budget')s.treasuries.west.coins=0;else if(barrier==='support')s.governments!.realms.west.support=34;else s.armies.find(a=>a.realm==='west')!.arrears=1;const coins=s.treasuries.west.coins;
  advanceRealmStrategy(w);expect(activeWars(w)).toHaveLength(0);expect(s.strategy!.west?.reason).toContain('两月出征预算');expect(s.treasuries.west.coins).toBe(coins);expect(s.personalInfluence![actor]).toBe(500);
 });
 it.each(['truce','subject','influence'] as const)('non-expansion preparation cannot bypass the %s declaration rule',barrier=>{
  const {w,s,actor,target}=preparedWest();if(barrier==='truce')s.truces[['west',target.enemy].sort().join('|')]=w.day+100;else if(barrier==='subject')w.diplomacy!.subjects.west='east';else s.personalInfluence![actor]=39;
  const coins=s.treasuries.west.coins,influence=s.personalInfluence![actor];expect(declareRealmWarReason(w,actor,'west',target.id)).not.toBe('');advanceRealmStrategy(w);
  expect(activeWars(w)).toHaveLength(0);expect(s.treasuries.west.coins).toBe(coins);expect(s.personalInfluence![actor]).toBe(influence);
 });
 it.each(['training','commander','supply'] as const)('non-expansion court waits for army %s readiness before declaring',barrier=>{
  const {w,s,actor}=preparedWest('reform');for(const a of s.armies.filter(a=>a.realm==='west')){if(barrier==='training'){a.trainingStarted=w.day;a.trainingUntil=w.day+30;}else if(barrier==='supply')a.supply=0;}if(barrier==='commander')w.mobility!.armyCommanders={};
  const coins=s.treasuries.west.coins;advanceRealmStrategy(w);expect(activeWars(w)).toHaveLength(0);expect(s.strategy!.west?.phase).toBe('prepare');expect(s.treasuries.west.coins).toBe(coins);expect(s.personalInfluence![actor]).toBe(500);
 });
 it.each([0,30])('stable non-expansion court leaves neutral or friendly borders peaceful at opinion %s',opinion=>{
  const {w,s}=preparedWest();for(const enemy of ['east','liang'] as const)diplomaticPair(w,'west',enemy)!.opinion=opinion;
  expect(strategicTargets(w,'west')).toHaveLength(0);advanceRealmStrategy(w);expect(activeWars(w)).toHaveLength(0);expect(s.strategy!.west).toMatchObject({phase:'rest',target:null});
 });
 it('keeps the player executive in control of declaring war',()=>{
  const w=newCampaignWorld('yuwen-tai',undefined,'sandbox'),s=w.realm!;s.treasuries.west.coins=100000;s.influence=500;courtOf(w,'west')!.policy='expansion';w.day=nextMonthStart(0);
  expect(strategicTargets(w,'west').length).toBeGreaterThan(0);advanceRealmStrategy(w);expect(activeWars(w).some(v=>v.attacker==='west')).toBe(false);expect(s.armies.some(a=>a.realm==='west')).toBe(false);expect(s.influence).toBe(500);expect(s.strategy?.west).toBeUndefined();
 });
});
