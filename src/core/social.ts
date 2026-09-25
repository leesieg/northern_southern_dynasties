import {expandedPersonById} from '../data/expandedPeople';
import {expressGenome} from './genetics';
import {snapshotInfluence,restoreInfluence} from './personalInfluence';
import {lifestyleFocuses,lifestylePerks} from '../data/lifestyles';
import {personResidence,together} from './residence';
import {isAlive,ageAt,lifeOf} from './lifeState';
import { relationOpinion,setFriendship,friendship,syncRelationships } from './relationships';
import { familyStanding,awardPrestige } from './family';
import { lifestyleBonuses,ensureLifestyle } from './lifestyle';
import { handoverOffice } from './realm';
import { characterById,characterRelations,historicalCharacters } from '../data/characters';
import type { World } from './types';
export const traitDefinitions={
  diligent:{name:'勤勉',effect:'新工程工期 -20%；每次动工压力 +6'},
  frugal:{name:'节俭',effect:'新工程造价 -10%；赠礼压力 +8'},
  generous:{name:'慷慨',effect:'赠礼额外 +10 好感、压力 -5；请援压力 +8'},
  gregarious:{name:'善交',effect:'他人对你好感 +8；外交能力 +4'},
  wary:{name:'多疑',effect:'对他人好感 -6；自身交好需 18 日'},
  steadfast:{name:'坚毅',effect:'每 30 日额外减少 8 压力'},
};
export type Trait=keyof typeof traitDefinitions;
export const legacyDefinitions={stewardship:{name:'治产',effect:'每级新工程造价 -5%'},kinship:{name:'敦亲',effect:'每级正向交往好感 +5'},learning:{name:'家学',effect:'每级每月减少 3 压力'}};
export type Legacy=keyof typeof legacyDefinitions;
export type Interaction='gift'|'befriend'|'aid'|'advisor'|'pressure'|'favor';
export const interactionNames:Record<Interaction,string>={gift:'赠礼',befriend:'长期交好',aid:'请援',advisor:'延请协理',pressure:'施压',favor:'兑现人情'};
export interface Social {
  version:1;founder:string;traits:Record<string,Trait[]>;opinions:Record<string,number>;hooks:Record<string,number>;cooldowns:Record<string,number>;
  stress:number;renown:number;legacies:Record<Legacy,number>;heir:string|null;advisor:string|null;
  lineage:{id:string;day:number}[];seed:number;scheme:{target:string;started:number;due:number;chance:number}|null;
}
export type SocialCommand={type:'interact';target:string;action:Interaction}|{type:'rest'}|{type:'legacy';branch:Legacy}|{type:'heir';target:string}|{type:'handover'}|{type:'cancel-scheme'};
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
export function defaultTraits(id:string):Trait[]{if(expandedPersonById[id])return expandedPersonById[id]?(expandedPersonById[id].role==='commander'?['diligent','steadfast']:expandedPersonById[id].role==='scholar'?['frugal','diligent']:['gregarious','generous']):[];if(!characterById[id])return [];const role=characterById[id].role;return role==='ruler'?['frugal','steadfast']:role==='prince'?['gregarious','generous']:role==='commander'?['diligent','steadfast']:['diligent','wary'];}
export const pair=(a:string,b:string)=>a+'|'+b;
export function houseMembers(id:string){
  const c=characterById[id];return Object.values(characterById).filter(p=>p.family===c.family&&p.polity===c.polity);
}
export function kin(a:string,b:string){
  const parents=(id:string)=>characterRelations.filter(r=>r.kind==='父子'&&r.to===id).map(r=>r.from);
  return characterRelations.some(r=>['父子','兄弟'].includes(r.kind)&&(r.from===a&&r.to===b||r.from===b&&r.to===a))||parents(a).some(id=>parents(b).includes(id));
}
export function newSocial(id:string):Social{
  const opinions:Record<string,number>={},hooks:Record<string,number>={};
  for(const a of historicalCharacters)for(const b of historicalCharacters)if(a.id!==b.id){const key=pair(a.id,b.id);opinions[key]=kin(a.id,b.id)?25:a.polity===b.polity?10:-25;hooks[key]=0;}
  return {version:1,founder:id,traits:{...Object.fromEntries(historicalCharacters.map(c=>[c.id,defaultTraits(c.id)])),[id]:defaultTraits(id)},opinions,hooks,cooldowns:{},stress:0,renown:40,legacies:{stewardship:0,kinship:0,learning:0},heir:null,advisor:null,lineage:[{id,day:0}],seed:546,scheme:null};
}
export function traitsFor(w:World,id=w.characterId){return id?(w.social?.traits[id]??defaultTraits(id)):[];}
export const abilityNames={diplomacy:'外交',martial:'军事',stewardship:'管理',intrigue:'谋略'} as const;
export type Ability=keyof typeof abilityNames;
export function abilityBreakdown(w:World,id=w.characterId){
 const c=id?characterById[id]:null,t=traitsFor(w,id),p=w.lifestyles?.people[id??'fictional'],focus=p?.focus?lifestyleFocuses[p.focus].branch:null;
 return Object.fromEntries((Object.keys(abilityNames) as Ability[]).map(skill=>{
 const branch=skill==='intrigue'?null:skill,genome=id?w.identities?.people[id]?.genome:undefined;
 const parts=[{label:'基础能力',value:8},{label:'先天敏锐',value:skill==='intrigue'&&genome&&expressGenome(genome).congenital.includes('acuity')?2:0},{label:'人物经历',value:skill==='martial'&&(c?.role??expandedPersonById[id??'']?.role)==='commander'?6:skill==='diplomacy'&&c?.role==='prince'?2:0},{label:'性格特质',value:skill==='diplomacy'&&t.includes('gregarious')?4:skill==='stewardship'&&t.includes('frugal')?4:skill==='intrigue'&&t.includes('wary')?3:0},{label:'家族声望',value:skill==='diplomacy'?familyStanding(w,id).diplomacy:0},{label:'生活重心',value:branch&&focus===branch?2:0},{label:'已学技能',value:branch?(p?.perks.filter(id=>lifestylePerks[id].branch===branch).length??0):0},{label:'长期研习',value:branch?Math.min(1,Math.floor((p?.xp[branch]??0)/360)):0},{label:'健康',value:-(lifeOf(w,id)?.illness?.severity??0)*(skill==='martial'?2:1)},{label:'压力',value:id===w.characterId&&(w.social?.stress??0)>=80?-2:0}];
 return [skill,{value:Math.max(0,Math.min(40,parts.reduce((n,p)=>n+p.value,0))),parts:parts.filter(p=>p.value!==0)}];
 })) as Record<Ability,{value:number;parts:{label:string;value:number}[]}>;
}
export function attributes(w:World,id=w.characterId){const parts=abilityBreakdown(w,id);return {diplomacy:parts.diplomacy.value,martial:parts.martial.value,stewardship:parts.stewardship.value,intrigue:parts.intrigue.value};}
export const managementDiscount=(w:World,id=w.characterId)=>Math.min(20,Math.max(0,attributes(w,id).stewardship-12)*2);

