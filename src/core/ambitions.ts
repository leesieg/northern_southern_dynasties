import type {World} from './types';
import type {RealmId} from './realm';
import {allegianceRealm,publicOfficeReason} from './officeEligibility';
import {governmentOf,governingExecutives} from './government';
import {courtOf,courtEnabled,courtCatalysts} from './court';
import {officeHierarchy} from './offices';
import {appointmentRank} from './appointmentCycle';
import {appointmentEvaluation} from './appointmentRules';
import {territoryNodes} from '../data/territorialHierarchy';
import {nobleRanks,nobleTitle,type NobleRank} from './nobility';
import {familyStanding,awardPrestige} from './family';
import {armyCommander} from './mobility';
import {attributes} from './social';
import {rulerEligibility} from './claims';
import {isAlive,ageAt} from './lifeState';
import {detained} from './custodyState';
import {isMonthStart,monthStart} from './calendar';
import {realmAtWar} from './wars';
import {personInfluence} from './personalInfluence';
import {getPerson} from './personRegistry';
import type {OngoingTarget} from './ongoing';

export type AmbitionKind='stableCourt'|'succession'|'expansion'|'promotion'|'enterOffice'|'nobility'|'martialMerit'|'familyStanding';
export interface AmbitionRecord{kind:AmbitionKind;chosen:number;baseline:number;counter:number;lastMonth:number|null}
export interface AmbitionHistory{kind:AmbitionKind;chosen:number;ended:number;result:'done'|'abandoned'|'lapsed'|'unfinished'}
export interface AmbitionState{version:1;people:Record<string,{active:AmbitionRecord|null;history:AmbitionHistory[]}>}
export type AmbitionCommand={type:'ambition';action:'choose';kind:AmbitionKind}|{type:'ambition';action:'abandon'};
export const ambitionOrder:AmbitionKind[]=['stableCourt','succession','expansion','promotion','enterOffice','nobility','martialMerit','familyStanding'];
export const ambitionNames:Record<AmbitionKind,string>={stableCourt:'安定朝局',succession:'确立继统',expansion:'开疆拓土',promotion:'宦途显达',enterOffice:'入仕为官',nobility:'裂土封爵',martialMerit:'军功立身',familyStanding:'光大门楣'};
export const ambitionGoal:Record<AmbitionKind,string>={stableCourt:'朝局连续十二个月安定',succession:'确立一位合格继任人',expansion:'本国实控城邑比立志时增加至少一成',promotion:'官职比立志时高一级',enterOffice:'担任任意公职',nobility:'获封更高的爵位',martialMerit:'经战事积累军功二十',familyStanding:'门第晋升一级'};
export const AMBITION_REWARD={prestige:30,stress:-15};
export const AMBITION_REWARD_TEXT='威望 +30 · 压力 −15';
export const AMBITION_ABANDON_TEXT='进度清零，90 日内不可再立此志';
export const AMBITION_COOLDOWN_DAYS=90;

