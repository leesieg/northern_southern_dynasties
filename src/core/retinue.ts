import {getPerson,allPeople} from './personRegistry';
import {detained} from './custodyState';
import {isMonthStart,monthStart,monthIndex} from './calendar';
import {isSovereign} from './officialDuties';

import {siteById} from '../data/scenario';
import {isAlive,ageAt,lifeOf} from './lifeState';
import {attributes,traitsFor} from './social';
import {creditPersonalCoins,relationOpinion,changeRelationOpinion} from './relationships';
import {officeHierarchy} from './offices';
import {personResidence,presentAt} from './residence';
import {planRoute} from './world';
import {canEnter,atWar} from './diplomacy';
import {governingExecutives} from './government';
import type {World} from './types';
const politicalName=(id:string,w?:World)=>getPerson(w,id)?.name??id;
export const retinuePosts={
 engineer:{name:'营造参军',icon:'estate',skill:'stewardship',effect:'驻城后解锁城市营建；才干缩短新工程工期。',official:true},
 steward:{name:'仓曹',icon:'grain',skill:'stewardship',effect:'解锁整备行粮；在有治理权的城市可清查仓赋。',official:false},
 marshal:{name:'军司马',icon:'army',skill:'martial',effect:'驻营后可整训军伍，提高驻军士气。',official:true},
 secretary:{name:'典签',icon:'diligent',skill:'diplomacy',effect:'解锁修书荐举，增加本国求官接受度。',official:false},
} as const;
export type RetinuePost=keyof typeof retinuePosts;
export interface Retainer {host:string;joined:number;post:RetinuePost|null;site:string|null;arrears:number}
export interface RetinueState {version:1;since:number;lastMonth:number;members:Record<string,Retainer>;cooldowns:Record<string,number>;recommendations:Record<string,{until:number;bonus:number}>;history:{day:number;host:string;person:string;text:string}[]}
export type RetinueCommand={type:'retinue';action:'recruit'|'dismiss'|'unassign';person:string}|{type:'retinue';action:'assign';person:string;post:RetinuePost;site?:string}|{type:'retinue';action:'work';post:RetinuePost;task:'resupply'|'audit'|'drill'|'recommend'};
export function ensureRetinue(w:World){if(w.mode==='sandbox')w.retinue??={version:1,since:w.day,lastMonth:monthStart(w.day,w.scriptId),members:{},cooldowns:{},recommendations:{},history:[]};if(w.retinue)for(const [id,m] of Object.entries(w.retinue.members))if(isSovereign(w,m.host)||w.relationships?.oaths[id])release(w,id,'因中央任职或已有个人誓约而解除幕府编制');return w.retinue;}
export const retinueMembers=(w:World,host=w.characterId!)=>Object.entries(w.retinue?.members??{}).filter(([,m])=>m.host===host).map(([id,m])=>({id,...m}));
export function isOfficial(w:World,id:string){return officeHierarchy(w,id).some(n=>n.holder===id&&n.active&&['city','office','executive','sovereign'].includes(n.kind));}
function hasPublicDuties(w:World,id:string){return officeHierarchy(w,id).some(n=>n.holder===id&&n.active&&['city','office','executive','sovereign'].includes(n.kind));}
export function retinueBusy(w:World,id:string){return !!w.retinue?.members[id];}
function externalBusy(w:World,id:string){return w.diplomacy?.missions.some(m=>m.envoy===id)||w.realm?.offices.some(o=>o.candidate===id)||!!w.mobility?.appointments[id]||(Object.values(w.mobility?.commanders??{}).includes(id)||Object.values(w.mobility?.armyCommanders??{}).includes(id))||w.mobility?.activities.some(a=>!['done','cancelled'].includes(a.phase)&&(a.actor===id&&!a.delegate||a.delegate===id))||w.service?.tasks.some(t=>t.phase!=='closed'&&(t.officer===id||t.helper===id))||w.duties?.task?.phase!=='closed'&&w.duties?.task?.officer===id;}
function adult(w:World,id:string){return (ageAt(w,id)??( getPerson(w,id)?.adult?18:0))>=16;}
const money=(w:World,id:string)=>id===w.characterId?w.people[0].coins:w.relationships?.reserves[id]??0;
function pay(w:World,id:string,n:number){if(id===w.characterId)w.people[0].coins-=n;else if(w.relationships)w.relationships.reserves[id]-=n;}
function log(w:World,host:string,person:string,text:string){w.retinue!.history.push({day:w.day,host,person,text});w.retinue!.history=w.retinue!.history.slice(-80);if(host===w.characterId){w.chronicle.push({day:w.day,person:'player',text});w.chronicle=w.chronicle.slice(-100);}}
export function recruitmentScore(w:World,host:string,id:string){return [{label:'延聘礼遇',value:40},{label:'对主公交情',value:relationOpinion(w,host,id)},{label:'善交',value:traitsFor(w,host).includes('gregarious')?8:0},{label:'谨慎择主',value:traitsFor(w,id).includes('wary')?-10:0}];}
export function retinueAptitude(w:World,id:string,post:RetinuePost){return Math.min(100,attributes(w,id)[retinuePosts[post].skill]*5+(traitsFor(w,id).includes('diligent')?10:0));}
export function postStatus(w:World,post:RetinuePost,site?:string,host=w.characterId!){
 const m=retinueMembers(w,host).find(m=>m.post===post);
 let reason=isSovereign(w,host)?'君主使用中央官职':!m?'须先任命'+retinuePosts[post].name:!isAlive(w,m.id)?'任职者已故':m.arrears?'幕府欠俸，职务暂停':lifeOf(w,m.id)?.illness?.severity===3?'任职者重病':retinuePosts[post].official&&!isOfficial(w,host)?'主公已无官职，幕职暂停':externalBusy(w,m.id)?'任职者另有公务':site&&m.site!==site?'须将'+retinuePosts[post].name+'派驻本城':!presentAt(w,m.id,site??personResidence(w,host).site)?'任职者尚未到岗':'';
 if(!reason&&site){const r= getPerson(w,host)?.realm;if(r&&(!w.realm||w.realm.cities[site].controller!==r||w.realm.cities[site].owner!==r))reason='驻地不受本国控制';}
 return {member:m,reason,aptitude:m?retinueAptitude(w,m.id,post):0};
}
export function recommendationBonus(w:World,id:string){const r=w.retinue?.recommendations[id];return r&&r.until>w.day?r.bonus:0;}
export function retinueQuote(w:World,c:RetinueCommand,host=w.characterId!){
 let reason='',cost=c.action==='recruit'?30:c.action==='work'?c.task==='resupply'?10:15:0;const s=w.retinue,r= getPerson(w,host)?.realm;
 if(!s||!r||!w.realm||!isAlive(w,host)||!adult(w,host)||w.campaign?.status!=='active')reason='当前人物不能经营幕府';
 else if(isSovereign(w,host)&&!['dismiss','unassign'].includes(c.action))reason='君主通过中央官职任命与委办公务，不另设幕府';
 else if(w.social?.lineage.slice(0,-1).some(p=>p.id===host))reason='退居后不能重新经营幕府';
 else if(w.retinue?.members[host])reason='已入他人幕府，不能另立幕府';
 else if(detained(w,host))reason='被拘押期间无法安排幕府';
 else if(c.action==='recruit'){
  const p= getPerson(w,c.person)!,at=personResidence(w,c.person),to=personResidence(w,host).site;
  if(c.person===w.characterId&&host!==w.characterId)reason='须本人同意，不自动入幕';
  else if(!p||c.person===host||!isAlive(w,c.person)||!adult(w,c.person))reason='须选择另一位在世成年人物';
  else if(w.relationships?.oaths[c.person])reason='对方已有个人誓约，请先解除效忠再延聘入幕';
  else if(s.members[c.person]||retinueMembers(w,c.person).length)reason='此人已有幕府归属';
  else if(hasPublicDuties(w,c.person))reason='此人有公职在身，不能兼入私人幕府';
  else if(externalBusy(w,c.person)||at.traveling||lifeOf(w,c.person)?.illness?.severity===3)reason='对方正在办事、出行或养病';
  else if(w.social?.lineage.slice(0,-1).some(p=>p.id===c.person))reason='对方已经退居';
  else if(retinueMembers(w,host).length>=6)reason='幕府至多容纳六人';
  else if(p.realm!==r)reason='目前只能延聘本国人物';
  else if((s.cooldowns[host+'|hire|'+c.person]??0)>w.day)reason='解聘后须过九十日才能再次延聘';
  else if(recruitmentScore(w,host,c.person).reduce((n,p)=>n+p.value,0)<40)reason='接受度不足 40，可先改善交情';
  else if(!canEnter(w,p.realm,w.realm.cities[to].controller,c.person)||at.site!==to&&!planRoute(at.site,to,site=>canEnter(w,p.realm,w.realm!.cities[site].controller,c.person)))reason='没有可赴任的通行路线';
 }else if(c.action==='work'){
  if(!Object.hasOwn(retinuePosts,c.post)||({resupply:'steward',audit:'steward',drill:'marshal',recommend:'secretary'} as Record<string,string>)[c.task]!==c.post)reason='此职务不能办理这项事务';
  else {const m=retinueMembers(w,host).find(m=>m.post===c.post),site=m?.site??personResidence(w,host).site,status=postStatus(w,c.post,m?.site??undefined,host);
   reason=status.reason;
   if(!reason&&(s.cooldowns[host+'|work|'+c.task]??0)>w.day)reason=`尚需 ${(s.cooldowns[host+'|work|'+c.task]??0)-w.day} 日`;
   if(!reason&&c.task==='resupply'&&!presentAt(w,host,personResidence(w,m!.id).site))reason='整备行粮须与仓曹同城';
   if(!reason&&c.task==='audit'&&(w.realm.cities[site].governor!==host||w.realm.cities[site].controller!==r))reason='须在亲自治理的本国城市清查';
   if(!reason&&c.task==='drill'&&host===w.characterId&&!w.realm.mandate)reason='须先获得军务授权';
   if(!reason&&c.task==='drill'&&!w.realm.armies.some(a=>a.realm===r&&a.location===site&&!a.journey))reason='驻地没有本国军队';
   if(!reason&&c.task==='recommend'&&governingExecutives(w,r).includes(host))reason='执政者无须向自己荐举';
  }
 }else {
  const m=s.members[c.person];if(!m||m.host!==host)reason='只能安排自己的幕僚';
  else if(c.action==='assign'){
   if(!Object.hasOwn(retinuePosts,c.post))reason='未知幕职';
   else if(retinuePosts[c.post].official&&!isOfficial(w,host))reason='此幕职须由在任官员设置';
   else if(lifeOf(w,c.person)?.illness?.severity===3||externalBusy(w,c.person))reason='此人目前无法任职';
   else if(s.members[c.person].arrears)reason='请先备足俸钱，待下期结清';
   else if(retinueMembers(w,host).some(n=>n.post===c.post&&n.id!==c.person))reason='此职已有任职者，请先免职';
   else if(c.post==='engineer'&&(!c.site||!siteById[c.site]||w.realm.cities[c.site].governor!==host||w.realm.cities[c.site].controller!==r))reason='营造参军须派驻亲自治理的城市';
   else if(c.post==='marshal'&&host===w.characterId&&!w.realm.mandate)reason='须先获得军务授权';
   else if(c.post==='marshal'&&(!c.site||!siteById[c.site]||!w.realm.armies.some(a=>a.realm===r&&a.location===c.site&&!a.journey)))reason='军司马须派驻本国军营';
   else if(c.site&&(!siteById[c.site]||w.realm.cities[c.site].controller!==r||w.realm.cities[c.site].owner!==r))reason='须选择本国控制的城市';
   else if(retinueAptitude(w,c.person,c.post)<35)reason='此职适任度须达 35';
  }else if(!['dismiss','unassign'].includes(c.action))reason='未知幕府行动';
 }
 if(!reason&&money(w,host)<cost)reason=`需个人钱 ${cost}`;
 let effect='';
 if(c.action==='work'&&Object.hasOwn(retinuePosts,c.post)){const m=retinueMembers(w,host).find(m=>m.post===c.post),apt=m?retinueAptitude(w,m.id,c.post):0;effect=c.task==='resupply'?`行粮 +${20+Math.floor(apt/10)}；冷却 30 日`:c.task==='audit'?`公款 +${15+Math.floor(apt/5)}，本城秩序 +3（至多 100）；冷却 90 日`:c.task==='drill'?`驻军士气 +${5+Math.floor(apt/10)}（至多 100）；冷却 90 日`:`求官接受度 +${4+Math.floor(apt/10)}，持续 90 日；冷却 90 日`;}
 return {reason,cost,effect};
}
export function actRetinue(w:World,c:RetinueCommand,host=w.characterId!){
 const q=retinueQuote(w,c,host);if(q.reason)throw new Error(q.reason);pay(w,host,q.cost);const s=w.retinue!;
 if(c.action==='recruit'){s.members[c.person]={host,joined:w.day,post:null,site:null,arrears:0};log(w,host,c.person,politicalName(c.person,w)+'受聘入幕，束脩 30 钱；每月俸钱 2。');return;}
 if(c.action==='dismiss'){release(w,c.person,'解聘离幕');return;}
 if(c.action==='unassign'){s.members[c.person].post=null;s.members[c.person].site=null;log(w,host,c.person,politicalName(c.person,w)+'卸下幕职，仍留幕府。');return;}
 if(c.action==='assign'){const m=s.members[c.person];m.post=c.post;m.site=c.site??null;log(w,host,c.person,'任命'+politicalName(c.person,w)+'为'+retinuePosts[c.post].name+'，每月俸钱 4。');return;}
 if(c.action!=='work')throw new Error('未知幕府命令');
 const status=postStatus(w,c.post,retinueMembers(w,host).find(m=>m.post===c.post)?.site??undefined,host),m=status.member!,site=m.site??personResidence(w,host).site,r= getPerson(w,host)!.realm;
 s.cooldowns[host+'|work|'+c.task]=w.day+(c.task==='resupply'?30:90);
 let result='';
 if(c.task==='resupply'){const gain=20+Math.floor(status.aptitude/10);if(host===w.characterId)w.people[0].food=Math.min(1_000_000,w.people[0].food+gain);result='整备行粮 +'+gain;}
 if(c.task==='audit'){const city=w.realm!.cities[site],coins=15+Math.floor(status.aptitude/5),order=Math.min(100-city.order,3);w.realm!.treasuries[r].coins=Math.min(1_000_000,w.realm!.treasuries[r].coins+coins);city.order+=order;result='清查仓赋：公款 +'+coins+'，秩序 +'+order;}
 if(c.task==='drill'){const army=w.realm!.armies.find(a=>a.realm===r&&a.location===site&&!a.journey)!,gain=Math.min(100-army.morale,5+Math.floor(status.aptitude/10));army.morale+=gain;result='整训军伍：士气 +'+gain;}
 if(c.task==='recommend'){const bonus=4+Math.floor(status.aptitude/10);s.recommendations[host]={until:w.day+90,bonus};result='修书荐举：求官接受度 +'+bonus+'，持续九十日';}
 changeRelationOpinion(w,host,m.id,2);log(w,host,m.id,politicalName(m.id,w)+'办理'+result+'。');
}
function release(w:World,id:string,why:string){const m=w.retinue!.members[id];if(!m)return;delete w.retinue!.members[id];w.retinue!.cooldowns[m.host+'|hire|'+id]=w.day+90;log(w,m.host,id,politicalName(id,w)+why+'。');}
export function retinueDestination(w:World,id:string){const m=w.retinue?.members[id];if(!m||!isAlive(w,m.host))return undefined;return m.site??personResidence(w,m.host).site;}
export function advanceRetinue(w:World){const s=w.retinue;if(!s)return;
 const publicHolders=new Set(Object.keys(s.members).length?officeHierarchy(w).filter(n=>n.holder&&n.active&&['city','office','executive','sovereign'].includes(n.kind)).map(n=>n.holder):[]);
 for(const [id,m] of Object.entries(s.members)){
  if(isSovereign(w,m.host)){release(w,id,'因主公使用中央官职而解除幕府编制，可由朝廷重新任官');continue;}
  if(!isAlive(w,id)||!isAlive(w,m.host)||publicHolders.has(id)||w.social?.lineage.slice(0,-1).some(p=>p.id===m.host)){release(w,id,!isAlive(w,id)?'去世，幕职出缺':!isAlive(w,m.host)?'因主公去世离幕':'因任职或主公退居离幕');continue;}
  const r= getPerson(w,m.host)!.realm;if(atWar(w,r, getPerson(w,id)!.realm)){release(w,id,'因两国交战离幕');continue;}
  if(m.post&&retinuePosts[m.post].official&&!publicHolders.has(m.host)){m.post=null;m.site=null;log(w,m.host,id,'主公卸任，'+politicalName(id,w)+'解去幕职。');}
 }
 const month=monthStart(w.day,w.scriptId);if(!isMonthStart(w.day,w.scriptId)||month<=s.lastMonth)return;s.lastMonth=month;
 for(const [id,m] of Object.entries(s.members)){const wage=m.post?4:2,due=wage*(1+m.arrears);if(money(w,m.host)>=due){pay(w,m.host,due);creditPersonalCoins(w,id,due);m.arrears=0;}else{m.arrears++;log(w,m.host,id,politicalName(id,w)+'俸钱未付，职务暂停。');if(m.arrears>=2)release(w,id,'因连续欠俸离幕');}}
 for(const [id,r] of Object.entries(s.recommendations))if(r.until<=w.day)delete s.recommendations[id];
 // NPC hosts compete for the same known candidates and pay their own personal reserves.
 if(monthIndex(w.day,w.scriptId)%3===0)for(const host of allPeople(w).filter(p=>p.status==='roster'&&p.id!==w.characterId&&isAlive(w,p.id)&&isOfficial(w,p.id))){
  if(retinueMembers(w,host.id).length||money(w,host.id)<100)continue;
  const candidate= allPeople(w).find(p=>!retinueQuote(w,{type:'retinue',action:'recruit',person:p.id},host.id).reason);if(!candidate)continue;
  actRetinue(w,{type:'retinue',action:'recruit',person:candidate.id},host.id);
  const city=Object.entries(w.realm!.cities).find(([,c])=>c.governor===host.id&&c.owner===host.realm&&c.controller===host.realm)?.[0];
  const appointment:RetinueCommand=city?{type:'retinue',action:'assign',person:candidate.id,post:'engineer',site:city}:{type:'retinue',action:'assign',person:candidate.id,post:'secretary'};
  if(!retinueQuote(w,appointment,host.id).reason)actRetinue(w,appointment,host.id);
 }
}
