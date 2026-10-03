import type {World} from './types';
import type {OngoingItem,OngoingKind,OngoingTarget} from './ongoing';
import {getPerson,parentLinksOf} from './personRegistry';
import {ageAt,isAlive,lifeOf,illnessNames,healthCapacity} from './lifeState';
import {activeMarriage,spouseOf} from './relationships';
import {marriageSubjects} from './familyMarriage';
import {familyGuardian,familyMomentTitle} from './householdLife';
import {tuitionPause} from './householdPlans';
import {careReason} from './life';
/** Personal life reminders derive from current authority and state, without saved task copies. */
export function lifeOngoingItems(w:World):OngoingItem[]{
 const actor=w.characterId;if(w.mode!=='sandbox'||w.campaign?.status!=='active'||!actor||!isAlive(w,actor)||!w.life||!w.relationships)return [];
 const items:OngoingItem[]=[],children=[...new Set(parentLinksOf(w).filter(p=>p.parent===actor).map(p=>p.child))].filter(id=>getPerson(w,id)&&isAlive(w,id)),name=(id:string)=>getPerson(w,id)?.name??w.people[0].name;
 const target=(person:string,action?:'marriage'|'education'):OngoingTarget=>({page:'person',person,tab:'overview',...(action?{action}:{})});
 const waiting=(id:string,kind:OngoingKind,title:string,status:string,person:string,action?:'marriage'|'education',started=0)=>items.push({id,kind,title,started,progress:null,days:null,clock:'waiting',status,target:target(person,action)});
 if((ageAt(w,actor)??0)>=18)for(const id of marriageSubjects(w))if(!activeMarriage(w,id))waiting('marriage:'+id,'marriage','成年未婚 · '+name(id),'可为'+(id===actor?'本人':'直系子女')+'安排议婚；须双方接受、实际同城并支付私财婚资。',id,'marriage');
 const moments=w.householdLife?.moments.filter(e=>e.actor===actor&&e.status==='pending')??[];
 const students=(ageAt(w,actor)??0)>=16?children:familyGuardian(w,actor)?[actor]:[];
 for(const id of students){const age=ageAt(w,id),courses=w.householdPlans?.tuition.filter(t=>t.student===id)??[];
  if(age===null||age<6||age>=18||courses.some(t=>t.status==='active'||t.status==='done')||Object.values(w.householdPlans?.growth[id]??{}).some(n=>(n??0)>0)||moments.some(e=>e.person===id&&e.kind==='aspiration'))continue;
  waiting('education:'+id,'education','待安排教育 · '+name(id),'尚无培养安排；选择同城成年教师及方向，首期和后续有效授课月份各付 30 私钱。',id,'education');
 }
 for(const t of w.householdPlans?.tuition??[])if(t.payer===actor&&t.status==='active'&&[t.student,t.teacher].every(id=>isAlive(w,id))){
  const pause=tuitionPause(w,t),work=t.completed*30+t.progress,total=Math.max(0,3-(w.householdPlans?.growth[t.student]?.[t.skill]??0)+Math.floor(t.completed/3))*90,remaining=Math.max(0,total-work);
  items.push({id:'tuition:'+t.id,kind:'education',title:'延师培养 · '+name(t.student),started:0,progress:total?Math.min(1,work/total):1,days:pause?null:remaining,clock:'estimate',status:pause||'教师 '+name(t.teacher)+' · 已有效受教 '+work+' 日；已付 '+t.paid+' 私钱，后续按有效授课续费。',target:{page:'person',person:t.student,tab:t.student===actor?'overview':'interaction'}});
 }
 for(const e of moments)waiting('family-moment:'+e.id,'family',familyMomentTitle[e.kind]+' · '+name(e.person),isAlive(w,e.person)?'家事待定夺；点击查看真实选项与成本。':'当事人已故，请结束此事。',actor,undefined,e.created);
 for(const p of w.householdLife?.pregnancies??[])if(p.status==='expecting'&&[p.father,p.mother].some(id=>id===actor||children.includes(id))&&isAlive(w,p.mother))items.push({id:'pregnancy:'+p.id,kind:'family',title:'孕期 · '+name(p.mother),started:p.since,progress:Math.max(0,Math.min(1,(w.day-p.since)/(p.due-p.since))),days:Math.max(0,p.due-w.day),clock:'estimate',status:'双亲 '+name(p.father)+'、'+name(p.mother)+'；预计添丁日期依现有孕期，不需重复安排。',target:target(p.mother)});
 const spouse=spouseOf(w,actor),carePeople=[...new Set([actor,...children,...(spouse?[spouse]:[])])];
 for(const id of carePeople){const life=lifeOf(w,id);if(!life||!isAlive(w,id)||id!==actor&&id!==spouse&&getPerson(w,id)?.family!==getPerson(w,actor)?.family)continue;
  const rest=id===actor?w.householdLife?.rest[id]??0:0;
  if(rest>w.day){items.push({id:'rest:'+id,kind:'care',title:'伤病休养 · '+name(id),started:rest-30,progress:Math.max(0,Math.min(1,(w.day-(rest-30))/30)),days:rest-w.day,clock:'remaining',status:'休养完成后按既有规则恢复健康与缓解军中伤情；可提前结束，未完成无奖励。',target:target(id)});continue;}
  if(life.careUntil>w.day){items.push({id:'care:'+id,kind:'care',title:'延医照料 · '+name(id),started:life.careUntil-90,progress:Math.max(0,Math.min(1,(w.day-(life.careUntil-90))/90)),days:life.careUntil-w.day,clock:'remaining',status:'已经支付照料费用，提高康复机会；不保证康复。',target:target(id)});continue;}
  if(life.illness||(life.injuryUntil??0)>w.day||life.health<Math.min(40,healthCapacity(ageAt(w,id)??0)))waiting('care:'+id,'care','待安排养护 · '+name(id),(life.illness?illnessNames[life.illness.kind]:(life.injuryUntil??0)>w.day?'军中负伤':'身体衰弱')+'；'+(careReason(w,id)||'延医照料需 30 私钱，也可按条件安排本人休养。'),id,undefined,life.illness?.since??0);
 }
 return items;
}
