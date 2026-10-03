import {describe,it,expect} from 'vitest';
import {newCampaignWorld,act,advance} from './world';
import {advanceLifestyle,ensureLifestyle,actLifestyle,lifestyleProgress,lifestylePoints,lifestyleLearning,lifestyleBonuses} from './lifestyle';
import {branchPerks,lifestyleFocuses,LIFESTYLE_XP_PER_POINT} from '../data/lifestyles';
import {allPeople} from './personRegistry';
import {ageAt} from './lifeState';
import {attributes,traitsFor} from './social';
import {parseWorld,serializeWorld} from './save';
import {ongoingItems} from './ongoing';
import {ensureHouseholdLife,deliverChild,advanceHouseholdLife,actFamily} from './householdLife';
import {advanceHousehold,householdReason} from './householdPlans';
import {advanceNPCLife} from './npcLife';
import {accountWallet} from './obligations';
import {nextMonthStart} from './calendar';
import {getScript} from '../data/scripts';
import {cityYield,armyDailyFood,type Army} from './realm';
import {marriageAcceptance} from './familyMarriage';
function child(years=8){
 const w=newCampaignWorld('gao-huan',undefined,'sandbox'),s=ensureHouseholdLife(w);w.mobility!.residences['yuan-qin']={site:'changan',journey:null};w.mobility!.residences['guest-west']={site:'changan',journey:null};
 s.pregnancies.push({id:s.nextId++,father:'yuan-qin',mother:'guest-west',family:'yuan',since:0,due:270,status:'expecting',child:null});w.day=270;deliverChild(w,s.pregnancies[0]);const date=new Date(Date.UTC(getScript(w.scriptId).year,0,1+w.day));date.setUTCFullYear(date.getUTCFullYear()+years);w.day=(date.getTime()-Date.UTC(getScript(w.scriptId).year,0,1))/86400000;
 return {w,id:s.pregnancies[0].child!};
}
function school(w:ReturnType<typeof newCampaignWorld>){
 for(const p of allPeople(w))if(p.id!==w.characterId){const wallet=accountWallet(w,'person:'+p.id);if(wallet)wallet.write(12);}
 accountWallet(w,'person:yuan-qin')!.write(300);w.mobility!.residences['yuwen-tai']={site:'changan',journey:null};
}
describe('NPC 自主生活与成长节奏',()=>{
 it('selects a real focus and learns prerequisites for every eligible NPC without spending the player’s points',()=>{
  const w=newCampaignWorld('xiao-yan',undefined,'sandbox'),player=structuredClone(ensureLifestyle(w)),coins=w.people[0].coins;w.day=1;advanceLifestyle(w);
  const eligible=allPeople(w).filter(p=>!w.life!.people[p.id]?.death&&(ageAt(w,p.id)??0)>=16&&p.id!==w.characterId);
  expect(eligible.length).toBeGreaterThan(20);for(const person of eligible){const p=lifestyleProgress(w,person.id)!;expect(p.focus).toBeTruthy();expect(p.perks).toHaveLength(1);expect(lifestylePoints(p,lifestyleFocuses[p.focus!].branch)).toBe(0);expect(attributes(w,person.id)[lifestyleFocuses[p.focus!].branch]).toBeGreaterThanOrEqual(11);}
  expect(lifestyleProgress(w)).toEqual(player);expect(w.people[0].coins).toBe(coins);expect(ongoingItems(w).some(i=>i.id==='focus:xiao-yan')).toBe(true);expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('leaves dead, underage, retired and detained people out of automatic learning',()=>{
  const w=newCampaignWorld('xiao-yan',undefined,'sandbox');w.life!.people['yuan-qin'].death={day:0,cause:'illness'};w.social!.lineage.unshift({id:'xiao-gang',day:0});w.custody!.records['gao-cheng']={person:'gao-cheng',captor:'liang',captorPerson:null,army:null,site:'jiankang',since:0,origin:'east',cause:'battle',source:'test',treatment:'guarded',talked:null,terms:'',escapeAfter:0,ransom:80,offer:null};
  w.day=1;advanceLifestyle(w);for(const id of ['yuan-qin','yuwen-jue','xiao-gang','gao-cheng'])expect(lifestyleProgress(w,id)).toBeUndefined();
 });
 it('settles daily XP and monthly NPC study once, keeping the player’s pending study and stress intact',()=>{
  const w=newCampaignWorld('gao-huan',undefined,'sandbox');actLifestyle(w,{type:'lifestyle',action:'focus',focus:'strategy'});w.day=1;advanceLifestyle(w);const npc=lifestyleProgress(w,'yuan-qin')!,before=npc.xp[lifestyleFocuses[npc.focus!].branch];w.day=31;const rate=lifestyleLearning(w,'yuan-qin').total;advanceLifestyle(w);expect(npc.study).toBeNull();expect(npc.xp[lifestyleFocuses[npc.focus!].branch]).toBe(before+rate+30);
  expect(lifestyleProgress(w)!.study).not.toBeNull();const snapshot=serializeWorld(w);advanceLifestyle(w);expect(serializeWorld(w)).toBe(snapshot);expect(w.social!.stress).toBe(0);
 });
 it('charges 360 XP per point so a month of daily growth and study cannot fill the tree',()=>{
  const w=newCampaignWorld('gao-huan',undefined,'sandbox');actLifestyle(w,{type:'lifestyle',action:'focus',focus:'strategy'});actLifestyle(w,{type:'lifestyle',action:'unlock',perk:'drill'});
  for(let day=1;day<=31;day++){w.day=day;advanceLifestyle(w);}actLifestyle(w,{type:'lifestyle',action:'study',choice:'practice'});
  expect(LIFESTYLE_XP_PER_POINT).toBe(360);expect(lifestylePoints(ensureLifestyle(w),'martial')).toBe(0);expect(ensureLifestyle(w).perks).toEqual(['drill']);expect(ensureLifestyle(w).xp.martial).toBeLessThan(720);
 });
 it('keeps a completed branch and changes to an unfinished route after the shared cooldown without another starter point',()=>{
  const w=newCampaignWorld('xiao-yan',undefined,'sandbox');w.day=1;advanceLifestyle(w);const p=ensureLifestyle(w,'yuan-qin'),branch=lifestyleFocuses[p.focus!].branch;p.xp[branch]=5*LIFESTYLE_XP_PER_POINT;p.perks=branchPerks(branch).map(([id])=>id);const oldFocus=p.focus;w.day=100;advanceLifestyle(w);
  expect(p.focus).not.toBe(oldFocus);expect(p.xp[branch]).toBe(1800);expect(p.xp[lifestyleFocuses[p.focus!].branch]).toBeLessThan(360);expect(p.perks).toHaveLength(5);expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('migrates legacy XP units once while retaining learned skills, available points, fractional progress and private balances',()=>{
  const w=newCampaignWorld('gao-huan',undefined,'sandbox');w.day=200;const p=ensureLifestyle(w);p.focus='strategy';p.xp.martial=270;p.perks=['drill'];delete p.lastAdvanced;w.lifestyles!.version=1;const reserves=structuredClone(w.relationships!.reserves),coins=w.people[0].coins;
  const loaded=parseWorld(serializeWorld(w)),q=ensureLifestyle(loaded);expect(loaded.lifestyles!.version).toBe(2);expect(q.xp.martial).toBe(810);expect(q.perks).toEqual(['drill']);expect(lifestylePoints(q,'martial')).toBe(1);expect(q.xp.martial%360).toBe(90);expect(loaded.relationships!.reserves).toEqual(reserves);expect(loaded.people[0].coins).toBe(coins);expect(parseWorld(serializeWorld(loaded))).toEqual(loaded);
  p.xp.martial=601;expect(()=>serializeWorld(w)).toThrow('存档');
 });
 it('rejects invalid NPC growth records and preserves the successor’s own NPC learning on handover',()=>{
  const w=newCampaignWorld('xiao-yan',undefined,'sandbox');w.day=1;advanceLifestyle(w);const next=structuredClone(lifestyleProgress(w,'xiao-yi'));act(w,{type:'heir',target:'xiao-yi'});act(w,{type:'handover'});expect(lifestyleProgress(w)).toEqual(next);expect(parseWorld(serializeWorld(w))).toEqual(w);
  const bad=structuredClone(w);bad.lifestyles!.people['not-a-person']=structuredClone(next!);expect(()=>serializeWorld(bad)).toThrow('存档');delete bad.lifestyles!.people['not-a-person'];bad.lifestyles!.people['xiao-yi'].lastAdvanced=bad.day+1;expect(()=>serializeWorld(bad)).toThrow('存档');
 });
 it('lets an ordinary NPC parent fund education from private cash with real teacher receipt and no public or player charge',()=>{
  const {w,id}=child();school(w);expect(Object.values(w.realm!.cities).some(c=>c.governor==='yuan-qin')).toBe(false);w.householdPlans={nextId:1,tuition:[],gifts:[],growth:{},lastNPC:w.day-90};const skill=traitsFor(w,'yuan-qin').includes('frugal')?'stewardship':'diplomacy',publicFunds=structuredClone(w.realm!.treasuries),player=w.people[0].coins,teacher=allPeople(w).find(p=>p.id!==w.characterId&&!householdReason(w,{type:'household',action:'educate',target:id,teacher:p.id,skill},'yuan-qin'))!.id,before=accountWallet(w,'person:'+teacher)!.read();
  advanceHousehold(w);const t=w.householdPlans.tuition.find(t=>t.student===id)!;expect(t).toMatchObject({payer:'yuan-qin',teacher,status:'active',paid:30});expect(accountWallet(w,'person:yuan-qin')!.read()).toBe(270);expect(accountWallet(w,'person:'+teacher)!.read()).toBe(before+30);expect(w.people[0].coins).toBe(player);expect(w.realm!.treasuries).toEqual(publicFunds);const snapshot=serializeWorld(w);advanceHousehold(w);expect(serializeWorld(w)).toBe(snapshot);
 });
 it('resolves NPC childhood and aspirations with real choices while keeping player-owned family events pending',()=>{
  const {w,id}=child(16);school(w);const s=w.householdLife!,event={id:s.nextId++,key:'npc-aspiration',kind:'aspiration' as const,person:id,actor:'yuan-qin',created:w.day,status:'pending' as const,choice:null};s.moments.push(event);s.moments.push({id:s.nextId++,key:'player-choice',kind:'childhood',person:id,actor:w.characterId!,created:w.day,status:'pending',choice:null});
  const coins=w.people[0].coins,stress=w.social!.stress;advanceNPCLife(w);expect(event.status).toBe('resolved');expect(event.choice).toBe('encourage');expect(w.householdPlans!.tuition.at(-1)?.payer).toBe('yuan-qin');expect(s.moments[1].status).toBe('pending');expect(w.people[0].coins).toBe(coins);expect(w.social!.stress).toBe(stress);expect(parseWorld(serializeWorld(w))).toEqual(w);
  const snapshot=serializeWorld(w);advanceNPCLife(w);expect(serializeWorld(w)).toBe(snapshot);
 });
 it('pays NPC medical care once from its own wallet and uses legal rest when poor, without borrowing player stress or resources',()=>{
  const w=newCampaignWorld('gao-huan',undefined,'sandbox');ensureHouseholdLife(w);for(const person of allPeople(w))if(person.id!==w.characterId){const wallet=accountWallet(w,'person:'+person.id);if(wallet)wallet.write(12);}accountWallet(w,'person:yuwen-tai')!.write(100);w.life!.people['yuwen-tai'].illness={kind:'cold',since:0,severity:1};w.life!.people['gao-huan'].illness={kind:'cold',since:0,severity:1};const player=w.people[0].coins,stress=w.social!.stress,publicFunds=structuredClone(w.realm!.treasuries);
  advanceNPCLife(w);expect(w.life!.people['yuwen-tai'].careUntil).toBe(90);expect(accountWallet(w,'person:yuwen-tai')!.read()).toBe(70);expect(w.life!.people['gao-huan'].careUntil).toBe(0);expect(w.people[0].coins).toBe(player);expect(w.social!.stress).toBe(stress);expect(w.realm!.treasuries).toEqual(publicFunds);const snapshot=serializeWorld(w);advanceNPCLife(w);expect(serializeWorld(w)).toBe(snapshot);
  w.day=90;accountWallet(w,'person:yuwen-tai')!.write(0);advanceNPCLife(w);expect(w.householdLife!.rest['yuwen-tai']).toBe(120);expect(w.people[0].coins).toBe(player);
 });
 it('applies a governor’s own focus and an assigned NPC commander’s own supply skills to actual outcomes',()=>{
  const w=newCampaignWorld('xiao-yan',undefined,'sandbox');w.realm!.cities.ye.governor='yuan-qin';const base=cityYield(w,'ye');actLifestyle(w,{type:'lifestyle',action:'focus',focus:'domain'},'yuan-qin');expect(cityYield(w,'ye').coins).toBeGreaterThan(base.coins);expect(marriageAcceptance(w,'guest-west','yuan-qin').parts.find(p=>p.label==='生活重心与技能')?.value).toBe(0);
  actLifestyle(w,{type:'lifestyle',action:'focus',focus:'supply'},'yuwen-tai');const a:Army={id:90,realm:'west',location:'changan',troops:600,morale:80,supply:100,journey:null,siege:0};w.realm!.armies=[a];w.mobility!.armyCommanders??={};w.mobility!.armyCommanders[90]='yuwen-tai';expect(armyDailyFood(w,a)).toBeCloseTo(.19);expect(lifestyleBonuses(w).supply).toBe(0);
 });
 it('generates and settles a real NPC childhood milestone on the monthly tick and handles self-directed choices without self-opinion entries',()=>{
  const {w,id}=child();school(w);w.day=nextMonthStart(w.day,w.scriptId);advanceHouseholdLife(w);const event=w.householdLife!.moments.find(e=>e.person===id&&e.kind==='childhood');expect(event).toMatchObject({actor:'yuan-qin',status:'resolved'});expect(w.social!.traits[id]).toContain(event!.choice==='encourage'?'gregarious':'diligent');expect(parseWorld(serializeWorld(w))).toEqual(w);
  const self=ensureHouseholdLife(w),e={id:self.nextId++,key:'self-study',kind:'aspiration' as const,person:'yuan-qin',actor:'yuan-qin',created:w.day,status:'pending' as const,choice:null};self.moments.push(e);actFamily(w,{type:'familyLife',action:'resolve',id:e.id,choice:'discipline'},'yuan-qin');expect(w.relationships!.opinions['yuan-qin|yuan-qin']).toBeUndefined();expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('runs NPC focus selection in the normal daily world tick without automatically selecting the player’s focus',()=>{
  const w=newCampaignWorld('xiao-yan',undefined,'sandbox');advance(w);expect(lifestyleProgress(w,'yuan-qin')?.focus).toBeTruthy();expect(lifestyleProgress(w)?.focus).toBeNull();expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
});
