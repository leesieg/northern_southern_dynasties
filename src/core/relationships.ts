import {quoteFamilyMarriage,actFamilyMarriage} from './familyMarriage';
import {personResidence} from './residence';
import {parentLinksOf,allPeople,getPerson,getCharacter} from './personRegistry';
import {activeWars} from './wars';
import {worldRealms} from './polityRuntime';
import {isMonthStart,monthStart} from './calendar';
import {allegianceRealm} from './officeEligibility';
import {marriageClanBonus} from './clans';
import {together} from './residence';
import {isAlive,ageAt} from './lifeState';
import { diplomaticPair,atWar,attitude } from './diplomacy';
import {historicalMarriages,relationshipParents,relationshipActionNames,type RelationshipAction} from '../data/relationships';

import { parentLinks } from '../data/families';
import { attributes,acceptance,pair,interactionQuote,applySocial,traitsFor,traitDefinitions,kin } from './social';
import { awardPrestige } from './family';
import { governmentOf,currentRealm,governingExecutives,governmentExecutive } from './government';
import { syncCourt } from './court';
import { type RealmId } from './realm';
import type { World } from './types';
import {localPoliticalBasis} from './officePower';
export type Friendship='friend'|'confidant'|'rival'|'nemesis';
export interface Marriage {id:string;a:string;b:string;from:number;until:number|null;origin:'historical'|'simulation'}
export interface Regency {realm:RealmId;regimeId:string;basis:string;ruler:string;controller:string;since:number;grip:number;origin:'scenario'|'scheme'|'restored'|'custody'}
export interface RelationshipState {
 version:1;since:number;lastMonthly:number;seed:number;
 bonds:Record<string,{a:string;b:string;kind:Friendship;since:number}>;marriages:Marriage[];
 maritalBasis:Record<string,'unknown'|'recorded'|'simulation'|'widowed'|'free'>;
 opinions:Record<string,number>;hooks:Record<string,number>;reserves:Record<string,number>;
 allegiances?:Record<string,{source?:'custody'|'pact'|'partition'|'retained';realm:RealmId;from:RealmId;since:number;army:number}>;oaths:Record<string,{lord:string;since:number;loyalty:number}>;regencies:Partial<Record<RealmId,Regency>>;
 cooldowns:Record<string,number>;scheme:{kind:'befriend'|'control';actor:string;target:string;started:number;due:number;chance:number;basis:string|null}|null;
 history:{day:number;actor:string;target:string|null;text:string}[];
}
export type RelationshipCommand={type:'relationship';action:RelationshipAction;target:string}|{type:'relationship';action:'marital-branch'|'cancel'};
const cap=(v:number,max=100,min=0)=>Math.max(min,Math.min(max,Math.round(v)));
export const bondKey=(a:string,b:string)=>[a,b].sort().join('|');
export const relationName=(id:string,w?:World)=>getPerson(w,id)?.name??'未录人物';
export const powerBasis=(w:World,r:RealmId)=>{const g=governmentOf(w,r);return g?g.regimeId+'|'+g.ruler+'|'+g.executives.join('|'):'';};
export function newRelationships(w:World):RelationshipState{
 const state:RelationshipState={version:1,since:w.day,lastMonthly:monthStart(w.day,w.scriptId),seed:546,bonds:{},marriages:historicalMarriages.map((m,i)=>({id:'marriage:historical:'+i,a:m.a,b:m.b,from:w.day,until:null,origin:'historical'})),maritalBasis:Object.fromEntries( allPeople(w).map(p=>[p.id,p.id==='xiao-yan'?'widowed':historicalMarriages.some(m=>m.a===p.id||m.b===p.id)?'recorded':'free'])),opinions:{},hooks:{},reserves:Object.fromEntries( allPeople(w).map(p=>[p.id,120])),oaths:{},regencies:{},cooldowns:{},scheme:null,history:[]};
 for(const r of worldRealms(w)){const g=governmentOf(w,r);if(g&&g.executives[0]&&isAlive(w,g.ruler)&&g.executives[0]!==g.ruler)state.regencies[r]={realm:r,regimeId:g.regimeId,basis:powerBasis(w,r),ruler:g.ruler,controller:g.executives[0],since:w.day,grip:70,origin:'scenario'};}
 return state;
}
export function ensureRelationships(w:World){if(w.social&&w.characterId)w.relationships??=newRelationships(w);const s=w.relationships;if(!s)return;for(const [id,basis] of Object.entries(s.maritalBasis))if(basis==='unknown'){const marriage=activeMarriage(w,id);s.maritalBasis[id]=marriage?marriage.origin==='historical'?'recorded':'simulation':'free';}}
export function activeMarriage(w:World,id:string){return w.relationships?.marriages.find(m=>m.until===null&&(m.a===id||m.b===id));}
export function spouseOf(w:World,id:string){const m=activeMarriage(w,id);return m?(m.a===id?m.b:m.a):null;}
export const friendship=(w:World,a:string,b:string)=>w.relationships?.bonds[bondKey(a,b)]?.kind;
export function relationshipBonus(w:World,a:string,b:string){const kind=friendship(w,a,b),o=w.relationships?.oaths;return (kind==='friend'?15:kind==='confidant'?25:kind==='rival'?-25:kind==='nemesis'?-40:0)+(spouseOf(w,a)===b?20:0)+(o?.[a]?.lord===b||o?.[b]?.lord===a?10:0);}
/** a is the interaction initiator; this score is b's opinion of a (legacy key direction). */
export function opinionBreakdown(w:World,a:string,b:string){
 const source= getPerson(w,a)!,observer= getPerson(w,b)!;
 const same=!!source&&!!observer&&source.realm===observer.realm,related=!! getCharacter(w,a)!&&!! getCharacter(w,b)!&&kin(a,b,w);
 const initial=related?25:same?10:-25;
 const memory=w.social?.opinions[pair(a,b)]??w.relationships?.opinions[pair(a,b)]??initial;
 const parts:{label:string;value:number}[]=[{label:related?'亲属基础':same?'同朝基础':'异国基础',value:initial},{label:'交往积累',value:memory-initial}];
 const own= getCharacter(w,a)!?traitsFor(w,a):[],other= getCharacter(w,b)!?traitsFor(w,b):[];
 const common=own.filter(t=>other.includes(t));
 if(common.length)parts.push({label:'性情相近 · '+common.map(t=>traitDefinitions[t].name).join('、'),value:Math.min(8,common.length*4)});
 if(own.includes('frugal')&&other.includes('generous')||own.includes('generous')&&other.includes('frugal'))parts.push({label:'节俭与慷慨相冲',value:-10});
 if(own.includes('gregarious'))parts.push({label:'你的善交',value:8});
 if(other.includes('wary'))parts.push({label:'对方多疑',value:-6});
 const kind=friendship(w,a,b),friend={friend:15,confidant:25,rival:-25,nemesis:-40};
 if(kind)parts.push({label:kind==='friend'?'朋友':kind==='confidant'?'至交':kind==='rival'?'仇敌':'死敌',value:friend[kind]});
 if(spouseOf(w,a)===b)parts.push({label:'配偶',value:20});
 if(w.relationships?.oaths[a]?.lord===b||w.relationships?.oaths[b]?.lord===a)parts.push({label:'效忠誓约',value:10});
 if(source&&observer&&!same){
  const relation=diplomaticPair(w,source.realm,observer.realm);
  if(relation)parts.push({label:'两国关系 · '+attitude(relation.opinion),value:Math.round(relation.opinion/5)});
  if(atWar(w,source.realm,observer.realm))parts.push({label:'两国交战',value:-30});
 }
 const raw=parts.reduce((n,p)=>n+p.value,0),total=cap(raw,100,-100);
 if(raw!==total)parts.push({label:'好感上下限',value:total-raw});
 return {parts,total};
}
export function relationOpinion(w:World,a:string,b:string){return opinionBreakdown(w,a,b).total;}
export function changeRelationOpinion(w:World,a:string,b:string,delta:number){const key=pair(a,b);if(w.social&&Object.hasOwn(w.social.opinions,key))w.social.opinions[key]=cap(w.social.opinions[key]+delta,100,-100);else if(w.relationships){const initial=opinionBreakdown(w,a,b).parts[0].value;w.relationships.opinions[key]=cap((w.relationships.opinions[key]??initial)+delta,100,-100);}}
export function relationHooks(w:World,a:string,b:string){return w.social?.hooks[pair(a,b)]??w.relationships?.hooks[pair(a,b)]??0;}
function spendHooks(w:World,a:string,b:string,n:number){const key=pair(a,b);if(w.social&&Object.hasOwn(w.social.hooks,key))w.social.hooks[key]-=n;else w.relationships!.hooks[key]=(w.relationships!.hooks[key]??0)-n;}
export function closeKin(a:string,b:string,w?:World){if(a===b)return true;const links=w?parentLinksOf(w):[...parentLinks,...relationshipParents];const ancestors=(id:string)=>{const found=new Set<string>(),todo=[id];for(let i=0;i<todo.length;i++)for(const l of links)if(l.child===todo[i]&&!found.has(l.parent)){found.add(l.parent);todo.push(l.parent);}return found;};const x=ancestors(a),y=ancestors(b);return x.has(b)||y.has(a)||[...x].some(id=>y.has(id))||!!getPerson(w,a)?.family&&getPerson(w,a)?.family===getPerson(w,b)?.family;}
export function relationshipScore(w:World,target:string){
 const a=w.characterId!,p= getPerson(w,target)!;if(!p||target===a)return [];
 if( !!getCharacter(w,target))return acceptance(w,target);
 return [{label:'基础',value:10},{label:'当前好感',value:relationOpinion(w,a,target)},{label:'外交',value:attributes(w).diplomacy*2},{label:'政权关系',value:allegianceRealm(w,target)===currentRealm(w)?15:-40}];
}
function log(w:World,actor:string,target:string|null,text:string){const s=w.relationships!;s.history.push({day:w.day,actor,target,text});s.history=s.history.slice(-100);w.chronicle.push({day:w.day,person:'player',text});w.chronicle=w.chronicle.slice(-100);}
export function setFriendship(w:World,a:string,b:string,kind:Friendship){if(!w.relationships)return;w.relationships.bonds[bondKey(a,b)]={a,b,kind,since:w.day};}
export function oathCycle(w:World,follower:string,lord:string){const seen=new Set([follower]);let next:string|undefined=lord;while(next){if(seen.has(next))return true;seen.add(next);next=w.relationships?.oaths[next]?.lord;}return false;}
/** Derived monthly control change; no new stored resource or calendar-driven restoration. */
export function regencyBalance(w:World,r:RealmId){
 const c=validRegency(w,r),g=governmentOf(w,r);if(!c||!g||c.origin==='restored')return {delta:0,parts:[] as {label:string;value:number}[]};
 const allegiance=(id:string)=>id===c.controller?1:id===c.ruler?-1:w.relationships?.oaths[id]?.lord===c.controller?1:w.relationships?.oaths[id]?.lord===c.ruler?-1:Math.sign(relationOpinion(w,id,c.controller)-relationOpinion(w,id,c.ruler));
 const officials=[...new Set([...Object.values(g.court?.ministries??{}),...Object.values(w.realm!.cities).filter(v=>v.owner===r).map(v=>v.governor)].filter((id):id is string=>!!id&&isAlive(w,id)))];
 const armies=w.realm!.armies.filter(a=>a.realm===r);let backing=0,total=0;for(const a of armies)for(const u of a.regiments??[]){total+=u.troops;backing+=u.troops*((u.commanderLoyalty??0)>(u.institution??0)&&u.loyalTo?allegiance(u.loyalTo):g.executives.includes(c.controller)?1:-1);}
 const parts=[{label:'执政席位',value:g.executives.includes(c.controller)?2:-2},{label:'朝廷支持',value:g.support>=60?1:g.support<40?-2:-1},{label:'官员倾向',value:Math.sign(officials.reduce((n,id)=>n+allegiance(id),0))},{label:'实际兵权',value:total?Math.round(2*backing/total):0},{label:'君主合法性',value:g.legitimacy>=70?-1:0}];
 return {parts,delta:Math.max(-4,Math.min(2,parts.reduce((n,p)=>n+p.value,0)))};
}
export function authorityScore(w:World,id:string){const p= getPerson(w,id)!;if(!p||!w.realm)return 0;const r=allegianceRealm(w,id)??p.realm,g=governmentOf(w,r)!;return (governingExecutives(w,r).includes(id)?60:0)+(g.ruler===id?30:0)+(Object.values(g.court?.ministries??{}).includes(id)?20:0)+localPoliticalBasis(w,id,p.realm)+Math.floor((g.merit[id]??0)/5);}
export function validRegency(w:World,r:RealmId){const p=w.relationships?.regencies?.[r];return p&&p.basis===powerBasis(w,r)&&p.regimeId===governmentOf(w,r)?.regimeId?p:undefined;}
export function allegianceBonus(w:World,r:RealmId){const chiefs=governingExecutives(w,r);return Math.min(9,Object.entries(w.relationships?.oaths??{}).filter(([id,o])=>allegianceRealm(w,id)===r&&o.loyalty>=70&&chiefs.includes(o.lord)).length*3);}
export function relationshipQuote(w:World,command:RelationshipCommand){
 const s=w.relationships,a=w.characterId!,target='target'in command?command.target:null,action=command.action;
 const score=target&&s?relationshipScore(w,target).reduce((n,v)=>n+v.value,0)+(action==='marry'?marriageClanBonus(w,a,target):0):0;
 const costs:Partial<Record<RelationshipAction,number>>={gift:30,befriend:25,confidant:40,reconcile:60,marry:100,divorce:60,control:120,emancipate:50};const legacy=target&& !!getCharacter(w,target)&&(action==='gift'||action==='pressure')?interactionQuote(w,target,action):null;const cost=legacy?.cost??costs[action as RelationshipAction]??0;
 const influence:Partial<Record<RelationshipAction,number>>={pledge:10,recruit:20,renounce:20,control:60,tighten:20,emancipate:30};const power=influence[action as RelationshipAction]??0;
 const chance=cap(action==='control'?35+attributes(w).intrigue*3+(target?relationHooks(w,a,target)*5:0):score,95,5),days=action==='control'?30:action==='befriend'?14:0;
 const reason=()=>{
 if(!s||!w.social||!a)return '仅已录历史人物可经营关系';if(w.campaign?.status!=='active')return '本局已结束';if(w.realm?.event)return '先处理待决事务';if(w.people[0].journey&&!['gift','aid','divorce','rival','renounce','release'].includes(action))return '抵达后才能安排交往';
 if(action==='cancel')return s.scheme?'':'没有进行中的关系计谋';if(action==='marital-branch')return s.maritalBasis[a]!=='unknown'?'已有婚姻状态，不可覆盖':'';
 if(!Object.hasOwn(relationshipActionNames,action)||!target||!getPerson(w,target)||target===a)return '无效互动对象或行动';
 if(!isAlive(w,a)||!isAlive(w,target))return '人物已经去世';
 if(w.social.lineage.slice(0,-1).some(p=>p.id===target))return '对方已退居，不再参与交往';
 const kind=friendship(w,a,target),key=pair(a,target)+'|'+action;
 if((s.cooldowns[key]??0)>w.day)return '冷却剩余 '+(s.cooldowns[key]-w.day)+' 日';if(w.people[0].coins<cost)return `需个人钱 ${cost}`;if(power&&(!w.realm||w.realm.influence<power))return `需沙盒影响力 ${power}`;
 if(legacy)return legacy.reason;
 if(['pledge','recruit'].includes(action)&&allegianceRealm(w,a)!==allegianceRealm(w,target))return '须同一政权人物';
 if(w.mobility&&['befriend','confidant','reconcile','marry','pledge','recruit','control','tighten'].includes(action)&&!together(w,a,target))return '须同城会面，可先约定行程';
 if(action==='gift')return s.reserves[target]+30>1_000_000?'对方私财已达容量':'';
 if(action==='pressure')return w.social.renown<10?'需家业名望 10':relationHooks(w,a,target)>=3?'最多保留 3 份人情':'';
 if(action==='befriend')return s.scheme||w.social.scheme?'已有长期交往或权力计谋':kind==='friend'||kind==='confidant'?'已经是朋友':kind==='rival'||kind==='nemesis'?'先调解仇怨':'';
 if(action==='confidant')return kind!=='friend'?'先成为朋友':score<85?'成为至交需接受度 85':w.day-(s.bonds[bondKey(a,target)]?.since??w.day)<30?'友谊至少持续 30 日':'';
 if(action==='rival')return kind==='nemesis'?'已经是死敌':w.social.renown<10?'决裂需家业名望 10':'';
 if(action==='reconcile')return kind!=='rival'&&kind!=='nemesis'?'没有需要调解的仇怨':score<30?'调解接受度需达到 30':'';
 if(action==='marry')return quoteFamilyMarriage(w,{type:'familyMarriage',subject:a,target,coins:100,residence:personResidence(w,a).site,family:getPerson(w,a)!.family}).reason;
 if(action==='divorce')return spouseOf(w,a)!==target?'此人不是当前配偶':w.social.renown<20?'解除婚姻需家业名望 20':'';
 if(action==='aid')return !['friend','confidant'].includes(kind??'')&&spouseOf(w,a)!==target?'仅配偶或朋友可请求支援':score<40?'亲友支援接受度需达到 40':s.reserves[target]<50?'对方私人储备不足 50':w.people[0].coins+50>1_000_000?'个人钱包容量不足':'';
 if(!w.realm)return '政治关系仅历史沙盒可用';const r=currentRealm(w),g=governmentOf(w,r)!,control=validRegency(w,r);
 if(allegianceRealm(w,target)!==r)return '效忠与朝廷控制限同一政权，不自动转移领土';
 if(action==='pledge')return w.retinue?.members[a]?'已入幕府，须先离幕再宣誓':s.oaths[a]?'已有个人誓约，须先解除':g.ruler===a?'君主不能宣誓成为个人属员':authorityScore(w,target)<=authorityScore(w,a)?'对方须有更高的军政权力':oathCycle(w,a,target)?'效忠关系会形成循环':kind==='rival'||kind==='nemesis'?'不能向仇敌宣誓':score<40?'效忠接受度需达到 40':'';
 if(action==='recruit')return w.retinue?.members[target]?'对方已有幕府归属，须先离幕再招纳效忠':(ageAt(w,target)??0)<16?'只能招纳成年效忠者':s.oaths[target]?'对方已有誓约':g.ruler===target?'不能以普通效忠取代君主地位':authorityScore(w,a)<=authorityScore(w,target)?'需高于对方的军政权力':oathCycle(w,target,a)?'效忠关系会形成循环':score<65?'招纳接受度需达到 65':'';
 if(action==='release')return s.oaths[target]?.lord!==a?'对方不是你的效忠者':'';
 if(action==='renounce')return s.oaths[a]?.lord!==target?'此人不是你的誓约领主':w.social.renown<20?'背誓需家业名望 20':'';
 if(action==='control')return target!==g.ruler?'只能筹划控制本国名义君主':s.scheme||w.social.scheme?'已有长期交往或权力计谋':control?.controller===a?'你已掌握实际执政权':authorityScore(w,a)<20?'需中央任职、辖地或执政基础':(g.merit[a]??0)<40?'需功绩 40':relationHooks(w,a,target)<2?'需掌握君主 2 份人情':g.task||g.court?.founding?'先结束制度或建朝议程':'';
 if(action==='tighten'||action==='liberate')return !control||control.origin==='restored'||control.controller!==a||control.ruler!==target?'你未控制此君主':action==='tighten'&&control.grip>=100?'控制已达上限':'';
 if(action==='emancipate')return !control||control.origin==='restored'||control.ruler!==a||control.controller!==target?'你不是受此人控制的名义君主':'';
 return '未知关系行动';
 };
 return {reason:reason(),cost,influence:power,score,chance,days};
}
function resetAuthority(w:World,r:RealmId){const g=governmentOf(w,r)!;g.task=null;w.realm!.offices=w.realm!.offices.filter(o=>allegianceRealm(w,o.candidate)!==r);if(currentRealm(w)===r)w.realm!.mandate=governmentExecutive(w);syncCourt(w,r);}
function restoreRule(w:World,r:RealmId){const c=validRegency(w,r)!;c.controller=c.ruler;c.origin='restored';c.grip=0;resetAuthority(w,r);log(w,c.ruler,null,relationName(c.ruler,w)+'恢复亲政；任命、军务与改革权限重新核定。');}
export function actRelationship(w:World,command:RelationshipCommand){const q=relationshipQuote(w,command);if(q.reason)throw new Error(q.reason);const s=w.relationships!,a=w.characterId!;
 if(command.action==='cancel'){s.scheme=null;log(w,a,null,'撤回关系计谋，已付成本不退。');return;}
 if(command.action==='marital-branch'){s.maritalBasis[a]='simulation';log(w,a,null,'明确建立架空未婚起点；不把未录婚姻解释为历史单身。');return;}
 if(!('target' in command))throw new Error('无效互动命令');
 const b=command.target,action=command.action,key=pair(a,b)+'|'+action;
 if(action==='marry'){actFamilyMarriage(w,{type:'familyMarriage',subject:a,target:b,coins:100,residence:personResidence(w,a).site,family:getPerson(w,a)!.family});return;}
 if( !!getCharacter(w,b)&&(action==='gift'||action==='pressure')){applySocial(w,{type:'interact',target:b,action});s.history.push({day:w.day,actor:a,target:b,text:relationName(a,w)+'对'+relationName(b,w)+'执行「'+relationshipActionNames[action]+'」。'});s.history=s.history.slice(-100);return;}
 w.people[0].coins-=q.cost;if(q.influence)w.realm!.influence-=q.influence;
 switch(action){
 case 'pressure':{const hook=pair(a,b);if(Object.hasOwn(w.social!.hooks,hook))w.social!.hooks[hook]++;else s.hooks[hook]=(s.hooks[hook]??0)+1;w.social!.renown-=10;w.social!.stress=cap(w.social!.stress+15);changeRelationOpinion(w,a,b,-25);if(['friend','confidant'].includes(friendship(w,a,b)??''))setFriendship(w,a,b,'rival');s.cooldowns[key]=w.day+15;break;}
 case 'gift':changeRelationOpinion(w,a,b,15);s.reserves[b]=cap(s.reserves[b]+30,1_000_000);s.cooldowns[key]=w.day+10;break;
 case 'befriend':s.scheme={kind:'befriend',actor:a,target:b,started:w.day,due:w.day+14,chance:q.chance,basis:null};break;
 case 'confidant':setFriendship(w,a,b,'confidant');changeRelationOpinion(w,a,b,10);w.social!.stress=cap(w.social!.stress-10);break;
 case 'rival':setFriendship(w,a,b,friendship(w,a,b)==='rival'?'nemesis':'rival');changeRelationOpinion(w,a,b,-30);changeRelationOpinion(w,b,a,-30);w.social!.renown-=10;w.social!.stress=cap(w.social!.stress+10);s.cooldowns[key]=w.day+30;break;
 case 'reconcile':delete s.bonds[bondKey(a,b)];changeRelationOpinion(w,a,b,15);changeRelationOpinion(w,b,a,15);s.cooldowns[key]=w.day+90;break;

 case 'divorce':activeMarriage(w,a)!.until=w.day;w.social!.renown-=20;w.social!.stress=cap(w.social!.stress+15);changeRelationOpinion(w,a,b,-40);changeRelationOpinion(w,b,a,-40);setFriendship(w,a,b,'rival');s.cooldowns[pair(a,b)+'|marry']=w.day+360;break;
 case 'aid':s.reserves[b]-=50;w.people[0].coins=cap(w.people[0].coins+50,1_000_000);changeRelationOpinion(w,a,b,-5);s.cooldowns[key]=w.day+90;break;
 case 'pledge':s.oaths[a]={lord:b,since:w.day,loyalty:70};changeRelationOpinion(w,a,b,10);break;
 case 'recruit':s.oaths[b]={lord:a,since:w.day,loyalty:70};changeRelationOpinion(w,a,b,10);break;
 case 'release':delete s.oaths[b];break;
 case 'renounce':delete s.oaths[a];w.social!.renown-=20;setFriendship(w,a,b,'rival');changeRelationOpinion(w,a,b,-35);changeRelationOpinion(w,b,a,-35);s.cooldowns[pair(a,b)+'|pledge']=w.day+180;break;
 case 'control':spendHooks(w,a,b,2);s.scheme={kind:'control',actor:a,target:b,started:w.day,due:w.day+30,chance:q.chance,basis:powerBasis(w,currentRealm(w))};s.cooldowns[key]=w.day+180;break;
 case 'tighten':{const c=validRegency(w,currentRealm(w))!;c.grip=cap(c.grip+15);governmentOf(w)!.legitimacy=cap(governmentOf(w)!.legitimacy-3);changeRelationOpinion(w,a,b,-10);s.cooldowns[key]=w.day+30;break;}
 case 'emancipate':{const c=validRegency(w,currentRealm(w))!;c.grip=cap(c.grip-25);s.cooldowns[key]=w.day+30;if(c.grip===0)restoreRule(w,currentRealm(w));break;}
 case 'liberate':restoreRule(w,currentRealm(w));break;
 }
 log(w,a,b,relationName(a,w)+'对'+relationName(b,w)+'执行「'+relationshipActionNames[action]+'」。');
}
export function syncRelationships(w:World){ensureRelationships(w);const s=w.relationships;if(!s)return;for(const r of worldRealms(w)){if(w.realm?.annexed?.[r]){delete s.regencies[r];continue;}const old=s.regencies[r],g=governmentOf(w,r);if(old?.origin==='custody'&&(!w.custody?.records[g!.ruler]||!activeWars(w).some(v=>v.civil&&v.id===w.custody!.records[g!.ruler].war))){delete s.regencies[r];}if(!s.regencies[r]||old?.basis!==powerBasis(w,r)){if(old){delete s.regencies[r];log(w,old.controller,old.ruler,'政权执政格局变更，旧控制关系结束。');}if(g&&g.executives[0]&&isAlive(w,g.ruler)&&g.executives[0]!==g.ruler)s.regencies[r]={realm:r,regimeId:g.regimeId,basis:powerBasis(w,r),ruler:g.ruler,controller:g.executives[0],since:w.day,grip:70,origin:'scenario'};}}
 if(s.scheme&&(s.scheme.actor!==w.characterId||s.scheme.kind==='control'&&s.scheme.basis!==powerBasis(w, getPerson(w,s.scheme.actor)!.realm))){log(w,s.scheme.actor,s.scheme.target,'人物或朝廷已变，关系计谋失效；成本不退。');s.scheme=null;}
}
export function advanceRelationships(w:World){const s=w.relationships;if(!s)return;syncRelationships(w);
 if(s.scheme&&s.scheme.due<=w.day){const task=s.scheme;s.scheme=null;s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;const success=s.seed/4294967296*100<task.chance;
 if(task.kind==='befriend'){const kind=friendship(w,task.actor,task.target);if(kind==='rival'||kind==='nemesis'){log(w,task.actor,task.target,'双方已经决裂，交友行动失效。');}else if(success){setFriendship(w,task.actor,task.target,'friend');changeRelationOpinion(w,task.actor,task.target,20);awardPrestige(w,task.actor,'friendship');log(w,task.actor,task.target,'与'+relationName(task.target,w)+'成为朋友。');}else {changeRelationOpinion(w,task.actor,task.target,-5);log(w,task.actor,task.target,'培养友谊未能奏效。');}s.cooldowns[pair(task.actor,task.target)+'|befriend']=w.day+30;
 }else {const r= getPerson(w,task.actor)!.realm,g=governmentOf(w,r)!;if(success&&authorityScore(w,task.actor)>=20){s.regencies[r]={realm:r,regimeId:g.regimeId,basis:powerBasis(w,r),ruler:task.target,controller:task.actor,since:w.day,grip:65,origin:'scheme'};resetAuthority(w,r);setFriendship(w,task.actor,task.target,'rival');log(w,task.actor,task.target,'挟制成功：名义君主保留，实际执政权转交'+relationName(task.actor,w)+'。');}else {changeRelationOpinion(w,task.actor,task.target,-30);setFriendship(w,task.actor,task.target,'rival');w.social!.stress=cap(w.social!.stress+20);log(w,task.actor,task.target,'挟制失败或权力基础丢失，君主成为仇敌，压力 +20。');}}
 }
 if(!isMonthStart(w.day,w.scriptId)||s.lastMonthly>=w.day)return;s.lastMonthly=w.day;
 for(const id of Object.keys(s.reserves))if(id!==w.characterId&&isAlive(w,id)&&(ageAt(w,id)??0)>=16)s.reserves[id]=cap(s.reserves[id]+5,1_000_000);
 const personal=Object.values(s.bonds).filter(b=>isAlive(w,b.a)&&isAlive(w,b.b)&&(b.a===w.characterId||b.b===w.characterId)),friends=personal.filter(b=>b.kind==='friend'||b.kind==='confidant').length,rivals=personal.filter(b=>b.kind==='rival'||b.kind==='nemesis').length;
 w.social!.stress=cap(w.social!.stress-Math.min(6,friends*2)+maritalStress(w,w.characterId!)+Math.min(9,rivals*3));
 for(const [id,o] of Object.entries(s.oaths)){const kind=friendship(w,id,o.lord);o.loyalty=cap(o.loyalty+(kind==='rival'||kind==='nemesis'?-15:relationshipBonus(w,id,o.lord)>10?3:relationOpinion(w,o.lord,id)>=40?2:-1));if(o.loyalty===0){delete s.oaths[id];log(w,id,o.lord,'效忠者离心，誓约自动解除。');}}
 for(const r of worldRealms(w)){const c=validRegency(w,r);if(c&&c.origin!=='restored'){c.grip=cap(c.grip+regencyBalance(w,r).delta);if(c.grip===0&&c.origin!=='custody')restoreRule(w,r);}}
}

/** Personal receipts use the same wallet whether the holder is playable or an NPC. */
export function creditPersonalCoins(w:World,id:string,amount:number){if(!Number.isSafeInteger(amount)||amount<0)throw new Error('无效个人入账');if(id===w.characterId)w.people[0].coins=Math.min(1_000_000,w.people[0].coins+amount);else if(w.relationships&&Object.hasOwn(w.relationships.reserves,id))w.relationships.reserves[id]=Math.min(1_000_000,w.relationships.reserves[id]+amount);}

/** Derived from reciprocal existing opinions, never a second love resource. */
export function maritalStress(w:World,id:string){const spouse=spouseOf(w,id);if(!spouse)return 0;const opinion=Math.min(relationOpinion(w,id,spouse),relationOpinion(w,spouse,id));return opinion>=40?-2:opinion<0?3:0;}
export function maritalHarmony(w:World,id:string){const n=maritalStress(w,id);return n<0?'和睦':n>0?'冲突':'疏远';}
