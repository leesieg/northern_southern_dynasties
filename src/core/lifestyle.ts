import {getCharacter,allPeople} from './personRegistry';
import {traitsFor,attributes} from './social';
import {isAlive,ageAt,lifeOf} from './lifeState';
import {detained} from './custodyState';
import {armyCommander} from './mobility';
import {monthStart,nextMonthStart,monthIndex} from './calendar';
import {ownedEstates,estateAccessReason} from './estates';
import {allegianceRealm} from './officeEligibility';
import {governmentOf} from './government';
import {siteById} from '../data/scenario';
import {lifestyleBranches,lifestyleFocuses,lifestylePerks,legacyFocusMap,legacyPerkPrereqs,emptyLifestyleBonus,branchPerks,LIFESTYLE_XP_PER_POINT,LIFESTYLE_SWITCH_DAYS,LIFESTYLE_MONTHLY_BASE,LIFESTYLE_MONTHLY_CAP,type LifestyleBranch,type LifestyleBonus,type LifestyleScope} from '../data/lifestyles';
import type {World} from './types';
import type {Army,RealmId} from './realm';
const branches=Object.keys(lifestyleBranches) as LifestyleBranch[];
const zeroXP=():Record<LifestyleBranch,number>=>({martial:0,stewardship:0,diplomacy:0,intrigue:0});
interface LifestyleMonth {start:number;credit:Record<LifestyleBranch,number>;practice:Record<LifestyleBranch,number>}
export interface LifestyleProgress {
 focus:string|null;changed:number;xp:Record<LifestyleBranch,number>;perks:string[];lastStudy:number;study:{branch:LifestyleBranch;day:number}|null;lastAdvanced?:number;
 auto?:boolean;priority?:Partial<Record<LifestyleBranch,string>>;month?:LifestyleMonth;origin?:number;legacyXP?:number;reselect?:boolean;
}
export interface LifestyleState {version:1|2|3|4;people:Record<string,LifestyleProgress>}
export type LifestyleCommand={type:'lifestyle';action:'focus';focus:string}|{type:'lifestyle';action:'unlock';perk:string}|{type:'lifestyle';action:'study';choice:'practice'|'rest'}|{type:'lifestyle';action:'plan';auto?:boolean;perk?:string};
export const lifestylePerson=(w:World)=>w.characterId??'fictional';
export const freshLifestyle=(day:number):LifestyleProgress=>({focus:null,changed:day,xp:zeroXP(),perks:[],lastStudy:day,study:null,lastAdvanced:day,auto:true,priority:{},origin:day,legacyXP:0,reselect:false});
const newMonth=(w:World):LifestyleMonth=>({start:monthStart(w.day,w.scriptId),credit:zeroXP(),practice:zeroXP()});
export function migrateLifestyles(w:World){
 const s=w.lifestyles;if(!s||s.version===4)return;
 for(const p of Object.values(s.people)){
  if(s.version===1){for(const branch of ['martial','stewardship','diplomacy'] as const)p.xp[branch]*=LIFESTYLE_XP_PER_POINT/120;}
  p.xp.intrigue??=0;p.legacyXP=Object.values(p.xp).reduce((n,v)=>n+v,0);p.origin=w.day;p.lastAdvanced=w.day;
  p.focus=p.focus?(legacyFocusMap[p.focus]??p.focus):null;p.auto=true;p.priority={};p.month=newMonth(w);p.study=null;p.lastStudy=w.day;p.reselect=!!p.focus;
 }
 s.version=4;
}
export function ensureLifestyle(w:World,id=lifestylePerson(w)){migrateLifestyles(w);w.lifestyles??={version:4,people:{}};return w.lifestyles.people[id]??=freshLifestyle(w.day);}
export const lifestyleProgress=(w:World,id=lifestylePerson(w))=>w.lifestyles?.people[id];
/** Raw totals for ability explanations only. Settlements use lifestyleEffects with their real context. */
export function lifestyleBonuses(w:World,id=lifestylePerson(w),scopes?:LifestyleScope[],branch?:LifestyleBranch):LifestyleBonus {
 const result=emptyLifestyleBonus(),p=lifestyleProgress(w,id);if(!p)return result;
 const add=(entry:{bonus:Partial<LifestyleBonus>;scope:LifestyleScope;branch:LifestyleBranch})=>{if(scopes&&!scopes.includes(entry.scope)||branch&&branch!==entry.branch)return;for(const [key,value] of Object.entries(entry.bonus))result[key as keyof LifestyleBonus]+=value;};
 if(p.focus&&lifestyleFocuses[p.focus])add(lifestyleFocuses[p.focus]);for(const id of p.perks)if(lifestylePerks[id])add(lifestylePerks[id]);return result;
}
export type LifestyleContext=
 |{kind:'personal'}|{kind:'estate';site?:string}|{kind:'governance';site:string}
 |{kind:'construction';scope:'city'|'estate';site:string}
 |{kind:'army';army:Army}|{kind:'envoy';realm:RealmId}
 |{kind:'task';site:string;realm:RealmId;branch:LifestyleBranch}
 |{kind:'scheme';public:boolean}|{kind:'defense';public:boolean};
