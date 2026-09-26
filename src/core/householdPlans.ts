import type {World} from './types';
import {serviceBusy} from './assignments';
import {isAlive,ageAt} from './lifeState';
import {personResidence} from './residence';
import {attributes,traitsFor} from './social';
import {spouseOf,changeRelationOpinion} from './relationships';
import {relationshipPeople,relationshipPersonById} from '../data/relationships';
import {relatives} from '../data/families';
import {accountWallet,transferAccount,incurObligation} from './obligations';
export type TaughtSkill='stewardship'|'martial'|'diplomacy';
export interface Tuition {id:number;payer:string;student:string;teacher:string;skill:TaughtSkill;next:number;progress:number;lastWorked:number;completed:number;paid:number;status:'active'|'done'|'cancelled';reason:string}
export interface HouseholdPlans {nextId:number;tuition:Tuition[];gifts:string[];growth:Record<string,Partial<Record<TaughtSkill,number>>>;lastNPC:number}
export type HouseholdCommand={type:'household';action:'educate';target:string;teacher:string;skill:TaughtSkill}|{type:'household';action:'cancel';id:number}|{type:'household';action:'dowry'|'loan';target:string};
const skills=['stewardship','martial','diplomacy'];
export function householdReason(w:World,c:HouseholdCommand,actor=w.characterId!){if(!w.realm||!actor||!isAlive(w,actor)||(ageAt(w,actor)??0)<16)return '须由成年在世人物办理';const cash=accountWallet(w,'person:'+actor);if(!cash)return '没有可用私财';
 if(c.action==='cancel'){const p=w.householdPlans?.tuition.find(t=>t.id===c.id);return !p||p.payer!==actor||p.status!=='active'?'无可撤回的培养安排':'';}
 if(!relationshipPersonById[c.target]||!isAlive(w,c.target)||c.target===actor)return '请选择另一位在世人物';
 if(c.action==='dowry')return spouseOf(w,actor)!==c.target?'须为当前配偶':w.householdPlans?.gifts.includes([actor,c.target].sort().join('|'))?'这段婚姻已交付家资':cash.read()<100?'需个人现钱 100':(accountWallet(w,'person:'+c.target)?.read()??1e6)>999900?'对方私财容量不足':'';
 if(c.action==='loan')return cash.read()<100?'出借需私财 100':(accountWallet(w,'person:'+c.target)?.read()??1e6)>999900?'借款人容量不足':w.obligations?.items.some(d=>d.from==='person:'+c.target&&d.remaining)?'对方尚有未清债务':!relatives(actor,'descendants').some(p=>p.id===c.target)&&spouseOf(w,actor)!==c.target?'仅向配偶或已录后代提供无息家用借款':'';
 if(c.action!=='educate'||!skills.includes(c.skill))return '无效培养安排';
 if(serviceBusy(w,c.teacher)||serviceBusy(w,c.target))return '师生须先交接公务或军事委任';
 const teacher=accountWallet(w,'person:'+c.teacher);return !relationshipPersonById[c.teacher]||!isAlive(w,c.teacher)||(ageAt(w,c.teacher)??0)<18||c.teacher===c.target||c.teacher===actor?'须选择另一位成年教师':attributes(w,c.teacher)[c.skill]<12?'教师对应能力至少 12':(ageAt(w,c.target)??0)<6?'六岁后方可受教':personResidence(w,c.teacher).traveling||personResidence(w,c.target).traveling||personResidence(w,c.teacher).site!==personResidence(w,c.target).site?'师生须驻留同城':w.householdPlans?.tuition.some(t=>t.status==='active'&&(t.student===c.target||t.teacher===c.teacher))?'师生已有培养安排':(w.householdPlans?.growth[c.target]?.[c.skill]??0)>=3?'该项受教成长已达 3 点':cash.read()<30?'每期须个人现钱 30':!teacher||teacher.read()>999970?'教师无法收取学资':'';
}
export function actHousehold(w:World,c:HouseholdCommand,actor=w.characterId!){const reason=householdReason(w,c,actor);if(reason)throw new Error(reason);const s=w.householdPlans??={nextId:1,tuition:[],gifts:[],growth:{},lastNPC:w.day};
 if(c.action==='cancel'){const q=s.tuition.find(t=>t.id===c.id)!;q.status='cancelled';q.reason='撤回培养；已付学资不退';return;}
 if(c.action==='dowry'){transferAccount(w,'person:'+actor,'person:'+c.target,100,'婚姻家资');s.gifts.push([actor,c.target].sort().join('|'));changeRelationOpinion(w,actor,c.target,5);changeRelationOpinion(w,c.target,actor,5);return;}
 if(c.action==='loan'){const source='household-loan:'+s.nextId++;incurObligation(w,source,'person:'+c.target,'person:'+actor,100,'家用无息借款');transferAccount(w,'person:'+actor,'person:'+c.target,100,'亲属借款');return;}
 if(c.action!=='educate')throw new Error('无效培养操作');
 transferAccount(w,'person:'+actor,'person:'+c.teacher,30,'首期学资');s.tuition.push({id:s.nextId++,payer:actor,student:c.target,teacher:c.teacher,skill:c.skill,next:w.day+30,progress:0,lastWorked:w.day,completed:0,paid:30,status:'active',reason:''});
}
export function advanceHousehold(w:World){if(w.mode!=='sandbox')return;const s=w.householdPlans??={nextId:1,tuition:[],gifts:[],growth:{},lastNPC:w.day};
 for(const t of s.tuition){if(t.status!=='active'||w.day<=t.lastWorked)continue;if(![t.payer,t.student,t.teacher].every(id=>isAlive(w,id))){t.status='cancelled';t.reason='师生或出资人离世，停止后续扣费';continue;}
 t.lastWorked=w.day;const a=personResidence(w,t.student),b=personResidence(w,t.teacher);if(a.traveling||b.traveling||a.site!==b.site||serviceBusy(w,t.teacher)||serviceBusy(w,t.student)){t.reason='师生异地或办理公务，课程顺延且不续扣学资';t.next=w.day+30-t.progress;continue;}
 t.progress++;t.next=w.day+30-t.progress;if(t.progress<30)continue;t.progress=0;t.completed++;t.reason='';if(t.completed%3===0){const g=s.growth[t.student]??={};g[t.skill]=Math.min(3,(g[t.skill]??0)+1);changeRelationOpinion(w,t.student,t.teacher,3);}
 if(t.completed>=9||(s.growth[t.student]?.[t.skill]??0)>=3){t.status='done';t.reason='学业完成';continue;}
 const payer=accountWallet(w,'person:'+t.payer),teacher=accountWallet(w,'person:'+t.teacher);if(!payer||!teacher||payer.read()<30||teacher.read()>999970){t.status='cancelled';t.reason='学资不足，已完成成长保留';continue;}
 transferAccount(w,payer.key,teacher.key,30,'续期学资');t.paid+=30;t.next=w.day+30;
 }
 if(w.day-s.lastNPC<90)return;s.lastNPC=w.day;
 for(const id of [...new Set(Object.values(w.realm?.cities??{}).map(c=>c.governor).filter((v):v is string=>!!v))]){if(id===w.characterId||(accountWallet(w,'person:'+id)?.read()??0)<180)continue;const child=relatives(id,'descendants').find(c=>isAlive(w,c.id)&&(ageAt(w,c.id)??100)<18);if(!child)continue;const skill:TaughtSkill=traitsFor(w,id).includes('frugal')?'stewardship':'diplomacy';const teacher=relationshipPeople.find(p=>p.id!==w.characterId&&!householdReason(w,{type:'household',action:'educate',target:child.id,teacher:p.id,skill},id));if(teacher)actHousehold(w,{type:'household',action:'educate',target:child.id,teacher:teacher.id,skill},id);}
}
export function validHousehold(w:World){const s=w.householdPlans;if(s===undefined)return true;const n=(x:unknown,max=1e9)=>Number.isSafeInteger(x)&&Number(x)>=0&&Number(x)<=max,p=(id:string)=>!!relationshipPersonById[id];return !!s&&n(s.nextId)&&n(s.lastNPC,w.day)&&Array.isArray(s.tuition)&&s.tuition.length<=10000&&new Set(s.tuition.map(t=>t.id)).size===s.tuition.length&&s.tuition.every(t=>t&&n(t.id,s.nextId-1)&&t.id>0&&[t.payer,t.student,t.teacher].every(p)&&t.student!==t.teacher&&skills.includes(t.skill)&&n(t.next,w.day+30)&&n(t.progress,29)&&n(t.lastWorked,w.day)&&n(t.completed,9)&&n(t.paid,270)&&['active','done','cancelled'].includes(t.status)&&typeof t.reason==='string'&&t.reason.length<=120)&&Array.isArray(s.gifts)&&s.gifts.every(k=>typeof k==='string'&&k.split('|').length===2&&k.split('|').every(p))&&!!s.growth&&Object.entries(s.growth).every(([id,g])=>p(id)&&!!g&&Object.entries(g).every(([key,v])=>skills.includes(key)&&n(v,3)));}
