import {describe,it,expect} from 'vitest';
import {newCampaignWorld,act} from './world';
import {deliverChild,ensureHouseholdLife,type Pregnancy} from './householdLife';
import {parseWorld,serializeWorld} from './save';
import {die} from './life';
import {ageAt} from './lifeState';
import {heirs} from './social';
import {publicOfficeReason} from './officeEligibility';
import {householdReason} from './householdPlans';
import {relationshipQuote,changeRelationOpinion} from './relationships';
import {allPeople,getPerson} from './personRegistry';
import {personResidence} from './residence';
function newborn(){
 const w=newCampaignWorld('gao-huan',undefined,'sandbox'),s=ensureHouseholdLife(w);
 const p:Pregnancy={id:s.nextId++,father:'gao-huan',mother:'lou-zhaojun',family:'gao',since:0,due:270,status:'expecting',child:null};
 s.pregnancies.push(p);w.day=270;deliverChild(w,p);
 return {w,id:p.child!};
}
describe('generated child lifecycle integration',()=>{
 it('saves a newborn and continues as the nominated child after player death without inheriting executive office',()=>{
  const {w,id}=newborn();expect(ageAt(w,id)).toBe(0);expect(heirs(w).map(p=>p.id)).toContain(id);
  const bornLoaded=parseWorld(serializeWorld(w)),bornSnapshot=structuredClone(w);
  act(w,{type:'heir',target:id});const next=parseWorld(serializeWorld(w));
  die(next,'gao-huan','age');expect(next.characterId).toBe(id);expect(next.campaign!.status).toBe('active');
  expect(next.realm!.governments!.realms.east.executives).not.toContain(id);
  expect(parseWorld(serializeWorld(next))).toEqual(next);
  expect(bornLoaded).toEqual(bornSnapshot);
 });
 it('hands private assets to a newborn without transferring public seats and roundtrips the new player',()=>{
  const {w,id}=newborn(),executives=[...w.realm!.governments!.realms.east.executives],coins=w.people[0].coins;
  act(w,{type:'heir',target:id});act(w,{type:'handover'});
  expect(w.characterId).toBe(id);expect(w.people[0].coins).toBe(coins);
  expect(w.realm!.governments!.realms.east.executives).toEqual(executives);
  expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('uses current age for education and public appointment eligibility',()=>{
  const {w,id}=newborn();expect(publicOfficeReason(w,id)).toContain('成年');
  const teachers=allPeople(w).filter(p=>p.id!==w.characterId&&p.id!==id&&personResidence(w,p.id).site===personResidence(w,id).site);
  const c=teachers.map(p=>({type:'household',action:'educate',target:id,teacher:p.id,skill:'stewardship'} as const)).find(c=>householdReason(w,c).includes('六岁'));
  expect(c).toBeDefined();w.day=270+365*6+2;expect(ageAt(w,id)).toBe(6);expect(householdReason(w,c!)).toBe('');
  w.day=270+365*16+5;expect(ageAt(w,id)).toBe(16);expect(publicOfficeReason(w,id)).toBe('');
 });
 it('permits marriage consideration only once a generated successor reaches marriage age',()=>{
  const {w,id}=newborn();act(w,{type:'heir',target:id});die(w,'gao-huan','age');
  const target=getPerson(w,id)!.sex==='male'?'guest-east':'yuan-shanjian';
  w.relationships!.maritalBasis[target]='free';
  w.mobility!.residences[target]={site:w.people[0].location,journey:null};
  w.people[0].coins=1000;
  const command={type:'relationship',action:'marry',target} as const;
  expect(relationshipQuote(w,command).reason).toContain('成年');
  w.day=270+365*18+5;expect(ageAt(w,id)).toBe(18);
  expect(relationshipQuote(w,command).reason).not.toContain('成年');
  expect(relationshipQuote(w,command).reason).not.toContain('无效');
  changeRelationOpinion(w,target,id,100);changeRelationOpinion(w,id,target,100);
  expect(relationshipQuote(w,command).reason).toBe('');
  act(w,command);expect(w.relationships!.marriages.some(m=>m.until===null&&[m.a,m.b].includes(id))).toBe(true);
  expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
});

it('appoints a grown generated child through the real central office command and saves the appointment',async()=>{
 const {w,id}=newborn();w.day=270+365*18+5;w.realm!.influence=999;w.realm!.governments!.realms.east.merit[id]=25;
 const {courtReason}=await import('./court');const command={type:'court',action:'appoint',ministry:'finance',candidate:id} as const;
 expect(courtReason(w,command)).toBe('');act(w,command);
 expect(w.realm!.governments!.realms.east.court!.ministries.finance).toBe(id);expect(parseWorld(serializeWorld(w))).toEqual(w);
});
