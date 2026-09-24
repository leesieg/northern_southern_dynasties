import {clanStanding} from './clans';
import {recommendationBonus} from './retinue';
import {attributes} from './social';
import { foreignWarReason,diplomaticWar,canEnter } from './diplomacy';
import { courtSalary,payCourtSalary } from './court';
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
export interface Province {owner:Polity;controller:Polity;governor:string|null;households:number;order:number;prosperity:number;tax:Tax}
export interface Treasury {coins:number;grain:number;lastIncome:number;lastExpense:number;lastFood:number}
export interface Army {realm:RealmId;location:string;troops:number;morale:number;supply:number;journey:Journey|null;siege:number}
export interface RealmState {
 version:1;personalInfluence?:Record<string,number>;governments?:GovernmentState;cities:Record<string,Province>;treasuries:Record<RealmId,Treasury>;influence:number;mandate:boolean;
 offices:{site:string;candidate:string;due:number}[];armies:Army[];
 war:{attacker:RealmId;defender:RealmId;target:string;started:number;score:number}|null;
 truces:Record<string,number>;event:{kind:EventKind;site:string;day:number}|null;lastEvent:number;
 ledger:{day:number;realm:RealmId;income:number;expense:number;food:number}[];
}
export type RealmCommand={type:'realm';action:'tax';site:string;tax:Tax}|{type:'realm';action:'relief';site:string}|{type:'realm';action:'appoint';site:string;candidate:string}|{type:'realm';action:'petition';site:string}|{type:'realm';action:'mandate'}|{type:'realm';action:'muster'|'disband'|'peace';}|{type:'realm';action:'march'|'war';site:string}|{type:'realm';action:'event';choice:'fund'|'decline'};
export const eventDefinitions={
 flood:{title:'水患来报',body:'治下水渠受损，地方请求拨粮赈济。此为模拟事件。',cost:'公粮 60',effect:'赈济：秩序 +12；搁置：秩序 -10'},
 market:{title:'商旅请修道路',body:'商旅愿留驻集市，请求公款修补通路。',cost:'公款 50',effect:'资助：繁荣 +10；搁置：繁荣 -4'},
 dispute:{title:'乡里田界争议',body:'田界争执影响收成，派员调解需要经费。',cost:'公款 30',effect:'调解：秩序 +10；搁置：秩序 -8'},
 levy:{title:'军户请求抚恤',body:'军户请求粮食援助，地方等待处理。',cost:'公粮 40',effect:'抚恤：秩序 +8；搁置：秩序 -6'},
 harvest:{title:'秋藏整备',body:'粮食入仓在即，整修仓廪可以减少损耗。',cost:'公款 40',effect:'整备：公粮 +90；搁置：无额外收益'},
 corruption:{title:'账目疑案',body:'地方账目出现出入，彻查需要支出。',cost:'公款 35',effect:'彻查：影响力 +10、秩序 +5；搁置：公款 -20'},
};
export type EventKind=keyof typeof eventDefinitions;
const clamp=(v:number,min=0,max=1_000_000)=>Math.max(min,Math.min(max,v));
export const playerRealm=(w:World):RealmId=>characterById[w.characterId!].polity as RealmId;
export const executive=governmentExecutive;
export const authority=(id:RealmId)=>id==='liang'?'xiao-yan':id==='east'?'gao-huan':'yuwen-tai';
export const capital=(id:RealmId)=>id==='liang'?'jiankang':id==='east'?'ye':'changan';
export function newRealm(w:World):RealmState {
 const cities=Object.fromEntries(sites.map(s=>[s.id,{owner:s.polity,controller:s.polity,governor:s.id===w.people[0].home?w.characterId!:null,households:s.capital?1600:s.rank==='county'?300:700,order:70,prosperity:50,tax:'normal' as Tax}]));
 return {version:1,cities,treasuries:Object.fromEntries(realms.map(id=>[id,{coins:600,grain:1000,lastIncome:0,lastExpense:0,lastFood:0}])) as Record<RealmId,Treasury>,influence:50,mandate:executive(w)||characterById[w.characterId!].role==='commander',offices:[],armies:[],war:null,truces:{},event:null,lastEvent:0,ledger:[]};
}
export function syncGovernance(w:World){if(w.realm)w.holdings.governedCities=Object.entries(w.realm.cities).filter(([,c])=>c.governor===w.characterId&&c.controller===playerRealm(w)).map(([id])=>id);}
export const armyLifestyle=(w:World,realm:RealmId)=>w.realm?.mandate&&w.characterId&&playerRealm(w)===realm?lifestyleBonuses(w):emptyLifestyleBonus();
const commandPower=(w:World,r:RealmId)=>{const id=w.mobility?.commanders[r];return id?Math.min(20,attributes(w,id).martial):0;};
const tactic=(w:World,r:RealmId)=>w.mobility?.commanders[r]===w.characterId?w.mobility?.stance??'balanced':'balanced';
const offense=(w:World,r:RealmId)=>tactic(w,r)==='attack'?1.2:tactic(w,r)==='guard'?.8:1;
const exposure=(w:World,r:RealmId)=>tactic(w,r)==='attack'?1.15:tactic(w,r)==='guard'?.8:1;
export const armyDailyFood=(w:World,a:Army)=>Math.ceil(a.troops/20*(100-armyLifestyle(w,a.realm).supply)/100);
export const armyMonthlyPay=(w:World,a:Army)=>Math.ceil(a.troops/10*(100-armyLifestyle(w,a.realm).armyExpense+governmentBonus(w,a.realm).pay)/100);
export function cityYield(w:World,id:string){
 const c=w.realm!.cities[id],b=w.holdings.cities[id]?.levels,rate=c.tax==='light'?0.7:c.tax==='heavy'?1.4:1;
 const bonus=c.governor===w.characterId&&c.controller===playerRealm(w)?lifestyleBonuses(w):emptyLifestyleBonus();
 return {coins:Math.floor((c.households/60+(b?.market??0)*8)*rate*c.order/100*(0.5+c.prosperity/100)*(100+bonus.tax+governmentBonus(w,c.controller,id).tax)/100),grain:Math.floor((c.households/25+(b?.granary??0)*10)*(100+bonus.grain)/100),expense:Math.ceil(c.households/180)};
}
export function realmForecast(w:World,id:RealmId){let income=0,expense=0,food=0;for(const [site,c] of Object.entries(w.realm!.cities))if(c.controller===id){const y=cityYield(w,site);income+=y.coins;expense+=y.expense;food+=y.grain-Math.ceil(c.households/30);}const a=w.realm!.armies.find(a=>a.realm===id);if(a){expense+=armyMonthlyPay(w,a);food-=armyDailyFood(w,a)*30;}expense+=courtSalary(w,id);return {income,expense,food};}
function log(w:World,text:string){w.chronicle.push({day:w.day,person:'player',text});w.chronicle=w.chronicle.slice(-100);}
const connected=(w:World,id:string,r:RealmId)=>roads.some(e=>e.from===id&&w.realm!.cities[e.to].controller===r||e.to===id&&w.realm!.cities[e.from].controller===r);
export function realmReason(w:World,c:RealmCommand):string {
 const s=w.realm;if(!s||!w.characterId||w.campaign?.status!=='active')return '仅历史沙盒可用';
 const r=playerRealm(w),t=s.treasuries[r],a=s.armies.find(a=>a.realm===r),city='site'in c?s.cities[c.site]:null;
 if('site'in c&&!Object.hasOwn(s.cities,c.site))return '无效城市';
 if(c.action==='event'){if(!s.event)return '没有待处理事件';if(!['fund','decline'].includes(c.choice))return '无效选项';if(c.choice==='fund'){const k=s.event.kind;if((k==='flood'||k==='levy')?t.grain<(k==='flood'?60:40):t.coins<(k==='market'?50:k==='dispute'?30:k==='harvest'?40:35))return '公库资源不足，可选择搁置';}return '';}
 if(s.event)return '先处理待决事务';
 switch(c.action){
 case 'tax':if(!['light','normal','heavy'].includes(c.tax))return '无效税制';return city!.governor!==w.characterId||city!.controller!==r?'需要本城治理权':'';
 case 'relief':return city!.governor!==w.characterId||city!.controller!==r?'需要本城治理权':t.grain<50?'需公粮 50':'';
 case 'appoint':return !executive(w)?'任命权掌握在本政权实际执政者手中':!Object.hasOwn(characterById,c.candidate)||characterById[c.candidate].polity!==r?'需同政权在录人物':city!.owner!==r||city!.controller!==r?'仅可任命本国控制的本国城市':s.offices.some(o=>o.site===c.site)?'任命正在送达':city!.governor===c.candidate?'此人已在任':s.influence<20?'需影响力 20':appointmentReason(w,c.candidate,c.site);
 case 'petition':if(governmentOf(w)?.type==='feudal'&&appointmentReason(w,w.characterId!,c.site))return appointmentReason(w,w.characterId!,c.site);return city!.owner!==r||city!.controller!==r?'只能请任本国控制的本国城市':city!.governor===w.characterId?'你已在任':s.offices.some(o=>o.site===c.site)?'任命正在送达':s.influence<40?'需影响力 40':!executive(w)&&!meritAccess(w,'office')&&acceptance(w,governingAuthority(w,r)).reduce((n,v)=>n+v.value,0)+(clanStanding(w,w.characterId!)?.petition??0)+recommendationBonus(w,w.characterId!)<60?`需执政者接受度 60 或官僚功绩 ${20-(clanStanding(w,w.characterId!)?.merit??0)}`:'';
 case 'mandate':return s.mandate?'已有军务授权':s.influence<40?'需影响力 40':!executive(w)&&!meritAccess(w,'military')&&acceptance(w,governingAuthority(w,r)).reduce((n,v)=>n+v.value,0)+(clanStanding(w,w.characterId!)?.petition??0)+recommendationBonus(w,w.characterId!)<60?'需执政者接受度 60 或官僚功绩 40':'';
 case 'muster':return !s.mandate?'需要军务授权':a?'已有动员军队':!Object.values(s.cities).some(c=>c.controller===r)?'已无控制城市':t.coins<120||t.grain<120?'动员需要公款 120、公粮 120':governmentMusterReason(w);
 case 'disband':return !s.mandate?'需要军务授权':!a?'尚未动员':a.journey?'抵达后方可遣散':s.cities[a.location].controller!==r?'请回到己方控制城市':'';
 case 'war':return foreignWarReason(w,city!.owner as RealmId)||(!s.mandate?'需要军务授权':s.war?'当前已有战争':city!.owner===r||city!.owner==='frontier'?'请选择其他三国政权的城市':city!.owner!==city!.controller?'目标处于占领中':!connected(w,c.site,r)?'只能对相邻控制城市发起边境争夺':(s.truces[[r,city!.owner].sort().join('|')]??0)>w.day?'停战协议仍有效':s.influence<40?'需影响力 40':'');
 case 'march':{if(!s.mandate)return '需要军务授权';if(!a)return '请先动员';if(a.journey)return '军队正在行军';if(a.location===c.site)return '军队已在此地';const p=planRoute(a.location,c.site,id=>canEnter(w,r,s.cities[id].controller,undefined,true));return p?'':'道路经过未获通行权的第三方';}
 case 'peace':return !s.mandate?'需要军务授权':!s.war||![s.war.attacker,s.war.defender].includes(r)?'没有本国参与的战争':'';
 default:return '无效政务行动';
 }
}
export function actRealm(w:World,c:RealmCommand){
 const reason=realmReason(w,c);if(reason)throw new Error(reason);const s=w.realm!,r=playerRealm(w),t=s.treasuries[r];
 switch(c.action){
 case 'tax':s.cities[c.site].tax=c.tax;log(w,siteById[c.site].name+'税制调整为'+({light:'轻税',normal:'常税',heavy:'重税'})[c.tax]+'。');break;
 case 'relief':t.grain-=50;s.cities[c.site].order=clamp(s.cities[c.site].order+15,0,100);log(w,'向'+siteById[c.site].name+'拨粮 50，秩序 +15。');break;
 case 'appoint':case 'petition':{const candidate=c.action==='appoint'?c.candidate:w.characterId!;s.influence-=c.action==='appoint'?20:40;const days=planRoute(capital(r),c.site)?.days??1;s.offices.push({site:c.site,candidate,due:w.day+days+7});log(w,'任命'+characterById[candidate].name+'治理'+siteById[c.site].name+'，文书预计 '+(days+7)+' 日送达。');break;}
 case 'mandate':s.influence-=40;s.mandate=true;log(w,'获得本局军务授权，可以动员与发动边境争夺。');break;
 case 'muster':{spendGovernmentMuster(w);const home=w.people[0].home,location=s.cities[home].controller===r?home:Object.keys(s.cities).find(id=>s.cities[id].controller===r)!;t.coins-=120;t.grain-=120;s.armies.push({realm:r,location,troops:600,morale:100,supply:120,journey:null,siege:0});const army=s.armies.at(-1)!;log(w,regimeName(w,r)+`动员 600 人，每 30 日军饷 ${armyMonthlyPay(w,army)} 钱，每日消耗军粮 ${armyDailyFood(w,army)}。`);break;}
 case 'disband':{if(w.mobility){const leader=w.mobility.commanders[r];if(leader===w.characterId)w.people[0].journey=null;else if(leader&&w.mobility.residences[leader])w.mobility.residences[leader].journey=null;delete w.mobility.commanders[r];}const a=s.armies.find(a=>a.realm===r)!;t.grain=clamp(t.grain+a.supply);s.armies=s.armies.filter(a=>a.realm!==r);log(w,'军队遣散，剩余随军粮食归还公库；动员费用不退。');break;}
 case 'war':s.influence-=40;s.war={attacker:r,defender:s.cities[c.site].owner as RealmId,target:c.site,started:w.day,score:0};diplomaticWar(w,r,s.cities[c.site].owner as RealmId);log(w,regimeName(w,r)+'发起对'+siteById[c.site].name+'的边境争夺（模拟分歧）。');break;
 case 'march':{const a=s.armies.find(a=>a.realm===r)!;march(a,c.site,w.day,w);log(w,regimeName(w,r)+'军前往'+siteById[c.site].name+'，依道路逐日行军。');break;}
 case 'peace':settleWar(w);break;
 case 'event':resolveEvent(w,c.choice);break;
 }
}
function march(a:Army,target:string,day:number,w:World){const p=planRoute(a.location,target,id=>canEnter(w,a.realm,w.realm!.cities[id].controller,undefined,true));if(p)a.journey={route:p.route,durations:p.durations,leg:0,elapsed:0,started:day};a.siege=0;}
function settleWar(w:World){
 const s=w.realm!,war=s.war!;
 // Only the contested city can change legal owner. Other occupation is returned.
 const target=s.cities[war.target],won=target.controller===war.attacker&&war.score>=50;
 if(won){target.owner=war.attacker;target.governor=null;log(w,siteById[war.target].name+'依据本局议和转归'+regimeName(w,war.attacker)+'，州郡法理边界不随之推断。');}else log(w,'议和恢复战前城市归属，无领土割让。');
 for(const city of Object.values(s.cities))if([war.attacker,war.defender].includes(city.owner as RealmId))city.controller=city.owner;
 s.truces[[war.attacker,war.defender].sort().join('|')]=w.day+360;
 for(const a of s.armies){a.journey=null;a.siege=0;if(s.cities[a.location].controller!==a.realm){const home=Object.keys(s.cities).find(id=>s.cities[id].controller===a.realm);if(home)a.location=home;else a.troops=0;}}
 s.armies=s.armies.filter(a=>a.troops>0);s.war=null;syncGovernance(w);
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
 const s=w.realm;if(!s)return;
 for(const office of s.offices.filter(o=>o.due<=w.day)){
 const city=s.cities[office.site];if(city.owner===characterById[office.candidate].polity&&city.controller===city.owner){city.governor=office.candidate;log(w,characterById[office.candidate].name+'获授'+siteById[office.site].name+'治理权；前任权限撤销。');}else log(w,siteById[office.site].name+'局势变化，任命文书失效。');}
 s.offices=s.offices.filter(o=>o.due>w.day);syncGovernance(w);
 if(w.day%30===0){
 for(const r of realms){const t=s.treasuries[r],f=realmForecast(w,r);payCourtSalary(w,r,Math.min(courtSalary(w,r),Math.max(0,t.coins+f.income-(f.expense-courtSalary(w,r)))));t.lastIncome=f.income;t.lastExpense=f.expense;t.lastFood=f.food;t.coins=clamp(t.coins+f.income-f.expense);
 // Army consumption is daily, so only civilian production/consumption is booked here.
 const army=s.armies.find(a=>a.realm===r);t.grain=clamp(t.grain+f.food+(army?armyDailyFood(w,army)*30:0));
 s.ledger.push({day:w.day,realm:r,...f});
 for(const city of Object.values(s.cities))if(city.controller===r){city.order=clamp(city.order+(city.tax==='light'?4:city.tax==='heavy'?-6:1)-(t.coins===0?6:0)-(t.grain===0?8:0),0,100);city.prosperity=clamp(city.prosperity+(city.order>=60?1:-2),0,100);city.households=clamp(city.households+(city.order>=70?2:city.order<30?-3:0),100,10000);}
 if(r!==playerRealm(w))for(const city of Object.values(s.cities))if(city.controller===r)city.tax=city.order<45?'light':t.coins<100?'heavy':'normal';
 }
 s.ledger=s.ledger.slice(-36);s.influence=clamp(s.influence+5,0,999);
 const salary=Math.min(s.treasuries[playerRealm(w)].coins,w.holdings.governedCities.length*4);w.people[0].coins=clamp(w.people[0].coins+salary);s.treasuries[playerRealm(w)].coins=clamp(s.treasuries[playerRealm(w)].coins-salary);
 }
 const war=s.war;
 if(war){const enemy=war.attacker===playerRealm(w)?war.defender:war.attacker,t=s.treasuries[enemy];let a=s.armies.find(a=>a.realm===enemy);
 if(!a&&t.coins>=120&&t.grain>=120&&!governmentMusterReason(w,enemy)&&w.day-war.started>=5){const location=Object.keys(s.cities).find(id=>s.cities[id].controller===enemy);if(location){spendGovernmentMuster(w,enemy);t.coins-=120;t.grain-=120;a={realm:enemy,location,troops:600,morale:100,supply:120,journey:null,siege:0};s.armies.push(a);}}
 if(a&&!a.journey&&a.location!==war.target){const path=planRoute(a.location,war.target,id=>canEnter(w,enemy,s.cities[id].controller,undefined,true));if(path)march(a,war.target,w.day,w);}
 }
 for(const a of s.armies){
 const t=s.treasuries[a.realm],need=armyDailyFood(w,a);
 if(s.cities[a.location].controller===a.realm||connected(w,a.location,a.realm)){const refill=Math.min(120-a.supply,t.grain);a.supply+=refill;t.grain-=refill;}
 if(a.supply<need){a.troops=Math.max(0,a.troops-Math.ceil(a.troops*.02));a.morale=clamp(a.morale-4,0,100);a.supply=0;}else{a.supply-=need;a.morale=clamp(a.morale+(t.coins?1:-2),0,100);}
 if(a.journey&&!canEnter(w,a.realm,s.cities[a.journey.route[a.journey.leg+1]].controller,undefined,true)){a.journey=null;a.siege=0;log(w,regimeName(w,a.realm)+'军借道许可失效，停止行军。');}
 if(a.journey){const j=a.journey;j.elapsed++;if(j.elapsed>=j.durations[j.leg]){a.location=j.route[++j.leg];j.elapsed=0;if(j.leg===j.durations.length)a.journey=null;}}
 }
 if(war){const a=s.armies.find(a=>a.realm===war.attacker),b=s.armies.find(a=>a.realm===war.defender);
 if(a&&b&&!a.journey&&!b.journey&&a.location===b.location){const attack=Math.max(1,Math.round(a.troops*(.4+a.morale/100)*.08*(100+commandPower(w,a.realm)+armyLifestyle(w,a.realm).attack+governmentBonus(w,a.realm).attack)/100)),defend=Math.max(1,Math.round(b.troops*(.4+b.morale/100)*.08*(100+commandPower(w,b.realm)+armyLifestyle(w,b.realm).attack+governmentBonus(w,b.realm).attack)/100));a.troops=Math.max(0,a.troops-Math.round(defend*offense(w,b.realm)*exposure(w,a.realm)));b.troops=Math.max(0,b.troops-Math.round(attack*offense(w,a.realm)*exposure(w,b.realm)));a.morale=clamp(a.morale-3,0,100);b.morale=clamp(b.morale-3,0,100);if(a.troops<100||a.morale<10){a.troops=0;war.score=clamp(war.score-25,-100,100);log(w,'攻方野战军溃散。');}if(b.troops<100||b.morale<10){b.troops=0;war.score=clamp(war.score+25,-100,100);log(w,'守方野战军溃散。');}}
 for(const army of s.armies){const city=s.cities[army.location],opponent=army.realm===war.attacker?war.defender:war.attacker;
 if(army.troops>=100&&!army.journey&&army.supply>0&&city.controller===opponent&&!s.armies.some(e=>e.realm===opponent&&e.troops>0&&e.location===army.location)){
 army.siege++;const required=Math.ceil((siteById[army.location].capital?40:20)*(1+(w.holdings.cities[army.location]?.levels.granary??0)*.1)*(100-armyLifestyle(w,army.realm).siege)/100);
 if(army.siege>=required){city.controller=army.realm;city.order=clamp(city.order-20,0,100);army.siege=0;war.score=clamp(war.score+(army.realm===war.attacker?50:-50),-100,100);log(w,siteById[army.location].name+'被'+regimeName(w,army.realm)+'军占领，法理归属暂不变。');syncGovernance(w);}
 }else army.siege=0;}
 if(w.day-war.started>=360)settleWar(w);
 }
 s.armies=s.armies.filter(a=>a.troops>=100);
 if(!s.event&&w.day-s.lastEvent>=90&&w.holdings.governedCities.length){const kinds=Object.keys(eventDefinitions) as EventKind[];s.event={kind:kinds[(Math.floor(w.day/90)-1)%kinds.length],site:w.holdings.governedCities[0],day:w.day};s.lastEvent=w.day;log(w,'收到待决事务：'+eventDefinitions[s.event.kind].title+'。');}
}
export function handoverOffice(w:World){if(w.realm){if(governmentOf(w)?.type==='feudal'){const former=w.social?.lineage.at(-2)?.id;if(former)for(const city of Object.values(w.realm.cities))if(city.governor===former&&city.owner===playerRealm(w)&&city.controller===playerRealm(w))city.governor=w.characterId!;}w.realm.mandate=executive(w)||(!(governmentOf(w)?.stages.length)&&characterById[w.characterId!].role==='commander');w.realm.event=null;syncGovernance(w);}}
