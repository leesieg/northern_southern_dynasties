import {localBalance,spendLocal} from './treasury';
import {worldRealms} from './polityRuntime';
import {includeParticipantValues} from './warScoring';
import {isMonthStart,monthStart} from './calendar';
import {isAdventurer} from './resignation';
import {needsEnvoy,envoyRoute,defaultEnvoy,envoyReason,envoyEstimate,startEnvoyJourney,advanceEnvoyJourney,missionJourney,stopEnvoy} from './envoyTravel';
import {personResidence} from './residence';
import {isAlive,lifeOf} from './lifeState';
import {allegianceRealm} from './officeEligibility';
import {civilCanAdmin,civilWar} from './civilWars';
import {activeWars,bilateralWar,realmAtWar,warRealmSide} from './wars';
import type { World,Polity } from './types';
import { playerRealm,capital,type RealmId } from './realm';
import { governmentOf,governingAuthority,governingExecutives,governmentExecutive,regimeName } from './government';
import { relationOpinion } from './relationships';
import { attributes } from './social';
import { sites } from '../data/scenario';
import { characterById } from '../data/characters';
import { planRoute } from './world';
export const diplomacyActions={improve:'派使修好',insult:'谴责',transit:'请求民事通行',safe:'请求安全通行',meeting:'请求会盟',military:'请求军队借道',pact:'缔结互不侵犯',alliance:'缔结同盟',recognize:'承认国号',submit:'请求称臣',independence:'宣布独立',aid:'请求盟约军援',join:'请求盟国参战',revoke:'终止条约'} as const;
export type DiplomacyAction=keyof typeof diplomacyActions;
export type TreatyKind='transit'|'safe'|'military'|'pact'|'alliance';
export type DiplomacyCommand={type:'diplomacy';action:'repatriate'}|{type:'diplomacy';action:DiplomacyAction;target:RealmId;envoy?:string;war?:number}|{type:'diplomacy';action:'accept'|'reject';mission:number};
export interface Treaty {kind:TreatyKind;from:RealmId;to:RealmId;actor:string|null;since:number;until:number;meeting?:'invited'|'held'}
export const diplomaticFactorNames={agreement:'交涉获准',refusal:'交涉遭拒',aidRefusal:'拒绝盟约军援',insult:'外交谴责',revoke:'终止条约',independence:'脱离臣属',war:'爆发战争',meeting:'亲赴会盟'} as const;
export type DiplomaticFactor=keyof typeof diplomaticFactorNames;
export interface DiplomaticPair {opinionFactors?:{base:number;effects:Partial<Record<DiplomaticFactor,number>>};a:RealmId;b:RealmId;opinion:number;recognized:boolean;treaties:Treaty[];cooldowns:Record<string,number>}
export interface Envoy {id:number;from:RealmId;to:RealmId;action:DiplomacyAction;war?:number;arrivalSite?:string;civilSide?:'attack'|'defend';actor:string;sent:number;due:number;expires:number;status:'traveling'|'audience'|'returning';envoy?:string;home?:string;negotiation?:number;arrived?:number;lastTravel?:number;returnStarted?:number;bases:[string,string]}
export interface DiplomacyState {version:1;returning:{actor:string;route:string[]}|null;since:number;nextId:number;lastMonth:number;lastAI:number;pairs:Record<string,DiplomaticPair>;credit:Record<RealmId,number>;subjects:Partial<Record<RealmId,RealmId>>;bases:Record<RealmId,string>;missions:Envoy[];history:{day:number;from:RealmId;to:RealmId;text:string}[]}
export const diplomaticKey=(a:RealmId,b:RealmId)=>[a,b].sort().join('|');
const clamp=(v:number,min=-100,max=100)=>Math.max(min,Math.min(max,Math.round(v)));
export function ensureDiplomacy(w:World){if(!w.realm||w.diplomacy)return;w.diplomacy={version:1,returning:null,since:w.day,nextId:1,lastMonth:monthStart(w.day,w.scriptId),lastAI:w.day,pairs:{},credit:{liang:50,east:50,west:50},subjects:{},bases:Object.fromEntries(worldRealms(w).map(r=>[r,governmentOf(w,r)!.regimeId])) as Record<RealmId,string>,missions:[],history:[]};for(let i=0;i<worldRealms(w).length;i++)for(const b of worldRealms(w).slice(i+1)){const a=worldRealms(w)[i];w.diplomacy.pairs[diplomaticKey(a,b)]={a,b,opinion:a==='east'&&b==='west'?-70:-15,recognized:false,treaties:[],cooldowns:{}};}}
export const diplomaticPair=(w:World,a:RealmId,b:RealmId)=>w.diplomacy?.pairs[diplomaticKey(a,b)];
export function diplomaticOpinionBreakdown(p:DiplomaticPair){return [{label:p.opinionFactors?'既有关系':'既有关系（未记分项）',value:p.opinionFactors?.base??p.opinion},...Object.entries(p.opinionFactors?.effects??{}).map(([key,value])=>({label:diplomaticFactorNames[key as DiplomaticFactor],value}))];}
function changeOpinion(p:DiplomaticPair,delta:number,factor:DiplomaticFactor){const f=p.opinionFactors??={base:p.opinion,effects:{}},next=clamp(p.opinion+delta);f.effects[factor]=(f.effects[factor]??0)+next-p.opinion;p.opinion=next;}
export function atWar(w:World,a:RealmId,b:RealmId){return !!bilateralWar(w,a,b);}
export function warState(w:World,a:RealmId,b:RealmId){return atWar(w,a,b)?'交战':(w.realm?.truces[diplomaticKey(a,b)]??0)>w.day?'停战期':'和平';}
export const attitude=(opinion:number)=>opinion>=40?'友善':opinion>=0?'中立':opinion>-40?'猜忌':'敌对';
export function treaty(w:World,a:RealmId,b:RealmId,kind:TreatyKind,actor?:string){return diplomaticPair(w,a,b)?.treaties.find(t=>t.kind===kind&&t.until>w.day&&(kind==='alliance'||kind==='pact'||t.from===a&&t.to===b)&&(kind!=='safe'||t.actor===actor));}
function history(w:World,from:RealmId,to:RealmId,text:string){w.diplomacy!.history.push({day:w.day,from,to,text});w.diplomacy!.history=w.diplomacy!.history.slice(-100);w.chronicle.push({day:w.day,person:'player',text});w.chronicle=w.chronicle.slice(-100);}
export function diplomaticScore(w:World,from:RealmId,to:RealmId){const s=w.diplomacy!,a=from===playerRealm(w)&&governmentExecutive(w)?w.characterId!:governingAuthority(w,from),b=governingAuthority(w,to);return [{label:'基础',value:30},{label:'两国关系',value:diplomaticPair(w,from,to)!.opinion},{label:'国家信用',value:Math.floor((s.credit[from]-50)/2)},{label:'执政者私交',value:Math.round(relationOpinion(w,a,b)/5)},{label:'外交能力',value:a===w.characterId?attributes(w).diplomacy:8}];}
const thresholds:Partial<Record<DiplomacyAction,number>>={improve:-100,transit:30,safe:45,meeting:55,military:70,pact:50,alliance:80,recognize:20,submit:40,aid:40,join:70};
const cost:Partial<Record<DiplomacyAction,number>>={improve:40,transit:40,safe:60,meeting:80,military:80,pact:80,alliance:120,recognize:40,submit:60,aid:20,join:80};
function joinWarReason(w:World,from:RealmId,to:RealmId,id?:number,side?:'attack'|'defend'){const war=activeWars(w).find(v=>v.id===id&&!!warRealmSide(v,from));if(!war)return '请选择本国正在参与的战争';if(!treaty(w,from,to,'alliance'))return '须先缔结有效同盟';if(warRealmSide(war,to))return '盟国已参与这场战争';if(war.civil){if(!side)return '须明确请求援助的内战阵营';if(activeWars(w).some(v=>v!==war&&bilateralWar(w,from,to)===v))return '对方正与本国交战，须先议和';return '';}const enemy=warRealmSide(war,from)==='attack'?war.defender:war.attacker;if((w.realm?.truces[diplomaticKey(to,enemy)]??0)>w.day)return '盟国与敌方仍处于停战期';if(treaty(w,to,enemy,'pact')||treaty(w,to,enemy,'alliance'))return '盟国须先结束与敌方的条约';if(activeWars(w).some(v=>v!==war&&warRealmSide(v,to)&&warRealmSide(v,enemy)))return '盟国与敌方已有独立战事';return '';}
function requestedCivilSide(w:World,id?:number,actor=w.characterId!){const war=activeWars(w).find(v=>v.id===id&&v.civil);return war?.civil?(war.civil.supporters.includes(actor)?'attack':'defend'):undefined;}
function civilDiplomat(w:World,c:DiplomacyCommand){const war='war'in c?activeWars(w).find(v=>v.id===c.war&&v.civil):undefined;return c.action==='join'&&!!war?.civil&&[war.civil.claimant,war.civil.loyalist].includes(w.characterId!);}

