import {describe,it,expect} from 'vitest';
import {newCampaignWorld} from '../core/world';
import {actFamilyMarriage,quoteFamilyMarriage,type FamilyMarriageCommand} from '../core/familyMarriage';
import {changeRelationOpinion} from '../core/relationships';
import {getPerson} from '../core/personRegistry';
import {marriageCandidates,filterMarriageCandidates,marriageFilterPreset,type MarriageSort} from './marriageCandidates';

function prepared(subject='xiao-yan'){
 const w=newCampaignWorld(subject,undefined,'sandbox'),target=subject==='guest-liang'?'xiao-yan':'guest-liang';
 changeRelationOpinion(w,subject,target,100);changeRelationOpinion(w,target,subject,100);
 const command:FamilyMarriageCommand={type:'familyMarriage',subject,target:'',coins:100,residence:w.people[0].location,family:getPerson(w,subject)!.family};
 return {w,command,target};
}
describe('marriage candidate presentation and search',()=>{
 it('defaults to living adult unmarried opposite-sex candidates and includes widowed singles',()=>{
  const {w,command}=prepared();w.relationships!.maritalBasis['guest-east']='widowed';w.life!.people['guest-west'].death={day:w.day,cause:'illness'};
  const rows=marriageCandidates(w,command),visible=filterMarriageCandidates(rows,'male',marriageFilterPreset('unmarried'),'','recommended');
  expect(visible.some(p=>p.id==='guest-liang')).toBe(true);expect(visible.find(p=>p.id==='guest-east')?.marital).toBe('widowed');
  expect(visible.every(p=>p.alive&&p.sex==='female'&&p.marital!=='married'&&(p.age??0)>=18)).toBe(true);
  expect(visible.some(p=>['lou-zhaojun','wang-lingbin','guest-west',command.subject].includes(p.id))).toBe(false);
 });
 it('uses the subject sex rather than the player being assumed male and excludes actual minors',()=>{
  const {w,command}=prepared('guest-liang'),visible=filterMarriageCandidates(marriageCandidates(w,command),'female',marriageFilterPreset('unmarried'),'','recommended');
  expect(visible.some(p=>p.id==='xiao-yan')).toBe(true);expect(visible.some(p=>p.id==='yuwen-jue')).toBe(false);expect(visible.every(p=>p.sex==='male')).toBe(true);
 });
 it('keeps an unavailable distant candidate discoverable while ready and same-city filters use actual rules',()=>{
  const {w,command,target}=prepared();w.mobility!.residences[target]={site:'ye',journey:null};
  const rows=marriageCandidates(w,command),p=rows.find(p=>p.id===target)!;expect(p.quote.reason).toContain('同城');expect(p.sameCity).toBe(false);
  expect(filterMarriageCandidates(rows,'male',marriageFilterPreset('unmarried'),'','recommended')).toContain(p);
  expect(filterMarriageCandidates(rows,'male',marriageFilterPreset('ready'),'','recommended')).not.toContain(p);
  w.mobility!.residences[target]={site:command.residence,journey:null};const updated=marriageCandidates(w,command);
  expect(filterMarriageCandidates(updated,'male',marriageFilterPreset('ready'),'','recommended').some(p=>p.id===target)).toBe(true);
 });
 it('searches multiple identity keywords, combines range filters and preserves the input order',()=>{
  const {w,command,target}=prepared(),rows=marriageCandidates(w,command),before=rows.map(p=>p.id),p=rows.find(p=>p.id===target)!;
  const f={...marriageFilterPreset('unmarried'),sameRealm:true,minAge:String(p.age),maxAge:String(p.age)};
  expect(filterMarriageCandidates(rows,'male',f,p.name+' '+p.familyName+' '+p.location,'name').map(p=>p.id)).toContain(target);
  expect(filterMarriageCandidates(rows,'male',{...f,minAge:'80',maxAge:'18'},'','name')).toEqual([]);expect(rows.map(p=>p.id)).toEqual(before);
 });
 it('uses counterpart acceptance for the player and both required sides for an adult child',()=>{
  const {w,command,target}=prepared();changeRelationOpinion(w,target,command.subject,-200);
  const self=marriageCandidates(w,command).find(p=>p.id===target)!;expect(self.quote.left.score).toBeLessThan(self.quote.right.score);expect(self.score).toBe(self.quote.right.score);
  const child=marriageCandidates(w,{...command,subject:'xiao-yi',family:'xiao'}).find(p=>p.id===target)!;expect(child.score).toBe(Math.min(child.quote.left.score,child.quote.right.score));
 });
 it('recommends currently actionable candidates first and puts unknown ages last in either age direction',()=>{
  const {w,command,target}=prepared(),rows=marriageCandidates(w,command),ready=rows.find(p=>p.id===target)!;
  const delayed={...ready,id:'delayed',name:'异地人物',rank:1 as const,score:ready.score+100,quote:{...ready.quote,reason:'双方须实际同城驻留'}};
  const unknown={...ready,id:'unknown',name:'年龄未详',age:null,ageGap:null};
  const f=marriageFilterPreset('all');expect(filterMarriageCandidates([delayed,ready],'male',f,'','recommended')[0]).toBe(ready);
  for(const sort of ['ageAsc','ageDesc','ageGap'] as MarriageSort[])expect(filterMarriageCandidates([unknown,ready],'male',f,'',sort).at(-1)).toBe(unknown);
  expect(filterMarriageCandidates([unknown,ready],'male',{...f,minAge:'18'},'','name')).toEqual([ready]);
 });
 it('sorts by the chosen capability, family prestige or opinion without mixing in availability',()=>{
  const {w,command,target}=prepared(),base=marriageCandidates(w,command).find(p=>p.id===target)!,low={...base,id:'low',name:'甲',score:0,prestige:1,opinion:-10,stats:{diplomacy:1,martial:1,stewardship:1,intrigue:1}},high={...base,id:'high',name:'乙',score:90,prestige:10,opinion:10,quote:{...base.quote,reason:'异地'},stats:{diplomacy:20,martial:20,stewardship:20,intrigue:20}};
  for(const sort of ['acceptance','diplomacy','martial','stewardship','intrigue','prestige','opinion'] as MarriageSort[])expect(filterMarriageCandidates([low,high],'male',marriageFilterPreset('all'),'',sort)[0]).toBe(high);
 });
 it('previews without mutation and refreshes blocked status after funds, movement and marriage change',()=>{
  const {w,command,target}=prepared(),before=structuredClone(w);const previews=marriageCandidates(w,command);for(const p of previews){void p.quote;void p.stats;}expect(w).toEqual(before);
  w.people[0].coins=0;expect(marriageCandidates(w,command).find(p=>p.id===target)!.quote.reason).toContain('私财');
  w.people[0].coins=500;const c={...command,target};expect(quoteFamilyMarriage(w,c).reason).toBe('');actFamilyMarriage(w,c);
  const changed=marriageCandidates(w,command);expect(changed.find(p=>p.id===target)!.marital).toBe('married');expect(changed.find(p=>p.id===target)!.quote.reason).toContain('已有主要配偶');
  expect(filterMarriageCandidates(changed,'male',marriageFilterPreset('unmarried'),'','recommended').some(p=>p.id===target)).toBe(false);
 });
});
