import {describe,it,expect} from 'vitest';
import {expandedPeople} from './expandedPeople';
import {familyPersonById,parentLinks,relatives} from './families';
import {birthRecords} from './lifespans';
import {CONTENT_VERSION} from './scenario';
import {newCampaignWorld} from '../core/world';
import {allPeople,getCharacter,getPerson} from '../core/personRegistry';
import {ageLabel,ageOf,isAlive,isDeceased} from '../core/lifeState';
import {upgradeContent} from '../core/contentMigration';
import {parseWorld,serializeWorld,validateWorld} from '../core/save';

const elder='xiao-yi-elder',son='xiao-yuanming';
function legacy(){
 const w=newCampaignWorld('xiao-yan',undefined,'sandbox');w.contentVersion='546-map-0.6';
 delete w.life!.people[elder];
 for(const records of [w.life!.people,w.relationships!.reserves,w.relationships!.maritalBasis,w.mobility!.residences,w.families!.prestige,w.realm!.personalInfluence!])delete records[son];
 for(const g of Object.values(w.realm!.governments!.realms))delete g.court!.members[son];
 return w;
}
describe('historical Xiao kinsmen and integer ages',()=>{
 it('distinguishes Xiao Yi the elder from Xiao Yi of Jingzhou and connects researched kinship',()=>{
  const w=newCampaignWorld('xiao-yan',undefined,'sandbox');
  expect(familyPersonById[elder].name).toBe('萧懿');expect(getPerson(w,'xiao-yi')!.name).toBe('萧绎');
  expect(expandedPeople.filter(p=>p.id===son)).toHaveLength(1);expect(getPerson(w,son)!.name).toBe('萧渊明');
  expect(parentLinks).toEqual(expect.arrayContaining([expect.objectContaining({parent:'xiao-shunzhi',child:elder}),expect.objectContaining({parent:elder,child:son})]));
  expect(relatives(son,'ancestors').map(p=>p.id)).toEqual(expect.arrayContaining([elder,'xiao-shunzhi','xiao-daoci']));
  expect(relatives(son,'ancestors').map(p=>p.id)).not.toContain('xiao-yan');
  expect(isDeceased(w,elder)).toBe(true);expect(isAlive(w,elder)).toBe(false);expect(w.life!.people[elder].health).toBe(0);
  expect(allPeople(w).some(p=>p.id===elder)).toBe(false);expect(allPeople(w).some(p=>p.id===son)).toBe(true);
  expect(Object.values(w.realm!.governments!.realms).some(g=>g.ruler===son||g.executives.includes(son))).toBe(false);
  expect(w.realm!.armies.some(a=>a.owner===son)).toBe(false);validateWorld(w);
 });
 it('uses explicit numerical ages for estimates and freezes the deceased age',()=>{
  const w=newCampaignWorld('xiao-yan',undefined,'sandbox');expect(ageLabel(w,elder)).toBe('50 岁');expect(ageLabel(w,son)).toBe('56 岁');
  for(const id of Object.keys(birthRecords))expect(ageLabel(w,id)).not.toContain('约');
  w.day=3660;expect(ageOf(w,elder)).toBe(50);expect(ageOf(w,son)).toBe(66);
 });
 it('allows the living kinsman to start and roundtrip under the common person rules',()=>{
  const w=newCampaignWorld(son,undefined,'sandbox');expect(w.characterId).toBe(son);expect(getCharacter(w,son)!.role).toBe('prince');
  expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('upgrades the previous roster without changing existing accounts, identities, resources or records, exactly once',()=>{
  const w=legacy();w.people[0].coins=173;w.realm!.cities.jiankang.population=7100;const before=structuredClone(w);
  upgradeContent(w);expect(w.contentVersion).toBe(CONTENT_VERSION);validateWorld(w);
  expect(w.people).toEqual(before.people);expect(w.realm!.cities).toEqual(before.realm!.cities);expect(w.realm!.treasuries).toEqual(before.realm!.treasuries);expect(w.identities).toEqual(before.identities);
  expect(w.relationships!.reserves[son]).toBe(0);expect(w.realm!.personalInfluence![son]).toBe(0);expect(w.families!.prestige[son]).toBe(0);expect(w.mobility!.residences[son]).toEqual({site:'jiankang',journey:null});expect(w.life!.people[elder].health).toBe(0);
  for(const [id,life] of Object.entries(before.life!.people))expect(w.life!.people[id]).toEqual(life);
  const once=structuredClone(w);upgradeContent(w);expect(w).toEqual(once);expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('does not repair a corrupt existing person or a missing record in a current-version save',()=>{
  const old=legacy();delete old.life!.people['xiao-yan'];upgradeContent(old);expect(()=>validateWorld(old)).toThrow();
  const current=newCampaignWorld('xiao-yan',undefined,'sandbox');delete current.life!.people[son];upgradeContent(current);expect(()=>validateWorld(current)).toThrow();
 });
});
