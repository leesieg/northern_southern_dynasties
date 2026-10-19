import {resting} from './householdLife';
import {recordCivilFact} from './civilConduct';
import type {World} from './types';
import type {War} from './wars';
import type {Army,RealmId} from './realm';
import {activeWars} from './wars';
import {governmentOf,governingAuthority,governingExecutives} from './government';
import {powerStakeholders,type PowerArrangement} from './powerPolitics';
import {allegianceRealm} from './officeEligibility';
import {getPerson,allPeople} from './personRegistry';
import {isAlive,ageAt,lifeOf} from './lifeState';
import {detained} from './custodyState';
import {relationOpinion,spouseOf,changeRelationOpinion} from './relationships';
import {kin,traitsFor} from './social';
import {personInfluence,awardInfluence} from './personalInfluence';
import {personResidence} from './residence';
import {armyCommander} from './mobility';
import {localAncestors,countyTerritory,localSuperior} from './localAdministration';
import {movementMood} from './court';
import {roads} from '../data/scenario';
import {civilTransferPreview,joinCivilCamp,civilRevision} from './civilTransfers';
import {civilPromiseBonus,activateCivilPromises,advanceCivilPromises,actCivilPledge,civilPledgeReason,civilPromiseOptions,civilCommitments,type CivilPledgeCommand} from './civilPromises';

