import {describe,it,expect} from 'vitest';
import {newCampaignWorld,act} from './world';
import {ongoingItems} from './ongoing';
import {lifeOngoingItems} from './lifeOngoing';
import {ensureHouseholdLife,deliverChild,actFamily} from './householdLife';
import {allPeople} from './personRegistry';
import {ageAt} from './lifeState';
import {householdReason,advanceHousehold} from './householdPlans';
import {changeRelationOpinion} from './relationships';
import {actFamilyMarriage} from './familyMarriage';
import {parseWorld,serializeWorld} from './save';
import {mapActivities} from './mapActivities';
import {die} from './life';
import {getScript} from '../data/scripts';
function child(years=8){
 const w=newCampaignWorld('gao-cheng',undefined,'sandbox'),s=ensureHouseholdLife(w);
 const p={id:s.nextId++,father:'gao-cheng',mother:'guest-east',family:'gao',since:0,due:270,status:'expecting' as const,child:null};s.pregnancies.push(p);w.day=270;deliverChild(w,s.pregnancies[0]);const date=new Date(Date.UTC(getScript(w.scriptId).year,0,1+w.day));date.setUTCFullYear(date.getUTCFullYear()+years);w.day=(date.getTime()-Date.UTC(getScript(w.scriptId).year,0,1))/86400000;
 return {w,id:s.pregnancies[0].child!};
}
const education=(w:ReturnType<typeof newCampaignWorld>,id:string)=>lifeOngoingItems(w).find(i=>i.id==='education:'+id);
const teacherFor=(w:ReturnType<typeof newCampaignWorld>,id:string)=>allPeople(w).find(p=>!householdReason(w,{type:'household',action:'educate',target:id,teacher:p.id,skill:'stewardship'}))!.id;
describe('生活事项顶部旗帜',()=>{
 it('projects adult unmarried self and direct children, then removes their reminders after real marriage or death',()=>{
  const w=newCampaignWorld('xiao-yan',undefined,'sandbox');for(const m of w.relationships!.marriages)if([m.a,m.b].includes('xiao-yi'))m.until=w.day;const items=lifeOngoingItems(w).filter(i=>i.kind==='marriage');expect(items.some(i=>i.id==='marriage:xiao-yan')).toBe(true);expect(items.some(i=>i.id==='marriage:xiao-yi')).toBe(true);expect(items.some(i=>i.id==='marriage:gao-cheng')).toBe(false);
  expect(items.find(i=>i.id==='marriage:xiao-yan')).toMatchObject({days:null,progress:null,target:{page:'person',person:'xiao-yan',tab:'overview',action:'marriage'}});
  changeRelationOpinion(w,'xiao-yan','guest-liang',100);changeRelationOpinion(w,'guest-liang','xiao-yan',100);actFamilyMarriage(w,{type:'familyMarriage',subject:'xiao-yan',target:'guest-liang',coins:100,residence:w.people[0].location,family:'xiao'});
  expect(lifeOngoingItems(w).some(i=>i.id==='marriage:xiao-yan')).toBe(false);die(w,'xiao-yi','illness');expect(lifeOngoingItems(w).some(i=>i.id==='marriage:xiao-yi')).toBe(false);
 });
 it('reminds for school-age children, replaces a draft reminder with a real course, and returns it on cancellation',()=>{
  const {w,id}=child();expect(ageAt(w,id)).toBe(8);expect(education(w,id)?.target).toMatchObject({person:id,action:'education'});
  const teacher=teacherFor(w,id);act(w,{type:'household',action:'educate',target:id,teacher,skill:'stewardship'});expect(education(w,id)).toBeUndefined();const t=w.householdPlans!.tuition.at(-1)!;
  expect(lifeOngoingItems(w).find(i=>i.id==='tuition:'+t.id)).toMatchObject({progress:0,days:270,clock:'estimate',target:{person:id,tab:'interaction'}});
  act(w,{type:'household',action:'cancel',id:t.id});expect(education(w,id)).toBeDefined();expect(lifeOngoingItems(w).some(i=>i.id==='tuition:'+t.id)).toBe(false);
  w.householdPlans!.growth[id]={stewardship:1};expect(education(w,id)).toBeUndefined();die(w,id,'illness');expect(education(w,id)).toBeUndefined();
 });
 it('does not flag infants or adult students as needing childhood education and excludes unrelated NPCs',()=>{
  const infant=child(0);expect(education(infant.w,infant.id)).toBeUndefined();const adult=child(18);expect(education(adult.w,adult.id)).toBeUndefined();expect(lifeOngoingItems(adult.w).some(i=>i.id==='marriage:'+adult.id)).toBe(true);
  expect(lifeOngoingItems(infant.w).filter(i=>i.kind==='education').every(i=>i.target.page==='person'&&i.target.person!== 'yuan-kuo')).toBe(true);
 });
 it('uses actual teaching work and remaining growth; an immediate relocation pauses the estimate without changing work',()=>{
  const {w,id}=child(),teacher=teacherFor(w,id);w.householdPlans??={nextId:1,tuition:[],gifts:[],growth:{},lastNPC:w.day};w.householdPlans.growth[id]={stewardship:2};act(w,{type:'household',action:'educate',target:id,teacher,skill:'stewardship'});const t=w.householdPlans.tuition.at(-1)!;
  t.progress=15;expect(lifeOngoingItems(w).find(i=>i.id==='tuition:'+t.id)).toMatchObject({progress:1/6,days:75});w.mobility!.residences[teacher]={site:'jiankang',journey:null};expect(lifeOngoingItems(w).find(i=>i.id==='tuition:'+t.id)).toMatchObject({progress:1/6,days:null});expect(t.reason).toBe('');
  w.mobility!.residences[teacher].site=w.mobility!.residences[id].site;t.completed=2;t.progress=29;w.day++;advanceHousehold(w);expect(t.status).toBe('done');expect(lifeOngoingItems(w).some(i=>i.id==='tuition:'+t.id)).toBe(false);expect(education(w,id)).toBeUndefined();
 });
 it('keeps assigned family decisions, deduplicates education aspirations, and removes the item after a real choice',()=>{
  const {w,id}=child(16),s=w.householdLife!,e={id:s.nextId++,key:'flags-aspiration',kind:'aspiration' as const,person:id,actor:w.characterId!,created:w.day,status:'pending' as const,choice:null};s.moments.push(e);
  expect(education(w,id)).toBeUndefined();expect(lifeOngoingItems(w).find(i=>i.id==='family-moment:'+e.id)?.target).toMatchObject({person:w.characterId,tab:'overview'});
  actFamily(w,{type:'familyLife',action:'resolve',id:e.id,choice:'decline'});expect(lifeOngoingItems(w).some(i=>i.id==='family-moment:'+e.id)).toBe(false);expect(education(w,id)).toBeDefined();
  s.moments.push({id:s.nextId++,key:'other-actor',kind:'childhood',person:id,actor:'gao-huan',created:w.day,status:'pending',choice:null});expect(lifeOngoingItems(w).some(i=>i.id==='family-moment:'+s.moments.at(-1)!.id)).toBe(false);
 });
 it('tracks real pregnancy dates once and removes born or ended pregnancies',()=>{
  const w=newCampaignWorld('gao-cheng',undefined,'sandbox'),s=ensureHouseholdLife(w),p={id:s.nextId++,father:'gao-cheng',mother:'guest-east',family:'gao',since:0,due:270,status:'expecting' as const,child:null};s.pregnancies.push(p);w.day=135;
  expect(lifeOngoingItems(w).find(i=>i.id==='pregnancy:'+p.id)).toMatchObject({progress:.5,days:135,clock:'estimate'});w.day=270;deliverChild(w,s.pregnancies[0]);expect(lifeOngoingItems(w).some(i=>i.id==='pregnancy:'+p.id)).toBe(false);
 });
 it('replaces untreated illness with paid care or actual rest, exposes blockers and removes recovered reminders',()=>{
  const w=newCampaignWorld('gao-cheng',undefined,'sandbox'),p=w.life!.people['gao-cheng'];p.illness={kind:'cold',since:0,severity:1};w.people[0].coins=0;expect(lifeOngoingItems(w).find(i=>i.id==='care:gao-cheng')?.status).toContain('30 钱');w.people[0].coins=100;
  act(w,{type:'health',action:'care',target:'gao-cheng'});expect(lifeOngoingItems(w).find(i=>i.id==='care:gao-cheng')).toMatchObject({days:90,clock:'remaining'});expect(lifeOngoingItems(w).filter(i=>i.kind==='care'&&i.target.page==='person'&&i.target.person==='gao-cheng')).toHaveLength(1);
  actFamily(w,{type:'familyLife',action:'rest'});expect(lifeOngoingItems(w).find(i=>i.id==='rest:gao-cheng')).toMatchObject({days:30,progress:0});actFamily(w,{type:'familyLife',action:'resume'});expect(lifeOngoingItems(w).some(i=>i.id==='rest:gao-cheng')).toBe(false);w.day=90;p.illness=null;expect(lifeOngoingItems(w).some(i=>i.id==='care:gao-cheng')).toBe(false);
 });
 it('reads without mutation, survives save restore, keeps private life off the map and stops after the campaign ends',()=>{
  const {w}=child(),before=serializeWorld(w),items=ongoingItems(w);expect(serializeWorld(w)).toBe(before);expect(ongoingItems(parseWorld(before))).toEqual(items);expect(mapActivities(w)).toEqual([]);
  delete w.mode;expect(lifeOngoingItems(w)).toEqual([]);w.mode='sandbox';w.campaign!.status='lost';expect(lifeOngoingItems(w)).toEqual([]);
 });
});
