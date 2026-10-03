import type {World} from './types';
import {allPeople,parentLinksOf} from './personRegistry';
import {ageAt,isAlive,lifeOf,healthCapacity} from './lifeState';
import {detained} from './custodyState';
import {accountWallet} from './obligations';
import {traitsFor} from './social';
import {actFamily,familyCommandReason,familyMomentSkill,resting,type FamilyCommand} from './householdLife';
import {householdReason} from './householdPlans';
import {actLife,careReason} from './life';
/** Called by the existing monthly household tick: NPC choices never impersonate the player. */
export function advanceNPCLife(w:World){
 if(w.mode!=='sandbox'||w.campaign?.status!=='active'||!w.householdLife||!w.social)return;
 const people=allPeople(w),retired=new Set(w.social.lineage.slice(0,-1).map(p=>p.id)),eligible=(id:string)=>id!==w.characterId&&!retired.has(id)&&isAlive(w,id)&&(ageAt(w,id)??0)>=16&&!detained(w,id);
 for(const e of w.householdLife.moments){
  if(e.status!=='pending'||!eligible(e.actor))continue;const t=traitsFor(w,e.actor),cash=accountWallet(w,'person:'+e.actor)?.read()??0;
  let choice:FamilyCommand&{action:'resolve'}={type:'familyLife',action:'resolve',id:e.id,choice:'decline'};
  if(isAlive(w,e.person)){
   if(e.kind==='childhood')choice.choice=t.includes('diligent')||t.includes('frugal')?'discipline':'encourage';
   else if(e.kind==='aspiration'){const skill=familyMomentSkill(w,e.person),teacher=cash>=90?people.find(p=>p.id!==w.characterId&&!householdReason(w,{type:'household',action:'educate',target:e.person,teacher:p.id,skill},e.actor)):undefined;choice=teacher?{...choice,choice:'encourage',teacher:teacher.id}:{...choice,choice:t.includes('frugal')?'discipline':'decline'};}
   else if(e.kind==='inlaw')choice.choice=!t.includes('frugal')&&cash>=60?cash>=200&&t.includes('generous')?'encourage':'discipline':'decline';
   else if(e.kind==='bereavement')choice.choice=t.includes('steadfast')?'discipline':'encourage';
  }
  if(familyCommandReason(w,choice,e.actor))choice={...choice,choice:'decline'};
  if(!familyCommandReason(w,choice,e.actor))actFamily(w,choice,e.actor);
 }
 for(const person of people){
  const id=person.id;if(!eligible(id))continue;
  const targets=[id,...parentLinksOf(w).filter(p=>p.parent===id&&p.child!==w.characterId&&!parentLinksOf(w).some(q=>q.child===p.child&&q.parent===w.characterId)).map(p=>p.child)];
  for(const target of targets){const life=lifeOf(w,target);if(!life||!isAlive(w,target)||life.careUntil>w.day||resting(w,target)||!life.illness&&(life.injuryUntil??0)<=w.day&&life.health>=Math.min(40,healthCapacity(ageAt(w,target)??0)))continue;
   const rest:FamilyCommand={type:'familyLife',action:'rest'};
   if(target===id&&traitsFor(w,id).includes('frugal')&&!familyCommandReason(w,rest,id))actFamily(w,rest,id);
   else if(!careReason(w,target,id))actLife(w,{type:'health',action:'care',target},id);
   else if(target===id&&!familyCommandReason(w,rest,id))actFamily(w,rest,id);
  }
 }
}
