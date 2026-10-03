import {settleCaptureLoss,type CaptureCause} from './warOccupation';
import {initialFortificationLevel,isCapitalSite,ensureFortifications,fortificationQuote,startFortification,advanceFortificationAI} from './fortifications';
import {getCharacter} from './personRegistry';
import {awardDeed} from './deeds';
import {worldRealms} from './polityRuntime';
import {detained} from './custodyState';
import {captureCityPeople,resolveCommanderFate} from './custody';
import {personInfluence,awardInfluence} from './personalInfluence';
import {advanceRealmStrategy} from './realmStrategy';
import {relationOpinion} from './relationships';
import {armyVisualState} from './armyPresentation';
import {isMonthStart,nextMonthStart} from './calendar';
import {armyCommander} from './mobility';
import {advanceMilitaryAI} from './militaryAI';
import {advanceMilitaryNominations} from './militaryNominations';
import {advanceDefections} from './defections';
import {advanceSiegePhase,siegePhaseQuote} from './siegePhases';
import {awardMilitaryExperience,advanceMilitaryCareer,attemptCompliance} from './militaryCareer';
import {advanceRecruitmentRallies} from './recruitmentPlans';
import {authorityGrant} from './authority';
import {takeCasualties,battleStage} from './militaryAftermath';
import {advanceUnrest} from './unrest';
import {defaultCountyCulture} from '../data/cultures';
import {civilCityCapture,armyControls,warArmySide,warCitySide,armiesHostile,playerCommandsArmy,civilCanAdmin,civilWar,settleCivilWar,advanceCivilPolitics} from './civilWars';
import {annexPolity,advanceAnnexations} from './polityLifecycle';
import {armyCampaign} from './militaryCampaigns';
import {roadEncounters,fieldBattles} from './battlefield';
import {realmAtWar,activeWars,ensureWars,bilateralWar,selectedWar,peaceQuote,advanceReparations,warRealmSide,type PeaceTerms,type War} from './wars';
import {snapshotWarValues,updateWarScore} from './warScoring';
import {regionalWarTerritory,warTerritorySites,warObjectiveSites,warTargetName,warDeclarationCost} from './warTerritories';
import {ensureArmyOrganization,reconcileRegiments,readyTroops,armyPayFactor,armyCombatFactor,armyMatchupFactor,consumeArmyFood,projectArmyFood} from './armyOrganization';
import {completeLocalAppointment,advanceLocal,localEfficiency,countyTerritory,localReason,actLocal} from './localAdministration';
import {canCommission} from './serviceMandates';
import {advanceNationalLogistics,settleArmyFood,mobilizedTransportLabor,returnArmyConvoy,type ArmyConvoy} from './armyLogistics';
import {enactPoliticalAction} from './politicalActions';
import {allegianceRealm} from './officeEligibility';
import {regionalEconomy} from '../data/regionalEconomy';
import {civilianFood,settleLocalGrain,grainCapacity,ensurePopulation,demobilizationPlan,demobilizeArmy} from './population';
import {operatingSubsidy,centralTax,collectFiscal,distributeFiscal,payFiscalOperations,localBalance,spendLocal} from './treasury';
import {clanStanding} from './clans';
import {recommendationBonus} from './retinue';
import {attributes} from './social';
import { foreignWarReason,diplomaticWar,canEnter } from './diplomacy';
import { courtSalary } from './court';
import { governmentExecutive,governingAuthority,governmentBonus,meritAccess,governmentMusterReason,spendGovernmentMuster,governmentOf,regimeName } from './government';
import type { GovernmentState } from './government';
import { lifestyleBonuses } from './lifestyle';
import { emptyLifestyleBonus } from '../data/lifestyles';

