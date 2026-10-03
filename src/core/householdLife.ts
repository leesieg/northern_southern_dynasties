import {allegianceRealm} from './officeEligibility';
import type {World} from './types';
import {allPeople,getPerson,relativesOf,parentLinksOf,familyMembersOf} from './personRegistry';
import {familyById} from '../data/families';
import {ageAt,isAlive,lifeOf,healthCapacity} from './lifeState';
import {isMonthStart,monthStart} from './calendar';
import {personResidence,together} from './residence';
import {activeMarriage,spouseOf,changeRelationOpinion} from './relationships';
import {founderGenome,inheritGenome} from './genetics';
import {accountWallet,transferAccount} from './obligations';
import {actHousehold,householdReason,type TaughtSkill} from './householdPlans';
import {serviceBusy} from './assignments';
import {detained} from './custodyState';
import {defaultTraits,type Trait} from './social';

/** Gameplay settings, not historical fertility estimates. All dates share the world calendar. */
export interface Pregnancy {id:number;father:string;mother:string;family:string;since:number;due:number;status:'expecting'|'born'|'ended';child:string|null}
export interface FamilyMoment {id:number;key:string;kind:'childhood'|'aspiration'|'inlaw'|'bereavement';person:string;actor:string;created:number;status:'pending'|'resolved';choice:string|null}
export interface HouseholdLife {
 version:1;since:number;lastMonthly:number;seed:number;nextId:number;
 plans:Record<string,{trying:boolean;family:string}>;pregnancies:Pregnancy[];
 moments:FamilyMoment[];milestones:Record<string,number>;rest:Record<string,number>;
 bills:Record<string,{day:number;due:number;paid:number}>;
}
export type FamilyCommand={type:'familyLife';action:'plan';trying:boolean;family:string}|{type:'familyLife';action:'rest'|'resume'}|{type:'familyLife';action:'resolve';id:number;choice:'encourage'|'discipline'|'decline';teacher?:string};
export function ensureHouseholdLife(w:World){return w.householdLife??={version:1,since:w.day,lastMonthly:monthStart(w.day,w.scriptId),seed:734611,nextId:1,plans:{},pregnancies:[],moments:[],milestones:{},rest:{},bills:{}};}
function draw(w:World){const s=ensureHouseholdLife(w);s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
function name(w:World,id:string){return getPerson(w,id)?.name??id;}
function log(w:World,text:string){w.chronicle.push({day:w.day,person:'player',text});w.chronicle=w.chronicle.slice(-100);}
export function resting(w:World,id:string){return (w.householdLife?.rest[id]??0)>w.day;}
/** Domestic guardianship is derived from living kin and never grants public authority. */
export function familyGuardian(w:World,id:string){if((ageAt(w,id)??16)>=16)return null;const parents=parentLinksOf(w).filter(p=>p.child===id).map(p=>p.parent),family=getPerson(w,id)?.family;return [...parents,...(family?familyMembersOf(w,family).map(p=>p.id):[])].find(p=>p!==id&&isAlive(w,p)&&(ageAt(w,p)??0)>=18&&!detained(w,p))??null;}
export function familyPlanningReason(w:World,id=w.characterId!){
 const spouse=spouseOf(w,id),a=getPerson(w,id),b=spouse?getPerson(w,spouse):null;
 if(!a||!b)return '须有当前主要配偶';
 if(!isAlive(w,id)||!isAlive(w,b.id))return '双方须在世';
 const mother=a.sex==='female'?a:b,father=a.sex==='male'?a:b;
 if(a.sex===b.sex||(ageAt(w,mother.id)??0)<18||(ageAt(w,mother.id)??100)>45||(ageAt(w,father.id)??0)<18)return '筹划添丁须双方成年，女方 18 至 45 岁（游戏规则）';
 if(!together(w,id,b.id)||detained(w,id)||detained(w,b.id))return '夫妻须实际同城驻留且未被拘押';
 if([id,b.id].some(p=>(lifeOf(w,p)?.health??0)<50||!!lifeOf(w,p)?.illness))return '双方须无疾病且健康至少 50';
 if(w.householdLife?.pregnancies.some(p=>p.mother===mother.id&&p.status==='expecting'))return '已有孕期安排';
 const last=w.householdLife?.pregnancies.filter(p=>p.mother===mother.id&&p.status==='born').at(-1);
 if(last&&w.day-last.due<720)return '上次出生后须间隔 720 日';
 if(Object.keys(w.generatedPeople??{}).length+(w.householdLife?.pregnancies.filter(p=>p.status==='expecting').length??0)>=2000||(w.householdLife?.pregnancies.length??0)>=2000)return '本局生成角色已达 2000 人容量';
 return '';
}
export function familyMomentSkill(_w:World,id:string):TaughtSkill {const code=[...id].reduce((n,c)=>n+c.charCodeAt(0),0);return (['stewardship','martial','diplomacy'] as const)[code%3];}
export function familyCommandReason(w:World,c:FamilyCommand){
 const actor=w.characterId;if(!actor||!isAlive(w,actor)||w.campaign?.status!=='active')return '当前人物无法处理家事';
 if(c.action==='plan'){
  if(typeof c.trying!=='boolean')return '无效家庭意向';
  const spouse=spouseOf(w,actor);if(!spouse)return '须先成婚';
  if(![getPerson(w,actor)?.family,getPerson(w,spouse)?.family].includes(c.family))return '子女家支须选双亲之一';
  return c.trying?familyPlanningReason(w):'';
 }
 if(c.action==='rest')return !lifeOf(w,actor)?.illness&&(lifeOf(w,actor)?.injuryUntil??0)<=w.day?'当前没有疾病或军中伤情':resting(w,actor)?'正在休养':personResidence(w,actor).traveling?'须抵达后休养':serviceBusy(w,actor)?'请先交接当前公务、军职或培养安排，再休养':'';
 if(c.action==='resume')return resting(w,actor)?'':'当前未在休养';
 if(c.action!=='resolve'||!['encourage','discipline','decline'].includes(c.choice))return '无效家事选择';
 const event=w.householdLife?.moments.find(e=>e.id===c.id);
 if(!event||event.status!=='pending'||event.actor!==actor)return '此事已处理或不由你决定';
 if(!isAlive(w,event.person))return c.choice==='decline'?'':'当事人已故，请结束此事';
 if(c.choice==='decline')return '';
 if(event.kind==='aspiration'&&c.choice==='encourage')return householdReason(w,{type:'household',action:'educate',target:event.person,teacher:c.teacher??'',skill:familyMomentSkill(w,event.person)});
 if(event.kind==='inlaw'){
  const spouse=spouseOf(w,actor);if(!spouse||!relativesOf(w,spouse,'ancestors').concat(relativesOf(w,spouse,'descendants')).some(p=>p.id===event.person))return '姻亲关系已变化，请结束此事';
  const amount=c.choice==='encourage'?100:30,a=accountWallet(w,'person:'+actor),b=accountWallet(w,'person:'+event.person);
  return !a||!b||a.read()<amount||b.read()+amount>b.capacity?'私财余额或收款容量不足':'';
 }
 if(event.kind==='bereavement'&&c.choice==='encourage')return personResidence(w,actor).traveling||serviceBusy(w,actor)?'须先结束出行或交接公务再守丧':'';
 return '';
}
export function actFamily(w:World,c:FamilyCommand){const reason=familyCommandReason(w,c);if(reason)throw new Error(reason);const s=ensureHouseholdLife(w),a=w.characterId!;
 if(c.action==='plan'){s.plans[activeMarriage(w,a)!.id]={trying:c.trying,family:c.family};log(w,c.trying?'夫妻筹划添丁；每月依实际共同居所与健康判断。':'暂缓添丁；已经开始的孕期继续。');return;}
 if(c.action==='rest'){s.rest[a]=w.day+30;log(w,'安排休养三十日，暂停新出行与亲办差事；完成后健康恢复 +8，军中伤期缩短三十日。');return;}
 if(c.action==='resume'){delete s.rest[a];log(w,'结束休养，恢复亲办事务。');return;}
 if(c.action!=='resolve')throw new Error('无效家事命令');
 const e=s.moments.find(e=>e.id===c.id)!;
 if(c.choice!=='decline'){
  if(e.kind==='childhood'){
   const trait:Trait=c.choice==='encourage'?'gregarious':'diligent';const traits=w.social!.traits[e.person]??=defaultTraits(e.person);
   if(!traits.includes(trait))traits.push(trait);
   changeRelationOpinion(w,a,e.person,c.choice==='encourage'?5:-3);
  }else if(e.kind==='aspiration'){
   if(c.choice==='encourage')actHousehold(w,{type:'household',action:'educate',target:e.person,teacher:c.teacher!,skill:familyMomentSkill(w,e.person)});
   else {const traits=w.social!.traits[e.person]??=defaultTraits(e.person);if(!traits.includes('frugal'))traits.push('frugal');changeRelationOpinion(w,a,e.person,-5);}
  }else if(e.kind==='inlaw'){
   transferAccount(w,'person:'+a,'person:'+e.person,c.choice==='encourage'?100:30,'姻亲家用相助');changeRelationOpinion(w,a,e.person,c.choice==='encourage'?10:4);
  }else if(e.kind==='bereavement'&&c.choice==='encourage'){s.rest[a]=w.day+30;if(w.social)w.social.stress=Math.max(0,w.social.stress-8);}
 }else if(e.kind==='inlaw'&&isAlive(w,e.person))changeRelationOpinion(w,a,e.person,-3);
 e.status='resolved';e.choice=c.choice;log(w,'家事「'+familyMomentTitle[e.kind]+'」已处理：'+familyChoiceLabels[e.kind][c.choice]+'。');
}
export const familyMomentTitle={childhood:'初识世事',aspiration:'成年志向',inlaw:'姻亲请托',bereavement:'丧偶与家事'};
export const familyChoiceLabels={childhood:{encourage:'鼓励交游',discipline:'督促勤学',decline:'任其成长'},aspiration:{encourage:'顺其志向，延师研习',discipline:'勉励持家',decline:'尊重自主安排'},inlaw:{encourage:'资助 100 钱',discipline:'量力资助 30 钱',decline:'婉拒请托'},bereavement:{encourage:'守丧三十日',discipline:'维持日常',decline:'亲自料理后事'}};
function moment(w:World,key:string,kind:FamilyMoment['kind'],person:string,actor:string){const s=ensureHouseholdLife(w);if(s.moments.some(e=>e.key===key))return;s.moments.push({id:s.nextId++,key,kind,person,actor,created:w.day,status:'pending',choice:null});}
/** Registers a real person once. No global catalogue mutation, fabricated historical identity or cash grant. */
export function deliverChild(w:World,p:Pregnancy){
 if(p.status!=='expecting')return;
 const s=ensureHouseholdLife(w);if(!isAlive(w,p.mother)){p.status='ended';log(w,'孕期因母亲离世终止。');return;}
 if(p.due>w.day)return;
 const father=getPerson(w,p.father)!,mother=getPerson(w,p.mother)!,id='born-'+p.id;
 if(w.generatedPeople?.[id])throw new Error('出生编号重复');
 const inherited=inheritGenome(w.identities?.people[p.father]?.genome??founderGenome(p.father),w.identities?.people[p.mother]?.genome??founderGenome(p.mother),s.seed);s.seed=inherited.nextSeed;
 const sex:'male'|'female'=draw(w)<.5?'male':'female',surname=familyById[p.family]?.surname??father.name.slice(0,1),given=['宁','安','昭','清','衡','和','昭宁','景安','文清','怀远'][Math.floor(draw(w)*10)],childName=surname+given;
 const residence=personResidence(w,p.mother).site,realm=allegianceRealm(w,p.mother)??mother.realm;
 const note='本局模拟出生；双亲为'+father.name+'、'+mother.name+'，非历史人物记录。';
 const person={id,name:childName,realm,sex,adult:false,family:p.family,status:'fictional' as const,note,home:residence};
 (w.generatedPeople??={})[id]={person,character:{id,name:childName,family:p.family,polity:realm,title:'家族子弟',role:'scholar',home:residence,biography:note,sources:[]},birthDay:w.day,father:p.father,mother:p.mother};
 if(w.families)w.families.prestige[id]=0;
 if(w.realm)(w.realm.personalInfluence??={})[id]=0;
 w.life!.people[id]={health:100,illness:null,careUntil:0,death:null};
 w.identities!.people[id]={sex,culture:w.identities?.people[p.mother]?.culture??(realm==='liang'?'southern':'northern'),cultureId:w.identities?.people[p.mother]?.cultureId??'unknown',genome:inherited.genome};
 w.relationships!.reserves[id]=0;w.relationships!.maritalBasis[id]='free';w.social!.traits[id]=[];
 if(w.mobility)w.mobility.residences[id]={site:residence,journey:null};
 p.child=id;p.status='born';log(w,childName+'出生，加入'+(familyById[p.family]?.name??'家族')+'。');
}
export function advanceHouseholdLife(w:World){
 if(w.mode!=='sandbox'||!w.life||!w.relationships||!w.social)return;
 const s=ensureHouseholdLife(w);
 for(const p of s.pregnancies)deliverChild(w,p);
 for(const e of s.moments)if(e.status==='pending'&&(!isAlive(w,e.actor)||!isAlive(w,e.person))){e.status='resolved';e.choice='decline';}
 for(const [id,until] of Object.entries(s.rest)){if(!isAlive(w,id)){delete s.rest[id];continue;}if(w.day<until)continue;const p=lifeOf(w,id);if(p){p.health=Math.min(healthCapacity(ageAt(w,id)??0),p.health+8);if((p.injuryUntil??0)>w.day)p.injuryUntil=Math.max(w.day,p.injuryUntil!-30);}delete s.rest[id];log(w,name(w,id)+'完成三十日休养，恢复健康并缓解伤情。');}
 if(!isMonthStart(w.day,w.scriptId)||s.lastMonthly>=w.day)return;s.lastMonthly=w.day;
 for(const marriage of w.relationships.marriages){
  if(marriage.until!==null)continue;
  const a=marriage.a,b=marriage.b,player=[a,b].includes(w.characterId!),children=Object.values(w.generatedPeople??{}).filter(p=>[p.father,p.mother].includes(a)).length;
  const plan=s.plans[marriage.id],trying=plan?.trying??(!player&&marriage.origin==='simulation'&&children<2);
  if(!trying||familyPlanningReason(w,a)||draw(w)>=.18)continue;
  const father=getPerson(w,a)!.sex==='male'?a:b,mother=father===a?b:a;
  s.pregnancies.push({id:s.nextId++,father,mother,family:plan?.family??getPerson(w,father)!.family,since:w.day,due:w.day+270,status:'expecting',child:null});
  log(w,name(w,mother)+'有孕，预计二百七十日后添丁。');
 }
 // Only dependent generated children consume this small household provision; no duplicate NPC starting purse.
 const costs=new Map<string,number>();
 for(const child of Object.values(w.generatedPeople??{})){
  const id=child.person.id;if(!isAlive(w,id)||(ageAt(w,id)??0)>=16)continue;
  const parents=[child.mother,child.father].filter(p=>isAlive(w,p)&&!!accountWallet(w,'person:'+p)),available=(id:string)=>(accountWallet(w,'person:'+id)?.read()??0)-(costs.get(id)??0);const parent=parents.find(p=>available(p)>=2)??parents.sort((a,b)=>available(b)-available(a))[0];if(parent)costs.set(parent,(costs.get(parent)??0)+2);
 }
 for(const [id,due] of costs){const wallet=accountWallet(w,'person:'+id)!,paid=Math.min(due,wallet.read());wallet.write(wallet.read()-paid);s.bills[id]={day:w.day,due,paid};if(id===w.characterId&&paid<due)log(w,'抚育生活支出不足：应付 '+due+' 钱，实付 '+paid+' 钱。');}
 const actor=w.characterId!;
 for(const person of allPeople(w)){
  if(!isAlive(w,person.id))continue;const age=ageAt(w,person.id)??0,stage=age>=16?2:age>=8?1:0;
  const previous=s.milestones[person.id];s.milestones[person.id]=stage;
  // Existing saves establish a baseline, never replay an adult's childhood.
  if(previous===undefined&&!w.generatedPeople?.[person.id]||!stage||stage<=(previous??0))continue;
  if(relativesOf(w,actor,'descendants').some(p=>p.id===person.id)||person.id===actor)moment(w,'growth:'+person.id+':'+stage,stage===1?'childhood':'aspiration',person.id,actor);

 }
 const spouse=spouseOf(w,actor);
 if(spouse){const marriage=activeMarriage(w,actor)!;if(w.day-marriage.from>=180){const relative=relativesOf(w,spouse,'ancestors').concat(relativesOf(w,spouse,'descendants')).find(p=>p.id!==actor&&isAlive(w,p.id)&&(ageAt(w,p.id)??0)>=16&&(accountWallet(w,'person:'+p.id)?.read()??1000)<100);if(relative)moment(w,'inlaw:'+marriage.id,'inlaw',relative.id,actor);}}
 for(const m of w.relationships.marriages)if(m.until!==null&&[m.a,m.b].includes(actor)){const other=m.a===actor?m.b:m.a;if(lifeOf(w,other)?.death?.day===m.until&&m.until>=s.since)moment(w,'grief:'+m.id,'bereavement',actor,actor);}
}
