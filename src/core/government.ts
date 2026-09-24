import {clanStanding} from './clans';
import {nominationReason,type NominateCommand,type PublicHeirs} from './publicSuccession';
import {isAlive} from './lifeState';
import { validRegency,allegianceBonus,syncRelationships } from './relationships';
import { courtBonus, syncCourt, type CourtState } from './court';
import { characterById,historicalCharacters } from '../data/characters';
import { governmentDefinitions,reformDefinitions,reformIds,successionDefinitions,politicalFigures,dynastyNames,type GovernmentType,type ReformId,type SuccessionId } from '../data/governments';
import { getScript } from '../data/scripts';
import { siteById,polities } from '../data/scenario';
import type { World,Polity } from './types';
import type { RealmId } from './realm';
export type Contract='balanced'|'tax'|'levy';
export interface GovernmentTask {kind:'government'|'law'|'succession';target:string;started:number;progress:number;required:number;sponsor:string}
export interface Government {
 heirs?:PublicHeirs;court?:CourtState;type:GovernmentType;dynasty:string;regimeId:string;ruler:string;executives:string[];legitimacy:number;support:number;
 merit:Record<string,number>;herd:number;camp:string;lastCamp:number;contracts:Record<string,Contract>;
 laws:ReformId[];stages:SuccessionId[];task:GovernmentTask|null;cooldowns:Record<string,number>;
}
export interface RegimeVersion {name?:string;kind?:'sandbox'|'inheritance';id:string;realm:RealmId;dynasty:string;ruler:string;from:number;until:number|null;predecessor:string|null;source:string|null;cities:string[]}
export interface GovernmentState {version:1;since:number;lastMonthly:number;realms:Record<RealmId,Government>;regimes:RegimeVersion[];history:{day:number;realm:RealmId;kind:string;target:string;text:string}[]}
export type GovernmentCommand=NominateCommand|{type:'government';action:'adopt';government:GovernmentType}|{type:'government';action:'law';law:ReformId}|{type:'government';action:'succession';stage:SuccessionId}|{type:'government';action:'council'|'appraise'|'herd'|'cancel'}|{type:'government';action:'camp';site:string}|{type:'government';action:'contract';site:string;contract:Contract};
const realmIds:RealmId[]=['liang','east','west'];
const cap=(n:number,max=100)=>Math.max(0,Math.min(max,n));
const capital:Record<RealmId,string>={liang:'jiankang',east:'ye',west:'changan'};
const initialRulers:Record<RealmId,string>={liang:'xiao-yan',east:'yuan-shanjian',west:'yuan-baoju'};
const initialExecutives:Record<RealmId,string[]>={liang:['xiao-yan'],east:['gao-huan','gao-cheng'],west:['yuwen-tai']};
export const currentRealm=(w:World)=>characterById[w.characterId!].polity as RealmId;
export function newGovernments(w:World):GovernmentState{
 const day=w.day;const make=(r:RealmId):Government=>({type:'meritocratic',dynasty:r,regimeId:r+'-0',ruler:initialRulers[r],executives:[...initialExecutives[r]],legitimacy:65,support:65,merit:Object.fromEntries(historicalCharacters.filter(c=>c.polity===r).map(c=>[c.id,20])),herd:0,camp:capital[r],lastCamp:0,contracts:{},laws:reformIds.filter(id=>reformDefinitions[id].realm===r&&reformDefinitions[id].initial),stages:[],task:null,cooldowns:{}});const realms={liang:make('liang'),east:make('east'),west:make('west')};
 return {version:1,since:day,lastMonthly:Math.floor(day/30)*30,realms,regimes:realmIds.map(r=>({id:r+'-0',realm:r,dynasty:r,ruler:initialRulers[r],from:day,until:null,predecessor:null,source:null,cities:Object.keys(w.realm!.cities).filter(id=>w.realm!.cities[id].owner===r)})),history:[]};
}
export function governmentOf(w:World,r=currentRealm(w)){return w.realm?.governments?.realms[r];}
export function regimeName(w:World|undefined,r:Polity){return r==='frontier'?polities.frontier.name:(w?.realm?.governments?.regimes.find(v=>v.id===w.realm?.governments?.realms[r]?.regimeId)?.name??dynastyNames[w?.realm?.governments?.realms[r]?.dynasty??r]);}
export const politicalName=(id:string)=>characterById[id]?.name??politicalFigures[id]?.name??'未录人物';
export function governingExecutives(w:World,r=currentRealm(w)):string[]{const g=governmentOf(w,r);const c=validRegency(w,r);return (c&&c.origin!=='scenario'?[c.controller]:g?.executives??initialExecutives[r]).filter(id=>isAlive(w,id));}
export function governmentExecutive(w:World){if(!w.characterId)return false;return governingExecutives(w).includes(w.characterId);}
export function governingAuthority(w:World,r=currentRealm(w)){return governingExecutives(w,r)[0];}
export function governmentYear(w:World,day=w.day){return new Date(Date.UTC(getScript(w.scriptId).year,0,1+day)).getUTCFullYear();}
export function governmentBonus(w:World,r:Polity,site?:string){
 const g=r==='frontier'?undefined:governmentOf(w,r);if(!g)return {tax:0,pay:0,attack:0};const base=governmentDefinitions[g.type];
 let tax:number=base.tax,pay:number=base.pay,attack:number=base.attack;
 if(g.type==='celestial'&&g.legitimacy<25)tax=-20;
 if(g.type==='feudal'){const contract=site?g.contracts[site]:'balanced';if(contract==='tax')tax+=20;if(contract==='levy')tax-=15;const levy=Object.entries(g.contracts).filter(([id,c])=>c==='levy'&&w.realm!.cities[id].owner===r&&w.realm!.cities[id].controller===r).length;attack+=Math.min(20,levy*5);}
 if(g.type==='tribal')attack+=g.support>=70?15:g.support<40?-15:0;
 if(g.laws.includes('west-militia')){pay-=15;attack+=10;}if(g.laws.includes('west-offices')||g.laws.includes('east-assessment'))tax+=10;
 const court=courtBonus(w,r as RealmId);return {tax:tax+court.tax,pay:pay+court.pay,attack:attack+court.attack+allegianceBonus(w,r as RealmId)};
}
export function appointmentReason(w:World,candidate:string,site:string){
 if(!isAlive(w,candidate))return '不能任命已故人物';const g=governmentOf(w);if(!g)return '';if(['meritocratic','celestial','khanate'].includes(g.type)&&(g.merit[candidate]??0)<20-(clanStanding(w,candidate)?.merit??0))return `候选人功绩需达到 ${20-(clanStanding(w,candidate)?.merit??0)}${clanStanding(w,candidate)?.elite?'（已计世族荫望）':''}，可先考课或治理城市`;
 const incumbent=w.realm!.cities[site].governor;
 if(g.type==='feudal'&&incumbent&&characterById[incumbent].family!==characterById[candidate]?.family)return '封建领有不得直接改授异族：需先改革政体';
 return '';
}
export function meritAccess(w:World,kind:'office'|'military'){
 const g=governmentOf(w);return !!g&&['meritocratic','celestial','khanate'].includes(g.type)&&(g.merit[w.characterId!]??0)>=(kind==='office'?20-(clanStanding(w,w.characterId!)?.merit??0):40);
}
export function governmentMusterReason(w:World,r=currentRealm(w)){const g=governmentOf(w,r);if(!g)return '';if(g.type==='nomadic'&&g.herd<100)return '游牧动员需畜群 100';if(g.type==='khanate'&&g.herd<50)return '宫帐动员需畜群 50';if(g.type==='tribal'&&g.support<50)return '部众支持需达到 50';return '';}
export function spendGovernmentMuster(w:World,r=currentRealm(w)){const g=governmentOf(w,r);if(!g)return;if(g.type==='nomadic')g.herd-=100;if(g.type==='khanate')g.herd-=50;if(g.type==='tribal')g.support-=10;}
const averageOrder=(w:World,r:RealmId)=>{const cities=Object.values(w.realm!.cities).filter(c=>c.owner===r&&c.controller===r);return cities.length?cities.reduce((n,c)=>n+c.order,0)/cities.length:0;};
function ownsCapital(w:World,r:RealmId){const c=w.realm!.cities[capital[r]];return c.owner===r&&c.controller===r;}
function nativeCities(w:World,r:RealmId){return Object.keys(w.realm!.cities).filter(id=>w.realm!.cities[id].owner===r&&w.realm!.cities[id].controller===r);}
export function governmentTaskPause(w:World,r:RealmId){const g=governmentOf(w,r);if(!g?.task)return '';if(['celestial','meritocratic','khanate'].includes(g.type)&&g.court?.phase==='chaos')return '朝廷危局，改革暂停';if(w.realm!.war&&[w.realm!.war.attacker,w.realm!.war.defender].includes(r))return '战争期间暂停';if(!ownsCapital(w,r))return '失去都城控制，暂停';if(g.support<40)return '支持低于 40，需议政争取';if(averageOrder(w,r)<40)return '平均秩序低于 40，需先赈济';if(g.task.kind==='government'){const target=g.task.target;if(target==='celestial'&&(g.legitimacy<80||!hasHegemony(w,r)))return '天命或统一程度不足，暂停';if((target==='nomadic'||target==='khanate')&&(!validCamp(w,r,g.camp)||g.herd<(target==='nomadic'?200:100)))return '失去驻牧地，暂停';}return '';}
function hasHegemony(w:World,r:RealmId){const cities=Object.values(w.realm!.cities).filter(c=>c.owner!=='frontier');return nativeCities(w,r).length>=Math.ceil(cities.length*.6);}
export function validCamp(w:World,r:RealmId,site:string){const c=w.realm!.cities[site];return !!c&&c.owner===r&&c.controller===r&&siteById[site].lat>=38;}
export function governmentReason(w:World,c:GovernmentCommand):string{
 if(!w.realm||!w.characterId||w.campaign?.status!=='active')return '仅历史沙盒可用';const g=governmentOf(w),s=w.realm,r=currentRealm(w);if(!g)return '此档尚未完成政体迁移，请重新读取';
 if(s.event)return '先处理待决事务';if(c.action==='nominate')return nominationReason(w,c,governingAuthority(w));const t=s.treasuries[r];
 if(c.action==='appraise')return (g.cooldowns[w.characterId+'|appraise']??0)>w.day?'考课每 30 日一次':w.people[0].coins<20?'考课需个人钱 20':(g.merit[w.characterId]??0)>=100?'功绩已满':'';
 if(c.action==='council')return (g.cooldowns['council']??0)>w.day?'议政每 30 日一次':s.influence<15||t.coins<40?'议政需影响力 15、公款 40':'';
 // A house may support a claimant without pretending that the old emperor is the recipient of abdication.
 if(c.action!=='succession'&&!governmentExecutive(w))return '需要实际执政权';
 if(c.action==='cancel')return g.task?'':'没有正在推进的改革';
 if(c.action==='camp')return !Object.hasOwn(siteById,c.site)||!validCamp(w,r,c.site)?'需本国控制的北方城市（纬度至少 38°，玩法驻牧范围）':g.camp===c.site?'已驻此地':w.day<g.lastCamp?'迁营冷却中':t.coins<50||t.grain<60?'迁营需公款 50、公粮 60':'';
 if(c.action==='herd')return !validCamp(w,r,g.camp)?'先在本国北方城市设立驻牧地':t.coins<60?'购入畜群需公款 60':g.herd>=1000?'畜群已达容量':'';
 if(c.action==='contract')return g.type!=='feudal'?'仅封建制可议契约':!Object.hasOwn(s.cities,c.site)||s.cities[c.site].owner!==r||s.cities[c.site].controller!==r?'需本国控制的本国城市':!['balanced','tax','levy'].includes(c.contract)?'无效契约':(g.contracts[c.site]??'balanced')===c.contract?'契约未变化':s.influence<10?'修改契约需影响力 10':(g.cooldowns['contract|'+c.site]??0)>w.day?'契约每 90 日可修改一次':'';
 if(g.task||g.court?.founding)return '已有改革或更替议程，请先完成或取消';
 if(s.war&&[s.war.attacker,s.war.defender].includes(r))return '战争期间不能启动改革或受禅';
 if(!ownsCapital(w,r))return '需要控制本国都城';
 if(g.support<55||g.legitimacy<40)return '需要支持 55、合法性 40，可通过议政改善';
 let cost=160;
 if(c.action==='adopt'){
 if(!Object.hasOwn(governmentDefinitions,c.government))return '未知政体';if(c.government===g.type)return '已采用该政体';
 if(c.government==='celestial'&&(!hasHegemony(w,r)||g.legitimacy<80))return '天朝制需控制六成已录非边疆城市、合法性 80';
 if(['nomadic','khanate'].includes(c.government)&&(!validCamp(w,r,g.camp)||g.herd<(c.government==='nomadic'?200:100)))return '需本国北方驻牧地，游牧畜群 200／宫帐 100';
 }else if(c.action==='law'){
 if(!Object.hasOwn(reformDefinitions,c.law))return '未知改革';const d=reformDefinitions[c.law];cost=d.cost;
 if(d.realm!==r)return '此改革属于其他历史政权';if(g.laws.includes(c.law))return '此制度已施行';if(governmentYear(w)<d.year)return `历史路线在 ${d.year} 年起开放`;if(!(d.requires as readonly string[]).every(id=>g.laws.includes(id as ReformId)))return '先完成前置制度';if(!['meritocratic','celestial','khanate'].includes(g.type))return '需官僚类政体';
 }else if(c.action==='succession'){
 if(!Object.hasOwn(successionDefinitions,c.stage))return '未知历史沿革';const d=successionDefinitions[c.stage];cost=200;
 if(![d.ruler,...d.executives].every(id=>isAlive(w,id)))return '此沿革的继位人或执政者已经去世';if(d.realm!==r)return '只能参与所属政权的更替';if(g.stages.includes(c.stage))return '该沿革已经完成';if(governmentYear(w)<d.year)return `历史路线在 ${d.year} 年起开放`;
 if(d.previous&&!g.stages.includes(d.previous))return '先完成前一阶段的执政交替';if(d.prerequisite&&!g.laws.includes(d.prerequisite))return '先完成对应制度改革';if(g.dynasty!==r)return '本政权已经改朝换代';
 if(!['meritocratic','celestial','khanate'].includes(g.type))return '历史受禅路线需官僚类政体';
 }else return '未知制度行动';
 return s.influence<40||t.coins<cost?`需要影响力 40、公款 ${cost}`:'';
}
function log(w:World,r:RealmId,kind:string,target:string,text:string){const s=w.realm!.governments!;s.history.push({day:w.day,realm:r,kind,target,text});s.history=s.history.slice(-80);w.chronicle.push({day:w.day,person:'player',text});w.chronicle=w.chronicle.slice(-100);}
export function actGovernment(w:World,c:GovernmentCommand){
 const reason=governmentReason(w,c);if(reason)throw new Error(reason);const s=w.realm!,r=currentRealm(w),g=governmentOf(w)!,t=s.treasuries[r],id=w.characterId!;
 if(c.action==='nominate'){const heirs=g.heirs??={ruler:null,executive:null,dynasty:null};heirs[c.office]=c.candidate;if(c.office==='ruler')heirs.dynasty=c.candidate?c.name?.trim()||null:null;if(c.candidate)s.influence-=20;log(w,r,'council',c.office,c.candidate?politicalName(c.candidate)+'被定为'+(c.office==='ruler'?'君位继承人':'执政继任人')+'。':'撤销指定继承，依亲属关系承继。');return;}
 if(c.action==='appraise'){w.people[0].coins-=20;g.merit[id]=cap((g.merit[id]??0)+10);g.cooldowns[id+'|appraise']=w.day+30;log(w,r,'appraise',id,politicalName(id)+'完成考课，功绩 +10（玩法结算）。');return;}
 if(c.action==='council'){s.influence-=15;t.coins-=40;g.support=cap(g.support+12);g.legitimacy=cap(g.legitimacy+5);g.cooldowns.council=w.day+30;log(w,r,'council',g.type,'议政争取支持：支持 +12、合法性 +5。');return;}
 if(c.action==='cancel'){log(w,r,'cancel',g.task!.target,'撤回议程，已付成本不退；此前阻力和支持变化保留。');g.task=null;return;}
 if(c.action==='camp'){t.coins-=50;t.grain-=60;g.camp=c.site;g.lastCamp=w.day+90;log(w,r,'camp',c.site,'宫帐／驻牧地迁至'+siteById[c.site].name+'；城市本体未移动。');return;}
 if(c.action==='herd'){t.coins-=60;g.herd=cap(g.herd+100,1000);return;}
 if(c.action==='contract'){s.influence-=10;g.contracts[c.site]=c.contract;g.cooldowns['contract|'+c.site]=w.day+90;g.support=cap(g.support-3);log(w,r,'contract',c.site,siteById[c.site].name+'契约改为'+({balanced:'均衡',tax:'税赋',levy:'军役'})[c.contract]+'。');return;}
 let kind:GovernmentTask['kind'],target:string,required:number,cost:number;
 if(c.action==='adopt'){kind='government';target=c.government;required=180;cost=160;}
 else if(c.action==='law'){kind='law';target=c.law;required=reformDefinitions[c.law].days;cost=reformDefinitions[c.law].cost;}
 else if(c.action==='succession'){kind='succession';target=c.stage;required=90;cost=200;}else throw new Error('无效制度行动');
 s.influence-=40;t.coins-=cost;g.support-=12;g.task={kind,target,required,progress:0,started:w.day,sponsor:id};log(w,r,'start',target,'开始推进'+taskName(g.task)+'，需 '+required+' 个有效实施日；支持 −12。');
}
export function taskName(task:GovernmentTask){return task.kind==='government'?governmentDefinitions[task.target as GovernmentType].name:task.kind==='law'?reformDefinitions[task.target as ReformId].name:successionDefinitions[task.target as SuccessionId].name;}
function completeTask(w:World,r:RealmId){
 const s=w.realm!,g=governmentOf(w,r)!,task=g.task!;g.task=null;
 if(task.kind==='government'){g.type=task.target as GovernmentType;g.legitimacy=cap(g.legitimacy-5);}
 if(task.kind==='law')g.laws.push(task.target as ReformId);
 if(task.kind==='succession'){
 const d=successionDefinitions[task.target as SuccessionId];delete g.heirs;g.stages.push(task.target as SuccessionId);g.ruler=d.ruler;g.executives=[...d.executives];
 // Withdraw old authority and pending appointments; a new court requires fresh investiture.
 s.offices=s.offices.filter(o=>characterById[o.candidate].polity!==r);
 for(const city of Object.values(s.cities))if(city.owner===r){city.governor=null;city.order=cap(city.order-10);}
 if(d.nextDynasty){const state=s.governments!,old=state.regimes.find(v=>v.id===g.regimeId)!;old.until=w.day;g.dynasty=d.nextDynasty;g.regimeId=r+'-'+g.dynasty;state.regimes.push({id:g.regimeId,realm:r,dynasty:g.dynasty,ruler:g.ruler,from:w.day,until:null,predecessor:old.id,source:d.source.url,cities:nativeCities(w,r)});g.legitimacy=50;g.support=55;s.treasuries[r].coins=Math.floor(s.treasuries[r].coins*.85);const army=s.armies.find(a=>a.realm===r);if(army)army.morale=cap(army.morale-20);}
 if(r===currentRealm(w)){s.mandate=governmentExecutive(w);w.holdings.governedCities=[];}
 }
 syncRelationships(w);syncCourt(w,r);
 log(w,r,'complete',task.target,taskName(task)+'已完成。'+(task.kind==='succession'?'旧任命撤销，军务重新授权；个人家业保留。':''));
}
export function advanceGovernments(w:World){
 const s=w.realm?.governments;if(!s)return;
 for(const r of realmIds){const g=s.realms[r];if(g.task?.kind==='succession'){const d=successionDefinitions[g.task.target as SuccessionId];if(![d.ruler,...d.executives].every(id=>isAlive(w,id))){log(w,r,'cancel',g.task.target,'继位人或执政者去世，沿革议程终止。');g.task=null;}}if(g.task&&!governmentTaskPause(w,r)){g.task.progress++;if(g.task.progress>=g.task.required)completeTask(w,r);}}
 if(w.day%30!==0||s.lastMonthly>=w.day)return;s.lastMonthly=w.day;
 for(const r of realmIds){const g=s.realms[r],t=w.realm!.treasuries[r],order=averageOrder(w,r);
 g.legitimacy=cap(g.legitimacy+(ownsCapital(w,r)&&order>=60&&t.coins>0&&t.grain>0?1:-3));g.support=cap(g.support+(order>=60?1:-3));
 const active=new Set(Object.values(w.realm!.cities).filter(c=>c.owner===r&&c.controller===r&&c.governor&&c.order>=60).map(c=>c.governor!));
 for(const id of active)g.merit[id]=cap((g.merit[id]??0)+(g.laws.includes('east-assessment')?4:2));
 if(g.type==='nomadic'||g.type==='khanate'){const winter=Math.floor(w.day/30)%12>=9||Math.floor(w.day/30)%12<2;const loss=validCamp(w,r,g.camp)?winter?20:0:40;g.herd=cap(g.herd+(loss?-loss:15),1000);if(g.herd<50)g.support=cap(g.support-4);}
 if(g.type==='celestial'&&g.legitimacy<15){g.type='meritocratic';if(g.task?.kind==='government'&&g.task.target==='meritocratic')g.task=null;log(w,r,'crisis','meritocratic','天命失序，'+regimeName(w,r)+'退为贤能制；已有领土不自动分裂。');}
 }
}
export function politicalTitle(w:World|undefined,id:string){
 if(w&&!isAlive(w,id))return '已故 · '+(characterById[id]?.title??politicalName(id));
 const c=characterById[id];if(!c)return politicalFigures[id]?'政权沿革人物':'未录人物';
 const g=w?.realm?.governments?.realms[c.polity];if(!g||!w?.life?.successions.some(e=>e.realm===c.polity)&&!g.stages.length&&g.dynasty===c.polity&&(!validRegency(w!,c.polity)||validRegency(w!,c.polity)?.origin==='scenario'))return c.title;
 if(g.ruler===id)return regimeName(w,c.polity)+'君主'+(governingExecutives(w!,c.polity).includes(id)?' · 实际执政':'');
 if(governingExecutives(w!,c.polity).includes(id))return regimeName(w,c.polity)+'实际执政';
 return '546 年身份：'+c.title+'（非当前朝廷职权）';
}
