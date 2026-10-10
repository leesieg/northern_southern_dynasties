import type {World} from './types';
import type {RealmId} from './realm';
import type {PowerArrangement,PowerGoal} from './powerPolitics';
import {getPerson,allPeople} from './personRegistry';
import {isAlive,ageAt} from './lifeState';
import {die} from './life';
import {detained} from './custodyState';
import {detainPerson} from './custody';
import {personResidence,together,presentAt} from './residence';
import {allegianceRealm} from './officeEligibility';
import {governmentOf} from './government';
import {armyCommander} from './mobility';
import {authorityScore,relationOpinion,changeRelationOpinion,relationHooks,setFriendship,powerBasis,validRegency,resetAuthority,friendship} from './relationships';
import {pair,attributes} from './social';
import {courtOf,courtPolicyActive,actCourt,courtPolicyReason} from './court';
import {policyIds,type CourtPolicy} from '../data/court';
import {nobleRanks,nobleTitle,nobilityReason,actNobility,type NobleRank} from './nobility';
import {rulerEligibility} from './claims';
import {worldRealms} from './polityRuntime';
import {monthStart} from './calendar';
import {lifestyleEffects,lifestylePublicOffice,recordLifestylePractice} from './lifestyle';
import {accountWallet} from './obligations';
import {fiscalRecord} from './treasury';