export function buildingModifiers(w:World){const b=lifestyleBonuses(w);if(!w.social)return {costRate:Math.max(45,100-b.buildCost-managementDiscount(w)),timeRate:100-b.buildTime};const t=traitsFor(w);return {costRate:Math.max(45,100-(t.includes('frugal')?10:0)-w.social.legacies.stewardship*5-b.buildCost-managementDiscount(w)),timeRate:100-(t.includes('diligent')?20:0)-(w.social.advisor?10:0)+(w.social.stress>=80?20:0)-b.buildTime};}
export function acceptance(w:World,target:string){
  if(!w.social||!w.characterId||!Object.hasOwn(characterById,target)||target===w.characterId)return [];
  return [{label:'基础',value:10},{label:'当前好感',value:relationOpinion(w,w.characterId,target)},{label:'外交',value:attributes(w).diplomacy*2},{label:'政权关系',value:characterById[target].polity===characterById[w.characterId].polity?15:-40},{label:'生活重心与技能',value:lifestyleBonuses(w).acceptance}];
}
export function interactionQuote(w:World,target:string,action:Interaction){
  const score=acceptance(w,target).reduce((n,v)=>n+v.value,0),chance=clamp(score+(action==='befriend'?lifestyleBonuses(w).scheme:0),5,95);
  const cost=action==='gift'?Math.ceil(30*Math.max(40,100-lifestyleBonuses(w).giftCost-Math.max(0,attributes(w).diplomacy-14))/100):action==='befriend'?20:action==='advisor'?40:0;
  const days=action==='befriend'?(traitsFor(w).includes('wary')?18:14):0;
  const cooldown=w.social?.cooldowns[pair(w.characterId??'',target)+'|'+action]??0;
  let reason='';
  if(!w.social||!w.characterId)reason='历史人物开局可使用交往系统';
  else if(w.campaign?.status!=='active')reason='本局已结束';
  else if(!Object.hasOwn(characterById,target)||target===w.characterId||!Object.hasOwn(interactionNames,action))reason='无效的互动对象或行动';
  else if(!isAlive(w,target))reason='对方已经去世';
  else if(w.social.lineage.slice(0,-1).some(p=>p.id===target))reason='对方已经退居，不再参与本局交往';
  else if(w.realm?.event)reason='先处理待决事务';
  else if(w.mobility&&['befriend','advisor'].includes(action)&&!together(w,w.characterId!,target))reason='须同城会面，可先约定行程';
  else if(w.people[0].journey&&!['gift','aid','favor','pressure'].includes(action))reason='抵达后才能安排交往';
  else if(cooldown>w.day)reason='还需冷却 '+(cooldown-w.day)+' 日';
  else if(w.people[0].coins<cost)reason='钱不足';
  else if(action==='befriend'&&(w.social.scheme||w.relationships?.scheme))reason='已有交好行动进行中';
  else if(action==='befriend'&&['friend','confidant'].includes(friendship(w,w.characterId,target)??''))reason='已经成为朋友，可在关系页结为至交';
  else if(action==='befriend'&&['rival','nemesis'].includes(friendship(w,w.characterId,target)??''))reason='请先调解仇怨';
  else if((action==='aid'||action==='advisor')&&score<60)reason='接受度不足 60';
  else if(action==='advisor'&&characterById[target].polity!==characterById[w.characterId].polity)reason='只能延请同政权人物';
  else if(action==='advisor'&&w.social.advisor===target)reason='此人已是协理';
  else if(action==='pressure'&&w.social.renown<10)reason='需 10 家业名望';
  else if(action==='pressure'&&w.social.hooks[pair(w.characterId,target)]>=3)reason='最多保留 3 份人情';
  else if((action==='aid'||action==='favor')&&w.relationships&&w.relationships.reserves[target]<(action==='aid'?70:50))reason='对方私人储备不足';
  else if(action==='favor'&&!w.social.hooks[pair(w.characterId,target)])reason='没有可兑现的人情';
  return {cost,days,score,chance,reason};
}
export function heirs(w:World){if(!w.social||!w.characterId)return [];const seen=new Set(w.social.lineage.map(p=>p.id));return houseMembers(w.social.founder).filter(c=>isAlive(w,c.id)&&ageAt(w,c.id)!>=16&&!seen.has(c.id)&&kin(w.characterId!,c.id)&&!characterRelations.some(r=>r.kind==='父子'&&r.from===c.id&&r.to===w.characterId));}
function log(w:World,text:string){w.chronicle.push({day:w.day,person:'player',text});w.chronicle=w.chronicle.slice(-100);}
function opinion(w:World,target:string,delta:number){const s=w.social!,key=pair(w.characterId!,target);s.opinions[key]=clamp((s.opinions[key]??(characterById[w.characterId!].polity===characterById[target].polity?10:-25))+delta,-100,100);}
export function applySocial(w:World,command:SocialCommand){
  const s=w.social;if(!s||!w.characterId)throw new Error('此系统用于历史人物开局。');
  if(w.campaign?.status!=='active')throw new Error('本局已结束。');
  const p=w.people[0],t=traitsFor(w);
  if(command.type==='interact'){
    const q=interactionQuote(w,command.target,command.action);if(q.reason)throw new Error(q.reason);
    const key=pair(w.characterId,command.target);p.coins-=q.cost;
    switch(command.action){
      case 'gift':if(w.relationships)w.relationships.reserves[command.target]=Math.min(1000,w.relationships.reserves[command.target]+q.cost);opinion(w,command.target,15+(t.includes('generous')?10:0)+s.legacies.kinship*5+lifestyleBonuses(w).giftOpinion);s.stress=clamp(s.stress+(t.includes('frugal')?8:0)-(t.includes('generous')?5:0),0,100);s.cooldowns[key+'|gift']=w.day+10;break;
      case 'befriend':s.scheme={target:command.target,started:w.day,due:w.day+q.days,chance:q.chance};break;
      case 'aid':if(w.relationships)w.relationships.reserves[command.target]-=70;p.coins=Math.min(1_000_000,p.coins+70);opinion(w,command.target,-20);s.stress=clamp(s.stress+(t.includes('generous')?8:0),0,100);s.cooldowns[key+'|aid']=w.day+30;break;
      case 'advisor':s.advisor=command.target;break;
      case 'pressure':if(['friend','confidant'].includes(friendship(w,w.characterId!,command.target)??''))setFriendship(w,w.characterId!,command.target,'rival');s.renown-=10;opinion(w,command.target,-25);s.stress=clamp(s.stress+15,0,100);s.hooks[key]=(s.hooks[key]??0)+1;s.cooldowns[key+'|pressure']=w.day+15;break;
      case 'favor':if(w.relationships)w.relationships.reserves[command.target]-=50;s.hooks[key]--;opinion(w,command.target,-10);p.coins=Math.min(1_000_000,p.coins+50);break;
    }
    log(w,`${p.name}对${characterById[command.target].name}安排「${interactionNames[command.action]}」${q.cost?'，支出 '+q.cost+' 钱':''}${q.days?'，预计 '+q.days+' 日':''}。`);return;
  }
  if(command.type==='cancel-scheme'){if(!s.scheme)throw new Error('没有进行中的交好。');s.scheme=null;log(w,'你取消了交好行动，已花费用不退还。');return;}
  if(command.type==='rest'){
    if(p.journey)throw new Error('请先抵达。');if((s.cooldowns[w.characterId+'|rest']??0)>w.day)throw new Error('休整仍在冷却中。');if(p.coins<20)throw new Error('需 20 钱。');
    p.coins-=20;s.stress=Math.max(0,s.stress-30);s.cooldowns[w.characterId+'|rest']=w.day+15;log(w,'休整身心，支出 20 钱，压力减少 30。');return;
  }
  if(command.type==='legacy'){
    if(!Object.hasOwn(legacyDefinitions,command.branch))throw new Error('无效世业。');const level=s.legacies[command.branch],cost=30*(level+1);
    if(level>=2)throw new Error('世业已满级。');if(s.renown<cost)throw new Error('家业名望不足。');s.renown-=cost;s.legacies[command.branch]++;log(w,'家族解锁「'+legacyDefinitions[command.branch].name+'」第 '+(level+1)+' 级。');return;
  }
  if(command.type==='heir'){
    if(!heirs(w).some(c=>c.id===command.target))throw new Error('只能指定已录、同家支且未退居的合格亲属。');s.heir=command.target;log(w,'指定'+characterById[command.target].name+'为家业继任者。');return;
  }
  if(command.type==='handover'){
    if(p.journey)throw new Error('请先抵达，再交接家业。');const c=heirs(w).find(c=>c.id===s.heir);if(!c)throw new Error('请先指定合格继任者。');
    log(w,p.name+'的家业交予'+c.name+'，钱粮、工程与目标继续保留。');
    if(w.mobility){const place=personResidence(w,c.id),next=w.mobility.residences[c.id];w.mobility.residences[w.characterId!]={site:p.location,journey:null};p.location=place.site;p.journey=next?.journey?structuredClone(next.journey):null;for(const a of w.mobility.activities)if(!['done','cancelled'].includes(a.phase)){a.phase='cancelled';a.result='家业交接，旧行程作罢';if(a.target)delete w.mobility.appointments[a.target];}for(const [realm,leader] of Object.entries(w.mobility.commanders))if(leader===w.characterId)delete w.mobility.commanders[realm as 'liang'|'east'|'west'];w.mobility.captivity=null;}
    const former=snapshotInfluence(w);w.characterId=c.id;p.name=c.name;p.home=c.home;s.lineage.push({id:c.id,day:w.day});s.heir=null;s.advisor=null;s.scheme=null;s.stress=20;handoverOffice(w);syncRelationships(w);ensureLifestyle(w);restoreInfluence(w,former);return;
  }
}
export function advanceSocial(w:World){
  const s=w.social;if(!s)return;
  if(w.day%30===0){s.renown=Math.min(999,s.renown+10);s.stress=Math.max(0,s.stress-5-(traitsFor(w).includes('steadfast')?8:0)-s.legacies.learning*3-lifestyleBonuses(w).calm-familyStanding(w).calm);}
  if(s.scheme&&s.scheme.due<=w.day){
    const task=s.scheme;s.scheme=null;if(['rival','nemesis'].includes(friendship(w,w.characterId!,task.target)??'')){log(w,'双方已经决裂，交好行动失效。');return;}s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;
    const success=s.seed/4294967296*100<task.chance;
    if(success){awardPrestige(w,w.characterId!,'friendship');setFriendship(w,w.characterId!,task.target,'friend');}
    opinion(w,task.target,success?25+s.legacies.kinship*5:-5);
    s.stress=clamp(s.stress+(success?-8:10),0,100);log(w,'与'+characterById[task.target].name+'的交好'+(success?'成功，成为朋友，好感提升。':'未能奏效，好感下降，压力增加。'));
  }
}
