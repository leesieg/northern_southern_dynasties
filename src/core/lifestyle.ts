import {getCharacter,allPeople} from './personRegistry';
import {traitsFor,attributes} from './social';
import {isAlive,ageAt,lifeOf} from './lifeState';
import {detained} from './custodyState';
import {armyCommander} from './mobility';
import {isMonthStart,monthStart} from './calendar';

import { lifestyleBranches,lifestyleFocuses,lifestylePerks,emptyLifestyleBonus,branchPerks,LIFESTYLE_XP_PER_POINT,LIFESTYLE_SWITCH_DAYS,type LifestyleBranch,type LifestyleBonus } from '../data/lifestyles';
import type { World } from './types';
export interface LifestyleProgress {focus:string|null;changed:number;xp:Record<LifestyleBranch,number>;perks:string[];lastStudy:number;study:{branch:LifestyleBranch;day:number}|null;lastAdvanced?:number}
export interface LifestyleState {version:1|2|3;people:Record<string,LifestyleProgress>}
export type LifestyleCommand={type:'lifestyle';action:'focus';focus:string}|{type:'lifestyle';action:'unlock';perk:string}|{type:'lifestyle';action:'study';choice:'practice'|'rest'};
export const lifestylePerson=(w:World)=>w.characterId??'fictional';
export const freshLifestyle=(day:number):LifestyleProgress=>({focus:null,changed:day,xp:{martial:0,stewardship:0,diplomacy:0,intrigue:0},perks:[],lastStudy:day,study:null,lastAdvanced:day});
export function migrateLifestyles(w:World){const s=w.lifestyles;if(!s)return;for(const p of Object.values(s.people)){if(s.version===1){for(const branch of ['martial','stewardship','diplomacy'] as const)p.xp[branch]*=LIFESTYLE_XP_PER_POINT/120;p.lastAdvanced=w.day;}p.xp.intrigue??=0;}s.version=3;}
export function ensureLifestyle(w:World,id=lifestylePerson(w)){migrateLifestyles(w);w.lifestyles??={version:3,people:{}};return w.lifestyles.people[id]??=freshLifestyle(w.day);}
export const lifestyleProgress=(w:World,id=lifestylePerson(w))=>w.lifestyles?.people[id];
export function lifestyleBonuses(w:World,id=lifestylePerson(w)):LifestyleBonus {
 const result=emptyLifestyleBonus(),p=lifestyleProgress(w,id);if(!p)return result;
 const add=(bonus:Partial<LifestyleBonus>)=>{for(const [key,value] of Object.entries(bonus))result[key as keyof LifestyleBonus]+=value;};
 if(p.focus)add(lifestyleFocuses[p.focus].bonus);for(const id of p.perks)add(lifestylePerks[id].bonus);return result;
}
export function lifestyleMasteries(w:World,id=lifestylePerson(w)){return lifestyleProgress(w,id)?.perks.filter(p=>lifestylePerks[p].mastery).map(p=>lifestylePerks[p])??[];}
export const lifestylePoints=(p:LifestyleProgress,branch:LifestyleBranch)=>Math.floor(p.xp[branch]/LIFESTYLE_XP_PER_POINT)-p.perks.filter(id=>lifestylePerks[id].branch===branch).length;
export function lifestyleLearning(w:World,id=lifestylePerson(w)){
 const p=lifestyleProgress(w,id),branch=p?.focus?lifestyleFocuses[p.focus].branch:null,traits=id==='fictional'?[]:traitsFor(w,id),stress=id===lifestylePerson(w)?w.social?.stress??0:0;
 const affinity=!!branch&&lifestyleBranches[branch].affinity.some(t=>traits.includes(t));
 return {base:3,affinity:affinity?1:0,diligent:traits.includes('diligent')?1:0,stress:stress>=80?-1:0,
 total:branch?3+(w.mobility?.activities.some(a=>a.actor===id&&a.kind==='mentor'&&a.phase==='working')?1:0)+(affinity?1:0)+(traits.includes('diligent')?1:0)-(stress>=80?1:0):0};
}
export function lifestyleStudyXP(w:World,id=lifestylePerson(w)){const p=lifestyleProgress(w,id);if(!p?.study)return 0;const diligent=id!=='fictional'&&traitsFor(w,id).includes('diligent');return Math.min(diligent?45:30,branchPerks(p.study.branch).length*LIFESTYLE_XP_PER_POINT-p.xp[p.study.branch]);}
function addXP(p:LifestyleProgress,branch:LifestyleBranch,amount:number){p.xp[branch]=Math.min(branchPerks(branch).length*LIFESTYLE_XP_PER_POINT,p.xp[branch]+amount);}
function log(w:World,text:string){w.chronicle.push({day:w.day,person:'player',text});w.chronicle=w.chronicle.slice(-100);}
export function lifestyleReason(w:World,c:LifestyleCommand,actor=lifestylePerson(w)):string {
 if(w.campaign?.status!=='active')return '需在进行中的游戏选择生活重心';
 if(w.realm?.event)return '先处理政务中的待决事务';
 const p=lifestyleProgress(w,actor);
 if(!isAlive(w,actor))return '须为在世人物';
 if(c.action==='focus'){
  if(!Object.hasOwn(lifestyleFocuses,c.focus))return '无效生活重心';
  if(p?.focus===c.focus)return '已是当前重心';
  if(p?.focus&&w.day-p.changed<LIFESTYLE_SWITCH_DAYS)return `还需 ${LIFESTYLE_SWITCH_DAYS-w.day+p.changed} 日才能更换重心`;
  return '';
 }
 if(!p?.focus)return '请先选择生活重心';
 if(c.action==='unlock'){
  if(!Object.hasOwn(lifestylePerks,c.perk))return '无效技能';const perk=lifestylePerks[c.perk];
  if(p.perks.includes(c.perk))return '已经掌握';
  if(perk.requires.some(id=>!p.perks.includes(id)))return '需先掌握：'+perk.requires.filter(id=>!p.perks.includes(id)).map(id=>lifestylePerks[id].name).join('、');
  if(lifestylePoints(p,perk.branch)<1)return '这条路线的技能点不足';return '';
 }
 if(c.action==='study')return !p.study?'暂无待处理研习':!['practice','rest'].includes(c.choice)?'无效研习选择':'';
 return '无效生活重心指令';
}
export function actLifestyle(w:World,c:LifestyleCommand,actor=lifestylePerson(w)){
 const reason=lifestyleReason(w,c,actor);if(reason)throw new Error(reason);const p=ensureLifestyle(w,actor),player=actor===lifestylePerson(w);
 if(c.action==='focus'){
  const first=p.focus===null;p.focus=c.focus;p.changed=w.day;
  if(first){addXP(p,lifestyleFocuses[c.focus].branch,LIFESTYLE_XP_PER_POINT);p.lastStudy=w.day;}
  if(player)log(w,`选择生活重心「${lifestyleFocuses[c.focus].name}」${first?'，获得本路线 1 点入门技能点':''}。`);
 }else if(c.action==='unlock'){p.perks.push(c.perk);if(player)log(w,`掌握「${lifestylePerks[c.perk].name}」：${lifestylePerks[c.perk].effect}。`);}
 else if(c.action==='study'){
  const study=p.study!,xp=lifestyleStudyXP(w,actor);
  if(c.choice==='practice'){addXP(p,study.branch,xp);if(player&&w.social)w.social.stress=Math.min(100,w.social.stress+8);}
  else if(player&&w.social)w.social.stress=Math.max(0,w.social.stress-8);
  p.study=null;if(player)log(w,`完成${lifestyleBranches[study.branch].name}研习：${c.choice==='practice'?`经验 +${xp}${w.social?'、压力 +8':''}`:w.social?'休整，压力 -8':'休整，不获得经验'}。`);
 }
}
function advancePersonLifestyle(w:World,id:string){
 const p=lifestyleProgress(w,id);if(!p?.focus||!isAlive(w,id)||(p.lastAdvanced??w.day)>=w.day)return;p.lastAdvanced=w.day;const branch=lifestyleFocuses[p.focus].branch;
 addXP(p,branch,lifestyleLearning(w,id).total);
 if(!p.study&&isMonthStart(w.day,w.scriptId)&&monthStart(p.lastStudy,w.scriptId)<w.day){p.study={branch,day:w.day};p.lastStudy=w.day;if(id===lifestylePerson(w))log(w,`${lifestyleBranches[branch].name}研习待选择，可在生活重心中处理。`);}
}
function npcFocus(w:World,id:string){
 const p=lifestyleProgress(w,id),a=attributes(w,id),t=traitsFor(w,id),military=w.realm?.armies.some(army=>armyCommander(w,army)===id),governor=Object.values(w.realm?.cities??{}).some(c=>c.governor===id);
 const branches=(Object.keys(lifestyleBranches) as LifestyleBranch[]).filter(b=>!p||p.perks.filter(k=>lifestylePerks[k].branch===b).length<branchPerks(b).length).sort((x,y)=>{const score=(b:LifestyleBranch)=>a[b]+(b==='martial'&&military||b==='stewardship'&&governor?8:0)+(lifestyleBranches[b].affinity.some(k=>t.includes(k))?3:0);return score(y)-score(x)||x.localeCompare(y);});
 const branch=branches[0];return branch==='martial'?'strategy':branch==='stewardship'?governor?'domain':'architecture':branch==='diplomacy'?'etiquette':branch==='intrigue'?'intelligence':null;
}
export function advanceLifestyle(w:World){
 if(w.campaign?.status!=='active')return;migrateLifestyles(w);advancePersonLifestyle(w,lifestylePerson(w));
 if(w.mode!=='sandbox')return;const retired=new Set(w.social?.lineage.slice(0,-1).map(p=>p.id)??[]);
 for(const person of allPeople(w)){
  const id=person.id;if(id===lifestylePerson(w)||retired.has(id)||!isAlive(w,id)||(ageAt(w,id)??0)<16||detained(w,id))continue;
  const p=ensureLifestyle(w,id);if(!p.focus||p.perks.filter(k=>lifestylePerks[k].branch===lifestyleFocuses[p.focus!].branch).length===branchPerks(lifestyleFocuses[p.focus].branch).length){const focus=npcFocus(w,id);if(focus&&!lifestyleReason(w,{type:'lifestyle',action:'focus',focus},id))actLifestyle(w,{type:'lifestyle',action:'focus',focus},id);}
  advancePersonLifestyle(w,id);
  if(p.study)actLifestyle(w,{type:'lifestyle',action:'study',choice:'practice'},id);
  for(const [perk] of Object.entries(lifestylePerks))if(!lifestyleReason(w,{type:'lifestyle',action:'unlock',perk},id))actLifestyle(w,{type:'lifestyle',action:'unlock',perk},id);
 }
}
const object=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const integer=(x:unknown,min:number,max:number)=>Number.isSafeInteger(x)&&Number(x)>=min&&Number(x)<=max;
export function validLifestyles(w:World):boolean {
 const state=w.lifestyles;if(state===undefined)return true;
 if(!object(state)||![1,2,3].includes(state.version)||!object(state.people))return false;
 if(w.campaign&&!Object.hasOwn(state.people,lifestylePerson(w)))return false;
 const allowed=new Set(state.version===1?w.characterId?(w.social?.lineage.map(p=>p.id)??[w.characterId]):['fictional']:allPeople(w).filter(p=>lifeOf(w,p.id)).map(p=>p.id).concat(w.characterId?[]:['fictional'])),cost=state.version===1?120:LIFESTYLE_XP_PER_POINT;
 if(Object.keys(state.people).length>allowed.size)return false;
 for(const [id,p] of Object.entries(state.people)){
  if(!allowed.has(id)||id!=='fictional'&&!getCharacter(w,id)||!object(p)||!integer(p.changed,0,w.day)||!integer(p.lastStudy,0,w.day)||state.version>=2&&!integer(p.lastAdvanced,0,w.day)||p.lastAdvanced!==undefined&&!integer(p.lastAdvanced,0,w.day))return false;
  if(p.focus!==null&&(typeof p.focus!=='string'||!Object.hasOwn(lifestyleFocuses,p.focus)||state.version<3&&lifestyleFocuses[p.focus].branch==='intrigue'))return false;
  const branches=(Object.keys(lifestyleBranches) as LifestyleBranch[]).filter(b=>state.version===3||b!=='intrigue');
  if(!object(p.xp)||Object.keys(p.xp).length!==branches.length||branches.some(b=>!integer(p.xp[b],0,branchPerks(b).length*cost)))return false;
  if(!Array.isArray(p.perks)||p.perks.length>(state.version===3?20:15)||new Set(p.perks).size!==p.perks.length)return false;
  const learned=new Set<string>();for(const perk of p.perks){if(typeof perk!=='string'||!Object.hasOwn(lifestylePerks,perk)||state.version<3&&lifestylePerks[perk].branch==='intrigue'||lifestylePerks[perk].requires.some(r=>!learned.has(r)))return false;learned.add(perk);}
  if(branches.some(b=>Math.floor(Number((p.xp as Record<string,number>)[b])/cost)-(p.perks as string[]).filter(id=>lifestylePerks[id].branch===b).length<0))return false;
  if(Object.values(p.xp).reduce((sum,n)=>sum+Number(n),0)>cost+w.day*(state.version===1?7:7*LIFESTYLE_XP_PER_POINT/120))return false;
  if(p.focus===null&&(Object.values(p.xp).some(n=>n!==0)||p.perks.length||p.study!==null))return false;
  if(p.study!==null&&(!object(p.study)||typeof p.study.branch!=='string'||!Object.hasOwn(lifestyleBranches,p.study.branch)||!integer(p.study.day,0,w.day)||p.study.day!==p.lastStudy))return false;
 }
 return true;
}
