import {campaignSetup} from '../data/campaignSetup';
import type {World} from './types';
import type {HistoricalCommand,HistoricalEventInstance as Event,HistoricalPhase,HistoricalDecision} from './historicalEventState';
import {allegianceRealm} from './officeEligibility';
import {isAlive,lifeOf} from './lifeState';
import {getPerson} from './personRegistry';
import {personResidence} from './residence';
import {governingAuthority,governingExecutives,governmentOf} from './government';
import {publicSuccessor} from './publicSuccession';
import {armyCommander} from './mobility';
import {relationOpinion} from './relationships';
import {detained} from './custodyState';
import {pactReason,actPact,currentPactBreaches,receptionNames,type AllegiancePact,type PactCommand} from './allegiancePacts';
import {civilReason,actCivilWar,warCitySide} from './civilWars';
import {activeWars} from './wars';
import {worldRealms} from './polityRuntime';
import {ensurePowerPolitics,actPower,powerReason} from './powerPolitics';
import {siteById} from '../data/scenario';
import type {PauseEvent} from './pauseEvents';
export function ensureHistorical(w:World){
 if(w.mode!=='sandbox'||!w.realm||!getPerson(w,'hou-jing'))return;
 return w.historical??={version:1,since:w.day,items:campaignSetup.politics&&!campaignSetup.politics.nativeEvents.includes('hou-jing')?[]:[{id:'hou-jing:1',definitionId:'hou-jing',definitionVersion:1,phase:'dormant',status:'active',phaseSince:w.day,actors:{protagonist:'hou-jing',protector:'gao-huan'},origin:allegianceRealm(w,'hou-jing')??'east',site:personResidence(w,'hou-jing').site,revision:0,milestones:[],appliedEffects:[]}]};
}
export function historicalPact(w:World,e:Event){return w.allegiancePacts?.items.find(p=>p.id===e.pactId);}
export function historicalArmy(w:World,id:string){return w.realm?.armies.find(a=>a.troops>=100&&(a.owner===id||armyCommander(w,a)===id));}
function remember(w:World,e:Event,key:string,text:string,published=false){
 if(e.milestones.some(m=>m.key===key))return;
 // A small chapter archive survives ordinary log trimming and contains no executable effects.
 e.milestones.push({key,day:w.day,text,public:published,realms:[...new Set([e.origin,...(e.host?[e.host]:[])])],people:[e.actors.protagonist,governingAuthority(w,e.origin),...(e.host?[governingAuthority(w,e.host)]:[])].filter(Boolean)});
 if(e.milestones.length>128)e.milestones.splice(1,1);
}
function recordPact(w:World,e:Event,p:AllegiancePact){const key=['pact',p.id,p.status,p.terms,p.revision??0,p.offer?'offer':'settled',p.integrationCompletedAt??''].join(':');remember(w,e,key,(p.status==='pending'?'接纳交涉':'归附约定')+'：'+receptionNames[p.terms]+'。'+(p.offer?'对方收到「'+receptionNames[p.offer.terms]+'」新提案，原案仍有效。':p.integrationCompletedAt!==undefined?'已按约完成改编。':p.status==='active'?'条款已经生效。':'等待接纳方答复。'));}
function phase(w:World,e:Event,value:HistoricalPhase,text:string,published=false){if(e.phase===value)return;e.phase=value;e.phaseSince=w.day;e.revision++;delete e.decision;remember(w,e,'phase:'+e.revision,text,published);}
function finish(w:World,e:Event,text:string,cancelled=false){phase(w,e,'aftermath',text,!!e.warId);e.status=cancelled?'cancelled':'resolved';e.result=text;e.resolvedAt=w.day;delete e.decision;}
export function northConflict(w:World,e:Event){
 const person=e.actors.protagonist,r=allegianceRealm(w,person);if(!r||r!==e.origin||!historicalArmy(w,person))return '';
 const chief=governingAuthority(w,r),protector=e.actors.protector,successor=publicSuccessor(w,r,'executive',protector);
 const broken=w.politics?.commitments?.find(q=>q.person===person&&q.broken&&q.until>=w.day);
 const warrant=w.custody?.warrants.find(q=>q.person===person&&q.status==='pending');
 const refused=w.politics?.assurances.find(q=>q.person===person&&q.status==='refused'&&q.due+90>=w.day);
 const kept=w.politics?.assurances.some(q=>q.person===person&&q.chief===chief&&q.status==='kept'&&q.due+90>=w.day);
 const ill=lifeOf(w,protector)?.illness?.severity===3;
 const insecure=!isAlive(w,protector)||!governingExecutives(w,r).includes(protector)||ill;
 if(broken||warrant||refused)return '现实交接争议:'+chief+':'+(broken?'失信':warrant?'拘捕':'拒绝待遇');
 if(!kept&&insecure&&(relationOpinion(w,person,chief)<=-30||ill&&successor&&relationOpinion(w,person,successor)<=-30))return '保护关系动摇:'+chief+':'+(ill?'重症':'交替');
 return '';
}
function decide(w:World,e:Event,kind:HistoricalDecision['kind'],actor:string){e.revision++;e.decision={id:e.id+':'+e.revision,revision:e.revision,actor,kind,created:w.day};}
export function historicalRiseCommand(w:World,e:Event){const r=allegianceRealm(w,e.actors.protagonist)??e.host??e.origin;return {type:'civilWar',action:'rise',name:'讨奸',arrangement:{goal:'executive',sponsor:e.actors.protagonist,beneficiary:governmentOf(w,r)!.ruler,executive:e.actors.protagonist,name:''}} as const;}
export function historicalReason(w:World,c:HistoricalCommand,actor=w.characterId!){
 const e=w.historical?.items.find(e=>e.id===c.instanceId),d=e?.decision;
 if(!e||e.status!=='active'||!d||d.handled||d.id!==c.decisionId||d.revision!==c.revision)return '这份决定已经处理或更新，请重新审阅';
 if(d.actor!==actor||!isAlive(w,actor)||detained(w,actor)||w.campaign?.status!=='active')return '当前身份无权办理此事';
 if(d.kind==='council'&&governingAuthority(w,e.origin)!==actor)return '实际执政者已经变化';
 if(c.optionId==='wait')return '';
 if(c.optionId==='assure'&&d.kind==='council')return powerReason(w,{type:'power',action:'assure',person:e.actors.protagonist,accept:true},actor);
 if(c.optionId==='seek'&&d.kind==='north'){
  if(!c.realm)return '请选择接纳政权';
  return pactReason(w,{type:'pact',action:'request',realm:c.realm,army:historicalArmy(w,actor)?.id,terms:c.terms??'retain'},actor);
 }
 if(c.optionId==='rise'&&d.kind==='crisis'){
  const p=historicalPact(w,e);if(!p||!currentPactBreaches(w,p).length)return '当前争议已经解除';
  return civilReason(w,historicalRiseCommand(w,e),actor);
 }
 return '当前阶段不支持这个选择';
}
export function actHistorical(w:World,c:HistoricalCommand,actor=w.characterId!){
 const why=historicalReason(w,c,actor);if(why)throw new Error(why);
 const next=structuredClone(w),e=next.historical!.items.find(e=>e.id===c.instanceId)!,d=e.decision!,key=d.id;
 if(c.optionId==='seek')actPact(next,{type:'pact',action:'request',realm:c.realm!,army:historicalArmy(next,actor)?.id,terms:c.terms??'retain'},actor);
 else if(c.optionId==='rise')actCivilWar(next,historicalRiseCommand(next,e),actor);
 else if(c.optionId==='assure')actPower(next,{type:'power',action:'assure',person:e.actors.protagonist,accept:true},actor);
 // Domain operations can atomically replace the world; reacquire the current instance.
 const current=next.historical!.items.find(v=>v.id===e.id)!;current.decision!.handled=true;current.appliedEffects.push(key);current.appliedEffects=current.appliedEffects.slice(-128);
 remember(next,current,'decision:'+key,c.optionId==='wait'?'暂缓改变现有安排，争议仍按真实处境发展。':c.optionId==='assure'?'朝廷重申原有待遇。':c.optionId==='rise'?'侯景举兵，公开要求更换实际执政者。':'侯景向其他朝廷发出归附请求。',c.optionId==='rise');
 if(d.kind==='crisis'&&c.optionId==='wait')current.handlingDue=next.day+30;
 Object.assign(w,next);
}
function npcDecision(w:World,e:Event){
 const d=e.decision;if(!d||d.handled||d.actor===w.characterId)return;
 const base={type:'historicalEvent',instanceId:e.id,decisionId:d.id,revision:d.revision} as const;
 let command:HistoricalCommand={...base,optionId:'wait'};
 if(d.kind==='north'){
  const hosts=worldRealms(w).filter(r=>r!==e.origin&&!w.realm!.annexed?.[r]).sort((a,b)=>Number(b==='liang')-Number(a==='liang')||relationOpinion(w,d.actor,governingAuthority(w,b))-relationOpinion(w,d.actor,governingAuthority(w,a)));
  for(const realm of hosts){const q={...base,optionId:'seek',realm,terms:'retain'} as const;if(!historicalReason(w,q,d.actor)){command=q;break;}}
 }else if(d.kind==='crisis'&&relationOpinion(w,d.actor,governingAuthority(w,e.host!))<-40){const q={...base,optionId:'rise'} as const;if(!historicalReason(w,q,d.actor))command=q;}
 if(!historicalReason(w,command,d.actor))actHistorical(w,command,d.actor);
}
/** Called only at stable command/day boundaries; creates at most one decision per instance. */
export function advanceHistorical(w:World){
 const state=ensureHistorical(w);if(!state||w.campaign?.status!=='active')return;
 for(const e of state.items){
  const id=e.actors.protagonist,live=activeWars(w).find(v=>v.civil?.claimant===id),p=w.allegiancePacts?.items.filter(p=>p.person===id&&['pending','active'].includes(p.status)).at(-1);
  if(p&&e.pactId===p.id)recordPact(w,e,p);
  if(e.status!=='active'){
   if(e.status==='cancelled'||!isAlive(w,id)||detained(w,id))continue;
   if(!live&&!(p?.status==='pending'&&p.id!==e.pactId)&&!(e.warId===undefined&&p?.status==='active'&&currentPactBreaches(w,p).length))continue;
   e.status='active';delete e.result;delete e.resolvedAt;delete e.warId;delete e.stableSince;delete e.handlingDue;
   remember(w,e,'renewed:'+w.day,'新的现实冲突出现，重新审议当前处境。',!!live);
  }
  if(live){delete e.handlingDue;delete e.stableSince;e.warId=live.id;e.host=live.attacker;e.site=live.target;
   const occupied=warCitySide(w,live,live.target)==='attack';
   const siege=w.realm!.sieges?.find(s=>s.war===live.id&&s.site===live.target&&s.side==='attack');
   phase(w,e,occupied?'court':siege?'siege':'rebellion',occupied?'首都失守，君主是否被俘及地方抵抗仍按实际局势处理。':siege?'叛军已形成首都围城，守城与援军按真实军令行动。':'侯景公开举兵，战争开始。',true);
   if(occupied){const ruler=governmentOf(w,live.attacker)!.ruler,c=w.custody?.records[ruler];if(c?.war===live.id)remember(w,e,'captive:'+ruler,'在城君主被本场战争俘获。',true);}
   continue;
  }
  if(e.warId!==undefined){finish(w,e,!isAlive(w,id)||detained(w,id)?'起兵收场：侯景已死亡或被俘。':governingExecutives(w,e.host!).includes(id)?'战争结束：侯景取得实际执政权。':'战争结束，按已生效的和约与控制范围收场。');continue;}
  if(!isAlive(w,id)){finish(w,e,'侯景已故，未发生的事件不再继续。',true);continue;}
  if(detained(w,id)){finish(w,e,'侯景已被控制，当前危机结束。',true);continue;}
  if(p){
   e.pactId=p.id;e.host=p.to;e.site=personResidence(w,id).site;recordPact(w,e,p);
   if(w.realm!.annexed?.[p.to]){finish(w,e,'接纳政权已终止。',true);continue;}
   if(p.status==='pending'){phase(w,e,'reception','来书已送达，等待双方确认接纳条款。');continue;}
   const breaches=currentPactBreaches(w,p);
   if(p.terms==='personal'){finish(w,e,'个人归附已完成，未接收独立军队。');continue;}
   if(breaches.length){
    delete e.stableSince;phase(w,e,'dispute','归附承诺出现争议：'+breaches.join('、')+'。');
    e.handlingDue??=w.day+30;
    if(w.day>=e.handlingDue&&(!e.decision||e.decision.handled&&e.decision.created<e.handlingDue)){decide(w,e,'crisis',id);npcDecision(w,e);}continue;
   }
   if(e.phase!=='settlement')phase(w,e,'settlement',p.integrationCompletedAt!==undefined?'部曲已按约完成改编。':'归附之约生效，当前没有未解决的争议。');
   delete e.handlingDue;e.stableSince??=w.day;
   if(w.day-e.stableSince>=30&&(p.terms!=='reform'||p.integrationCompletedAt!==undefined))finish(w,e,p.integrationCompletedAt!==undefined?'改编安定：归附双方持续履约。':'归附稳定：当前争议已经化解。');
   continue;
  }
  if(e.pactId!==undefined){finish(w,e,'归附请求撤回、逾期或未获接纳，当前来书结案。');continue;}
  if(allegianceRealm(w,id)!==e.origin){finish(w,e,'人物统属已经改变，从当前事实结束原交涉。');continue;}
  const conflict=northConflict(w,e);
  if(!conflict){if(e.phase==='north'){phase(w,e,'dormant','保护关系与交接争议已缓和。');delete e.lastConflict;}continue;}
  const chief=governingAuthority(w,e.origin);
  if(e.phase==='dormant'||e.lastConflict!==conflict){phase(w,e,'north','原有权力保护出现动摇，河南军政交接需要议定。');e.lastConflict=conflict;
   if(chief===w.characterId&&id!==w.characterId){const politics=ensurePowerPolitics(w);if(!politics.assurances.some(q=>q.person===id&&q.chief===chief&&q.status==='pending'))politics.assurances.push({realm:e.origin,person:id,chief,due:w.day+30,status:'pending'});decide(w,e,'council',chief);}
   else decide(w,e,'north',id);
  }else if(e.decision?.kind==='council'&&e.decision.handled&&e.decision.created<w.day)decide(w,e,'north',id);
  if(e.decision&&!e.decision.handled&&(e.decision.kind==='council'&&e.decision.actor!==chief||!isAlive(w,e.decision.actor)||detained(w,e.decision.actor)))decide(w,e,'north',id);
  npcDecision(w,e);
 }
}
export function visibleHistoricalMilestones(w:World,e:Event,actor=w.characterId!){const realm=allegianceRealm(w,actor);return e.milestones.filter(m=>m.public||m.people.includes(actor)||!!realm&&m.realms.includes(realm)&&governingExecutives(w,realm).includes(actor));}
export function visibleHistoricalEvents(w:World){return (w.historical?.items??[]).filter(e=>visibleHistoricalMilestones(w,e).length||!!e.decision&&e.decision.actor===w.characterId&&!e.decision.handled);}
export function historicalTitle(w:World,e:Event){return e.phase==='dormant'?'北方纪事':e.phase==='north'?(e.decision?.kind==='council'?(lifeOf(w,e.actors.protector)?.illness?'病榻议事':'军政交接'):'北方生变'):e.phase==='reception'?'河南来书':e.phase==='dispute'?(siteById[e.site]?.name??'降将')+'疑云':['rebellion','siege','court'].includes(e.phase)?e.phase==='siege'?(siteById[e.site]?.name??'首都')+'告急':'侯景之乱':e.phase==='aftermath'?'乱后纪事':'降将安置';}
export function historicalPending(w:World):PauseEvent[]{
 if(w.campaign?.status!=='active')return [];
 const result:PauseEvent[]=[];
 for(const e of visibleHistoricalEvents(w)){
  const d=e.decision,p=historicalPact(w,e),mine=!!d&&!d.handled&&d.actor===w.characterId;
  const pactMine=p&&['pending','active'].includes(p.status)&&(p.offer?p.offer.respondent===w.characterId&&p.offer.expiresAt>w.day:p?.status==='pending'&&p.due>w.day&&governingExecutives(w,p.to).includes(w.characterId!));
  if(e.status==='active'&&(mine||pactMine))result.push({id:'historical:'+e.id+':'+(mine?d!.id:p!.id+':'+(p!.revision??0)),kind:'historical',historicalId:e.id,title:historicalTitle(w,e),body:'请审阅当前处境并作出有权决定。',person:e.actors.protagonist,site:e.site});
 }
 return result;
}
export function historicalPactCommands(w:World,e:Event):PactCommand[]{const p=historicalPact(w,e);return p?.offer?[true,false].map(accept=>({type:'pact',action:'respondOffer',id:p.id,revision:p.offer!.revision,accept})):p?.status==='pending'?[true,false].map(accept=>({type:'pact',action:'answer',id:p.id,accept})):[];}
