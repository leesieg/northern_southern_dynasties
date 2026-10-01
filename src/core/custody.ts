import {captiveImportance,ransomWillingness} from './warCaptives';
import {worldRealms} from './polityRuntime';
import {retainPersonalFollowers,detachRetainer} from './allegianceTransition';
import {awardInfluence} from './personalInfluence';
import type {World} from './types';
import type {Army,RealmId} from './realm';
import type {CustodyCommand,Detention} from './custodyState';
import {detained} from './custodyState';
import {syncGovernance} from './realm';
import {relationshipPeople,relationshipPersonById} from '../data/relationships';
import {siteById} from '../data/scenario';
import {isAlive,lifeOf} from './lifeState';
import {die} from './life';
import {allegianceRealm,officeName,reconcileOfficeAllegiance} from './officeEligibility';
import {governmentOf,governingAuthority,governingExecutives,constitutionalExecutives} from './government';
import {armyCommander,ensureMobility,commandArmy} from './mobility';
import {personResidence,presentAt} from './residence';
import {planRoute} from './world';
import {changeRelationOpinion,relationOpinion,friendship} from './relationships';
import {attributes,traitsFor} from './social';
import {clearLocalPerson} from './localAdministration';
import {accountWallet} from './obligations';
import {fiscalRecord} from './treasury';
import {isMonthStart,monthStart} from './calendar';
import {civilWar,civilReason,actCivilWar,warArmySide,warCitySide} from './civilWars';
import {authorityGrant} from './authority';
import {interruptCommanderCampaigns} from './militaryCampaigns';
import {bilateralWar} from './wars';

