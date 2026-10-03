import {describe,it,expect} from 'vitest';
import {newCampaignWorld} from '../core/world';
import {attributes} from '../core/social';
import {governmentOf,governmentReason} from '../core/government';
import {courtReason} from '../core/court';
import {officeHierarchy} from '../core/offices';
import {personCandidates,filterPersonCandidates,personFilterPreset,type PersonSort} from './personCandidates';

const world=()=>newCampaignWorld('xiao-yan',undefined,'sandbox');
describe('appointment candidate comparison',()=>{
 it('retains the supplied pool, evaluation and blockers, with available candidates first',()=>{
  const w=world(),options=[{id:'xiao-yi',score:90,metric:'任用评价',detail:'原任用因子',reason:'须先交接原职'},{id:'guest-liang',score:20},{id:'xiao-gang'}];
  const rows=personCandidates(w,options),filters=personFilterPreset('all');
  expect(rows.map(p=>p.id)).toEqual(options.map(p=>p.id));expect(rows[0]).toMatchObject(options[0]);expect(rows[2].score).toBeUndefined();
  expect(filterPersonCandidates(rows,filters,'','recommended').map(p=>p.id)).toEqual(['guest-liang','xiao-gang','xiao-yi']);
  expect(filterPersonCandidates(rows,filters,'','score')[0].id).toBe('xiao-yi');
  expect(filterPersonCandidates(rows,personFilterPreset('available'),'','recommended').some(p=>p.id==='xiao-yi')).toBe(false);
 });
 it('searches actual identity and combines sex, office and age filters without hiding female candidates',()=>{
  const w=world(),rows=personCandidates(w,[{id:'guest-liang'},{id:'xiao-yan'}]),p=rows[0],filters={...personFilterPreset('all'),sex:'female' as const,office:'vacant' as const,minAge:String(p.age),maxAge:String(p.age)};
  expect(filterPersonCandidates(rows,filters,p.name+' '+p.familyName+' '+p.location+' '+p.culture,'name')).toEqual([p]);
  expect(rows[1].hasOffice).toBe(true);expect(rows[1].title).toContain('君主');
  expect(filterPersonCandidates(rows,{...filters,minAge:'90',maxAge:'18'},'','name')).toEqual([]);
 });
 it('compares residence to the action target, respects target allegiance and excludes travelers from same-place filtering',()=>{
  const w=world();w.mobility!.residences['guest-liang']={site:'ye',journey:null};
  const options=[{id:'guest-liang'},{id:'gao-huan'}],rows=personCandidates(w,options,{realm:'east',site:'ye'});
  expect(rows[0].sameSite).toBe(true);expect(rows[0].sameRealm).toBe(false);expect(rows[1].sameRealm).toBe(true);
  expect(filterPersonCandidates(rows,{...personFilterPreset('all'),sameRealm:true},'','name').map(p=>p.id)).toEqual(['gao-huan']);
  expect(filterPersonCandidates(rows,personFilterPreset('local'),'','name')).toContain(rows[0]);
  w.mobility!.residences['guest-liang'].journey={route:['ye','jiankang'],leg:0,elapsed:0,durations:[10],started:w.day};
  expect(personCandidates(w,options,{site:'ye'})[0].sameSite).toBe(false);
  expect(personCandidates(w,options,{site:'jiankang'})[0].sameSite).toBe(false);
 });
 it('uses live capability and actual realm merit rather than the caller score for threshold filters',()=>{
  const w=world();governmentOf(w,'liang')!.merit['xiao-yi']=73;
  const rows=personCandidates(w,[{id:'xiao-yi',score:1},{id:'guest-liang',score:999}]),p=rows[0],filters={...personFilterPreset('all'),minMerit:'73',ability:'stewardship' as const,minAbility:String(attributes(w,p.id).stewardship)};
  expect(p.merit).toBe(73);expect(filterPersonCandidates(rows,filters,'','score')).toEqual([p]);
  expect(filterPersonCandidates(rows,{...filters,minAbility:String(p.stats.stewardship+1)},'','score')).toEqual([]);
 });
 it('keeps qualified child heirs visible and leaves adult executive restrictions to the real action',()=>{
  const w=world(),child='xiao-fangzhi',command={type:'government',action:'nominate',office:'ruler',candidate:child} as const;
  const rows=personCandidates(w,[{id:child,reason:governmentReason(w,command)}]);
  expect(rows[0].age).toBeLessThan(16);expect(filterPersonCandidates(rows,personFilterPreset('available'),'','recommended')).toHaveLength(1);
  const executive=personCandidates(w,[{id:child,reason:governmentReason(w,{...command,office:'executive'})}]);
  expect(executive[0].reason).toContain('成年');expect(filterPersonCandidates(executive,personFilterPreset('available'),'','recommended')).toEqual([]);
 });
 it('sorts chosen values independently of blockers, puts missing values last and preserves input order',()=>{
  const w=world(),base=personCandidates(w,[{id:'guest-liang'}])[0],low={...base,id:'low',name:'甲',score:1,prestige:1,influence:1,merit:1,age:18,stats:{diplomacy:1,martial:1,stewardship:1,intrigue:1}},high={...base,id:'high',name:'乙',reason:'异地',score:99,prestige:99,influence:99,merit:99,age:80,stats:{diplomacy:20,martial:20,stewardship:20,intrigue:20}},unknown={...base,id:'unknown',name:'未详',age:null,merit:null,score:undefined},rows=[unknown,low,high],filters=personFilterPreset('all');
  for(const sort of ['score','merit','prestige','influence','diplomacy','martial','stewardship','intrigue','ageDesc'] as PersonSort[])expect(filterPersonCandidates([low,high],filters,'',sort)[0]).toBe(high);
  for(const sort of ['score','merit','ageAsc','ageDesc'] as PersonSort[])expect(filterPersonCandidates(rows,filters,'',sort).at(-1)).toBe(unknown);
  expect(filterPersonCandidates(rows,{...filters,minAge:'18'},'','name')).not.toContain(unknown);expect(rows).toEqual([unknown,low,high]);
 });
 it('uses current active offices and refreshes an actual appointment blocker after authority changes',()=>{
  const w=world(),id='xiao-yi',command={type:'court',action:'appoint',ministry:'finance',candidate:id} as const;
  const options=()=>[{id,reason:courtReason(w,command)}];
  expect(personCandidates(w,options())[0].reason).toBe('');
  governmentOf(w,'liang')!.executives=['xiao-gang'];governmentOf(w,'liang')!.ruler='xiao-gang';
  expect(personCandidates(w,options())[0].reason).toBeTruthy();
  const active=officeHierarchy(w).filter(o=>o.active&&o.holder===id).map(o=>o.name),row=personCandidates(w,[{id}])[0];
  for(const name of active)expect(row.title).toContain(name);
 });
 it('does not mutate world state while projecting, reading capabilities, searching or sorting',()=>{
  const w=world(),before=structuredClone(w),rows=personCandidates(w,[{id:'xiao-yi'},{id:'guest-liang'},{id:'gao-huan'}]);
  for(const p of rows){void p.stats;void p.merit;}
  filterPersonCandidates(rows,personFilterPreset('all'),'','stewardship');expect(w).toEqual(before);
 });
});
