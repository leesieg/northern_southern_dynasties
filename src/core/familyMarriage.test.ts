import {describe,it,expect} from 'vitest';
import {newCampaignWorld} from './world';
import {actFamilyMarriage,quoteFamilyMarriage,type FamilyMarriageCommand} from './familyMarriage';
import {changeRelationOpinion} from './relationships';
import {accountWallet} from './obligations';
import {parseWorld,serializeWorld} from './save';
function prepared(){const w=newCampaignWorld('xiao-yan',undefined,'sandbox'),subject='xiao-yan',target='guest-liang';w.relationships!.maritalBasis[subject]='free';changeRelationOpinion(w,subject,target,100);changeRelationOpinion(w,target,subject,100);const c:FamilyMarriageCommand={type:'familyMarriage',subject,target,coins:100,residence:w.people[0].location,family:'xiao'};return {w,c};}
describe('family marriage',()=>{
 it('previews without mutation and transfers only the selected dowry once',()=>{
  const {w,c}=prepared(),before=structuredClone(w),coins=w.people[0].coins,targetCash=accountWallet(w,'person:'+c.target)!.read();
  expect(quoteFamilyMarriage(w,c).reason).toBe('');expect(w).toEqual(before);
  actFamilyMarriage(w,c);expect(w.people[0].coins).toBe(coins-100);expect(accountWallet(w,'person:'+c.target)!.read()).toBe(targetCash+100);
  const marriage=w.relationships!.marriages.at(-1)!;expect(w.householdLife!.plans[marriage.id]).toEqual({trying:false,family:'xiao'});
  expect(parseWorld(serializeWorld(w))).toEqual(w);
  const after=structuredClone(w);expect(()=>actFamilyMarriage(w,c)).toThrow('已有主要配偶');expect(w).toEqual(after);
 });
 it('requires both partners to agree and does not buy acceptance with a larger dowry',()=>{
  const {w,c}=prepared();changeRelationOpinion(w,c.subject,c.target,-200);
  const low=quoteFamilyMarriage(w,{...c,coins:50}),high=quoteFamilyMarriage(w,{...c,coins:200});
  expect(low.reason).toContain('双方婚姻接受度');expect(high.left).toEqual(low.left);expect(high.right).toEqual(low.right);
  const before=structuredClone(w);expect(()=>actFamilyMarriage(w,c)).toThrow();expect(w).toEqual(before);
 });
 it('rejects unrelated subjects, unknown marital histories, cooling-off periods and fictional relocation',()=>{
  const {w,c}=prepared();expect(quoteFamilyMarriage(w,{...c,subject:'gao-yang'}).reason).toContain('直系子女');
  w.relationships!.maritalBasis[c.target]='unknown';expect(quoteFamilyMarriage(w,c).reason).toContain('未录');
  w.relationships!.maritalBasis[c.target]='free';w.relationships!.cooldowns[c.target+'|'+c.subject+'|marry']=w.day+10;expect(quoteFamilyMarriage(w,c).reason).toContain('冷却');
  delete w.relationships!.cooldowns[c.target+'|'+c.subject+'|marry'];expect(quoteFamilyMarriage(w,{...c,residence:'ye'}).reason).toContain('同城');
  w.mobility!.residences[c.target]={site:'ye',journey:null};expect(quoteFamilyMarriage(w,c).reason).toContain('同城');
 });
 it('allows an adult direct child to choose a marriage without receiving the parent’s public authority',()=>{
  const {w,c}=prepared();c.subject='xiao-yi';
  for(const m of w.relationships!.marriages)if(m.a===c.subject||m.b===c.subject)m.until=w.day;
  w.relationships!.maritalBasis[c.subject]='free';w.mobility!.residences[c.subject]={site:c.residence,journey:null};
  changeRelationOpinion(w,c.subject,c.target,100);changeRelationOpinion(w,c.target,c.subject,100);
  const g=structuredClone(w.realm!.governments),cash=w.people[0].coins;
  expect(quoteFamilyMarriage(w,c).reason).toBe('');actFamilyMarriage(w,c);
  expect(w.people[0].coins).toBe(cash-100);expect(w.realm!.governments).toEqual(g);expect(w.characterId).toBe('xiao-yan');
 });
});