export const ambitionEligible=(w:World)=>w.mode==='sandbox'&&!!w.characterId&&w.campaign?.status==='active';
const state=(w:World)=>w.ambitions?.people[w.characterId!];
export function careerRank(w:World,id:string){
 const r=allegianceRealm(w,id),g=r&&governmentOf(w,r);if(!r||!g)return 0;
 if(governingExecutives(w,r).includes(id))return 5;
 if(Object.values(g.court?.ministries??{}).includes(id))return 4;
 return officeHierarchy(w,id).filter(n=>n.holder===id&&n.active&&n.territory).reduce((rank,n)=>Math.max(rank,appointmentRank(n.territory!)),0);
}
const nobleRankKeys=()=>Object.keys(nobleRanks) as NobleRank[];
const nobleIndex=(w:World,id:string,r?:RealmId)=>{const t=nobleTitle(w,id,r);return t?nobleRankKeys().indexOf(t.rank):-1;};
const realmCities=(w:World,r:RealmId)=>Object.values(w.realm!.cities).filter(c=>c.controller===r).length;
const martialQualified=(w:World,id:string)=>!!w.realm?.armies.some(a=>armyCommander(w,a)===id)||!!w.realm?.mandate||attributes(w,id).martial>=12;
export function ambitionEligibleKind(w:World,kind:AmbitionKind,id=w.characterId!){
 const r=allegianceRealm(w,id),g=r&&governmentOf(w,r);if(!id||!isAlive(w,id))return false;
 const rank=careerRank(w,id),ruler=!!g&&g.ruler===id;
 switch(kind){
  case 'stableCourt':return !!(r&&(ruler||governingExecutives(w,r).includes(id))&&courtEnabled(w,r));
  case 'succession':return ruler;
  case 'expansion':return !!(r&&(ruler||governingExecutives(w,r).includes(id)));
  case 'promotion':return !ruler&&rank>=1&&rank<=4;
  case 'enterOffice':return !ruler&&(!r||!governingExecutives(w,r).includes(id))&&rank===0&&!publicOfficeReason(w,id);
  case 'nobility':return !!r&&!ruler&&nobleIndex(w,id,r)<nobleRankKeys().length-1;
  case 'martialMerit':return martialQualified(w,id);
  case 'familyStanding':return !!familyStanding(w,id).next;
 }
}
const baseline=(w:World,kind:AmbitionKind,id:string)=>{
 const r=allegianceRealm(w,id);
 if(kind==='expansion')return r?realmCities(w,r):0;
 if(kind==='promotion')return careerRank(w,id);
 if(kind==='nobility')return nobleIndex(w,id,r);
 if(kind==='familyStanding')return familyStanding(w,id).tier;
 return 0;
};
const expansionTarget=(a:AmbitionRecord)=>a.baseline+Math.max(2,Math.ceil(a.baseline*.1));
const heir=(w:World,r:RealmId)=>governmentOf(w,r)?.heirs?.ruler??null;
const heirReady=(w:World,r:RealmId)=>{const id=heir(w,r);return !!id&&isAlive(w,id)&&(ageAt(w,id)??0)>=16&&!detained(w,id)&&!rulerEligibility(w,r,id);};
const postForRank=(rank:number):import('./appointmentRules').AppointmentPost=>{
 if(rank>=5)return {};
 if(rank===4)return {ministry:'personnel'};
 const level=rank===3?'province':'prefecture';
 const id=Object.keys(territoryNodes).find(id=>territoryNodes[id].level===level)!;
 return {territory:id};
};
const achieved=(w:World,a:AmbitionRecord,id:string)=>{
 const r=allegianceRealm(w,id);
 switch(a.kind){
  case 'stableCourt':return a.counter>=12;
  case 'succession':return !!r&&heirReady(w,r);
  case 'expansion':return !!r&&realmCities(w,r)>=expansionTarget(a);
  case 'promotion':return careerRank(w,id)>a.baseline;
  case 'enterOffice':return careerRank(w,id)>=1;
  case 'nobility':return !!r&&nobleIndex(w,id,r)>a.baseline;
  case 'martialMerit':return a.counter>=20;
  case 'familyStanding':return familyStanding(w,id).tier>a.baseline;
 }
};
const finish=(w:World,id:string,result:AmbitionHistory['result'])=>{
 const rec=w.ambitions!.people[id],a=rec.active!;rec.active=null;rec.history.push({kind:a.kind,chosen:a.chosen,ended:w.day,result});rec.history=rec.history.slice(-20);
 if(result==='done'){awardPrestige(w,id,'ambition');if(w.social)w.social.stress=Math.max(0,w.social.stress+AMBITION_REWARD.stress);w.chronicle.push({day:w.day,person:'player',text:'志向达成：'+ambitionNames[a.kind]+'。'});w.chronicle=w.chronicle.slice(-100);}
};
export function settleAmbitions(w:World){
 const s=w.ambitions;if(!s)return;
 for(const [id,rec] of Object.entries(s.people)){
  const a=rec.active;if(!a)continue;
  if(!isAlive(w,id)){finish(w,id,'unfinished');continue;}
  if(id!==w.characterId||!ambitionEligible(w))continue;
  if(['stableCourt','succession','expansion'].includes(a.kind)&&!ambitionEligibleKind(w,a.kind,id)){finish(w,id,'lapsed');continue;}
  if(detained(w,id))continue;
  if(a.kind==='stableCourt'){const m=monthStart(w.day,w.scriptId),r=allegianceRealm(w,id);if(isMonthStart(w.day,w.scriptId)&&a.lastMonth!==m){a.lastMonth=m;a.counter=r&&courtOf(w,r)?.phase==='stable'?a.counter+1:0;}}
  if(achieved(w,a,id))finish(w,id,'done');
 }
}
/** Called from awardDeed after a real, deduplicated award lands. */
export function ambitionDeed(w:World,person:string,source:string,amount:number){
 if(amount<=0||person!==w.characterId||!ambitionEligible(w))return;
 const a=w.ambitions?.people[person]?.active;if(a?.kind!=='martialMerit')return;
 if(!['battle','siege','military-campaign'].includes(source.split(':')[0]))return;
 a.counter=Math.min(20,a.counter+amount);
}
export function ambitionReason(w:World,c:AmbitionCommand){
 if(!ambitionEligible(w))return '仅历史沙盒在局人物可立志';
 const rec=state(w);
 if(c.action==='abandon')return rec?.active?'':'当前没有进行中的志向';
 if(c.action!=='choose'||!ambitionOrder.includes(c.kind))return '未知志向';
 if(rec?.active?.kind===c.kind)return '已是当前志向';
 if(!ambitionEligibleKind(w,c.kind))return '当前身份不可立此志';
 const prior=[...(rec?.history??[])].reverse().find(h=>h.kind===c.kind&&h.result==='abandoned');
 if(prior&&prior.ended>w.day-AMBITION_COOLDOWN_DAYS)return '放弃未满 '+AMBITION_COOLDOWN_DAYS+' 日，暂不可再立此志';
 return '';
}
export function actAmbition(w:World,c:AmbitionCommand){
 const why=ambitionReason(w,c);if(why)throw new Error(why);
 const s=w.ambitions??={version:1,people:{}},rec=s.people[w.characterId!]??={active:null,history:[]};
 if(c.action==='abandon'){finish(w,w.characterId!,'abandoned');return;}
 if(rec.active)finish(w,w.characterId!,'abandoned');
 rec.active={kind:c.kind,chosen:w.day,baseline:baseline(w,c.kind,w.characterId!),counter:0,lastMonth:null};
}
export function ambitionCooldown(w:World,kind:AmbitionKind){
 const prior=[...(w.ambitions?.people[w.characterId!]?.history??[])].reverse().find(h=>h.kind===kind&&h.result==='abandoned');
 return prior&&prior.ended>w.day-AMBITION_COOLDOWN_DAYS?prior.ended-(w.day-AMBITION_COOLDOWN_DAYS):0;
}
const candidate=(w:World,kind:AmbitionKind,id:string)=>{
 const r=allegianceRealm(w,id),g=r&&governmentOf(w,r);
 switch(kind){
  case 'stableCourt':{const c=r?courtOf(w,r):null;return {progress:c?.phase==='stable'?.5:.15,reason:c?.phase==='stable'?'朝局目前安定，需连续十二个月':'朝局未安定：'+courtCatalysts(w,r!).slice(0,3).map(v=>v.label).join('、')};}
  case 'succession':{const id2=r?heir(w,r):null;return id2?{progress:heirReady(w,r!)?.85:.5,reason:'已提名 '+getPerson(w,id2)!.name+(heirReady(w,r!)?'，资格齐备':'，尚有阻碍')}:{progress:.2,reason:'尚未提名君位继任人'};}
  case 'expansion':{const n=r?realmCities(w,r):0,target=n+Math.max(2,Math.ceil(n*.1));return {progress:realmAtWar(w,r!)?.4:.15,reason:'当前实控 '+n+' 城，目标 '+target+' 城'};}
  case 'promotion':{const rank=careerRank(w,id),post=postForRank(rank+1),q=appointmentEvaluation(w,r!,id,post);return {progress:Math.min(1,(Math.min(1,q.merit/q.reference)+Math.min(1,q.score/q.threshold))/2),reason:'功绩 '+q.merit+'／资历参考 '+q.reference+'，评分 '+Math.round(q.score)+'／门槛 '+q.threshold};}
  case 'enterOffice':{const q=appointmentEvaluation(w,r!,id,{});return {progress:Math.min(1,(Math.min(1,q.merit/q.reference)+Math.min(1,q.score/q.threshold))/2),reason:'功绩 '+q.merit+'／资历参考 '+q.reference+'，评分 '+Math.round(q.score)+'／门槛 '+q.threshold};}
  case 'nobility':{const next=nobleRankKeys()[nobleIndex(w,id,r)+1],rank=nobleRanks[next];return {progress:Math.min(1,(Math.min(1,(g!.merit[id]??0)/rank.merit)+Math.min(1,personInfluence(w,id)/rank.influence))/2),reason:'功绩 '+(g!.merit[id]??0)+'／'+rank.merit+'，影响力 '+personInfluence(w,id)+'／'+rank.influence};}
  case 'martialMerit':return {progress:0,reason:'战事功绩 0／20，经战斗、围城与战役累计'};
  case 'familyStanding':{const s=familyStanding(w,id),span=s.next!.threshold-s.rank.threshold;return {progress:Math.max(0,Math.min(1,(s.total-s.rank.threshold)/span)),reason:'家族声望 '+s.total+'／'+s.next!.threshold};}
 }
};
export function ambitionCandidates(w:World,id=w.characterId!){
 if(!ambitionEligible(w)||id!==w.characterId||!isAlive(w,id))return [];
 return ambitionOrder.filter(kind=>ambitionEligibleKind(w,kind,id)).map(kind=>({kind,...candidate(w,kind,id),...(ambitionCooldown(w,kind)?{cooldown:'放弃未满 '+AMBITION_COOLDOWN_DAYS+' 日，余 '+ambitionCooldown(w,kind)+' 日'}:{})})).sort((a,b)=>b.progress-a.progress||ambitionOrder.indexOf(a.kind)-ambitionOrder.indexOf(b.kind));
}
export interface AmbitionStep{label:string;done:boolean;current:boolean;detail?:string;target?:OngoingTarget}
export function ambitionView(w:World,id=w.characterId!){
 const rec=id===w.characterId?state(w):w.ambitions?.people[id],a=rec?.active;if(!a||!ambitionEligible(w))return null;
 const r=allegianceRealm(w,id),steps:AmbitionStep[]=[];
 const step=(label:string,done:boolean,detail?:string,target?:OngoingTarget)=>steps.push({label,done,current:false,detail,target});
 if(a.kind==='stableCourt'){
  const c=r?courtOf(w,r):null,stable=c?.phase==='stable';
  step('朝局安定',stable,stable?undefined:'当前 '+(c?.phase??'—')+(c?'：'+courtCatalysts(w,r!).slice(0,3).map(v=>v.label).join('、'):''),{page:'court'});
  for(const n of [4,8,12])step('连续 '+n+' 个月安定',a.counter>=n,'已连续 '+a.counter+' 月',{page:'court'});
 } else if(a.kind==='succession'){
  const id2=r?heir(w,r):null;
  step('已提名继任人',!!id2,id2?getPerson(w,id2)!.name:'尚未提名',{page:'court'});
  step('继任人成年',!!id2&&(ageAt(w,id2)??0)>=16,id2?'现龄 '+(ageAt(w,id2)??'—'):undefined,{page:'court'});
  step('继任资格无阻碍',!!id2&&heirReady(w,r!),id2?(detained(w,id2)?'被拘押':r?rulerEligibility(w,r,id2)||undefined:undefined):undefined,{page:'court'});
 } else if(a.kind==='expansion'){
  const n=r?realmCities(w,r):0,target=expansionTarget(a);
  step('处于战争',!!r&&realmAtWar(w,r),undefined,{page:'diplomacy',realm:r!});
  step('新占领 1 城',n>a.baseline,'当前 '+n+'／目标 '+target,{page:'diplomacy',realm:r!});
  step('实控达到 '+target+' 城',n>=target,'当前 '+n+' 城',{page:'diplomacy',realm:r!});
 } else if(a.kind==='promotion'||a.kind==='enterOffice'){
  const rank=careerRank(w,id),next=a.kind==='enterOffice'?1:a.baseline+1;
  if(a.kind==='promotion'&&a.baseline>=4){
   step('已任中枢',rank>=4,undefined,{page:'court'});
   step('获任执政',rank>=5,undefined,{page:'court'});
  }else{
   const post=a.kind==='enterOffice'?{}:postForRank(next),q=appointmentEvaluation(w,r!,id,post),appointed=!!w.realm?.offices.some(o=>o.candidate===id);
   step('功绩达到资历参考',q.merit>=q.reference,'功绩 '+q.merit+'／'+q.reference,{page:'court'});
   step('评分达到门槛',q.score>=q.threshold,'评分 '+Math.round(q.score)+'／'+q.threshold,{page:'court'});
   step('获得任命',appointed,appointed?'任命在途':'等待授官',{page:'court'});
   step('赴任',rank>=Math.max(1,next),undefined,{page:'court'});
  }
 } else if(a.kind==='nobility'){
  const next=nobleRankKeys()[a.baseline+1],rank=nobleRanks[next],g=r&&governmentOf(w,r);
  step('功绩达标',(g?.merit[id]??0)>=rank.merit,'功绩 '+(g?.merit[id]??0)+'／'+rank.merit,{page:'court'});
  step('影响力达标',personInfluence(w,id)>=rank.influence,'影响力 '+personInfluence(w,id)+'／'+rank.influence,{page:'court'});
  step('获封'+rank.name,nobleIndex(w,id,r)>a.baseline,undefined,{page:'court'});
 } else if(a.kind==='martialMerit'){
  for(const n of [5,10,20])step('战事功绩 +'+n,a.counter>=n,'已计 '+a.counter+'／'+n,{page:'military'});
 } else if(a.kind==='familyStanding'){
  const s=familyStanding(w,id),span=s.next?s.next.threshold-s.rank.threshold:1,frac=s.next?Math.max(0,Math.min(1,(s.total-s.rank.threshold)/span)):1;
  for(const n of [25,50,75])step('声望进度 '+n+'%',frac*100>=n,'家族声望 '+s.total+'／'+(s.next?.threshold??'—'),{page:'person',person:id,tab:'family'});
  step('门第晋级',s.tier>a.baseline,s.next?s.rank.name+' → '+s.next.name:undefined,{page:'person',person:id,tab:'family'});
 }
 let progress=steps.filter(s=>s.done).length/steps.length;
 if(a.kind==='stableCourt')progress=Math.min(1,a.counter/12);
 if(a.kind==='martialMerit')progress=Math.min(1,a.counter/20);
 if(a.kind==='expansion')progress=Math.max(0,Math.min(1,((r?realmCities(w,r):0)-a.baseline)/(expansionTarget(a)-a.baseline)));
 if(a.kind==='familyStanding'){const s=familyStanding(w,id),span=s.next?s.next.threshold-s.rank.threshold:1;progress=Math.max(0,Math.min(1,(s.total-s.rank.threshold)/span));}
 const first=steps.find(s=>!s.done);if(first)first.current=true;
 return {kind:a.kind,title:ambitionNames[a.kind],progress,steps,next:first?first.label+(first.detail?' · '+first.detail:''):'已达成'};
}
export function validAmbitions(value:unknown,w:World):boolean{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;const s=value as AmbitionState;
 if(s.version!==1||!s.people||typeof s.people!=='object'||Array.isArray(s.people))return false;
 const int=(v:unknown,max:number)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0&&v<=max;
 return Object.entries(s.people).every(([id,rec])=>!! getPerson(w,id)&&!!rec&&typeof rec==='object'&&Array.isArray(rec.history)&&rec.history.length<=20
  &&(rec.active===null||!!rec.active&&ambitionOrder.includes(rec.active.kind)&&int(rec.active.chosen,w.day)&&(int(rec.active.baseline,100000)||rec.active.kind==='nobility'&&rec.active.baseline===-1)&&int(rec.active.counter,20)&&(rec.active.lastMonth===null||int(rec.active.lastMonth,w.day)))
  &&rec.history.every(h=>h&&ambitionOrder.includes(h.kind)&&int(h.chosen,w.day)&&int(h.ended,w.day)&&h.chosen<=h.ended&&['done','abandoned','lapsed','unfinished'].includes(h.result)));
}