export type CivilStance='loyal'|'rebel'|'watch';
export interface CivilMember {choice:CivilStance|'pending';day:number;due:number;checked:number;lastCamp?:'loyal'|'rebel';lastSwitch?:number;unavailable?:string}
export interface CivilMobilization {version:1;source:'political'|'escalation';opened:number;lastDay:number;front:string;members:Record<string,CivilMember>;appeals:Record<string,number>}
export type CivilPoliticsCommand={type:'civilWar';action:'stance';war:number;choice:CivilStance;revision:string}|{type:'civilWar';action:'appeal';war:number;person:string;side:'loyal'|'rebel'}|CivilPledgeCommand;
export const civilStanceNames={loyal:'勤王',rebel:'响应',watch:'观望守土',pending:'待表态'};
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,Math.round(n)));
export const civilCampRealm=(war:War,side:'loyal'|'rebel')=>side==='rebel'?war.attacker:war.defender;
export function civilFixedSide(w:World,war:War,id:string):'loyal'|'rebel'|undefined{
 if(id===war.civil?.claimant)return 'rebel';
 if(id===governmentOf(w,war.defender)?.ruler||governingExecutives(w,war.defender).includes(id))return 'loyal';
}
export function civilCandidates(w:World,r:RealmId,claimant:string){
 const g=governmentOf(w,r)!;
 const ids=powerStakeholders(w,r,{goal:'executive',sponsor:claimant,beneficiary:g.ruler,executive:claimant,name:''});
 for(const p of allPeople(w))if(allegianceRealm(w,p.id)===r&&(w.realm!.armies.some(a=>a.owner===p.id)||personInfluence(w,p.id)>=40))ids.push(p.id);
 return [...new Set(ids)].sort();
}
export function civilAvailability(w:World,war:War,id:string){
 const r=allegianceRealm(w,id);
 return !getPerson(w,id)||!isAlive(w,id)?'人物已经去世':!r||![war.attacker,war.defender].includes(r)?'已不属本场交战双方':(ageAt(w,id)??0)<16?'未满十六岁':detained(w,id)?'被拘押，不能自主表态':resting(w,id)?'正在休养或守丧':(lifeOf(w,id)?.illness?.severity??0)>=3?'重病，暂不能处理政治事务':'';
}
/** Difference in political preference, not a probability or a saved influence pool. */
export function civilPoliticalEvaluation(w:World,r:RealmId,rebel:string,loyal:string,id:string,war?:War,proposed?:PowerArrangement){
 const g=governmentOf(w,r)!,parts:{label:string;value:number}[]=[],add=(label:string,n:number,min:number,max:number)=>parts.push({label,value:clamp(n,min,max)});
 const proposal=w.politics?.proposals[r],arrangement=proposed??war?.civil?.arrangement??proposal;
 const relative=(chief:string)=>kin(id,chief,w)||spouseOf(w,id)===chief;
 const rebelKin=relative(rebel)||!!arrangement&&relative(arrangement.beneficiary),loyalKin=relative(loyal)||relative(g.ruler),oath=w.relationships?.oaths[id];
 add('与双方领袖的关系差',(relationOpinion(w,id,rebel)-relationOpinion(w,id,loyal))/4,-30,30);
 add('亲缘与拥立对象',(rebelKin?25:0)-(loyalKin?25:0),-25,25);
 const preservesCrown=arrangement?.goal==='executive'&&arrangement.beneficiary===g.ruler;
 add('当前效忠誓约',oath?.lord===rebel?oath.loyalty/3:oath&&(oath.lord===loyal||oath.lord===g.ruler)?-oath.loyalty/(preservesCrown&&oath.lord===g.ruler?6:3):0,-30,30);
 const current=allegianceRealm(w,id),held=Object.values(w.realm!.cities).some(c=>c.governor===id)||Object.values(g.court?.ministries??{}).includes(id);
 add('合法性与现有职权',-(g.legitimacy-20)/(preservesCrown&&g.legitimacy>20?10:5)-(held&&current===r?4:0),-20,10);
 const group=g.court?.members[id]??(current&&governmentOf(w,current)?.court?.members[id]),goal=arrangement?.goal??'dynasty';
 const superior=localSuperior(w,countyTerritory(personResidence(w,id).site),current??r)?.holder,superiorChoice=superior&&war?.civil?.mobilization?.members[superior]?.choice;
 const groupRealm=current??r,mood=group&&group!=='unaligned'&&governmentOf(w,groupRealm)?.court?movementMood(w,groupRealm,group).satisfaction:50;
 add('集团诉求、政治目标与上级立场',(group==='dynastic'&&goal!=='executive'?-10:group==='reform'&&goal==='executive'?5:0)+(50-mood)/5+(superiorChoice==='rebel'?5:superiorChoice==='loyal'?-5:0),-15,15);
 const traits=traitsFor(w,id);add('性格与守约倾向',(traits.includes('ambitious')?6:0)-(traits.includes('steadfast')&&oath?6:0)-(traits.includes('wary')?3:0),-10,10);
 const site=personResidence(w,id).site,near=new Set([site,...roads.filter(e=>!e.legacyOnly&&(e.from===site||e.to===site)).map(e=>e.from===site?e.to:e.from)]),strength=(realm:RealmId)=>w.realm!.armies.filter(a=>a.realm===realm&&near.has(a.location)&&!a.journey).reduce((n,a)=>n+a.troops,0),attacker=war?.attacker;
 const a=attacker?strength(attacker):w.realm!.armies.filter(a=>a.owner===rebel||armyCommander(w,a)===rebel).reduce((n,a)=>n+a.troops,0),b=strength(r)-(attacker?0:a);
 add('当地军力与生存压力',(a-b)/Math.max(100,a+b)*15,-15,15);
 add('已公开的战争优势',war?war.score/5+(w.realm!.cities[war.target].controller===war.attacker?10:0):0,-20,20);
 const legacyPromise=proposal?.sponsor===rebel&&proposal.promises[id]?30:0,newPromise=war?civilPromiseBonus(w,war,id):0;
 add('有效待遇承诺',newPromise>=0?Math.max(legacyPromise,newPromise):legacyPromise+newPromise,-30,30);
 if(war){const m=war.civil?.mobilization;add('定向劝说',(m?.appeals[id+'|rebel']!==undefined&&w.day-m.appeals[id+'|rebel']<30?15:0)-(m?.appeals[id+'|loyal']!==undefined&&w.day-m.appeals[id+'|loyal']<30?15:0),-15,15);}
 let score=clamp(parts.reduce((n,p)=>n+p.value,0),-100,100);
 const conscience=rebelKin&&loyalKin&&Math.abs(score)<45;
 if(conscience){parts.push({label:'两方皆有牵系，暂不决裂',value:-score});score=0;}
 return {score,parts,choice:(score>=25?'rebel':score<=-25?'loyal':'watch') as CivilStance,conscience};
}
export function civilStanceEvaluation(w:World,war:War,id:string){
 const loyal=governingAuthority(w,war.defender),evaluation=civilPoliticalEvaluation(w,war.defender,war.civil!.claimant,loyal,id,war);
 return {...evaluation,reason:civilAvailability(w,war,id),fixed:civilFixedSide(w,war,id)};
}
function qualifies(w:World,war:War){
 if(!war.civil||war.attacker===war.defender)return false;
 if(war.civil.grievance===undefined)return true;
 const sites=Object.keys(w.realm!.cities).filter(id=>w.realm!.cities[id].controller===war.attacker),districts=new Set(sites.flatMap(id=>localAncestors(countyTerritory(id)).filter(n=>n.level==='prefecture').map(n=>n.id)));
 return w.realm!.cities[war.target].controller===war.attacker||governmentOf(w,war.defender)?.court?.phase==='chaos'&&districts.size>=2;
}
const front=(w:World,war:War)=>[Math.trunc(war.score/5),w.realm!.cities[war.target].controller,w.realm!.cities[war.civil!.base].controller,governingAuthority(w,war.defender),war.civil!.arrangement?.beneficiary??''].join('|');
export function ensureCivilMobilization(w:World,war:War){
 if(!qualifies(w,war))return;
 const c=war.civil!,fresh=!c.mobilization;
 const m=c.mobilization??={version:1,source:c.grievance===undefined?'political':'escalation',opened:w.day,lastDay:w.day,front:front(w,war),members:{},appeals:{}};
 const ids=[...civilCandidates(w,war.defender,c.claimant),...civilCandidates(w,war.attacker,c.claimant)];
 for(const id of ids)if(!m.members[id]&&!civilAvailability(w,war,id)){const fixed=civilFixedSide(w,war,id),response=c.responses?.[id]?.choice,commission=w.militaryCampaigns?.items.some(q=>q.status==='active'&&q.war===war.id&&q.commander===id),choice=fixed??(allegianceRealm(w,id)===war.attacker?'rebel':commission||response==='troops'||response==='supply'?'loyal':'pending');m.members[id]={choice,day:w.day,due:w.day+15,checked:w.day,...(choice==='rebel'||choice==='loyal'?{lastCamp:choice,lastSwitch:w.day}:{})};}
 return fresh?m:c.mobilization;
}
export function civilStanceQuote(w:World,war:War,id:string,choice:CivilStance){
 const member=war.civil?.mobilization?.members[id],from=allegianceRealm(w,id),to=choice==='watch'?from:civilCampRealm(war,choice),fixed=civilFixedSide(w,war,id);
 let reason=!member?'没有本场战争的表态资格':civilAvailability(w,war,id)||(!['loyal','rebel','watch'].includes(choice)?'未知政治立场':fixed?'你是本方政治代表，不能改为观望或投向对方':member.choice===choice?'已经是此立场':'');
 const crossing=!!from&&!!to&&from!==to;
 if(!reason&&member&&crossing&&member.lastSwitch!==undefined&&w.day-member.lastSwitch<60)reason='改投另一侧需距上次主动站队至少 60 日';
 if(!reason&&crossing&&w.militaryCampaigns?.items.some(q=>q.status==='active'&&q.commander===id))reason='须先交接当前战役委任与专款';
 if(!reason&&crossing&&w.diplomacy?.missions.some(q=>q.envoy===id))reason='须先交接当前外交使团';
 if(!reason&&choice==='watch'&&w.militaryCampaigns?.items.some(q=>q.status==='active'&&q.war===war.id&&q.commander===id))reason='须先交接本场战役委任与专款';
 const transfer=from&&to&&crossing?civilTransferPreview(w,war,id,to):null;
 const revision=civilRevision({war:war.id,day:w.day,id,choice,member,transfer:transfer?.revision??null});
 return {reason,revision,from,to,transfer,crossing};
}
function record(w:World,text:string){w.chronicle.push({day:w.day,person:'player',text});w.chronicle=w.chronicle.slice(-100);}
export function civilPoliticsReason(w:World,c:CivilPoliticsCommand,actor=w.characterId!){
 const war=activeWars(w).find(v=>v.id===c.war&&v.civil?.mobilization);if(!war)return '全国动员已结束';
 if(c.action==='stance'){const q=civilStanceQuote(w,war,actor,c.choice);return q.reason||(q.revision!==c.revision?'局势或交接内容已变化，请重新确认':'');}
 if(civilAvailability(w,war,actor))return civilAvailability(w,war,actor);
 if(c.action==='pledge')return civilPledgeReason(w,war,c,actor);
 if(!['loyal','rebel'].includes(c.side))return '请选择交涉阵营';
 const r=civilCampRealm(war,c.side),target=war.civil!.mobilization!.members[c.person],key=c.person+'|'+c.side,last=war.civil!.mobilization!.appeals[key];
 return civilAvailability(w,war,actor)||(!governingExecutives(w,r).includes(actor)?'须由该阵营当前实际执政者交涉':!target||civilFixedSide(w,war,c.person)?'此人不是可争取的地方人物':civilAvailability(w,war,c.person))||(c.person===actor?'不能向自己交涉':last!==undefined&&w.day-last<30?'同一人物与阵营须间隔 30 日再劝说':personInfluence(w,actor)<10?'本人影响力不足 10':'');
}
export function actCivilPolitics(w:World,c:CivilPoliticsCommand,actor=w.characterId!,transactional=true){
 const why=civilPoliticsReason(w,c,actor);if(why)throw new Error(why);
 // Transfers, appointments and task refunds either all succeed or leave the input intact.
 const next=transactional&&c.action==='stance'&&civilStanceQuote(w,activeWars(w).find(v=>v.id===c.war)!,actor,c.choice).crossing?structuredClone(w):w,war=activeWars(next).find(v=>v.id===c.war)!,m=war.civil!.mobilization!;
 if(c.action==='pledge')actCivilPledge(next,war,c,actor);
 else if(c.action==='appeal'){awardInfluence(next,actor,-10);m.appeals[c.person+'|'+c.side]=next.day;record(next,(getPerson(next,actor)?.name??actor)+'向'+(getPerson(next,c.person)?.name??c.person)+'劝说'+civilStanceNames[c.side]+'；影响力 −10，立场仍由本人决定。');}
 else{
  const q=civilStanceQuote(next,war,actor,c.choice),old=next.relationships?.oaths[actor];
  if(q.crossing){joinCivilCamp(next,war,actor,q.to!);recordCivilFact(next,war,actor,{source:'switch:'+next.day,kind:'switch',side:c.choice==='rebel'?'attack':'defend',day:next.day,amount:1});if(old)changeRelationOpinion(next,actor,old.lord,-25);const oldChief=governingAuthority(next,q.from!);if(oldChief!==old?.lord)changeRelationOpinion(next,actor,oldChief,-25);}
  m.members[actor]={...m.members[actor],choice:c.choice,day:next.day,checked:next.day};delete m.members[actor].unavailable;
  if(c.choice!=='watch'&&m.members[actor].lastCamp!==c.choice){m.members[actor].lastCamp=c.choice;m.members[actor].lastSwitch=next.day;}
  activateCivilPromises(next,war,actor,c.choice);
  record(next,(getPerson(next,actor)?.name??actor)+'选择'+civilStanceNames[c.choice]+(q.transfer?'，实际交接 '+q.transfer.cities.length+' 处县域、'+q.transfer.troops+' 名兵员；原法理与真实损失保留。':'；效忠与兵地维持实际状态。'));
 }
 if(next!==w)Object.assign(w,next);
}
export function civilArmyObserving(w:World,war:War,a:Army){
 return [a.owner,armyCommander(w,a)].some(id=>{const m=id&&war.civil?.mobilization?.members[id];return !!m&&!m.unavailable&&m.choice==='watch';});
}
export function advanceCivilMobilization(w:World){
 for(const war of [...activeWars(w)]){
  if(!war.civil)continue;
  ensureCivilMobilization(w,war);let m=war.civil.mobilization;if(!m||m.lastDay>=w.day)continue;
  const changed=m.front!==front(w,war);m.front=front(w,war);m.lastDay=w.day;
  for(const id of Object.keys(m.members).sort()){
   const member=m.members[id],unavailable=civilAvailability(w,war,id);if(unavailable){member.unavailable=unavailable;continue;}delete member.unavailable;
   const fixed=civilFixedSide(w,war,id);if(fixed){member.choice=fixed;continue;}
   if(id===w.characterId){if(member.choice==='pending'&&w.day>=member.due){member.choice='watch';member.day=w.day;member.checked=w.day;}continue;}
   const appealed=Math.max(m.appeals[id+'|rebel']??-1,m.appeals[id+'|loyal']??-1)>=member.checked||civilCommitments(w).some(q=>q.civil.war===war.id&&q.person===id&&q.civil.created>=member.checked&&['offered','active'].includes(q.civil.status));
   if(member.choice!=='pending'&&!changed&&!appealed&&w.day-member.checked<30)continue;
   const evaluation=civilStanceEvaluation(w,war,id);member.checked=w.day;
   let choice=evaluation.choice;
   const current=allegianceRealm(w,id),side=current===war.attacker?'rebel':'loyal',cross=choice!=='watch'&&choice!==side;
   if(cross&&member.lastSwitch!==undefined&&(w.day-member.lastSwitch<60||Math.abs(evaluation.score)<45))continue;
   // An existing field commission is completed or explicitly withdrawn before standing aside.
   if(choice==='watch'&&w.militaryCampaigns?.items.some(q=>q.status==='active'&&q.commander===id&&q.war===war.id))choice=side;
   const q=civilStanceQuote(w,war,id,choice);if(!q.reason)actCivilPolitics(w,{type:'civilWar',action:'stance',war:war.id!,choice,revision:q.revision},id,false);
   // Atomic commands replace nested state; always continue with current authoritative records.
   const live=activeWars(w).find(v=>v.id===war.id);if(!live)break;m=live.civil!.mobilization!;Object.assign(war,live);
  }
  if((w.day-m.opened)%30===1)for(const side of ['loyal','rebel'] as const){
   const realm=civilCampRealm(war,side),chief=governingAuthority(w,realm);if(chief===w.characterId)continue;
   const candidates=Object.entries(m.members).filter(([id,q])=>id!==chief&&!civilFixedSide(w,war,id)&&!q.unavailable&&(q.choice==='watch'||q.choice==='pending')).map(([id])=>{const assets=civilTransferPreview(w,war,id,realm);return {id,score:civilStanceEvaluation(w,war,id).score,assets:assets.cities.length+assets.armies.length};}).sort((a,b)=>Number(b.assets>0)-Number(a.assets>0)||Math.abs(a.score-(side==='rebel'?25:-25))-Math.abs(b.score-(side==='rebel'?25:-25))||a.id.localeCompare(b.id));
   const command=candidates.map(({id})=>({type:'civilWar' as const,action:'appeal' as const,war:war.id!,person:id,side})).find(c=>!civilPoliticsReason(w,c,chief));
   if(command){const option=civilPromiseOptions(w,war,chief,command.person).find(o=>o.mode==='retain'),pledge:CivilPledgeCommand|undefined=option?{type:'civilWar',action:'pledge',war:war.id!,person:command.person,side,target:option.target,mode:option.mode}:undefined;
    // NPCs reserve only existing enforceable mandates; they never spend the player's influence.
    if(pledge&&!civilPoliticsReason(w,pledge,chief))actCivilPolitics(w,pledge,chief);else actCivilPolitics(w,command,chief);
   }
  }
 }
 advanceCivilPromises(w);
}

export function validCivilMobilization(w:World,war:War){
 const m=war.civil?.mobilization;if(m===undefined)return true;
 const object=(v:unknown)=>!!v&&typeof v==='object'&&!Array.isArray(v),day=(n:number,max=w.day)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
 return object(m)&&m.version===1&&['political','escalation'].includes(m.source)&&day(m.opened)&&day(m.lastDay)&&m.lastDay>=m.opened&&typeof m.front==='string'&&m.front.length<=1024&&object(m.members)&&object(m.appeals)&&Object.entries(m.members).every(([id,q])=>!!getPerson(w,id)&&object(q)&&['pending','loyal','rebel','watch'].includes(q.choice)&&day(q.day)&&day(q.checked)&&day(q.due,w.day+15)&&(q.lastCamp===undefined?q.lastSwitch===undefined:['loyal','rebel'].includes(q.lastCamp)&&day(q.lastSwitch!))&&(q.unavailable===undefined||typeof q.unavailable==='string'&&q.unavailable.length<=100))&&Object.entries(m.appeals).every(([key,n])=>{const split=key.lastIndexOf('|');return !!getPerson(w,key.slice(0,split))&&['loyal','rebel'].includes(key.slice(split+1))&&day(n);});
}
