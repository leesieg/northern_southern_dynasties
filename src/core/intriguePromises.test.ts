import {describe,it,expect} from 'vitest';
import {newCampaignWorld} from './world';
import {actIntrigue,advanceIntrigue,intrigueQuote,visibleSchemes,validIntrigue,type IntrigueStart} from './intrigue';
import {applyPowerArrangement,type PowerArrangement} from './powerPolitics';
import {governmentOf} from './government';
import {nobleTitle,actNobility} from './nobility';
import {personInfluence} from './personalInfluence';
import {rulerEligibility} from './claims';
import {allPeople} from './personRegistry';
import {isAlive,ageAt} from './lifeState';
import {actCourt,courtPolicyActive} from './court';
import {relationOpinion} from './relationships';
import {serializeWorld,parseWorld} from './save';
import type {World} from './types';
const arrangement:PowerArrangement={goal:'ruler',sponsor:'xiao-gang',beneficiary:'xiao-gang',executive:'xiao-gang',name:''};
function world(viewer='xiao-gang'){
 const w=newCampaignWorld(viewer,undefined,'sandbox');w.people[0].coins=2000;w.people[0].location='jiankang';w.realm!.influence=200;for(const id of ['xiao-gang','xiao-yi','xiao-yan']){w.mobility!.residences[id]={site:'jiankang',journey:null};w.relationships!.reserves[id]=2000;w.realm!.personalInfluence![id]=200;governmentOf(w,'liang')!.merit[id]=100;}w.realm!.treasuries.liang.coins=2000;return w;
}
function command(promise:'title'|'policy'='title'):IntrigueStart{return {type:'intrigue',action:'start',kind:'recruit',target:'xiao-yi',realm:'liang',beneficiary:arrangement.beneficiary,executive:arrangement.executive,powerGoal:arrangement.goal,promise,...(promise==='title'?{nobleRank:'countyMarquis',nobleName:'襄',nobleRites:false}:{courtPolicy:'reform'})};}
function pledged(w:World,promise:'title'|'policy'='title'){actIntrigue(w,command(promise),'xiao-gang');const s=w.intrigue!.schemes.at(-1)!;s.successRoll=0;w.day=s.due;advanceIntrigue(w);expect(s.status).toBe('succeeded');return w.intrigue!.supports.find(p=>p.scheme===s.id)!;}
describe('密约晋爵与国策真实承诺',()=>{
 it('预览使用真实册封门槛和未来付款方，筹划不消耗未来君主资源或伪造封爵',()=>{
  const w=world('gao-huan'),q=intrigueQuote(w,command(),'xiao-gang'),budget=w.realm!.treasuries.liang.coins,player=w.people[0].coins,influence=personInfluence(w,'xiao-gang');expect(q.reason).toBe('');expect(q.futureCost).toMatchObject({centralCoins:60,influence:20,payer:'xiao-gang'});actIntrigue(w,command(),'xiao-gang');expect(w.realm!.treasuries.liang.coins).toBe(budget);expect(personInfluence(w,'xiao-gang')).toBe(influence);expect(w.people[0].coins).toBe(player);expect(nobleTitle(w,'xiao-yi')).toBeUndefined();expect(validIntrigue(w)).toBe(true);
 });
 it('功绩、影响力、晋爵、封号和拟任君主承统来源都不能由文案绕过',()=>{
  const weak=world();weak.realm!.personalInfluence!['xiao-yi']=0;expect(intrigueQuote(weak,command()).reason).toContain('须本人');const lowMerit=world();governmentOf(lowMerit,'liang')!.merit['xiao-yi']=0;expect(intrigueQuote(lowMerit,command()).reason).toContain('须本人');expect(intrigueQuote(world(),{...command(),nobleName:'fake'}).reason).toContain('封号');const existing=world();actNobility(existing,{type:'nobility',action:'grant',person:'xiao-yi',rank:'countyMarquis',name:'襄'},'xiao-yan');expect(intrigueQuote(existing,command()).reason).toContain('晋爵');const unrelated=world(),candidate=allPeople(unrelated).find(p=>p.realm==='liang'&&isAlive(unrelated,p.id)&&(ageAt(unrelated,p.id)??0)>=16&&rulerEligibility(unrelated,'liang',p.id))!;expect(candidate).toBeDefined();expect(intrigueQuote(unrelated,{...command(),beneficiary:candidate.id}).reason).toContain('未来册封君主');
 });
 it('玩家成为新君主后只生成待履行承诺，须手动真实册封才记为兑现',()=>{
  const w=world(),p=pledged(w),before=w.realm!.treasuries.liang.coins,privateCoins=w.people[0].coins;expect(p.status).toBe('pledged');applyPowerArrangement(w,'liang',arrangement);expect(p.status).toBe('awaiting');advanceIntrigue(w);expect(nobleTitle(w,'xiao-yi')).toBeUndefined();expect(w.realm!.treasuries.liang.coins).toBe(before);expect(w.people[0].coins).toBe(privateCoins);expect(visibleSchemes(w).find(s=>s.id===p.scheme)?.supportStatus).toBe('awaiting');actNobility(w,{type:'nobility',action:'grant',person:'xiao-yi',rank:'countyMarquis',name:'襄'});advanceIntrigue(w);expect(p.status).toBe('honored');expect(w.realm!.treasuries.liang.coins).toBe(before-60);expect(nobleTitle(w,'xiao-yi')?.grantor).toBe('xiao-gang');expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('NPC 新君主沿真实册封规则支付中央礼仪与本人影响力，保存和同日推进不重发',()=>{
  const w=world('gao-huan'),p=pledged(w),central=w.realm!.treasuries.liang.coins,player=w.people[0].coins,playerInfluence=w.realm!.influence,npcInfluence=personInfluence(w,'xiao-gang');applyPowerArrangement(w,'liang',arrangement);advanceIntrigue(w);expect(p.status).toBe('honored');expect(w.realm!.treasuries.liang.coins).toBe(central-60);expect(personInfluence(w,'xiao-gang')).toBe(npcInfluence-20);expect(w.people[0].coins).toBe(player);expect(w.realm!.influence).toBe(playerInfluence);expect(w.nobility!.titles.filter(t=>t.person==='xiao-yi')).toHaveLength(1);const copy=structuredClone(w);advanceIntrigue(w);expect(w).toEqual(copy);const loaded=parseWorld(serializeWorld(w));advanceIntrigue(loaded);expect(loaded).toEqual(w);
 });
 it('真实资源在交接后不足时保持待办，期限届满只结算一次失信',()=>{
  const w=world('gao-huan'),p=pledged(w);applyPowerArrangement(w,'liang',arrangement);w.realm!.treasuries.liang.coins=0;advanceIntrigue(w);expect(p.status).toBe('awaiting');expect(nobleTitle(w,'xiao-yi')).toBeUndefined();const before=relationOpinion(w,'xiao-gang','xiao-yi');w.day=p.fulfillmentDue!;advanceIntrigue(w);expect(p.status).toBe('broken');expect(relationOpinion(w,'xiao-gang','xiao-yi')).toBeLessThan(before);const after=relationOpinion(w,'xiao-gang','xiao-yi');advanceIntrigue(w);expect(relationOpinion(w,'xiao-gang','xiao-yi')).toBe(after);expect(nobleTitle(w,'xiao-yi')).toBeUndefined();
 });
 it('国策须为真实方略，玩家交接后不会自动选政策或扣影响力',()=>{
  const w=world();expect(intrigueQuote(w,{...command('policy'),courtPolicy:'fake' as never}).reason).toContain('真实安定方略');const p=pledged(w,'policy');applyPowerArrangement(w,'liang',arrangement);const influence=personInfluence(w,'xiao-gang');advanceIntrigue(w);expect(p.status).toBe('awaiting');expect(courtPolicyActive(w,'liang')).toBe('consolidation');expect(personInfluence(w,'xiao-gang')).toBe(influence);actCourt(w,{type:'court',action:'policy',policy:'reform'});advanceIntrigue(w);expect(p.status).toBe('honored');expect(courtPolicyActive(w,'liang')).toBe('reform');expect(personInfluence(w,'xiao-gang')).toBe(influence-20);
 });
 it('NPC 国策依真实朝局与本人影响力；混乱时等待，不冒充安定加成',()=>{
  const w=world('gao-huan'),p=pledged(w,'policy');applyPowerArrangement(w,'liang',arrangement);governmentOf(w,'liang')!.court!.phase='chaos';const influence=personInfluence(w,'xiao-gang'),player=w.realm!.influence,otherPolicy=courtPolicyActive(w,'east');advanceIntrigue(w);expect(p.status).toBe('awaiting');expect(courtPolicyActive(w,'liang')).toBeNull();expect(personInfluence(w,'xiao-gang')).toBe(influence);governmentOf(w,'liang')!.court!.phase='stable';w.day++;advanceIntrigue(w);expect(p.status).toBe('honored');expect(courtPolicyActive(w,'liang')).toBe('reform');expect(personInfluence(w,'xiao-gang')).toBe(influence-20);expect(w.realm!.influence).toBe(player);expect(courtPolicyActive(w,'east')).toBe(otherPolicy);const snapshot=structuredClone(w);advanceIntrigue(w);expect(w).toEqual(snapshot);
 });
 it('旧承诺无新字段仍有效，存档拒绝伪造条款或未来履约日期',()=>{
  const w=world();pledged(w);applyPowerArrangement(w,'liang',arrangement);expect(validIntrigue(w)).toBe(true);for(const change of [(x:World)=>x.intrigue!.supports[0].nobleName='fake',(x:World)=>x.intrigue!.supports[0].fulfillmentDue=x.day-1,(x:World)=>x.intrigue!.supports[0].lastFulfillmentAttempt=x.day+1]){const bad=structuredClone(w);change(bad);expect(validIntrigue(bad)).toBe(false);}const old=world();actIntrigue(old,{...command(),promise:'gift',nobleRank:undefined,nobleName:undefined,nobleRites:undefined});const s=old.intrigue!.schemes.at(-1)!;s.successRoll=0;old.day=s.due;advanceIntrigue(old);expect(validIntrigue(old)).toBe(true);expect(parseWorld(serializeWorld(old))).toEqual(old);
 });
});