function cycles(w:World,from:RealmId,to:RealmId){const seen=new Set([from]);let next:RealmId|undefined=to;while(next){if(seen.has(next))return true;seen.add(next);next=w.diplomacy?.subjects[next];}return false;}
export function returnRoute(w:World){if(!w.realm||!w.characterId)return null;const r=playerRealm(w),from=w.people[0].location;return sites.filter(s=>w.realm!.cities[s.id].controller===r).map(s=>planRoute(from,s.id,id=>{const owner=w.realm!.cities[id].controller;return owner!=='frontier'&&!atWar(w,r,owner);})).filter(p=>p!==null).sort((a,b)=>a.days-b.days)[0]??null;}
export function diplomaticQuote(w:World,c:DiplomacyCommand){
 const r=w.characterId?playerRealm(w):'liang',target='target'in c?c.target:null,score=target&&worldRealms(w).includes(target)&&target!==r&&w.diplomacy?diplomaticScore(w,r,target).reduce((n,p)=>n+p.value,0):0,coins=cost[c.action as DiplomacyAction]??0;
 const envoy=target&&worldRealms(w).includes(target)&&target!==r&&w.diplomacy&&needsEnvoy(c.action)?('envoy'in c?c.envoy:undefined)??defaultEnvoy(w,r,target,w.characterId):undefined;
 const estimate=envoy&&target&&worldRealms(w).includes(target)?envoyEstimate(w,envoy,r,target,c.action as DiplomacyAction,thresholds[c.action as DiplomacyAction]??0):null;
 let reason='';
 if(!w.realm||!w.diplomacy||w.campaign?.status!=='active')reason='仅历史沙盒可用';
 else if(c.action==='repatriate'){if(w.diplomacy.missions.some(m=>m.envoy===w.characterId))reason='正在奉使，交涉结束后由使团安排返程';else if(w.people[0].journey)reason='正在途中';else if(w.realm.cities[w.people[0].location].controller===r)reason='你已在本国境内';else if(w.realm.cities[w.people[0].location].controller==='frontier')reason='此地没有可交涉的朝廷';else if(!returnRoute(w))reason='没有安全返国路线，须先议和';else if(w.people[0].food<returnRoute(w)!.food)reason='返国行粮不足';}
 else if(!governmentExecutive(w)&&!civilDiplomat(w,c))reason='只有实际执政者可以代表国家交涉';
 else if(w.realm.event)reason='先处理待决事务';
 else if('mission'in c){const m=w.diplomacy.missions.find(m=>m.id===c.mission);if(!m||m.to!==r||m.status!=='audience'||m.expires<=w.day)reason='使团已不在朝中';else if(c.action==='accept')reason=agreementReason(w,m);}
 else if('target'in c&&w.realm.annexed?.[c.target])reason='该政权已被吞并，外交关系已终止';
 else if(!worldRealms(w).includes(c.target)||c.target===r||!Object.hasOwn(diplomacyActions,c.action))reason='无效外交行动';
 else {const p=diplomaticPair(w,r,c.target)!;
 if(w.diplomacy.subjects[r]&&['military','pact','alliance','submit'].includes(c.action))reason='臣属国不能独立缔结军政条约，须先脱离宗主';
 else if((p.cooldowns[r+'|'+c.action]??0)>w.day)reason='此项交涉尚在冷却';
 else if(c.action==='independence'&&w.diplomacy.subjects[r]!==c.target)reason='对方不是你的宗主';
 else if(c.action==='revoke'&&!p.treaties.some(t=>t.until>w.day))reason='没有有效条约';
 else if(c.action==='submit'&&(w.diplomacy.subjects[r]||cycles(w,r,c.target)))reason='不能形成重复或循环臣属';
 else if(c.action==='recognize'&&p.recognized)reason='已相互承认国号';
 else if(atWar(w,r,c.target)&&!['insult','revoke','independence'].includes(c.action))reason='正在交战，请先议和';
 else if(w.diplomacy.missions.some(m=>m.from===r&&m.to===c.target&&m.status!=='returning'))reason='已有使团前往该国';
 else if(w.diplomacy.missions.length>=6)reason='使团名额已满';
 else if(needsEnvoy(c.action)&&(!envoy||envoyReason(w,envoy,r,c.target,w.characterId)))reason=envoy?envoyReason(w,envoy,r,c.target,w.characterId):'没有空闲使者';
 else if((civilDiplomat(w,c)&&requestedCivilSide(w,'war'in c?c.war:undefined)==='attack'?localBalance(w,civilWar(w,r)!.civil!.base):w.realm.treasuries[r].coins)<coins)reason='国库不足 '+coins+' 钱';
 else if(w.realm.influence<10)reason='需影响力 10';
 else if(['safe','transit','military','pact','alliance'].includes(c.action)&&treaty(w,r,c.target,c.action as TreatyKind,w.characterId))reason='已有有效条约';
 else if(c.action==='aid'&&(!treaty(w,r,c.target,'alliance')||!realmAtWar(w,r)))reason='仅在本国参战时请求盟国军援';
 else if(c.action==='join')reason=joinWarReason(w,r,c.target,'war'in c?c.war:undefined,requestedCivilSide(w,'war'in c?c.war:undefined));
 }
 return {reason,coins,payer:civilDiplomat(w,c)&&requestedCivilSide(w,'war'in c?c.war:undefined)==='attack'?'起兵根据地公库':'本国中央公库',envoy,estimate,influence:'mission'in c||c.action==='repatriate'?0:10,score:estimate?.score??score,threshold:thresholds[c.action as DiplomacyAction]??0};
}
function agreementReason(w:World,m:Envoy){const s=w.diplomacy!;
 if(s.bases[m.from]!==m.bases[0]||s.bases[m.to]!==m.bases[1]||!(m.civilSide&&m.action==='join'?activeWars(w).some(v=>v.id===m.war&&!!v.civil&&[v.civil.claimant,v.civil.loyalist].includes(m.actor)):governingExecutives(w,m.from).includes(m.actor)))return '出使方政权或执政者已变';
 if(m.status==='audience'&&m.envoy&&personResidence(w,m.envoy).site!==capital(m.to,w))return '朝廷已迁驻，请先完成续行';
 if(atWar(w,m.from,m.to))return '两国已交战';
 if(s.subjects[m.from]&&['military','pact','alliance','submit'].includes(m.action))return '出使方已失去独立缔约权';
 if(m.action==='submit'&&(s.subjects[m.from]||cycles(w,m.from,m.to)))return '臣属关系冲突';
 if(m.action==='aid'&&(!treaty(w,m.from,m.to,'alliance')||!realmAtWar(w,m.from)))return '援战条件已改变';
 if(m.action==='join')return joinWarReason(w,m.from,m.to,m.war,m.civilSide);
 if(m.action==='aid'&&(w.realm!.treasuries[m.to].coins<120||w.realm!.treasuries[m.to].grain<120))return '援助需要国库 120 钱、120 粮';
 return '';
}
function conclude(w:World,m:Envoy,accept:boolean){const s=w.diplomacy!,p=diplomaticPair(w,m.from,m.to)!;const blocked=agreementReason(w,m);accept=accept&&!blocked;
 if(accept){changeOpinion(p,m.action==='improve'?25:10,'agreement');s.credit[m.from]=clamp(s.credit[m.from]+2,0);
 if(['transit','safe','military','pact','alliance','meeting'].includes(m.action)){const kind=m.action==='meeting'?'safe':m.action as TreatyKind;p.treaties=p.treaties.filter(t=>!(t.kind===kind&&(kind==='pact'||kind==='alliance'||t.from===m.from)));p.treaties.push({kind,from:m.from,to:m.to,actor:kind==='safe'?m.actor:null,...(m.action==='meeting'?{meeting:'invited' as const}:{}),since:w.day,until:w.day+(kind==='safe'?240:720)});}
 if(m.action==='recognize'){p.recognized=true;for(const r of [m.from,m.to])governmentOf(w,r)!.legitimacy=clamp(governmentOf(w,r)!.legitimacy+5,0);}
 if(m.action==='submit')s.subjects[m.from]=m.to;
 if(m.action==='aid'){for(const key of ['coins','grain'] as const){w.realm!.treasuries[m.to][key]-=120;w.realm!.treasuries[m.from][key]=Math.min(1_000_000,w.realm!.treasuries[m.from][key]+120);}}
 if(m.action==='join'){const war=activeWars(w).find(v=>v.id===m.war)!;war.allies??={};war.allies[m.to]=m.civilSide??warRealmSide(war,m.from)!;includeParticipantValues(w,war);}
 }else {changeOpinion(p,-5,'refusal');if(m.action==='aid'&&!blocked){s.credit[m.to]=clamp(s.credit[m.to]-15,0);changeOpinion(p,-20,'aidRefusal');}}
 history(w,m.from,m.to,regimeName(w,m.to)+(accept?'接受':'拒绝')+regimeName(w,m.from)+'的「'+diplomacyActions[m.action]+'」'+(blocked?'：'+blocked:'')+'。');if(m.envoy&&isAlive(w,m.envoy)&&allegianceRealm(w,m.envoy)===m.from&&startEnvoyJourney(w,m,m.home!)){m.status='returning';m.returnStarted=w.day;const j=missionJourney(w,m.envoy);m.due=w.day+(j?.durations.reduce((n,d)=>n+d,0)??0);m.expires=m.due+30;}else{stopEnvoy(w,m);s.missions=s.missions.filter(v=>v.id!==m.id);}
}
function dispatch(w:World,from:RealmId,to:RealmId,action:DiplomacyAction,selected?:string,war?:number,actor=governingAuthority(w,from)){const s=w.diplomacy!,envoy=selected??defaultEnvoy(w,from,to,actor);if(!envoy)throw new Error('没有空闲使者');const reason=envoyReason(w,envoy,from,to,actor);if(reason)throw new Error(reason);const estimate=envoyEstimate(w,envoy,from,to,action,thresholds[action]??0),days=estimate.days,m:Envoy={id:s.nextId++,from,to,action,...(action==='join'?{war}:{}),...(action==='join'&&requestedCivilSide(w,war,actor)?{civilSide:requestedCivilSide(w,war,actor)}:{}),actor,envoy,arrivalSite:capital(to,w),home:personResidence(w,envoy).site,negotiation:estimate.negotiation,lastTravel:w.day,sent:w.day,due:w.day+days,expires:w.day+days+30,status:'traveling',bases:[s.bases[from],s.bases[to]]};startEnvoyJourney(w,m,capital(to,w));s.missions.push(m);history(w,from,to,regimeName(w,from)+'派遣使者前往'+regimeName(w,to)+'，议题「'+diplomacyActions[action]+'」，预计行程与交涉 '+days+' 日。');}
export function actDiplomacy(w:World,c:DiplomacyCommand){const q=diplomaticQuote(w,c);if(q.reason)throw new Error(q.reason);const s=w.diplomacy!,r=playerRealm(w);
 if(c.action==='repatriate'){const p=returnRoute(w)!;if(w.people[0].food<p.food)throw new Error('返国行粮不足');w.people[0].food-=p.food;w.diplomacy!.returning={actor:w.characterId!,route:p.route};w.people[0].journey={route:p.route,durations:p.durations,leg:0,elapsed:0,started:w.day};history(w,r,w.realm!.cities[w.people[0].location].controller as RealmId,'获得限定返国通行，沿指定道路撤返；不能改道访问他国。');return;}
 if('mission'in c){conclude(w,s.missions.find(m=>m.id===c.mission)!,c.action==='accept');return;}
 const p=diplomaticPair(w,r,c.target)!;if(civilDiplomat(w,c)&&requestedCivilSide(w,'war'in c?c.war:undefined)==='attack')spendLocal(w,civilWar(w,r)!.civil!.base,q.coins,'内战阵营邀请盟国支援');else w.realm!.treasuries[r].coins-=q.coins;w.realm!.influence-=10;p.cooldowns[r+'|'+c.action]=w.day+(c.action==='aid'?360:60);
 if(c.action==='insult'){changeOpinion(p,-25,'insult');history(w,r,c.target,regimeName(w,r)+'谴责'+regimeName(w,c.target)+'，关系恶化。');}
 else if(c.action==='revoke'){p.treaties=[];changeOpinion(p,-30,'revoke');s.credit[r]=clamp(s.credit[r]-20,0);history(w,r,c.target,regimeName(w,r)+'撕毁与'+regimeName(w,c.target)+'的条约，信用 −20。');}
 else if(c.action==='independence'){delete s.subjects[r];changeOpinion(p,-50,'independence');s.credit[r]=clamp(s.credit[r]-20,0);history(w,r,c.target,regimeName(w,r)+'脱离'+regimeName(w,c.target)+'，恢复独立外交。');}
 else dispatch(w,r,c.target,c.action,q.envoy,c.war,w.characterId!);
}
export function foreignWarReason(w:World,target:RealmId,actor=w.characterId!,r=playerRealm(w)){if(!w.diplomacy)return '';return !governingExecutives(w,r).includes(actor)?'宣战须由实际执政者决定':w.diplomacy.subjects[r]?'臣属国不能独立宣战':treaty(w,r,target,'pact')||treaty(w,r,target,'alliance')?'须先终止互不侵犯或同盟条约':'';}
export function diplomaticWar(w:World,a:RealmId,b:RealmId){if(!w.diplomacy)return;const p=diplomaticPair(w,a,b)!;changeOpinion(p,-40,'war');p.treaties=[];for(const m of [...w.diplomacy.missions])if(m.status!=='returning'&&diplomaticKey(m.from,m.to)===diplomaticKey(a,b))conclude(w,m,false);history(w,a,b,regimeName(w,a)+'与'+regimeName(w,b)+'进入战争，双方通行许可失效。');}
export function canEnter(w:World,from:RealmId,to:Polity,actor?:string,military=false){if(!w.diplomacy||from===to)return true;if(!military&&actor&&isAdventurer(w,actor))return true;if(to==='frontier')return false;if(military)return atWar(w,from,to)||activeWars(w).some(v=>warRealmSide(v,from)&&warRealmSide(v,from)===warRealmSide(v,to))||!!treaty(w,from,to,'military')||!!treaty(w,from,to,'alliance');if(atWar(w,from,to))return false;const important=!!actor&&(governingExecutives(w,from).includes(actor)||governmentOf(w,from)?.ruler===actor||characterById[actor]?.role==='commander');return !!treaty(w,from,to,'safe',actor)||!important&&!!treaty(w,from,to,'transit');}
export function diplomaticPersonalModifier(w:World,target:RealmId){if(!w.diplomacy||!w.characterId)return 0;const r=playerRealm(w);if(r===target)return 0;return atWar(w,r,target)?-30:Math.round((diplomaticPair(w,r,target)?.opinion??0)/5);}
export function redirectCourtEnvoys(w:World,r:RealmId,previous:string){for(const m of w.diplomacy?.missions??[]){if(m.to!==r||m.status==='returning'||!m.envoy)continue;m.arrivalSite??=previous;if(missionJourney(w,m.envoy))continue;const destination=capital(r,w);if(personResidence(w,m.envoy).site===destination)continue;const path=envoyRoute(w,m.envoy,m.from,m.to,destination);if(!path)continue;if(startEnvoyJourney(w,m,destination)){m.arrivalSite=destination;m.status='traveling';delete m.arrived;m.due=w.day+path.days+m.negotiation!;m.expires=m.due+30;history(w,m.from,m.to,'朝廷迁驻，使团从实际驻地续行，原交涉预算保留。');}}}
export function arriveDiplomacy(w:World){if(!w.diplomacy||!w.characterId||w.people[0].journey)return;w.diplomacy.returning=null;for(const p of Object.values(w.diplomacy.pairs))for(const t of p.treaties)if(t.meeting==='invited'&&t.actor===w.characterId&&t.until>w.day&&w.people[0].location===capital(t.to,w)&&w.realm?.cities[capital(t.to,w)].controller===t.to&&!atWar(w,t.from,t.to)){t.meeting='held';changeOpinion(p,15,'meeting');w.diplomacy.credit[t.from]=clamp(w.diplomacy.credit[t.from]+3,0);history(w,t.from,t.to,regimeName(w,t.from)+'执政者抵达'+regimeName(w,t.to)+'朝廷，完成会盟，两国关系 +15。');}}
export function personalRoute(w:World,to:string){const p=w.people[0];return planRoute(p.location,to,id=>!w.realm||(isAdventurer(w,w.characterId!)||civilCanAdmin(w,w.characterId!,id))&&canEnter(w,playerRealm(w),w.realm.cities[id].controller,w.characterId));}
export function travelDiplomacyReason(w:World,to:string){if(!w.realm||!w.diplomacy)return '';return personalRoute(w,to)?'':'沿途边境未获通行许可；普通通行不适用于君主、执政与统帅，请先申请安全通行或会盟。';}
export function syncDiplomacy(w:World){const s=w.diplomacy;if(!s)return;
 for(const r of worldRealms(w))if(s.bases[r]!==governmentOf(w,r)!.regimeId){const previous=s.bases[r];s.bases[r]=governmentOf(w,r)!.regimeId;for(const m of s.missions)if(m.bases){if(m.from===r&&m.bases[0]===previous)m.bases[0]=s.bases[r];if(m.to===r&&m.bases[1]===previous)m.bases[1]=s.bases[r];}for(const p of Object.values(s.pairs))if(p.a===r||p.b===r){p.recognized=false;history(w,p.a,p.b,'国统更替，现有条约与债务继续履行，外交承认待重新确认。');}}
}
export function advanceDiplomacy(w:World){const s=w.diplomacy;if(!s||!w.realm)return;
 syncDiplomacy(w);
 for(const p of Object.values(s.pairs)){const expired=p.treaties.filter(t=>t.until<=w.day);p.treaties=p.treaties.filter(t=>t.until>w.day);if(expired.length)history(w,p.a,p.b,'两国有条约到期，通行与军政许可已重新核定。');}
 for(const m of [...s.missions]){
 if(m.envoy){
  if(!isAlive(w,m.envoy)||allegianceRealm(w,m.envoy)!==m.from){stopEnvoy(w,m);s.missions=s.missions.filter(v=>v.id!==m.id);history(w,m.from,m.to,'使者亡故或效忠改变，使团终止。');continue;}
  if(!advanceEnvoyJourney(w,m)){stopEnvoy(w,m);s.missions=s.missions.filter(v=>v.id!==m.id);history(w,m.from,m.to,'使节道路因战事中断，使者留在沿途驻地，交涉终止。');continue;}
  if(m.status==='returning'){if(!missionJourney(w,m.envoy)){s.missions=s.missions.filter(v=>v.id!==m.id);history(w,m.from,m.to,'使者返抵出发地，交还使命。');}continue;}
  if(!missionJourney(w,m.envoy)&&personResidence(w,m.envoy).site!==capital(m.to,w)&&m.arrivalSite!==capital(m.to,w))redirectCourtEnvoys(w,m.to,m.arrivalSite??personResidence(w,m.envoy).site);
  if(lifeOf(w,m.envoy)?.illness?.severity===3||agreementReason(w,m)||w.realm.cities[capital(m.to,w)].controller!==m.to){conclude(w,m,false);continue;}
  if(missionJourney(w,m.envoy))continue;
  if(personResidence(w,m.envoy).site!==capital(m.to,w)){conclude(w,m,false);continue;}
  m.arrived??=w.day;m.due=m.arrived+m.negotiation!;m.expires=m.due+30;
 }
 if(m.due>w.day)continue;
 if(m.to===playerRealm(w)&&governmentExecutive(w)){m.status='audience';if(m.expires<=w.day)conclude(w,m,false);}
 else {const chance=m.envoy?envoyEstimate(w,m.envoy,m.from,m.to,m.action,thresholds[m.action]??100).chance:null;let roll=m.id*2654435761+m.sent;for(const ch of m.envoy??'')roll=(Math.imul(roll,31)+ch.charCodeAt(0))>>>0;conclude(w,m,!agreementReason(w,m)&&(chance===null?diplomaticScore(w,m.from,m.to).reduce((n,v)=>n+v.value,0)>=(thresholds[m.action]??100):roll%100<chance));}
 }
 if(isMonthStart(w.day,w.scriptId)&&s.lastMonth<w.day){s.lastMonth=w.day;for(const [from,to] of Object.entries(s.subjects)){const a=w.realm.treasuries[from as RealmId],b=w.realm.treasuries[to!],paid=Math.min(20,a.coins,1_000_000-b.coins);a.coins-=paid;b.coins+=paid;}}
 if(w.day-s.lastAI>=180&&s.missions.length<6){s.lastAI=w.day;const from=worldRealms(w)[(Math.floor(w.day/180)-1)%worldRealms(w).length],to=playerRealm(w),p=from===to?null:diplomaticPair(w,from,to);if(p&&governingExecutives(w,from).length&&governingExecutives(w,to).length&&!atWar(w,from,to)&&!s.missions.some(m=>m.from===from&&m.to===to)&&w.realm.treasuries[from].coins>=40){const action=p.opinion>=20&&!treaty(w,from,to,'pact')?'pact':'improve';const price=cost[action]!;if(w.realm.treasuries[from].coins>=price&&defaultEnvoy(w,from,to)){w.realm.treasuries[from].coins-=price;dispatch(w,from,to,action);}}}
}
export const diplomaticColor=(w:World,to:Polity)=>{if(!w.realm||!w.characterId||to==='frontier')return '#77796e';const r=playerRealm(w);if(r===to)return '#d4bd72';if(atWar(w,r,to))return '#b13f3f';if(treaty(w,r,to,'alliance'))return '#599e89';if(canEnter(w,r,to,w.characterId))return '#6c9fb8';return (diplomaticPair(w,r,to)?.opinion??0)<-39?'#a87665':'#999f93';};

export function commissionedEnvoyReason(w:World,from:RealmId,to:RealmId){if(!w.diplomacy||!governingAuthority(w,from))return '无可用外交机关';if(atWar(w,from,to))return '两国交战';if(w.diplomacy.missions.length>=6||w.diplomacy.missions.some(m=>m.from===from&&m.to===to&&m.status!=='returning'))return '已有使团在途，请等候答复';if(!defaultEnvoy(w,from,to))return '没有空闲使者';if((diplomaticPair(w,from,to)?.cooldowns[from+'|improve']??0)>w.day)return '上次修好交涉后须间隔六十日';return '';}
export function dispatchCommissionedEnvoy(w:World,from:RealmId,to:RealmId){const reason=commissionedEnvoyReason(w,from,to);if(reason)throw new Error(reason);diplomaticPair(w,from,to)!.cooldowns[from+'|improve']=w.day+60;dispatch(w,from,to,'improve');}
/** Population raids worsen the existing war relationship without inventing a treaty. */
export function recordRaid(w:World,from:RealmId,to:RealmId){const p=diplomaticPair(w,from,to);if(p)changeOpinion(p,-10,'war');if(w.diplomacy)w.diplomacy.credit[from]=Math.max(0,w.diplomacy.credit[from]-5);}
