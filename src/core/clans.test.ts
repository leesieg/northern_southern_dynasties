import {describe,it,expect} from 'vitest';
import {newCampaignWorld,act} from './world';
import {realmClans,clanHead,clanStanding,marriageClanBonus} from './clans';
import {familyPrestige,marriagePrestigePreview} from './family';
import {relationshipQuote,relationshipScore,changeRelationOpinion} from './relationships';
import {pair,acceptance} from './social';
import {meritAccess,governmentOf,appointmentReason,governingAuthority} from './government';
import {realmReason} from './realm';
import {parseWorld,serializeWorld} from './save';
import {pauseSnapshot,pauseEvents} from './pauseEvents';
import {lifeOf} from './lifeState';
import {courtOf,courtReason} from './court';
const start=(id='yuan-qin')=>newCampaignWorld(id,undefined,'sandbox');
describe('本国世族评定与行动收益',()=>{
 it('族长取全族在世成年长者，死亡后递补，跨国同族不另立族长',()=>{
  const w=start();expect(clanHead(w,'xiao')?.id).toBe('xiao-yan');w.families!.prestige['xiao-gang']=999;expect(clanHead(w,'xiao')?.id).toBe('xiao-yan');
  lifeOf(w,'xiao-yan')!.death={day:0,cause:'age'};expect(clanHead(w,'xiao')?.id).toBe('xiao-gang');
  const east=realmClans(w,'east').find(r=>r.family.id==='yuan')!,west=realmClans(w,'west').find(r=>r.family.id==='yuan')!;expect(clanHead(w,east.family.id)?.id).toBe('yuan-baoju');expect(clanHead(w,west.family.id)?.id).toBe('yuan-baoju');expect(clanHead(w,'missing')).toBeUndefined();
 });
 it('零威望不产生世族；按同国在世成员入榜，跨国同族共享累计贡献',()=>{
  const w=start();expect(realmClans(w,'west').filter(r=>r.elite)).toEqual([]);expect(realmClans(w,'west').some(r=>r.family.id==='gao'||r.family.id==='cui-qinghe')).toBe(false);
  w.families!.prestige['yuan-shanjian']=120;expect(clanStanding(w,'yuan-qin')?.elite).toBe(true);expect(clanStanding(w,'yuan-shanjian')?.prestige).toBe(120);expect(clanStanding(w,'yuan-qin')?.prestige).toBe(120);
  expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('同分同名次，贡献保留、名次变动实时改变加成并通知',()=>{
  const w=start();w.families!.prestige['yuan-qin']=100;w.families!.prestige['yuwen-tai']=100;expect(clanStanding(w,'yuan-qin')?.rank).toBe(1);expect(clanStanding(w,'yuwen-tai')?.rank).toBe(1);
  const before=pauseSnapshot(w);w.families!.prestige['yuwen-tai']=101;expect(clanStanding(w,'yuan-qin')?.rank).toBe(2);expect(clanStanding(w,'yuan-qin')?.petition).toBe(8);expect(pauseEvents(before,w).some(e=>e.kind==='clan')).toBe(true);
  lifeOf(w,'yuwen-tai')!.death={day:0,cause:'age'};expect(familyPrestige(w,'yuwen')).toBe(101);expect(realmClans(w,'west').find(r=>r.family.id==='yuwen')?.members.some(p=>p.id==='yuwen-tai')).toBe(false);expect(realmClans(w,'west').some(r=>r.family.id==='yuwen')).toBe(true);
 });
 it('门第降低文官功绩门槛，不降低军务功绩门槛',()=>{
  const w=start();governmentOf(w)!.type='meritocratic';governmentOf(w)!.merit['yuan-qin']=14;
  expect(meritAccess(w,'office')).toBe(false);expect(appointmentReason(w,'yuan-qin','changan')).not.toBe('');w.families!.prestige['yuan-qin']=100;
  expect(meritAccess(w,'office')).toBe(true);expect(appointmentReason(w,'yuan-qin','changan')).toBe('');expect(meritAccess(w,'military')).toBe(false);
 });
 it('门第与典签荐举真实影响求官接受度，过期荐举不再有效',()=>{
  const w=start();governmentOf(w)!.type='tribal';w.realm!.cities.changan.governor='yuwen-tai';w.holdings.governedCities=w.holdings.governedCities.filter(id=>id!=='changan');w.realm!.influence=100;const target=governingAuthority(w,'west'),key=pair(w.characterId!,target);
  w.social!.opinions[key]=0;const base=acceptance(w,target).reduce((n,p)=>n+p.value,0);w.social!.opinions[key]=50-base;
  expect(realmReason(w,{type:'realm',action:'petition',site:'changan'})).not.toBe('');w.families!.prestige['yuan-qin']=100;expect(realmReason(w,{type:'realm',action:'petition',site:'changan'})).toBe('');
  w.families!.prestige['yuan-qin']=0;w.retinue!.recommendations['yuan-qin']={until:90,bonus:10};expect(realmReason(w,{type:'realm',action:'petition',site:'changan'})).toBe('');w.day=90;expect(realmReason(w,{type:'realm',action:'petition',site:'changan'})).not.toBe('');
 });
 it('门第实际改变联姻接受度，首次婚姻记账，重婚和重复授勋无效',()=>{
  const w=start('xiao-yan'),target='guest-liang';w.people[0].coins=1000;w.social!.renown=100;
  // Tune the existing relationship to just below the marriage threshold.
  const base=relationshipScore(w,target).reduce((n,p)=>n+p.value,0);changeRelationOpinion(w,w.characterId!,target,67-base);
  expect(relationshipQuote(w,{type:'relationship',action:'marry',target}).reason).toContain('70');w.families!.prestige['xiao-yan']=100;
  expect(marriageClanBonus(w,'xiao-yan',target)).toBe(6);expect(relationshipQuote(w,{type:'relationship',action:'marry',target}).reason).toBe('');
  expect(marriagePrestigePreview(w,'xiao-yan',target)[0].amount).toBe(15);act(w,{type:'relationship',action:'marry',target});expect(w.families!.prestige['xiao-yan']).toBe(115);expect(w.families!.ledger.at(-1)?.reason).toBe('marriage');
  expect(marriagePrestigePreview(w,'xiao-yan',target).every(g=>g.amount===0)).toBe(true);const copy=structuredClone(w);expect(()=>act(w,{type:'relationship',action:'marry',target})).toThrow();expect(w).toEqual(copy);expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('世族无法绕过未成年、近亲或已婚限制',()=>{
  const w=start('yuan-qin');w.families!.prestige['yuan-qin']=1000;expect(relationshipQuote(w,{type:'relationship',action:'marry',target:'yuan-kuo'}).reason).not.toBe('');
  const married=start('gao-huan');married.families!.prestige['gao-huan']=1000;expect(relationshipQuote(married,{type:'relationship',action:'marry',target:'guest-east'}).reason).not.toBe('');
 });
 it('中央请任接受度含门第，仍保留四十功绩的资格线',()=>{
  const w=start(),court=courtOf(w,'west')!,g=governmentOf(w)!,target=governingAuthority(w,'west');for(const key of Object.keys(court.ministries))court.ministries[key as keyof typeof court.ministries]=null;
  const ministry=Object.keys(court.ministries)[0] as keyof typeof court.ministries,command={type:'court' as const,action:'seek-office' as const,ministry};
  g.merit['yuan-qin']=40;w.realm!.influence=100;const base=acceptance(w,target).reduce((n,p)=>n+p.value,0);changeRelationOpinion(w,'yuan-qin',target,50-base);
  expect(courtReason(w,command)).not.toBe('');w.families!.prestige['yuan-qin']=100;expect(courtReason(w,command)).toBe('');g.merit['yuan-qin']=39;expect(courtReason(w,command)).toContain('40');g.merit['yuan-qin']=40;act(w,command);expect(court.ministries[ministry]).toBe('yuan-qin');expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
});