import { roads,siteById,sites } from '../data/scenario';
import { acceptance } from './social';
import { planRoute } from './world';
import type { World,Journey,Polity } from './types';
export const realms=['liang','east','west'] as const;
export type RealmId=Exclude<Polity,'frontier'>;
export type Tax='light'|'normal'|'heavy';
export interface Province {cultureId?:import('../data/cultures').CultureId;culturalExemption?:{leader:string;since:number};administration?:{day:number;need:number;paid:number};militaryRequisition?:{month:number;grain:number;burden:number};owner:Polity;controller:Polity;governor:string|null;population:number;grain:number;irrigation:number;order:number;prosperity:number;tax:Tax;occupiedSince?:number;occupiedByWar?:number;integration?:{since:number;progress:number;funded:boolean};fortification?:{level:number;due:number|null}}
export interface Treasury {coins:number;grain:number;lastIncome:number;lastExpense:number;lastFood:number}
export interface Army {automation?:'direct'|'delegated';refusal?:{kind:'replace'|'disband';commander:string|null;day:number;reason:string};owner?:string;rally?:string;starvationDays?:number;supplyLost?:number;logisticsReason?:string;supplyPriority?:number;withdrawalUntil?:number;trainingStarted?:number;trainingUntil?:number;id?:number;payer?:string;arrears?:number;foodRemainder?:number;regiments?:import('./armyOrganization').Regiment[];convoy?:ArmyConvoy|null;realm:RealmId;location:string;troops:number;morale:number;supply:number;journey:Journey|null;siege:number}
export interface Siege {started?:number;nextPhase?:number;breach?:number;round?:number;blockade?:number;event?:string;playerDecision?:boolean;war:number;side:'attack'|'defend';site:string;progress:number;last:number;lastAssault?:number}
export interface RealmState {
 identities?:Partial<Record<RealmId,import('./polityRuntime').RealmIdentity>>;
 foodVersion?:2;
 strategy?:import('./realmStrategy').RealmStrategies;
 annexed?:Partial<Record<RealmId,import('./polityLifecycle').Annexation>>;
 supplyPolicies?:Partial<Record<RealmId,import('./armyLogistics').SupplyPolicy>>;
 traffic?:import('./roadCapacity').RoadTraffic;nextArmyId?:number;armyDebts?:{realm:RealmId;account:string;coins:number}[];
 local?:import('./localAdministration').LocalAdministration;
 population?:import('./population').PopulationState;
 fiscal?:import('./treasury').FiscalState;
 version:1;lastMilitaryDay?:number;lastMonthly?:number;personalInfluence?:Record<string,number>;lastInfluenceIncome?:number;governments?:GovernmentState;cities:Record<string,Province>;treasuries:Record<RealmId,Treasury>;influence:number;mandate:boolean;
 offices:{site:string;candidate:string;due:number;territory?:string;realm?:RealmId;issuer?:string;acting?:boolean;concurrent?:boolean;issued?:number}[];armies:Army[];
 reparations?:import('./wars').Reparation[];wars?:War[];nextWarId?:number;war:War|null;sieges?:Siege[];
 truces:Record<string,number>;event:{kind:EventKind;site:string;day:number}|null;lastEvent:number;
 ledger:{day:number;realm:RealmId;income:number;expense:number;food:number}[];
}
export type RealmCommand={type:'realm';action:'tax';site:string;tax:Tax}|{type:'realm';action:'relief'|'fortify';site:string}|{type:'realm';action:'appoint';site:string;candidate:string}|{type:'realm';action:'petition';site:string}|{type:'realm';action:'mandate'}|{type:'realm';action:'muster'|'disband'|'peace';army?:number;war?:number;terms?:PeaceTerms;claims?:string[];returns?:string[];extraCoins?:number;landRecipient?:RealmId}|{type:'realm';action:'march'|'war';site:string;army?:number;goal?:War['goal'];territory?:string}|{type:'realm';action:'event';choice:'fund'|'decline'};
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
export const playerRealm=(w:World):RealmId=>allegianceRealm(w,w.characterId!)?? getCharacter(w,w.characterId!)!.polity as RealmId;
export const executive=governmentExecutive;
export const authority=(id:RealmId)=>id==='liang'?'xiao-yan':id==='east'?'gao-huan':'yuwen-tai';
export const capital=(id:RealmId,w?:World)=>w?.realm?.identities?.[id]?.capital??(id==='liang'?'jiankang':id==='east'?'ye':'changan');
export function newRealm(w:World):RealmState {
 const cities=Object.fromEntries(sites.map(s=>[s.id,{cultureId:defaultCountyCulture(s.polity==='frontier'),owner:s.polity,controller:s.polity,governor:s.id===w.people[0].home?w.characterId!:null,population:regionalEconomy(s.id).initialPopulation,grain:Math.ceil(regionalEconomy(s.id).initialPopulation/150)*2,irrigation:0,order:70,prosperity:50,tax:'normal' as Tax,fortification:{level:initialFortificationLevel(w,s.id),due:null}}]));
 return {version:1,foodVersion:2,cities,treasuries:Object.fromEntries(worldRealms(w).map(id=>[id,{coins:600,grain:1000,lastIncome:0,lastExpense:0,lastFood:0}])) as Record<RealmId,Treasury>,influence:50,mandate:executive(w)|| getCharacter(w,w.characterId!)!.role==='commander',offices:[],armies:[],war:null,truces:{},event:null,lastEvent:0,ledger:[]};
}
export function syncGovernance(w:World){if(w.realm)w.holdings.governedCities=Object.entries(w.realm.cities).filter(([,c])=>c.governor===w.characterId&&c.controller===playerRealm(w)).map(([id])=>id);}
export function occupyCity(w:World,war:War,site:string,controller:RealmId,peaceful=false,cause:CaptureCause=peaceful?'surrender':'battle'){const before=w.realm!.cities[site].controller;if(before!==controller){const side=warRealmSide(war,controller);if(side)settleCaptureLoss(w,war,site,side,cause);}captureCityPeople(w,site,controller,'city:'+war.id+':'+site+':'+w.day,peaceful);const city=w.realm!.cities[site];if(city.controller!==controller&&war.id!==undefined){const leaders=new Set([governingAuthority(w,controller),...w.realm!.armies.filter(a=>a.realm===controller&&a.location===site&&!a.journey).map(a=>armyCommander(w,a))]);for(const id of leaders)if(id)awardDeed(w,controller,id,'siege:'+site+':'+war.id,5,'攻取城市，按本场战争与城池记录一次军功');}city.controller=controller;if(city.controller===city.owner){delete city.occupiedSince;delete city.occupiedByWar;}else{city.occupiedSince=w.day;city.occupiedByWar=war.id;}syncGovernance(w);}
export const armyLifestyle=(w:World,realm:RealmId)=>w.realm?.mandate&&w.characterId&&playerRealm(w)===realm?lifestyleBonuses(w):emptyLifestyleBonus();
const commandPower=(w:World,r:RealmId,army?:Army)=>{const id=army?armyCommander(w,army):w.mobility?.commanders[r];const war=civilWar(w,r);if(army&&war&&id&&(war.civil!.supporters.includes(id)!==(warArmySide(w,war,army)==='attack')))return 0;return id?Math.min(20,attributes(w,id).martial):0;};
const tactic=(w:World,r:RealmId,a?:Army)=>(!a||playerCommandsArmy(w,a))&&(a?armyCommander(w,a):w.mobility?.commanders[r])===w.characterId?w.mobility?.stance??'balanced':'balanced';
const offense=(w:World,r:RealmId,a?:Army)=>tactic(w,r,a)==='attack'?1.2:tactic(w,r,a)==='guard'?.8:1;
const exposure=(w:World,r:RealmId,a?:Army)=>tactic(w,r,a)==='attack'?1.15:tactic(w,r,a)==='guard'?.8:1;
const armyBonuses=(w:World,a:Army)=>{const commander=armyCommander(w,a);return playerCommandsArmy(w,a)?armyLifestyle(w,a.realm):commander&&!detained(w,commander)?lifestyleBonuses(w,commander):emptyLifestyleBonus();};
/** Campaign expenditure is derived from active participation; peace retains the base rate. */
export const armyFoodRate=(w:World,a:Army)=>(100-armyBonuses(w,a).supply)*(realmAtWar(w,a.realm)?3:1);
export const armyDailyFood=(w:World,a:Army)=>a.troops/4500*1.5*armyFoodRate(w,a)/100;
export const armyMonthlyPay=(w:World,a:Army)=>Math.ceil(a.troops/10*armyPayFactor(a)*(realmAtWar(w,a.realm)?1.75:1)*(100-armyBonuses(w,a).armyExpense+governmentBonus(w,a.realm).pay)/100);
export const fortificationLevel=(w:World,id:string)=>w.realm!.cities[id].fortification?.level??initialFortificationLevel(w,id);
export function canMarchThrough(w:World,r:RealmId,id:string,target:string,army?:Army){if(army&&id!==target&&fortificationLevel(w,id)>0&&activeWars(w).some(war=>{const side=warArmySide(w,war,army),city=warCitySide(w,war,id);return side&&city&&side!==city;}))return false;const controller=w.realm!.cities[id].controller;if(!canEnter(w,r,controller,undefined,true))return false;return id===target||controller===r||controller==='frontier'||fortificationLevel(w,id)<1||!activeWars(w).some(war=>warRealmSide(war,r)&&warRealmSide(war,controller)&&warRealmSide(war,r)!==warRealmSide(war,controller));}
export const siegeRequirement=(w:World,a:Army)=>Math.ceil((isCapitalSite(w,a.location)?40:20)*(1+fortificationLevel(w,a.location)*.35)*(100-armyBonuses(w,a).siege)/100);
export function armyFieldStatus(w:World,a:Army){const visual=armyVisualState(w,a);if(visual==='retreat')return '撤军';if(visual==='battle')return '交战';if(visual==='training')return '训练';if(a.journey)return '行军';if(w.realm?.armies.some(b=>b!==a&&b.location===a.location&&!b.journey&&b.troops>=100&&armiesHostile(w,a,b)))return '交战';const siege=activeWars(w).some(war=>{const side=warArmySide(w,war,a);return side&&warCitySide(w,war,a.location)===(side==='attack'?'defend':'attack');});if(siege)return a.supply>0?'围城':'围城停滞 · 缺粮';const city=w.realm?.cities[a.location];if(city&&city.controller!==a.realm&&city.controller!=='frontier')return activeWars(w).some(war=>warRealmSide(war,a.realm)&&warRealmSide(war,a.realm)===warRealmSide(war,city.controller as RealmId))?'盟国驻地':'驻留异国 · 未与控制方交战';return '驻扎';}
export function cityOperatingExpense(w:World,id:string){const c=w.realm!.cities[id];return Math.ceil(c.population/900)+(c.governor?4:0)+Math.max(0,fortificationLevel(w,id)-(isCapitalSite(w,id)?1:0))*2+(c.integration?8+Math.ceil((100-c.integration.progress)/20):Object.values(w.realm!.annexed??{}).filter(a=>a?.sites.includes(id)&&w.day-a.day<360).length*8);}
export function cityYield(w:World,id:string){
 const c=w.realm!.cities[id],b=w.holdings.cities[id]?.levels,rate=c.tax==='light'?0.7:c.tax==='heavy'?1.4:1,region=regionalEconomy(id);
 const governor=c.owner===c.controller&&c.governor&&!detained(w,c.governor)?c.governor:null,bonus=governor?lifestyleBonuses(w,governor):emptyLifestyleBonus();
 const labor=Math.max(.5,1-mobilizedTransportLabor(w,id)/Math.max(1,c.population)*5-(w.service?.tasks.filter(t=>t.site===id&&t.phase==='working').length??0)*.08);
 const links=roads.filter(e=>!e.legacyOnly&&(e.from===id||e.to===id)),access=links.length?.5+.5*links.filter(e=>{const other=w.realm!.cities[e.from===id?e.to:e.from].controller;return other===c.controller||c.controller!=='frontier'&&canEnter(w,c.controller,other);}).length/links.length:.5;
 const management=governor?Math.max(-10,Math.min(20,(attributes(w,governor).stewardship-8)*2)):0;
 const capacity=region.capacity*(1+c.irrigation*.15),effective=Math.min(c.population,capacity)+Math.max(0,c.population-capacity)*.25;
 const blockade=Math.max(0,...(w.realm?.sieges??[]).filter(v=>v.site===id).map(v=>v.blockade??0))/100;
 const grain=Math.floor((1-blockade*.8)*effective/100*region.fertility*(1+c.irrigation*.1)*labor*(.75+c.order/400)*(100+bonus.grain+management)/100);
 const controlFactor=c.owner!==c.controller ? .5 : c.integration ? .5+c.integration.progress/200 : 1;
 return {coins:Math.floor((c.population/600+c.population/600*region.trade*access+(b?.market??0)*8*access)*rate*c.order/100*(.5+c.prosperity/100)*(100+bonus.tax+management+localEfficiency(w,id)+governmentBonus(w,c.controller,id).tax)/100*controlFactor),grain,expense:cityOperatingExpense(w,id),food:civilianFood(w,id),labor,capacity,region,management,access};
}
export function integrationGain(w:World,id:string){const c=w.realm!.cities[id],r=c.owner;if(r==='frontier'||c.controller!==r)return {gain:0,connected:false,garrison:false,food:false};const connected=!!planRoute(capital(r,w),id,node=>w.realm!.cities[node].controller===r),garrison=w.realm!.armies.some(a=>a.realm===r&&a.location===id&&!a.journey&&a.troops>=100&&a.supply>0),food=c.grain>=civilianFood(w,id)*2;return {gain:!connected||c.order<40?0:2+(c.governor?5:0)+(garrison?4:0)+(food?2:0)+(c.tax==='light'?3:c.tax==='heavy'?-2:0),connected,garrison,food};}
export function realmForecast(w:World,id:RealmId,yields?:ReadonlyMap<string,ReturnType<typeof cityYield>>){const rows=yields??new Map(Object.entries(w.realm!.cities).filter(([,c])=>c.controller===id).map(([site])=>[site,cityYield(w,site)]));let income=0,expense=operatingSubsidy(w,id,rows),food=0;for(const [site,y] of rows){income+=centralTax(w,site,y.coins);food+=y.grain-y.food;}for(const a of w.realm!.armies.filter(a=>a.realm===id)){if(!a.payer||a.payer==='central:'+id)expense+=armyMonthlyPay(w,a);food-=projectArmyFood(a,armyFoodRate(w,a),30).need;}expense+=courtSalary(w,id);return {income,expense,food:Math.floor(food)};}
function log(w:World,text:string){w.chronicle.push({day:w.day,person:'player',text});w.chronicle=w.chronicle.slice(-100);}
export const warApproach=(w:World,id:string,r:RealmId,enemy:RealmId)=>roads.some(e=>{if(e.legacyOnly)return false;const a=w.realm!.cities[e.from].controller,b=w.realm!.cities[e.to].controller;return a===r&&b===enemy||a===enemy&&b===r;})&&Object.keys(w.realm!.cities).some(from=>w.realm!.cities[from].controller===r&&!!planRoute(from,id,node=>{const owner=w.realm!.cities[node].controller;return owner===r||owner===enemy||canEnter(w,r,owner,undefined,true); }));
export function realmReason(w:World,c:RealmCommand):string {
 const s=w.realm;if(!s||!w.characterId||w.campaign?.status!=='active')return '仅历史沙盒可用';
 const r=playerRealm(w),t=s.treasuries[r],a=s.armies.find(a=>a.realm===r&&(!('army'in c)||c.army===undefined||a.id===c.army)),city='site'in c?s.cities[c.site]:null;
 if('site'in c&&!Object.hasOwn(s.cities,c.site))return '无效城市';
 if(c.action==='event'){if(!s.event)return '没有待处理事件';if(!['fund','decline'].includes(c.choice))return '无效选项';if(c.choice==='fund'){const k=s.event.kind;if((k==='flood'||k==='levy')?t.grain<(k==='flood'?60:40):t.coins<(k==='market'?50:k==='dispute'?30:k==='harvest'?40:35))return '公库资源不足，可选择搁置';}return '';}
 if(s.event)return '先处理待决事务';
 switch(c.action){
 case 'tax':if(!civilCanAdmin(w,w.characterId,c.site))return '失去实际控制';if(!['light','normal','heavy'].includes(c.tax))return '无效税制';return !canCommission(w,w.characterId,r,c.site,'taxation')?'须实际统辖本国控制的城市':city!.tax===c.tax?'已是现行税制':'';
 case 'relief':if(!civilCanAdmin(w,w.characterId,c.site))return '失去实际控制';return !canCommission(w,w.characterId,r,c.site,'relief')?'须实际统辖本国控制的城市':city!.grain+(c.site===capital(r,w)?t.grain:0)<50?'需本城公粮 50（都城可动用中央储粮）':'';
 case 'fortify':return fortificationQuote(w,c.site).reason;
 case 'appoint':return localReason(w,{type:'local',action:'appoint',territory:countyTerritory(c.site),candidate:c.candidate});
 case 'petition':return localReason(w,{type:'local',action:'apply',territory:countyTerritory(c.site),candidate:w.characterId!});
 case 'mandate':return s.mandate?'已有军务授权':s.influence<40?'需影响力 40':!executive(w)&&!meritAccess(w,'military')&&acceptance(w,governingAuthority(w,r)).reduce((n,v)=>n+v.value,0)+(clanStanding(w,w.characterId!)?.petition??0)+recommendationBonus(w,w.characterId!)<60?'需执政者接受度 60 或官僚功绩 40':'';
 case 'muster':{if(civilWar(w,r))return '内战期间请通过驻地军队编制征募';const home=s.cities[w.people[0].home]?.controller===r?w.people[0].home:Object.keys(s.cities).find(id=>s.cities[id].controller===r)!;return !s.mandate?'需要军务授权':s.armies.filter(a=>a.realm===r).length>=16?'本国军队编制已满':!Object.values(s.cities).some(c=>c.controller===r)?'已无控制城市':!executive(w)&&s.cities[home].governor!==w.characterId?'地方动员须有本城治理权，或由朝廷委派征募':s.cities[home].population-mobilizedTransportLabor(w,home)<700?'本城可用人口不足以动员 600 人':(executive(w)?t.coins:localBalance(w,home))<120||(home===capital(r,w)?t.grain:s.cities[home].grain)<120?'动员需要'+(executive(w)?'中央':'本城')+'公款 120、公粮 120':governmentMusterReason(w);}
 case 'disband':if(a&&!playerCommandsArmy(w,a))return '不能指挥内战对方军队';if(a&&armyCampaign(w,a))return '须先撤销战役委任';return !a?'尚未动员':a.owner&&a.owner!==w.characterId&&relationOpinion(w,a.owner,w.characterId!)<20?'部曲主人尚未同意遣散':!authorityGrant(w,w.characterId,'command',{realm:r,site:a.location,army:a}).allowed?'没有本军指挥权':(a.arrears??0)>0?'须结清军饷后遣散':a.journey?'抵达后方可遣散':s.cities[a.location].controller!==r?'请回到己方控制城市':demobilizationPlan(w,a).reason;
 case 'war':return !s.mandate?'需要军务授权':declareRealmWarReason(w,w.characterId!,r,c.site,c.goal,true,c.territory);
 case 'march':{if(a&&!playerCommandsArmy(w,a))return '不能指挥内战对方军队';if(a&&armyCampaign(w,a))return '请先撤销战役委任，避免改写统帅目标';if(!a)return '请先动员';if(!authorityGrant(w,w.characterId,'command',{realm:r,site:a.location,army:a}).allowed)return '没有本军指挥权';if(a.withdrawalUntil)return '军队正在依和约撤离';if(readyTroops(a,w.day)<100)return '可出征兵员不足 100，新兵仍在集训';const from=a.journey?.route[a.journey.leg+1]??a.location;if(!a.journey&&a.location===c.site||a.journey?.route.at(-1)===c.site)return '军队已前往此地';const p=from===c.site?true:planRoute(from,c.site,id=>canMarchThrough(w,r,id,c.site,a));return p?'':planRoute(from,c.site,id=>canEnter(w,r,s.cities[id].controller,undefined,true))?'敌方城防封锁道路，须先攻取沿线要塞':'道路经过未获通行权的第三方';}
 case 'peace':if(selectedWar(w,r,c.war)?.civil)return peaceQuote(w,selectedWar(w,r,c.war)!,r,c.terms??(selectedWar(w,r,c.war)?.civil?'white':'statusQuo'),c.claims,c.extraCoins,c.landRecipient,c.returns).reason;return !executive(w)?'须由实际执政者议定国家和约':!s.mandate?'需要军务授权':!selectedWar(w,r,c.war)?'请在对应战事中议和':peaceQuote(w,selectedWar(w,r,c.war)!,r,c.terms??(selectedWar(w,r,c.war)?.civil?'white':'statusQuo'),c.claims,c.extraCoins,c.landRecipient,c.returns).reason;
 default:return '无效政务行动';
 }
}
export function actRealm(w:World,c:RealmCommand){
 const reason=realmReason(w,c);if(reason)throw new Error(reason);const s=w.realm!,r=playerRealm(w),t=s.treasuries[r];
 switch(c.action){
 case 'tax':enactPoliticalAction(w,r,'tax',{source:'tax:'+c.site+':'+c.tax+':'+w.day,site:c.site,actor:w.characterId,authorizer:w.characterId,stage:'execution',burden:c.tax==='heavy'?1:c.tax==='light'?-1:0,benefit:c.tax==='light'?.5:0});s.cities[c.site].tax=c.tax;log(w,siteById[c.site].name+'税制调整为'+({light:'轻税',normal:'常税',heavy:'重税'})[c.tax]+'。');break;
 case 'relief':{const local=Math.min(s.cities[c.site].grain,50);s.cities[c.site].grain-=local;t.grain-=50-local;s.cities[c.site].order=clamp(s.cities[c.site].order+15,0,100);log(w,'向'+siteById[c.site].name+'拨粮 50，秩序 +15。');break;}
 case 'fortify':startFortification(w,c.site);break;
 case 'appoint':case 'petition':{actLocal(w,{type:'local',action:c.action==='appoint'?'appoint':'apply',territory:countyTerritory(c.site),candidate:c.action==='appoint'?c.candidate:w.characterId!});if(c.action==='appoint')enactPoliticalAction(w,r,'appointment',{source:'appointment:'+c.site+':'+c.candidate+':'+w.day,site:c.site,actor:c.candidate,authorizer:w.characterId,stage:'commitment'});break;}
 case 'mandate':s.influence-=40;s.mandate=true;log(w,'获得本局军务授权，可以动员与发动边境争夺。');break;
 case 'muster':{spendGovernmentMuster(w);const home=w.people[0].home,location=s.cities[home].controller===r?home:Object.keys(s.cities).find(id=>s.cities[id].controller===r)!;enactPoliticalAction(w,r,'military',{source:'muster:'+location+':'+w.day,site:location,actor:w.characterId,authorizer:w.characterId,stage:'execution',scale:2,burden:1});if(executive(w))t.coins-=120;else spendLocal(w,location,120,'地方动员');if(location===capital(r,w))t.grain-=120;else s.cities[location].grain-=120;s.cities[location].population-=600;s.armies.push({realm:r,location,troops:600,morale:100,supply:120,journey:null,siege:0});const army=s.armies.at(-1)!;log(w,regimeName(w,r)+`动员 600 人，每月 1 日军饷 ${armyMonthlyPay(w,army)} 钱，每日消耗军粮 ${armyDailyFood(w,army)}。`);break;}
 case 'disband':{const refusing=s.armies.find(a=>a.realm===r&&(c.army===undefined||a.id===c.army))!;if(!attemptCompliance(w,refusing,'disband'))break;if(w.mobility&&(!c.army||s.armies.find(a=>a.realm===r)?.id===c.army)){const leader=w.mobility.commanders[r];if(leader===w.characterId)w.people[0].journey=null;else if(leader&&w.mobility.residences[leader])w.mobility.residences[leader].journey=null;delete w.mobility.commanders[r];}const a=s.armies.find(a=>a.realm===r&&(c.army===undefined||a.id===c.army))!;const returned=demobilizeArmy(w,a);delete w.mobility?.pendingCommanders?.[a.id!];const leader=w.mobility?.armyCommanders?.[a.id!];if(leader&&w.mobility){if(leader===w.characterId)w.people[0].journey=null;else if(w.mobility.residences[leader])w.mobility.residences[leader].journey=null;delete w.mobility.armyCommanders![a.id!];}s.cities[a.location].grain=Math.min(grainCapacity(w,a.location),s.cities[a.location].grain+a.supply);returnArmyConvoy(w,a);s.armies=s.armies.filter(other=>other!==a);log(w,`军队遣散：${returned.traveling} 人按兵团原籍返乡，${returned.settled} 人因原籍失守、道路不通或本地籍而于驻地安置；随军余粮返仓，超仓部分损耗。`);break;}
 case 'war':declareRealmWar(w,w.characterId!,r,c.site,c.goal,c.territory);break;
 case 'march':{const a=s.armies.find(a=>a.realm===r&&(c.army===undefined||a.id===c.army))!;delete a.rally;a.automation='direct';march(a,c.site,w.day,w);log(w,regimeName(w,r)+'军前往'+siteById[c.site].name+'，依道路逐日行军。');break;}
 case 'peace':settleWar(w,selectedWar(w,r,c.war)!,c.terms??(selectedWar(w,r,c.war)?.civil?'white':'statusQuo'),r,c.claims,c.extraCoins,c.landRecipient,c.returns);break;
 case 'event':resolveEvent(w,c.choice);break;
 }
 ensureArmyOrganization(w);
}
function march(a:Army,target:string,day:number,w:World){const old=a.journey,from=old?.route[old.leg+1]??a.location,p=from===target?null:planRoute(from,target,id=>canMarchThrough(w,a.realm,id,target,a));if(old){const elapsed=old.elapsed;a.journey={route:[a.location,from,...(p?.route.slice(1)??[])],durations:[old.durations[old.leg],...(p?.durations??[])],leg:0,elapsed,started:day-elapsed};}else if(p)a.journey={route:p.route,durations:p.durations,leg:0,elapsed:0,started:day};a.siege=0;}
function ensureSieges(w:World){const s=w.realm!;if(s.sieges)return;s.sieges=[];for(const a of s.armies.filter(a=>a.siege>0&&!a.journey))for(const war of activeWars(w)){const side=warArmySide(w,war,a);if(!side)continue;const opposite=side==='attack'?'defend':'attack';if(!war.id||warCitySide(w,war,a.location)!==opposite)continue;const siege=s.sieges.find(v=>v.war===war.id&&v.site===a.location&&v.side===side);if(siege)siege.progress=Math.max(siege.progress,a.siege);else s.sieges.push({war:war.id,side,site:a.location,progress:a.siege,last:w.day});}}
function resolveFieldBattle(w:World,war:War,attackers:Army[],defenders:Army[],site:string){
 const terrain=siteById[site].terrain,width=terrain==='山地'?400:1200,stage=battleStage(w,attackers[0],defenders[0],{war:war.id,site,attackers,defenders});
 if(stage.alreadyResolved)return;
 const total=(armies:Army[])=>armies.reduce((n,a)=>n+a.troops,0);
 const power=(armies:Army[],kind:'attack'|'defence',opponents:Army[]=[])=>armies.reduce((n,a)=>n+a.troops*armyCombatFactor(a,kind,terrain,w.day)*(kind==='attack'?(0.4+a.morale/100)*(100+commandPower(w,a.realm,a)+armyBonuses(w,a).attack+governmentBonus(w,a.realm).attack)/100*offense(w,a.realm,a):1),0)/Math.max(1,total(armies))*(kind==='attack'?armyMatchupFactor(armies,opponents,w.day):1);
 const exposed=(armies:Army[])=>armies.reduce((n,a)=>n+a.troops*exposure(w,a.realm,a),0)/Math.max(1,total(armies));
 const damageA=Math.max(1,Math.round(Math.min(width,total(defenders))*power(defenders,'attack',attackers)/Math.max(.1,power(attackers,'defence'))*.08*exposed(attackers)*stage.factor));
 const damageB=Math.max(1,Math.round(Math.min(width,total(attackers))*power(attackers,'attack',defenders)/Math.max(.1,power(defenders,'defence'))*.08*exposed(defenders)*stage.factor));
 const record=stage.record,previousA=record.lossA,previousB=record.lossB;record.attackers=attackers.map(a=>a.id!);record.defenders=defenders.map(a=>a.id!);record.losses??={};
 const wound=(side:Army[],damage:number,enemy:Army)=>{const strength=total(side);let remaining=damage,actual=0;for(const [index,a] of side.entries()){const share=index===side.length-1?remaining:Math.min(remaining,Math.round(damage*a.troops/strength));remaining-=share;const lost=takeCasualties(w,a,share,enemy);actual+=lost;record.losses![a.id!]=(record.losses![a.id!]??0)+lost;a.morale=clamp(a.morale-3,0,100);}return actual;};
 record.lossA+=wound(attackers,damageA,defenders[0]);record.lossB+=wound(defenders,damageB,attackers[0]);
 const rout=(side:Army[],enemy:Army)=>{let lostTotal=0,routed=false;for(const a of side)if(a.troops<100||a.morale<10){routed=true;const retreatPossible=Object.keys(w.realm!.cities).some(id=>id!==a.location&&armyControls(w,a,id)&&!!planRoute(a.location,id,node=>armyControls(w,a,node)));resolveCommanderFate(w,a,enemy,'battle:'+record.id,retreatPossible);const amount=a.troops<100?a.troops:Math.max(1,Math.ceil(a.troops*.3)),lost=takeCasualties(w,a,amount,enemy,true);record.losses![a.id!]+=lost;lostTotal+=lost;if(a.troops>=100){const routes=Object.keys(w.realm!.cities).filter(id=>id!==a.location&&armyControls(w,a,id)).map(id=>planRoute(a.location,id,node=>armyControls(w,a,node))).filter((route):route is NonNullable<typeof route>=>!!route).sort((x,y)=>x.days-y.days),route=routes[0];if(route){a.journey={route:route.route,durations:route.durations,leg:0,elapsed:0,started:w.day};a.withdrawalUntil=w.day+route.days+1;a.morale=5;}else{const trapped=takeCasualties(w,a,a.troops,enemy,true);record.losses![a.id!]+=trapped;lostTotal+=trapped;}}}return {lost:lostTotal,routed};};
 const routedA=rout(attackers,defenders[0]);record.lossA+=routedA.lost;if(routedA.routed)log(w,'攻方野战军溃退，幸存者正撤往安全驻地。');
 const routedB=rout(defenders,attackers[0]);record.lossB+=routedB.lost;if(routedB.routed)log(w,'守方野战军溃退，幸存者正撤往安全驻地。');
 const attackActive=attackers.some(a=>a.troops>=100&&!a.withdrawalUntil),defendActive=defenders.some(a=>a.troops>=100&&!a.withdrawalUntil);
 if(record.ended===undefined&&!attackActive&&!defendActive){record.ended=w.day;record.winner='draw';record.scoreDelta=0;}
 if(record.ended===undefined&&attackActive!==defendActive){const winner=attackActive?'attack':'defend',delta=Math.min(10,Math.max(1,Math.ceil((winner==='attack'?record.lossB:record.lossA)/200)))*(winner==='attack'?1:-1);record.ended=w.day;record.winner=winner;record.scoreDelta=delta;war.battles=clamp((war.battles??0)+delta,-25,25);const experience=new Map<string,number>();for(const p of record.participants??[])if(p.commander)experience.set(p.commander,Math.max(experience.get(p.commander)??0,winner===(p.side??warRealmSide(war,p.realm))?10:3));for(const [id,amount] of experience){awardMilitaryExperience(w,id,amount);const realm=allegianceRealm(w,id);if(realm&&amount===10){awardDeed(w,realm,id,'battle:'+record.id,5,'战斗获胜，军功进入任职与政治支持');awardInfluence(w,id,3);}}const victor=winner==='attack'?war.attacker:war.defender,chief=war.civil?(winner==='attack'?war.civil.claimant:war.civil.loyalist):governingAuthority(w,victor);if(chief)awardDeed(w,victor,chief,'battle:'+record.id,3,'统筹战争获胜，实战成果进入政治程序');const loser=winner==='attack'?war.defender:war.attacker,g=governmentOf(w,loser);if(g)g.support=Math.max(0,g.support-2);}
 const casualties=war.casualties??={attack:0,defend:0};casualties.attack+=record.lossA-previousA;casualties.defend+=record.lossB-previousB;
}
export function settleWar(w:World,war:War,terms:PeaceTerms=war.civil?'white':'statusQuo',actor:RealmId=war.attacker,claims:string[]=[],extraCoins=0,landRecipient?:RealmId,returns:string[]=[]){
 const s=w.realm!;if(!activeWars(w).includes(war))return;
 const q=peaceQuote(w,war,actor,terms,claims,extraCoins,landRecipient,returns);if(q.reason)throw new Error(q.reason);ensureWars(w);
 if(war.civil){settleCivilWar(w,war,terms);return;}
 if(q.annexes){const winner=regimeName(w,q.beneficiary),loser=regimeName(w,q.loser);annexPolity(w,q.beneficiary,q.loser);const record=s.annexed![q.loser]!;log(w,winner+'吞并'+loser+'，接管 '+record.sites.length+' 处县域；本次转入中央公款 '+record.coins+' 钱、公粮 '+record.grain+'，承接债务 '+record.debt+' 钱。原政权终止，地方进入接管期，人物私财保留。');syncGovernance(w);return;}
 if(q.cessions.length){for(const cession of q.cessions){const id=cession.site,city=s.cities[id];city.owner=cession.to;city.controller=cession.to;city.governor=null;delete city.occupiedSince;delete city.occupiedByWar;if(city.fortification?.due!=null){city.fortification.due=null;log(w,siteById[id].name+'原城防工程因割让停建，既有支出不退。');}city.integration={since:w.day,progress:0,funded:false};log(w,siteById[id].name+'依据议和转归'+regimeName(w,cession.to)+'，进入地方接管期。');}}else log(w,terms==='white'?'双方各退原界，无新增割地赔款。':'双方接受议和条件。');
 const civilianDeaths=(war.captureLosses??[]).reduce((n,r)=>n+r.deaths,0);if(civilianDeaths)log(w,'本场战争夺城累计战乱死亡 '+civilianDeaths+' 名居民；议和交割不再扣减人口。');
 if(q.coins){const from=s.treasuries[q.loser],to=s.treasuries[q.beneficiary],paid=Math.min(from.coins,q.coins,1_000_000-to.coins);from.coins-=paid;to.coins+=paid;if(paid<q.coins)(s.reparations??=[]).push({war:war.id!,from:q.loser,to:q.beneficiary,remaining:q.coins-paid,instalment:50,next:nextMonthStart(w.day,w.scriptId)});}
 if(q.tributary&&w.diplomacy)w.diplomacy.subjects[q.loser]=q.beneficiary;
 // Release only occupations created by this war. Legacy saves without provenance are released only when this is the sole matching conflict.
 for(const city of Object.values(s.cities))if(city.owner!=='frontier'&&city.controller!=='frontier'&&warRealmSide(war,city.owner)&&warRealmSide(war,city.controller)&&warRealmSide(war,city.owner)!==warRealmSide(war,city.controller)){
  const matching=activeWars(w).filter(v=>warRealmSide(v,city.owner as RealmId)&&warRealmSide(v,city.controller as RealmId)&&warRealmSide(v,city.owner as RealmId)!==warRealmSide(v,city.controller as RealmId));
  if(city.occupiedByWar===war.id||city.occupiedByWar===undefined&&matching.length===1&&matching[0]===war){city.controller=city.owner;delete city.occupiedSince;delete city.occupiedByWar;}
 }
 for(const a of worldRealms(w))for(const b of worldRealms(w))if(warRealmSide(war,a)==='attack'&&warRealmSide(war,b)==='defend'&&!activeWars(w).some(v=>v!==war&&warRealmSide(v,a)&&warRealmSide(v,b)&&warRealmSide(v,a)!==warRealmSide(v,b)))s.truces[[a,b].sort().join('|')]=w.day+360;
 s.wars=s.wars!.filter(v=>v!==war);s.war=s.wars[0]??null;s.sieges=s.sieges?.filter(v=>v.war!==war.id);
 for(const a of s.armies){if(!warRealmSide(war,a.realm))continue;
 const foreign=s.cities[a.location].controller;
 if(foreign!==a.realm&&foreign!=='frontier'&&warRealmSide(war,foreign)!==warRealmSide(war,a.realm)&&!activeWars(w).some(v=>warRealmSide(v,a.realm)&&warRealmSide(v,foreign)&&warRealmSide(v,a.realm)!==warRealmSide(v,foreign))){
 const paths=Object.keys(s.cities).filter(id=>s.cities[id].controller===a.realm).map(id=>planRoute(a.location,id,node=>s.cities[node].controller!=='frontier'&&!!warRealmSide(war,s.cities[node].controller as RealmId))).filter(p=>p!==null).sort((a,b)=>a.days-b.days);
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
 const s=w.realm;if(!s)return;ensureFortifications(w);ensurePopulation(w);ensureArmyOrganization(w);ensureWars(w);ensureSieges(w);advanceReparations(w);advanceAnnexations(w);
 for(const [id,city] of Object.entries(s.cities))if(city.fortification?.due!==null&&city.fortification?.due!==undefined&&city.fortification.due<=w.day){if(city.controller!==city.owner){city.fortification.due++;continue;}city.fortification.level++;city.fortification.due=null;log(w,siteById[id].name+`城防竣工，现为 ${city.fortification.level} 级。`);}
 advanceLocal(w);
 s.offices=s.offices.filter(o=>o.due>w.day||!completeLocalAppointment(w,o));syncGovernance(w);
 if(isMonthStart(w.day,w.scriptId)&&(s.lastMonthly??0)<w.day){
 s.lastMonthly=w.day;
 for(const r of worldRealms(w)){if(s.annexed?.[r])continue;const yields=new Map(Object.entries(s.cities).filter(([,c])=>c.controller===r).map(([id])=>[id,cityYield(w,id)]));const t=s.treasuries[r],f=realmForecast(w,r,yields);t.lastIncome=f.income;t.lastExpense=f.expense;t.lastFood=f.food;collectFiscal(w,r,yields);payFiscalOperations(w,r);distributeFiscal(w,r);
 // Army consumption is daily, so only civilian production/consumption is booked here.
 settleLocalGrain(w,r,id=>yields.get(id)!.grain);
 s.ledger.push({day:w.day,realm:r,...f});
 for(const city of Object.values(s.cities))if(city.controller===r){city.order=clamp(city.order+(city.tax==='light'?4:city.tax==='heavy'?-6:1)-(city.administration&&city.administration.paid<city.administration.need?Math.ceil(6*(1-city.administration.paid/city.administration.need)):0),0,100);city.prosperity=clamp(city.prosperity+(city.order>=60?1:-2),0,100);city.population=clamp(city.population+(city.order>=70?Math.max(1,Math.floor(city.population*.002)):city.order<30?-Math.max(1,Math.floor(city.population*.003)):0),100,1_000_000);}
 for(const [id,city] of Object.entries(s.cities))if(city.controller===r&&city.integration){if(city.integration.funded)city.integration.progress=Math.min(100,city.integration.progress+integrationGain(w,id).gain);if(city.integration.progress>=100){delete city.integration;log(w,siteById[id].name+'完成地方接管，税收恢复常态。');}}
 if(r!==playerRealm(w))for(const city of Object.values(s.cities))if(city.controller===r)city.tax=city.order<45?'light':t.coins<100?'heavy':'normal';
 }
 s.ledger=s.ledger.slice(-36);
 advanceFortificationAI(w);

 }
 if((s.lastMilitaryDay??-1)>=w.day)return;s.lastMilitaryDay=w.day;
 advanceDefections(w);
 advanceRecruitmentRallies(w);
 for(const war of activeWars(w))if(war.peaceOffer&&war.peaceOffer.until<w.day)delete war.peaceOffer;advanceRealmStrategy(w);
 advanceMilitaryAI(w);
 advanceMilitaryCareer(w);
 advanceMilitaryNominations(w);
 advanceNationalLogistics(w);
 const meetings=roadEncounters(w),engaged=new Set(meetings.flat());
 for(const a of s.armies){
  if(a.arrears||a.supply<=0){if((a.trainingUntil??0)>w.day)a.trainingUntil!++;for(const u of a.regiments??[])if((u.readyDay??0)>w.day)u.readyDay!++;}
  else for(const u of a.regiments??[])if((u.readyDay??a.trainingUntil??0)>w.day)u.experience=Math.min(u.service==='standing'?60:30,u.experience+1);

 const need=consumeArmyFood(w,a,armyFoodRate(w,a));

 settleArmyFood(w,a,need);
 if(a.withdrawalUntil&&(a.location===a.journey?.route.at(-1)||!a.journey&&s.cities[a.location].controller===a.realm||w.day>a.withdrawalUntil))delete a.withdrawalUntil;
 if(a.journey&&!a.withdrawalUntil&&!canEnter(w,a.realm,s.cities[a.journey.route[a.journey.leg+1]].controller,undefined,true)){a.journey=null;a.siege=0;log(w,regimeName(w,a.realm)+'军借道许可失效，停止行军。');}
 if(a.journey&&a.journey.started<w.day){
 if(engaged.has(a)||a.starvationDays&&w.day%3===0)a.journey.started++;
 else{const j=a.journey;j.elapsed++;if(j.elapsed>=j.durations[j.leg]){a.location=j.route[++j.leg];j.elapsed=0;if(j.leg===j.durations.length)a.journey=null;}}
 }
 }
 for(const war of [...activeWars(w)]){for(const group of fieldBattles(w,war,meetings))resolveFieldBattle(w,war,group.attack,group.defend,group.site);
  // One city has one siege tick per side, even when several armies are present.
  for(const site of new Set(s.armies.filter(a=>warArmySide(w,war,a)&&!a.journey&&!a.withdrawalUntil).map(a=>a.location))){const city=s.cities[site];
   for(const side of ['attack','defend'] as const){const opposite=side==='attack'?'defend':'attack',besiegers=s.armies.filter(a=>a.location===site&&!a.journey&&!a.withdrawalUntil&&a.troops>=100&&warArmySide(w,war,a)===side);
    if(!besiegers.length||warCitySide(w,war,site)!==opposite)continue;
    if(s.armies.some(e=>e.location===site&&e.troops>=100&&warArmySide(w,war,e)===opposite))continue;
    // Hunger stops progress while the blockade still depends on actual supplied troops.
    if(besiegers.every(a=>a.supply<=0))continue;
    const pace=besiegers.some(a=>a.supply>0&&a.regiments?.some(u=>u.kind==='siege'&&u.troops>=50))?2:1;
    if(s.sieges!.some(v=>v.site===site&&v.war!==war.id))continue;
    let state=s.sieges!.find(v=>v.war===war.id&&v.site===site&&v.side===side);if(!state){state={war:war.id!,side,site,progress:0,last:w.day};s.sieges!.push(state);}const phase=siegePhaseQuote(w,state,besiegers);state.blockade=phase.blockade;state.progress=Math.min(100,state.progress+(phase.blockade>=100?pace:0));state.last=w.day;const progress=state.progress;for(const a of besiegers)a.siege=progress;
    if(advanceSiegePhase(w,state,besiegers)){const unfinished=city.fortification?.due!=null;if(war.civil)civilCityCapture(w,war,site,side,besiegers[0],'surrender');else occupyCity(w,war,site,side==='attack'?war.attacker:war.defender,true);city.order=clamp(city.order-20,0,100);city.fortification={level:Math.max(0,fortificationLevel(w,site)-1),due:null};for(const a of besiegers)a.siege=0;s.sieges=s.sieges!.filter(v=>v!==state);log(w,siteById[site].name+'被'+regimeName(w,besiegers[0].realm)+'军占领，法理归属暂不变；城防损坏一级'+(unfinished?'，未完工工程停建':'')+'。');syncGovernance(w);}
   }
  }
 for(const siege of s.sieges!.filter(v=>v.war===war.id)){const activeBesiegers=s.armies.filter(a=>a.location===siege.site&&!a.journey&&!a.withdrawalUntil&&warArmySide(w,war,a)===siege.side&&a.troops>=100);siege.blockade=siegePhaseQuote(w,siege,activeBesiegers).blockade;if(!activeBesiegers.length)delete siege.playerDecision;const opposite=siege.side==='attack'?'defend':'attack';if(warCitySide(w,war,siege.site)!==opposite){s.sieges=s.sieges!.filter(v=>v!==siege);continue;}if(siege.last!==w.day&&!s.armies.some(a=>a.location===siege.site&&!a.journey&&warArmySide(w,war,a)===siege.side&&a.troops>=100)){siege.progress=Math.max(0,siege.progress-1);if(!siege.progress)s.sieges=s.sieges!.filter(v=>v!==siege);}}
 if(war.civil){war.score=clamp((war.civil.cities.includes(war.target)?40:0)+(war.civil.cities.includes(war.civil.base)?0:-40)+(war.battles??0),-100,100);continue;}
 updateWarScore(w,war);
 if(warObjectiveSites(war,w).every(id=>s.cities[id].owner==='frontier'||!warRealmSide(war,s.cities[id].owner as RealmId)))settleWar(w,war);
 }
 for(const a of s.armies){reconcileRegiments(a);if(a.troops<100){takeCasualties(w,a,a.troops,undefined,true);returnArmyConvoy(w,a);if(a.arrears){const debts=s.armyDebts??=[],account=a.payer??'central:'+a.realm,old=debts.find(d=>d.realm===a.realm&&d.account===account);if(old)old.coins+=a.arrears;else debts.push({realm:a.realm,account,coins:a.arrears});}}}s.armies=s.armies.filter(a=>a.troops>=100);advanceCivilPolitics(w);advanceUnrest(w);
 if(!s.event&&w.day-s.lastEvent>=90&&w.holdings.governedCities.length){const kinds=Object.keys(eventDefinitions) as EventKind[];s.event={kind:kinds[(Math.floor(w.day/90)-1)%kinds.length],site:w.holdings.governedCities[0],day:w.day};s.lastEvent=w.day;log(w,'收到待决事务：'+eventDefinitions[s.event.kind].title+'。');}
}
export function handoverOffice(w:World){if(w.realm){w.realm.mandate=executive(w)||(!(governmentOf(w)?.stages.length)&& getCharacter(w,w.characterId!)!.role==='commander');w.realm.event=null;syncGovernance(w);}}

export function declareRealmWarReason(w:World,actor:string,r:RealmId,site:string,goal:War['goal']='territory',checkCost=true,territory?:string){
 const s=w.realm,c=s?.cities[site];if(!s||!c)return '目标城市不存在';
 if(!['territory','reparations','tributary','annexation'].includes(goal))return '无效战争目标';
 const grant=authorityGrant(w,actor,'declareWar',{realm:r});if(!grant.allowed)return grant.reason;
 if(c.owner==='frontier'||c.owner===r)return '请选择其他政权的城市';
 const targets=territory===undefined?goal==='annexation'?Object.keys(s.cities).filter(id=>s.cities[id].owner===c.owner):[site]:warTerritorySites(w,territory,c.owner);
 if(territory!==undefined&&(typeof territory!=='string'||!regionalWarTerritory(territory)||goal!=='territory'||!targets.includes(site)))return '州郡目标须为目标国真实辖区，且仅用于割地战争';
 return foreignWarReason(w,c.owner,actor,r)|| (activeWars(w).filter(v=>!v.civil).length>=6?'战事已达上限':bilateralWar(w,r,c.owner)?'已与该国交战':targets.some(id=>s.cities[id].owner!==s.cities[id].controller)?'目标处于占领中':targets.some(id=>!warApproach(w,id,r,c.owner as RealmId))?'两国须有相邻边境，且目标须可沿道路抵达':(s.truces[[r,c.owner].sort().join('|')]??0)>w.day?'停战协议仍有效':checkCost&&personInfluence(w,actor)<warDeclarationCost(goal,territory)?'个人影响力不足':'');
}
export function declareRealmWar(w:World,actor:string,r:RealmId,site:string,goal:War['goal']='territory',territory?:string){
 const reason=declareRealmWarReason(w,actor,r,site,goal,true,territory);if(reason)throw new Error(reason);ensureWars(w);const s=w.realm!;
 const defender=s.cities[site].owner as RealmId;
 awardInfluence(w,actor,-warDeclarationCost(goal,territory));const war:War={id:s.nextWarId!++,goal,demand:300,battles:0,attacker:r,defender,target:site,...(territory?{territory:{id:territory,sites:warTerritorySites(w,territory,defender)}}:{}),started:w.day,score:0,captureLosses:[],disputes:[]};snapshotWarValues(w,war);s.wars!.push(war);s.war=s.wars![0];diplomaticWar(w,r,war.defender);log(w,regimeName(w,r)+'发起对'+warTargetName(war,w)+'的有限战争。');return war;
}