export function ensureCustody(w:World){
 if(!w.realm)return;
 w.custody??={version:1,nextId:1,records:{},history:[],warrants:[],promises:[],guarantees:[],lastDay:w.day,lastMonth:monthStart(w.day,w.scriptId)};
 const legacy=w.mobility?.captivity,id=w.characterId!;
 if(legacy&&!w.custody.records[id])w.custody.records[id]={person:id,captor:legacy.captor,captorPerson:null,army:null,site:legacy.site,since:legacy.since,origin:allegianceRealm(w,id)!,cause:'battle',source:'legacy:'+legacy.since,treatment:'guarded',talked:null,terms:'',escapeAfter:w.day,ransom:80,offer:null};
 return w.custody;
}
function record(w:World,id:string,captor:RealmId,source:string,result:string){const s=ensureCustody(w)!;s.history.push({day:w.day,person:id,captor,source,result});s.history=s.history.slice(-200);w.chronicle.push({day:w.day,person:'player',text:officeName(id)+'：'+result});w.chronicle=w.chronicle.slice(-100);}
function mirror(w:World){if(w.mobility){const p=w.custody?.records[w.characterId!];w.mobility.captivity=p?{captor:p.captor,site:p.site,since:p.since}:null;}}
function movePerson(w:World,id:string,site:string){ensureMobility(w);const residence=w.mobility!.residences[id];if(residence){residence.site=site;residence.journey=null;}if(id===w.characterId){w.people[0].location=site;w.people[0].journey=null;}}
/** Custody suspends authority and movement; it leaves allegiance and living offices intact. */
export function detainPerson(w:World,id:string,captor:RealmId,site:string,cause:Detention['cause'],source:string,army:Army|null=null){
 const s=ensureCustody(w);if(!s||detained(w,id)||!isAlive(w,id)||!relationshipPersonById[id]||!siteById[site]||!worldRealms(w).includes(captor))return false;
 const origin=allegianceRealm(w,id);if(!origin)return false;
 s.records[id]={person:id,captor,site,cause,source,origin,captorPerson:army?armyCommander(w,army)??null:governingAuthority(w,captor)??null,army:army?.id??null,since:w.day,treatment:'guarded',talked:null,terms:'',escapeAfter:w.day+30,ransom:Math.min(400,80+Math.floor((governmentOf(w,origin)?.merit[id]??0)/2)),offer:null};
 const foreign=bilateralWar(w,captor,origin);if(foreign?.id!==undefined){s.records[id].war=foreign.id;s.records[id].side=foreign.attacker===captor?'attack':foreign.defender===captor?'defend':foreign.allies?.[captor];}const civil=civilWar(w,captor);if(army&&civil){s.records[id].war=civil.id;s.records[id].side=warArmySide(w,civil,army)??undefined;}
 movePerson(w,id,site);interruptCommanderCampaigns(w,id);
 if(w.diplomacy){for(const m of w.diplomacy.missions.filter(m=>m.envoy===id)){w.diplomacy.history.push({day:w.day,from:m.from,to:m.to,text:'使者被拘押，使命中止；已支付的出使成本不退。'});}w.diplomacy.history=w.diplomacy.history.slice(-80);w.diplomacy.missions=w.diplomacy.missions.filter(m=>m.envoy!==id);if(w.diplomacy.returning?.actor===id)w.diplomacy.returning=null;}
 if(w.mobility){for(const [key,leader] of Object.entries(w.mobility.armyCommanders??{}))if(leader===id)delete w.mobility.armyCommanders![Number(key)];for(const r of worldRealms(w))if(w.mobility.commanders[r]===id)delete w.mobility.commanders[r];for(const [key,v] of Object.entries(w.mobility.pendingCommanders??{}))if(v.person===id)delete w.mobility.pendingCommanders![Number(key)];}
 if(w.relationships?.scheme&&(w.relationships.scheme.actor===id||w.relationships.scheme.target===id))w.relationships.scheme=null;
 if(army){const leader=armyCommander(w,army);if(leader){const g=governmentOf(w,captor);if(g)g.merit[leader]=Math.min(100,(g.merit[leader]??0)+5);awardInfluence(w,leader,3);}}
 record(w,id,captor,source,cause==='arrest'?'依拘捕令收押，等待审理':'被俘，原有效忠与家产保留，军务及履职暂停');mirror(w);return true;
}
function release(w:World,p:Detention,result:string){delete w.custody!.records[p.person];movePerson(w,p.person,p.site);mirror(w);record(w,p.person,p.captor,p.source,result);}
function roll(w:World){const s=w.life!;s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
/** Called at an actual rout, once per battle/person, while the commander still exists. */
export function resolveCommanderFate(w:World,a:Army,enemy:Army,source:string,canRetreat:boolean){
 const id=armyCommander(w,a),state=ensureCustody(w),battle=w.militaryAftermath?.battles.find(b=>'battle:'+b.id===source);if(!id||!state||battle?.fates?.[id]||!isAlive(w,id)||detained(w,id)||state.history.some(v=>v.person===id&&v.source===source))return;
 const at=personResidence(w,id);if(at.site!==a.location&&at.site!==a.journey?.route[a.journey.leg])return;
 const life=lifeOf(w,id);if(life)life.health=Math.max(1,life.health-15);
 const risk=canRetreat?.12:Math.min(.9,.65+(a.supply<=0?.15:0)+(life&&life.health<30?.1:0)),draw=roll(w);
 if(draw<risk){detainPerson(w,id,enemy.realm,a.location,'battle',source,enemy);if(battle)(battle.fates??={})[id]='captured';}
 else if(!canRetreat&&draw>.97){if(battle)(battle.fates??={})[id]='dead';record(w,id,enemy.realm,source,'在溃散战场阵亡');die(w,id,'battle');}
 else {if(battle)(battle.fates??={})[id]='escaped';record(w,id,enemy.realm,source,'负伤脱离战场，未被俘获');}
}
export function evacuatePerson(w:World,id:string,route:NonNullable<ReturnType<typeof planRoute>>){movePerson(w,id,route.route[0]);const journey={route:route.route,durations:route.durations,leg:0,elapsed:0,started:w.day};if(route.days>0){w.mobility!.residences[id].journey=structuredClone(journey);if(id===w.characterId)w.people[0].journey=journey;}}
export function captureCityPeople(w:World,site:string,captor:RealmId,source:string,peaceful=false){
 const s=w.realm!,origin=s.cities[site].controller;if(origin===captor||origin==='frontier')return;
 const army=s.armies.find(a=>a.realm===captor&&a.location===site&&!a.journey)??null;
 const kin=relationshipPeople.filter(p=>allegianceRealm(w,p.id)===origin&&captiveImportance(w,{person:p.id,origin}).value>=15).map(p=>p.id);const important=new Set([...kin,s.cities[site].governor,...worldRealms(w).flatMap(r=>{const g=governmentOf(w,r);return g?[g.ruler,...g.executives,...Object.values(g.court?.ministries??{})]:[];}),...s.armies.map(a=>armyCommander(w,a))].filter((v):v is string=>!!v));
 for(const id of important){if(allegianceRealm(w,id)!==origin||detained(w,id)||!presentAt(w,id,site))continue;
  const escape=Object.keys(s.cities).filter(to=>to!==site&&s.cities[to].controller===origin).map(to=>planRoute(site,to,node=>s.cities[node].controller===origin)).find(p=>!!p);
  if(peaceful){if(escape)evacuatePerson(w,id,escape);record(w,id,captor,source,escape?'开城议降，正在沿安全道路撤离，效忠不变':'开城议降，获准留居为自由人物，当前无返国道路');continue;}
  if(escape&&roll(w)<.4){evacuatePerson(w,id,escape);record(w,id,captor,source,'城陷前沿安全道路出逃');}else detainPerson(w,id,captor,site,'city',source,army);
 }
}
export function custodyChief(w:World,p:Detention){if(w.realm!.annexed?.[p.captor])return;const war=civilWar(w,p.captor);const chief=p.war===war?.id&&p.side?(p.side==='attack'?war!.civil!.claimant:war!.civil!.loyalist):governingAuthority(w,p.captor);return chief&&isAlive(w,chief)&&!detained(w,chief)?chief:undefined;}
export function custodyAuthority(w:World,actor:string,p:Detention){if(w.realm!.annexed?.[p.captor])return '';const escort=w.realm!.armies.find(a=>a.id===p.army&&a.realm===p.captor);const civil=civilWar(w,p.captor),national=p.war===civil?.id&&p.side?custodyChief(w,p)===actor:governingExecutives(w,p.captor).includes(actor);return national?'国家裁定':escort&&armyCommander(w,escort)===actor&&isAlive(w,actor)&&!detained(w,actor)?'看管将领':'';}
function holdsGovernment(w:World,p:Detention){return !w.realm!.annexed?.[p.origin]&&(governmentOf(w,p.origin)?.ruler===p.person||constitutionalExecutives(w,p.origin).includes(p.person));}
export function arrestEvidence(w:World,id:string){const r=allegianceRealm(w,id);if(!r)return '';const proven=w.economy?.investigations.find(q=>q.realm===r&&q.outcome==='substantiated'&&q.findings.some(f=>w.economy?.misconduct.find(m=>m.id===f)?.person===id));if(proven)return '核实侵吞案 '+proven.id;const revolt=civilWar(w,r)?.civil;if(revolt?.supporters.includes(id))return '参与在案叛乱';const refusal=w.realm?.armies.find(a=>a.refusal?.commander===id);return refusal?'第 '+refusal.id+' 军已记录拒绝交接军令':'';}
export function recruitQuote(w:World,p:Detention,actor:string,offer:'stipend'|'office',mediator?:string){
 const lord=w.relationships?.oaths[p.person]?.lord??governingAuthority(w,p.origin),loyalty=w.relationships?.oaths[p.person]?.loyalty??Math.max(30,50+Math.round(relationOpinion(w,p.person,lord)/3));
 const factors=[{label:'与招揽者关系',value:Math.round(relationOpinion(w,p.person,actor)/2)},{label:'对旧主的忠诚',value:-Math.round(loyalty*.7)},{label:'囚中礼遇',value:p.treatment==='honored'?25:p.treatment==='house'?15:0},{label:'可兑现待遇',value:offer==='stipend'?35:55},{label:'旧国处境',value:w.realm!.annexed?.[p.origin]?40:Math.round((governmentOf(w,p.origin)?.court?.tension??0)/3)},{label:'游说者交情',value:mediator?Math.round(relationOpinion(w,p.person,mediator)/2)+Math.floor(attributes(w,mediator).diplomacy/2):0},{label:'性格立场',value:traitsFor(w,p.person).includes('steadfast')?-20:0}];
 const score=factors.reduce((n,v)=>n+v.value,0),terms=[offer,p.treatment,lord,Math.round(score/5)].join('|');return {factors,score,terms,willing:score>=30};
}
function ransomConsentReason(w:World,p:Detention,payer:string|undefined,actor:string){
 const chief=custodyChief(w,p),oldChief=governingAuthority(w,p.origin);if(chief&&chief!==w.characterId&&(relationOpinion(w,chief,p.person)<-60||p.treatment==='guarded'&&bilateralWar(w,p.origin,p.captor)&&captiveImportance(w,p).value>=25))return '俘获方暂不接受赎还，须议和或改善礼遇';
 if(payer==='central:'+p.captor)return '同一公库不能向自己支付赎金，请用私财或司法处置';
 if(payer==='central:'+p.origin&&actor!==oldChief){if(oldChief===w.characterId)return '旧国公款筹赎须玩家执政者亲自决定';if(!oldChief||ransomWillingness(w,p).total<25||w.realm!.treasuries[p.origin].coins<p.ransom+80)return '旧主暂不批准公款筹赎：交情或余款不足';}
 return '';
}
export function custodyEscapeRoute(w:World,p:Detention){return Object.keys(w.realm!.cities).filter(id=>id!==p.site&&w.realm!.cities[id].controller===p.origin).map(id=>planRoute(p.site,id,node=>node===p.site||w.realm!.cities[node].controller===p.origin)).filter(v=>!!v).sort((a,b)=>a.days-b.days)[0];}
function national(w:World,actor:string,p:Detention){return custodyAuthority(w,actor,p)==='国家裁定';}
function payerFor(w:World,p:Detention,action:string){if(action==='ransom')return 'person:'+p.person;if(action==='request-lord')return 'central:'+p.origin;const family=relationshipPersonById[p.person]?.family;return family?relationshipPeople.filter(v=>v.id!==p.person&&v.family===family&&isAlive(w,v.id)&&!detained(w,v.id)&&v.id!==w.characterId&&relationOpinion(w,v.id,p.person)>=0).sort((a,b)=>(accountWallet(w,'person:'+b.id)?.read()??0)-(accountWallet(w,'person:'+a.id)?.read()??0)).map(v=>'person:'+v.id).find(key=>(accountWallet(w,key)?.read()??0)>=p.ransom):undefined;}
export function custodyReason(w:World,c:CustodyCommand,actor=w.characterId!):string{
 if(!w.realm||!w.custody||!isAlive(w,actor)||w.campaign?.status!=='active'||!relationshipPersonById[c.person])return '当前无法办理人物处置';
 const p=w.custody.records[c.person],self=actor===c.person;
 if(c.action==='arrest'){const r=allegianceRealm(w,actor),target=allegianceRealm(w,c.person),at=personResidence(w,c.person);return !r||!authorityGrant(w,actor,'inspect',{realm:r}).allowed||!governingExecutives(w,r).includes(actor)?'国内拘捕须由实际执政者裁定':target!==r||self?'只能拘捕本国其他人物':!isAlive(w,c.person)?'人物已故':p?'人物已被收押':w.custody.warrants.some(q=>q.person===c.person&&q.status==='pending')?'已有拘捕令待执行':w.realm.cities[at.site]?.controller!==r?'人物所在地不受本国控制':'';}
 if(!p)return '人物当前未被拘押';
 if(detained(w,actor)&&!self)return '被拘押期间不能处分他人';
 const power=custodyAuthority(w,actor,p);
 if(['ransom','request-family','request-lord','escape','accept'].includes(c.action)){
  if(!self&&!(c.action==='ransom'&&governingExecutives(w,p.origin).includes(actor)))return '须由本人提出脱困请求';
  if(c.action==='escape')return w.day<p.escapeAfter?'再次尝试须等待 '+(p.escapeAfter-w.day)+' 日':!custodyEscapeRoute(w,p)?'没有可沿己方道路返国的脱困路线':'';
  if(c.action==='accept')return !custodyChief(w,p)?'俘获方没有可裁定者':(accountWallet(w,'person:'+p.person)?.read()??0)+80>1_000_000?'本人账户无法接收礼金':!p.offer?'俘获方尚未提出招降条件':holdsGovernment(w,p)?'在位君主与执政者须先辞去国政身份':w.realm.treasuries[p.captor].coins<80?'俘获方尚无兑现礼金的公款':'';
  const payer=c.action==='ransom'&&!self?'central:'+p.origin:payerFor(w,p,c.action),chief=custodyChief(w,p);const consent=ransomConsentReason(w,p,payer,actor);if(consent)return consent;return !chief?'俘获方无可裁定者':chief===w.characterId&&!self?'需俘获方玩家亲自同意':p.cause==='arrest'?'国内案件须先审理或担保，不能购买脱罪':!payer||!accountWallet(w,payer)||accountWallet(w,payer)!.read()<p.ransom?'筹赎账户不足 '+p.ransom+' 钱':w.realm.treasuries[p.captor].coins+p.ransom>1_000_000?'俘获方公库无法接收赎金':self&&chief===w.characterId?'须另行审理':'';
 }
 if(!power)return '没有当前看管或处置权限';
 if(c.action==='treatment')return !['guarded','honored','house'].includes(c.treatment)?'未知待遇':c.treatment===p.treatment?'已是当前待遇':'';
 if(c.action==='release')return '';
 if(!national(w,actor,p))return '招降、换俘与司法处置须由国家实际执政者裁定';
 if(c.action==='execute')return '';
 if(c.action==='acquit'||c.action==='fine')return p.cause!=='arrest'?'仅适用于国内案件':c.action==='fine'&&!arrestEvidence(w,p.person)?'没有已记录的叛乱或拒命依据':c.action==='fine'&&w.realm.treasuries[p.captor].coins+60>1_000_000?'中央公库无法接收罚金':c.action==='fine'&&(accountWallet(w,'person:'+p.person)?.read()??0)<60?'本人私财不足缴纳罚金 60 钱':'';
 if(c.action==='exchange'){const other=w.custody.records[c.other];return !other||other===p||other.origin!==p.captor||other.captor!==p.origin?'须选择由对方拘押的本国人物':governingAuthority(w,p.origin)===w.characterId?'换俘须由对方玩家另行裁定':!governingAuthority(w,p.origin)?'对方无可裁定者':'';}
 if(c.action==='guarantee'){const wallet=accountWallet(w,'person:'+c.guarantor);return p.cause!=='arrest'?'担保只用于国内案件':!isAlive(w,c.guarantor)||detained(w,c.guarantor)||allegianceRealm(w,c.guarantor)!==p.captor?'须本国在世且未被收押的担保人':c.guarantor!==actor&&relationOpinion(w,c.guarantor,p.person)<40?'担保人未同意出资':!wallet||wallet.read()<100?'担保人需私财 100 钱':'';}
 if(c.action==='recruit'){
  if(p.origin===p.captor&&!p.side)return '本国案件须依法审理，不以招降发放礼金';if(!['stipend','office'].includes(c.offer))return '请选择有效待遇';if(holdsGovernment(w,p))return '在位君主与执政者不能被强行改换门庭';
  if(c.mediator&&(allegianceRealm(w,c.mediator)!==p.captor||!isAlive(w,c.mediator)||detained(w,c.mediator)||!presentAt(w,c.mediator,p.site)))return '游说者须为本国自由人物并在看管地点';
  if(w.realm.treasuries[p.captor].coins<80||(accountWallet(w,'person:'+p.person)?.read()??0)+80>1_000_000)return '招降需中央礼金 80 钱，人物账户须能接收';
  const q=recruitQuote(w,p,actor,c.offer,c.mediator);return p.talked!==null&&w.day-p.talked<7?'交涉至少间隔七日':p.terms===q.terms?'条件未改变，请改善礼遇、关系或局势后再谈':'';
 }
 return '未知处置';
}
function changeAllegiance(w:World,p:Detention,actor:string,offer:'stipend'|'office'){
 const id=p.person,rs=w.relationships!,oldChief=governingAuthority(w,p.origin);
 retainPersonalFollowers(w,id,p.origin);
 delete rs.oaths[id];detachRetainer(w,id);clearLocalPerson(w,id);for(const r of worldRealms(w)){const g=governmentOf(w,r);if(g?.court)for(const m of Object.keys(g.court.ministries) as (keyof typeof g.court.ministries)[])if(g.court.ministries[m]===id)g.court.ministries[m]=null;}
 const war=civilWar(w,p.captor);if(p.war===war?.id&&p.side){if(p.side==='attack'&&!war!.civil!.supporters.includes(id))war!.civil!.supporters.push(id);else if(p.side==='defend')war!.civil!.supporters=war!.civil!.supporters.filter(v=>v!==id);}
 (rs.allegiances??={})[id]={realm:p.captor,from:p.origin,since:w.day,army:0,source:'custody'};rs.oaths[id]={lord:actor,since:w.day,loyalty:60};
 w.realm!.offices=w.realm!.offices.filter(q=>q.candidate!==id);
 const wallet=accountWallet(w,'person:'+id)!;w.realm!.treasuries[p.captor].coins-=80;wallet.write(wallet.read()+80);fiscalRecord(w,p.captor,'central:'+p.captor,'person:'+id,80,'招降礼金');
 if(oldChief)changeRelationOpinion(w,id,oldChief,-30);changeRelationOpinion(w,id,actor,20);
 for(const v of relationshipPeople.filter(v=>v.id!==id&&allegianceRealm(w,v.id)===p.captor&&['rival','nemesis'].includes(friendship(w,v.id,id)??'')))changeRelationOpinion(w,v.id,actor,-10);
 if(offer==='office')w.custody!.promises.push({person:id,lord:actor,realm:p.captor,due:w.day+90,kind:'office',status:'pending'});
 release(w,p,'接受招降，礼金 80 钱已到账；旧职交接，军队、地方公款及追随者保留原阵营');reconcileOfficeAllegiance(w);syncGovernance(w);
}
/** Validate and commit the entire disposition together, including both exchange parties. */
export function actCustody(w:World,c:CustodyCommand,actor=w.characterId!){ensureCustody(w);const reason=custodyReason(w,c,actor).trim();if(reason)throw new Error(reason);const next=structuredClone(w);executeCustody(next,c,actor);Object.assign(w,next);}
function executeCustody(w:World,c:CustodyCommand,actor:string){const s=w.custody!,p=s.records[c.person];
 if(c.action==='arrest'){const r=allegianceRealm(w,actor)!,at=personResidence(w,c.person),evidence=arrestEvidence(w,c.person),q={id:s.nextId++,person:c.person,issuer:actor,realm:r,site:at.site,issued:w.day,due:w.day+7,evidence,status:'pending' as const};s.warrants.push(q);if(!evidence){const g=governmentOf(w,r)!;g.support=Math.max(0,g.support-8);if(g.court)g.court.tension=Math.min(100,g.court.tension+8);for(const v of relationshipPeople.filter(v=>v.id!==actor&&allegianceRealm(w,v.id)===r))changeRelationOpinion(w,v.id,actor,-5);}record(w,c.person,r,'warrant:'+q.id,evidence?'已发出拘捕令：'+evidence:'无个案依据的拘捕令：朝野支持 −8、紧张 +8');return;}
 if(c.action==='treatment'){p.treatment=c.treatment;record(w,p.person,p.captor,p.source,'更改看管待遇');return;}
 if(c.action==='release'||c.action==='acquit'){changeRelationOpinion(w,p.person,actor,c.action==='acquit'?15:20);release(w,p,c.action==='acquit'?'审理释放':'无偿释放，记下宽待之恩');return;}
 if(c.action==='execute'){for(const v of relationshipPeople){if(v.id!==p.person&&v.id!==actor&&(v.family===relationshipPersonById[p.person].family||relationOpinion(w,v.id,p.person)>=40))changeRelationOpinion(w,v.id,actor,-50);}const g=governmentOf(w,p.captor)!;g.support=Math.max(0,g.support-(p.cause==='arrest'&&!arrestEvidence(w,p.person)?15:5));if(g.court)g.court.tension=Math.min(100,g.court.tension+5);release(w,p,'被裁定处决，亲友与政治关系受到冲击');die(w,p.person,'execution');return;}
 if(c.action==='exchange'){const other=s.records[c.other];release(w,other,'双方同意换俘，获释');release(w,p,'双方同意换俘，获释');return;}
 if(c.action==='fine'){const wallet=accountWallet(w,'person:'+p.person)!;wallet.write(wallet.read()-60);w.realm!.treasuries[p.captor].coins+=60;fiscalRecord(w,p.captor,'person:'+p.person,'central:'+p.captor,60,'在案拒命／叛乱罚金');release(w,p,'审理罚金 60 钱后释放');return;}
 if(c.action==='guarantee'){const wallet=accountWallet(w,'person:'+c.guarantor)!;wallet.write(wallet.read()-100);s.guarantees.push({person:p.person,payer:c.guarantor,realm:p.captor,coins:100,due:w.day+90,status:'held'});fiscalRecord(w,p.captor,'person:'+c.guarantor,'custody:'+p.person,100,'司法担保押金');release(w,p,'由'+officeName(c.guarantor)+'出资 100 钱担保，九十日守约后返还');return;}
 if(c.action==='recruit'){const q=recruitQuote(w,p,actor,c.offer,c.mediator);p.talked=w.day;p.terms=q.terms;if(p.person===w.characterId){p.offer=c.offer;record(w,p.person,p.captor,p.source,'俘获方提出招降条件，等待本人决定');}else if(q.willing)changeAllegiance(w,p,actor,c.offer);else record(w,p.person,p.captor,p.source,'拒绝招降，主要牵挂：'+q.factors.filter(v=>v.value<0).map(v=>v.label).join('、'));return;}
 if(c.action==='accept'){changeAllegiance(w,p,custodyChief(w,p)!,p.offer!);return;}
 if(c.action==='escape'){p.escapeAfter=w.day+30;const route=custodyEscapeRoute(w,p),chance=p.treatment==='guarded'?.15:p.treatment==='honored'?.3:.5;if(route&&roll(w)<chance){release(w,p,'沿可通行道路成功逃脱');const journey={route:route.route,durations:route.durations,leg:0,elapsed:0,started:w.day};if(route.days>0){w.mobility!.residences[p.person].journey=journey;if(p.person===w.characterId)w.people[0].journey=structuredClone(journey);}}else {const life=lifeOf(w,p.person);if(life)life.health=Math.max(1,life.health-10);record(w,p.person,p.captor,p.source,'逃脱失败，健康 −10，三十日后可再尝试');}return;}
 const payer=c.action==='ransom'&&actor!==p.person?'central:'+p.origin:payerFor(w,p,c.action)!;const wallet=accountWallet(w,payer)!;wallet.write(wallet.read()-p.ransom);w.realm!.treasuries[p.captor].coins+=p.ransom;fiscalRecord(w,p.captor,payer,'central:'+p.captor,p.ransom,'双方议定人物赎金');release(w,p,'赎金 '+p.ransom+' 钱已由'+(payer.startsWith('central:')?'旧国中央':'私人账户')+'实付，获释');
}
export function advanceCustody(w:World){const s=ensureCustody(w);if(!s||s.lastDay>=w.day)return;s.lastDay=w.day;
 for(const q of s.warrants.filter(v=>v.status==='pending')){if(!isAlive(w,q.person)||detained(w,q.person)||!isAlive(w,q.issuer)||!governingExecutives(w,q.realm).includes(q.issuer)||allegianceRealm(w,q.person)!==q.realm){q.status='cancelled';continue;}if(w.day<q.due)continue;const at=personResidence(w,q.person),power=commandArmy(w,q.person),resists=!!power||relationOpinion(w,q.person,q.issuer)<-20;if(at.traveling){q.due=w.day+7;continue;}if(w.realm!.cities[at.site].controller!==q.realm){q.status='refused';record(w,q.person,q.realm,'warrant:'+q.id,'拘捕执行受阻：所在地不受控制');continue;}if(resists){q.status='refused';changeRelationOpinion(w,q.person,q.issuer,-20);const cmd={type:'civilWar',action:'rise',name:'义军'} as const;if(!civilReason(w,cmd,q.person))actCivilWar(w,cmd,q.person);record(w,q.person,q.realm,'warrant:'+q.id,'拒捕，保留地方抵抗；符合条件时已接入内战');}else {q.status='detained';detainPerson(w,q.person,q.realm,at.site,'arrest','warrant:'+q.id);}}
 for(const p of Object.values(s.records)){
  if(!isAlive(w,p.person)){release(w,p,'拘押期间亡故，案件终止');continue;}
  if(w.realm!.annexed?.[p.captor]){release(w,p,'看管政权终止，获释');continue;}
  const escort=p.army===null?undefined:w.realm!.armies.find(a=>a.id===p.army&&a.realm===p.captor);const civil=civilWar(w,p.captor),held=!!civil&&p.war===civil.id&&p.side?warCitySide(w,civil,p.site)===p.side:w.realm!.cities[p.site].controller===p.captor;
  if(escort){p.site=escort.location;const at=w.mobility!.residences[p.person];if(at){at.site=escort.location;at.journey=escort.journey?structuredClone(escort.journey):null;}if(p.person===w.characterId){w.people[0].location=escort.location;w.people[0].journey=escort.journey?structuredClone(escort.journey):null;}}
  else if(!held){release(w,p,'看管地点失守且无看管军队，获释');continue;}
  if(p.person===w.characterId&&(p.origin!==p.captor||p.side)&&!p.offer&&w.realm!.treasuries[p.captor].coins>=80&&!holdsGovernment(w,p))p.offer='stipend';
 }
 if(isMonthStart(w.day,w.scriptId)&&s.lastMonth<w.day){s.lastMonth=w.day;for(const p of Object.values(s.records)){const cost=p.treatment==='honored'?6:p.treatment==='house'?3:2,t=w.realm!.treasuries[p.captor],paid=Math.min(t.coins,cost);t.coins-=paid;fiscalRecord(w,p.captor,'central:'+p.captor,'expense',paid,'人物看管与供养');if(paid<cost){p.escapeAfter=Math.min(p.escapeAfter,w.day);record(w,p.person,p.captor,p.source,'看管经费缺付，脱困机会增加');}if(p.treatment==='honored'){const chief=custodyChief(w,p);if(chief)changeRelationOpinion(w,p.person,chief,3);}const chief=custodyChief(w,p);if(p.cause!=='arrest'&&p.person!==w.characterId&&chief!==w.characterId&&governingAuthority(w,p.origin)!==w.characterId&&w.day-p.since>=30){const rescue:CustodyCommand={type:'custody',action:'request-lord',person:p.person};if(!custodyReason(w,rescue,p.person)){executeCustody(w,rescue,p.person);continue;}}if(chief&&chief!==w.characterId&&(p.person!==w.characterId||p.cause==='arrest')&&w.day-p.since>=30){const cmd:CustodyCommand=p.cause==='arrest'?{type:'custody',action:arrestEvidence(w,p.person)&&!custodyReason(w,{type:'custody',action:'fine',person:p.person},chief)?'fine':'acquit',person:p.person}:{type:'custody',action:'recruit',person:p.person,offer:'stipend'};if(!custodyReason(w,cmd,chief).trim())executeCustody(w,cmd,chief);}}
  for(const q of s.promises.filter(q=>q.status==='pending')){const g=governmentOf(w,q.realm),employed=Object.values(g?.court?.ministries??{}).includes(q.person)||Object.values(w.realm!.cities).some(c=>c.governor===q.person)||Object.values(w.realm!.local?.seats??{}).some(s=>s.holder===q.person);if(employed)q.status='honored';else if(w.day>=q.due||!isAlive(w,q.person)||allegianceRealm(w,q.person)!==q.realm){q.status='broken';changeRelationOpinion(w,q.person,q.lord,-35);if(w.relationships?.oaths[q.person]){const oath=w.relationships.oaths[q.person];oath.loyalty-=30;if(oath.loyalty<=0)delete w.relationships.oaths[q.person];}record(w,q.person,q.realm,'promise:'+q.due,'授职承诺未兑现，关系 −35、誓约忠诚 −30');}}
 }
 for(const q of s.guarantees.filter(v=>v.status==='held')){if(detained(w,q.person)||civilWar(w,q.realm)?.civil?.supporters.includes(q.person)){const room=1_000_000-w.realm!.treasuries[q.realm].coins;if(room<q.coins)continue;w.realm!.treasuries[q.realm].coins+=q.coins;q.status='forfeited';fiscalRecord(w,q.realm,'custody:'+q.person,'central:'+q.realm,q.coins,'担保期间再犯，押金没收');}else if(w.day>=q.due||!isAlive(w,q.person)){const wallet=accountWallet(w,'person:'+q.payer);if(!wallet||wallet.read()+q.coins>1_000_000)continue;wallet.write(wallet.read()+q.coins);q.status='refunded';fiscalRecord(w,q.realm,'custody:'+q.person,'person:'+q.payer,q.coins,'守约担保押金返还');}}
 s.warrants=[...s.warrants.filter(q=>q.status!=='pending').slice(-40),...s.warrants.filter(q=>q.status==='pending')];s.promises=[...s.promises.filter(q=>q.status!=='pending').slice(-40),...s.promises.filter(q=>q.status==='pending')];s.guarantees=[...s.guarantees.filter(q=>q.status!=='held').slice(-40),...s.guarantees.filter(q=>q.status==='held')];mirror(w);
}