export type SchemeKind='befriend'|'woo'|'alienate'|'favor'|'recruit'|'control'|'abduct'|'murder';
export type SchemeSlot='personal'|'hostile';
export type SchemeStatus='active'|'succeeded'|'failed'|'cancelled'|'invalid';
export type SchemePromise='gift'|'office'|'command'|'title'|'policy';
export interface SchemeTerms {nobleRank?:NobleRank;nobleName?:string;nobleRites?:boolean;courtPolicy?:CourtPolicy}
export type IntrigueStart=SchemeTerms & {type:'intrigue';action:'start';kind:SchemeKind;target:string;secondary?:string;beneficiary?:string;executive?:string;realm?:RealmId;powerGoal?:PowerGoal;promise?:SchemePromise;agent?:string};
export type IntrigueCommand=IntrigueStart|{type:'intrigue';action:'cancel';scheme:number};
export interface Scheme extends SchemeTerms {
 nobleGrantor?:string;
 id:number;kind:SchemeKind;slot:SchemeSlot;actor:string;target:string;secondary:string|null;beneficiary:string|null;executive:string|null;realm:RealmId|null;powerGoal:PowerGoal|null;promise:SchemePromise|null;agent:string|null;
 started:number;due:number;lastAdvanced:number;progress:number;chance:number;exposure:number;successRoll:number;exposureRoll:number;cost:number;spent:number;gift:number;hookCost:number;status:SchemeStatus;discovered:boolean;exposed:boolean;ended:number|null;reason:string;basis:string|null;
 offices:string[];commands:number[];
}
export interface SchemeSupport extends SchemeTerms {nobleGrantor?:string;scheme:number;realm:RealmId;sponsor:string;person:string;beneficiary:string;executive:string;goal:PowerGoal;promise:SchemePromise;offices:string[];commands:number[];since:number;until:number;status:'pledged'|'awaiting'|'honored'|'broken'|'expired';applied:boolean;appliedDay?:number;fulfillmentDue?:number;lastFulfillmentAttempt?:number}
export interface IntrigueState {version:1;nextId:number;seed:number;schemes:Scheme[];supports:SchemeSupport[];lastNPCReview?:number}
export const schemeNames:Record<SchemeKind,string>={befriend:'交好',woo:'拉拢',alienate:'离间',favor:'制造人情',recruit:'密约策反',control:'挟制',abduct:'绑架',murder:'谋害'};
const rules:Record<SchemeKind,{cost:number;days:number;slot:SchemeSlot;base:number;exposure:number}>={
 befriend:{cost:25,days:18,slot:'personal',base:48,exposure:5},woo:{cost:40,days:24,slot:'personal',base:40,exposure:12},favor:{cost:45,days:21,slot:'personal',base:40,exposure:12},recruit:{cost:80,days:30,slot:'personal',base:35,exposure:25},alienate:{cost:60,days:28,slot:'hostile',base:35,exposure:35},control:{cost:120,days:40,slot:'hostile',base:20,exposure:45},abduct:{cost:120,days:35,slot:'hostile',base:25,exposure:50},murder:{cost:160,days:45,slot:'hostile',base:15,exposure:60},
};
const cap=(n:number,min=0,max=100)=>Math.max(min,Math.min(max,Math.round(n)));
export function ensureIntrigue(w:World){return w.intrigue??={version:1,nextId:1,seed:917543,schemes:[],supports:[],lastNPCReview:w.day};}
function offices(w:World,id:string,r:RealmId){const g=governmentOf(w,r);if(!g)return [];return [...(g.executives.includes(id)?['executive']:[]),...(g.ruler===id?['ruler']:[]),...Object.entries(g.court?.ministries??{}).filter(([,holder])=>holder===id).map(([key])=>'ministry:'+key),...Object.entries(w.realm?.cities??{}).filter(([,c])=>c.owner===r&&c.governor===id).map(([site])=>'city:'+site),...Object.entries(w.realm?.local?.seats??{}).filter(([key,seat])=>key.startsWith(r+'|')&&seat.holder===id).map(([key])=>'local:'+key)];}
function commands(w:World,id:string,r:RealmId){return w.realm?.armies.filter(a=>a.realm===r&&(a.owner===id||armyCommander(w,a)===id)).map(a=>a.id!).filter(Number.isSafeInteger)??[];}
function participant(w:World,id:string){return !!getPerson(w,id)&&isAlive(w,id)&&!detained(w,id)&&(ageAt(w,id)??0)>=16;}
function accessReason(w:World,actor:string,target:string,agent:string|null){
 const at=personResidence(w,target);if(at.traveling||personResidence(w,actor).traveling)return '须等待人物抵达驻地';
 if(together(w,actor,target))return '';
 if(!agent)return '须与目标同城，或由驻目标地点的真实内应参与';
 if(agent===target||agent===actor||!participant(w,agent)||allegianceRealm(w,agent)!==allegianceRealm(w,actor)||!presentAt(w,agent,at.site))return '内应须是己方在世自由成年人，并实际驻留目标地点';
 if(w.relationships?.oaths[agent]?.lord!==actor&&relationOpinion(w,actor,agent)<40)return '内应尚未愿意参与，需效忠或对发起者好感 40';
 return '';
}
function intendedRuler(w:World,r:RealmId,goal:PowerGoal,beneficiary:string){return goal==='executive'?governmentOf(w,r)!.ruler:beneficiary;}
function titlePromiseReason(w:World,c:IntrigueStart,actor:string){
 const r=c.realm!,g=governmentOf(w,r)!,ruler=intendedRuler(w,r,c.powerGoal!,c.beneficiary!);
 if(!c.nobleRank||!Object.hasOwn(nobleRanks,c.nobleRank)||typeof c.nobleName!=='string'||c.nobleRites!==undefined&&typeof c.nobleRites!=='boolean')return '晋爵密约须明确爵级、封号和殊礼';
 const eligible=rulerEligibility(w,r,ruler,{allowFounder:c.powerGoal==='dynasty'});if(eligible)return '未来册封君主：'+eligible;
 if(c.target===ruler)return '不能许诺让拟任君主给自己册封臣爵';
 if(actor!==ruler&&actor!==c.executive)return '晋爵承诺须由拟任君主或执政者发起';
 const preview:World={...w,realm:{...w.realm!,governments:{...w.realm!.governments!,realms:{...w.realm!.governments!.realms,[r]:{...g,ruler}}}}};
 return nobilityReason(preview,{type:'nobility',action:'grant',person:c.target,rank:c.nobleRank,name:c.nobleName,rites:c.nobleRites??false},ruler);
}
function policyPromiseReason(w:World,c:IntrigueStart,actor:string){
 if(!c.courtPolicy||!policyIds.includes(c.courtPolicy))return '国策密约须选择真实安定方略';
 if(!courtOf(w,c.realm!))return '目标政权没有可执行的朝廷方略';
 const ruler=intendedRuler(w,c.realm!,c.powerGoal!,c.beneficiary!);
 return actor!==ruler&&actor!==c.executive?'国策承诺须由拟任君主或执政者发起':'';
}
function specificReason(w:World,c:IntrigueStart,actor:string){
 if(c.kind==='alienate'&&(!c.secondary||c.secondary===actor||c.secondary===c.target||!participant(w,c.secondary)))return '离间须指定另一位在世自由成年人';
 if(c.kind==='favor'&&relationHooks(w,actor,c.target)>=3)return '最多保留三份人情';
 if(c.kind==='control'){
  const r=allegianceRealm(w,actor),g=r?governmentOf(w,r):undefined;
  if(!r||allegianceRealm(w,c.target)!==r||g?.ruler!==c.target)return '只能挟制本国名义君主';
  if(validRegency(w,r)?.controller===actor)return '已经掌握实际执政权';
  if(authorityScore(w,actor)<20)return '需中央任职、辖地或实际权力基础';
  if(relationHooks(w,actor,c.target)<2)return '需掌握君主两份人情';
  if(g.task||g.court?.founding)return '先结束制度或建朝议程';
 }
 if(c.kind==='abduct'){
  const r=allegianceRealm(w,actor),site=personResidence(w,c.target).site;
  if(!r||w.realm?.cities[site]?.controller!==r)return '绑架须能在己方实际控制的地点私人看管目标';
  if(Object.values(w.custody?.records??{}).some(p=>p.cause==='abduction'&&p.captorPerson===actor))return '私人看管容量为一人，须先结束已有绑架拘押';
 }
 if(c.kind==='recruit'){
  const r=c.realm,g=r?governmentOf(w,r):undefined;
  if(!r||!g||allegianceRealm(w,actor)!==r||allegianceRealm(w,c.target)!==r)return '政治招揽须针对同一政权的真实参与人';
  if(!c.beneficiary||!c.executive||![c.beneficiary,c.executive].every(id=>participant(w,id)&&allegianceRealm(w,id)===r)||!c.powerGoal||!['executive','ruler','dynasty'].includes(c.powerGoal))return '须明确拟拥立者、执政者和权力目标';
  if(!c.promise||!['gift','office','command','title','policy'].includes(c.promise))return '须明确礼金、保留职权、晋爵或安定国策的交换承诺';
  if(w.intrigue?.supports.some(s=>s.sponsor===actor&&s.person===c.target&&s.realm===r&&s.beneficiary===c.beneficiary&&s.executive===c.executive&&s.goal===c.powerGoal&&s.status==='pledged'&&s.until>w.day))return '目标已承诺支持同一权力安排';
  if(c.promise==='office'&&!offices(w,c.target,r).length)return '目标没有可以承诺保留的实际官职';
  if(c.promise==='command'&&!commands(w,c.target,r).length)return '目标没有可以承诺保留的实际兵权';
  if(c.promise==='title'){const why=titlePromiseReason(w,c,actor);if(why)return why;}
  if(c.promise==='policy'){const why=policyPromiseReason(w,c,actor);if(why)return why;}
  if(c.promise==='gift'){const b=accountWallet(w,'person:'+c.target);if(!b||b.read()+40>b.capacity)return '目标私财账户无法接收承诺礼金';}
 }
 return '';
}
export function intrigueDefense(w:World,actor:string,target:string,kind:SchemeKind){
 if(['befriend','woo','favor'].includes(kind))return 0;const own=lifestyleEffects(w,{kind:'defense',public:lifestylePublicOffice(w,target)},target),r=allegianceRealm(w,target),g=r?governmentOf(w,r):undefined,protectors=lifestylePublicOffice(w,target)?[g?.court?.ministries.censorate,g?.court?.ministries.secretariat].filter((id):id is string=>!!id&&id!==target&&id!==actor&&isAlive(w,id)&&!detained(w,id)&&allegianceRealm(w,id)===r&&together(w,id,target)):[];
 const guard=Math.max(0,...protectors.map(id=>lifestyleEffects(w,{kind:'defense',public:true},id).counterIntrigue));return Math.max(own.counterIntrigue,guard)+(['abduct','murder'].includes(kind)?own.personalDefense:0);
}
export function intrigueQuote(w:World,c:IntrigueCommand,actor=w.characterId??'fictional'){
 const kind=c.action==='start'?c.kind:'befriend',rule=Object.hasOwn(rules,kind)?rules[kind]:rules.befriend,target=c.action==='start'?c.target:actor,r=c.action==='start'&&c.kind==='recruit'?c.realm:undefined,g=r?governmentOf(w,r):undefined,publicWork=c.action==='start'&&c.kind==='recruit'&&c.powerGoal==='executive'&&!!g&&g.ruler===c.beneficiary&&g.executives.includes(actor)&&g.executives.includes(c.executive!),bonus=lifestyleEffects(w,{kind:'scheme',public:!!publicWork},actor),a=attributes(w,actor,publicWork?'public':'private'),b=attributes(w,target),defense=intrigueDefense(w,actor,target,kind);
 const parts=[{label:'行动基础',value:rule.base},{label:'发起者能力',value:Math.round((rule.slot==='personal'?a.diplomacy:a.intrigue)*2)},{label:'目标谋略',value:-b.intrigue},{label:'交往基础',value:rule.slot==='personal'?Math.round(relationOpinion(w,actor,target)/5):0},{label:'生活重心与技能',value:publicWork?bonus.publicIntrigue:bonus.intrigueSuccess+(rule.slot==='personal'?bonus.personalSuccess:bonus.hostileSuccess)+(kind==='befriend'?lifestyleEffects(w,{kind:'personal'},actor).scheme:0)},{label:'目标与有效保护者反制',value:defense?-defense:0}];
 const chance=cap(parts.reduce((n,p)=>n+p.value,0),5,95),exposure=cap(rule.exposure+Math.round(b.intrigue-a.intrigue)-bonus.intrigueSecrecy+defense,5,95),gift=c.action==='start'&&kind==='recruit'&&c.promise==='gift'?40:0,cost=rule.cost+gift;
 const reason=(()=>{
  if(c.action==='cancel'){const s=w.intrigue?.schemes.find(s=>s.id===c.scheme);return !s||s.status!=='active'?'计谋已结束':s.actor!==actor?'只能撤回自己的计谋':'';}
  if(w.campaign?.status!=='active'||!w.realm||!w.relationships)return '需在进行中的历史沙盒安排计谋';
  if(!Object.hasOwn(rules,c.kind))return '未知计谋类型';
  if(!participant(w,actor)||!participant(w,c.target)||actor===c.target)return '发起者与目标须为不同的在世自由成年人';
  if(w.intrigue?.schemes.some(s=>s.actor===actor&&s.slot===rule.slot&&s.status==='active')||rule.slot==='hostile'&&w.relationships.scheme?.actor===actor&&w.relationships.scheme.kind==='control'||rule.slot==='personal'&&(w.relationships.scheme?.actor===actor&&w.relationships.scheme.kind==='befriend'||actor===w.characterId&&!!w.social?.scheme))return `已有${rule.slot==='personal'?'个人':'敌对'}计谋，每类最多一项`;
  const access=accessReason(w,actor,c.target,c.agent??null);if(access)return access;
  const specific=specificReason(w,c,actor);if(specific)return specific;
  return (accountWallet(w,'person:'+actor)?.read()??0)<cost?'发起者私财不足 '+cost+' 钱':'';
 })();
 const futureCost=c.action==='start'&&c.kind==='recruit'&&c.realm&&governmentOf(w,c.realm)&&c.beneficiary&&c.executive&&c.powerGoal?(c.promise==='title'&&c.nobleRank&&Object.hasOwn(nobleRanks,c.nobleRank)?{centralCoins:nobleRanks[c.nobleRank].cost+(c.nobleRites?160:0),influence:20,payer:intendedRuler(w,c.realm,c.powerGoal,c.beneficiary),condition:'权力安排落实后，由实际君主按当时功绩、影响力、封号和公库条件册封；当前不扣未来费用'}:c.promise==='policy'?{centralCoins:0,influence:courtPolicyActive(w,c.realm)===c.courtPolicy?0:20,payer:c.executive,condition:'权力安排落实且朝局安定后，由实际执政者实施；采用新方略需本人影响力20，当前不扣未来费用'}:null):null;
 return {cost,days:rule.days,chance,exposure,parts,slot:rule.slot,gift,hookCost:kind==='control'?2:0,reason,futureCost};
}
function draw(s:IntrigueState){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
function log(w:World,s:Scheme,text:string){if(s.actor!==w.characterId&&(!s.discovered||s.target!==w.characterId&&s.secondary!==w.characterId))return;w.chronicle.push({day:w.day,person:'player',text});w.chronicle=w.chronicle.slice(-100);}
function end(w:World,s:Scheme,status:SchemeStatus,reason:string){s.status=status;s.ended=w.day;s.reason=reason;log(w,s,`${s.actor===w.characterId?'你的':s.exposed?getPerson(w,s.actor)?.name+'的':'针对你的'}${schemeNames[s.kind]}计谋：${reason}。`);}
export function actIntrigue(w:World,c:IntrigueCommand,actor=w.characterId??'fictional'){
 const q=intrigueQuote(w,c,actor);if(q.reason)throw new Error(q.reason);
 const state=ensureIntrigue(w);if(c.action==='cancel'){end(w,state.schemes.find(s=>s.id===c.scheme)!,'cancelled','主动撤回，已支付筹办费不退');return;}
 const wallet=accountWallet(w,'person:'+actor)!,promise=c.kind==='recruit'?c.promise??null:null,r=c.kind==='recruit'?c.realm!:allegianceRealm(w,actor)??null;
 wallet.write(wallet.read()-q.cost);if(q.gift){const receiver=accountWallet(w,'person:'+c.target)!;receiver.write(receiver.read()+q.gift);}
 if(r){fiscalRecord(w,r,'person:'+actor,'expense',q.cost-q.gift,'计谋筹办：'+schemeNames[c.kind]);if(q.gift)fiscalRecord(w,r,'person:'+actor,'person:'+c.target,q.gift,'政治招揽承诺礼金');}
 if(q.hookCost){const key=pair(actor,c.target);if(w.social&&Object.hasOwn(w.social.hooks,key))w.social.hooks[key]-=q.hookCost;else w.relationships!.hooks[key]=(w.relationships!.hooks[key]??0)-q.hookCost;}
 const s:Scheme={id:state.nextId++,kind:c.kind,slot:q.slot,actor,target:c.target,secondary:c.kind==='alienate'?c.secondary??null:null,beneficiary:c.kind==='recruit'?c.beneficiary??null:null,executive:c.kind==='recruit'?c.executive??null:null,realm:r,powerGoal:c.kind==='recruit'?c.powerGoal??null:null,promise,agent:c.agent??null,started:w.day,due:w.day+q.days,lastAdvanced:w.day,progress:0,chance:q.chance,exposure:q.exposure,successRoll:draw(state),exposureRoll:draw(state),cost:q.cost,spent:q.cost-q.gift,gift:q.gift,hookCost:q.hookCost,status:'active',discovered:false,exposed:false,ended:null,reason:'',basis:c.kind==='control'&&r?powerBasis(w,r):null,...(promise==='title'?{nobleRank:c.nobleRank!,nobleName:c.nobleName!.trim(),nobleRites:c.nobleRites??false,nobleGrantor:intendedRuler(w,r!,c.powerGoal!,c.beneficiary!)}:promise==='policy'?{courtPolicy:c.courtPolicy!}:{}),offices:promise==='office'&&r?offices(w,c.target,r):[],commands:promise==='command'&&r?commands(w,c.target,r):[]};
 state.schemes.push(s);log(w,s,'开始'+schemeNames[s.kind]+'：私财支出 '+s.cost+' 钱，预计 '+q.days+' 日。');
}
function ongoingReason(w:World,s:Scheme){
 if(w.campaign?.status!=='active')return '本局已结束';
 if(![s.actor,s.target,...(s.secondary?[s.secondary]:[]),...(s.agent?[s.agent]:[]),...(s.beneficiary?[s.beneficiary]:[]),...(s.executive?[s.executive]:[])].every(id=>participant(w,id)))return '参与人离世、被拘押或移除';
 const access=accessReason(w,s.actor,s.target,s.agent);if(access)return access;
 if(s.promise==='title'&&s.nobleGrantor!==intendedRuler(w,s.realm!,s.powerGoal!,s.beneficiary!))return '拟任册封君主已改变';
 if(s.kind==='control'&&(powerBasis(w,s.realm!)!==s.basis||authorityScore(w,s.actor)<20))return '朝廷格局或发起者实际权力基础改变';
 const c:IntrigueStart={type:'intrigue',action:'start',kind:s.kind,target:s.target,secondary:s.secondary??undefined,beneficiary:s.beneficiary??undefined,executive:s.executive??undefined,realm:s.realm??undefined,powerGoal:s.powerGoal??undefined,promise:s.promise??undefined,agent:s.agent??undefined,...(s.promise==='title'?{nobleRank:s.nobleRank,nobleName:s.nobleName,nobleRites:s.nobleRites,nobleGrantor:s.nobleGrantor}:s.promise==='policy'?{courtPolicy:s.courtPolicy}:{})};
 // Hooks paid at start; the other access and promise conditions remain current.
 if(s.kind==='control')return '';
 return specificReason(w,c,s.actor);
}
function resolve(w:World,s:Scheme){
 s.progress=100;s.exposed=s.exposureRoll*100<s.exposure;s.discovered=s.exposed;
 if(s.exposed&&s.slot==='hostile'){changeRelationOpinion(w,s.actor,s.target,-30);setFriendship(w,s.actor,s.target,'rival');}
 if(s.successRoll*100>=s.chance){end(w,s,'failed','未能奏效'+(s.exposed?'，发起者已暴露':''));return;}
 switch(s.kind){
  case 'befriend':setFriendship(w,s.actor,s.target,'friend');changeRelationOpinion(w,s.actor,s.target,20);break;
  case 'woo':changeRelationOpinion(w,s.actor,s.target,25);changeRelationOpinion(w,s.target,s.actor,10);break;
  case 'alienate':changeRelationOpinion(w,s.secondary!,s.target,-35);changeRelationOpinion(w,s.target,s.secondary!,-20);setFriendship(w,s.target,s.secondary!,'rival');break;
  case 'favor':{const key=pair(s.actor,s.target);if(w.social&&Object.hasOwn(w.social.hooks,key))w.social.hooks[key]=Math.min(3,w.social.hooks[key]+1);else w.relationships!.hooks[key]=Math.min(3,(w.relationships!.hooks[key]??0)+1);break;}
  case 'recruit':ensureIntrigue(w).supports.push({scheme:s.id,realm:s.realm!,sponsor:s.actor,person:s.target,beneficiary:s.beneficiary!,executive:s.executive!,goal:s.powerGoal!,promise:s.promise!,offices:s.offices,commands:s.commands,...(s.promise==='title'?{nobleRank:s.nobleRank,nobleName:s.nobleName,nobleRites:s.nobleRites,nobleGrantor:s.nobleGrantor}:s.promise==='policy'?{courtPolicy:s.courtPolicy}:{}),since:w.day,until:w.day+180,status:'pledged',applied:false});break;
  case 'control':{const g=governmentOf(w,s.realm!)!;w.relationships!.regencies[s.realm!]={realm:s.realm!,regimeId:g.regimeId,basis:powerBasis(w,s.realm!),ruler:s.target,controller:s.actor,since:w.day,grip:65,origin:'scheme'};resetAuthority(w,s.realm!);s.exposed=true;s.discovered=true;break;}
  case 'abduct':{if(!detainPerson(w,s.target,s.realm!,personResidence(w,s.target).site,'abduction','scheme:'+s.id,null,s.actor)){end(w,s,'invalid','目标已无法收押');return;}break;}
  case 'murder':die(w,s.target,'murder');break;
 }
 recordLifestylePractice(w,s.actor,s.kind==='befriend'?'diplomacy':'intrigue');end(w,s,'succeeded','已奏效'+(s.exposed?'，发起者已暴露':''));
}
function keepsPromise(w:World,s:SchemeSupport){
 if(s.promise==='title'){if(!s.applied)return s.nobleGrantor===intendedRuler(w,s.realm,s.goal,s.beneficiary);const t=nobleTitle(w,s.person,s.realm);return !!t&&t.grantor===s.nobleGrantor&&nobleRanks[t.rank].weight>=nobleRanks[s.nobleRank!].weight&&t.name===s.nobleName&&(!s.nobleRites||t.rites)&&t.since>=(s.appliedDay??s.since);}
 if(s.promise==='policy')return !s.applied||courtPolicyActive(w,s.realm)===s.courtPolicy;
 return s.promise==='gift'||s.promise==='office'&&s.offices.every(x=>offices(w,s.person,s.realm).includes(x))||s.promise==='command'&&s.commands.every(x=>commands(w,s.person,s.realm).includes(x));
}
function breakPromise(w:World,s:SchemeSupport){if(s.status==='broken')return;s.status='broken';if(s.applied)changeRelationOpinion(w,s.sponsor,s.person,-35);}
function tryFulfillPromise(w:World,s:SchemeSupport){
 if(s.lastFulfillmentAttempt===w.day)return;s.lastFulfillmentAttempt=w.day;
 if(s.promise==='title'){
  const ruler=s.nobleGrantor!;if(ruler===w.characterId)return;
  const command={type:'nobility' as const,action:'grant' as const,person:s.person,rank:s.nobleRank!,name:s.nobleName!,rites:s.nobleRites??false};if(nobilityReason(w,command,ruler))return;
  const before=w.realm!.treasuries[s.realm].coins;actNobility(w,command,ruler);fiscalRecord(w,s.realm,'central:'+s.realm,'expense',before-w.realm!.treasuries[s.realm].coins,'兑现晋爵密约礼仪');
 }else if(s.promise==='policy'){
  if(s.executive===w.characterId)return;const command={type:'court' as const,action:'policy' as const,policy:s.courtPolicy!};if(!courtPolicyReason(w,command,s.executive))actCourt(w,command,s.executive);
 }
}
export function schemeSupportBonus(w:World,r:RealmId,p:PowerArrangement,person:string){return Math.min(25,(w.intrigue?.supports??[]).filter(s=>s.status==='pledged'&&!s.applied&&s.until>w.day&&s.realm===r&&s.person===person&&s.sponsor===p.sponsor&&s.beneficiary===p.beneficiary&&s.executive===p.executive&&s.goal===p.goal&&[s.sponsor,s.person,s.beneficiary,s.executive].every(id=>participant(w,id)&&allegianceRealm(w,id)===r)&&keepsPromise(w,s)).reduce(n=>n+25,0));}
/** Call only after the matching real arrangement is applied, never after a preview. */
export function consumeSchemeSupport(w:World,r:RealmId,p:PowerArrangement){const g=governmentOf(w,r);if(!g||!g.executives.includes(p.executive)||p.goal!=='executive'&&g.ruler!==p.beneficiary)return;for(const s of w.intrigue?.supports??[])if(s.status==='pledged'&&s.realm===r&&s.sponsor===p.sponsor&&s.beneficiary===p.beneficiary&&s.executive===p.executive&&s.goal===p.goal){s.applied=true;s.appliedDay=w.day;if(s.promise==='title'||s.promise==='policy'){if(s.promise==='title')s.nobleGrantor??=intendedRuler(w,s.realm,s.goal,s.beneficiary);s.fulfillmentDue=Math.min(s.until,w.day+90);s.status=keepsPromise(w,s)?'honored':'awaiting';}else {s.status=keepsPromise(w,s)?'honored':'broken';if(s.status==='broken')changeRelationOpinion(w,s.sponsor,s.person,-35);}}}
export function advanceIntrigue(w:World){const state=w.intrigue??(w.mode==='sandbox'&&w.campaign?.status==='active'&&w.relationships?ensureIntrigue(w):undefined);if(!state)return;
 for(const s of state.schemes){if(s.status!=='active'||s.lastAdvanced>=w.day)continue;s.lastAdvanced=w.day;const why=ongoingReason(w,s);if(why){end(w,s,'invalid',why+'，已支付筹办费不退');continue;}s.progress=cap((w.day-s.started)*100/(s.due-s.started));if(w.day>=s.due)resolve(w,s);else if(s.slot==='hostile'&&s.progress>=50&&s.exposureRoll*100<s.exposure){s.discovered=true;}}
 for(const s of state.supports){
  if(s.status==='broken'||s.status==='expired')continue;
  if(![s.sponsor,s.person,s.beneficiary,s.executive].every(id=>participant(w,id)&&allegianceRealm(w,id)===s.realm)){breakPromise(w,s);continue;}
  if(s.status==='awaiting'){
   if(keepsPromise(w,s)){s.status='honored';continue;}
   if(w.day>=(s.fulfillmentDue??s.until)){breakPromise(w,s);continue;}
   tryFulfillPromise(w,s);if(keepsPromise(w,s))s.status='honored';continue;
  }
  if(s.until<=w.day){s.status='expired';continue;}
  if(!keepsPromise(w,s))breakPromise(w,s);
 }

 advanceNPCIntrigue(w,state);
}
/** NPCs use existing persons, residences, wallets and court disputes. No player's stance is selected. */
function advanceNPCIntrigue(w:World,state:IntrigueState){
 if(w.mode!=='sandbox'||w.campaign?.status!=='active')return;
 state.lastNPCReview??=w.day;if(w.day-state.lastNPCReview<7)return;
 const previous=state.lastNPCReview,monthly=monthStart(previous,w.scriptId)!==monthStart(w.day,w.scriptId);state.lastNPCReview=w.day;
 const retired=new Set(w.social?.lineage.map(p=>p.id)??[]),free=allPeople(w).filter(p=>participant(w,p.id)),powers=new Map<string,number>(),skills=new Map<string,number>(),opinions=new Map<string,number>();
 const power=(id:string)=>{let n=powers.get(id);if(n===undefined){n=authorityScore(w,id);powers.set(id,n);}return n;};
 const skill=(id:string)=>{let n=skills.get(id);if(n===undefined){n=attributes(w,id).intrigue;skills.set(id,n);}return n;};
 const opinion=(a:string,b:string)=>{const key=pair(a,b);let n=opinions.get(key);if(n===undefined){n=relationOpinion(w,a,b);opinions.set(key,n);}return n;};
 for(const r of worldRealms(w)){
  if(w.realm?.annexed?.[r])continue;const g=governmentOf(w,r),phase=courtOf(w,r)?.phase??'stable';if(!g||phase==='stable'&&!monthly)continue;
  const local=free.filter(p=>allegianceRealm(w,p.id)===r),actors=local.filter(p=>p.id!==w.characterId&&!retired.has(p.id)&&(accountWallet(w,'person:'+p.id)?.read()??0)>=25).sort((a,b)=>(w.politics?.proposals[r]?.sponsor===b.id?1000:0)-(w.politics?.proposals[r]?.sponsor===a.id?1000:0)+power(b.id)-power(a.id)||skill(b.id)-skill(a.id)||a.id.localeCompare(b.id));
  const agentFor=(actor:string,target:string)=>together(w,actor,target)?undefined:local.filter(p=>p.id!==actor&&p.id!==target&&p.id!==w.characterId&&presentAt(w,p.id,personResidence(w,target).site)&&(w.relationships?.oaths[p.id]?.lord===actor||opinion(actor,p.id)>=40)).sort((a,b)=>skill(b.id)-skill(a.id)||a.id.localeCompare(b.id))[0]?.id;
  const tryStart=(actor:string,c:IntrigueStart,motive:string)=>{const command={...c,agent:agentFor(actor,c.target)};if(intrigueQuote(w,command,actor).reason)return false;actIntrigue(w,command,actor);state.schemes.at(-1)!.reason=motive;return true;};
  let personal=false,hostile=false;
  for(const actor of actors){
   if(personal&&(hostile||phase==='stable'))break;const a=actor.id,proposal=w.politics?.proposals[r];
   if(!personal&&phase!=='stable'&&proposal?.sponsor===a&&proposal.stage==='support'){
    const targets=local.filter(p=>p.id!==a&&p.id!==w.characterId&&(offices(w,p.id,r).length||commands(w,p.id,r).length)).sort((x,y)=>power(y.id)-power(x.id)||x.id.localeCompare(y.id));
    for(const target of targets)if(tryStart(a,{type:'intrigue',action:'start',kind:'recruit',target:target.id,realm:r,beneficiary:proposal.beneficiary,executive:proposal.executive,powerGoal:proposal.goal,promise:commands(w,target.id,r).length?'command':'office'},'真实权力议案正在争取关键人物支持')){personal=true;break;}
   }
   if(!personal&&(phase!=='stable'||monthly)){
    const targets=local.filter(p=>p.id!==a&&opinion(a,p.id)>=-10&&opinion(a,p.id)<65&&!['friend','confidant','rival','nemesis'].includes(friendship(w,a,p.id)??'')).sort((x,y)=>(y.id===g.ruler?20:0)+power(y.id)-(x.id===g.ruler?20:0)-power(x.id)||x.id.localeCompare(y.id));
    for(const target of targets)if(tryStart(a,{type:'intrigue',action:'start',kind:phase==='stable'?'befriend':'woo',target:target.id},phase==='stable'?'安定朝局中经营真实人脉':'朝局承压，争取身边人物好感')){personal=true;break;}
   }
   if(hostile||phase==='stable'||a===g.ruler||power(a)<20||opinion(a,g.ruler)>-40)continue;
   if(relationHooks(w,a,g.ruler)>=2&&tryStart(a,{type:'intrigue',action:'start',kind:'control',target:g.ruler},'与名义君主关系决裂，已有权力基础和人情把柄')){hostile=true;continue;}
   const allies=local.filter(p=>p.id!==a&&p.id!==g.ruler&&offices(w,p.id,r).length&&opinion(g.ruler,p.id)>=20).sort((x,y)=>power(y.id)-power(x.id)||x.id.localeCompare(y.id));
   if(allies.some(p=>tryStart(a,{type:'intrigue',action:'start',kind:'alienate',target:g.ruler,secondary:p.id},'与君主关系决裂，企图拆散其实际官员支持'))){hostile=true;continue;}
   if(phase==='chaos'&&proposal?.sponsor===a&&['rival','nemesis'].includes(friendship(w,a,g.ruler)??'')){
    const kind=friendship(w,a,g.ruler)==='nemesis'&&opinion(a,g.ruler)<=-70?'murder':'abduct';
    if(tryStart(a,{type:'intrigue',action:'start',kind,target:g.ruler},'混乱中的实际权力争夺，与在位君主已公开决裂'))hostile=true;
   }
  }
 }
}
export type VisibleScheme=Omit<Scheme,'successRoll'|'exposureRoll'|'actor'|'agent'|'secondary'|'beneficiary'|'executive'|'promise'|'powerGoal'|'realm'|'basis'|'offices'|'commands'|'chance'|'exposure'|'cost'|'spent'|'gift'|'hookCost'|'started'|'due'|'lastAdvanced'|'progress'|'reason'> & {actor:string|null;agent:string|null;secondary:string|null;beneficiary:string|null;executive:string|null;promise:SchemePromise|null;powerGoal:PowerGoal|null;realm:RealmId|null;chance:number|null;exposure:number|null;cost:number|null;spent:number|null;gift:number|null;hookCost:number|null;started:number|null;due:number|null;progress:number|null;reason:string;supportStatus?:SchemeSupport['status'];fulfillmentDue?:number};
export function visibleSchemes(w:World,viewer=w.characterId??'fictional'):VisibleScheme[]{return (w.intrigue?.schemes??[]).filter(s=>s.actor===viewer||(s.target===viewer||s.secondary===viewer)&&s.discovered).map(s=>{
 const own=s.actor===viewer,support=own?w.intrigue?.supports.find(p=>p.scheme===s.id):undefined;return {id:s.id,kind:s.kind,slot:s.slot,status:s.status,target:s.target,actor:own||s.exposed?s.actor:null,secondary:own?s.secondary:null,agent:own?s.agent:null,beneficiary:own?s.beneficiary:null,executive:own?s.executive:null,promise:own?s.promise:null,powerGoal:own?s.powerGoal:null,realm:own?s.realm:null,started:own?s.started:null,due:own?s.due:null,progress:own?s.progress:null,chance:own?s.chance:null,exposure:own?s.exposure:null,cost:own?s.cost:null,spent:own?s.spent:null,gift:own?s.gift:null,hookCost:own?s.hookCost:null,discovered:s.discovered,exposed:s.exposed,ended:s.ended,...(support?{supportStatus:support.status,fulfillmentDue:support.fulfillmentDue}:{}),...(own&&s.promise==='title'?{nobleRank:s.nobleRank,nobleName:s.nobleName,nobleRites:s.nobleRites}:own&&s.promise==='policy'?{courtPolicy:s.courtPolicy}:{}),reason:own&&support&&(s.promise==='title'||s.promise==='policy')?({pledged:'已争取支持，未来爵位或国策尚未兑现',awaiting:'权力安排已交接，承诺仍待实际履行',honored:'承诺已有真实兑现结果',broken:'承诺失信，已结算关系后果',expired:'协议期限结束'})[support.status]:own?s.reason:s.status==='active'?'察觉针对自己的计谋':s.exposed?'计谋发起者已暴露':'计谋结束，发起者不明'};
 });}
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min=0,max=1e9)=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
const id=(v:unknown)=>typeof v==='string'&&v.length>0&&v.length<=120;
const nullableId=(v:unknown)=>v===null||id(v);
export function validIntrigue(w:World){const state=w.intrigue;if(state===undefined)return true;
 if(!obj(state)||state.lastNPCReview!==undefined&&!integer(state.lastNPCReview,0,w.day)||state.version!==1||!integer(state.nextId,1)||!integer(state.seed,0,4294967295)||!Array.isArray(state.schemes)||state.schemes.length>10000||!Array.isArray(state.supports)||state.supports.length>10000)return false;
 const ids=new Set<number>(),slots=new Set<string>();
 for(const s of state.schemes){if(!obj(s)||!integer(s.id,1,state.nextId-1)||ids.has(s.id)||typeof s.kind!=='string'||!Object.hasOwn(rules,s.kind)||s.slot!==rules[s.kind as SchemeKind].slot||!id(s.actor)||!id(s.target)||s.actor===s.target||![s.secondary,s.agent,s.beneficiary,s.executive,s.realm,s.basis].every(nullableId)||!['active','succeeded','failed','cancelled','invalid'].includes(s.status as string))return false;ids.add(s.id);
  if(!integer(s.started,0,w.day)||!integer(s.lastAdvanced,Number(s.started),w.day)||!integer(s.due,Number(s.started)+1,Number(s.started)+365)||!integer(s.progress,0,100)||!integer(s.chance,5,95)||!integer(s.exposure,5,95)||![s.successRoll,s.exposureRoll].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<1)||![s.cost,s.spent,s.gift,s.hookCost].every(n=>integer(n,0,10000))||Number(s.spent)+Number(s.gift)!==s.cost||typeof s.discovered!=='boolean'||typeof s.exposed!=='boolean'||s.exposed&&!s.discovered||typeof s.reason!=='string'||s.reason.length>300||!Array.isArray(s.offices)||!s.offices.every(id)||!Array.isArray(s.commands)||!s.commands.every(n=>integer(n,1)))return false;
  if(s.status==='active'){const key=s.actor+'|'+s.slot;if(slots.has(key)||s.ended!==null)return false;slots.add(key);if(![s.actor,s.target].every(p=>!!getPerson(w,p as string)))return false;}else if(!integer(s.ended,Number(s.started),w.day))return false;
  if(s.kind==='recruit'&&(!id(s.realm)||!governmentOf(w,s.realm as RealmId)||!id(s.beneficiary)||!id(s.executive)||!['executive','ruler','dynasty'].includes(s.powerGoal as string)||!['gift','office','command','title','policy'].includes(s.promise as string)))return false;
  if(s.promise==='title'&&(!s.nobleRank||!Object.hasOwn(nobleRanks,s.nobleRank)||typeof s.nobleName!=='string'||!/^([\u3400-\u9fff]){1,4}$/u.test(s.nobleName)||typeof s.nobleRites!=='boolean'||!id(s.nobleGrantor))||s.promise==='policy'&&(!s.courtPolicy||!policyIds.includes(s.courtPolicy)))return false;
  if(s.kind==='alienate'&&(!id(s.secondary)||s.secondary===s.target||s.secondary===s.actor)||s.kind==='control'&&!id(s.basis))return false;
  const rule=rules[s.kind as SchemeKind],gift=s.kind==='recruit'&&s.promise==='gift'?40:0;if(s.cost!==rule.cost+gift||s.gift!==gift||s.spent!==rule.cost||s.hookCost!==(s.kind==='control'?2:0)||s.due!==Number(s.started)+rule.days)return false;
  if(s.kind==='recruit'&&s.promise==='office'&&s.offices.length===0||s.kind==='recruit'&&s.promise==='command'&&s.commands.length===0)return false;
 }
 const supportIds=new Set<number>();for(const s of state.supports){if(!obj(s)||!integer(s.scheme,1,state.nextId-1)||supportIds.has(s.scheme)||!state.schemes.some(q=>q.id===s.scheme&&q.kind==='recruit'&&q.status==='succeeded'&&q.actor===s.sponsor&&q.target===s.person&&q.beneficiary===s.beneficiary&&q.executive===s.executive&&q.realm===s.realm&&q.powerGoal===s.goal&&q.promise===s.promise&&q.nobleRank===s.nobleRank&&q.nobleName===s.nobleName&&q.nobleRites===s.nobleRites&&q.nobleGrantor===s.nobleGrantor&&q.courtPolicy===s.courtPolicy&&JSON.stringify(q.offices)===JSON.stringify(s.offices)&&JSON.stringify(q.commands)===JSON.stringify(s.commands))||![s.realm,s.sponsor,s.person,s.beneficiary,s.executive].every(id)||!['gift','office','command','title','policy'].includes(s.promise as string)||!['executive','ruler','dynasty'].includes(s.goal as string)||!['pledged','awaiting','honored','broken','expired'].includes(s.status as string)||typeof s.applied!=='boolean'||!integer(s.since,0,w.day)||!integer(s.until,Number(s.since)+1,Number(s.since)+180)||!Array.isArray(s.offices)||!s.offices.every(id)||!Array.isArray(s.commands)||!s.commands.every(n=>integer(n,1)))return false;if(s.status==='pledged'&&s.applied||['honored','awaiting'].includes(s.status as string)&&!s.applied||s.applied&&['title','policy'].includes(s.promise as string)&&(s.appliedDay===undefined||s.fulfillmentDue!==Math.min(Number(s.until),Number(s.appliedDay)+90)))return false;if(s.appliedDay!==undefined&&!integer(s.appliedDay,Number(s.since),w.day)||s.fulfillmentDue!==undefined&&!integer(s.fulfillmentDue,Number(s.appliedDay??s.since),Number(s.until))||s.lastFulfillmentAttempt!==undefined&&!integer(s.lastFulfillmentAttempt,Number(s.appliedDay??s.since),w.day)||s.status==='awaiting'&&(!s.applied||s.appliedDay===undefined||s.fulfillmentDue===undefined||!['title','policy'].includes(s.promise as string)))return false;supportIds.add(s.scheme);}
 return true;
}