export function lifestyleEffects(w:World,context:LifestyleContext,id=lifestylePerson(w)):LifestyleBonus {
 if(!isAlive(w,id)||detained(w,id))return emptyLifestyleBonus();
 switch(context.kind){
  case 'personal':return lifestyleBonuses(w,id,['common','private']);
  case 'estate':return ownedEstates(w,id).some(e=>(!context.site||e.location===context.site)&&!estateAccessReason(w,e,id))||!w.realm&&w.holdings.estate.owner===id?lifestyleBonuses(w,id,['common','private']):emptyLifestyleBonus();
  case 'governance':{const c=w.realm?.cities[context.site];return c&&c.owner===c.controller&&c.governor===id||!w.realm&&id===lifestylePerson(w)&&w.holdings.governedCities.includes(context.site)?lifestyleBonuses(w,id,['common','public']):emptyLifestyleBonus();}
  case 'construction':return context.scope==='estate'?lifestyleEffects(w,{kind:'estate',site:context.site},id):lifestyleEffects(w,{kind:'governance',site:context.site},id);
  case 'envoy':return allegianceRealm(w,id)===context.realm?lifestyleBonuses(w,id,['common','public'],'diplomacy'):emptyLifestyleBonus();
  case 'task':{const c=w.realm?.cities[context.site];return c?.owner===context.realm&&c.controller===context.realm&&allegianceRealm(w,id)===context.realm?lifestyleBonuses(w,id,['common','public'],context.branch):emptyLifestyleBonus();}
  case 'scheme':return context.public&&!lifestylePublicOffice(w,id)?emptyLifestyleBonus():lifestyleBonuses(w,id,context.public?['common','public']:['common','private'],'intrigue');
  case 'defense':return lifestyleBonuses(w,id,context.public&&lifestylePublicOffice(w,id)?['common','public','private']:['common','private']);
  case 'army':{
   const a=context.army,commander=armyCommander(w,a),privateArmy=!!a.owner,b=commander?lifestyleBonuses(w,commander,privateArmy?['common','private']:['common','public'],'martial'):emptyLifestyleBonus(),result=emptyLifestyleBonus();
   if(commander===id&&isAlive(w,commander)&&!detained(w,commander)&&allegianceRealm(w,commander)===a.realm){
    if(privateArmy){const effective=a.owner===commander?b:lifestyleBonuses(w,commander,['common'],'martial');result.attack=effective.privateAttack;result.supply=effective.privateSupply;}
    else {result.attack=b.attack;result.supply=b.supply;result.armyExpense=b.armyExpense;result.siege=b.siege;}
   }
   // Supply finance belongs to the actual private owner/payer, never to a selectable commander or player.
   if(a.owner&&a.payer==='person:'+a.owner&&allegianceRealm(w,a.owner)===a.realm&&isAlive(w,a.owner)&&!detained(w,a.owner))result.armyExpense=lifestyleBonuses(w,a.owner,['private'],'martial').privateExpense;
   return result;
  }
 }
}
export function lifestyleMasteries(w:World,id=lifestylePerson(w)){return lifestyleProgress(w,id)?.perks.filter(p=>lifestylePerks[p]?.mastery).map(p=>lifestylePerks[p])??[];}
export const lifestylePoints=(p:LifestyleProgress,branch:LifestyleBranch)=>Math.floor(p.xp[branch]/LIFESTYLE_XP_PER_POINT)-p.perks.filter(id=>lifestylePerks[id]?.branch===branch).length;
export function lifestyleLearning(w:World,id=lifestylePerson(w)){
 const p=lifestyleProgress(w,id),branch=p?.focus?lifestyleFocuses[p.focus]?.branch:null,traits=id==='fictional'?[]:traitsFor(w,id),stress=id===lifestylePerson(w)?w.social?.stress??0:0;
 const affinity=!!branch&&lifestyleBranches[branch].affinity.some(t=>traits.includes(t)),diligent=traits.includes('diligent'),mentor=!!w.mobility?.activities.some(a=>a.actor===id&&a.kind==='mentor'&&a.phase==='working');
 const aptitude=stress>=80?0:Math.min(2,Number(affinity)+Number(diligent)+Number(mentor));
 return {base:LIFESTYLE_MONTHLY_BASE,affinity:Number(affinity),diligent:Number(diligent),mentor:Number(mentor),stress:stress>=80,aptitude,practice:p?.month?Object.values(p.month.practice).reduce((n,v)=>n+v,0):0,total:branch?LIFESTYLE_MONTHLY_BASE+aptitude:0};
}
/** Kept for callers of older versions; routine study is now included in monthly growth. */
export const lifestyleStudyXP=()=>0;
function addXP(p:LifestyleProgress,branch:LifestyleBranch,amount:number){p.xp[branch]=Math.min(branchPerks(branch).length*LIFESTYLE_XP_PER_POINT,p.xp[branch]+amount);}
function log(w:World,text:string){w.chronicle.push({day:w.day,person:'player',text});w.chronicle=w.chronicle.slice(-100);}
export function lifestyleQueue(w:World,branch:LifestyleBranch,id=lifestylePerson(w),priority?:string,scopeDraft?:'public'|'private'){
 const p=lifestyleProgress(w,id),owned=new Set(p?.perks??[]),focus=p?.focus?lifestyleFocuses[p.focus]:null,scope=scopeDraft??(focus?.branch===branch?focus.scope:'public');
 const sorted=branchPerks(branch).sort(([,a],[,b])=>{const rank=(s:LifestyleScope)=>s===scope?0:s==='common'?1:2;return rank(a.scope)-rank(b.scope)||a.tier-b.tier;}),queue:string[]=[],seen=new Set<string>();
 const visit=(key:string)=>{if(owned.has(key)||seen.has(key))return;seen.add(key);for(const req of lifestylePerks[key].requires)visit(req);queue.push(key);};
 const preferred=priority??p?.priority?.[branch];if(preferred&&lifestylePerks[preferred]?.branch===branch)visit(preferred);for(const [key] of sorted)visit(key);return queue;
}
export function lifestyleReason(w:World,c:LifestyleCommand,actor=lifestylePerson(w)):string {
 if(w.campaign?.status!=='active')return '需在进行中的游戏选择生活重心';if(w.realm?.event)return '先处理政务中的待决事务';
 const p=lifestyleProgress(w,actor);if(!isAlive(w,actor))return '须为在世人物';
 if(c.action==='focus'){
  if(!Object.hasOwn(lifestyleFocuses,c.focus))return '无效生活重心';const focus=legacyFocusMap[c.focus]??c.focus;
  if(p?.focus===focus)return '已是当前重心';if(p?.focus&&!p.reselect&&w.day-p.changed<LIFESTYLE_SWITCH_DAYS)return `还需 ${LIFESTYLE_SWITCH_DAYS-w.day+p.changed} 日才能更换重心`;return '';
 }
 if(!p?.focus)return '请先选择生活重心';
 if(c.action==='unlock'){
  if(!Object.hasOwn(lifestylePerks,c.perk))return '无效技能';const perk=lifestylePerks[c.perk];if(p.perks.includes(c.perk))return '已经掌握';
  if(perk.requires.some(id=>!p.perks.includes(id)))return '需先掌握：'+perk.requires.filter(id=>!p.perks.includes(id)).map(id=>lifestylePerks[id].name).join('、');
  return lifestylePoints(p,perk.branch)<1?'这条路线的技能点不足':'';
 }
 if(c.action==='plan'){
  if(c.auto!==undefined)return typeof c.auto==='boolean'&&c.perk===undefined?'':'无效学习安排';
  if(!c.perk||!Object.hasOwn(lifestylePerks,c.perk))return '无效技能';return p.perks.includes(c.perk)?'已经掌握':'';
 }
 if(c.action==='study')return '研习已纳入自动月度成长，无需重复办理';return '无效生活重心指令';
}
export function actLifestyle(w:World,c:LifestyleCommand,actor=lifestylePerson(w)){
 const reason=lifestyleReason(w,c,actor);if(reason)throw new Error(reason);const p=ensureLifestyle(w,actor),player=actor===lifestylePerson(w);
 if(c.action==='focus'){
  const first=p.focus===null;p.focus=legacyFocusMap[c.focus]??c.focus;p.changed=w.day;p.reselect=false;p.lastAdvanced??=w.day;p.month??=newMonth(w);
  if(first){addXP(p,lifestyleFocuses[p.focus].branch,LIFESTYLE_XP_PER_POINT);p.lastStudy=w.day;}
  if(player)log(w,`选择生活重心「${lifestyleFocuses[p.focus].name}」${first?'，获得本类 1 点入门技能点':''}。`);
 }else if(c.action==='unlock'){p.perks.push(c.perk);if(p.priority?.[lifestylePerks[c.perk].branch]===c.perk)delete p.priority[lifestylePerks[c.perk].branch];if(player)log(w,`掌握「${lifestylePerks[c.perk].name}」：${lifestylePerks[c.perk].effect}。`);}
 else if(c.action==='plan'){if(c.auto!==undefined)p.auto=c.auto;else{p.priority??={};p.priority[lifestylePerks[c.perk!].branch]=c.perk!;}}
}
function settleMonth(w:World,p:LifestyleProgress){
 const m=p.month;if(!m||m.start===monthStart(w.day,w.scriptId))return;
 for(const branch of branches)addXP(p,branch,Math.floor(m.credit[branch]+m.practice[branch]+1e-7));p.lastStudy=w.day;p.month=newMonth(w);
}
/** Only real completed work calls this. All actions share one +2 practice allowance per calendar month. */
export function recordLifestylePractice(w:World,id:string,branch:LifestyleBranch){
 const p=lifestyleProgress(w,id);if(!p?.focus||lifestyleFocuses[p.focus].branch!==branch||!isAlive(w,id)||detained(w,id))return;
 p.month??=newMonth(w);settleMonth(w,p);if(Object.values(p.month!.practice).some(n=>n>0))return;p.month!.practice[branch]=2;
}
function autoLearn(w:World,id:string){
 const p=lifestyleProgress(w,id);if(!p?.focus||p.auto===false||w.realm?.event)return;
 for(const branch of branches){if(lifestylePoints(p,branch)<1)continue;for(const perk of lifestyleQueue(w,branch,id)){
  if(lifestylePoints(p,branch)<1)break;if(!lifestyleReason(w,{type:'lifestyle',action:'unlock',perk},id))actLifestyle(w,{type:'lifestyle',action:'unlock',perk},id);
 }}
}
function advancePersonLifestyle(w:World,id:string){
 const p=lifestyleProgress(w,id);if(!p?.focus||!isAlive(w,id)||detained(w,id))return;
 if((p.lastAdvanced??w.day)<w.day){p.month??=newMonth(w);settleMonth(w,p);p.lastAdvanced=w.day;const branch=lifestyleFocuses[p.focus].branch,m=p.month!;
  m.credit[branch]+=lifestyleLearning(w,id).total/(nextMonthStart(m.start,w.scriptId)-m.start); // No backfill for skipped/offline days.
 }
 autoLearn(w,id);
}
function npcFocus(w:World,id:string){
 const p=lifestyleProgress(w,id),a=attributes(w,id),t=traitsFor(w,id),military=w.realm?.armies.some(army=>armyCommander(w,army)===id),governor=Object.values(w.realm?.cities??{}).some(c=>c.governor===id),estate=ownedEstates(w,id).length>0,privateArmy=w.realm?.armies.some(army=>army.owner===id);
 const remaining=branches.filter(b=>!p||p.perks.filter(k=>lifestylePerks[k].branch===b).length<branchPerks(b).length).sort((x,y)=>{const score=(b:LifestyleBranch)=>a[b]+(b==='martial'&&military||b==='stewardship'&&governor?8:0)+(b==='stewardship'&&estate?2:0)+(lifestyleBranches[b].affinity.some(k=>t.includes(k))?3:0);return score(y)-score(x)||x.localeCompare(y);});
 const branch=remaining[0];if(!branch)return null;const publicWork=branch==='stewardship'?governor:branch==='martial'?military&&!privateArmy:branch==='intrigue'?lifestylePublicOffice(w,id):!!w.diplomacy?.missions.some(m=>m.envoy===id&&m.status!=='returning');
 return `${publicWork?'public':'private'}_${branch}`;
}
export function advanceLifestyle(w:World){
 if(w.campaign?.status!=='active')return;migrateLifestyles(w);advancePersonLifestyle(w,lifestylePerson(w));if(w.mode!=='sandbox')return;
 const retired=new Set(w.social?.lineage.slice(0,-1).map(p=>p.id)??[]);
 for(const person of allPeople(w)){
  const id=person.id;if(id===lifestylePerson(w)||retired.has(id)||!isAlive(w,id)||(ageAt(w,id)??0)<16||detained(w,id))continue;const p=ensureLifestyle(w,id);
  if(!p.focus||p.perks.filter(k=>lifestylePerks[k].branch===lifestyleFocuses[p.focus!].branch).length===branchPerks(lifestyleFocuses[p.focus].branch).length){const focus=npcFocus(w,id);if(focus&&!lifestyleReason(w,{type:'lifestyle',action:'focus',focus},id))actLifestyle(w,{type:'lifestyle',action:'focus',focus},id);}
  advancePersonLifestyle(w,id);
 }
}
export function lifestylePublicOffice(w:World,id:string){const r=allegianceRealm(w,id),g=r?governmentOf(w,r):undefined;return !!r&&isAlive(w,id)&&!detained(w,id)&&!!g&&(g.ruler===id||g.executives.includes(id)||Object.values(g.court?.ministries??{}).includes(id)||Object.values(w.realm?.cities??{}).some(c=>c.owner===r&&c.controller===r&&c.governor===id));}
/** A UI explanation of available real contexts; no world state is modified. */
export function lifestyleBeneficiaries(w:World,perk:string,id=lifestylePerson(w)){
 const p=lifestylePerks[perk];if(!p)return [];
 if(p.scope==='common'){if(p.branch==='stewardship')return [...ownedEstates(w,id).filter(e=>!estateAccessReason(w,e)).map(e=>siteById[e.location]?.name+'庄园'),...Object.entries(w.realm?.cities??{}).filter(([,c])=>c.governor===id&&c.owner===c.controller).map(([site])=>siteById[site]?.name)];if(p.branch==='martial')return w.realm?.armies.filter(a=>armyCommander(w,a)===id).map(a=>'实际统率第 '+a.id+' 军')??[];return p.branch==='diplomacy'?['本人交往、本人奉使']:['本人计谋与防御'];}
 if(p.branch==='stewardship')return p.scope==='private'?ownedEstates(w,id).filter(e=>!estateAccessReason(w,e)).map(e=>siteById[e.location]?.name+'庄园'):Object.entries(w.realm?.cities??{}).filter(([,c])=>c.governor===id&&c.owner===c.controller).map(([site])=>siteById[site]?.name);
 if(p.branch==='martial')return p.scope==='private'?[...(p.bonus.personalDefense?['本人安全']:[]),...(w.realm?.armies.filter(a=>a.owner===id&&(p.bonus.privateExpense?a.payer==='person:'+id:armyCommander(w,a)===id)).map(a=>'自有第 '+a.id+' 军')??[])]:w.realm?.armies.filter(a=>!a.owner&&armyCommander(w,a)===id).map(a=>'实际统率第 '+a.id+' 军')??[];
 if(p.branch==='diplomacy')return p.scope==='private'?['本人交往与亲族']:w.diplomacy?.missions.filter(m=>m.envoy===id&&m.status!=='returning').map(m=>'第 '+m.id+' 使团')??[];
 return p.scope==='private'?['本人发起的隐秘行动']:lifestylePublicOffice(w,id)?['合法辅政事务、本人及职责内保护对象']:[];
}
const object=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const integer=(x:unknown,min:number,max:number)=>Number.isSafeInteger(x)&&Number(x)>=min&&Number(x)<=max;
export function validLifestyles(w:World):boolean {
 const state=w.lifestyles;if(state===undefined)return true;if(!object(state)||![1,2,3,4].includes(state.version)||!object(state.people))return false;
 if(w.campaign&&!Object.hasOwn(state.people,lifestylePerson(w)))return false;
 const allowed=new Set(state.version===1?w.characterId?(w.social?.lineage.map(p=>p.id)??[w.characterId]):['fictional']:allPeople(w).filter(p=>lifeOf(w,p.id)).map(p=>p.id).concat(w.characterId?[]:['fictional'])),cost=state.version===1?120:LIFESTYLE_XP_PER_POINT;
 if(Object.keys(state.people).length>allowed.size)return false;
 for(const [id,p] of Object.entries(state.people)){
  if(!allowed.has(id)||id!=='fictional'&&!getCharacter(w,id)||!object(p)||!integer(p.changed,0,w.day)||!integer(p.lastStudy,0,w.day)||state.version>=2&&!integer(p.lastAdvanced,0,w.day)||p.lastAdvanced!==undefined&&!integer(p.lastAdvanced,0,w.day))return false;
  if(p.focus!==null&&(typeof p.focus!=='string'||!Object.hasOwn(lifestyleFocuses,p.focus)||state.version<3&&lifestyleFocuses[p.focus].branch==='intrigue'||state.version===4&&lifestyleFocuses[p.focus].legacy||state.version<4&&!Object.hasOwn(legacyFocusMap,p.focus)))return false;
  const available=branches.filter(b=>state.version>=3||b!=='intrigue'),count=state.version===4?20:5;
  if(!object(p.xp)||Object.keys(p.xp).length!==available.length||available.some(b=>!integer(p.xp[b],0,count*cost)))return false;
  if(!Array.isArray(p.perks)||p.perks.length>count*available.length||new Set(p.perks).size!==p.perks.length)return false;
  const learned=new Set<string>();for(const perk of p.perks){if(typeof perk!=='string'||!Object.hasOwn(lifestylePerks,perk)||state.version<3&&lifestylePerks[perk].branch==='intrigue'||state.version<4&&!Object.hasOwn(legacyPerkPrereqs,perk)||(state.version<4?legacyPerkPrereqs[perk]:lifestylePerks[perk].requires).some(r=>!learned.has(r)))return false;learned.add(perk);}
  if(available.some(b=>Math.floor(Number((p.xp as Record<string,number>)[b])/cost)-(p.perks as string[]).filter(id=>lifestylePerks[id].branch===b).length<0))return false;
  const total=Object.values(p.xp).reduce((sum,n)=>sum+Number(n),0);
  if(state.version<4){if(total>cost+w.day*(state.version===1?7:21))return false;}
  else {
   if(typeof p.auto!=='boolean'||!object(p.priority)||!integer(p.origin,0,w.day)||!integer(p.legacyXP,0,7200)||typeof p.reselect!=='boolean')return false;
   if(Object.entries(p.priority).some(([branch,perk])=>!available.includes(branch as LifestyleBranch)||typeof perk!=='string'||!Object.hasOwn(lifestylePerks,perk)||lifestylePerks[perk].branch!==branch||p.perks.includes(perk)))return false;
   if(total>Number(p.legacyXP)+(p.focus&&Number(p.legacyXP)===0?cost:0)+(monthIndex(w.day,w.scriptId)-monthIndex(Number(p.origin),w.scriptId)+1)*LIFESTYLE_MONTHLY_CAP)return false;
   if(p.study!==null)return false;
   if(p.month!==undefined){const m=p.month;if(!object(m)||!integer(m.start,0,w.day)||monthStart(Number(m.start),w.scriptId)!==m.start||!object(m.credit)||!object(m.practice))return false;
    if([m.credit,m.practice].some(record=>Object.keys(record).length!==4||branches.some(b=>typeof record[b]!=='number'||!Number.isFinite(record[b])||Number(record[b])<0)))return false;
    if(Object.values(m.credit).reduce((n,v)=>n+Number(v),0)>20+1e-7||Object.values(m.practice).reduce((n,v)=>n+Number(v),0)>2||Object.values(m.practice).some(v=>!integer(v,0,2)))return false;
   }
  }
  if(p.focus===null&&(total||p.perks.length||p.study!==null))return false;
  if(p.study!==null&&(!object(p.study)||typeof p.study.branch!=='string'||!Object.hasOwn(lifestyleBranches,p.study.branch)||!integer(p.study.day,0,w.day)||p.study.day!==p.lastStudy))return false;
 }
 return true;
}
