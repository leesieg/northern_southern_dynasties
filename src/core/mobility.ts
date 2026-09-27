import {isAdventurer} from './resignation';
import {authorityGrant} from './authority';
import {armyCampaign} from './militaryCampaigns';
import type {Army} from './realm';
import {civilCanAdmin} from './civilWars';
import {localSeatSite} from './localAdministration';
import {awardDeed} from './deeds';
import {allegianceRealm} from './officeEligibility';
import {retinueDestination,retinueBusy} from './retinue';
import {lifestyleFocuses} from '../data/lifestyles';
import {characterById} from '../data/characters';
import {relationshipPeople,relationshipPersonById} from '../data/relationships';
import {siteById} from '../data/scenario';
import {isAlive,lifeOf,ageAt} from './lifeState';
import {personResidence,presentAt} from './residence';
import {capital,playerRealm,realms,type RealmId} from './realm';
import {governmentOf,governingExecutives,politicalName} from './government';
import {personalRoute,canEnter,atWar} from './diplomacy';
import {planRoute,remainingDays} from './world';
import {attributes,traitsFor} from './social';
import {changeRelationOpinion,relationOpinion,bondKey,spouseOf} from './relationships';
import {awardPrestige} from './family';
import {officeHierarchy} from './offices';
import type {World} from './types';
import {type Activity,type ActivityKind,type MobilityCommand} from './mobilityState';
export const activities:Record<ActivityKind,{name:string;icon:'person'|'gregarious'|'diligent'|'influence'|'world'|'renown'|'estate'|'army';days:number;cost:number;effect:string}>={
 visit:{name:'拜访会面',icon:'person',days:3,cost:10,effect:'交往加深，双方好感增加；同城可进一步协商婚姻或盟誓。'},
 banquet:{name:'宴谈结交',icon:'gregarious',days:5,cost:35,effect:'增进私人交往；已有交情且接受款待者可成为朋友。'},
 mentor:{name:'随师研习',icon:'diligent',days:12,cost:25,effect:'与能力更高者共处；驻留期间生活重心每日额外经验 +1，改善关系并舒缓压力。'},
 audience:{name:'入朝求仕',icon:'influence',days:5,cost:20,effect:'当面陈述志向，取得功绩与执政者好感，仍须正式请任。'},
 tour:{name:'巡察安抚',icon:'world',days:10,cost:35,effect:'改善当地秩序与繁荣；亲自巡察可取得个人功绩。'},
 family:{name:'归庄议亲',icon:'renown',days:7,cost:25,effect:'与亲族议事，改善关系、缓解压力并积累家族威望。'},
 succession:{name:'共理家业',icon:'estate',days:14,cost:30,effect:'与已指定继任者共理家业，继任者治理历练 +1，增进关系与家族威望。家业交接仍需另行确认。'},
 training:{name:'赴营督练',icon:'army',days:10,cost:25,effect:'提升驻军士气、补充兵员，取得军事功绩。'},
};
const clamp=(n:number,min=0,max=100)=>Math.max(min,Math.min(max,n));
const actor=(w:World)=>w.characterId??'fictional';
const log=(w:World,text:string)=>{w.chronicle.push({day:w.day,person:'player',text});w.chronicle=w.chronicle.slice(-100);};
export function ensureMobility(w:World){
 if(w.mode!=='sandbox'||w.mobility)return w.mobility;
 w.mobility={version:1,since:w.day,lastDay:w.day,nextId:1,residences:Object.fromEntries(relationshipPeople.filter(p=>isAlive(w,p.id)).map(p=>[p.id,{site:personResidence(w,p.id).site,journey:null}])),activities:[],appointments:{},cooldowns:{},commanders:{},captivity:null,reported:0};
 // Existing ongoing assignments keep their accrued work; officers already at work are based on site.
 for(const t of w.service?.tasks??[])if(t.started&&t.phase!=='closed'&&t.officer!==w.characterId&&w.mobility.residences[t.officer])w.mobility.residences[t.officer].site=t.site;
 return w.mobility;
}
export function activeActivity(w:World,id=actor(w)){return w.mobility?.activities.find(a=>a.actor===id&&!a.delegate&&!['done','cancelled'].includes(a.phase));}
export function armyCommander(w:World,a:Army){return armyCampaign(w,a)?.commander??w.mobility?.armyCommanders?.[a.id!]??(w.realm?.armies.find(v=>v.realm===a.realm)===a?w.mobility?.commanders[a.realm]:undefined);}
export function commandArmy(w:World,id=actor(w)){const mandate=w.militaryCampaigns?.items.find(q=>q.commander===id&&q.status==='active');if(mandate)return w.realm?.armies.find(a=>a.id===mandate.army);const assigned=w.realm?.armies.find(a=>w.mobility?.armyCommanders?.[a.id!]===id);if(assigned)return assigned;const r=realms.find(r=>w.mobility?.commanders[r]===id);return r?w.realm?.armies.find(a=>a.realm===r&&a.troops>0):undefined;}
function installCommander(w:World,a:Army,id:string,legacy=false){const s=w.mobility!;if(legacy){s.commanders[a.realm]=id;if(s.armyCommanders)delete s.armyCommanders[a.id!];}else{if(w.realm!.armies.find(v=>v.realm===a.realm)===a)delete s.commanders[a.realm];s.armyCommanders??={};s.armyCommanders[a.id!]=id;}delete s.pendingCommanders?.[a.id!];s.stance='balanced';log(w,politicalName(id)+'抵营接掌第 '+a.id+' 军。');}
export function departureReason(w:World){if(w.diplomacy?.missions.some(m=>m.envoy===w.characterId))return '正在奉使，请待交涉与返程结束';if(w.militaryCampaigns?.items.some(q=>q.status==='active'&&q.commander===w.characterId))return '请先交接战役委任';return w.mobility?.captivity?'身陷囹圄，须先赎返':commandArmy(w)?'正在随军，须先在己方驻地卸任统帅':activeActivity(w)&&['working','decision'].includes(activeActivity(w)!.phase)?'正在参加当地事务，请先结束或取消':'';}
export function departureImpact(w:World){return (w.service?.tasks??[]).filter(t=>t.phase!=='closed'&&t.officer===w.characterId&&t.started).map(t=>t.helper&&presentAt(w,t.helper,t.site)&&!['training','inspection'].includes(t.kind)?`${siteById[t.site].name}差事由${politicalName(t.helper)}留守，按其贡献核定考绩`:`${siteById[t.site].name}差事将暂停，限期继续计算`);}
export function activityQuote(w:World,c:Extract<MobilityCommand,{action:'plan'}>){
 const d=activities[c.kind],id=actor(w),r=playerRealm(w),p=w.people[0],g=governmentOf(w,r),site=siteById[c.site],executor=c.delegate??id;
 const route=site&&p.location!==c.site?personalRoute(w,c.site):null;
 let reason='';
 if(!w.mobility||!w.realm||!g||!isAlive(w,id)||w.campaign?.status!=='active')reason='此局无法安排出行事务';
 else if(!Object.hasOwn(activities,c.kind)||!site)reason='未知事务或地点';
 else if(w.realm.event)reason='先处理待决政务';
 else if(departureReason(w))reason=departureReason(w);
 else if(w.diplomacy?.missions.some(m=>m.envoy===executor))reason='此人正在奉使';
 else if(p.journey||activeActivity(w))reason='先完成当前行程或事务';
 else if(lifeOf(w,id)?.illness?.severity===3)reason='重病期间请先休养';
 else if(w.mobility.activities.filter(a=>!['done','cancelled'].includes(a.phase)).length>=6)reason='已有六项行程事务';
 else if((w.mobility.cooldowns[id+'|'+c.kind+'|'+(c.target??c.site)]??0)>w.day)reason='此项事务仍在冷却中';
 else if(p.coins<d.cost)reason=`需个人钱 ${d.cost}`;
 else if(c.delegate&&(!['tour','training'].includes(c.kind)||!governingExecutives(w,r).includes(id)))reason='只有执政者可派员巡察或督练';
 else if(c.delegate&&(ageAt(w,c.delegate)??0)<16)reason='承办人须成年';
 else if(c.delegate&&retinueBusy(w,c.delegate))reason='此人已受幕府差遣';
 else if(c.target&&retinueBusy(w,c.target))reason='此人正在幕府任职';
 else if(c.delegate&&(!relationshipPersonById[c.delegate]||allegianceRealm(w,c.delegate)!==r||!isAlive(w,c.delegate)||c.delegate===id||lifeOf(w,c.delegate)?.illness?.severity===3||w.mobility.appointments[c.delegate]||w.duties?.task?.officer===c.delegate&&w.duties.task.phase!=='closed'||personResidence(w,c.delegate).traveling||activeActivity(w,c.delegate)||w.service?.tasks.some(t=>t.phase!=='closed'&&(t.officer===c.delegate||t.helper===c.delegate))||w.mobility.activities.some(a=>a.delegate===c.delegate&&!['done','cancelled'].includes(a.phase))||commandArmy(w,c.delegate)))reason='所选人物无法承办';
 else if(w.service?.tasks.some(t=>t.phase!=='closed'&&(t.officer===executor||t.helper===executor))&&['training','mentor','succession'].includes(c.kind))reason='请先办结现有差事';
 else if(c.target&&lifeOf(w,c.target)?.illness?.severity===3)reason='对方正在养病';
 else if(c.target&&(!relationshipPersonById[c.target]||!isAlive(w,c.target)||c.target===id))reason='须选择另一位在世人物';
 else if(['visit','banquet','mentor','audience','family','succession'].includes(c.kind)&&!c.target)reason='须选择会面人物';
 else if(c.target&&(w.relationships?.scheme?.target===c.target||w.social?.scheme?.target===c.target||w.mobility.activities.some(a=>!['done','cancelled'].includes(a.phase)&&(a.delegate===c.target||a.actor===c.target&&!a.delegate))||w.mobility.appointments[c.target]||personResidence(w,c.target).traveling||w.duties?.task?.phase!=='closed'&&w.duties?.task?.officer===c.target||w.service?.tasks.some(t=>t.phase!=='closed'&&(t.officer===c.target||t.helper===c.target))||commandArmy(w,c.target)))reason='对方已有安排或正在途中';
 else if(c.target&&relationOpinion(w,id,c.target)<(traitsFor(w,c.target).includes('wary')?10:-20)&&spouseOf(w,id)!==c.target)reason='对方不愿会面，请先通信改善关系';
 else if(c.kind==='audience'&&(c.site!==capital(r)||!governingExecutives(w,r).includes(c.target!)))reason='请到本国朝廷拜见执政者';
 else if(c.kind==='mentor'&&!w.lifestyles?.people[id]?.focus)reason='请先选择生活重心';
 else if(c.kind==='mentor'&&attributes(w,c.target!)[lifestyleFocuses[w.lifestyles!.people[id].focus!].branch]<=attributes(w,id)[lifestyleFocuses[w.lifestyles!.people[id].focus!].branch])reason='对方在当前生活重心对应的能力须高于你';
 else if(['family','succession'].includes(c.kind)&&(c.site!==w.holdings.estate.location||relationshipPersonById[c.target!]?.family!==characterById[id]?.family))reason='请在自家庄园与同族议事';
 else if(c.kind==='succession'&&w.social?.heir!==c.target)reason='须与已指定的家业继任者共理家业';
 else if(c.kind==='tour'&&(!(g.ruler===id||governingExecutives(w,r).includes(id)||w.realm.cities[c.site].governor===id)||w.realm.cities[c.site].controller!==r||w.realm.cities[c.site].owner!==r))reason='须对本国控制的城市有治理或巡察权限';
 else if(c.kind==='tour'&&w.realm.cities[c.site].order>=75&&w.realm.cities[c.site].prosperity>=65)reason='当地政务安定，无需重复巡察';
 else if(c.kind==='training'&&(!w.realm.mandate||!w.realm.armies.some(a=>a.realm===r&&a.location===c.site&&!a.journey)))reason='须有军务授权并选择本国驻军所在地';
 else if(c.target&&!['family','succession'].includes(c.kind)&&personResidence(w,c.target).site!==c.site)reason='请在对方当前驻地会面';
 else if((!isAdventurer(w,id)&&!civilCanAdmin(w,id,c.site)||!canEnter(w,r,w.realm.cities[c.site].controller,id)))reason='当前政权关系不允许在此活动';
 else if(c.delegate&&!npcRoute(w,executor,c.site))reason='承办人没有可通行路线';
 else if(!c.delegate&&p.location!==c.site&&!route)reason='没有获准通行的路线';
 else if(!c.delegate&&route&&p.food<route.food)reason=`需 ${route.food} 日行粮`;
 else if(c.target&&['family','succession'].includes(c.kind)&&!npcRoute(w,c.target,c.site))reason='亲族无法安全抵达庄园';
 return {reason,cost:d?.cost??0,days:c.delegate?(npcRoute(w,c.delegate,c.site)?.days??0):(route?.days??0),food:route?.food??0,duration:d?.days??0};
}
function npcRoute(w:World,id:string,to:string){const from=personResidence(w,id).site,r=relationshipPersonById[id]?.realm??characterById[id]?.polity;if(from===to)return {days:0,route:[from],durations:[]};return r?planRoute(from,to,site=>!w.realm||civilCanAdmin(w,id,site)&&canEnter(w,r,w.realm.cities[site].controller,id)):null;}
export function dispatchNPC(w:World,id:string,to:string,prepared?:ReturnType<typeof planRoute>){const s=w.mobility?.residences[id];if(!s||s.journey||s.site===to)return;const route=prepared??npcRoute(w,id,to);if(!route)return;if(route.route[0]!==s.site||route.route.at(-1)!==to)throw new Error('赴任路线已失效');s.journey={route:route.route,durations:route.durations,leg:0,elapsed:0,started:w.day};}
export function mobilityReason(w:World,c:MobilityCommand):string{
 if(!w.mobility||!w.realm||!w.characterId||w.campaign?.status!=='active')return '此局没有行旅事务';
 if(c.action==='plan')return activityQuote(w,c).reason;
 const id=actor(w),r=playerRealm(w),army=c.action==='leave-army'?commandArmy(w):w.realm.armies.find(a=>a.realm===r&&(c.action!=='command'||c.army===undefined||a.id===c.army));
  if(c.action==='cancel-command'){const a=w.realm.armies.find(a=>a.id===c.army);if(!a)return '军队不存在';const grant=authorityGrant(w,id,'command',{realm:a.realm,site:a.location,army:a});return !grant.allowed?grant.reason:!w.mobility.pendingCommanders?.[c.army]?'没有待赴任将领':'';}
  if(c.action==='dismiss-command'){const a=w.realm.armies.find(a=>a.id===c.army);if(!a)return '军队不存在';const grant=authorityGrant(w,id,'command',{realm:a.realm,site:a.location,army:a});return !grant.allowed?grant.reason:armyCampaign(w,a)?'须先结束战役委任':a.journey?'行军途中不能交接':!armyCommander(w,a)?'将领席位已空缺':'';}
 if(c.action==='stance')return w.mobility.captivity?'被拘押期间不能传令':!commandArmy(w)?'须亲自领军':!['balanced','attack','guard'].includes(c.stance)?'未知军令':'';
 if(c.action==='ransom')return !w.mobility.captivity?'当前未被拘押':w.people[0].coins<80?'赎返需个人钱 80':'';
 if(w.mobility.captivity)return '被拘押期间不能处理此事';
  if(c.action==='command'&&army){const grant=authorityGrant(w,id,'command',{realm:r,site:army.location,army});if(!grant.allowed)return grant.reason;if(armyCampaign(w,army))return '须先结束战役委任';if(commandArmy(w,c.person)||Object.entries(w.mobility.pendingCommanders??{}).some(([key,v])=>v.person===c.person&&Number(key)!==army.id))return '此人已统领或正赴任其他军队';}
  if(c.action==='command'){if(w.diplomacy?.missions.some(m=>m.envoy===c.person))return '此人正在奉使';if(retinueBusy(w,c.person))return '此人已受幕府差遣';if(!army)return '须有本国军队';if(!relationshipPersonById[c.person]||allegianceRealm(w,c.person)!==r||!isAlive(w,c.person))return '须选择本国在世将领';if(lifeOf(w,c.person)?.illness?.severity===3)return '重病期间不能接掌军队';if(w.mobility.appointments[c.person]||w.duties?.task?.officer===c.person&&w.duties.task.phase!=='closed'||activeActivity(w,c.person)||w.mobility.activities.some(a=>a.delegate===c.person&&!['done','cancelled'].includes(a.phase))||w.service?.tasks.some(t=>t.phase!=='closed'&&(t.officer===c.person||t.helper===c.person)))return '先结束本人事务或差事';if((ageAt(w,c.person)??0)<16)return '统帅须成年';if(presentAt(w,c.person,army.location)&&!army.journey)return '';const destination=army.journey?.route.at(-1)??army.location,route=c.person===w.characterId?personalRoute(w,destination):npcRoute(w,c.person,destination);if(c.person===w.characterId&&(w.people[0].journey||departureReason(w)))return '先完成当前行程或职务';if(c.person!==w.characterId&&w.mobility.residences[c.person]?.journey)return '此人正在途中';return !route&&!presentAt(w,c.person,destination)?'将领到军营的道路不可通行':c.person===w.characterId&&route&&'food'in route&&w.people[0].food<route.food?'赴任行粮不足':'';}
 if(c.action==='leave-army')return !commandArmy(w)?'你未亲自领军':army?.journey?'行军期间不能卸任':army&&w.realm.cities[army.location].controller!==r?'须回到己方控制的驻地才能卸任':'';
 const a=w.mobility.activities.find(a=>a.id===c.id&&a.actor===id);if(!a||['done','cancelled'].includes(a.phase))return '事务已结束';
 if(c.action==='cancel')return '';
 const executor=a.delegate??id;
 if(lifeOf(w,executor)?.illness?.severity===3)return '重病期间无法办理';
 if(!presentAt(w,executor,a.site)||a.target&&!presentAt(w,a.target,a.site))return '参加者尚未全部到场';
 if(c.action==='begin')return a.phase==='ready'?'':'尚不能开始';
 return a.phase!=='decision'?'尚无待决事项':!['measured','decisive'].includes(c.choice??'')?'请选择处置方式':'';
}
export function actMobility(w:World,c:MobilityCommand){
 const reason=mobilityReason(w,c);if(reason)throw new Error(reason);const s=w.mobility!,id=actor(w),r=playerRealm(w),p=w.people[0];
  if(c.action==='dismiss-command'){const a=w.realm!.armies.find(a=>a.id===c.army)!,leader=armyCommander(w,a);if(s.armyCommanders)delete s.armyCommanders[c.army];if(w.realm!.armies.find(v=>v.realm===a.realm)===a)delete s.commanders[a.realm];if(leader===w.characterId)p.journey=null;else if(leader&&s.residences[leader])s.residences[leader].journey=null;log(w,'第 '+c.army+' 军将领已交接卸任。');return;}
  if(c.action==='cancel-command'){const pending=s.pendingCommanders![c.army];delete s.pendingCommanders![c.army];log(w,politicalName(pending.person)+'的统帅赴任令已撤销。');return;}
 if(c.action==='stance'){s.stance=c.stance;log(w,'传令三军：'+({balanced:'稳步交战',attack:'奋勇进击',guard:'结阵固守'})[c.stance]);return;}
 if(c.action==='ransom'){p.coins-=80;const prison=s.captivity!;s.captivity=null;p.location=prison.site;log(w,'支付赎金 80 钱，获释。请依当前通行条件安排返国。');return;}
  if(c.action==='command'){const a=w.realm!.armies.find(a=>a.realm===r&&(c.army===undefined||a.id===c.army))!;if(presentAt(w,c.person,a.location)&&!a.journey)installCommander(w,a,c.person,c.army===undefined);else{const destination=a.journey?.route.at(-1)??a.location;s.pendingCommanders??={};s.pendingCommanders[a.id!]={person:c.person,ordered:w.day};if(c.person===w.characterId&&p.location!==destination){const route=personalRoute(w,destination)!;p.food-=route.food;p.journey={route:route.route,durations:route.durations,leg:0,elapsed:0,started:w.day};}else if(c.person!==w.characterId)dispatchNPC(w,c.person,destination);log(w,politicalName(c.person)+'受命赴第 '+a.id+' 军，抵营后接掌。');}return;}
 if(c.action==='leave-army'){const a=commandArmy(w);if(a&&s.armyCommanders)delete s.armyCommanders[a.id!];if(s.commanders[r]===id)delete s.commanders[r];p.journey=null;log(w,'卸任随军统帅，军队仍可接受战略命令。');return;}
 if(c.action==='plan'){
  const q=activityQuote(w,c),d=activities[c.kind],targetRoute=c.target?npcRoute(w,c.target,c.site):null,delegateRoute=c.delegate?npcRoute(w,c.delegate,c.site):null;
  const a:Activity={id:s.nextId++,actor:id,kind:c.kind,site:c.site,target:c.target??null,delegate:c.delegate??null,created:w.day,deadline:w.day+Math.max(q.days,targetRoute?.days??0,delegateRoute?.days??0)+d.days+30,started:null,due:null,phase:'travel',result:'',choice:null};
  s.activities=s.activities.filter(a=>!['done','cancelled'].includes(a.phase)).concat(s.activities.filter(a=>['done','cancelled'].includes(a.phase)).slice(-29),a);p.coins-=q.cost;
  s.cooldowns[id+'|'+c.kind+'|'+(c.target??c.site)]=w.day+90;
  if(c.target){s.appointments[c.target]={site:c.site,until:a.deadline};dispatchNPC(w,c.target,c.site);}
  if(c.delegate)dispatchNPC(w,c.delegate,c.site);else if(p.location!==c.site){const route=personalRoute(w,c.site)!;p.food-=route.food;p.journey={route:route.route,durations:route.durations,leg:0,elapsed:0,started:w.day};}
  if(presentAt(w,c.delegate??id,c.site)&&(!c.target||presentAt(w,c.target,c.site)))a.phase='ready';
  log(w,(c.delegate?'派'+politicalName(c.delegate):'你')+'前往'+siteById[c.site].name+'，安排'+d.name+'。');return;
 }
 const a=s.activities.find(a=>a.id===c.id)!;
 if(c.action==='cancel'){end(w,a,'cancelled','事务取消，已付筹办费用不退。');return;}
 if(c.action==='begin'){a.phase='working';a.started=w.day;a.due=w.day+activities[a.kind].days;log(w,activities[a.kind].name+'开始，需驻留 '+activities[a.kind].days+' 日。');return;}
 resolve(w,a,c.choice!);
}
function end(w:World,a:Activity,phase:'done'|'cancelled',text:string){a.phase=phase;a.result=text;if(a.target)delete w.mobility!.appointments[a.target];w.mobility!.reported++;log(w,activities[a.kind].name+'：'+text);}
function resolve(w:World,a:Activity,choice:'measured'|'decisive'){
 a.choice=choice;const id=a.delegate??a.actor,r=relationshipPersonById[id]?.realm??playerRealm(w),g=governmentOf(w,r)!,city=w.realm!.cities[a.site],personal=!a.delegate,bold=choice==='decisive',score=attributes(w,id),gain=bold?12:8,result:string[]=[];
 if(a.target){const compatible=traitsFor(w,a.target).includes('wary')&&bold?-4:traitsFor(w,id).includes('generous')&&a.kind==='banquet'?4:0,delta=gain+compatible;changeRelationOpinion(w,id,a.target,delta);changeRelationOpinion(w,a.target,id,delta);result.push('双方交往 +'+delta);
 if(a.kind==='banquet'&&relationOpinion(w,id,a.target)>=40&&w.relationships){const key=bondKey(id,a.target),existing=w.relationships.bonds[key];if(!existing){w.relationships.bonds[key]={a:id,b:a.target,kind:'friend',since:w.day};result.push('结为朋友');}}
 }
 if(a.kind==='tour'&&city.order<100||a.kind==='training'&&w.realm!.armies.some(b=>b.realm===r&&b.location===a.site&&!b.journey&&(b.morale<100||b.troops<600))){const n=personal?6:3;awardDeed(w,r,id,'activity:'+a.id,n,activities[a.kind].name+'完成');result.push(politicalName(id)+'功绩 +'+n);}
 if(a.kind==='tour'){const delta=Math.min(100-city.order,(bold?9:6)+Math.floor(score.stewardship/5));city.order+=delta;city.prosperity=clamp(city.prosperity+(bold?1:3));result.push('秩序 +'+delta+'，繁荣 +'+(bold?1:3));if(bold&&g.court){g.court.corruption=clamp(g.court.corruption-3);result.push('积弊 −3');}}
 if(a.kind==='succession'&&w.service&&a.target){const career=w.service.careers[a.target];if(career){career.economy=Math.min(100000,career.economy+1);result.push('继任者治理历练 +1');}}
 if(a.kind==='training'){const army=w.realm!.armies.find(b=>b.realm===r&&b.location===a.site&&!b.journey);if(army){const morale=Math.min(100-army.morale,gain),troops=Math.max(0,Math.min(600-army.troops,bold?30:15,city.population-100));army.morale+=morale;army.troops+=troops;city.population-=troops;result.push('士气 +'+morale+'，兵员 +'+Math.max(0,troops));}else result.push('驻军已离开，未产生军队增益');}
 if(['family','succession'].includes(a.kind)){for(const person of [id,a.target].filter((v):v is string=>!!v)){const before=w.families?.prestige[person]??0;awardPrestige(w,person,'friendship');const gain=(w.families?.prestige[person]??0)-before;if(gain)result.push(politicalName(person)+'家族威望 +'+gain);}}
 if(personal&&w.social){const delta=bold?6:-8;const before=w.social.stress;w.social.stress=clamp(before+delta);const actual=w.social.stress-before;result.push('压力 '+(actual>0?'+':'')+actual);}
 end(w,a,'done',result.join('；'));
}
export function advanceMobility(w:World){
 const s=w.mobility;if(!s||!w.realm||s.lastDay>=w.day)return;s.lastDay=w.day;
 const investigations=new Map(w.economy?.investigations.filter(q=>q.phase==='investigating').map(q=>[q.inspector,q])??[]);
 const offices=officeHierarchy(w),heldOffices=new Map<string,typeof offices>(),executives=Object.fromEntries(realms.map(r=>[r,governingExecutives(w,r)]));
 for(const office of offices)if(office.holder&&office.active){const list=heldOffices.get(office.holder)??[];list.push(office);heldOffices.set(office.holder,list);}
 for(const [id,location] of Object.entries(s.residences)){
  if(w.diplomacy?.missions.some(m=>m.envoy===id)||id===w.characterId||!isAlive(w,id)||commandArmy(w,id)||lifeOf(w,id)?.illness?.severity===3)continue;
  const j=location.journey;if(j){const realm=allegianceRealm(w,id);if(realm&&(!civilCanAdmin(w,id,j.route[j.leg+1])||!canEnter(w,realm,w.realm.cities[j.route[j.leg+1]].controller,id))){location.journey=null;continue;}j.elapsed++;if(j.elapsed>=j.durations[j.leg]){location.site=j.route[++j.leg];j.elapsed=0;if(j.leg===j.durations.length)location.journey=null;}continue;}
  if(Object.values(s.pendingCommanders??{}).some(v=>v.person===id))continue;
  const posting=w.realm.offices.find(o=>o.candidate===id);if(posting&&posting.due<=w.day+1){dispatchNPC(w,id,posting.site);continue;}
  const appointment=s.appointments[id];if(appointment&&appointment.until>=w.day){dispatchNPC(w,id,appointment.site);continue;}
  const investigation=investigations.get(id);if(investigation){const key=investigation.account;const destination=key.startsWith('central:')?capital(investigation.realm as RealmId):localSeatSite(w,key.split('|')[1],investigation.realm as RealmId);if(destination)dispatchNPC(w,id,destination);continue;}
  const task=w.service?.tasks.find(t=>t.phase!=='closed'&&(t.officer===id||t.helper===id));const duty=w.duties?.task;
  const pendingActivity=s.activities.find(a=>a.delegate===id&&!['done','cancelled'].includes(a.phase));
  const held=heldOffices.get(id)??[],office=held.find(n=>n.kind==='city'&&n.site===location.site)??held.find(n=>n.kind==='city')??held.find(n=>n.kind==='office');const realm=allegianceRealm(w,id);
  const destination=retinueDestination(w,id)??pendingActivity?.site??(task&&['ready','working','incident','aid'].includes(task.phase)?task.site:undefined)??(duty&&duty.phase!=='closed'&&duty.officer===id?'tianshui':undefined)??(office?.site??office?.seatSite??(office&&realm?capital(realm):undefined))??(realm&&executives[realm].includes(id)?capital(realm):characterById[id]?.home);
  if(destination&&!commandArmy(w,id))dispatchNPC(w,id,destination);
  }
  for(const [key,pending] of Object.entries(s.pendingCommanders??{})){const army=w.realm.armies.find(a=>a.id===Number(key)),id=pending.person;if(!army||!isAlive(w,id)||allegianceRealm(w,id)!==army.realm||armyCampaign(w,army)){delete s.pendingCommanders![Number(key)];log(w,politicalName(id)+'的统帅赴任令因身份、军队或委任变化而结束。');continue;}if(!army.journey&&presentAt(w,id,army.location)){installCommander(w,army,id);continue;}const destination=army.journey?.route.at(-1)??army.location;if(id===w.characterId){if(!w.people[0].journey&&w.people[0].location!==destination){const route=personalRoute(w,destination);if(route&&w.people[0].food>=route.food){w.people[0].food-=route.food;w.people[0].journey={route:route.route,durations:route.durations,leg:0,elapsed:0,started:w.day};}}}else if(!s.residences[id]?.journey)dispatchNPC(w,id,destination);}
 for(const a of s.activities){if(['done','cancelled'].includes(a.phase))continue;
  if(a.actor!==w.characterId||!isAlive(w,a.actor)||a.target&&!isAlive(w,a.target)||a.delegate&&!isAlive(w,a.delegate)){end(w,a,'cancelled','参加者身份变化或去世，事务中止。');continue;}
  const r=playerRealm(w),controller=w.realm.cities[a.site].controller;
  if(w.day>a.deadline||!isAdventurer(w,a.actor)&&controller!=='frontier'&&atWar(w,r,controller)){end(w,a,'cancelled',w.day>a.deadline?'超过约定期限，事务未成。':'战事阻断，事务中止。');continue;}
  const arrived=presentAt(w,a.delegate??a.actor,a.site)&&(!a.target||presentAt(w,a.target,a.site));
  if(a.phase==='travel'&&arrived)a.phase='ready';
  if(a.delegate&&a.phase==='ready'){a.phase='working';a.started=w.day;a.due=w.day+activities[a.kind].days;}
  if(a.phase==='working'){if(lifeOf(w,a.delegate??a.actor)?.illness?.severity===3||a.target&&lifeOf(w,a.target)?.illness?.severity===3){end(w,a,'cancelled','参加者重病，事务中止。');continue;}if(!arrived){end(w,a,'cancelled','参加者离场，事务中止。');continue;}if(w.day>=a.due!){a.phase='decision';if(a.delegate)resolve(w,a,traitsFor(w,a.delegate).includes('wary')?'measured':'decisive');}}
 }
}
/** Call after the army simulation so an attached ruler cannot move independently. */
export function syncArmyTravel(w:World){
 const s=w.mobility;if(!s||!w.realm)return;
 const assignments=[...realms.filter(r=>s.commanders[r]).map(realm=>({id:s.commanders[realm]!,realm,army:w.realm!.armies.find(a=>a.realm===realm&&a.troops>0),key:undefined as number|undefined})),...Object.entries(s.armyCommanders??{}).map(([key,id])=>({id,realm:allegianceRealm(w,id)??playerRealm(w),army:w.realm!.armies.find(a=>a.id===Number(key)&&a.troops>0),key:Number(key)}))];
 for(const {id,realm,army,key} of assignments){const self=id===w.characterId,clear=()=>{if(key!==undefined)delete s.armyCommanders![key];else delete s.commanders[realm];};
  if(!isAlive(w,id)||army&&allegianceRealm(w,id)!==army.realm){clear();if(s.residences[id])s.residences[id].journey=null;if(self)w.people[0].journey=null;continue;}
  if(!army){if(!self&&s.residences[id])s.residences[id].journey=null;if(self){w.people[0].journey=null;const at=w.people[0].location,enemy=w.realm.cities[at].controller,life=lifeOf(w,id);if(life){life.health=clamp(life.health-20,1);life.illness={kind:'wasting',since:w.day,severity:1};}if(enemy!=='frontier'&&enemy!==realm)s.captivity={captor:enemy,site:at,since:w.day};s.reported++;log(w,'所部溃散，统帅负伤'+(s.captivity?'并被拘押，可筹赎返。':'，已脱离军队。'));}clear();continue;}
  if(self){w.people[0].location=army.location;w.people[0].journey=army.journey?structuredClone(army.journey):null;}else if(s.residences[id]){s.residences[id].site=army.location;s.residences[id].journey=army.journey?structuredClone(army.journey):null;}
 }
}
export function remainingTravel(w:World,id:string){const r=w.mobility?.residences[id];return id===w.characterId?remainingDays(w.people[0]):r?.journey?r.journey.durations.slice(r.journey.leg).reduce((n,d)=>n+d,0)-r.journey.elapsed:0;}

export function activityResultPreview(w:World,id:number,choice:'measured'|'decisive'){const copy=structuredClone(w),a=copy.mobility?.activities.find(a=>a.id===id);if(!a||a.phase!=='decision')return '';resolve(copy,a,choice);return a.result;}
