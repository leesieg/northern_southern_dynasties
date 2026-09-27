import {armyCommander} from './mobility';
import {advanceMilitaryAI} from './militaryAI';
import {authorityGrant} from './authority';
import {takeCasualties,battleStage} from './militaryAftermath';
import {warArmySide,warCitySide,playerCommandsArmy,civilCanAdmin,civilWar,settleCivilWar,advanceCivilPolitics} from './civilWars';
import {annexPolity,advanceAnnexations} from './polityLifecycle';
import {armyCampaign} from './militaryCampaigns';
import {roadEncounters} from './battlefield';
import {activeWars,ensureWars,bilateralWar,selectedWar,peaceQuote,advanceReparations,type PeaceTerms,type War} from './wars';
import {ensureArmyOrganization,reconcileRegiments,armyPayFactor,armyCombatFactor,consumeArmyFood} from './armyOrganization';
import {completeLocalAppointment,advanceLocal,localEfficiency,localCanAppoint,countyTerritory} from './localAdministration';
import {advanceArmyLogistics,returnArmyConvoy,distributeGarrisonFood,type ArmyConvoy} from './armyLogistics';
import {enactPoliticalAction} from './politicalActions';
import {allegianceRealm,officeName,publicOfficeReason,appointmentAuthorityReason} from './officeEligibility';
import {regionalEconomy} from '../data/regionalEconomy';
import {civilianFood,settleLocalGrain,grainCapacity,ensurePopulation} from './population';
import {centralTax,collectFiscal,distributeFiscal,payFiscalOperations,localBalance,spendLocal} from './treasury';
import {clanStanding} from './clans';
import {recommendationBonus} from './retinue';
import {attributes} from './social';
import { foreignWarReason,diplomaticWar,canEnter } from './diplomacy';
import { courtSalary } from './court';
import { governmentExecutive,governingAuthority,governmentBonus,appointmentReason,meritAccess,governmentMusterReason,spendGovernmentMuster,governmentOf,regimeName } from './government';
import type { GovernmentState } from './government';
import { lifestyleBonuses } from './lifestyle';
import { emptyLifestyleBonus } from '../data/lifestyles';
import { characterById } from '../data/characters';
import { roads,siteById,sites } from '../data/scenario';
import { acceptance } from './social';
import { planRoute } from './world';
import type { World,Journey,Polity } from './types';
export const realms=['liang','east','west'] as const;
export type RealmId=typeof realms[number];
export type Tax='light'|'normal'|'heavy';
export interface Province {owner:Polity;controller:Polity;governor:string|null;population:number;grain:number;irrigation:number;order:number;prosperity:number;tax:Tax}
export interface Treasury {coins:number;grain:number;lastIncome:number;lastExpense:number;lastFood:number}
export interface Army {withdrawalUntil?:number;trainingStarted?:number;trainingUntil?:number;id?:number;payer?:string;arrears?:number;foodRemainder?:number;regiments?:import('./armyOrganization').Regiment[];convoy?:ArmyConvoy|null;realm:RealmId;location:string;troops:number;morale:number;supply:number;journey:Journey|null;siege:number}
export interface RealmState {
 annexed?:Partial<Record<RealmId,import('./polityLifecycle').Annexation>>;
 traffic?:import('./roadCapacity').RoadTraffic;nextArmyId?:number;armyDebts?:{realm:RealmId;account:string;coins:number}[];
 local?:import('./localAdministration').LocalAdministration;
 population?:import('./population').PopulationState;
 fiscal?:import('./treasury').FiscalState;
 version:1;personalInfluence?:Record<string,number>;governments?:GovernmentState;cities:Record<string,Province>;treasuries:Record<RealmId,Treasury>;influence:number;mandate:boolean;
 offices:{site:string;candidate:string;due:number;territory?:string;realm?:RealmId;issuer?:string;acting?:boolean;concurrent?:boolean;issued?:number}[];armies:Army[];
 reparations?:import('./wars').Reparation[];wars?:War[];nextWarId?:number;war:War|null;
 truces:Record<string,number>;event:{kind:EventKind;site:string;day:number}|null;lastEvent:number;
 ledger:{day:number;realm:RealmId;income:number;expense:number;food:number}[];
}
export type RealmCommand={type:'realm';action:'tax';site:string;tax:Tax}|{type:'realm';action:'relief';site:string}|{type:'realm';action:'appoint';site:string;candidate:string}|{type:'realm';action:'petition';site:string}|{type:'realm';action:'mandate'}|{type:'realm';action:'muster'|'disband'|'peace';army?:number;war?:number;terms?:PeaceTerms;}|{type:'realm';action:'march'|'war';site:string;army?:number;goal?:War['goal']}|{type:'realm';action:'event';choice:'fund'|'decline'};
export const eventDefinitions={
 flood:{title:'水患来报',body:'治下水渠受损，地方请求拨粮赈济。',cost:'公粮 60',effect:'赈济：秩序 +12；搁置：秩序 -10'},
 market:{title:'商旅请修道路',body:'商旅愿留驻集市，请求公款修补通路。',cost:'公款 50',effect:'资助：繁荣 +10；搁置：繁荣 -4'},
 dispute:{title:'乡里田界争议',body:'田界争执影响收成，派员调解需要经费。',cost:'公款 30',effect:'调解：秩序 +10；搁置：秩序 -8'},
 levy:{title:'军户请求抚恤',body:'军户请求粮食援助，地方等待处理。',cost:'公粮 40',effect:'抚恤：秩序 +8；搁置：秩序 -6'},
 harvest:{title:'秋藏整备',body:'粮食入仓在即，整修仓廪可以减少损耗。',cost:'公款 40',effect:'整备：公粮 +90；搁置：无额外收益'},
 corruption:{title:'账目疑案',body:'地方账目出现出入，彻查需要支出。',cost:'公款 35',effect:'彻查：影响力 +10、秩序 +5；搁置：公款 -20'},
};
export type EventKind=keyof typeof eventDefinitions;
const clamp=(v:number,min=0,max=1_000_000)=>Math.max(min,Math.min(max,v));
export const playerRealm=(w:World):RealmId=>allegianceRealm(w,w.characterId!)??characterById[w.characterId!].polity as RealmId;
export const executive=governmentExecutive;
export const authority=(id:RealmId)=>id==='liang'?'xiao-yan':id==='east'?'gao-huan':'yuwen-tai';
export const capital=(id:RealmId)=>id==='liang'?'jiankang':id==='east'?'ye':'changan';
export function newRealm(w:World):RealmState {
 const cities=Object.fromEntries(sites.map(s=>[s.id,{owner:s.polity,controller:s.polity,governor:s.id===w.people[0].home?w.characterId!:null,population:regionalEconomy(s.id).initialPopulation,grain:0,irrigation:0,order:70,prosperity:50,tax:'normal' as Tax}]));
 return {version:1,cities,treasuries:Object.fromEntries(realms.map(id=>[id,{coins:600,grain:1000,lastIncome:0,lastExpense:0,lastFood:0}])) as Record<RealmId,Treasury>,influence:50,mandate:executive(w)||characterById[w.characterId!].role==='commander',offices:[],armies:[],war:null,truces:{},event:null,lastEvent:0,ledger:[]};
}
export function syncGovernance(w:World){if(w.realm)w.holdings.governedCities=Object.entries(w.realm.cities).filter(([,c])=>c.governor===w.characterId&&c.controller===playerRealm(w)).map(([id])=>id);}
export const armyLifestyle=(w:World,realm:RealmId)=>w.realm?.mandate&&w.characterId&&playerRealm(w)===realm?lifestyleBonuses(w):emptyLifestyleBonus();
const commandPower=(w:World,r:RealmId,army?:Army)=>{const id=army?armyCommander(w,army):w.mobility?.commanders[r];const war=civilWar(w,r);if(army&&war&&id&&(war.civil!.supporters.includes(id)!==(warArmySide(w,war,army)==='attack')))return 0;return id?Math.min(20,attributes(w,id).martial):0;};
const tactic=(w:World,r:RealmId,a?:Army)=>(!a||playerCommandsArmy(w,a))&&(a?armyCommander(w,a):w.mobility?.commanders[r])===w.characterId?w.mobility?.stance??'balanced':'balanced';
const offense=(w:World,r:RealmId,a?:Army)=>tactic(w,r,a)==='attack'?1.2:tactic(w,r,a)==='guard'?.8:1;
const exposure=(w:World,r:RealmId,a?:Army)=>tactic(w,r,a)==='attack'?1.15:tactic(w,r,a)==='guard'?.8:1;
const armyBonuses=(w:World,a:Army)=>playerCommandsArmy(w,a)?armyLifestyle(w,a.realm):emptyLifestyleBonus();
export const armyDailyFood=(w:World,a:Army)=>Math.ceil(a.troops/60*(100-armyBonuses(w,a).supply)/100);
export const armyMonthlyPay=(w:World,a:Army)=>Math.ceil(a.troops/10*armyPayFactor(a)*(100-armyBonuses(w,a).armyExpense+governmentBonus(w,a.realm).pay)/100);
export function cityOperatingExpense(w:World,id:string){const c=w.realm!.cities[id];return Math.ceil(c.population/900)+(c.governor?4:0)+Object.values(w.realm!.annexed??{}).filter(a=>a?.sites.includes(id)&&w.day-a.day<360).length*8;}
export function cityYield(w:World,id:string){
 const c=w.realm!.cities[id],b=w.holdings.cities[id]?.levels,rate=c.tax==='light'?0.7:c.tax==='heavy'?1.4:1,region=regionalEconomy(id);
 const bonus=c.governor?lifestyleBonuses(w,c.governor):emptyLifestyleBonus();
 const labor=Math.max(.5,1-(w.service?.tasks.filter(t=>t.site===id&&t.phase==='working').length??0)*.08);
 const links=roads.filter(e=>e.from===id||e.to===id),access=links.length?.5+.5*links.filter(e=>{const other=w.realm!.cities[e.from===id?e.to:e.from].controller;return other===c.controller||c.controller!=='frontier'&&canEnter(w,c.controller,other);}).length/links.length:.5;
 const management=c.governor?Math.max(-10,Math.min(20,(attributes(w,c.governor).stewardship-8)*2)):0;
 const capacity=region.capacity*(1+c.irrigation*.15),effective=Math.min(c.population,capacity)+Math.max(0,c.population-capacity)*.25;
 const grain=Math.floor(effective/100*region.fertility*(1+c.irrigation*.1)*labor*(.75+c.order/400)*(100+bonus.grain+management)/100);
 return {coins:Math.floor((c.population/600+c.population/600*region.trade*access+(b?.market??0)*8*access)*rate*c.order/100*(.5+c.prosperity/100)*(100+bonus.tax+management+localEfficiency(w,id)+governmentBonus(w,c.controller,id).tax)/100),grain,expense:cityOperatingExpense(w,id),food:civilianFood(w,id),labor,capacity,region,management,access};
}
export function realmForecast(w:World,id:RealmId,yields?:ReadonlyMap<string,ReturnType<typeof cityYield>>){let income=0,expense=0,food=0;for(const [site,c] of Object.entries(w.realm!.cities))if(c.controller===id){const y=yields?.get(site)??cityYield(w,site);income+=centralTax(w,site,y.coins);expense+=y.expense;food+=y.grain-y.food;}for(const a of w.realm!.armies.filter(a=>a.realm===id)){if(!a.payer||a.payer==='central:'+id)expense+=armyMonthlyPay(w,a);food-=armyDailyFood(w,a)*30;}expense+=courtSalary(w,id);return {income,expense,food};}
function log(w:World,text:string){w.chronicle.push({day:w.day,person:'player',text});w.chronicle=w.chronicle.slice(-100);}
const connected=(w:World,id:string,r:RealmId)=>roads.some(e=>e.from===id&&w.realm!.cities[e.to].controller===r||e.to===id&&w.realm!.cities[e.from].controller===r);
export function realmReason(w:World,c:RealmCommand):string {
 const s=w.realm;if(!s||!w.characterId||w.campaign?.status!=='active')return '仅历史沙盒可用';
 const r=playerRealm(w),t=s.treasuries[r],a=s.armies.find(a=>a.realm===r&&(!('army'in c)||c.army===undefined||a.id===c.army)),city='site'in c?s.cities[c.site]:null;
 if('site'in c&&!Object.hasOwn(s.cities,c.site))return '无效城市';
 if(c.action==='event'){if(!s.event)return '没有待处理事件';if(!['fund','decline'].includes(c.choice))return '无效选项';if(c.choice==='fund'){const k=s.event.kind;if((k==='flood'||k==='levy')?t.grain<(k==='flood'?60:40):t.coins<(k==='market'?50:k==='dispute'?30:k==='harvest'?40:35))return '公库资源不足，可选择搁置';}return '';}
 if(s.event)return '先处理待决事务';
 switch(c.action){
 case 'tax':if(!civilCanAdmin(w,w.characterId,c.site))return '失去实际控制';if(!['light','normal','heavy'].includes(c.tax))return '无效税制';return city!.governor!==w.characterId||city!.controller!==r?'需要本城治理权':city!.tax===c.tax?'已是现行税制':'';
 case 'relief':if(!civilCanAdmin(w,w.characterId,c.site))return '失去实际控制';return city!.governor!==w.characterId||city!.controller!==r?'需要本城治理权':city!.grain+(c.site===capital(r)?t.grain:0)<50?'需本城公粮 50（都城可动用中央储粮）':'';
 case 'appoint':return (localCanAppoint(w,w.characterId!,countyTerritory(c.site),r)?'':appointmentAuthorityReason(w,r))||(allegianceRealm(w,c.candidate)!==r?'需当前效忠本国的人物':publicOfficeReason(w,c.candidate))||(city!.owner!==r||city!.controller!==r?'仅可任命本国控制的本国城市':s.offices.some(o=>o.site===c.site&&(!o.territory||o.territory===countyTerritory(c.site)))?'任命正在送达':city!.governor===c.candidate?'此人已在任':s.influence<20?'需影响力 20':appointmentReason(w,c.candidate,c.site));
 case 'petition':if(governmentOf(w)?.type==='feudal'&&appointmentReason(w,w.characterId!,c.site))return appointmentReason(w,w.characterId!,c.site);return city!.owner!==r||city!.controller!==r?'只能请任本国控制的本国城市':city!.governor===w.characterId?'你已在任':s.offices.some(o=>o.site===c.site&&(!o.territory||o.territory===countyTerritory(c.site)))?'任命正在送达':s.influence<40?'需影响力 40':!executive(w)&&!meritAccess(w,'office')&&acceptance(w,governingAuthority(w,r)).reduce((n,v)=>n+v.value,0)+(clanStanding(w,w.characterId!)?.petition??0)+recommendationBonus(w,w.characterId!)<60?`需执政者接受度 60 或官僚功绩 ${20-(clanStanding(w,w.characterId!)?.merit??0)}`:'';
 case 'mandate':return s.mandate?'已有军务授权':s.influence<40?'需影响力 40':!executive(w)&&!meritAccess(w,'military')&&acceptance(w,governingAuthority(w,r)).reduce((n,v)=>n+v.value,0)+(clanStanding(w,w.characterId!)?.petition??0)+recommendationBonus(w,w.characterId!)<60?'需执政者接受度 60 或官僚功绩 40':'';
 case 'muster':{if(civilWar(w,r))return '内战期间请通过驻地军队编制征募';const home=s.cities[w.people[0].home]?.controller===r?w.people[0].home:Object.keys(s.cities).find(id=>s.cities[id].controller===r)!;return !s.mandate?'需要军务授权':s.armies.filter(a=>a.realm===r).length>=16?'本国军队编制已满':!Object.values(s.cities).some(c=>c.controller===r)?'已无控制城市':!executive(w)&&s.cities[home].governor!==w.characterId?'地方动员须有本城治理权，或由朝廷委派征募':s.cities[home].population<700?'本城人口不足以动员 600 人':(executive(w)?t.coins:localBalance(w,home))<120||t.grain<120?'动员需要'+(executive(w)?'中央':'本城')+'公款 120、公粮 120':governmentMusterReason(w);}
 case 'disband':if(a&&!playerCommandsArmy(w,a))return '不能指挥内战对方军队';if(a&&armyCampaign(w,a))return '须先撤销战役委任';return !a?'尚未动员':!authorityGrant(w,w.characterId,'command',{realm:r,site:a.location,army:a}).allowed?'没有本军指挥权':(a.arrears??0)>0?'须结清军饷后遣散':a.journey?'抵达后方可遣散':s.cities[a.location].controller!==r?'请回到己方控制城市':'';
 case 'war':if(c.goal!==undefined&&!['territory','reparations','tributary','annexation'].includes(c.goal))return '无效战争目标';return foreignWarReason(w,city!.owner as RealmId)||(!s.mandate?'需要军务授权':bilateralWar(w,r,city!.owner as RealmId)?'已与该国交战':city!.owner===r||city!.owner==='frontier'?'请选择其他三国政权的城市':city!.owner!==city!.controller?'目标处于占领中':!connected(w,c.site,r)?'只能对相邻控制城市发起边境争夺':(s.truces[[r,city!.owner].sort().join('|')]??0)>w.day?'停战协议仍有效':s.influence<(c.goal==='annexation'?120:40)?'需影响力 '+(c.goal==='annexation'?120:40):'');
 case 'march':{if(a&&!playerCommandsArmy(w,a))return '不能指挥内战对方军队';if(a&&armyCampaign(w,a))return '请先撤销战役委任，避免改写统帅目标';if(!a)return '请先动员';if(!authorityGrant(w,w.characterId,'command',{realm:r,site:a.location,army:a}).allowed)return '没有本军指挥权';if(a.withdrawalUntil)return '军队正在依和约撤离';if((a.trainingUntil??0)>w.day)return '新兵尚在集训，余 '+(a.trainingUntil!-w.day)+' 日';if(a.journey)return '军队正在行军';if(a.location===c.site)return '军队已在此地';const p=planRoute(a.location,c.site,id=>canEnter(w,r,s.cities[id].controller,undefined,true));return p?'':'道路经过未获通行权的第三方';}
 case 'peace':if(selectedWar(w,r,c.war)?.civil)return peaceQuote(w,selectedWar(w,r,c.war)!,r,c.terms??'white').reason;return !executive(w)?'须由实际执政者议定国家和约':!s.mandate?'需要军务授权':!selectedWar(w,r,c.war)?'请在对应战事中议和':peaceQuote(w,selectedWar(w,r,c.war)!,r,c.terms??'white').reason;
 default:return '无效政务行动';
 }
}
export function actRealm(w:World,c:RealmCommand){
 const reason=realmReason(w,c);if(reason)throw new Error(reason);const s=w.realm!,r=playerRealm(w),t=s.treasuries[r];
 switch(c.action){
 case 'tax':enactPoliticalAction(w,r,'tax');s.cities[c.site].tax=c.tax;log(w,siteById[c.site].name+'税制调整为'+({light:'轻税',normal:'常税',heavy:'重税'})[c.tax]+'。');break;
 case 'relief':{const local=Math.min(s.cities[c.site].grain,50);s.cities[c.site].grain-=local;t.grain-=50-local;s.cities[c.site].order=clamp(s.cities[c.site].order+15,0,100);log(w,'向'+siteById[c.site].name+'拨粮 50，秩序 +15。');break;}
 case 'appoint':case 'petition':{enactPoliticalAction(w,r,'appointment');const candidate=c.action==='appoint'?c.candidate:w.characterId!;s.influence-=c.action==='appoint'?20:40;const g=governmentOf(w)!;if((g.merit[candidate]??0)<20){g.support=Math.max(0,g.support-10);s.cities[c.site].order=Math.max(0,s.cities[c.site].order-3);}const days=planRoute(capital(r),c.site)?.days??1;s.offices.push({site:c.site,candidate,due:w.day+days+7});log(w,'任命'+officeName(candidate)+'治理'+siteById[c.site].name+'，文书预计 '+(days+7)+' 日送达。');break;}
 case 'mandate':s.influence-=40;s.mandate=true;log(w,'获得本局军务授权，可以动员与发动边境争夺。');break;
 case 'muster':{enactPoliticalAction(w,r,'military');spendGovernmentMuster(w);const home=w.people[0].home,location=s.cities[home].controller===r?home:Object.keys(s.cities).find(id=>s.cities[id].controller===r)!;if(executive(w))t.coins-=120;else spendLocal(w,location,120,'地方动员');t.grain-=120;s.cities[location].population-=600;s.armies.push({realm:r,location,troops:600,morale:100,supply:120,journey:null,siege:0});const army=s.armies.at(-1)!;log(w,regimeName(w,r)+`动员 600 人，每 30 日军饷 ${armyMonthlyPay(w,army)} 钱，每日消耗军粮 ${armyDailyFood(w,army)}。`);break;}
 case 'disband':{if(w.mobility&&(!c.army||s.armies.find(a=>a.realm===r)?.id===c.army)){const leader=w.mobility.commanders[r];if(leader===w.characterId)w.people[0].journey=null;else if(leader&&w.mobility.residences[leader])w.mobility.residences[leader].journey=null;delete w.mobility.commanders[r];}const a=s.armies.find(a=>a.realm===r&&(c.army===undefined||a.id===c.army))!;const leader=w.mobility?.armyCommanders?.[a.id!];if(leader&&w.mobility){if(leader===w.characterId)w.people[0].journey=null;else if(w.mobility.residences[leader])w.mobility.residences[leader].journey=null;delete w.mobility.armyCommanders![a.id!];}s.cities[a.location].grain=Math.min(grainCapacity(w,a.location),s.cities[a.location].grain+a.supply);returnArmyConvoy(w,a);s.cities[a.location].population=Math.min(1_000_000,s.cities[a.location].population+a.troops);s.armies=s.armies.filter(other=>other!==a);log(w,'军队遣散，剩余随军粮食归还驻地粮仓（超出仓容损耗）；动员费用不退。');break;}
 case 'war':ensureWars(w);s.influence-=c.goal==='annexation'?120:40;s.wars!.push({id:s.nextWarId!++,goal:c.goal??'territory',demand:300,battles:0,attacker:r,defender:s.cities[c.site].owner as RealmId,target:c.site,started:w.day,score:0});s.war=s.wars![0];diplomaticWar(w,r,s.cities[c.site].owner as RealmId);log(w,regimeName(w,r)+'发起对'+siteById[c.site].name+'的边境争夺。');break;
 case 'march':{const a=s.armies.find(a=>a.realm===r&&(c.army===undefined||a.id===c.army))!;march(a,c.site,w.day,w);log(w,regimeName(w,r)+'军前往'+siteById[c.site].name+'，依道路逐日行军。');break;}
 case 'peace':settleWar(w,selectedWar(w,r,c.war)!,c.terms??'white',r);break;
 case 'event':resolveEvent(w,c.choice);break;
 }
 ensureArmyOrganization(w);
}
function march(a:Army,target:string,day:number,w:World){const p=planRoute(a.location,target,id=>canEnter(w,a.realm,w.realm!.cities[id].controller,undefined,true));if(p)a.journey={route:p.route,durations:p.durations,leg:0,elapsed:0,started:day};a.siege=0;}
export function settleWar(w:World,war:War,terms:PeaceTerms='white',actor:RealmId=war.attacker){
 const s=w.realm!;ensureWars(w);
 if(!s.wars!.includes(war))return;
 if(war.civil){const why=peaceQuote(w,war,actor,terms).reason;if(why)throw new Error(why);settleCivilWar(w,war,terms);return;}
 if(terms!=='white'&&war.goal==='annexation'&&(terms==='yield'?actor!==war.attacker:actor===war.attacker)){annexPolity(w,war.attacker,war.defender);syncGovernance(w);return;}
 const q=peaceQuote(w,war,actor,terms),target=s.cities[war.target],won=q.takesLand&&target.owner===war.defender&&target.controller===war.attacker;
 if(won){target.owner=war.attacker;target.governor=null;log(w,siteById[war.target].name+'依据议和转归'+regimeName(w,war.attacker)+'。');}else log(w,terms==='white'?'双方议定白和平，无新增割地赔款。':'双方接受议和条件。');
 if(q.coins){const from=s.treasuries[q.loser],to=s.treasuries[q.beneficiary],paid=Math.min(from.coins,q.coins,1_000_000-to.coins);from.coins-=paid;to.coins+=paid;if(paid<q.coins)(s.reparations??=[]).push({war:war.id!,from:q.loser,to:q.beneficiary,remaining:q.coins-paid,instalment:50,next:w.day+30});}
 if(q.tributary&&w.diplomacy)w.diplomacy.subjects[q.loser]=q.beneficiary;
 // Only bilateral occupation belongs to this settlement. Third-party control survives.
 for(const city of Object.values(s.cities))if(city.owner===war.attacker&&city.controller===war.defender||city.owner===war.defender&&city.controller===war.attacker)city.controller=city.owner;
 s.truces[[war.attacker,war.defender].sort().join('|')]=w.day+360;
 s.wars=s.wars!.filter(v=>v!==war);s.war=s.wars[0]??null;
 for(const a of s.armies){if(![war.attacker,war.defender].includes(a.realm))continue;
 const foreign=s.cities[a.location].controller;
 if(foreign!==a.realm&&[war.attacker,war.defender].includes(foreign as RealmId)){
 const paths=Object.keys(s.cities).filter(id=>s.cities[id].controller===a.realm).map(id=>planRoute(a.location,id,node=>[war.attacker,war.defender].includes(s.cities[node].controller as RealmId))).filter(p=>p!==null).sort((a,b)=>a.days-b.days);
 const path=paths[0];a.siege=0;a.journey=path?{route:path.route,durations:path.durations,leg:0,elapsed:0,started:w.day}:null;
 a.withdrawalUntil=w.day+(path?.days??30)+30;
 }else if(a.journey&&a.journey.route.slice(a.journey.leg+1).some(id=>!canEnter(w,a.realm,s.cities[id].controller,undefined,true))){a.journey=null;a.siege=0;}
 }
 syncGovernance(w);
}
function resolveEvent(w:World,choice:'fund'|'decline'){
 const s=w.realm!,event=s.event!,city=s.cities[event.site],t=s.treasuries[playerRealm(w)],k=event.kind;
 if(choice==='fund'){
 if(k==='flood'||k==='levy'){t.grain-=k==='flood'?60:40;city.order=clamp(city.order+(k==='flood'?12:8),0,100);}
 else {t.coins-=k==='market'?50:k==='dispute'?30:k==='harvest'?40:35;if(k==='market')city.prosperity=clamp(city.prosperity+10,0,100);if(k==='dispute')city.order=clamp(city.order+10,0,100);if(k==='harvest')t.grain=clamp(t.grain+90);if(k==='corruption'){s.influence=clamp(s.influence+10,0,999);city.order=clamp(city.order+5,0,100);}}
 }else if(k==='market')city.prosperity=clamp(city.prosperity-4,0,100);else if(k==='corruption')t.coins=clamp(t.coins-20);else if(k!=='harvest')city.order=clamp(city.order-(k==='flood'?10:k==='dispute'?8:6),0,100);
 log(w,eventDefinitions[k].title+'：'+(choice==='fund'?'已拨付处理。':'暂缓处理，后果已结算。'));s.event=null;
}
export function advanceRealm(w:World){
 const s=w.realm;if(!s)return;ensurePopulation(w);ensureArmyOrganization(w);ensureWars(w);advanceReparations(w);advanceAnnexations(w);
 advanceLocal(w);
 s.offices=s.offices.filter(o=>o.due>w.day||!completeLocalAppointment(w,o));syncGovernance(w);
 if(w.day%30===0){
 for(const r of realms){if(s.annexed?.[r])continue;const yields=new Map(Object.entries(s.cities).filter(([,c])=>c.controller===r).map(([id])=>[id,cityYield(w,id)]));const t=s.treasuries[r],f=realmForecast(w,r,yields);t.lastIncome=f.income;t.lastExpense=f.expense;t.lastFood=f.food;collectFiscal(w,r,yields);payFiscalOperations(w,r);distributeFiscal(w,r);
 // Army consumption is daily, so only civilian production/consumption is booked here.
 settleLocalGrain(w,r,id=>yields.get(id)!.grain);
 s.ledger.push({day:w.day,realm:r,...f});
 for(const city of Object.values(s.cities))if(city.controller===r){city.order=clamp(city.order+(city.tax==='light'?4:city.tax==='heavy'?-6:1)-(t.coins===0?6:0),0,100);city.prosperity=clamp(city.prosperity+(city.order>=60?1:-2),0,100);city.population=clamp(city.population+(city.order>=70?Math.max(1,Math.floor(city.population*.002)):city.order<30?-Math.max(1,Math.floor(city.population*.003)):0),100,1_000_000);}
 if(r!==playerRealm(w))for(const city of Object.values(s.cities))if(city.controller===r)city.tax=city.order<45?'light':t.coins<100?'heavy':'normal';
 }
 s.ledger=s.ledger.slice(-36);s.influence=clamp(s.influence+5,0,999);

 }
 advanceMilitaryAI(w);
 for(const war of activeWars(w).filter(v=>v.civil)){const c=war.civil!,r=war.attacker,playerRebel=c.supporters.includes(w.characterId!);for(const aiSide of (playerRealm(w)!==r?['attack','defend']:playerRebel?['defend']:['attack']) as ('attack'|'defend')[]){const target=aiSide==='defend'?c.base:war.target;
 if(!s.armies.some(a=>warArmySide(w,war,a)===aiSide)&&aiSide==='defend'&&s.treasuries[r].coins>=120&&s.treasuries[r].grain>=120&&s.armies.length<48){const site=Object.keys(s.cities).find(id=>s.cities[id].controller===r&&!c.cities.includes(id)&&s.cities[id].population>=700);if(site){s.treasuries[r].coins-=120;s.treasuries[r].grain-=120;s.cities[site].population-=600;s.armies.push({realm:r,location:site,troops:600,morale:80,supply:120,journey:null,siege:0,trainingStarted:w.day,trainingUntil:w.day+30});ensureArmyOrganization(w);}}
 for(const a of s.armies.filter(a=>warArmySide(w,war,a)===aiSide))if(!a.journey&&!a.withdrawalUntil&&(a.trainingUntil??0)<=w.day&&a.location!==target)march(a,target,w.day,w);
 }}
 distributeGarrisonFood(w);
 const meetings=roadEncounters(w),engaged=new Set(meetings.flat());
 for(const a of s.armies){
 if((a.trainingUntil??0)>w.day&&(a.arrears||a.supply<=0))a.trainingUntil!++;
 if((a.trainingUntil??0)>w.day&&!a.arrears&&a.supply>0)for(const u of a.regiments??[])u.experience=Math.min(u.service==='standing'?60:30,u.experience+1);
 advanceArmyLogistics(w,a);
 const need=consumeArmyFood(w,a,100-armyBonuses(w,a).supply);

 if(a.supply<need){const lost=takeCasualties(w,a,Math.ceil(a.troops*.02));if(a.realm===playerRealm(w))log(w,`第 ${a.id} 军断粮：所需 ${need}，实有 ${a.supply}，减员 ${lost} 人，士气 −4。`);a.morale=clamp(a.morale-4,0,100);a.supply=0;}else{a.supply-=need;a.morale=clamp(a.morale+((a.arrears??0)>0?-1:1),0,100);}
 if(a.withdrawalUntil&&(a.location===a.journey?.route.at(-1)||!a.journey&&s.cities[a.location].controller===a.realm||w.day>a.withdrawalUntil))delete a.withdrawalUntil;
 if(a.journey&&!a.withdrawalUntil&&!canEnter(w,a.realm,s.cities[a.journey.route[a.journey.leg+1]].controller,undefined,true)){a.journey=null;a.siege=0;log(w,regimeName(w,a.realm)+'军借道许可失效，停止行军。');}
 if(a.journey&&a.journey.started<w.day){
 if(engaged.has(a))a.journey.started++;
 else{const j=a.journey;j.elapsed++;if(j.elapsed>=j.durations[j.leg]){a.location=j.route[++j.leg];j.elapsed=0;if(j.leg===j.durations.length)a.journey=null;}}
 }
 }
 for(const war of [...activeWars(w)]){for(const a of s.armies.filter(a=>warArmySide(w,war,a)==='attack'))for(const b of s.armies.filter(b=>warArmySide(w,war,b)==='defend')){
 if(a.troops>=100&&b.troops>=100&&!a.withdrawalUntil&&!b.withdrawalUntil&&(!a.journey&&!b.journey&&a.location===b.location||meetings.some(pair=>pair.includes(a)&&pair.includes(b)))){const stage=battleStage(w,a,b);const attack=Math.max(1,Math.round(Math.min(a.troops,siteById[a.location].terrain==='山地'?400:1200)*armyCombatFactor(a,'attack',siteById[a.location].terrain)/armyCombatFactor(b,'defence',siteById[b.location].terrain)*(.4+a.morale/100)*.08*(100+commandPower(w,a.realm,a)+armyBonuses(w,a).attack+governmentBonus(w,a.realm).attack)/100)),defend=Math.max(1,Math.round(Math.min(b.troops,siteById[b.location].terrain==='山地'?400:1200)*armyCombatFactor(b,'attack',siteById[b.location].terrain)/armyCombatFactor(a,'defence',siteById[a.location].terrain)*(.4+b.morale/100)*.08*(100+commandPower(w,b.realm,b)+armyBonuses(w,b).attack+governmentBonus(w,b.realm).attack)/100));stage.record.lossA+=takeCasualties(w,a,Math.round(defend*offense(w,b.realm,b)*exposure(w,a.realm,a)*stage.factor),b);stage.record.lossB+=takeCasualties(w,b,Math.round(attack*offense(w,a.realm,a)*exposure(w,b.realm,b)*stage.factor),a);a.morale=clamp(a.morale-3,0,100);b.morale=clamp(b.morale-3,0,100);reconcileRegiments(a);reconcileRegiments(b);if(a.troops<100||a.morale<10){takeCasualties(w,a,a.troops,b,true);war.battles=clamp((war.battles??0)-10,-25,25);log(w,'攻方野战军溃散。');}if(b.troops<100||b.morale<10){takeCasualties(w,b,b.troops,a,true);war.battles=clamp((war.battles??0)+10,-25,25);log(w,'守方野战军溃散。');}}}
 for(const army of s.armies.filter(a=>[war.attacker,war.defender].includes(a.realm)&&!a.withdrawalUntil)){const city=s.cities[army.location],side=warArmySide(w,war,army),opposite=side==='attack'?'defend':'attack';
 if(army.troops>=100&&!army.journey&&army.supply>0&&warCitySide(w,war,army.location)===opposite&&!s.armies.some(e=>warArmySide(w,war,e)===opposite&&e.troops>0&&e.location===army.location)){
 army.siege+=army.regiments?.some(u=>u.kind==='siege'&&u.troops>=50)?2:1;const required=Math.ceil((siteById[army.location].capital?40:20)*(1+(w.holdings.cities[army.location]?.levels.granary??0)*.1)*(100-armyBonuses(w,army).siege)/100);
 if(army.siege>=required){if(war.civil){if(side==='attack'){if(!war.civil.cities.includes(army.location))war.civil.cities.push(army.location);}else war.civil.cities=war.civil.cities.filter(id=>id!==army.location);}else city.controller=army.realm;city.order=clamp(city.order-20,0,100);army.siege=0;log(w,siteById[army.location].name+'被'+regimeName(w,army.realm)+'军占领，法理归属暂不变。');syncGovernance(w);}
 }else army.siege=0;}
 if(war.civil){war.score=clamp((war.civil.cities.includes(war.target)?40:0)+(war.civil.cities.includes(war.civil.base)?0:-40)+(war.battles??0),-100,100);continue;}
 const target=s.cities[war.target],others=Object.entries(s.cities).filter(([id])=>id!==war.target);war.score=clamp((target.controller===war.attacker?40:0)+(war.battles??0)+clamp(others.reduce((n,[,c])=>n+(c.owner===war.defender&&c.controller===war.attacker?5:c.owner===war.attacker&&c.controller===war.defender?-5:0),0),-25,25),-100,100);
 if(target.owner!==war.defender&&target.owner!==war.attacker)settleWar(w,war);
 }
 for(const a of s.armies){reconcileRegiments(a);if(a.troops<100){takeCasualties(w,a,a.troops,undefined,true);returnArmyConvoy(w,a);if(a.arrears){const debts=s.armyDebts??=[],account=a.payer??'central:'+a.realm,old=debts.find(d=>d.realm===a.realm&&d.account===account);if(old)old.coins+=a.arrears;else debts.push({realm:a.realm,account,coins:a.arrears});}}}s.armies=s.armies.filter(a=>a.troops>=100);advanceCivilPolitics(w);
 if(!s.event&&w.day-s.lastEvent>=90&&w.holdings.governedCities.length){const kinds=Object.keys(eventDefinitions) as EventKind[];s.event={kind:kinds[(Math.floor(w.day/90)-1)%kinds.length],site:w.holdings.governedCities[0],day:w.day};s.lastEvent=w.day;log(w,'收到待决事务：'+eventDefinitions[s.event.kind].title+'。');}
}
export function handoverOffice(w:World){if(w.realm){if(governmentOf(w)?.type==='feudal'){const former=w.social?.lineage.at(-2)?.id;if(former)for(const city of Object.values(w.realm.cities))if(city.governor===former&&city.owner===playerRealm(w)&&city.controller===playerRealm(w))city.governor=w.characterId!;}w.realm.mandate=executive(w)||(!(governmentOf(w)?.stages.length)&&characterById[w.characterId!].role==='commander');w.realm.event=null;syncGovernance(w);}}
